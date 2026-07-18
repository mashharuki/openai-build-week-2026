import { describe, expect, it, vi } from "vitest";

import { createOpenAiResponsesGateway } from "../src/openai-responses-gateway.js";

const candidate = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "A bark and one image cannot establish the dog's state.",
  observationPoints: ["Ear direction"],
  primaryHypothesis: {
    label: "Alertness is possible",
    rationale: "The reaction followed a visitor cue.",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "Create distance and lower stimulation.",
};

const input = {
  evidence: {
    audio: {
      downloadUrl: "https://files.example/bark.wav",
      fileId: "audio-1",
      mimeType: "audio/wav",
    },
    image: {
      downloadUrl: "https://files.example/dog.jpg",
      fileId: "image-1",
      mimeType: "image/jpeg",
    },
  },
  input: {
    barkDescription: "Short, sharp barks.",
    context: "visitor",
    distanceToPerson: "2m",
    dogId: "dog-1",
    locale: "en" as const,
    precedingEvent: "Doorbell",
  },
  observations: [],
  repair: false,
  research: [],
};

describe("OpenAI Responses gateway", () => {
  it("uses GPT-5.6 structured output and sends media only in the active request", async () => {
    const fetch = vi.fn<
      (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
    >(
      async () =>
        new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  { text: JSON.stringify(candidate), type: "output_text" },
                ],
                type: "message",
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const gateway = createOpenAiResponsesGateway({
      apiKey: "test-key",
      fetch,
    });

    await expect(gateway.generateStructured(input)).resolves.toEqual(candidate);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetch.mock.calls[0]![1];
    if (!request) throw new Error("Responses request was not captured.");
    const body = JSON.parse(String(request.body));
    expect(body).toMatchObject({
      model: "gpt-5.6-sol",
      reasoning: { effort: "medium" },
      store: false,
      text: {
        format: {
          name: "pawlens_assessment",
          strict: true,
          type: "json_schema",
        },
      },
    });
    expect(request.signal).toBeInstanceOf(AbortSignal);
    expect(body.input[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          image_url: "https://files.example/dog.jpg",
          type: "input_image",
        }),
        expect.objectContaining({
          file_url: "https://files.example/bark.wav",
          type: "input_file",
        }),
      ]),
    );
    expect(JSON.stringify(body)).not.toContain("dog-1");
  });

  it("fails closed when the Responses API returns no structured message", async () => {
    const gateway = createOpenAiResponsesGateway({
      apiKey: "test-key",
      fetch: async () => new Response(JSON.stringify({ output: [] })),
    });

    await expect(gateway.generateStructured(input)).rejects.toThrow(
      "did not contain output text",
    );
  });
});
