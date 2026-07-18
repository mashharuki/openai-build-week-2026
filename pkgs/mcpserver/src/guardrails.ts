import {
  type AssessmentResult,
  AssessmentResultSchema,
  type Locale,
  type SignalContext,
} from "@pawlens/shared";

export type GuardrailResult =
  | { assessment: AssessmentResult; kind: "safe" }
  | { kind: "error"; message: string; reason: "unsafe_candidate" };

export const MISSING_INFORMATION = [
  "bark_description",
  "preceding_event",
  "distance_to_person",
] as const;

export type MissingInformation = (typeof MISSING_INFORMATION)[number];

export interface GuardrailContext {
  context: SignalContext;
  locale: Locale;
  missingInformation: readonly MissingInformation[];
}

const PROHIBITED_PATTERNS = [
  /(?:犬は|犬が)?(?:私|わたし|ぼく|僕|俺)(?:は|が)/u,
  /犬(?:語)?(?:は|が)?(?:[「『][^」』]{1,80}[」』])?(?:と)?(?:言って|言い|話して|話し|翻訳)/u,
  /(?:医療|行動).{0,8}診断|診断(?:です|である|した)/u,
  /\bI(?:'m| am| feel| want| need| think| don't| cannot| can't)\b/iu,
  /(?:the dog says|your dog is saying|dog translation|diagnos(?:is|e|ed|tic))/iu,
];

const URGENCY_PATTERN =
  /(?:過度の震え|うずくまり|攻撃の切迫|trembling excessively|cowering|imminent aggression)/iu;

const ERROR_MESSAGES = {
  en: "The safety check for this assessment failed. Review the input and try again.",
  ja: "見立ての安全確認に失敗しました。入力を見直してからもう一度お試しください。",
} as const;

const CALIBRATION = {
  en: "This situation is not calibrated like a visitor or doorbell scenario, so this is a low-confidence observation prompt.",
  ja: "この場面は来客場面ほど較正されていないため、低い確信度で観察を促します。",
} as const;

const FOLLOW_UP_QUESTIONS = {
  en: {
    other:
      "This situation is not calibrated like a visitor scenario. What body-language cues can you confirm before deciding what to do next?",
    unknown:
      "What happened immediately before the barking, and how far away was the person?",
  },
  ja: {
    other:
      "この場面は来客場面ほど較正されていません。次の行動を決める前に、どの身体サインを確認できますか？",
    unknown: "吠える直前に何があり、人との距離はどのくらいでしたか？",
  },
} as const;

const URGENCY_ACTION = {
  en: "Prioritize safety and create distance. If the signs continue or worsen, contact a veterinarian or behavior professional.",
  ja: "安全を優先し、距離を確保してください。兆候が続く・悪化する場合は獣医師または行動専門家へ相談してください。",
} as const;

const PROFESSIONAL_JUDGMENT_LIMITATION = {
  en: "This is educational observation support and not a substitute for professional judgment.",
  ja: "これは教育および観察支援であり、専門的な判断の代替ではありません。",
} as const;

const MISSING_INFORMATION_LABELS = {
  en: {
    bark_description: "bark description",
    distance_to_person: "distance to the person",
    preceding_event: "what happened immediately before the barking",
  },
  ja: {
    bark_description: "吠え方の記述",
    distance_to_person: "人との距離",
    preceding_event: "吠える直前の出来事",
  },
} as const;

function unsafeCandidate(locale: Locale): GuardrailResult {
  return {
    kind: "error",
    message: ERROR_MESSAGES[locale],
    reason: "unsafe_candidate",
  };
}

function containsProhibitedContent(candidate: AssessmentResult): boolean {
  const text = JSON.stringify(candidate);

  return PROHIBITED_PATTERNS.some((pattern) => pattern.test(text));
}

function containsUrgencySignal(candidate: AssessmentResult): boolean {
  return URGENCY_PATTERN.test(JSON.stringify(candidate));
}

function withUrgencyGuidance(
  candidate: AssessmentResult,
  locale: Locale,
): AssessmentResult {
  return {
    ...candidate,
    confidence: "low",
    limitations: `${candidate.limitations} ${URGENCY_ACTION[locale]}`,
    status: "urgent",
    suggestedAction: URGENCY_ACTION[locale],
  };
}

function appendLimitation(limitations: string, addition: string): string {
  return limitations.includes(addition)
    ? limitations
    : `${limitations} ${addition}`;
}

function withProfessionalJudgmentLimitation(
  candidate: AssessmentResult,
  locale: Locale,
): AssessmentResult {
  const limitation = PROFESSIONAL_JUDGMENT_LIMITATION[locale];
  const withoutProfessionalJudgment = candidate.limitations
    .split(limitation)
    .join("")
    .replace(/\s{2,}/gu, " ")
    .trim();

  return {
    ...candidate,
    limitations: `${withoutProfessionalJudgment} ${limitation}`.trim(),
  };
}

function safeResult(
  assessment: AssessmentResult,
  locale: Locale,
): GuardrailResult {
  const parsed = AssessmentResultSchema.safeParse(assessment);

  return parsed.success
    ? { assessment: parsed.data, kind: "safe" }
    : unsafeCandidate(locale);
}

function withMissingInformation(
  candidate: AssessmentResult,
  missingInformation: readonly MissingInformation[],
  locale: Locale,
): AssessmentResult {
  const labels = missingInformation.map(
    (item) => MISSING_INFORMATION_LABELS[locale][item],
  );
  const missingSummary = labels.join(locale === "ja" ? "、" : ", ");
  const guidance =
    locale === "ja"
      ? `不足している情報: ${missingSummary}。補足してからもう一度お試しください。`
      : `Missing information: ${missingSummary}. Add it and try again.`;

  return {
    ...candidate,
    additionalQuestion: guidance,
    confidence: "low",
    limitations: appendLimitation(candidate.limitations, guidance),
    status: "partial",
  };
}

function withLowConfidenceCalibration(
  candidate: AssessmentResult,
  context: Exclude<SignalContext, "visitor" | "doorbell">,
  locale: Locale,
): AssessmentResult {
  const additionalQuestion = FOLLOW_UP_QUESTIONS[locale][context];

  return {
    ...candidate,
    additionalQuestion,
    confidence: "low",
    limitations:
      context === "other"
        ? `${candidate.limitations} ${CALIBRATION[locale]}`
        : candidate.limitations,
    status: "partial",
  };
}

/** Applies deterministic product safety rules after structured candidate parsing. */
export function applyGuardrails(
  candidate: unknown,
  context: GuardrailContext,
): GuardrailResult {
  // Structured model output is still untrusted input: schema validity cannot
  // enforce PawLens's non-diagnostic and safety requirements on its own.
  const parsed = AssessmentResultSchema.safeParse(candidate);

  if (!parsed.success || containsProhibitedContent(parsed.data)) {
    return unsafeCandidate(context.locale);
  }

  const safeCandidate = withProfessionalJudgmentLimitation(
    parsed.data,
    context.locale,
  );

  if (containsUrgencySignal(safeCandidate)) {
    // Urgent signals replace normal advice with distance and professional
    // support guidance, even when the model suggested another action.
    return safeResult(
      withUrgencyGuidance(safeCandidate, context.locale),
      context.locale,
    );
  }

  const missingInformation =
    context.context === "unknown"
      ? (["preceding_event", "distance_to_person"] as const)
      : context.missingInformation;

  if (missingInformation.length > 0) {
    return safeResult(
      withMissingInformation(safeCandidate, missingInformation, context.locale),
      context.locale,
    );
  }

  if (context.context === "visitor" || context.context === "doorbell") {
    return safeResult(safeCandidate, context.locale);
  }

  // Non-calibrated contexts are observation prompts, not a basis for a
  // visitor-specific interpretation.
  return safeResult(
    withLowConfidenceCalibration(
      safeCandidate,
      context.context,
      context.locale,
    ),
    context.locale,
  );
}
