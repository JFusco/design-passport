export interface KnowledgeBuildToken {
  id: number;
  revision: number;
}

export class KnowledgeSessionState {
  private revision = 0;
  private cleanRevision = -1;
  private nextBuildId = 1;
  private activeBuildId: number | undefined;
  private changedNodeIds = new Set<string>();
  private fullBuildReason: string | undefined = "not-loaded";

  get documentRevision(): number { return this.revision; }

  get changes(): { nodeIds: string[]; fullBuildReason?: string } {
    return { nodeIds: [...this.changedNodeIds], ...(this.fullBuildReason ? { fullBuildReason: this.fullBuildReason } : {}) };
  }

  get dirty(): boolean {
    return this.cleanRevision !== this.revision;
  }

  get buildActive(): boolean {
    return this.activeBuildId !== undefined;
  }

  markDirty(nodeIds?: readonly string[], fullBuildReason?: string): void {
    this.revision += 1;
    for (const id of nodeIds ?? []) this.changedNodeIds.add(id);
    if (fullBuildReason || !nodeIds) this.fullBuildReason = fullBuildReason ?? "unknown-change";
  }

  beginBuild(): KnowledgeBuildToken {
    if (this.activeBuildId !== undefined) throw new Error("A whole-file knowledge build is already running");
    const token = { id: this.nextBuildId, revision: this.revision };
    this.nextBuildId += 1;
    this.activeBuildId = token.id;
    this.cleanRevision = -1;
    return token;
  }

  completeBuild(token: KnowledgeBuildToken, complete: boolean): boolean {
    this.assertActive(token);
    this.activeBuildId = undefined;
    if (complete && token.revision === this.revision) {
      this.cleanRevision = this.revision;
      this.changedNodeIds.clear();
      this.fullBuildReason = undefined;
    }
    return !this.dirty;
  }

  abandonBuild(token: KnowledgeBuildToken): void {
    this.assertActive(token);
    this.activeBuildId = undefined;
  }

  private assertActive(token: KnowledgeBuildToken): void {
    if (this.activeBuildId !== token.id) throw new Error("Knowledge build token is stale");
  }
}

export class CommandGate {
  private activeName: string | undefined;

  get active(): boolean {
    return this.activeName !== undefined;
  }

  enter(name: string): () => void {
    if (this.activeName) throw new Error(`Cannot start ${name}; ${this.activeName} is still running`);
    this.activeName = name;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeName = undefined;
    };
  }
}

export interface DocumentChangeSignal {
  id: string;
  origin: "LOCAL" | "REMOTE";
  type?: string;
  properties?: readonly string[];
}

export function requiresTransientMutationGuard(risk: "low" | "guarded" | "structural"): boolean {
  return risk === "structural";
}

function isLocalMetadataOnly(change: DocumentChangeSignal): boolean {
  return change.origin === "LOCAL"
    && change.type === "PROPERTY_CHANGE"
    && Boolean(change.properties?.length)
    && change.properties?.every((property) => property === "pluginData") === true;
}

/**
 * Node IDs and event timing cannot prove a change is our own mutation echo.
 * Only local plugin metadata is inert to design rules. All visual changes,
 * including edits to an expected node or transient clones, invalidate knowledge.
 */
export class MutationChangeGuard {
  private annotationSignatures = new Map<string, { expected: string; current: () => string | undefined }>();

  arm(_nodeIds: readonly string[], _now = Date.now(), _lifetimeMs = 120_000, _includesTransientNodes = false): void { this.clear(); }

  /** Certification records its exact annotation output immediately after writing. */
  expectAnnotations(nodeId: string, expected: string, current: () => string | undefined): void {
    this.annotationSignatures.set(nodeId, { expected, current });
  }

  hasUnexpectedChange(changes: readonly DocumentChangeSignal[], _now = Date.now()): boolean {
    return changes.some((change) => {
      if (isLocalMetadataOnly(change)) return false;
      const signature = this.annotationSignatures.get(change.id);
      if (signature && change.origin === "LOCAL" && change.type === "PROPERTY_CHANGE" && change.properties?.length
        && change.properties.every((property) => property === "annotations" || property === "pluginData")) {
        try { return signature.current() !== signature.expected; } catch { return true; }
      }
      return true;
    });
  }

  clear(): void { this.annotationSignatures.clear(); }
}
