import { type AssessmentResult, AssessmentResultSchema } from "@pawlens/shared";

import type { ModelGateway } from "./env.js";

export type ModelCandidateResult =
  | { candidate: AssessmentResult; kind: "valid" }
  | { kind: "invalid"; reason: "invalid_structured_candidate" };

export interface ModelAdapter {
  generate(input: unknown): Promise<ModelCandidateResult>;
}

export function createModelAdapter(gateway: ModelGateway): ModelAdapter {
  return {
    async generate(input) {
      const candidate = await gateway.generateStructured(input);
      // Do not leak malformed output into structuredContent or the widget;
      // AssessmentService owns the bounded repair and fallback policy.
      const result = AssessmentResultSchema.safeParse(candidate);

      if (!result.success) {
        return { kind: "invalid", reason: "invalid_structured_candidate" };
      }

      return { candidate: result.data, kind: "valid" };
    },
  };
}
