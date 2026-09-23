import { useState } from "react";
import type { FrameResult, TokenCoverageDisposition, TokenCoverageGroup } from "../../core/contracts";
import { hashValue } from "../../core/stable";
import type { TokenCoveragePageRequest, TokenCoveragePageResult } from "../../plugin/messages";

const DISPOSITIONS: readonly TokenCoverageDisposition[] = ["bound", "inherited", "ignored", "missing"];
const PAGE_SIZE = 20;

function aggregate(frames: readonly FrameResult[]) {
  const counts = { bound: 0, inherited: 0, ignored: 0, missing: 0 };
  const groups = new Map<string, TokenCoverageGroup>();
  for (const frame of frames) {
    const summary = frame.tokenCoverage;
    if (!summary) continue;
    for (const disposition of DISPOSITIONS) counts[disposition] += summary.counts[disposition];
    for (const group of summary.groups) {
      const key = `${group.disposition}:${group.field}:${group.reason}`;
      const current = groups.get(key) ?? { ...group, count: 0, samples: [], truncated: false };
      current.count += group.count;
      for (const sample of group.samples) {
        if (current.samples.some((candidate) => candidate.nodeId === sample.nodeId)) continue;
        if (current.samples.length < 50) current.samples.push(sample);
        else current.truncated = true;
      }
      current.truncated = current.truncated || group.truncated;
      groups.set(key, current);
    }
  }
  const applicable = counts.bound + counts.inherited + counts.missing;
  return { counts, applicable, coverage: applicable === 0 ? null : ((counts.bound + counts.inherited) / applicable) * 100, groups: [...groups.values()] };
}

function requestFor(
  reportHash: string,
  rootIds: string[],
  group: TokenCoverageGroup,
  page: number,
): TokenCoveragePageRequest {
  const offset = page * PAGE_SIZE;
  return {
    requestId: `coverage:${hashValue({ reportHash, rootIds, disposition: group.disposition, field: group.field, reason: group.reason, offset })}`,
    reportHash,
    rootIds,
    disposition: group.disposition,
    field: group.field,
    reason: group.reason,
    offset,
    limit: PAGE_SIZE,
  };
}

function CoverageEvidenceGroup(props: {
  group: TokenCoverageGroup;
  current: boolean;
  reportHash?: string;
  rootIds: string[];
  pages: Readonly<Record<string, TokenCoveragePageResult>>;
  onRequestPage?: (request: TokenCoveragePageRequest) => void;
  onNavigate?: (nodeId: string) => void;
}) {
  const [page, setPage] = useState(0);
  const livePaging = props.current && props.group.truncated && Boolean(props.reportHash && props.onRequestPage);
  const request = props.reportHash ? requestFor(props.reportHash, props.rootIds, props.group, page) : undefined;
  const result = request ? props.pages[request.requestId] : undefined;
  const offset = page * PAGE_SIZE;
  const samples = livePaging ? result?.samples ?? (page === 0 ? props.group.samples.slice(0, PAGE_SIZE) : []) : props.group.samples.slice(offset, offset + PAGE_SIZE);
  const totalSamples = livePaging ? result?.totalSamples : props.group.samples.length;
  const pageCount = totalSamples === undefined ? undefined : Math.max(1, Math.ceil(totalSamples / PAGE_SIZE));
  const loadPage = (nextPage: number) => {
    setPage(nextPage);
    if (livePaging && props.reportHash && props.onRequestPage) props.onRequestPage(requestFor(props.reportHash, props.rootIds, props.group, nextPage));
  };
  return (
    <details onToggle={(event) => {
      if (event.currentTarget.open && livePaging && request && !result) props.onRequestPage?.(request);
    }}>
      <summary><span>{props.group.disposition} · {props.group.field} · {props.group.reason}</span><strong>{props.group.count}</strong></summary>
      {samples.length > 0 ? <ul>{samples.map((sample) => <li key={sample.nodeId}>{props.onNavigate ? <button type="button" className="node-link" onClick={() => props.onNavigate?.(sample.nodeId)}>{sample.nodePath}</button> : sample.nodePath}</li>)}</ul> : livePaging ? <small>Loading live evidence…</small> : null}
      {(pageCount ?? 1) > 1 ? <div className="coverage-pagination"><button type="button" className="button subtle" disabled={page === 0} onClick={() => loadPage(page - 1)}>Previous</button><span>Page {page + 1}{pageCount ? ` of ${pageCount}` : ""}</span><button type="button" className="button subtle" disabled={pageCount === undefined || page + 1 >= pageCount} onClick={() => loadPage(page + 1)}>Next</button></div> : null}
      {livePaging && result ? <small>{result.totalSamples} navigable live layer{result.totalSamples === 1 ? "" : "s"}; {props.group.count} exact evidence value{props.group.count === 1 ? "" : "s"}.</small>
        : props.group.truncated ? <small>Stored sample is capped at 50; the exact evidence count is preserved.</small> : null}
    </details>
  );
}

export function TokenCoverage(props: {
  frames: readonly FrameResult[];
  detailed?: boolean;
  current?: boolean;
  reportHash?: string;
  pages?: Readonly<Record<string, TokenCoveragePageResult>>;
  onRequestPage?: (request: TokenCoveragePageRequest) => void;
  onNavigate?: (nodeId: string) => void;
}) {
  const summary = aggregate(props.frames);
  const rootIds = props.frames.map((frame) => frame.rootId).sort();
  if (props.frames.every((frame) => !frame.tokenCoverage)) return null;
  return (
    <section className="coverage-ledger" aria-label="Token coverage evidence">
      <div className="coverage-heading"><div><span className="section-label">Token coverage ledger</span><strong>{summary.coverage === null ? "Not applicable" : `${summary.coverage.toFixed(1)}%`}</strong></div><small>Only missing source-owned values lower coverage.</small></div>
      <div className="coverage-counts">{DISPOSITIONS.map((disposition) => <div key={disposition} className={`coverage-${disposition}`}><span>{disposition}</span><strong>{summary.counts[disposition]}</strong></div>)}</div>
      {props.detailed ? <details><summary>Inspect grouped evidence</summary><div className="coverage-groups">{summary.groups.map((group) => <CoverageEvidenceGroup
        key={`${props.reportHash ?? rootIds.join(",")}:${group.disposition}:${group.field}:${group.reason}`}
        group={group}
        current={Boolean(props.current)}
        rootIds={rootIds}
        pages={props.pages ?? {}}
        {...(props.reportHash ? { reportHash: props.reportHash } : {})}
        {...(props.onRequestPage ? { onRequestPage: props.onRequestPage } : {})}
        {...(props.onNavigate ? { onNavigate: props.onNavigate } : {})}
      />)}</div></details> : null}
    </section>
  );
}
