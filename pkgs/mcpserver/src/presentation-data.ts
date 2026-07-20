import type {
  AssessmentResult,
  EvidenceSummaryItem,
  Locale,
  ObservationLog,
  SignalInput,
  SupportResource,
} from "@pawlens/shared";

import type { EvidenceResult } from "./audio-evidence.js";
import type { ResearchEvidence } from "./research-context.js";

interface PresentationInput {
  assessment: AssessmentResult;
  evidence: EvidenceResult;
  input: SignalInput;
  observations: readonly ObservationLog[];
  research: readonly ResearchEvidence[];
}

/**
 * These fields are derived from validated input, not model output. They make
 * the assessment's evidence boundary visible without suggesting a diagnosis
 * or a numeric certainty score.
 */
export function addPresentationData({
  assessment,
  evidence,
  input,
  observations,
  research,
}: PresentationInput): AssessmentResult {
  return {
    ...assessment,
    evidenceSummary: createEvidenceSummary(
      input,
      evidence,
      observations,
      research,
    ),
    observationTimeline: createObservationTimeline(input),
    resources: createSupportResources(input.locale, assessment.status),
  };
}

function createEvidenceSummary(
  input: SignalInput,
  evidence: EvidenceResult,
  observations: readonly ObservationLog[],
  research: readonly ResearchEvidence[],
): EvidenceSummaryItem[] {
  return [
    { kind: "owner_description", status: "included" },
    {
      kind: "photo",
      status: input.image
        ? evidence.image
          ? "included"
          : "unavailable"
        : "not_provided",
    },
    {
      kind: "audio",
      status: input.audio
        ? evidence.audio
          ? "included"
          : "unavailable"
        : "not_provided",
    },
    {
      kind: "confirmed_observations",
      status: observations.length > 0 ? "included" : "not_provided",
    },
    {
      kind: "research",
      status: research.length > 0 ? "included" : "not_provided",
    },
  ];
}

function createObservationTimeline(input: SignalInput) {
  return [
    ...(input.precedingEvent
      ? [{ kind: "preceding_event" as const, value: input.precedingEvent }]
      : []),
    { kind: "reaction" as const, value: input.barkDescription },
    ...(input.distanceToPerson
      ? [{ kind: "distance" as const, value: input.distanceToPerson }]
      : []),
  ];
}

function createSupportResources(
  locale: Locale,
  status: AssessmentResult["status"],
): SupportResource[] {
  if (status === "error") return [];

  if (locale === "ja") {
    return [
      {
        description:
          "症状が続く、悪化する、または安全が心配なときは、獣医師へ相談してください。",
        href: "https://www.jvma.or.jp/",
        kind: "professional",
        label: "日本獣医師会を開く",
      },
    ];
  }

  return status === "urgent"
    ? [
        {
          description:
            "For continued or worsening concerns, find a qualified behavior professional or contact your veterinarian.",
          href: "https://avsab.org/directory/",
          kind: "professional",
          label: "Find a behavior consultant",
        },
      ]
    : [
        {
          description:
            "Read public, science-based guidance on humane dog behavior support.",
          href: "https://avsab.org/resources/position-statements/",
          kind: "education",
          label: "Explore behavior resources",
        },
        {
          description:
            "For ongoing concerns, find a qualified behavior professional or contact your veterinarian.",
          href: "https://avsab.org/directory/",
          kind: "professional",
          label: "Find a behavior consultant",
        },
      ];
}
