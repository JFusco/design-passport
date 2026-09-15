(() => {
  const config = /*__QA_CONFIG__*/;
  const production = figma.ui.onmessage;
  if (typeof production !== "function") throw new Error("The production message handler must be initialized before Native QA");
  const allowed = () => figma.editorType === "figma" && Boolean(figma.fileKey) && config.allowedWriteFileKeys.includes(figma.fileKey);
  const post = (type, data) => figma.ui.postMessage({ type, ...data });
  const writeCommands = new Set(["save-profile", "apply-plan", "apply-all", "certify", "certify-components", "import-project-style-guide", "remove-project-style-guide", "waive", "clear-waiver", "confirm-pattern", "create-token", "clear-file-cache", "forget-saved-audit"]);
  const readCommands = new Set(["initialize", "scan", "refresh-audit", "recheck-audit", "audit-pages", "open-saved-audit", "save-audit-view", "cancel-scan", "navigate", "add-session-reference", "clear-session-references", "preview-contribution", "export-contribution", "export"]);
  const measuredCommands = new Set(["scan", "refresh-audit", "recheck-audit", "audit-pages", "apply-plan", "apply-all", "waive", "clear-waiver", "confirm-pattern", "create-token", "import-project-style-guide", "remove-project-style-guide", "add-session-reference", "clear-session-references"]);
  let commandSequence = 0;
  const assertWritable = () => { if (!allowed()) throw new Error("Native QA document writes are restricted to explicit private-copy file keys in the generated allowlist"); };
  const inspectNode = (node) => node ? {
    id: node.id, name: node.name, type: node.type,
    ...("width" in node ? { width: node.width, height: node.height, visible: node.visible, opacity: node.opacity } : {}),
    ...("x" in node ? { x: node.x, y: node.y } : {}),
    ...("layoutMode" in node ? { layoutMode: node.layoutMode, inferredAutoLayoutAvailable: node.inferredAutoLayout !== null } : {}),
    ...("annotations" in node ? { annotationLabels: node.annotations.map((annotation) => annotation.label) } : {}),
    ...("children" in node ? { children: node.children.map((child) => ({ id: child.id, name: child.name, type: child.type,
      ...("x" in child ? { x: child.x, y: child.y } : {}), ...("width" in child ? { width: child.width, height: child.height } : {}),
      ...("layoutMode" in child ? { layoutMode: child.layoutMode } : {}) })) } : {}),
    ...(node.type === "TEXT" ? {
      textStyleEvidence: {
        textStyleId: node.textStyleId === figma.mixed ? "mixed" : node.textStyleId,
        fontSize: node.fontSize === figma.mixed ? "mixed" : node.fontSize,
        segments: node.getStyledTextSegments(["textStyleId", "textStyleOverrides", "fontName", "fontWeight", "fontSize", "letterSpacing", "lineHeight"])
          .map(({ characters: _characters, ...segment }) => segment),
      },
    } : {}),
  } : null;
  const originalInfo = console.info;
  console.info = (...values) => {
    originalInfo.apply(console, values);
    if (typeof values[0] === "string" && values[0].startsWith("[Design Passport]")) {
      try { post("qa-diagnostic", { at: new Date().toISOString(), values: JSON.parse(JSON.stringify(values)) }); } catch { /* Logging cannot change production results. */ }
    }
  };
  figma.ui.onmessage = async (message, properties) => {
    const measured = measuredCommands.has(message?.type);
    const commandId = measured ? (typeof message.__nativeQaCommandId === "string" && /^qa-request-[0-9]+$/.test(message.__nativeQaCommandId)
      ? message.__nativeQaCommandId : `native-command-${++commandSequence}`) : undefined;
    const started = Date.now();
    // Correlation is QA envelope metadata, never an added production argument.
    if (message && Object.prototype.hasOwnProperty.call(message, "__nativeQaCommandId")) {
      const { __nativeQaCommandId: _correlation, ...original } = message;
      message = original;
    }
    if (measured) post("qa-command-started", { commandId, commandType: message.type, request: message, startedAt: new Date(started).toISOString() });
    let rejected = false;
    try {
      if (message?.type === "qa-inspect") {
        const ids = message.nodeIds === undefined ? figma.currentPage.selection.map((node) => node.id) : message.nodeIds;
        if (!Array.isArray(ids) || ids.length > 20 || ids.some((id) => typeof id !== "string" || id.length > 200)) throw new Error("Inspect accepts at most 20 explicit node IDs");
        post("qa-inspection", {
          metadata: config, fileKey: figma.fileKey ?? null, fileName: figma.root.name, editorType: figma.editorType, canWrite: allowed(),
          currentPageId: figma.currentPage.id, pages: figma.root.children.map((page) => ({ id: page.id, name: page.name })),
          nodes: await Promise.all(ids.map(async (id) => inspectNode(await figma.getNodeByIdAsync(id)))),
        });
        return;
      }
      if (message?.type === "qa-edit") {
        assertWritable();
        if (typeof message.nodeId !== "string" || message.nodeId.length > 200) throw new Error("A node ID is required");
        const node = await figma.getNodeByIdAsync(message.nodeId);
        if (!node || node.type === "DOCUMENT" || node.type === "PAGE" || node.removed) throw new Error("The editable scene node no longer exists");
        const field = message.field;
        const value = message.value;
        if (field === "name" ? typeof value !== "string" || !value || value.length > 300
          : field === "visible" ? typeof value !== "boolean"
            : !["opacity", "width", "height", "cornerRadius", "strokeWeight"].includes(field)
              || typeof value !== "number" || !Number.isFinite(value) || value < (field === "width" || field === "height" ? 1 : 0)
              || value > (field === "opacity" ? 1 : 10000)) throw new Error("Unsupported or invalid controlled property edit");
        if (!(field in node) || ((field === "width" || field === "height") && typeof node.resize !== "function")) throw new Error("This node does not own the editable property");
        const before = node[field];
        figma.commitUndo();
        if (field === "width" || field === "height") node.resize(field === "width" ? value : node.width, field === "height" ? value : node.height);
        else node[field] = value;
        figma.commitUndo();
        post("qa-edited", { at: new Date().toISOString(), fileKey: figma.fileKey, nodeId: node.id, field, before, after: node[field] });
        return;
      }
      if (message?.type === "qa-create-fixtures") {
        assertWritable();
        if (typeof NativeQaFixtures?.createScannerMaintenanceFixtures !== "function") throw new Error("Fixture helper is unavailable in this harness");
        const result = await NativeQaFixtures.createScannerMaintenanceFixtures();
        post("qa-fixture-created", { at: new Date().toISOString(), fileKey: figma.fileKey, result });
        return;
      }
      if (!message || typeof message.type !== "string") throw new Error("A production message type is required");
      // History mutations are permitted only in explicitly task-owned copies;
      // an original or another ongoing QA file can never be cleared here.
      if (writeCommands.has(message.type)) assertWritable();
      else if (!readCommands.has(message.type)) throw new Error("Unrecognized production command is blocked by the QA write boundary");
      return await production(message, properties);
    } catch (error) {
      rejected = true;
      post("qa-error", { at: new Date().toISOString(), commandId, message: error instanceof Error ? error.message : String(error) });
    } finally {
      if (measured) post("qa-command-complete", {
        commandId, commandType: message.type, completedAt: new Date().toISOString(),
        handlerElapsedMs: Date.now() - started, returned: rejected ? "rejected" : "fulfilled",
      });
    }
  };
})();
