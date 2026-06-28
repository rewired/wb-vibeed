export interface LoadBlueprintsOptions {
  dataRoot: string;
}

export interface BlueprintLoadResult {
  loaded: number;
  warnings: string[];
}

export async function loadBlueprints(_options: LoadBlueprintsOptions): Promise<BlueprintLoadResult> {
  // Placeholder for Iteration 0.
  // Implement filesystem loading and schema validation here.
  return {
    loaded: 0,
    warnings: ['Blueprint loading is not implemented yet.'],
  };
}
