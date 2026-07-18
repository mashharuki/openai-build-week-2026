import type { ModelGateway } from "./env.js";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5.6-sol";
const RESPONSE_TIMEOUT_MS = 20_000;

type FileReference = {
  downloadUrl?: string;
  fileId: string;
  mimeType: string;
};

type GenerationInput = {
  evidence: { audio: FileReference | null; image: FileReference | null };
  input: {
    barkDescription: string;
    context: string;
    distanceToPerson: string | null;
    dogId: string;
    locale: "en" | "ja";
    precedingEvent: string | null;
  };
  observations: unknown[];
  repair: boolean;
  research: unknown[];
};

export interface OpenAiResponsesGatewayOptions {
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
}

/**
 * The sole outbound model boundary. It sends short-lived attachment URLs only
 * in the active response request and never returns model text to callers.
 */
export function createOpenAiResponsesGateway(
  options: OpenAiResponsesGatewayOptions,
): ModelGateway {
  const fetcher = options.fetch ?? globalThis.fetch;

  return {
    async generateStructured(value: unknown): Promise<unknown> {
      if (!options.apiKey) {
        throw new Error("OPENAI_API_KEY is not configured.");
      }

      const input = value as GenerationInput;
      const response = await fetcher(RESPONSES_URL, {
        body: JSON.stringify({
          input: [
            {
              content: createContent(input),
              role: "user",
            },
          ],
          instructions: createInstructions(input),
          max_output_tokens: 1_200,
          model: MODEL,
          reasoning: { effort: "medium" },
          // PawLens has no need to retain a model-side response for this
          // single-turn assessment. Confirmed owner observations live in KV.
          store: false,
          text: {
            format: {
              name: "pawlens_assessment",
              schema: assessmentJsonSchema,
              strict: true,
              type: "json_schema",
            },
          },
        }),
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(RESPONSE_TIMEOUT_MS),
      });

      if (!response.ok) {
        const failure = await readFailureClassification(response);
        console.error("pawlens.openai.responses_failure", failure);
        throw new Error(`OpenAI Responses API failed with ${response.status}.`);
      }

      const body = (await response.json()) as { output?: unknown[] };
      const outputText = findOutputText(body.output);
      if (!outputText)
        throw new Error("OpenAI response did not contain output text.");

      return JSON.parse(outputText) as unknown;
    },
  };
}

async function readFailureClassification(response: Response) {
  let code = "unknown";
  let type = "unknown";

  try {
    const body = (await response.json()) as {
      error?: { code?: unknown; type?: unknown };
    };
    if (typeof body.error?.code === "string") code = body.error.code;
    if (typeof body.error?.type === "string") type = body.error.type;
  } catch {
    // Some upstream failures have no JSON body. Status remains actionable.
  }

  // Do not log prompts, response text, attachment URLs, request headers, or
  // OpenAI's human-readable message: those may contain user data.
  return {
    code,
    event: "openai_responses_failure",
    status: response.status,
    type,
  };
}

function createContent(input: GenerationInput): unknown[] {
  const content: unknown[] = [
    {
      text: JSON.stringify({
        barkDescription: input.input.barkDescription,
        context: input.input.context,
        distanceToPerson: input.input.distanceToPerson,
        observations: input.observations,
        precedingEvent: input.input.precedingEvent,
        repair: input.repair,
        research: input.research,
      }),
      type: "input_text",
    },
  ];

  if (input.evidence.image?.downloadUrl) {
    content.push({
      detail: "auto",
      image_url: input.evidence.image.downloadUrl,
      type: "input_image",
    });
  }
  if (input.evidence.audio?.downloadUrl) {
    // A file URL is deliberately used until the deployed Apps SDK audio probe
    // proves an end-to-end direct-audio transport. The text description stays
    // sufficient for a safe fallback if the attachment cannot be interpreted.
    content.push({
      file_url: input.evidence.audio.downloadUrl,
      type: "input_file",
    });
  }
  return content;
}

function createInstructions(input: GenerationInput): string {
  const language = input.input.locale === "ja" ? "Japanese" : "English";
  return `You are PawLens, an educational dog-observation assistant. Return only the requested JSON schema in ${language}.\n\nGoal: help an owner choose a safe next observation and low-stimulation action for a possible visitor or doorbell reaction.\n\nConstraints: never write in the dog's first person; do not diagnose medical or behavioral conditions; do not state certainty; make limitations specific to available evidence; treat owner-confirmed observations as facts and all hypotheses as provisional; when danger may be present, set status to urgent and recommend distance and an appropriate professional. Research is contextual support, not proof of an individual dog's state.\n\nSuccess: provide one primary hypothesis, up to three secondary hypotheses, concrete observation points, one safe suggested action, and an additional question when evidence is insufficient.${input.repair ? " The prior candidate was invalid; satisfy every required field exactly." : ""}`;
}

function findOutputText(output: unknown[] | undefined): string | undefined {
  if (!Array.isArray(output)) return undefined;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return undefined;
}

const hypothesisSchema = {
  additionalProperties: false,
  properties: {
    label: { maxLength: 300, minLength: 1, type: "string" },
    rationale: { maxLength: 1000, minLength: 1, type: "string" },
  },
  required: ["label", "rationale"],
  type: "object",
} as const;

const assessmentJsonSchema = {
  additionalProperties: false,
  properties: {
    additionalQuestion: {
      anyOf: [
        { maxLength: 500, minLength: 1, type: "string" },
        { type: "null" },
      ],
    },
    confidence: { enum: ["low", "medium", "high"], type: "string" },
    evidenceSources: {
      items: { enum: ["research", "confirmed_observation"], type: "string" },
      minItems: 1,
      type: "array",
    },
    limitations: { maxLength: 1000, minLength: 1, type: "string" },
    observationPoints: {
      items: { minLength: 1, type: "string" },
      maxItems: 10,
      minItems: 1,
      type: "array",
    },
    primaryHypothesis: hypothesisSchema,
    secondaryHypotheses: {
      items: hypothesisSchema,
      maxItems: 3,
      type: "array",
    },
    status: { enum: ["success", "partial", "urgent", "error"], type: "string" },
    suggestedAction: { maxLength: 500, minLength: 1, type: "string" },
  },
  required: [
    "additionalQuestion",
    "confidence",
    "evidenceSources",
    "limitations",
    "observationPoints",
    "primaryHypothesis",
    "secondaryHypotheses",
    "status",
    "suggestedAction",
  ],
  type: "object",
} as const;
