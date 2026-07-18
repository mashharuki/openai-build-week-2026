import {
  type AssessmentResult,
  AssessmentResultSchema,
  type SignalInput,
  SignalInputSchema,
} from "@pawlens/shared";

import {
  type AudioCapability,
  type EvidenceResult,
  adaptEvidence,
} from "./audio-evidence.js";
import { applyGuardrails } from "./guardrails.js";
import type { ObservationLogReader } from "./history-diff.js";
import type { ModelAdapter, ModelCandidateResult } from "./model.js";
import type { ConversationScope } from "./repositories.js";
import { getResearchContext } from "./research-context.js";

export type AssessmentResultKind = AssessmentResult["status"];
export type AssessmentSchemaFailureKind =
  | "none"
  | "input_invalid"
  | "model_exception"
  | "model_invalid"
  | "guardrail_rejected";

export interface AssessmentTelemetryEvent {
  audioAvailable: boolean;
  correlationId: string;
  latencyMs: number;
  resultKind: AssessmentResultKind;
  schemaFailureKind: AssessmentSchemaFailureKind;
  toolName: "analyze_dog_signal";
}

export interface AssessmentTelemetry {
  record(event: AssessmentTelemetryEvent): void;
}

export interface AssessmentServiceDependencies {
  audioCapability?: AudioCapability;
  createCorrelationId?: () => string;
  model: ModelAdapter;
  now?: () => number;
  observations: ObservationLogReader;
  telemetry?: AssessmentTelemetry;
}

export interface AssessmentService {
  assess(scope: ConversationScope, input: unknown): Promise<AssessmentResult>;
}

const ASSESSMENT_TOOL_NAME = "analyze_dog_signal" as const;

export function createAssessmentService(
  dependencies: AssessmentServiceDependencies,
): AssessmentService {
  return {
    async assess(scope, input) {
      const correlationId =
        dependencies.createCorrelationId?.() ?? crypto.randomUUID();
      const startedAt = (dependencies.now ?? Date.now)();
      let schemaFailureKind: AssessmentSchemaFailureKind = "none";
      const parsedSignal = SignalInputSchema.safeParse(input);

      if (!parsedSignal.success) {
        recordTelemetry(
          dependencies,
          correlationId,
          startedAt,
          "error",
          "input_invalid",
        );
        throw parsedSignal.error;
      }

      const signal = parsedSignal.data;
      const evidence = adaptEvidence({
        audio: signal.audio,
        image: signal.image,
        locale: signal.locale,
        supportsAudio: dependencies.audioCapability?.available,
      });
      const observations = (
        await dependencies.observations.list(scope, signal.dogId)
      ).filter(
        // Assessment context must never mix another dog's facts or a different
        // server-generated scope, even if a repository returns stale data.
        (observation) =>
          observation.conversationId === scope &&
          observation.dogId === signal.dogId,
      );
      const generationInput = {
        evidence,
        input: { ...signal, audio: evidence.audio, image: evidence.image },
        observations,
        research: getResearchContext(signal.context),
      };

      // One repair attempt bounds model interaction. Raw model output is never
      // returned to the owner, regardless of whether repair succeeds.
      for (const repair of [false, true]) {
        let generated: ModelCandidateResult | undefined;
        try {
          generated = await dependencies.model.generate({
            ...generationInput,
            repair,
          });
        } catch {
          schemaFailureKind = "model_exception";
          continue;
        }

        if (generated.kind !== "valid") {
          schemaFailureKind = "model_invalid";
          continue;
        }

        const guarded = applyGuardrails(generated.candidate, {
          context: signal.context,
          locale: signal.locale,
          missingInformation: missingInformation(signal),
        });
        if (guarded.kind !== "safe") {
          schemaFailureKind = "guardrail_rejected";
          continue;
        }

        const assessment = withPartialEvidence(
          guarded.assessment,
          evidence,
          signal.locale,
        );
        recordTelemetry(
          dependencies,
          correlationId,
          startedAt,
          assessment.status,
          schemaFailureKind,
        );
        return assessment;
      }

      const assessment = generationFailure(signal.locale);
      recordTelemetry(
        dependencies,
        correlationId,
        startedAt,
        assessment.status,
        schemaFailureKind,
      );
      return assessment;
    },
  };
}

function recordTelemetry(
  dependencies: AssessmentServiceDependencies,
  correlationId: string,
  startedAt: number,
  resultKind: AssessmentResultKind,
  schemaFailureKind: AssessmentSchemaFailureKind,
): void {
  if (!dependencies.telemetry) {
    return;
  }

  try {
    dependencies.telemetry.record({
      audioAvailable: dependencies.audioCapability?.available === true,
      correlationId,
      latencyMs: Math.max(0, (dependencies.now ?? Date.now)() - startedAt),
      resultKind,
      schemaFailureKind,
      toolName: ASSESSMENT_TOOL_NAME,
    });
  } catch {
    // Monitoring must not prevent a user-safe assessment response.
  }
}

function missingInformation(input: SignalInput) {
  return [
    ...(input.precedingEvent ? [] : (["preceding_event"] as const)),
    ...(input.distanceToPerson ? [] : (["distance_to_person"] as const)),
  ];
}

function generationFailure(locale: SignalInput["locale"]): AssessmentResult {
  return AssessmentResultSchema.parse(
    locale === "ja"
      ? {
          additionalQuestion: "入力を見直してから、もう一度お試しください。",
          confidence: "low",
          evidenceSources: ["research"],
          limitations:
            "見立ての安全な構造化結果を確認できませんでした。これは教育および観察支援であり、専門的な判断の代替ではありません。",
          observationPoints: [
            "犬と人の距離、耳、しっぽの様子を確認してください。",
          ],
          primaryHypothesis: {
            label: "見立てを確認できませんでした",
            rationale: "安全な構造化結果として検証できなかったためです。",
          },
          secondaryHypotheses: [],
          status: "error",
          suggestedAction: "入力を補足して、もう一度お試しください。",
        }
      : {
          additionalQuestion: "Review the input and try again.",
          confidence: "low",
          evidenceSources: ["research"],
          limitations:
            "A safe structured assessment could not be verified. This is educational observation support and not a substitute for professional judgment.",
          observationPoints: [
            "Observe the distance, ears, and tail before deciding what to do next.",
          ],
          primaryHypothesis: {
            label: "The assessment could not be verified",
            rationale:
              "The generated result did not pass safe structured validation.",
          },
          secondaryHypotheses: [],
          status: "error",
          suggestedAction: "Add context and try again.",
        },
  );
}

function withPartialEvidence(
  assessment: AssessmentResult,
  evidence: EvidenceResult,
  locale: SignalInput["locale"],
): AssessmentResult {
  if (evidence.kind !== "partial") {
    return assessment;
  }

  // Keep a safe assessment when optional media fails, but make the limitation
  // explicit instead of allowing unavailable evidence to look valid.
  const guidance = evidence.messages.join(" ");
  const additionalQuestion =
    assessment.additionalQuestion ??
    (locale === "ja"
      ? "利用できなかった添付を補足するか、記述で状況を補ってください。"
      : "Add the unavailable evidence again, or describe the situation instead.");

  return AssessmentResultSchema.parse({
    ...assessment,
    additionalQuestion,
    confidence: "low",
    limitations: `${assessment.limitations} ${guidance}`.trim(),
    status: assessment.status === "urgent" ? "urgent" : "partial",
  });
}
