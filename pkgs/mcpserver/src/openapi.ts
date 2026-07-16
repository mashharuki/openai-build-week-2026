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
import { z } from "zod";

type JsonSchema = Record<string, unknown>;

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

const HealthResponseSchema = z.object({
  service: z.string(),
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
  version: z.string(),
});

const OpenApiDocumentSchema = z.object({
  components: z.object({ schemas: z.record(z.object({})) }),
  info: z.object({ title: z.string(), version: z.string() }),
  openapi: z.literal("3.1.0"),
  paths: z.object({ "/health": z.object({ get: z.object({}) }) }),
  "x-mcp-tools": z.array(
    z.object({
      destructive: z.boolean(),
      idempotent: z.boolean(),
      inputSchema: z.string().regex(/^#\/components\/schemas\//),
      name: z.string().min(1),
      outputSchema: z.string().regex(/^#\/components\/schemas\//),
      readOnly: z.boolean(),
      visibility: z.array(z.enum(["app", "model"])).min(1),
    }),
  ),
});

/** Generates a JSON Schema subset directly from the shared Zod contracts. */
function zodToJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  const definition = schema._def;

  switch (definition.typeName) {
    case z.ZodFirstPartyTypeKind.ZodArray:
      return { items: zodToJsonSchema(definition.type), type: "array" };
    case z.ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return {
        oneOf: Array.from(definition.options.values(), zodToJsonSchema),
      };
    case z.ZodFirstPartyTypeKind.ZodEnum:
      return { enum: definition.values, type: "string" };
    case z.ZodFirstPartyTypeKind.ZodLiteral:
      return { const: definition.value };
    case z.ZodFirstPartyTypeKind.ZodNullable:
      return { anyOf: [zodToJsonSchema(definition.innerType), { type: "null" }] };
    case z.ZodFirstPartyTypeKind.ZodObject: {
      const shape = definition.shape();
      return {
        additionalProperties: definition.unknownKeys !== "passthrough",
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, value]) => [
            key,
            zodToJsonSchema(value as z.ZodTypeAny),
          ]),
        ),
        required: Object.entries(shape)
          .filter(([, value]) => !(value as z.ZodTypeAny).isOptional())
          .map(([key]) => key),
        type: "object",
      };
    }
    case z.ZodFirstPartyTypeKind.ZodOptional:
      return zodToJsonSchema(definition.innerType);
    case z.ZodFirstPartyTypeKind.ZodString:
      return { format: "string", type: "string" };
    default:
      return { type: "string" };
  }
}

export function createOpenApiDocument(): OpenApiDocument {
  return {
    components: {
      schemas: {
        ...Object.fromEntries(
          Object.entries(schemaSources).map(([name, schema]) => [
            name,
            zodToJsonSchema(schema),
          ]),
        ),
        HealthResponse: zodToJsonSchema(HealthResponseSchema),
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
  return OpenApiDocumentSchema.parse(document) as OpenApiDocument;
}

/** JSON is a valid YAML 1.2 document, keeping the committed artifact deterministic. */
export function serializeOpenApiDocument(): string {
  return `${JSON.stringify(createOpenApiDocument(), null, 2)}\n`;
}
