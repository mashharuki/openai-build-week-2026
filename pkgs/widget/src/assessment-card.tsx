import { type ReactNode, useState } from "react";

import type {
  AssessmentResult,
  HistoryComparison,
  Locale,
} from "@pawlens/shared";

export interface AssessmentCardProps {
  actions?: ReactNode;
  assessment: AssessmentResult;
  dogName?: string;
  history?: HistoryComparison;
  locale?: Locale;
}

export function AssessmentCard({
  actions,
  assessment,
  dogName,
  history,
  locale = "ja",
}: AssessmentCardProps) {
  const copy = cardCopy[locale];
  const [detailsOpen, setDetailsOpen] = useState(false);
  const additionalQuestion =
    assessment.additionalQuestion ??
    (assessment.confidence === "low" ? copy.fallbackQuestion : null);

  if (assessment.status === "error") {
    return (
      <section
        aria-label={copy.systemError}
        data-state="error"
        role="alert"
        style={{ color: "rgb(185, 28, 28)" }}
      >
        <p aria-hidden="true">!</p>
        <h2>{copy.systemError}</h2>
        <p>{copy.displayError}</p>
      </section>
    );
  }

  if (assessment.status === "urgent") {
    return (
      <section
        aria-label={copy.urgentGuidance}
        data-state="urgent"
        role="alert"
        style={{ color: "rgb(180, 83, 9)" }}
      >
        <p aria-hidden="true">⚠</p>
        <h2>{copy.urgentGuidance}</h2>
        <p>{assessment.suggestedAction}</p>
        <p>{copy.urgentSupport}</p>
        <ProfessionalSupportLink locale={locale} />
      </section>
    );
  }

  return (
    <section aria-label={copy.assessment} data-state="assessment">
      <header>
        <p>{copy.educationalNotice}</p>
        <h2>{dogName ? copy.namedAssessment(dogName) : copy.assessment}</h2>
      </header>
      <section aria-label={copy.primaryPossibility}>
        <h3>{copy.primaryPossibility}</h3>
        <p>
          <span>{assessment.primaryHypothesis.label}</span>
          {copy.possibilitySuffix}
        </p>
        <p>{assessment.primaryHypothesis.rationale}</p>
      </section>
      <p>
        {copy.confidence}: {confidenceLabels[assessment.confidence][locale]}
      </p>
      <section aria-label={copy.evidenceSources}>
        <h3>{copy.evidenceSources}</h3>
        <ul>
          {assessment.evidenceSources.includes("research") ? (
            <li>{copy.research}</li>
          ) : null}
          {assessment.evidenceSources.includes("confirmed_observation") ? (
            <li>{copy.confirmedObservation}</li>
          ) : null}
        </ul>
      </section>
      <section aria-label={copy.limitations}>
        <h3>{copy.limitations}</h3>
        <p>{assessment.limitations}</p>
      </section>
      {additionalQuestion ? (
        <section aria-label={copy.nextQuestion}>
          <h3>{copy.nextQuestion}</h3>
          <p>{additionalQuestion}</p>
        </section>
      ) : null}
      <section aria-label={copy.calmAction}>
        <h3>{copy.calmAction}</h3>
        <p>{assessment.suggestedAction}</p>
      </section>
      <section aria-label={copy.observationConfirmation}>
        <h3>{copy.observationConfirmation}</h3>
        <p>{copy.ownerConfirmation}</p>
        {actions}
      </section>
      <ProfessionalSupportLink locale={locale} />
      <button
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((open) => !open)}
        type="button"
      >
        {detailsOpen ? copy.hideDetails : copy.showDetails}
      </button>
      {detailsOpen ? (
        <section aria-label={copy.details}>
          <h3>{copy.secondaryPossibilities}</h3>
          {assessment.secondaryHypotheses.length === 0 ? (
            <p>{copy.noSecondaryPossibilities}</p>
          ) : (
            <ul>
              {assessment.secondaryHypotheses.map((hypothesis) => (
                <li key={hypothesis.label}>
                  <p>
                    <span>{hypothesis.label}</span>
                    {copy.possibilitySuffix}
                  </p>
                  <p>{hypothesis.rationale}</p>
                </li>
              ))}
            </ul>
          )}
          <h3>{copy.observationDescription}</h3>
          <ul>
            {assessment.observationPoints.map((point) => (
              <li key={point}>{copy.describeObservation(point)}</li>
            ))}
          </ul>
          <h3>{copy.history}</h3>
          <p>{history?.summary ?? copy.historyFallback}</p>
        </section>
      ) : null}
    </section>
  );
}

function ProfessionalSupportLink({ locale }: { locale: Locale }) {
  return (
    <a href="https://www.jvma.or.jp/">{cardCopy[locale].professionalSupport}</a>
  );
}

const confidenceLabels = {
  high: { en: "high", ja: "高" },
  low: { en: "low", ja: "低" },
  medium: { en: "medium", ja: "中" },
} as const;

const cardCopy = {
  en: {
    assessment: "Assessment",
    calmAction: "A calm next step",
    confidence: "Confidence",
    confirmedObservation: "Owner-confirmed observation",
    describeObservation: (point: string) => `Please check ${point} yourself.`,
    details: "Assessment details",
    displayError:
      "We could not safely display this assessment. Review the input and try again.",
    educationalNotice: "This is observation support, not a diagnosis.",
    evidenceSources: "Evidence sources",
    fallbackQuestion:
      "Can you check the ear direction and body stiffness next?",
    hideDetails: "Hide details",
    history: "History in this conversation",
    historyFallback:
      "Saved observations can be compared only in this conversation.",
    limitations: "Limits of this assessment",
    namedAssessment: (name: string) => `${name}'s assessment`,
    nextQuestion: "What to check next",
    noSecondaryPossibilities:
      "There are no secondary possibilities at this time.",
    observationConfirmation: "Unconfirmed observation points",
    observationDescription: "Observation point descriptions",
    ownerConfirmation:
      "These are not confirmed by AI. Record only facts you have confirmed yourself.",
    possibilitySuffix: " — a possibility",
    primaryPossibility: "Primary possibility",
    professionalSupport: "Talk to a veterinarian or behavior professional",
    research: "Research evidence",
    secondaryPossibilities: "Secondary possibilities",
    showDetails: "Show details",
    systemError: "System error",
    urgentGuidance: "Urgent safety guidance",
    urgentSupport:
      "Secure safety first and contact a professional when needed.",
  },
  ja: {
    assessment: "見立て結果",
    calmAction: "安全で低刺激な次の一手",
    confidence: "確信度",
    confirmedObservation: "飼い主が確認した観察",
    describeObservation: (point: string) =>
      `${point}を飼い主自身で確認してください。`,
    details: "見立ての詳細",
    displayError:
      "見立てを安全に表示できません。入力を見直して、もう一度お試しください。",
    educationalNotice: "見立ては診断ではなく、次の観察を支えるためのものです。",
    evidenceSources: "根拠の種類",
    fallbackQuestion: "次に、耳の向きや体の硬さを確認できますか？",
    hideDetails: "詳細を閉じる",
    history: "同一会話内の履歴",
    historyFallback: "保存済み観察は、同一会話内でのみ比較できます。",
    limitations: "この見立ての限界",
    namedAssessment: (name: string) => `${name}の見立て結果`,
    nextQuestion: "次に確認したいこと",
    noSecondaryPossibilities: "現時点では次点の見立てはありません。",
    observationConfirmation: "未確認の観察ポイント",
    observationDescription: "観察ポイントの説明",
    ownerConfirmation:
      "以下はAIの確認ではありません。飼い主自身が確認した事実だけを記録します。",
    possibilitySuffix: "の可能性",
    primaryPossibility: "主な見立て",
    professionalSupport: "獣医師・行動専門家に相談する",
    research: "研究知見",
    secondaryPossibilities: "次点の見立て",
    showDetails: "詳細を表示",
    systemError: "システムエラー",
    urgentGuidance: "緊急の安全案内",
    urgentSupport: "安全を確保し、必要に応じて専門家へ相談してください。",
  },
} as const;
