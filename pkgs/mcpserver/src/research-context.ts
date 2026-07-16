export type ResearchEvidence = {
  citation: string;
  id: string;
  sourceType: "research";
  summary: string;
  use: string;
};

type AssessmentContext = "visitor" | "doorbell" | "unknown" | "other";

const VISITOR_RESEARCH_CONTEXT: readonly ResearchEvidence[] = [
  {
    id: "dog-vocalization-classification",
    sourceType: "research",
    citation:
      "Automatic classification of dog barking using deep learning (2024)",
    summary:
      "犬の鳴き声の自動分類研究は進展しているが、鳴き声だけから個別の状態を断定する根拠にはならない。",
    use: "鳴き声は状況や飼い主が確認した観察と組み合わせて、可能性として扱う。",
  },
  {
    id: "contextual-observation",
    sourceType: "research",
    citation:
      "Relinquishing Owners Underestimate Their Dog's Behavioral Problems (2021)",
    summary:
      "飼い主が犬の行動上の問題を見落とす可能性が示されており、個別の観察を確認することが重要である。",
    use: "耳、尻尾、視線、体の硬さ、直後の行動を飼い主自身が確認するよう促す。",
  },
];

/**
 * Returns the curated, local research evidence allowed for an assessment.
 * This boundary is deliberately pure: assessments never perform web searches.
 */
export function getResearchContext(
  context: AssessmentContext,
): ResearchEvidence[] {
  if (context !== "visitor" && context !== "doorbell") {
    return [];
  }

  return VISITOR_RESEARCH_CONTEXT.map((evidence) => ({ ...evidence }));
}
