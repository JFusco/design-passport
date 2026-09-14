import { ScanCancelledError } from "./scan-errors";

export interface BatchAuditSummary {
  completed: number;
  skipped: number;
  total: number;
  cancelled: boolean;
}

/** A batch owns one verified graph. It never silently rebuilds midway. */
export async function runPageBatch(
  requestedPageIds: readonly string[],
  actions: {
    assertFresh: () => void;
    cancelled: () => boolean;
    auditPage: (pageId: string) => Promise<boolean>;
    progress: (summary: BatchAuditSummary, pageId: string) => void;
    yield: () => Promise<void>;
  },
): Promise<BatchAuditSummary> {
  const pageIds = [...requestedPageIds];
  const summary: BatchAuditSummary = { completed: 0, skipped: 0, total: pageIds.length, cancelled: false };
  for (const pageId of pageIds) {
    if (actions.cancelled()) return { ...summary, cancelled: true };
    actions.assertFresh();
    actions.progress({ ...summary }, pageId);
    try {
      if (await actions.auditPage(pageId)) summary.completed += 1;
      else summary.skipped += 1;
    } catch (error) {
      if (error instanceof ScanCancelledError) return { ...summary, cancelled: true };
      throw error;
    }
    actions.progress({ ...summary }, pageId);
    await actions.yield();
  }
  actions.assertFresh();
  return summary;
}
