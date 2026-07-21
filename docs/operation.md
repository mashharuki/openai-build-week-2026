# PawLens demo operation guide / デモ運用ガイド

This guide is the reproducible demonstration script for PawLens. It has an English and Japanese version so a judge can follow the same product flow in either language.

> Safety: PawLens is an observation aid, not a veterinary or behavioral diagnosis service. Use the fictional dog **Mugi** in the prompts below. Do not present a prerecorded result as a live tool call, and do not save an AI hypothesis as an owner-confirmed observation.

## Demo at a glance

| Item | Value |
| --- | --- |
| Target length | 3 minutes or less |
| Public MCP URL | `https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/mcp` |
| Core proof | Open widget → create profile → analyze a factual signal → explain uncertainty and a calm action → save only user-confirmed cues |
| Required setup | ChatGPT Developer Mode, PawLens connector, fresh conversation, stable network |
| Optional evidence | One photo owned or permitted by the presenter; the text-only flow must work without it |

## Preflight checklist

Complete these checks before recording. Do not mark the integration as working until the widget is visible in the actual ChatGPT account used for the demo.

1. Open the public health endpoint and confirm it returns HTTP 200.
2. Add the public `/mcp` URL as a ChatGPT Developer Mode connector.
3. Start a **new conversation**. Profile and confirmed-observation history is scoped to the active MCP conversation.
4. Ask ChatGPT to open PawLens and confirm the PawLens widget renders.
5. Use only a photo you own or have permission to use. Skip the photo if attachment support is unavailable.
6. Capture the real end-to-end flow first; add narration only afterward.

---

# English demonstration script

## Recording beats

| Time | What to show | What it proves |
| --- | --- | --- |
| 0:00–0:20 | The dog-owner problem and PawLens promise | The product turns uncertainty into observation, not diagnosis. |
| 0:20–0:40 | Open PawLens and create Mugi's profile | A ChatGPT-native, personalized entry point. |
| 0:40–1:45 | Describe Mugi's doorbell reaction | GPT-5.6 produces a structured, safety-aware assessment from factual context. |
| 1:45–2:15 | Confirm what the owner actually saw and save it | AI hypotheses and owner-confirmed facts remain separate. |
| 2:15–2:40 | Ask what to watch over the next 10 minutes | The conversation supports a practical next decision. |
| 2:40–3:00 | Explain GPT-5.6, Codex, and the safety guardrail | Non-trivial implementation and responsible scope. |

## Spoken opening

> When a dog reacts at the door, owners often jump from “something feels different” to a label. PawLens takes a different approach: it turns a factual description into safe observations and one calm next step, without pretending to diagnose the dog.

## Step 1 — open PawLens and create a profile

Send this in a new ChatGPT conversation:

```text
Open PawLens. I want observation support, not a diagnosis.

Please create a profile for Mugi, a 4-year-old Shiba Inu. Mugi is cautious around unfamiliar visitors and becomes alert when the doorbell rings.
```

Show:

- The PawLens widget opening.
- Mugi's name and temperament note, if ChatGPT calls the profile tool.

Say:

> PawLens keeps the product boundary visible from the start: this is help with observation, not a claim to translate a dog's inner state.

## Step 2 — analyze a real, factual scenario

Optionally attach a permitted photo of a dog facing a doorway. The demo remains valid without an attachment. Then send:

```text
The doorbell rang just now. Mugi faced the front door, barked twice in a low voice, then stepped back about one meter. His ears stayed pointed toward the door and his body looked a little stiff.

Use PawLens to organize what this could mean. Do not label Mugi as aggressive or diagnose a condition. Tell me what I can safely observe next and give me one low-stimulation action I can take tonight.
```

Show the actual returned PawLens card. Point to:

1. A provisional possibility, rather than a definitive label.
2. Confidence and the limits of the available evidence.
3. Specific observable cues, such as distance, posture, ears, tail, gaze, or recovery behavior.
4. One low-stimulation action, such as creating distance and reducing stimulation.

Do **not** narrate an expected output as if it were live. Read only the card returned in that recording.

## Step 3 — confirm facts before saving an observation

Send:

```text
I checked again: Mugi kept looking toward the door, his body still seemed stiff, and he chose to stand farther away when I opened the door to a quiet room.

These are observations I personally confirmed. Please save only these confirmed cues and the calm action of giving him distance and a quiet room. Do not save any model hypothesis as a fact.
```

Show that the saved item is framed as an owner-confirmed observation. If the current ChatGPT widget does not expose the confirmation/save control, do not claim this step was saved; keep the demo at the assessment and follow-up stages and record the limitation.

## Step 4 — show the next decision

Send:

```text
What should I watch for over the next 10 minutes to tell whether Mugi is settling? Please keep the answer practical and do not turn these observations into a medical or behavioral diagnosis.
```

Show the practical observations and calm next action. Avoid presenting the result as medical advice.

## Closing narration

> GPT-5.6 is the core reasoning layer: it converts the factual situation, optional evidence, and confirmed context into a strict structured assessment. Codex accelerated the MCP server, React widget, tests, and the session-recovery fix. The safety guardrail is intentional: PawLens separates model possibilities from owner-confirmed observations and escalates concerning signals instead of diagnosing them.

> You can test PawLens with the public MCP endpoint in the README. It is built to help an owner make the next observation calmer and more concrete.

---

# 日本語デモ台本

## 録画の流れ

| 時間 | 見せること | 伝わる価値 |
| --- | --- | --- |
| 0:00–0:20 | 飼い主が感じる迷いと PawLens の約束 | 診断ではなく、不確実さを観察に変える。 |
| 0:20–0:40 | PawLens を開き、Mugi のプロフィールを作成 | ChatGPT 内で自然に始まる個別化された体験。 |
| 0:40–1:45 | チャイムへの反応を事実として入力 | GPT-5.6 が安全な構造化見立てを返す。 |
| 1:45–2:15 | 飼い主が実際に見たことだけを確認・保存 | AI の仮説と飼い主の事実を混同しない。 |
| 2:15–2:40 | 次の10分で見るポイントを聞く | 次の安全な意思決定へつながる。 |
| 2:40–3:00 | GPT-5.6、Codex、安全設計を説明 | 技術と信頼性の裏付け。 |

## 冒頭ナレーション

> 犬が玄関で反応したとき、飼い主は「いつもと違う」と感じても、それをすぐに性格や病気のラベルにしてしまいがちです。PawLens は、事実の記述を安全に観察できるポイントと、落ち着いた次の一手へ変えます。診断はしません。

## ステップ1 — PawLens を開き、プロフィールを作成する

新しい ChatGPT 会話で次を送ります。

```text
PawLens を開いてください。診断ではなく、観察のサポートがほしいです。

4歳の柴犬、Mugi のプロフィールを作ってください。Mugi は知らない来客には慎重で、チャイムが鳴ると注意深くなります。
```

表示すること:

- PawLens ウィジェットが開くこと。
- ChatGPT がプロフィール作成ツールを呼んだ場合は、Mugi の名前と性格メモ。

ナレーション:

> PawLens は最初から、「犬の内面を言い当てる」サービスではなく、飼い主の観察を支えるサービスだと明確にします。

## ステップ2 — 事実ベースの反応を見立てる

必要なら、玄関方向を見ている犬の利用許可済み写真を添付します。写真がなくてもデモは成立します。続けて次を送ります。

```text
さっきチャイムが鳴りました。Mugi は玄関の方を向き、低い声で2回吠えたあと、約1メートル後ろに下がりました。耳は玄関の方を向いたままで、体が少し硬そうに見えました。

PawLens で、この反応が何を意味する可能性があるか整理してください。Mugi を攻撃的と決めつけたり、病気や行動上の診断をしたりしないでください。次に安全に観察できることと、今夜できる低刺激な対応を1つ教えてください。
```

実際に返った PawLens カードだけを表示し、次の4点を指します。

1. 断定ではない「可能性」。
2. 確信度と、情報だけでは分からない限界。
3. 距離、姿勢、耳、尾、視線、落ち着くまでの行動など、飼い主が確認できるサイン。
4. 距離を取る、刺激を下げるといった低刺激の次の一手。

期待した文章を「ライブ結果」として読まないでください。録画中に実際に返った内容だけを説明します。

## ステップ3 — 飼い主が確認した事実だけを保存する

次を送ります。

```text
もう一度確認したところ、Mugi は玄関の方を見続け、体はまだ少し硬そうで、静かな部屋のドアを開けると自分から少し離れた場所を選びました。

これは私が実際に確認した観察です。この確認済みのサインと、「距離を取り、静かな部屋を用意した」という行動だけを保存してください。モデルの仮説は事実として保存しないでください。
```

保存結果が飼い主確認済みの観察として表示されることを見せます。現在の ChatGPT ウィジェットで確認・保存操作を表示できない場合は、保存できたとは主張せず、見立てと追質問までをデモにし、その制約を記録してください。

## ステップ4 — 次の10分の観察へつなげる

次を送ります。

```text
Mugi が落ち着いてきているかを判断するために、次の10分で何を観察すればよいですか？ 実用的に答え、医学的・行動学的な診断にはしないでください。
```

返った実用的な観察点と、落ち着いた次の一手を表示します。獣医学的な助言として断定的に扱わないでください。

## 締めのナレーション

> GPT-5.6 は、事実として説明された状況、任意の証拠、確認済みの文脈を、厳格な構造化見立てに変える中核です。Codex は MCP サーバー、React ウィジェット、テスト、そしてセッション復旧の修正を加速しました。安全設計として、PawLens はモデルの可能性と飼い主が確認した観察を分け、気になるサインでは診断せず専門家への相談を促します。

> README にある公開 MCP エンドポイントから試せます。PawLens が目指すのは、飼い主が次に確認することを、より落ち着いて具体的に選べるようにすることです。

## Recording evidence / 録画時に残す証拠

- The public MCP connector URL and the date of the recording.
- The actual ChatGPT account surface where the widget rendered.
- The exact prompts sent and the actual returned card.
- Whether the profile and confirmed-observation save flows were visibly completed.
- Any skipped optional attachment and the reason it was skipped.

