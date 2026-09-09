import { AXIS_LABELS } from "../../core/constants";
import type { ReadinessReport } from "../../core/contracts";
import { reportBreakdown } from "../operations/breakdown";
import { gradeClass } from "../operations/presentation";

export function Modules(props: {
  report: ReadinessReport | undefined;
  onNavigate: (nodeId: string) => void;
  onViewFindings: (rootId: string) => void;
}) {
  if (!props.report) return <section className="panel"><div className="empty-state"><h2>No module results yet</h2><p>Run a page or full-file audit to see page → module → issue attribution.</p></div></section>;
  const pages = reportBreakdown(props.report);
  return (
    <section className="panel stack">
      <div className="section-heading"><div><span className="section-label">Result breakdown</span><h2>Pages and modules</h2><p>Every module is graded independently using shared whole-file knowledge. Open a page, then inspect its lowest-scoring components first.</p></div></div>
      {pages.map((page) => (
        <details className="page-breakdown" key={page.pageId} open={pages.length === 1}>
          <summary><span><strong>{page.pageName}</strong><small>{page.modules.length} module{page.modules.length === 1 ? "" : "s"} · {page.actionableCount} issues</small></span><span className="grade-summary">{Object.entries(page.gradeCounts).filter(([, count]) => count > 0).map(([grade, count]) => `${count}${grade}`).join(" · ")}</span></summary>
          <div className="module-list">
            {page.modules.map((module) => (
              <article className="module-row" key={module.rootId}>
                <button className="module-name" onClick={() => props.onNavigate(module.rootId)}><span className={`${gradeClass(module.grade.letter)} module-grade`}>{module.grade.letter}</span><span><strong>{module.rootName}</strong><small>{module.rootType.replaceAll("_", " ").toLowerCase()} · {module.grade.score.toFixed(1)}</small></span></button>
                <div className="module-metrics"><span><strong>{module.actionableCount}</strong> issues</span><span>{module.failCount} fail · {module.reviewCount} review</span></div>
                <div className="module-diagnostics"><small>Weakest: {module.weakestAxes.map((axis) => AXIS_LABELS[axis]).join(" · ")}</small>{module.topRules.length > 0 && <small>Top rules: {module.topRules.map((rule) => `${rule.ruleId} (${rule.count})`).join(" · ")}</small>}</div>
                {module.variants.length > 0 && (
                  <details className="variant-breakdown">
                    <summary>{module.variants.length} variants covered by this aggregate grade</summary>
                    <p>Each child and its descendants were scanned. Child variants are covered, not independently graded.</p>
                    <div className="variant-list">
                      {module.variants.map((variant) => (
                        <button key={variant.variantId} onClick={() => props.onNavigate(variant.variantId)}>
                          <span><strong>{variant.variantName}</strong><small>{Object.entries(variant.variantProperties).map(([key, value]) => `${key}: ${value}`).join(" · ") || "No variant properties"}</small></span>
                          <span>{variant.nodeCount} nodes · {variant.actionableCount} issues</span>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
                <button className="button subtle" onClick={() => props.onViewFindings(module.rootId)}>View issues</button>
              </article>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
