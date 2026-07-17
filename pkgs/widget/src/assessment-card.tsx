import { type ReactNode, useState } from "react";

import type { AssessmentResult, HistoryComparison } from "@pawlens/shared";

const confidenceLabels = {
  high: "高",
  low: "低",
  medium: "中",
} as const;

export interface AssessmentCardProps {
  actions?: ReactNode;
  assessment: AssessmentResult;
  dogName?: string;
  history?: HistoryComparison;
}

export function AssessmentCard({
  actions,
  assessment,
  dogName,
  history,
}: AssessmentCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const additionalQuestion =
    assessment.additionalQuestion ??
    (assessment.confidence === "low"
      ? "次に、耳の向きや体の硬さを確認できますか？"
      : null);

  if (assessment.status === "error") {
    return (
      <section
        aria-label="system error"
        role="alert"
        style={{ color: "rgb(185, 28, 28)" }}
      >
        <p aria-hidden="true">!</p>
        <h2>システムエラー</h2>
        <p>
          見立てを安全に表示できません。入力を見直して、もう一度お試しください。
        </p>
      </section>
    );
  }

  if (assessment.status === "urgent") {
    return (
      <section
        aria-label="urgent safety guidance"
        role="alert"
        style={{ color: "rgb(180, 83, 9)" }}
      >
        <p aria-hidden="true">⚠</p>
        <h2>緊急の安全案内</h2>
        <p>{assessment.suggestedAction}</p>
        <p>安全を確保し、必要に応じて専門家へ相談してください。</p>
        <ProfessionalSupportLink />
      </section>
    );
  }

  return (
    <section aria-label="assessment result">
      <header>
        <p>見立ては診断ではなく、次の観察を支えるためのものです。</p>
        <h2>{dogName ? `${dogName}の見立て結果` : "見立て結果"}</h2>
      </header>
      <section aria-label="primary hypothesis">
        <h3>主な見立て</h3>
        <p>
          <span>{assessment.primaryHypothesis.label}</span>の可能性
        </p>
        <p>{assessment.primaryHypothesis.rationale}</p>
      </section>
      <p>確信度: {confidenceLabels[assessment.confidence]}</p>
      <section aria-label="evidence sources">
        <h3>根拠の種類</h3>
        <ul>
          {assessment.evidenceSources.includes("research") ? (
            <li>研究知見</li>
          ) : null}
          {assessment.evidenceSources.includes("confirmed_observation") ? (
            <li>飼い主が確認した観察</li>
          ) : null}
        </ul>
      </section>
      <section aria-label="limitations">
        <h3>この見立ての限界</h3>
        <p>{assessment.limitations}</p>
      </section>
      {additionalQuestion ? (
        <section aria-label="additional observation question">
          <h3>次に確認したいこと</h3>
          <p>{additionalQuestion}</p>
        </section>
      ) : null}
      <section aria-label="suggested action">
        <h3>安全で低刺激な次の一手</h3>
        <p>{assessment.suggestedAction}</p>
      </section>
      <section aria-label="observation confirmation">
        <h3>未確認の観察ポイント</h3>
        <p>
          以下はAIの確認ではありません。飼い主自身が確認した事実だけを記録します。
        </p>
        {actions}
      </section>
      <ProfessionalSupportLink />
      <button
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((open) => !open)}
        type="button"
      >
        {detailsOpen ? "詳細を閉じる" : "詳細を表示"}
      </button>
      {detailsOpen ? (
        <section aria-label="assessment details">
          <h3>次点の見立て</h3>
          {assessment.secondaryHypotheses.length === 0 ? (
            <p>現時点では次点の見立てはありません。</p>
          ) : (
            <ul>
              {assessment.secondaryHypotheses.map((hypothesis) => (
                <li key={hypothesis.label}>
                  <p>
                    <span>{hypothesis.label}</span>の可能性
                  </p>
                  <p>{hypothesis.rationale}</p>
                </li>
              ))}
            </ul>
          )}
          <h3>観察ポイントの説明</h3>
          <ul>
            {assessment.observationPoints.map((point) => (
              <li key={point}>{point}を飼い主自身で確認してください。</li>
            ))}
          </ul>
          <h3>同一会話内の履歴</h3>
          <p>
            {history?.summary ??
              "保存済み観察は、同一会話内でのみ比較できます。"}
          </p>
        </section>
      ) : null}
    </section>
  );
}

function ProfessionalSupportLink() {
  return <a href="https://www.jvma.or.jp/">獣医師・行動専門家に相談する</a>;
}
