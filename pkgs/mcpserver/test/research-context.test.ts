import { describe, expect, it } from "vitest";

import { getResearchContext } from "../src/research-context.js";

describe("ResearchContext", () => {
  it("来客とチャイムでは、固定された研究根拠だけを研究出典として返す", () => {
    const visitorEvidence = getResearchContext("visitor");
    const doorbellEvidence = getResearchContext("doorbell");

    expect(visitorEvidence).toEqual(doorbellEvidence);
    expect(visitorEvidence).toEqual([
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
    ]);
  });

  it("来客／チャイム以外では根拠を返さず、任意のWeb検索を行わない", () => {
    expect(getResearchContext("unknown")).toEqual([]);
    expect(getResearchContext("other")).toEqual([]);
  });
});
