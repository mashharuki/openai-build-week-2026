---
marp: true
theme: default
size: 16:9
paginate: true
footer: "PawLens · OpenAI Build Week 2026"
style: |
  :root {
    --ink: #f8f2e9;
    --navy: #101b2e;
    --panel: #1c2b42;
    --accent: #e8865b;
    --muted: #b8c5d7;
  }
  section {
    background: linear-gradient(135deg, #101b2e 0%, #152238 58%, #392722 100%);
    color: var(--ink);
    font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
    font-size: 25px;
    line-height: 1.35;
    padding: 64px 76px;
  }
  h1 { color: var(--ink); font-size: 54px; letter-spacing: -1px; margin-bottom: 0.3em; }
  h2 { color: var(--ink); font-size: 40px; letter-spacing: -0.5px; }
  h3, strong { color: var(--accent); }
  p, li { color: var(--ink); }
  small, .muted { color: var(--muted); }
  blockquote {
    border-left: 7px solid var(--accent);
    color: var(--ink);
    font-size: 34px;
    margin: 0.8em 0;
    padding: 0.15em 0.7em;
  }
  table { font-size: 19px; width: 100%; }
  section table th { background: #24334d !important; color: var(--accent) !important; }
  section table td { background: #1c2b42 !important; color: var(--ink) !important; }
  td, th { border-color: #52627a !important; padding: 11px !important; }
  code { background: #24334d; color: #ffe0d0; }
  footer { color: var(--muted); }
  section.cover {
    background-image: linear-gradient(90deg, rgba(10, 18, 32, 0.92), rgba(24, 30, 41, 0.64)), url("../../docs/img/pawlens-background.png");
    background-position: center;
    background-size: cover;
  }
  section.cover h1 { font-size: 72px; margin-top: 130px; }
  section.cover p { font-size: 31px; max-width: 760px; }
  section.section {
    background: linear-gradient(135deg, #191c2b, #34201e);
    justify-content: center;
  }
  section.section h1 { font-size: 62px; }
  .eyebrow { color: var(--accent); font-size: 18px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
  .card { background: rgba(28, 43, 66, 0.9); border: 1px solid #52627a; border-radius: 18px; padding: 22px 26px; }
  .card h3 { margin: 0 0 8px; }
  .flow { display: flex; align-items: stretch; gap: 12px; margin-top: 28px; }
  .flow > div { flex: 1; background: rgba(28, 43, 66, 0.9); border: 1px solid #52627a; border-radius: 16px; padding: 20px 18px; text-align: center; }
  .arrow { align-self: center; color: var(--accent); font-size: 34px; flex: 0 0 auto !important; background: transparent !important; border: 0 !important; padding: 0 !important; }
  .endpoint { background: #24334d; border-radius: 12px; font-size: 18px; padding: 14px 18px; }
---

<!-- Template source of truth: cover and section variants, plus PawLens palette. -->
