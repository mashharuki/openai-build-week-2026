---
marp: true
theme: default
size: 16:9
paginate: true
footer: "PawLens · OpenAI Build Week 2026"
style: |
  :root { --ink: #f8f2e9; --panel: #1c2b42; --accent: #e8865b; --muted: #b8c5d7; }
  section { background: linear-gradient(135deg, #101b2e 0%, #152238 58%, #392722 100%); color: var(--ink); font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif; font-size: 26px; line-height: 1.35; padding: 64px 76px; }
  h1 { color: var(--ink); font-size: 54px; letter-spacing: -1px; margin-bottom: 0.3em; }
  h2 { color: var(--ink); font-size: 40px; letter-spacing: -0.5px; }
  h3, strong { color: var(--accent); }
  p, li { color: var(--ink); }
  small, .muted { color: var(--muted); }
  blockquote { border-left: 7px solid var(--accent); color: var(--ink); font-size: 34px; margin: 0.8em 0; padding: 0.15em 0.7em; }
  footer { color: var(--muted); }
  section.cover { background-image: linear-gradient(90deg, rgba(10, 18, 32, 0.92), rgba(24, 30, 41, 0.64)), url("../docs/img/pawlens-background.png"); background-position: center; background-size: cover; }
  section.cover h1 { font-size: 68px; margin-top: 145px; }
  .eyebrow { color: var(--accent); font-size: 18px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; }
  .card { background: rgba(28, 43, 66, 0.9); border: 1px solid #52627a; border-radius: 18px; padding: 22px 26px; }
  .card h3 { margin: 0 0 8px; }
  .flow { display: flex; align-items: stretch; gap: 12px; margin-top: 32px; }
  .flow > div { flex: 1; background: rgba(28, 43, 66, 0.9); border: 1px solid #52627a; border-radius: 16px; padding: 22px 16px; text-align: center; }
  .arrow { align-self: center; color: var(--accent); font-size: 34px; flex: 0 0 auto !important; background: transparent !important; border: 0 !important; padding: 0 !important; }
---

<p class="eyebrow">The story behind PawLens</p>

# Why PawLens

> Because “something feels different” should lead to better observation—not a premature label.

<small>For the small, everyday moments when a guardian wants to respond with care.</small>

---

## The gap we wanted to close

<div class="two-col">
<div class="card"><h3>What a guardian has</h3>

- A bark, a step back, or a stiff posture
- A remembered routine and a feeling that something changed
- Uncertainty about what to do next
</div>

<div class="card"><h3>What a guardian needs</h3>

- A clear distinction between observation and assumption
- Specific cues they can check themselves
- One calm, low-stimulation next action
</div>
</div>

<p class="muted">The gap is not a lack of labels. It is a lack of safe, actionable context.</p>

---

## Our point of view

<div class="two-col">
<div class="card"><h3>Not dog translation</h3>We do not write a dog's inner monologue or present an emotion as a fact.</div>
<div class="card"><h3>Not diagnosis</h3>We do not replace veterinary or behavior professionals.</div>
<div class="card"><h3>Observation support</h3>We make uncertainty visible, organize the available facts, and name the next cue to watch.</div>
<div class="card"><h3>Owner control</h3>Model possibilities stay provisional; only owner-confirmed observations may become history.</div>
</div>

---

## From uncertainty to a calm next step

<div class="flow">
<div><strong>Describe</strong><br><small>What happened, where, and at what distance</small></div>
<div class="arrow">→</div>
<div><strong>Understand</strong><br><small>Possible interpretation, confidence, and limits</small></div>
<div class="arrow">→</div>
<div><strong>Observe</strong><br><small>Specific posture and recovery cues</small></div>
<div class="arrow">→</div>
<div><strong>Care</strong><br><small>One calm action, with escalation when needed</small></div>
</div>

<blockquote>PawLens turns uncertainty into better observation over time.</blockquote>

<p class="muted">Now, let’s see that experience inside ChatGPT.</p>
