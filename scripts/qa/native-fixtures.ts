/**
 * Native Plugin API acceptance fixtures. Import only from the QA harness after
 * its isolated-file allowlist check; this module must never enter the shipped plugin.
 * It creates one new QA page and QA-owned local resources without removing existing data.
 */
export interface NativeFixtureCase {
  key: string;
  nodeIds: string[];
  purpose: string;
  expected: Record<string, string | number | boolean | string[]>;
}

export interface ScannerMaintenanceFixtures {
  pageId: string;
  pageName: string;
  rootIds: string[];
  nodeIds: Record<string, string>;
  collectionId: string;
  collectionKey: string;
  variableIds: Record<string, string>;
  styleIds: { body: string };
  textStyleEvidence: Record<string, {
    textStyleId: string;
    fontSize: number | "mixed";
    segments: Array<Record<string, unknown>>;
  }>;
  variableBindingEvidence: Record<string, string>;
  propertyEvidence: Record<string, Record<string, unknown>>;
  booleanPropertyIds: { disabled: string; enabled: string };
  expectations: NativeFixtureCase[];
  cleanupRootIds: string[];
  layoutEvidence: Array<{ nodeId: string; inferredAutoLayoutAvailable: boolean; bounds: { x: number; y: number; width: number; height: number }; children: Array<{ nodeId: string; x: number; y: number; width: number; height: number }> }>;
  localizedEditCandidates: Array<{ nodeId: string; fragmentRootId: string; fragmentNodeCount: number }>;
  nodeCount: number;
}

const color = (value: number, opacity = 1): SolidPaint => ({ type: "SOLID", color: { r: value, g: value, b: value }, opacity });

export async function createScannerMaintenanceFixtures(): Promise<ScannerMaintenanceFixtures> {
  const font: FontName = { family: "Inter", style: "Regular" };
  await figma.loadFontAsync(font);
  const page = figma.createPage();
  page.name = `[QA] Scanner maintenance acceptance ${new Date().toISOString().slice(0, 19)}`;
  page.setPluginData("scanner-maintenance-fixture-v1", "native-acceptance");
  const ids: Record<string, string> = {};
  const cases: NativeFixtureCase[] = [];
  const roots: FrameNode[] = [];
  const mark = <T extends SceneNode>(key: string, value: T): T => { ids[key] = value.id; value.name = `QA ${key}`; return value; };
  const frame = (key: string, parent: PageNode | FrameNode | ComponentNode, x: number, y: number, width = 320, height = 180): FrameNode => {
    const value = mark(key, figma.createFrame()); parent.appendChild(value);
    value.resize(width, height); value.x = x; value.y = y; value.fills = [color(1)]; value.clipsContent = false;
    return value;
  };
  const panel = (key: string, x: number, y: number, width: number, height: number): FrameNode => {
    const value = frame(key, page, x, y, width, height); roots.push(value); return value;
  };
  const rectangle = (key: string, parent: FrameNode | ComponentNode, x: number, y: number, width = 48, height = 48): RectangleNode => {
    const value = mark(key, figma.createRectangle()); parent.appendChild(value);
    value.resize(width, height); value.x = x; value.y = y; value.fills = [color(0.7)];
    return value;
  };
  const text = (key: string, parent: FrameNode | ComponentNode, x: number, y: number, fill = 0): TextNode => {
    const value = mark(key, figma.createText()); parent.appendChild(value);
    value.fontName = font; value.fontSize = 16; value.lineHeight = { unit: "PIXELS", value: 24 };
    value.characters = `QA ${key}`; value.fills = [color(fill)]; value.x = x; value.y = y;
    return value;
  };
  const check = (key: string, nodes: SceneNode[], purpose: string, expected: NativeFixtureCase["expected"]) => {
    cases.push({ key, nodeIds: nodes.map((node) => node.id), purpose, expected });
  };
  const component = (key: string, parent: FrameNode, x: number, y: number, fill?: number): ComponentNode => {
    const value = mark(key, figma.createComponent()); parent.appendChild(value);
    value.resize(190, 48); value.x = x; value.y = y; value.fills = fill === undefined ? [] : [color(fill)];
    value.clipsContent = false; value.description = "Synthetic native QA component; safe to edit in this isolated fixture.";
    return value;
  };

  const collection = figma.variables.createVariableCollection("Scanner QA / Semantic");
  const variables: Record<string, Variable> = {};
  const numeric = (key: string, name: string, value: number, scope: VariableScope) => {
    const variable = figma.variables.createVariable(name, collection, "FLOAT");
    variable.scopes = [scope]; variable.setValueForMode(collection.defaultModeId, value);
    variable.setVariableCodeSyntax("WEB", `var(--qa-${key})`); variables[key] = variable; return variable;
  };
  const bodySize = numeric("body-size", "semantic/type/body/font-size", 16, "FONT_SIZE");
  const actionSize = numeric("action-size", "semantic/type/action/font-size", 16, "FONT_SIZE");
  numeric("body-tracking", "semantic/type/body/tracking", 1, "LETTER_SPACING");
  numeric("action-tracking", "semantic/type/action/tracking", 1, "LETTER_SPACING");
  numeric("gap", "semantic/space/control-gap", 8, "GAP");
  const style = figma.createTextStyle(); style.name = "Scanner QA / Type / Body";
  style.fontName = font; style.fontSize = 16; style.lineHeight = { unit: "PIXELS", value: 24 };
  style.letterSpacing = { unit: "PIXELS", value: 1 };
  style.paragraphSpacing = 0; style.paragraphIndent = 0;

  const typography = panel("Typography", 0, 0, 430, 310);
  const styled = text("styled text", typography, 16, 16); await styled.setTextStyleIdAsync(style.id);
  const override = text("style override", typography, 16, 58); await override.setTextStyleIdAsync(style.id);
  const mixed = text("mixed runs", typography, 16, 104); await mixed.setTextStyleIdAsync(style.id); mixed.setRangeFontSize(0, 2, 22);
  const percent = text("percentage units", typography, 16, 152); percent.letterSpacing = { unit: "PERCENT", value: 5 }; percent.lineHeight = { unit: "PERCENT", value: 150 };
  const body = text("body intent", typography, 16, 200); body.setBoundVariable("fontSize", bodySize);
  const action = text("action intent", typography, 16, 242); action.setBoundVariable("fontSize", actionSize);
  check("text-style", [styled], "Applied reusable style counts for the fields it controls without pretending those fields are variable bound.", { styleStatus: "resolved", styleId: style.id, controlledFields: ["fontFamily", "fontStyle", "fontSize", "fontWeight", "letterSpacing", "lineHeight"], explicitFontSizeBinding: false });
  check("style-override", [override], "In the Figma editor, apply Bold (Cmd+B) to this styled text. The semantic weight override must be evaluated independently while the remaining style fields retain their evidence.", { nativeSetup: "Select the node and apply Bold with Cmd+B", explicitOverrideKind: "SEMANTIC_WEIGHT", fontWeight: 700, overriddenFields: ["fontStyle", "fontWeight"], styleId: style.id });
  check("mixed-runs", [mixed], "Mixed fontSize receives review and no automatic property binding.", { reviewRule: "token.application.typography-review", scoreImpact: false, fontSizeRepairable: false });
  check("percentage-units", [percent], "Preserve percentage units and avoid automatic unit-changing repairs.", { letterSpacingUnit: "PERCENT", lineHeightUnit: "PERCENT", letterSpacingRepairable: false, lineHeightRepairable: false });
  check("equal-value-semantics", [body, action], "Equal numeric token values keep their explicitly chosen semantic identities.", { numericValue: 16, distinctVariableIds: [bodySize.id, actionSize.id] });

  const geometry = panel("Geometry", 480, 0, 520, 310);
  const noStroke = rectangle("no stroke", geometry, 16, 16); noStroke.strokes = []; noStroke.strokeWeight = 2;
  const hiddenStroke = rectangle("hidden stroke", geometry, 84, 16); hiddenStroke.strokes = [{ ...color(0), visible: false }]; hiddenStroke.strokeWeight = 2;
  const transparentStroke = rectangle("transparent stroke", geometry, 152, 16); transparentStroke.strokes = [color(0, 0)]; transparentStroke.strokeWeight = 2;
  const visibleStroke = rectangle("visible stroke", geometry, 220, 16); visibleStroke.strokes = [color(0)]; visibleStroke.strokeWeight = 2;
  const inert = rectangle("inert radius", geometry, 16, 94); inert.fills = []; inert.strokes = []; inert.cornerRadius = 8;
  const surface = rectangle("surface radius", geometry, 84, 94); surface.cornerRadius = 8;
  const corners = rectangle("mixed corners", geometry, 152, 94); corners.topLeftRadius = 4; corners.topRightRadius = 12; corners.bottomLeftRadius = 0; corners.bottomRightRadius = 8;
  const clipped = frame("clipping radius", geometry, 220, 94, 48, 48); clipped.fills = []; clipped.cornerRadius = 12; clipped.clipsContent = true;
  rectangle("clipped paint", clipped, -8, -8, 64, 64);
  const maskGroup = frame("mask boundary", geometry, 308, 94, 48, 48); maskGroup.fills = [];
  const mask = rectangle("radius mask", maskGroup, 0, 0); mask.fills = [color(1)]; mask.cornerRadius = 12; mask.isMask = true;
  rectangle("masked paint", maskGroup, 0, 0);
  check("inert-strokes", [noStroke, hiddenStroke, transparentStroke], "Non-rendering stroke metadata is excluded from both coverage debt and binding credit.", { strokeWeightEligible: false, strokesEligible: false });
  check("visible-stroke", [visibleStroke], "Visible nonzero stroke remains measurable.", { strokeWeightEligible: true });
  check("inert-radius", [inert], "An empty, non-clipping shape has no rendered radius debt.", { cornerRadiusEligible: false });
  check("rendered-radius", [surface, clipped, mask], "Painted surfaces, clipping boundaries and masks retain radius evidence.", { cornerRadiusEligible: true });
  check("mixed-corners", [corners], "Different corners are captured separately without a uniform-radius repair.", { topLeft: 4, topRight: 12, bottomLeft: 0, bottomRight: 8, cornerRadiusRepairable: false });

  const paints = panel("Paint contexts", 0, 370, 520, 310); paints.fills = [color(0)];
  const source = component("transparent source", paints, 16, 16);
  const definitionText = text("source white text", source, 8, 8, 1);
  const placed = mark("placed transparent instance", source.createInstance()); paints.appendChild(placed); placed.x = 16; placed.y = 88;
  const placedText = placed.findOne((child) => child.type === "TEXT") as TextNode; ids["placed white text"] = placedText.id;
  const translucent = frame("translucent ancestor", paints, 16, 160, 240, 48); translucent.fills = [color(1, 0.5)];
  const translucentText = text("translucent background", translucent, 8, 8, 0);
  const stackedText = text("first paint on top", paints, 16, 240, 0); stackedText.fills = [color(1, 0.5), color(0)];
  check("transparent-definition", [definitionText], "A transparent component definition has no consumer backdrop even when its authoring panel is painted.", { backgroundResolvable: false, rule: "accessibility.contrast-unresolved", status: "needs-review", scoreImpact: false });
  check("placed-instance", [placedText], "The same component's placed text resolves against the actual consumer surface.", { backgroundResolvable: true, backgroundChannel: 0, contrastRatio: 21, evidenceRole: "instance-descendant" });
  check("translucent-background", [translucentText], "White at 50% over black is a supported gray background.", { backgroundResolvable: true, backgroundChannel: 0.5 });
  check("paint-stack-order", [stackedText], "Native Figma fills are first-on-top: half-white over opaque black resolves to gray.", { foregroundChannel: 0.5, backgroundChannel: 0, backgroundResolvable: true });

  const states = panel("Interaction state", 570, 370, 700, 370);
  const stateSource = component("Boolean source", states, 16, 16, 1);
  // Keep the full synthetic label inside the painted component surface so the
  // contrast cases isolate Boolean state rather than clipping geometry.
  stateSource.resize(216, 48);
  const disabledId = stateSource.addComponentProperty("Disabled", "BOOLEAN", false);
  const enabledId = stateSource.addComponentProperty("Enabled", "BOOLEAN", true);
  text("low contrast state label", stateSource, 8, 8, 0.7);
  // Unpainted one-pixel markers establish real BOOLEAN bindings without hiding
  // the foreground under test. Each remains an ordinary scene node, never a mock.
  const disabledMarker = rectangle("disabled property marker", stateSource, 180, 1, 1, 1); disabledMarker.fills = []; disabledMarker.visible = false; disabledMarker.componentPropertyReferences = { visible: disabledId };
  const enabledMarker = rectangle("enabled property marker", stateSource, 182, 1, 1, 1); enabledMarker.fills = []; enabledMarker.componentPropertyReferences = { visible: enabledId };
  const stateInstance = (key: string, x: number, disabled: boolean, enabled: boolean) => {
    const instance = mark(key, stateSource.createInstance()); states.appendChild(instance); instance.x = x; instance.y = 90;
    instance.setProperties({ [disabledId]: disabled, [enabledId]: enabled });
    const label = instance.findOne((child) => child.type === "TEXT") as TextNode; ids[`${key} label`] = label.id;
    return { instance, label };
  };
  const disabled = stateInstance("disabled true", 16, true, false);
  const enabled = stateInstance("disabled false", 240, false, true);
  const conflicting = stateInstance("conflicting state", 464, true, true);
  const inactive = component("inactive", states, 16, 200, 1); inactive.name = "State=inactive";
  const inactiveText = text("inactive label", inactive, 8, 8, 0.7);
  const unchecked = component("unchecked", states, 240, 200, 1); unchecked.name = "State=unchecked";
  const uncheckedText = text("unchecked label", unchecked, 8, 8, 0.7);
  const stateVariants = figma.combineAsVariants([inactive, unchecked], states); mark("State variants", stateVariants);
  stateVariants.x = 16; stateVariants.y = 200;
  check("disabled-Boolean", [disabled.label], "An explicit true Disabled property and false Enabled property exempt the visible label.", { interactionState: "disabled", rule: "accessibility.contrast-disabled", status: "not-applicable" });
  check("enabled-Boolean", [enabled.label], "False Disabled remains interactive and its low-contrast text fails.", { interactionState: "enabled", rule: "accessibility.text-contrast-node", status: "fail" });
  check("conflicting-Boolean", [conflicting.label], "Conflicting Boolean evidence requires review rather than an exemption.", { interactionState: "conflicting", rule: "accessibility.contrast-unresolved", status: "needs-review" });
  check("non-disabled-variants", [inactiveText, uncheckedText], "Inactive and unchecked are not disabled exemptions.", { interactionState: "unknown", rule: "accessibility.text-contrast-node", status: "fail" });

  const targets = panel("Target geometry", 0, 740, 580, 120);
  const hit = async (key: string, x: number, size: number) => {
    const value = rectangle(key, targets, x, 24, size, size);
    await value.setReactionsAsync([{ trigger: { type: "ON_CLICK" }, actions: [{ type: "BACK" }] }]);
    return value;
  };
  const below = await hit("Button 23.99 spaced", 16, 23.99);
  const exact = await hit("Button 24 minimum", 72, 24);
  const preferred = await hit("Button 44 preferred", 136, 44);
  const tight = await hit("Button 23 tight", 230, 23);
  const neighbor = await hit("Button tight neighbor", 253.1, 24);
  const overlap = await hit("Button overlapping", 342, 24);
  const overlapPeer = await hit("Button overlap peer", 354, 24);
  check("small-spacing-exception", [below], "23.99px target is below the size minimum but satisfies the evidenced spacing exception.", { assessment: "spacing-exception", hasPointerInteraction: true, preferredScoreImpact: false });
  check("target-boundaries", [exact, preferred], "24px satisfies the minimum; 44px satisfies enhanced guidance.", { minimumStatus: "pass", preferredScoreImpact: false });
  check("tight-targets", [tight, neighbor], "A small target's 24px circle intersects a separate adjacent target without overlapping actual rectangles.", { tightAssessment: "undersized", tightStatus: "fail" });
  check("overlapping-targets", [overlap, overlapPeer], "Overlapping targets have ambiguous hit regions and require review.", { assessment: "review", status: "needs-review", scoreImpact: false });

  const cleanupRootIds: string[] = [];
  const cleanupPanel = panel("Cleanup candidates", 630, 790, 500, 110);
  const cleanupCandidates: FrameNode[] = [];
  for (let index = 0; index < 3; index += 1) {
    const candidate = frame(`repeated container ${index + 1}`, cleanupPanel, 8 + index * 160, 24, 132, 56);
    cleanupCandidates.push(candidate);
    candidate.layoutMode = "HORIZONTAL"; candidate.primaryAxisSizingMode = "FIXED"; candidate.counterAxisSizingMode = "FIXED";
    candidate.paddingTop = 8; candidate.paddingBottom = 8; candidate.paddingLeft = 8; candidate.paddingRight = 8; candidate.itemSpacing = 8;
    rectangle(`repeated child ${index + 1} A`, candidate, 8, 8, 16, 16);
    rectangle(`repeated child ${index + 1} B`, candidate, 32, 8, 16, 16);
    cleanupRootIds.push(candidate.id);
  }
  // An intentional naming defect provides a guarded, reversible cleanup smoke case.
  const cleanup = cleanupCandidates[cleanupCandidates.length - 1]!; cleanup.name = "QA  cleanup spacing";
  check("repeated-layout-literals", cleanupCandidates, "Three owned layout properties allow semantic-token creation without changing geometry.", { rule: "token.application.repeated-literal", property: "paddingBottom", rawValue: 8, structuralConsolidationScoring: false });
  check("safe-cleanup-name", [cleanup], "Whitespace cleanup can be previewed, applied, verified and undone in this isolated file.", { rule: "naming.whitespace", fixability: "automatic" });

  const manual = panel("Manual layout acceptance", 0, 930, 430, 100);
  manual.layoutMode = "NONE";
  const manualFirst = text("manual child one", manual, 16, 16);
  text("manual child two", manual, 226, 16);
  cleanupRootIds.push(manual.id);
  check("inferred-layout-preflight", [manual], "Observe native inferredAutoLayout availability, then preview/apply on a clone and compare before/after child bounds. Use this source for 0.5px acceptance, 0.51px rejection, rollback and undo testing; Figma determines whether inference is available.", { candidateRule: "structure.inferred-auto-layout", availability: "observe-native-inferredAutoLayout", tolerancePx: 0.5, rejectionTolerancePx: 0.51, temporaryClonesRetained: false });

  const layoutEvidence = [{ nodeId: manual.id, inferredAutoLayoutAvailable: manual.inferredAutoLayout !== null,
    bounds: { x: manual.x, y: manual.y, width: manual.width, height: manual.height },
    children: manual.children.map((child) => ({ nodeId: child.id, x: child.x, y: child.y, width: child.width, height: child.height })) }];
  const localizedEditCandidates = [{ nodeId: manualFirst.id, fragmentRootId: manual.id, fragmentNodeCount: manual.findAll().length + 1 },
    { nodeId: styled.id, fragmentRootId: typography.id, fragmentNodeCount: typography.findAll().length + 1 }];
  const allNodes = page.findAll();
  const styleValue = (node: TextNode): ScannerMaintenanceFixtures["textStyleEvidence"][string] => ({
    textStyleId: node.textStyleId === figma.mixed ? "mixed" : node.textStyleId,
    fontSize: node.fontSize === figma.mixed ? "mixed" : node.fontSize,
    segments: node.getStyledTextSegments(["textStyleId", "textStyleOverrides", "fontName", "fontWeight", "fontSize", "letterSpacing", "lineHeight"])
      .map((segment) => ({ ...segment })),
  });
  const strokePaintEvidence = (node: SceneNode) => "strokes" in node && node.strokes !== figma.mixed
    ? node.strokes.map((paint) => ({ type: paint.type, visible: paint.visible !== false, opacity: paint.opacity ?? 1 })) : [];
  const variableId = (node: TextNode, field: "fontSize") => {
    const binding = node.boundVariables?.[field];
    const aliases = Array.isArray(binding) ? binding : binding ? [binding] : [];
    return aliases[0]?.id ?? "";
  };
  return { pageId: page.id, pageName: page.name, rootIds: roots.map((root) => root.id), nodeIds: ids,
    collectionId: collection.id, collectionKey: collection.key,
    variableIds: Object.fromEntries(Object.entries(variables).map(([key, variable]) => [key, variable.id])),
    styleIds: { body: style.id }, textStyleEvidence: { styled: styleValue(styled), override: styleValue(override), mixed: styleValue(mixed), percentage: styleValue(percent) },
    variableBindingEvidence: { bodyFontSize: variableId(body, "fontSize"), actionFontSize: variableId(action, "fontSize") },
    propertyEvidence: {
      noStroke: { strokeWeight: noStroke.strokeWeight, strokes: strokePaintEvidence(noStroke) },
      hiddenStroke: { strokeWeight: hiddenStroke.strokeWeight, strokes: strokePaintEvidence(hiddenStroke) },
      transparentStroke: { strokeWeight: transparentStroke.strokeWeight, strokes: strokePaintEvidence(transparentStroke) },
      visibleStroke: { strokeWeight: visibleStroke.strokeWeight, strokes: strokePaintEvidence(visibleStroke) },
      inertRadius: { cornerRadius: inert.cornerRadius, fillCount: inert.fills === figma.mixed ? "mixed" : inert.fills.length, strokeCount: inert.strokes === figma.mixed ? "mixed" : inert.strokes.length, clipsContent: false, isMask: false },
      surfaceRadius: { cornerRadius: surface.cornerRadius, fillCount: surface.fills === figma.mixed ? "mixed" : surface.fills.length },
      mixedCorners: { topLeft: corners.topLeftRadius, topRight: corners.topRightRadius, bottomLeft: corners.bottomLeftRadius, bottomRight: corners.bottomRightRadius },
      clippingRadius: { cornerRadius: clipped.cornerRadius, clipsContent: clipped.clipsContent },
      radiusMask: { cornerRadius: mask.cornerRadius, isMask: mask.isMask },
    },
    booleanPropertyIds: { disabled: disabledId, enabled: enabledId }, expectations: cases, cleanupRootIds, layoutEvidence, localizedEditCandidates, nodeCount: allNodes.length };
}
