export interface ModelGateway {
  generateStructured(input: unknown): Promise<unknown>;
}

export interface WorkerBindings {
  ASSETS: Fetcher;
  MCP_SESSIONS?: {
    getByName(name: string): { fetch(request: Request): Promise<Response> };
  };
  PAWLENS_KV: KVNamespace;
}

export interface WorkerRuntimeDependencies {
  audioAvailable?: boolean;
  assets: Fetcher;
  conversationStable?: boolean;
  /** Set only after a deployed Apps SDK file-parameter probe succeeds. */
  fileInputsAvailable?: boolean;
  kv: KVNamespace;
  model: ModelGateway;
}
