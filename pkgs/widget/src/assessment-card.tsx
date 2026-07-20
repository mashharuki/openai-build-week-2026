import { type ReactNode, useState } from "react";

import type {
  AssessmentResult,
  HistoryComparison,
  Locale,
  SupportResource,
} from "@pawlens/shared";

import { openExternalResource } from "./openai-runtime.js";

export interface AssessmentCardProps {
  actions?: ReactNode;
  assessment: AssessmentResult;
  dogName?: string;
  history?: HistoryComparison;
  locale?: Locale;
  onFollowUp?: () => void | Promise<void>;
  readOnly?: boolean;
}

export function AssessmentCard({
  actions,
  assessment,
  dogName,
  history,
  locale = "ja",
  onFollowUp,
  readOnly = false,
}: AssessmentCardProps) {
  const copy = cardCopy[locale];
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const additionalQuestion =
    assessment.additionalQuestion ??
    (assessment.confidence === "low" ? copy.fallbackQuestion : null);

  if (assessment.status === "error") {
    return (
      <section
        aria-label={copy.systemError}
        className="conversation-alert"
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
        className="conversation-alert"
        data-state="urgent"
        role="alert"
        style={{ color: "rgb(180, 83, 9)" }}
      >
        <p aria-hidden="true">⚠</p>
        <h2>{copy.urgentGuidance}</h2>
        <p>{assessment.suggestedAction}</p>
        <p>{copy.urgentSupport}</p>
        <SupportResources locale={locale} resources={assessment.resources} />
      </section>
    );
  }

  const handleFollowUp = async () => {
    if (!onFollowUp || isSendingFollowUp) return;

    setIsSendingFollowUp(true);
    try {
      await onFollowUp();
    } finally {
      setIsSendingFollowUp(false);
    }
  };

  return (
    <section
      aria-label={copy.assessment}
      className="assessment-thread"
      data-state="assessment"
    >
      <header className="assessment-opening">
        <p className="assistant-prompt">{copy.educationalNotice}</p>
        <h2>{dogName ? copy.namedAssessment(dogName) : copy.assessment}</h2>
      </header>
      <section
        aria-label={copy.primaryPossibility}
        className="assessment-focus"
      >
        <h3>{copy.primaryPossibility}</h3>
        <p>
          <span>{assessment.primaryHypothesis.label}</span>
          {copy.possibilitySuffix}
        </p>
        <p>{assessment.primaryHypothesis.rationale}</p>
      </section>
      <p className="assessment-confidence">
        {copy.confidence}: {confidenceLabels[assessment.confidence][locale]}
      </p>
      <EvidenceMap locale={locale} summary={assessment.evidenceSummary} />
      <ObservationTimeline
        locale={locale}
        timeline={assessment.observationTimeline}
      />
      <section aria-label={copy.evidenceSources} className="assessment-detail">
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
      <section aria-label={copy.limitations} className="assessment-detail">
        <h3>{copy.limitations}</h3>
        <p>{assessment.limitations}</p>
      </section>
      {additionalQuestion ? (
        <section aria-label={copy.nextQuestion} className="assessment-detail">
          <h3>{copy.nextQuestion}</h3>
          <p>{additionalQuestion}</p>
        </section>
      ) : null}
      <section aria-label={copy.calmAction} className="assessment-action">
        <h3>{copy.calmAction}</h3>
        <p>{assessment.suggestedAction}</p>
      </section>
      <SupportResources locale={locale} resources={assessment.resources} />
      {!readOnly ? (
        <section
          aria-label={copy.observationConfirmation}
          className="assessment-confirmation"
        >
          <h3>{copy.observationConfirmation}</h3>
          <p>{copy.ownerConfirmation}</p>
          {actions}
        </section>
      ) : null}
      {!readOnly && onFollowUp ? (
        <button
          className="conversation-follow-up"
          disabled={isSendingFollowUp}
          onClick={() => void handleFollowUp()}
          type="button"
        >
          {isSendingFollowUp ? copy.sendingFollowUp : copy.continueInChat}
        </button>
      ) : null}
      {!readOnly ? (
        <button
          aria-expanded={detailsOpen}
          className="button-secondary assessment-details-toggle"
          onClick={() => setDetailsOpen((open) => !open)}
          type="button"
        >
          {detailsOpen ? copy.hideDetails : copy.showDetails}
        </button>
      ) : null}
      {!readOnly && detailsOpen ? (
        <section aria-label={copy.details} className="assessment-details">
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

function EvidenceMap({
  locale,
  summary,
}: {
  locale: Locale;
  summary: AssessmentResult["evidenceSummary"];
}) {
  if (!summary?.length) return null;

  const copy = cardCopy[locale];
  return (
    <section aria-label={copy.evidenceMapTitle} className="evidence-map">
      <h3>{copy.evidenceMapTitle}</h3>
      <p>{copy.evidenceMapDescription}</p>
      <ul>
        {summary.map((item) => (
          <li data-status={item.status} key={item.kind}>
            <span aria-hidden="true">{evidenceIcons[item.status]}</span>
            <span>{copy.evidenceKinds[item.kind]}</span>
            <strong>{copy.evidenceStatus[item.status]}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ObservationTimeline({
  locale,
  timeline,
}: {
  locale: Locale;
  timeline: AssessmentResult["observationTimeline"];
}) {
  if (!timeline?.length) return null;

  const copy = cardCopy[locale];
  return (
    <section aria-label={copy.timelineTitle} className="observation-timeline">
      <h3>{copy.timelineTitle}</h3>
      <p>{copy.timelineDescription}</p>
      <ol>
        {timeline.map((item) => (
          <li key={item.kind}>
            <span>{copy.timelineKinds[item.kind]}</span>
            <p>{item.value}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SupportResources({
  locale,
  resources,
}: {
  locale: Locale;
  resources: SupportResource[] | undefined;
}) {
  if (!resources?.length) return null;

  const copy = cardCopy[locale];
  return (
    <section
      aria-label={copy.supportResourcesTitle}
      className="support-resources"
    >
      <h3>{copy.supportResourcesTitle}</h3>
      <p>{copy.supportResourcesDescription}</p>
      <ul>
        {resources.map((resource) => (
          <li key={resource.href}>
            <a
              href={resource.href}
              onClick={(event) => {
                if (openExternalResource(resource.href)) event.preventDefault();
              }}
              rel="noreferrer"
              target="_blank"
            >
              <span>{resource.label}</span>
              <small>{resource.description}</small>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

const evidenceIcons = {
  included: "●",
  not_provided: "○",
  unavailable: "!",
} as const;

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
    continueInChat: "Continue in ChatGPT",
    sendingFollowUp: "Opening ChatGPT…",
    describeObservation: (point: string) => `Please check ${point} yourself.`,
    details: "Assessment details",
    displayError:
      "We could not safely display this assessment. Review the input and try again.",
    educationalNotice: "This is observation support, not a diagnosis.",
    evidenceKinds: {
      audio: "Audio",
      confirmed_observations: "Owner-confirmed observations",
      owner_description: "Owner's description",
      photo: "Photo",
      research: "Curated research context",
    },
    evidenceMapDescription:
      "This shows which inputs were available for this assessment. It does not show what was diagnosed.",
    evidenceMapTitle: "What informed this assessment",
    evidenceStatus: {
      included: "Included",
      not_provided: "Not provided",
      unavailable: "Unavailable",
    },
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
    supportResourcesDescription:
      "These are external resources, not a diagnosis or a PawLens recommendation.",
    supportResourcesTitle: "More support",
    timelineDescription:
      "These are facts supplied in this conversation, not AI inferences.",
    timelineKinds: {
      distance: "Distance",
      preceding_event: "What happened before",
      reaction: "Observed reaction",
    },
    timelineTitle: "Observation notes from this conversation",
    urgentGuidance: "Urgent safety guidance",
    urgentSupport:
      "Secure safety first and contact a professional when needed.",
  },
  ja: {
    assessment: "見立て結果",
    calmAction: "安全で低刺激な次の一手",
    confidence: "確信度",
    confirmedObservation: "飼い主が確認した観察",
    continueInChat: "ChatGPTで続きを相談する",
    sendingFollowUp: "ChatGPTを開いています…",
    describeObservation: (point: string) =>
      `${point}を飼い主自身で確認してください。`,
    details: "見立ての詳細",
    displayError:
      "見立てを安全に表示できません。入力を見直して、もう一度お試しください。",
    educationalNotice: "見立ては診断ではなく、次の観察を支えるためのものです。",
    evidenceKinds: {
      audio: "音声",
      confirmed_observations: "飼い主が確認した観察",
      owner_description: "飼い主の記述",
      photo: "写真",
      research: "整理済みの研究知見",
    },
    evidenceMapDescription:
      "今回の見立てで利用できた入力を示します。診断や状態の確定を示すものではありません。",
    evidenceMapTitle: "今回の根拠",
    evidenceStatus: {
      included: "利用できた",
      not_provided: "未提供",
      unavailable: "利用不可",
    },
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
    supportResourcesDescription:
      "外部の補助資料です。PawLens による診断や個別の推薦ではありません。",
    supportResourcesTitle: "次の支援先",
    timelineDescription:
      "この会話で飼い主が伝えた事実です。AI の推測ではありません。",
    timelineKinds: {
      distance: "距離",
      preceding_event: "直前の出来事",
      reaction: "観察した反応",
    },
    timelineTitle: "今回の観察メモ",
    urgentGuidance: "緊急の安全案内",
    urgentSupport: "安全を確保し、必要に応じて専門家へ相談してください。",
  },
} as const;
