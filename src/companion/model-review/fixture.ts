import type { ProviderResponse, Snapshot } from "./contracts";
import type { Transport } from "./transport";
import { invalid } from "./policy";
export function assertFixtureEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): void {
  let url;
  try {
    url = new URL(env.DESIGN_PASSPORT_DATABASE_URL ?? "");
  } catch {
    invalid("Model fixtures require the disposable database harness.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    env.DESIGN_PASSPORT_DATABASE_TEST_MODE !== "pglite" ||
    env.DESIGN_PASSPORT_TEST_MODEL_REVIEW !== "fixture" ||
    url.hostname !== "127.0.0.1" ||
    url.username !== "design_passport_test" ||
    url.pathname !== "/pglite" ||
    url.search ||
    url.hash
  )
    invalid("Model fixtures require the literal disposable database harness.");
}
export function fixtureTransport(): Transport {
  assertFixtureEnvironment();
  const responses = new Map<
    string,
    { response: ProviderResponse; polls: number }
  >();
  const retained = (id: string) => {
    const r = responses.get(id);
    if (!r) throw new Error("Unavailable fixture response");
    return r;
  };
  return {
    count: async () => 4000,
    generate: async (body) => {
      const snapshot = JSON.parse(body.input) as Snapshot;
      const id = `resp_fixture_${crypto.randomUUID()}`;
      const recommendations = snapshot.candidates.map((c) => ({
        candidateId: c.candidateId,
        candidateDigest: c.digest,
        disposition: "defer",
        reason:
          "Current project policy is unavailable. Attach authoritative guidance before approval.",
        evidenceRefs: [c.ref],
        priority: "normal",
        edit: null,
      }));
      const response: ProviderResponse = {
        id,
        status: "queued",
        model: "gpt-6.1-sol",
        service_tier: "default",
        usage: {
          input_tokens: 4000,
          input_tokens_details: {
            cached_tokens: 1000,
            cache_write_tokens: 500,
          },
          output_tokens: 600,
          output_tokens_details: { reasoning_tokens: 200 },
          total_tokens: 4600,
        },
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ recommendations }),
              },
            ],
          },
        ],
      };
      responses.set(id, { response, polls: 0 });
      return response;
    },
    retrieve: async (id) => {
      const r = retained(id);
      r.polls++;
      if (r.polls >= 2 && r.response.status !== "cancelled")
        r.response = {
          ...r.response,
          status: "completed",
          completed_at: Math.floor(Date.now() / 1000),
        };
      return r.response;
    },
    cancel: async (id) => {
      const r = retained(id);
      if (r.response.status !== "completed")
        r.response = { ...r.response, status: "cancelled" };
      return r.response;
    },
    delete: async (id) => {
      retained(id);
      responses.delete(id);
    },
  };
}
