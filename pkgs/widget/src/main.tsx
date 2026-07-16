import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { HelloWidget } from "./app.js";

const app = document.getElementById("app");

if (app) {
  createRoot(app).render(
    <StrictMode>
      <HelloWidget />
    </StrictMode>,
  );
}
