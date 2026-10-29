import { parseCanvasInstructions, WORKSPACE_LIMITS, type CanvasJob, type NativeInstruction, type WorkspaceBinding, type WorkspaceLease, type WorkspaceReceipt, type WorkspaceRole } from "../core/conductor-contracts";
import { instructionDigest, sha256 } from "../core/conductor-digest";
import { assertCurrentConductorBinding, readConductorBinding, stampConductorBinding } from "./conductor-binding";

export interface CanvasWorkspaceDeps {
  /** Revalidates the live server lease/capability; throws on any loss. */
  checkpoint: () => Promise<WorkspaceLease>;
  now: () => number;
}

/** Explicit, bounded native writes. Caller owns CommandGate and knowledge invalidation. */
export async function applyConductorWorkspace(job: CanvasJob, lease: WorkspaceLease, screenshot: Uint8Array, deps: CanvasWorkspaceDeps): Promise<WorkspaceReceipt> {
  if (figma.editorType !== "figma" || figma.mode !== "default" || !figma.fileKey || figma.fileKey !== job.fileKey) throw new Error("Open the linked file in Figma Design mode");
  const instructions = parseCanvasInstructions(job.instructions);
  if (instructionDigest(instructions) !== job.instructionDigest || screenshot.length > WORKSPACE_LIMITS.sourceBytes || sha256(screenshot) !== job.sourceDigest) throw new Error("Workspace evidence digest mismatch");
  const checkpoint = async () => {
    const current = await deps.checkpoint();
    if (current.epoch !== lease.epoch || Date.parse(current.expiresAt) <= deps.now()) throw new Error("Workspace lease expired; refresh before retrying");
  };
  await checkpoint();
  await figma.loadAllPagesAsync();
  // Scan stamped identities file-wide; names are presentation and can be edited.
  const matches = figma.root.children.flatMap((page) => page.findAll((node) => readConductorBinding(node)?.workspaceId === job.workspaceId));
  const recovered = new Map<string, SceneNode>();
  for (const node of matches) {
    const binding = assertCurrentConductorBinding(node, job.fileKey);
    if (binding.organizationId !== job.organizationId || binding.projectId !== job.projectId || binding.deliverableId !== job.deliverableId || binding.componentId !== job.componentId || binding.connectionVersion !== job.connectionVersion) throw new Error("Workspace connection changed; existing content needs explicit reconciliation");
    const key = binding.role === "section" || binding.role === "design" ? binding.role
      : `${binding.role}:${binding.revision}:${binding.elementId}`;
    if (recovered.has(key)) throw new Error("Duplicate Conductor identity; resolve copied nodes before retrying");
    recovered.set(key, node);
  }
  const warnings = [...instructions.warnings];
  let fontAvailable = false;
  try { await figma.loadFontAsync({ family: "Inter", style: "Regular" }); fontAvailable = true; }
  catch { warnings.push("Inter Regular is unavailable; reference and Design frames were retained. Retry wireframe generation when the font is available."); }
  const image = figma.createImage(screenshot);
  const size = await image.getSizeAsync();
  if (size.width * size.height > WORKSPACE_LIMITS.sourcePixels) throw new Error("Screenshot exceeds decoded image limit");
  await checkpoint();
  const identity = (role: WorkspaceRole, elementId: string): Omit<WorkspaceBinding, "nodeId"> => ({
    schemaVersion: 1, organizationId: job.organizationId, projectId: job.projectId, deliverableId: job.deliverableId,
    componentId: job.componentId, workspaceId: job.workspaceId, fileKey: job.fileKey, connectionVersion: job.connectionVersion,
    role, jobItemId: job.id, revision: job.revision, elementId,
    variantId: role === "wireframe" ? job.wireframeVariantId : job.designVariantId,
  });
  let section = recovered.get("section");
  if (section && section.type !== "SECTION") throw new Error("Workspace Section was changed; review it before retrying");
  if (!section) {
    let page = figma.root.children.find((candidate) => candidate.getPluginData("conductor-workspaces-page") === "1");
    if (!page) { page = figma.createPage(); page.name = "Conductor workspaces"; page.setPluginData("conductor-workspaces-page", "1"); }
    const created = figma.createSection(); stampConductorBinding(created, identity("section", "section")); page.appendChild(created);
    created.name = `${job.canonicalName} / ${job.deviceLabel} / ${job.componentId}`;
    created.x = 0; created.y = page.children.filter((node) => node.id !== created.id).reduce((bottom, node) => Math.max(bottom, node.y + node.height), -80) + 80;
    section = created;
  }
  const parent = section as SectionNode;
  const referenceKey = `reference:${job.revision}:reference:${job.sourceDigest}`;
  // Reuse an unchanged source even across generation revisions.
  const previousReferences = matches.filter((node) => { const binding = readConductorBinding(node); return binding?.role === "reference" && binding.elementId === `reference:${job.sourceDigest}`; });
  if (previousReferences.length > 1) throw new Error("Multiple screenshot references have the same identity");
  let reference = previousReferences[0] ?? recovered.get(referenceKey);
  if (!reference) {
    const created = figma.createFrame(); stampConductorBinding(created, identity("reference", `reference:${job.sourceDigest}`)); parent.appendChild(created);
    created.name = job.revision === 1 ? "Reference" : `Reference r${job.revision}`;
    created.resize(instructions.width, instructions.width * size.height / size.width);
    created.x = 24; created.y = 40 + (job.revision - 1) * (instructions.height + 80);
    created.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FIT" }]; created.locked = true;
    reference = created;
  }
  let design = recovered.get("design");
  if (!design) {
    const created = figma.createFrame(); stampConductorBinding(created, identity("design", "design")); parent.appendChild(created);
    created.name = "Design"; created.resize(instructions.width, instructions.height); created.x = instructions.width * 2 + 120; created.y = 40;
    design = created;
  }
  const wireKey = `wireframe:${job.revision}:wireframe`;
  let wireframe = recovered.get(wireKey);
  if (wireframe && wireframe.type !== "FRAME") throw new Error("Wireframe root changed; review before retrying");
  const completeKey = `conductor-complete:${job.instructionDigest}`;
  if (wireframe && wireframe.getPluginData(completeKey) !== "1") {
    // An interrupted partial output may have been edited. Do not guess which edits are ours.
    throw new Error("Partial wireframe retained. Inspect it, then request a new wireframe revision in Conductor.");
  }
  if (!wireframe && job.generation === "complete" && fontAvailable) {
    await checkpoint();
    const created = figma.createFrame(); stampConductorBinding(created, identity("wireframe", "wireframe")); parent.appendChild(created);
    created.name = `Wireframe r${job.revision}`; created.resize(instructions.width, instructions.height);
    created.x = instructions.width + 72; created.y = 40 + (job.revision - 1) * (instructions.height + 80);
    let writes = 0;
    const render = async (instruction: NativeInstruction, owner: FrameNode) => {
      if (writes++ % 20 === 0) await checkpoint();
      const node: FrameNode | TextNode | RectangleNode = instruction.kind === "text" ? figma.createText()
        : instruction.kind === "container" || instruction.kind === "control" ? figma.createFrame() : figma.createRectangle();
      stampConductorBinding(node, identity("wireframe", instruction.id)); owner.appendChild(node);
      node.name = instruction.name; node.resize(instruction.width, instruction.height); node.x = instruction.x; node.y = instruction.y;
      if (node.type === "TEXT") { node.fontName = { family: "Inter", style: "Regular" }; node.fontSize = instruction.fontSize ?? 14; node.lineHeight = { unit: "PERCENT", value: 125 }; node.fills = [{ type: "SOLID", color: { r: .12, g: .12, b: .12 } }]; node.characters = instruction.text ?? ""; node.textAutoResize = "NONE"; }
      else {
        node.fills = instruction.kind === "container" ? [] : [{ type: "SOLID", color: { r: .9, g: .9, b: .9 } }];
        if (instruction.kind === "image" || instruction.kind === "control") {
          node.strokes = [{ type: "SOLID", color: { r: .45, g: .45, b: .45 } }];
          node.strokeWeight = 1;
          if (instruction.kind === "image") node.dashPattern = [8, 6];
        }
      }
      if (node.type === "FRAME") {
        if (instruction.layout) { node.layoutMode = instruction.layout === "vertical" ? "VERTICAL" : "HORIZONTAL"; node.primaryAxisSizingMode = "FIXED"; node.counterAxisSizingMode = "FIXED"; node.itemSpacing = instruction.gap ?? 8;
          node.paddingTop = node.paddingRight = node.paddingBottom = node.paddingLeft = instruction.padding ?? 0;
        }
        if (instruction.kind === "control") {
          node.layoutMode = "HORIZONTAL";
          node.primaryAxisSizingMode = "FIXED"; node.counterAxisSizingMode = "FIXED";
          node.primaryAxisAlignItems = "CENTER"; node.counterAxisAlignItems = "CENTER";
          node.paddingLeft = node.paddingRight = 16;
          node.paddingTop = node.paddingBottom = 12;
        }
        for (const child of instruction.children ?? []) await render(child, node);
        if (instruction.kind === "control" && instruction.text) {
          const label = figma.createText(); stampConductorBinding(label, identity("wireframe", `${instruction.id}:label`)); node.appendChild(label);
          label.fontName = { family: "Inter", style: "Regular" }; label.fontSize = instruction.fontSize ?? 14; label.lineHeight = { unit: "PERCENT", value: 125 }; label.characters = instruction.text;
          label.fills = [{ type: "SOLID", color: { r: .12, g: .12, b: .12 } }];
          label.resize(Math.max(1, instruction.width - 32), Math.max(1, instruction.height - 24));
          label.textAutoResize = "NONE";
          label.textAlignHorizontal = "CENTER"; label.textAlignVertical = "CENTER";
          label.x = 16; label.y = 12;
        }
      }
    };
    for (const instruction of instructions.nodes) await render(instruction, created);
    await checkpoint(); created.setPluginData(completeKey, "1"); wireframe = created;
    warnings.push("Native primitives were used; no library or Code Connect mappings were inferred.");
  }
  await checkpoint();
  parent.resizeWithoutConstraints(Math.max(parent.width, instructions.width * 3 + 144), Math.max(parent.height, 80 + job.revision * (instructions.height + 80)));
  figma.commitUndo();
  // Reveal the real output after all guarded writes; never alter the Design frame.
  const page = parent.parent;
  if (page?.type === "PAGE") {
    await figma.setCurrentPageAsync(page);
    figma.viewport.scrollAndZoomIntoView([wireframe ?? design]);
  }
  return { jobItemId: job.id, connectionVersion: job.connectionVersion, epoch: lease.epoch, fileKey: job.fileKey,
    instructionDigest: job.instructionDigest, sectionNodeId: parent.id, referenceNodeId: reference.id, designNodeId: design.id,
    ...(wireframe ? { wireframeNodeId: wireframe.id } : {}), warnings };
}
