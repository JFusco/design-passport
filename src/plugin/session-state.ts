export interface KnowledgeBuildToken {
  id: number;
  revision: number;
}

export class KnowledgeSessionState {
  private revision = 0;
  private cleanRevision = -1;
  private nextBuildId = 1;
  private activeBuildId: number | undefined;

  get dirty(): boolean {
    return this.cleanRevision !== this.revision;
  }

  get buildActive(): boolean {
    return this.activeBuildId !== undefined;
  }

  markDirty(): void {
    this.revision += 1;
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
    if (complete && token.revision === this.revision) this.cleanRevision = this.revision;
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

function isLocalMetadataOnly(change: DocumentChangeSignal): boolean {
  return change.origin === "LOCAL"
    && change.type === "PROPERTY_CHANGE"
    && Boolean(change.properties?.length)
    && change.properties?.every((property) => property === "pluginData") === true;
}

/**
 * Figma batches documentchange events after plugin mutations. This guard keeps
 * those delayed echoes from invalidating the clean rebuild that immediately
 * follows, while remote or unrelated local changes still invalidate it.
 */
export class MutationChangeGuard {
  private expectedNodeIds = new Set<string>();
  private expiresAt = 0;

  arm(nodeIds: readonly string[], now = Date.now(), lifetimeMs = 5_000): void {
    this.expectedNodeIds = new Set(nodeIds);
    this.expiresAt = now + lifetimeMs;
  }

  hasUnexpectedChange(changes: readonly DocumentChangeSignal[], now = Date.now()): boolean {
    if (now > this.expiresAt) this.clear();
    return changes.some((change) => {
      if (change.origin === "REMOTE") return true;
      if (isLocalMetadataOnly(change)) return false;
      return !this.expectedNodeIds.has(change.id);
    });
  }

  clear(): void {
    this.expectedNodeIds.clear();
    this.expiresAt = 0;
  }
}
