import {
  type AssessmentResult,
  AssessmentResultSchema,
  type Locale,
} from "@pawlens/shared";

export type WidgetState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { assessment: AssessmentResult; kind: "success" }
  | { kind: "error"; message: string };

export interface WidgetRuntimeContext {
  callTool: (name: string, input: unknown) => Promise<unknown>;
  displayMode: "inline" | "fullscreen";
  locale: Locale;
  theme: "dark" | "light";
}

export function toWidgetState(content: unknown): WidgetState {
  if (content === undefined) {
    return { kind: "empty" };
  }

  if (
    content &&
    typeof content === "object" &&
    "loading" in content &&
    content.loading === true
  ) {
    return { kind: "loading" };
  }

  // Tool results cross the host boundary. Render a contained error instead of
  // trusting an unexpected payload or trying to display partial fields.
  const result = AssessmentResultSchema.safeParse(content);
  return result.success
    ? { assessment: result.data, kind: "success" }
    : {
        kind: "error",
        message: "ツール結果を安全に表示できません。もう一度お試しください。",
      };
}
