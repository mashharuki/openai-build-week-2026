import { defineConfig } from "vite";

// Keep the application bundle as a normal static asset. ChatGPT loads widget
// HTML in a sandboxed iframe, so resource metadata can explicitly allow this
// Worker origin to load the JS and CSS rather than relying on inline scripts.
export default defineConfig({});
