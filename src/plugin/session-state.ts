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
  private changedProperties = new Map<string, Set<string>>();
  private validatedAt: number | undefined;
  private fullBuildReason: string | undefined = "not-loaded";

  get documentRevision(): number { return this.revision; }

  get changes(): { nodeIds: string[]; properties: Record<string, string[]>; fullBuildReason?: string } {
    return { nodeIds: [...this.changedNodeIds], properties: Object.fromEntries([...this.changedProperties].map(([id, fields]) => [id, [...fields].sort()])), ...(this.fullBuildReason ? { fullBuildReason: this.fullBuildReason } : {}) };
  }

  get dirty(): boolean {
    return this.cleanRevision !== this.revision;
  }

  get buildActive(): boolean {
    return this.activeBuildId !== undefined;
  }

  get wholeContextValidatedAt(): number | undefined { return this.validatedAt; }

  validationFresh(now = Date.now()): boolean {
    return this.validatedAt !== undefined && now >= this.validatedAt && now - this.validatedAt < 15 * 60 * 1000;
  }

  validateWholeContext(revision: number, now = Date.now()): void {
    if (revision !== this.revision || this.dirty) throw new Error("Context changed during validation");
    this.validatedAt = now;
  }

  recordChanges(changes: readonly DocumentChangeSignal[], fullBuildReason?: string): void {
    this.revision += 1;
    for (const change of changes) {
      this.changedNodeIds.add(change.id);
      const fields = this.changedProperties.get(change.id) ?? new Set<string>();
      for (const field of change.properties?.length ? change.properties : ["unknown"]) fields.add(field);
      this.changedProperties.set(change.id, fields);
    }
    if (fullBuildReason) this.fullBuildReason = fullBuildReason;
  }

  canCommitMicroCheck(revision: number, verified: ReadonlyMap<string, ReadonlySet<string>>): boolean {
    return revision === this.revision && !this.fullBuildReason && [...this.changedNodeIds].every((id) => {
      const fields = this.changedProperties.get(id);
      return fields && fields.size > 0 && [...fields].every((field) => verified.get(id)?.has(field));
    });
  }

  commitMicroCheck(revision: number, verified: ReadonlyMap<string, ReadonlySet<string>>): void {
    if (revision !== this.revision || this.fullBuildReason) throw new Error("Design changed during Check again");
    for (const [id, fields] of this.changedProperties) {
      if ([...fields].every((field) => verified.get(id)?.has(field))) {
        this.changedProperties.delete(id);
        this.changedNodeIds.delete(id);
      }
    }
    if (this.changedNodeIds.size === 0) this.cleanRevision = this.revision;
  }

  markDirty(nodeIds?: readonly string[], fullBuildReason?: string): void {
    this.revision += 1;
    for (const id of nodeIds ?? []) {
      this.changedNodeIds.add(id);
      const fields = this.changedProperties.get(id) ?? new Set<string>();
      fields.add("unknown");
      this.changedProperties.set(id, fields);
    }
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
      this.changedProperties.clear();
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
  hasUnexpectedChange(changes: readonly DocumentChangeSignal[]): boolean {
    return changes.some((change) => !isLocalMetadataOnly(change));
  }
}
