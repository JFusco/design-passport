import { describe, expect, it, vi } from "vitest";
import { runPageBatch } from "../src/plugin/batch-audit";
import { ScanCancelledError } from "../src/plugin/scan-errors";

describe("page batch execution", () => {
  it("audits 65 captured pages once, skips empty pages, and reports durable completions", async () => {
    const requested = Array.from({ length: 65 }, (_, index) => `page:${index}`);
    const audited: string[] = [];
    const assertFresh = vi.fn();
    const progress = vi.fn();
    const running = runPageBatch(requested, {
      assertFresh,
      cancelled: () => false,
      auditPage: async (id) => { audited.push(id); return id !== "page:2"; },
      progress,
      yield: async () => undefined,
    });
    requested.splice(0, requested.length, "page:changed-live-selection");
    expect(await running).toEqual({ total: 65, completed: 64, skipped: 1, cancelled: false });
    expect(audited).toHaveLength(65);
    expect(audited).not.toContain("page:changed-live-selection");
    expect(assertFresh).toHaveBeenCalledTimes(66);
    expect(progress).toHaveBeenLastCalledWith({ total: 65, completed: 64, skipped: 1, cancelled: false }, "page:64");
  });

  it("keeps completed pages and stops between pages on cancellation", async () => {
    let cancelled = false;
    const auditPage = vi.fn(async () => { cancelled = true; return true; });
    expect(await runPageBatch(["a", "b"], {
      assertFresh: () => undefined, cancelled: () => cancelled, auditPage,
      progress: () => undefined, yield: async () => undefined,
    })).toEqual({ total: 2, completed: 1, skipped: 0, cancelled: true });
    expect(auditPage).toHaveBeenCalledTimes(1);
  });

  it("stops on changed or expired context without starting a replacement build", async () => {
    let completed = 0;
    const auditPage = vi.fn(async () => { completed += 1; return true; });
    await expect(runPageBatch(["a", "b"], {
      assertFresh: () => { if (completed > 0) throw new Error("Context changed"); },
      cancelled: () => false, auditPage, progress: () => undefined, yield: async () => undefined,
    })).rejects.toThrow("Context changed");
    expect(auditPage).toHaveBeenCalledTimes(1);
  });

  it("does not count the current page if capture is cancelled before publication", async () => {
    expect(await runPageBatch(["a"], {
      assertFresh: () => undefined, cancelled: () => false,
      auditPage: async () => { throw new ScanCancelledError(); },
      progress: () => undefined, yield: async () => undefined,
    })).toEqual({ total: 1, completed: 0, skipped: 0, cancelled: true });
  });

  it("waits for asynchronous context verification and handles cancellation during that bridge call", async () => {
    const auditPage = vi.fn(async () => true);
    let reject!: (error: Error) => void;
    const result = runPageBatch(["a", "b"], {
      assertFresh: () => new Promise<void>((_, failure) => { reject = failure; }),
      cancelled: () => false, auditPage, progress: () => undefined, yield: async () => undefined,
    });
    expect(auditPage).not.toHaveBeenCalled();
    reject(new ScanCancelledError());
    expect(await result).toEqual({ total: 2, completed: 0, skipped: 0, cancelled: true });
    expect(auditPage).not.toHaveBeenCalled();
  });
});
