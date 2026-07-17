import {
  AssessmentResultSchema,
  GetDogHistoryInputSchema,
  HistoryComparisonSchema,
  ManageDogProfileInputSchema,
  ObservationLogSchema,
  ProfileManagementResultSchema,
  SaveObservationInputSchema,
  SignalInputSchema,
} from "@pawlens/shared";

type JsonSchema = Record<string, unknown>;
type ZodLike = {
  _def: { typeName: string };
  isOptional(): boolean;
};

interface McpToolContract {
  destructive: boolean;
  idempotent: boolean;
  inputSchema: `#/components/schemas/${string}`;
  name: string;
  outputSchema: `#/components/schemas/${string}`;
  readOnly: boolean;
  visibility: readonly ("app" | "model")[];
}

export interface OpenApiDocument {
  components: { schemas: Record<string, JsonSchema> };
  info: { title: string; version: string };
  openapi: "3.1.0";
  paths: Record<string, unknown>;
  "x-mcp-tools": readonly McpToolContract[];
}

const schemaSources = {
  AssessmentResult: AssessmentResultSchema,
  GetDogHistoryInput: GetDogHistoryInputSchema,
  HistoryComparison: HistoryComparisonSchema,
  ManageDogProfileInput: ManageDogProfileInputSchema,
  ObservationLog: ObservationLogSchema,
  ProfileManagementResult: ProfileManagementResultSchema,
  SaveObservationInput: SaveObservationInputSchema,
  SignalInput: SignalInputSchema,
} as const;

const toolContracts = [
  {
    destructive: false,
    idempotent: true,
    inputSchema: "#/components/schemas/SignalInput",
    name: "analyze_dog_signal",
    outputSchema: "#/components/schemas/AssessmentResult",
    readOnly: true,
    visibility: ["model", "app"],
  },
  {
    destructive: false,
    idempotent: true,
    inputSchema: "#/components/schemas/GetDogHistoryInput",
    name: "get_dog_history",
    outputSchema: "#/components/schemas/HistoryComparison",
    readOnly: true,
    visibility: ["model", "app"],
  },
  {
    destructive: true,
    idempotent: false,
    inputSchema: "#/components/schemas/ManageDogProfileInput",
    name: "manage_dog_profile",
    outputSchema: "#/components/schemas/ProfileManagementResult",
    readOnly: false,
    visibility: ["model", "app"],
  },
  {
    destructive: false,
    idempotent: false,
    inputSchema: "#/components/schemas/SaveObservationInput",
    name: "save_observation",
    outputSchema: "#/components/schemas/ObservationLog",
    readOnly: false,
    visibility: ["app"],
  },
] as const satisfies readonly McpToolContract[];

/** Generates a JSON Schema subset directly from the shared Zod contracts. */
function zodToJsonSchema(schema: ZodLike): JsonSchema {
  const definition = schema._def as Record<string, unknown>;

  switch (definition.typeName) {
    case "ZodArray":
      return {
        items: zodToJsonSchema(definition.type as ZodLike),
        maxItems: definition.maxLength
          ? (definition.maxLength as { value: number }).value
          : undefined,
        minItems: definition.minLength
          ? (definition.minLength as { value: number }).value
          : undefined,
        type: "array",
      };
    case "ZodDiscriminatedUnion":
      return {
        oneOf: Array.from(
          (definition.options as Map<string, ZodLike>).values(),
          zodToJsonSchema,
        ),
      };
    case "ZodEnum":
      return { enum: definition.values, type: "string" };
    case "ZodLiteral":
      return { const: definition.value };
    case "ZodNullable":
      return {
        anyOf: [
          zodToJsonSchema(definition.innerType as ZodLike),
          { type: "null" },
        ],
      };
    case "ZodObject": {
      const shape = (definition.shape as () => Record<string, ZodLike>)();
      const unknownKeys = definition.unknownKeys;
      return {
        // Zod's default "strip" accepts unknown values before removing them.
        // OpenAPI cannot model stripping, so retain its accepting input surface.
        additionalProperties: unknownKeys !== "strict",
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, value]) => [
            key,
            zodToJsonSchema(value),
          ]),
        ),
        required: Object.entries(shape)
          .filter(([, value]) => !value.isOptional())
          .map(([key]) => key),
        type: "object",
      };
    }
    case "ZodOptional":
      return zodToJsonSchema(definition.innerType as ZodLike);
    case "ZodString": {
      const checks = definition.checks as readonly {
        kind: string;
        value?: number;
      }[];
      const format = checks.some((check) => check.kind === "datetime")
        ? "date-time"
        : checks.some((check) => check.kind === "url")
          ? "uri"
          : undefined;
      return {
        format,
        maxLength: checks.find((check) => check.kind === "max")?.value,
        minLength: checks.find((check) => check.kind === "min")?.value,
        type: "string",
      };
    }
    case "ZodNumber": {
      const checks = definition.checks as readonly {
        kind: string;
        inclusive?: boolean;
        value: number;
      }[];
      return {
        exclusiveMinimum: checks.find(
          (check) => check.kind === "min" && !check.inclusive,
        )?.value,
        maximum: checks.find((check) => check.kind === "max")?.value,
        minimum: checks.find((check) => check.kind === "min" && check.inclusive)
          ?.value,
        type: "number",
      };
    }
    default:
      throw new Error(
        `Unsupported shared Zod schema type: ${String(definition.typeName)}`,
      );
  }
}

export function createOpenApiDocument(): OpenApiDocument {
  return {
    components: {
      schemas: {
        ...Object.fromEntries(
          Object.entries(schemaSources).map(([name, schema]) => [
            name,
            zodToJsonSchema(schema as unknown as ZodLike),
          ]),
        ),
        HealthResponse: {
          additionalProperties: false,
          properties: {
            service: { type: "string" },
            status: { const: "ok" },
            timestamp: { format: "date-time", type: "string" },
            version: { type: "string" },
          },
          required: ["service", "status", "timestamp", "version"],
          type: "object",
        },
      },
    },
    info: { title: "PawLens MCP validation contract", version: "0.0.0" },
    openapi: "3.1.0",
    paths: {
      "/health": {
        get: {
          operationId: "getHealth",
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
              description: "MCP server is available",
            },
          },
        },
      },
    },
    "x-mcp-tools": toolContracts,
  };
}

/** Validates the generated OpenAPI 3.1 contract before it is committed. */
export function validateOpenApiDocument(document: unknown): OpenApiDocument {
  if (!isOpenApiDocument(document)) {
    throw new Error(
      "Generated document is not a valid PawLens OpenAPI 3.1 contract.",
    );
  }

  for (const tool of document["x-mcp-tools"]) {
    for (const reference of [tool.inputSchema, tool.outputSchema]) {
      const schemaName = reference.replace("#/components/schemas/", "");
      if (!(schemaName in document.components.schemas)) {
        throw new Error(
          `OpenAPI tool ${tool.name} references missing schema ${reference}.`,
        );
      }
    }
  }

  const healthPath = document.paths["/health"] as HealthPath;
  const healthResponse =
    healthPath.get.responses["200"]?.content?.["application/json"]?.schema
      ?.$ref;
  if (healthResponse !== "#/components/schemas/HealthResponse") {
    throw new Error("OpenAPI health response must reference HealthResponse.");
  }

  return document;
}

function isOpenApiDocument(document: unknown): document is OpenApiDocument {
  if (!document || typeof document !== "object") return false;

  const candidate = document as Partial<OpenApiDocument>;
  return (
    candidate.openapi === "3.1.0" &&
    typeof candidate.info?.title === "string" &&
    typeof candidate.info.version === "string" &&
    typeof candidate.components?.schemas === "object" &&
    isHealthPath(candidate.paths?.["/health"]) &&
    !Object.hasOwn(candidate.paths, "/mcp") &&
    Array.isArray(candidate["x-mcp-tools"]) &&
    candidate["x-mcp-tools"].length === 4 &&
    candidate["x-mcp-tools"].every(
      (tool) =>
        typeof tool.name === "string" &&
        tool.name.length > 0 &&
        typeof tool.readOnly === "boolean" &&
        typeof tool.destructive === "boolean" &&
        typeof tool.idempotent === "boolean" &&
        /^#\/components\/schemas\//.test(tool.inputSchema) &&
        /^#\/components\/schemas\//.test(tool.outputSchema) &&
        tool.visibility.length > 0 &&
        tool.visibility.every(
          (visibility: string) =>
            visibility === "app" || visibility === "model",
        ),
    )
  );
}

type HealthPath = {
  get: {
    responses: {
      "200": {
        content: { "application/json": { schema: { $ref: string } } };
        description: string;
      };
    };
  };
};

function isHealthPath(path: unknown): path is HealthPath {
  if (!path || typeof path !== "object") return false;

  const get = (path as { get?: unknown }).get;
  if (!get || typeof get !== "object") return false;

  const response = (get as { responses?: { "200"?: unknown } }).responses?.[
    "200"
  ];
  if (!response || typeof response !== "object") return false;

  const content = (response as { content?: { "application/json"?: unknown } })
    .content?.["application/json"];
  if (!content || typeof content !== "object") return false;

  const schema = (content as { schema?: { $ref?: unknown } }).schema;
  return typeof schema?.$ref === "string";
}

/** JSON is a valid YAML 1.2 document, keeping the committed artifact deterministic. */
export function serializeOpenApiDocument(): string {
  return `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`;
}
