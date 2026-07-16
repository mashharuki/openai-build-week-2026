import { useEffect, useState } from "react";

import { getHelloMessage } from "./hello.js";
import {
  getStructuredContentFromBridgeMessage,
  startMcpAppsBridge,
} from "./openai-runtime.js";

export function HelloWidget() {
  const [structuredContent, setStructuredContent] = useState<unknown>();

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent) {
        return;
      }

      const nextContent = getStructuredContentFromBridgeMessage(event.data);
      if (nextContent !== undefined) {
        setStructuredContent(nextContent);
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
      <p>{getHelloMessage(structuredContent as { greeting?: unknown })}</p>
    </main>
  );
}
