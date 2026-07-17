import { useEffect, useState } from "react";

import type { DogProfile, HistoryComparison, Locale } from "@pawlens/shared";

import { AssessmentCard } from "./assessment-card.js";
import { GuidedAssessmentForm } from "./guided-assessment-form.js";
import { ObservationActions } from "./observation-actions.js";
import {
  getDogIdFromToolInputMessage,
  getStructuredContentFromBridgeMessage,
  getToolCaller,
  startMcpAppsBridge,
} from "./openai-runtime.js";

import { type WidgetState, toWidgetState } from "./widget-state.js";

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
      <p>
        {locale === "en"
          ? "Ready to begin an assessment."
          : "見立てを始める準備ができました。"}
      </p>
    );
  }

  if (state.kind === "loading") {
    return (
      <output>
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
      if (event.source !== window.parent) {
        return;
      }

      const nextContent = getStructuredContentFromBridgeMessage(event.data);
      const toolInputDogId = getDogIdFromToolInputMessage(event.data);
      if (toolInputDogId) {
        setDogId(toolInputDogId);
      }
      if (nextContent !== undefined) {
        setState(toWidgetState(nextContent));
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
      <h1>PawLens</h1>
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
        audioSupported={window.openai?.capabilities?.audioEvidence === true}
        callTool={getToolCaller(window.openai ?? {})}
        locale={locale}
        onDogId={setDogId}
        onProfileChange={setProfile}
        onAssessment={(assessment) => setState({ assessment, kind: "success" })}
      />
    </main>
  );
}
