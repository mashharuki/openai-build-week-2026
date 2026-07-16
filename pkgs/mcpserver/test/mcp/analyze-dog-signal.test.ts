import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AssessmentResult } from "@pawlens/shared";
import { describe, expect, it, vi } from "vitest";

import type { AssessmentService } from "../../src/assessment-service.js";
import { registerAnalyzeDogSignal } from "../../src/mcp/analyze-dog-signal.js";
import { HELLO_WIDGET_RESOURCE_URI } from "../../src/mcp/hello-widget.js";
import { createConversationScope } from "../../src/repositories.js";

const assessment: AssessmentResult = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "観察だけでは断定できません。",
  observationPoints: ["耳の向きを確認してください。"],
  primaryHypothesis: {
    label: "警戒している可能性",
    rationale: "来客直後の反応です。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "距離を取ります。",
};

describe("registerAnalyzeDogSignal", () => {
  it("検証済みの記述・状況・画像・条件付き音声を見立てサービスへ渡し、UI URI付き構造化結果を返す", async () => {
    const registerTool = vi.fn();
    const service: AssessmentService = {
      assess: vi.fn(async () => assessment),
    };
    const scope = createConversationScope(() => "server-scope");
    const input = {
      audio: {
        durationSeconds: 4,
        fileId: "audio-1",
        mimeType: "audio/wav",
      },
      barkDescription: "短く鋭い",
      context: "visitor",
      distanceToPerson: "2m",
      dogId: "dog-1",
      image: { fileId: "image-1", mimeType: "image/jpeg" },
      locale: "ja",
      precedingEvent: "チャイム",
    };

    registerAnalyzeDogSignal(
      { registerTool } as unknown as McpServer,
      service,
      scope,
    );
    const handler = registerTool.mock.calls[0]?.[2] as (
      input: unknown,
    ) => Promise<unknown>;

    expect(registerTool).toHaveBeenCalledWith(
      "analyze_dog_signal",
      expect.objectContaining({
        _meta: {
          "openai/outputTemplate": HELLO_WIDGET_RESOURCE_URI,
          ui: { resourceUri: HELLO_WIDGET_RESOURCE_URI },
        },
        annotations: {
          destructiveHint: false,
          idempotentHint: true,
          readOnlyHint: true,
        },
      }),
      expect.any(Function),
    );
    await expect(handler(input)).resolves.toEqual({
      content: [],
      structuredContent: assessment,
    });
    expect(service.assess).toHaveBeenCalledWith(scope, input);
    await expect(handler({ ...input, barkDescription: "" })).rejects.toThrow();
  });
});
