import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { HelloWidget } from "./app.js";
import { resolveWidgetLocale } from "./locale.js";
import "./styles.css";

declare global {
  interface Window {
    openai?: {
      capabilities?: { audioEvidence?: boolean };
      callTool?: (name: string, arguments_: unknown) => Promise<unknown>;
      getFileDownloadUrl?: (input: { fileId: string }) => Promise<
        { downloadUrl: string } | string
      >;
      locale?: string;
      selectFiles?: () => Promise<
        Array<{ fileId: string; fileName?: string; mimeType?: string }>
      >;
      uploadFile?: (file: File) => Promise<{ fileId: string } | string>;
    };
  }
}

const app = document.getElementById("app");

if (app) {
  createRoot(app).render(
    <StrictMode>
      <HelloWidget locale={resolveWidgetLocale(window.openai?.locale)} />
    </StrictMode>,
  );
}
