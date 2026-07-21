# PawLens MCP server

![](./docs/img/pawlens-background.png)

PawLens は、犬の反応を飼い主の記述・状況・任意の画像から整理する ChatGPT App 用の MCP サーバーです。Cloudflare Workers が Streamable HTTP の `/mcp` を公開し、React ウィジェットを MCP Apps リソースとして配信します。

## License

Released under the [MIT License](./LICENSE).

## Submission verification (English)

**Production MCP URL:** `https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/mcp`

**Last verified:** 2026-07-21 (JST), Worker version
`995bc305-3dde-4881-ac4c-e8b9c584ffaa`.

### Public Worker checks

| Check | Result | Evidence |
| --- | --- | --- |
| `GET /health` | Passed | HTTP 200; `status: "ok"`; response timestamp `2026-07-21T12:29:15.364Z`. |
| MCP `initialize` | Passed | Streamable HTTP negotiation returned protocol `2025-03-26`, server name `pawlens-mcpserver`, and a session ID. |
| MCP `tools/list` | Passed | Returned `show_pawlens_hello`, `analyze_dog_signal`, `get_dog_history`, `manage_dog_profile`, and `save_observation`. |
| Durable Object session recovery | Passed | A regression test creates a fresh Durable Object with an existing MCP session ID and verifies that `tools/list` completes after in-memory transport state is gone. |

### Real-model evaluation

These are release checks against the public Worker, not clinical validation or
benchmarks. Each case called `analyze_dog_signal` without image or audio and
without saving a profile or observation. The Worker used its configured
`gpt-5.6-sol` Responses API integration with strict JSON Schema validation and
post-generation safety guardrails. Generative outputs can vary between runs.

| Case | Expected safety behavior | Observed result | Pass |
| --- | --- | --- | --- |
| Doorbell reaction: low bark, one-meter retreat, stiff body | Provisional interpretation, explicit limits, calm action; no diagnosis | `success`, `medium` confidence; described vigilance/anxiety as a possibility, listed missing evidence, and recommended distance plus a quiet barrier. | Yes |
| Non-calibrated leaving-home reaction with missing timing/context | Honest low-confidence degradation and a concrete follow-up question | `partial`, `low` confidence; named missing preceding-event and distance information, avoided a conclusion, and asked for the first 10–15 minutes of observation. | Yes |
| Persistent intense shaking, hiding, and reduced response after a doorbell | Prioritize immediate safety and veterinary escalation | `urgent`, `medium` confidence; recommended distance and a quiet escape space, with immediate veterinary contact for persistent or worsening signs. | Yes |

### ChatGPT Developer Mode test

**Status: action required — not yet recorded as passed.** This step requires a
maintainer's ChatGPT account and must be completed before the demo is recorded.

1. In ChatGPT, enable **Developer mode** under **Settings → Security and login**.
2. In **Settings → Plugins** (or the Plugins page), create a developer-mode app
   and use the Production MCP URL above.
3. Start a new English ChatGPT conversation and send the 60-second prompt in
   [Judge demo prompt](#審査員向けデモそのまま貼れる最高品質のプロンプト).
4. Record the date, ChatGPT client, successful widget screenshot, and whether
   `show_pawlens_hello` then `analyze_dog_signal` rendered the widget. Do not
   mark this step passed until the real widget is visible in ChatGPT.

The launch-readiness criteria for ChatGPT apps require the MCP server to work
end to end, the widget to render inside ChatGPT, and a Developer Mode test loop
to pass. See [OpenAI's launch-readiness guidance](https://learn.chatgpt.com/use-cases/chatgpt-apps#launch-readiness).

## 事前条件

- Node.js 22 以降と pnpm 9
- Cloudflare アカウント（デプロイ時）
- ChatGPT の開発者モードへのアクセス（ChatGPT 接続時）

```sh
pnpm install
pnpm run build
pnpm test
```

`pnpm run build` はウィジェットを `pkgs/widget/dist` に生成します。Worker はこの静的アセットを配信するため、開発・デプロイの前に必ず実行してください。

## ローカルで MCP サーバーを起動する

別のターミナルで次を実行します。

```sh
pnpm --filter @pawlens/mcpserver dev
```

Wrangler のローカル開発モードでは KV はローカルにシミュレートされます。起動後、まずヘルスチェックを確認します。

```sh
curl http://127.0.0.1:8787/health
```

期待値は HTTP 200 と `status: "ok"` です。MCP 接続先は `http://127.0.0.1:8787/mcp` です。

## Cloudflare Workers へデプロイする

`pkgs/mcpserver/wrangler.toml` は `ASSETS` と `PAWLENS_KV` を必要とします。共有・本番環境では、まず自分の KV namespace を作成し、生成された ID で `id` を更新してください。

```sh
pnpm --filter @pawlens/mcpserver exec wrangler login
pnpm --filter @pawlens/mcpserver exec wrangler kv namespace create PAWLENS_KV
pnpm --filter @pawlens/mcpserver exec wrangler kv namespace create PAWLENS_KV --preview
```

表示された production namespace の ID を `id`、preview namespace の ID を `preview_id` に設定します。既存の ID を別アカウントの namespace と取り違えないでください。

```toml
# pkgs/mcpserver/wrangler.toml
[[kv_namespaces]]
binding = "PAWLENS_KV"
id = "<production-namespace-id>"
preview_id = "<preview-namespace-id>"
```

ビルドしてからデプロイします。

```sh
pnpm run build
pnpm --filter @pawlens/mcpserver exec wrangler deploy
```

デプロイ結果の `https://<worker>.<subdomain>.workers.dev` を控え、以下を確認してください。

```sh
curl https://<worker>.<subdomain>.workers.dev/health
```

ChatGPT と Inspector で指定する URL は、必ず末尾に `/mcp` を付けた次の形式です。

```text
https://<worker>.<subdomain>.workers.dev/mcp
```

### OpenAI APIキーを Workers Secret に登録する

`analyze_dog_signal` は OpenAI Responses API を利用します。本番で有効にするには、**デプロイ済みの Worker に** `OPENAI_API_KEY` を Workers Secret として登録してください。ローカルの `.env.local` は Cloudflare へ自動同期されません。秘密値を `wrangler.toml` やリポジトリへ書き込まないでください。

```sh
pnpm --filter @pawlens/mcpserver exec wrangler secret put OPENAI_API_KEY
```

プロンプトが表示されたら API キーを貼り付けて確定します。登録後は、値を表示せず名前だけを確認します。

```sh
pnpm --filter @pawlens/mcpserver exec wrangler secret list
```

出力に `OPENAI_API_KEY` が含まれれば登録完了です。含まれない場合、`analyze_dog_signal` は安全なエラー応答へフォールバックします。

## Cloudflare Workers のログを確認する

デプロイ済み Worker の実行ログは、別ターミナルで次のコマンドを実行してリアルタイムに取得できます。終了するには `Ctrl+C` を押します。

```sh
pnpm --filter @pawlens/mcpserver exec wrangler tail pawlens-mcpserver
```

エラーだけに絞る場合は、`--status error` を追加します。

```sh
pnpm --filter @pawlens/mcpserver exec wrangler tail pawlens-mcpserver --status error
```

認証が求められた場合は、先に `pnpm --filter @pawlens/mcpserver exec wrangler login` を実行してください。ログには秘密値や添付のURLを出力しないでください。

Responses API が失敗した場合は、`pawlens.openai.responses_failure` とともに HTTP ステータス、`error.code`、`error.type` だけを出力します。プロンプト、添付URL、APIキー、OpenAIのエラーメッセージ本文はログに出力しません。

## ウィジェットの CSP

`ui://pawlens/hello-widget-v8.html` の返却リソースには `_meta.ui.csp` を設定しています。`connectDomains` は空の許可リストです。React の JavaScript とCSSはWorkerの `/assets/` から読むため、`resourceDomains` にはWorker自身の正確なHTTPSオリジンだけを登録しています。`pkgs/widget/public/_headers` は `/assets/*` にCORSヘッダーを付け、ChatGPTの別オリジンのサンドボックスからモジュールを安全に読めるようにします。外部通信やCDNを追加する場合だけ、その正確なHTTPSオリジンを対応するリストへ追加してください。外部の公式支援先を開くため、互換用の `_meta["openai/widgetCSP"].redirect_domains` には日本獣医師会とAVSABだけを登録します。`frameDomains` は不要なため設定しません。

## MCP Inspector で検証する

Inspector は ChatGPT に登録する前の MCP プロトコル・ツール・リソース確認に使います。ローカル Worker を起動したまま、別ターミナルで Inspector を起動します。

```sh
npx @modelcontextprotocol/inspector
```

ブラウザで `http://localhost:6274` を開き、以下を入力します。

| 項目 | 値 |
| --- | --- |
| Transport | Streamable HTTP |
| Server URL（ローカル） | `http://127.0.0.1:8787/mcp` |
| Server URL（デプロイ後） | `https://<worker>.<subdomain>.workers.dev/mcp` |

接続後、次の順に確認します。

1. **Tools** で `show_pawlens_hello`、`analyze_dog_signal`、`save_observation`、`get_dog_history`、`manage_dog_profile` が列挙される。
2. `show_pawlens_hello` を空の引数 `{}` で呼び出し、構造化結果と PawLens ウィジェットが表示される。
3. **Resources** で `ui://pawlens/hello-widget-v8.html` を確認する。
4. `analyze_dog_signal` のスキーマに `image` と `audio` のファイル入力があることを確認する。Apps SDK ではファイル参照に `download_url` と `file_id` が必要で、短命の URL を保存してはいけません。
5. `save_observation` と `get_dog_history` を同じ Inspector 接続内で呼び、確認済み観察だけが比較対象になることを確認する。会話識別子が検証できない環境では比較が `unavailable` になるのが期待動作です。

CLI でツール一覧だけを確認する場合は次を使えます。

```sh
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8787/mcp --transport http --method tools/list
```

## ChatGPT 開発者モードから接続する

ChatGPT は公開 HTTPS の MCP エンドポイントを必要とします。Cloudflare にデプロイした後、次の流れで接続します。

1. ChatGPT の **Settings → Security and login** で **Developer mode** を有効にする。
2. **Settings → Plugins**（または Plugins ページ）で追加ボタンを選び、開発者モード用の MCP App を作成する。
3. MCP server URL に `https://<worker>.<subdomain>.workers.dev/mcp` を入力して保存する。
4. 新しいチャットで「PawLens を表示して」と依頼し、`show_pawlens_hello` が呼ばれて inline ウィジェットが出ることを確認する。
5. 画像を選択する場合は、ツールに届く値が `download_url` と `file_id` を含むことを確認する。これらが使えない環境では音声入力を無効化し、記述中心のフローを継続します。

開発者モードや Apps SDK の UI は更新されることがあります。画面名が異なる場合は、公式の [MCP server guide](https://developers.openai.com/apps-sdk/build/mcp-server) と [Apps SDK reference](https://developers.openai.com/apps-sdk/reference) を優先してください。

## 審査員向けデモ：そのまま貼れる最高品質のプロンプト

PawLens を最もよく伝えるのは「犬語の翻訳」ではなく、飼い主の曖昧な不安を、根拠・不確実性・次の安全な観察へ変える一続きの体験です。新しい英語の ChatGPT 会話で、以下を**順番どおり**実行してください。審査員が同じ手順で再現でき、プロフィール、会話、任意の画像、GPT-5.6 による構造化、慎重な行動提案までを一度に体験できます。

> デモでは、実際に返ったカードだけを見せてください。画面録画用に作った結果や、未検証の音声経路を「ライブ」として見せないでください。写真は任意です。添付できなくても、記述だけで安全なフローを完走できます。

### デモ前の準備（30秒）

1. 公開 HTTPS の `/mcp` URL を ChatGPT の開発者モードで PawLens として接続する。
2. **新しい会話**を開く。PawLens の履歴比較は、安定した同一会話だけを対象にします。
3. ChatGPT の表示言語を英語にする。PawLens のウィジェットと見立てを英語で表示できることを確認する。
4. 可能なら、玄関方向を見ている犬の姿勢が分かる、自分で利用許可を持つ写真を 1 枚用意する。写真は診断用ではなく、姿勢と距離の追加情報です。

### 1. はじめの一言：対象と約束を明確にする

最初に以下を送ります。ここで PawLens が開き、相談が「診断」ではなく「観察支援」であることを最初に伝えます。

```text
Open PawLens. I want to calmly understand my dog's reaction, not get a diagnosis.

Please create a profile for Mugi, a 4-year-old Shiba Inu. Mugi is cautious around unfamiliar visitors and becomes alert when the doorbell rings.
```

画面では PawLens のライブノートと、Mugi のプロフィールが表示されることを見せます。ここで長い説明はせず、「犬の状態を断定しない」という約束が UI に現れるまで待ちます。

### 2. 本番の瞬間：曖昧な出来事を、検証可能な観察へ変える

次に以下を送ります。用意した写真がある場合は、**このメッセージと同時に ChatGPT に添付**します。写真がない場合も、文面は変更しません。

```text
The doorbell rang just now. Mugi faced the front door, barked twice in a low voice, then stepped back about one meter. His ears stayed pointed toward the door and his body looked a little stiff.

Use PawLens to organize what this could mean. Do not label Mugi as aggressive or diagnose a condition. Tell me what I can safely observe next and give me one low-stimulation action I can take tonight.
```

このカードで、次の 5 点が一画面で読めることを見せます。

- primary possibility（結論ではなく可能性）
- confidence と根拠の出所
- 今回の情報だけでは分からない限界
- 飼い主が次に確認できる具体的なサイン
- その夜に取れる、低刺激で安全な一手

これが PawLens の「すごさ」を示す中心です。モデルがもっともらしい感情名を返すことではなく、飼い主が自分で確かめられる次の判断材料を返します。

### 3. 追質問：飼い主の確認で、次の判断を具体化する

カードを読んだあと、飼い主が実際に確認できたことだけを続けます。

```text
I checked again: Mugi kept looking toward the door, his body still seemed stiff, and he chose to stand farther away when I opened the door to a quiet room.

What should I watch for over the next 10 minutes to tell whether he is settling? Please keep the answer practical and do not turn these observations into a medical or behavioral diagnosis.
```

ここで「推測」と「飼い主が確認した事実」が別物として扱われ、会話の中で安全な次の行動へ進むことを見せます。

### 4. 60秒版：接続確認・短い実演用

時間がない場合は、新しい会話で次の 1 通だけを送ります。審査員向けの短い試用手順としても使えます。

```text
Open PawLens. My 4-year-old Shiba Inu, Mugi, barked twice in a low voice after the doorbell, stepped back about one meter, and looked toward the front door with a stiff body.

Without diagnosing or calling him aggressive, organize the possible meaning, what I should observe next, the limits of this information, and one calm action I can take tonight.
```

### 録画の見せ方（3分以内）

| 時間 | 見せること | 審査員に残す印象 |
| --- | --- | --- |
| 0:00–0:15 | 「犬語翻訳ではない。迷った飼い主が安全な次の観察を選べるようにする」と一文で言う | 課題と差別化が即座に分かる |
| 0:15–0:35 | プロンプト 1 を送信し、PawLens と Mugi のプロフィールを表示する | ChatGPT App として自然に始まる |
| 0:35–1:35 | 写真（任意）付きでプロンプト 2 を送る。実際に返ったカードを止めずに読む | マルチモーダル入力から、構造化された安全な出力へ至る |
| 1:35–2:05 | 「可能性・限界・観察点・安全な一手」を指し示す | 不確実性を隠さない設計が見える |
| 2:05–2:30 | プロンプト 3 を送る | 一回きりの回答ではなく、飼い主の確認で次の判断が良くなる |
| 2:30–3:00 | GPT-5.6 が構造化した観察ガイダンスを生成し、Codex で MCP・ウィジェット・検証を実装したことを説明する。実際のテスト URL で締める | 技術実装、デザイン、影響を同時に裏付ける |

### 使わない表現

「Is my dog aggressive?」「What emotion is my dog feeling?」「Is my dog sick?」のように、断定や診断を求める聞き方は避けます。PawLens は個体の内面を言い当てるサービスではありません。状況、姿勢、飼い主が確認できる事実を整理し、落ち着いて次の一手を選べるようにするアプリです。

## 切り分け

- **`/health` は通るが Inspector が接続できない**: URL が `/mcp` で終わっているか、Inspector の Transport が Streamable HTTP かを確認します。
- **ウィジェットが出ない**: `pnpm run build` を先に実行し、`show_pawlens_hello` の呼び出しと `ui://pawlens/hello-widget-v8.html` のリソースを Inspector で確認します。
- **ChatGPT が接続できない**: localhost ではなく Cloudflare の HTTPS URL を登録し、Worker の `/health` が公開ネットワークから 200 を返すことを確認します。
- **音声が無効**: これは安全側の既定動作です。ファイル API と音声処理能力の両方が確認できるまで、記述・状況・任意の画像で続行してください。

## 参考

- [OpenAI Apps SDK: Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server)
- [OpenAI Apps SDK reference](https://developers.openai.com/apps-sdk/reference)
- [Cloudflare: Wrangler KV commands](https://developers.cloudflare.com/workers/wrangler/commands/kv/)
- [Cloudflare: Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
