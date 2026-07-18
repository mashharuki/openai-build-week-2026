// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AssessmentResult } from "@pawlens/shared";

import { adaptEvidence } from "../../mcpserver/src/audio-evidence.js";
import { applyGuardrails } from "../../mcpserver/src/guardrails.js";
import { createHistoryDiff } from "../../mcpserver/src/history-diff.js";
import { createConversationScope } from "../../mcpserver/src/repositories.js";
import { WidgetStateView } from "../src/app.js";
import { AssessmentCard } from "../src/assessment-card.js";
import { ObservationActions } from "../src/observation-actions.js";

type EvaluationCase = {
  context?: "visitor" | "other" | "unknown";
  expected: {
    actionIncludes?: string;
    confidence?: "low" | "medium";
    limitationIncludes?: string;
    message?: string;
    messages?: string[];
    questionIncludes?: string;
    state?: "empty" | "error" | "loading" | "partial" | "success" | "urgent";
    status?: "error" | "partial" | "success" | "urgent";
  };
  id: string;
  input?: {
    audioDurationSeconds?: number;
    cardContent?: {
      additionalQuestion: string;
      limitations: string;
      observationPoint: string;
      primaryHypothesis: string;
      rationale: string;
      suggestedAction: string;
    };
    imageMimeType?: string;
    missingInformation?: Array<
      "bark_description" | "distance_to_person" | "preceding_event"
    >;
    observationPoints?: string[];
  };
  locale?: "en" | "ja";
  type:
    | "card"
    | "deletion"
    | "evidence"
    | "guardrail"
    | "history"
    | "notices"
    | "state";
};

const evaluations = JSON.parse(
  readFileSync(
    resolve(process.cwd(), "../../tests/evals/pawlens-cases.json"),
    "utf8",
  ),
) as { cases: EvaluationCase[] };

const candidate: AssessmentResult = {
  additionalQuestion: null,
  confidence: "medium",
  evidenceSources: ["research"],
  limitations: "観察だけでは断定できません。",
  observationPoints: ["耳の向き"],
  primaryHypothesis: {
    label: "警戒している可能性",
    rationale: "来客直後の反応です。",
  },
  secondaryHypotheses: [],
  status: "success",
  suggestedAction: "玄関から距離を取ります。",
};

afterEach(cleanup);

describe("PawLens requirement-derived evaluations", () => {
  it.each(evaluations.cases)("$id", async (evaluation) => {
    if (evaluation.type === "guardrail") {
      const guardedCandidate =
        evaluation.input?.observationPoints === undefined
          ? candidate
          : {
              ...candidate,
              observationPoints: evaluation.input.observationPoints,
            };
      const result = applyGuardrails(guardedCandidate, {
        context: evaluation.context ?? "visitor",
        locale: evaluation.locale ?? "ja",
        missingInformation: evaluation.input?.missingInformation ?? [],
      });
      expect(result).toMatchObject({ kind: "safe" });
      if (result.kind === "safe") {
        expect(result.assessment).toMatchObject({
          confidence: evaluation.expected.confidence,
          status: evaluation.expected.status,
        });
        if (evaluation.expected.limitationIncludes) {
          expect(result.assessment.limitations).toContain(
            evaluation.expected.limitationIncludes,
          );
        }
        if (evaluation.expected.questionIncludes) {
          expect(result.assessment.additionalQuestion).toContain(
            evaluation.expected.questionIncludes,
          );
        }
        if (evaluation.expected.actionIncludes) {
          expect(result.assessment.suggestedAction).toContain(
            evaluation.expected.actionIncludes,
          );
        }
      }
      return;
    }

    if (evaluation.type === "history") {
      const scope = createConversationScope(() => "conversation-1");
      const firstLog = {
        chosenAction: "距離を取る",
        conversationId: scope,
        dogId: "dog-1",
        id: "log-1",
        observedCues: ["耳の向き"],
        recordedAt: "2026-07-18T00:00:00.000Z",
      };
      const secondLog = {
        ...firstLog,
        id: "log-2",
        observedCues: ["体の硬さ"],
        recordedAt: "2026-07-18T00:01:00.000Z",
      };
      const history = createHistoryDiff({
        observations: { list: async () => [firstLog] },
      });
      await expect(
        history.compare(scope, {
          conversationStable: true,
          dogId: "dog-1",
          recentLogs: [firstLog, secondLog],
        }),
      ).resolves.toMatchObject(evaluation.expected);
      return;
    }

    if (evaluation.type === "evidence") {
      const evidence = adaptEvidence({
        audio: {
          durationSeconds: evaluation.input?.audioDurationSeconds ?? 0.5,
          fileId: "audio-1",
          mimeType: "audio/wav",
        },
        image: {
          fileId: "image-1",
          mimeType: evaluation.input?.imageMimeType ?? "application/pdf",
        },
        locale: evaluation.locale ?? "ja",
        supportsAudio: true,
      });
      expect(evidence.kind).toBe(evaluation.expected.state);
      for (const message of evaluation.expected.messages ?? []) {
        expect(evidence.messages.join(" ")).toContain(message);
      }
      return;
    }

    if (evaluation.type === "state") {
      const state = evaluation.expected.state;
      if (!state) throw new Error("State evaluation requires expected.state.");
      render(
        <WidgetStateView
          locale={evaluation.locale}
          state={
            state === "empty" || state === "loading"
              ? { kind: state }
              : state === "error"
                ? { kind: "error", message: "Try again." }
                : {
                    assessment: { ...candidate, status: state },
                    kind: "success",
                  }
          }
        />,
      );
      expect(screen.getByText(evaluation.expected.message)).not.toBeNull();
      return;
    }

    if (evaluation.type === "card") {
      const content = evaluation.input?.cardContent;
      if (!content)
        throw new Error("Card evaluation requires localized content.");
      const localizedAssessment = {
        ...candidate,
        additionalQuestion: content.additionalQuestion,
        limitations: content.limitations,
        observationPoints: [content.observationPoint],
        primaryHypothesis: {
          ...candidate.primaryHypothesis,
          label: content.primaryHypothesis,
          rationale: content.rationale,
        },
        suggestedAction: content.suggestedAction,
      };
      render(
        <AssessmentCard
          assessment={localizedAssessment}
          locale={evaluation.locale}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      for (const message of evaluation.expected.messages ?? []) {
        expect(screen.getByText(message)).not.toBeNull();
      }
      return;
    }

    if (evaluation.type === "notices") {
      render(
        <ObservationActions
          assessment={candidate}
          callTool={vi.fn()}
          dogId="dog-1"
          locale={evaluation.locale ?? "ja"}
        />,
      );
      for (const message of evaluation.expected.messages ?? []) {
        expect(screen.getByText(message)).not.toBeNull();
      }
      return;
    }

    const callTool = vi.fn(async () => ({ dogId: "dog-1", status: "deleted" }));
    render(
      <ObservationActions
        assessment={candidate}
        callTool={callTool}
        dogId="dog-1"
        locale={evaluation.locale ?? "ja"}
      />,
    );
    fireEvent.click(screen.getByLabelText(evaluation.expected.message));
    fireEvent.click(screen.getByRole("button", { name: "プロフィールを削除" }));
    await waitFor(() =>
      expect(callTool).toHaveBeenCalledWith("manage_dog_profile", {
        action: "delete",
        confirmed: true,
        dogId: "dog-1",
      }),
    );
    expect(
      screen.getByText(evaluation.expected.messages?.[0] ?? ""),
    ).not.toBeNull();
  });
});
