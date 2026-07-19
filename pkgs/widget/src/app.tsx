import { useEffect, useState } from "react";

import {
  AssessmentResultSchema,
  type DogProfile,
  type HistoryComparison,
  type Locale,
} from "@pawlens/shared";

import { AssessmentCard } from "./assessment-card.js";
import { GuidedAssessmentForm } from "./guided-assessment-form.js";
import { ObservationActions } from "./observation-actions.js";
import {
  createAppsSdkFileUploader,
  getDogIdFromToolInputMessage,
  getStructuredContentFromBridgeMessage,
  getToolCaller,
  startMcpAppsBridge,
} from "./openai-runtime.js";

import type { WidgetState } from "./widget-state.js";

export function WidgetStateView({
  dogName,
  locale = "ja",
  state,
}: {
  dogName?: string;
  locale?: Locale;
  state: WidgetState;
}) {
  if (state.kind === "empty") {
    return (
      <p className="conversation-state">
        {locale === "en"
          ? "Ready to begin an assessment."
          : "見立てを始める準備ができました。"}
      </p>
    );
  }

  if (state.kind === "loading") {
    return (
      <output className="conversation-state">
        {locale === "en"
          ? "Preparing the assessment."
          : "見立てを準備しています。"}
      </output>
    );
  }

  if (state.kind === "error") {
    return (
      <section
        aria-label={locale === "en" ? "System error" : "システムエラー"}
        data-state="error"
        className="conversation-alert"
        role="alert"
        style={{ color: "rgb(185, 28, 28)" }}
      >
        <span aria-hidden="true">!</span>
        <h2>{locale === "en" ? "System error" : "システムエラー"}</h2>
        <p>{state.message}</p>
      </section>
    );
  }

  return (
    <AssessmentCard
      assessment={state.assessment}
      dogName={dogName}
      locale={locale}
    />
  );
}

export function HelloWidget({ locale = "ja" }: { locale?: Locale }) {
  const [dogId, setDogId] = useState<string>();
  const [history, setHistory] = useState<HistoryComparison>();
  const [profile, setProfile] = useState<DogProfile>();
  const [state, setState] = useState<WidgetState>({ kind: "empty" });

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      // Only the embedding MCP Apps host may update tool state or supply an
      // owner-selected dog ID; ignore messages from arbitrary frames.
      if (event.source !== window.parent) {
        return;
      }

      const nextContent = getStructuredContentFromBridgeMessage(event.data);
      const toolInputDogId = getDogIdFromToolInputMessage(event.data);
      if (toolInputDogId) {
        setDogId(toolInputDogId);
      }
      const assessment = AssessmentResultSchema.safeParse(nextContent);
      if (assessment.success) {
        setState({ assessment: assessment.data, kind: "success" });
      }
    };

    window.addEventListener("message", onMessage, { passive: true });
    const stopBridge = startMcpAppsBridge(window);
    return () => {
      stopBridge();
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <main
      aria-live="polite"
      data-motion={
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "reduced"
          : "full"
      }
      lang={locale}
    >
      <header className="brand-header">
        <div aria-hidden="true" className="brand-mark">
          <svg aria-hidden="true" viewBox="0 0 48 48">
            <circle cx="11" cy="18" r="5" />
            <circle cx="24" cy="11" r="5" />
            <circle cx="37" cy="18" r="5" />
            <path d="M24 23c-7.4 0-12 5.1-12 10.6 0 4.2 3.8 6.4 7.1 4.1l2.2-1.5a4.9 4.9 0 0 1 5.4 0l2.2 1.5c3.3 2.3 7.1.1 7.1-4.1C36 28.1 31.4 23 24 23Z" />
          </svg>
        </div>
        <div>
          <p className="brand-eyebrow">OBSERVE · UNDERSTAND · CARE</p>
          <h1 translate="no">PawLens</h1>
          <p>
            {locale === "ja"
              ? "愛犬の「いつもと違う」を、落ち着いて観察するために。"
              : "A calm way to notice what is different for your dog."}
          </p>
        </div>
      </header>
      {state.kind === "success" ? (
        <AssessmentCard
          actions={
            state.assessment.status !== "urgent" && dogId ? (
              <ObservationActions
                assessment={state.assessment}
                callTool={getToolCaller(window.openai ?? {})}
                dogId={dogId}
                dogName={profile?.name}
                locale={locale}
                onHistoryComparison={setHistory}
              />
            ) : null
          }
          assessment={state.assessment}
          dogName={profile?.name}
          history={history}
          locale={locale}
        />
      ) : (
        <WidgetStateView
          dogName={profile?.name}
          locale={locale}
          state={state}
        />
      )}
      <GuidedAssessmentForm
        audioSupported={
          // File helpers are optional ChatGPT extensions. The description-led
          // flow remains usable when the host cannot authorize uploads.
          typeof window.openai?.uploadFile === "function" &&
          typeof window.openai?.getFileDownloadUrl === "function"
        }
        callTool={getToolCaller(window.openai ?? {})}
        fileUploader={createAppsSdkFileUploader(window.openai ?? {})}
        locale={locale}
        onDogId={setDogId}
        onProfileChange={setProfile}
        onAssessment={(assessment) => setState({ assessment, kind: "success" })}
      />
    </main>
  );
}
