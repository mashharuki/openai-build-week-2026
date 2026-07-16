import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { HelloWidget } from "./app.js";

declare global {
  interface Window {
    openai?: { callTool?: (name: string, arguments_: unknown) => Promise<unknown> };
  }
}

const app = document.getElementById("app");

if (app) {
  createRoot(app).render(
    <StrictMode>
      <HelloWidget />
    </StrictMode>,
  );
}
