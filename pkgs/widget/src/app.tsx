import { useEffect, useState } from "react";

import {
  getDogIdFromToolInputMessage,
  getStructuredContentFromBridgeMessage,
  getToolCaller,
  startMcpAppsBridge,
} from "./openai-runtime.js";
import { ObservationActions } from "./observation-actions.js";
import { type WidgetState, toWidgetState } from "./widget-state.js";

export function WidgetStateView({ state }: { state: WidgetState }) {
  if (state.kind === "empty") {
    return <p>見立てを始める準備ができました。</p>;
  }

  if (state.kind === "loading") {
    return <output>見立てを準備しています。</output>;
  }

  if (state.kind === "error") {
    return (
      <section
        aria-label="system error"
        role="alert"
        style={{ color: "rgb(185, 28, 28)" }}
      >
        <span aria-hidden="true">!</span>
        <h2>システムエラー</h2>
        <p>{state.message}</p>
      </section>
    );
  }

  if (state.assessment.status === "urgent") {
    return (
      <section
        aria-label="urgent safety guidance"
        role="alert"
        style={{ color: "rgb(180, 83, 9)" }}
      >
        <span aria-hidden="true">⚠</span>
        <h2>緊急の安全案内</h2>
        <p>{state.assessment.suggestedAction}</p>
      </section>
    );
  }

  return (
    <section aria-label="assessment result">
      <h2>見立て結果</h2>
      <p>{state.assessment.primaryHypothesis.label}</p>
    </section>
  );
}

export function HelloWidget() {
  const [dogId, setDogId] = useState<string>();
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
    <main aria-live="polite">
      <h1>PawLens</h1>
      <WidgetStateView state={state} />
      {state.kind === "success" && state.assessment.status !== "urgent" && dogId ? (
        <ObservationActions
          assessment={state.assessment}
          callTool={getToolCaller(window.openai ?? {})}
          dogId={dogId}
          locale="ja"
        />
      ) : null}
    </main>
  );
}
