import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createOpenApiDocument,
  serializeOpenApiDocument,
  validateOpenApiDocument,
} from "../src/openapi.js";

const openApiArtifactPath = fileURLToPath(
  new URL("../openapi.yaml", import.meta.url),
);

describe("OpenAPI validation artifact", () => {
  it("OpenAPI 3.1として検証でき、healthと4つのMCPツール契約だけを公開する", async () => {
    const document = createOpenApiDocument();

    expect(validateOpenApiDocument(document)).toEqual(document);
    expect(document.paths).toEqual({
      "/health": expect.objectContaining({ get: expect.any(Object) }),
    });
    expect(document.paths).not.toHaveProperty("/mcp");
    expect(document["x-mcp-tools"]).toHaveLength(4);
  });

  it("壊れたOpenAPI 3.1のhealth参照を検証器が拒否する", () => {
    const document = createOpenApiDocument();
    const invalid = structuredClone(document);
    invalid.paths = {
      "/health": {
        get: {
          responses: {
            "200": {
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/MissingHealthResponse",
                  },
                },
              },
              description: "MCP server is available",
            },
          },
        },
      },
    };

    expect(() => validateOpenApiDocument(invalid)).toThrow(
      "OpenAPI health response must reference HealthResponse.",
    );
  });

  it("各ツールの可視性・副作用・共有Zodスキーマ参照と、コミット済み成果物を一致させる", async () => {
    const document = createOpenApiDocument();
    const tools = Object.fromEntries(
      document["x-mcp-tools"].map((tool) => [tool.name, tool]),
    );

    expect(tools).toMatchObject({
      analyze_dog_signal: {
        visibility: ["model", "app"],
        readOnly: true,
        destructive: false,
        idempotent: true,
        inputSchema: "#/components/schemas/SignalInput",
        outputSchema: "#/components/schemas/AssessmentResult",
      },
      get_dog_history: {
        visibility: ["model", "app"],
        readOnly: true,
        destructive: false,
        idempotent: true,
        inputSchema: "#/components/schemas/GetDogHistoryInput",
        outputSchema: "#/components/schemas/HistoryComparison",
      },
      manage_dog_profile: {
        visibility: ["model", "app"],
        readOnly: false,
        destructive: true,
        idempotent: false,
        inputSchema: "#/components/schemas/ManageDogProfileInput",
        outputSchema: "#/components/schemas/ProfileManagementResult",
      },
      save_observation: {
        visibility: ["app"],
        readOnly: false,
        destructive: false,
        idempotent: false,
        inputSchema: "#/components/schemas/SaveObservationInput",
        outputSchema: "#/components/schemas/ObservationLog",
      },
    });

    for (const tool of document["x-mcp-tools"]) {
      expect(document.components.schemas).toHaveProperty(
        tool.inputSchema.replace("#/components/schemas/", ""),
      );
      expect(document.components.schemas).toHaveProperty(
        tool.outputSchema.replace("#/components/schemas/", ""),
      );
    }

    expect(document.components.schemas.SaveObservationInput).toMatchObject({
      additionalProperties: false,
    });
    expect(document.components.schemas.SignalInput).toMatchObject({
      additionalProperties: true,
    });

    await expect(readFile(openApiArtifactPath, "utf8")).resolves.toBe(
      serializeOpenApiDocument(),
    );
  });
});
