import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { Locale } from "@pawlens/shared";

import { HelloWidget } from "./app.js";
import "./styles.css";

declare global {
  interface Window {
    openai?: {
      capabilities?: { audioEvidence?: boolean };
      callTool?: (name: string, arguments_: unknown) => Promise<unknown>;
      getFileDownloadUrl?: (
        input: { fileId: string },
      ) => Promise<{ downloadUrl: string } | string>;
      locale?: Locale;
      uploadFile?: (file: File) => Promise<{ fileId: string } | string>;
    };
  }
}

const app = document.getElementById("app");

if (app) {
  createRoot(app).render(
    <StrictMode>
      <HelloWidget locale={window.openai?.locale ?? "ja"} />
    </StrictMode>,
  );
}
