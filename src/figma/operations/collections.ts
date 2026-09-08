export interface VariableCollectionOption {
  id: string;
  key: string;
  name: string;
  libraryName?: string;
  remote: boolean;
  modeNames: string[];
  variableCount: number;
}

let remoteCollectionsRequest: Promise<LibraryVariableCollection[]> | undefined;

function loadRemoteCollections(): Promise<LibraryVariableCollection[]> {
  remoteCollectionsRequest ??= figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync().catch(() => []);
  return remoteCollectionsRequest;
}

function settleWithin<T>(promise: Promise<T>, milliseconds: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(undefined);
    }, milliseconds);
    promise.then((value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(undefined);
    });
  });
}

export async function listVariableCollectionOptions(options: {
  includeRemote: boolean;
  remoteTimeoutMs?: number;
}): Promise<VariableCollectionOption[]> {
  const local = await figma.variables.getLocalVariableCollectionsAsync();
  const output: VariableCollectionOption[] = local.map((collection) => ({
    id: collection.id,
    key: collection.key,
    name: collection.name,
    remote: false,
    modeNames: collection.modes.map((mode) => mode.name),
    variableCount: collection.variableIds.length,
  }));

  if (options.includeRemote) {
    const remote = await settleWithin(loadRemoteCollections(), options.remoteTimeoutMs ?? 4_000);
    if (remote) {
      output.push(...remote.map((collection) => ({
        id: `library:${collection.key}`,
        key: collection.key,
        name: collection.name,
        libraryName: collection.libraryName,
        remote: true,
        modeNames: [],
        variableCount: 0,
      })));
    }
  }

  return output.sort((left, right) => Number(left.remote) - Number(right.remote) || left.name.localeCompare(right.name));
}
