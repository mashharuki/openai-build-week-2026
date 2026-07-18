import { readFile } from "node:fs/promises";

import {
  GetDogHistoryInputSchema,
  ManageDogProfileInputSchema,
  OpenAiSignalInputSchema,
  SaveObservationInputSchema,
} from "@pawlens/shared";
import { describe, expect, it } from "vitest";

interface ToolFixture {
  requests: Array<{
    expectedSchemaValidity: boolean;
    input: unknown;
    name: string;
  }>;
  tool: string;
}

const fixtureDirectory = new URL(
  "../../../tests/fixtures/mcp-tools/",
  import.meta.url,
);

async function loadFixture(filename: string): Promise<ToolFixture> {
  return JSON.parse(
    await readFile(new URL(filename, fixtureDirectory), "utf8"),
  ) as ToolFixture;
}

describe("MCP tool request fixtures", () => {
  it("公開ツールごとのリクエストJSONを対応する入力契約で検証する", async () => {
    const fixtures = await Promise.all([
      loadFixture("analyze-dog-signal.json"),
      loadFixture("manage-dog-profile.json"),
      loadFixture("save-observation.json"),
      loadFixture("get-dog-history.json"),
      loadFixture("show-pawlens-hello.json"),
    ]);
    const schemas = {
      analyze_dog_signal: OpenAiSignalInputSchema,
      get_dog_history: GetDogHistoryInputSchema,
      manage_dog_profile: ManageDogProfileInputSchema,
      save_observation: SaveObservationInputSchema,
    } as const;

    for (const fixture of fixtures) {
      expect(fixture.requests.length).toBeGreaterThan(0);

      if (fixture.tool === "show_pawlens_hello") {
        expect(fixture.requests).toEqual([
          expect.objectContaining({
            expectedSchemaValidity: true,
            input: {},
          }),
        ]);
        continue;
      }

      const schema = schemas[fixture.tool as keyof typeof schemas];
      expect(schema, `unknown tool fixture: ${fixture.tool}`).toBeDefined();
      for (const request of fixture.requests) {
        expect(
          schema.safeParse(request.input).success,
          `${fixture.tool}/${request.name}`,
        ).toBe(request.expectedSchemaValidity);
      }
    }
  });
});
