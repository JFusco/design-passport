import type { DesignKnowledgeGraph, Finding, NodeSnapshot, ReadinessProfile } from "../contracts";
import { collectDescendants } from "../operations/graph";
import { hasResponsiveVariableSignal } from "../operations/node-fields";
import { createFinding } from "./finding";

function pageRoleForNode(graph: DesignKnowledgeGraph, node: NodeSnapshot): string {
  return graph.pages.find((page) => page.id === node.pageId)?.role ?? "unmapped";
}

export function evaluateResponsiveRules(
  graph: DesignKnowledgeGraph,
  profile: ReadinessProfile,
  root: NodeSnapshot,
): Finding[] {
  const output: Finding[] = [];
  const family = graph.responsiveFamilies.find((item) => item.memberIds.includes(root.id));
  const isScreen = pageRoleForNode(graph, root) === "screens";
  const modeSignal = hasResponsiveVariableSignal(graph, profile, collectDescendants(graph, root.id));
  const widthSignal = profile.breakpoints.some((breakpoint) => Math.abs(breakpoint.width - root.width) <= 0.5);
  const hasSignal = Boolean(family && family.memberIds.length >= 2) || modeSignal;
  output.push(createFinding(
    "responsive.signal",
    "responsive-completeness",
    4,
    root,
    root,
    !isScreen || hasSignal ? "pass" : "fail",
    "Responsive signal",
    !isScreen
      ? "This target is not mapped to the Screens role."
      : hasSignal
        ? "Responsive intent is represented by sibling specimens or an in-use approved variable with multiple breakpoint modes."
        : "A matching width alone is not responsive evidence; no sibling specimen or in-use multi-mode variable was found.",
    { isScreen, familyMemberCount: family?.memberIds.length ?? 0, modeSignal, widthSignal },
    isScreen && !hasSignal ? { hardBlocker: true } : {},
  ));

  if (!family) {
    output.push(createFinding(
      "responsive.family",
      "responsive-completeness",
      2,
      root,
      root,
      isScreen ? "needs-review" : "not-applicable",
      "Responsive specimen family",
      isScreen
        ? "No `<Artifact> / <Breakpoint> / <Width>` sibling family was resolved."
        : "Responsive specimen naming applies to screen artifacts.",
      { configuredWidths: profile.breakpoints.map((breakpoint) => breakpoint.width) },
    ));
    return output;
  }

  output.push(createFinding(
    "responsive.collisions",
    "responsive-completeness",
    4,
    root,
    root,
    family.hasCollision ? "fail" : "pass",
    "Unique responsive mapping",
    family.hasCollision
      ? "Breakpoint names or widths collide or disagree with the configured profile."
      : "Breakpoint names and widths map uniquely.",
    { breakpointNames: family.breakpointNames, widths: family.widths },
    family.hasCollision ? { hardBlocker: true } : {},
  ));
  const expected = profile.breakpoints.map((breakpoint) => breakpoint.name.toLocaleLowerCase("en-US"));
  const actual = new Set(family.breakpointNames.map((name) => name.toLocaleLowerCase("en-US")));
  const missing = expected.filter((name) => !actual.has(name));
  output.push(createFinding(
    "responsive.completeness",
    "responsive-completeness",
    2,
    root,
    root,
    missing.length === 0 ? "pass" : "fail",
    "Configured breakpoint specimens",
    missing.length === 0
      ? "Every configured breakpoint has a first-class specimen."
      : `Missing specimens: ${missing.join(", ")}.`,
    { expected, actual: [...actual], missing },
  ));
  output.push(createFinding(
    "responsive.content-parity",
    "responsive-completeness",
    1,
    root,
    root,
    family.contentSignaturesMatch ? "pass" : "needs-review",
    "Responsive content consistency",
    family.contentSignaturesMatch
      ? "Structural signatures match across breakpoint specimens."
      : "Breakpoint specimens have different structural signatures; verify intentional content differences.",
    { contentSignaturesMatch: family.contentSignaturesMatch },
  ));
  output.push(createFinding(
    "responsive.binding-parity",
    "responsive-completeness",
    2,
    root,
    root,
    family.bindingParity ? "pass" : "fail",
    "Responsive token parity",
    family.bindingParity
      ? "Variable bindings match across specimens."
      : "Variable identities or bound field channels drift across breakpoint specimens.",
    { bindingParity: family.bindingParity },
  ));
  return output;
}
