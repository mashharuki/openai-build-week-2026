export interface ModelGateway {
  generateStructured(input: unknown): Promise<unknown>;
}

export interface WorkerBindings {
  ASSETS: Fetcher;
  PAWLENS_KV: KVNamespace;
}

export interface WorkerRuntimeDependencies {
  assets: Fetcher;
  kv: KVNamespace;
  model: ModelGateway;
}
