import { randomUUID } from "node:crypto";
import type { WorkspacePaths } from "../filesystem";
import type { ProviderResponse } from "./contracts";
import { recommendations, validateProjection } from "./policy";
import {
  claim,
  cleanupDone,
  completeReconciliation,
  dispatch,
  finish,
  observe,
  pendingReconciliation,
  releaseLease,
  renew,
  runDetail,
  type Lease,
} from "./repository";
import type { Transport } from "./transport";
import { TransportError } from "./transport";
import { transaction } from "../database";
import type { KnowledgeCandidateV1 } from "../../core/contracts";
export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}
const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
const terminal = (r: ProviderResponse) =>
  ["completed", "failed", "incomplete", "cancelled"].includes(r.status ?? "");
const defaultRepository = {
  claim,
  cleanupDone,
  completeReconciliation,
  dispatch,
  finish,
  observe,
  pendingReconciliation,
  releaseLease,
  renew,
  runDetail,
  candidates: (paths: WorkspacePaths, lease: Lease) =>
    transaction(paths.root, async (sql) => {
      const result: KnowledgeCandidateV1[] = [];
      for (const pair of lease.frozen.selection) {
        const row = (
          await sql`select payload from design_passport.candidate_revisions where project_scope=${lease.project} and candidate_id=${pair.candidateId} and digest=${pair.digest}`
        )[0];
        if (row) result.push(row.payload as KnowledgeCandidateV1);
      }
      return result;
    }),
};
export type RunnerRepository = typeof defaultRepository;
export class ModelReviewRunner {
  readonly owner = randomUUID();
  private stopping = false;
  private task: Promise<void> | null = null;
  constructor(
    private paths: WorkspacePaths,
    private transport: Transport,
    private clock: Clock = realClock,
    private repository: RunnerRepository = defaultRepository,
  ) {}
  start(): void {
    if (!this.task) this.task = this.loop();
  }
  async stop(): Promise<void> {
    this.stopping = true;
    await this.task;
  }
  private async loop() {
    while (!this.stopping) {
      try {
        if (!(await this.step())) await this.clock.sleep(2000);
      } catch {
        await this.clock.sleep(2000);
      }
    }
  }
  async step(): Promise<boolean> {
    if (this.stopping) return false;
    const lease = await this.repository.claim(this.paths, this.owner);
    if (!lease) return false;
    let alive = true,
      renewing = false;
    const timer = setInterval(() => {
      if (renewing || !alive) return;
      renewing = true;
      void this.repository
        .renew(this.paths, lease)
        .catch(() => {
          alive = false;
        })
        .finally(() => {
          renewing = false;
        });
    }, 10_000);
    try {
      await this.execute(lease, () => alive);
    } finally {
      clearInterval(timer);
      if (alive)
        await this.repository
          .releaseLease(this.paths, lease)
          .catch(() => undefined);
    }
    return true;
  }
  private async execute(lease: Lease, alive: () => boolean): Promise<void> {
    let response: ProviderResponse | undefined,
      dispatched = lease.dispatchAt !== null;
    try {
      const reconciliation = await this.repository.pendingReconciliation(
        this.paths,
        lease,
      );
      if (reconciliation) {
        let retrieved: ProviderResponse | null = null;
        if (lease.providerId) {
          try {
            retrieved = await this.transport.retrieve(lease.providerId);
          } catch {
            /* Unavailable retrieval is preserved in the receipt. */
          }
        }
        await this.repository.completeReconciliation(
          this.paths,
          lease,
          reconciliation,
          retrieved,
        );
        await this.cleanup(lease);
        return;
      }
      if (!["queued", "running"].includes(lease.outcome)) {
        const current = await this.repository.runDetail(this.paths, lease.id);
        if (
          current.accounting.amount !== null ||
          !lease.providerId ||
          !["queued", "in_progress"].includes(
            current.providerStatus ?? "queued",
          )
        ) {
          await this.cleanup(lease);
          return;
        }
      }
      if (dispatched && !lease.providerId) {
        await this.repository.finish(this.paths, lease, {
          outcome: "interrupted",
          error:
            "Dispatch could not be confirmed. Cost is unknown; the reservation is held.",
        });
        return;
      }
      if (lease.providerId) {
        const deadline =
          Date.parse(
            lease.dispatchAt ??
              (await this.repository.runDetail(this.paths, lease.id))
                .registeredAt,
          ) +
          15 * 60_000;
        let failures = 0;
        while (!response) {
          if (this.stopping || !alive()) return;
          try {
            const retrieved = await this.transport.retrieve(lease.providerId);
            if (retrieved.id !== lease.providerId || !retrieved.status)
              throw new TransportError("retrieve");
            response = retrieved;
            await this.repository.observe(this.paths, lease, response);
          } catch {
            if (this.clock.now() >= deadline)
              throw new TransportError("retrieve");
            await this.clock.sleep(
              Math.min(15_000, 2000 * 2 ** Math.min(failures++, 3)),
            );
          }
        }
      } else {
        validateProjection(lease.frozen.projection);
        const count = await this.transport.count(lease.frozen.projection);
        if (this.stopping || !alive()) return;
        if (!(await this.repository.dispatch(this.paths, lease, count))) return;
        dispatched = true;
        // Exactly one generation POST. Every recovery path uses retrieval.
        response = await this.transport.generate(lease.frozen.projection);
        if (!response.id || !/^resp_[A-Za-z0-9_-]{1,200}$/u.test(response.id))
          throw new TransportError("generate");
        await this.repository.observe(this.paths, lease, { id: response.id });
        await this.repository.observe(this.paths, lease, response);
      }
      const providerId = response.id ?? lease.providerId!;
      if (!providerId || !response.status) throw new TransportError("retrieve");
      const latest = await this.repository.runDetail(this.paths, lease.id);
      const dispatchTime = Date.parse(
        lease.dispatchAt ??
          latest.events.find((e) => e.kind === "dispatch-intent")
            ?.recorded_at ??
          latest.registeredAt,
      );
      let failures = 0,
        cancelling = false,
        cancelStarted = 0;
      while (!terminal(response)) {
        if (this.stopping || !alive()) return;
        const current = await this.repository.runDetail(this.paths, lease.id);
        const cancelRequested =
          current.events.some((e) => e.kind === "cancel-requested") ||
          this.clock.now() - dispatchTime >= 15 * 60_000;
        if (cancelRequested && !cancelling) {
          cancelling = true;
          cancelStarted = this.clock.now();
          response = await this.transport.cancel(providerId);
          if (response.id !== providerId || !response.status)
            throw new TransportError("cancel");
          await this.repository.observe(this.paths, lease, response);
          if (terminal(response)) break;
        }
        if (cancelling && this.clock.now() - cancelStarted > 30_000)
          throw new TransportError("cancel");
        await this.clock.sleep(
          Math.min(15_000, 2000 * 2 ** Math.min(failures, 3)),
        );
        if (!alive()) return;
        try {
          response = await this.transport.retrieve(providerId);
          if (response.id !== providerId || !response.status)
            throw new TransportError("retrieve");
          await this.repository.observe(this.paths, lease, response);
          failures = 0;
        } catch {
          failures++;
          if (this.clock.now() - dispatchTime > 15 * 60_000 + 30_000)
            throw new TransportError("retrieve");
        }
      }
      let outcome: "completed" | "failed" | "cancelled" =
        response.status === "cancelled" ? "cancelled" : "failed";
      let error: string | null =
        response.status === "incomplete" &&
        response.incomplete_details?.reason === "max_output_tokens"
          ? "Output limit reached. Narrow the selection for a new run."
          : response.status === "cancelled"
            ? null
            : "The provider did not complete this review.";
      let valid;
      if (response.status === "completed") {
        try {
          const candidates = await this.repository.candidates(
            this.paths,
            lease,
          );
          valid = recommendations(
            response,
            lease.frozen.snapshot,
            candidates,
            lease.frozen.projection.text.format.schema,
          );
          outcome = "completed";
          error = null;
        } catch {
          error =
            "The output is incomplete, unsafe, or invalid. No recommendations can be applied.";
        }
      }
      await this.repository.finish(this.paths, lease, {
        outcome,
        error,
        response,
        ...(valid ? { recommendations: valid } : {}),
      });
      await this.cleanup(lease);
    } catch (error) {
      if (
        error instanceof TransportError &&
        typeof error.evidence.providerId === "string"
      )
        await this.repository.observe(this.paths, lease, {
          id: error.evidence.providerId,
        });
      const knownZero =
        !dispatched ||
        (error instanceof TransportError &&
          error.stage === "generate" &&
          error.knownRejection);
      await this.repository.finish(this.paths, lease, {
        outcome: knownZero ? "failed" : "interrupted",
        error: knownZero
          ? "The provider request was rejected before generation. No generation cost."
          : "Provider termination or dispatch could not be confirmed. Cost is unknown; the reservation is held.",
        zero: knownZero,
        ...(error instanceof TransportError
          ? { transport: { stage: error.stage, ...error.evidence } }
          : {}),
      });
    }
  }
  private async cleanup(lease: Lease) {
    const detail = await this.repository.runDetail(this.paths, lease.id);
    if (
      !detail.providerId ||
      !["completed", "failed", "cancelled", "incomplete"].includes(
        detail.providerStatus ?? "",
      ) ||
      detail.accounting.amount === null ||
      ["queued", "running"].includes(detail.outcome) ||
      detail.events.some((e) => e.kind === "provider-deleted")
    )
      return;
    try {
      await this.transport.delete(detail.providerId);
      await this.repository.cleanupDone(this.paths, lease);
    } catch {
      /* Independent cleanup retry; original accounting remains durable. */
    }
  }
}
