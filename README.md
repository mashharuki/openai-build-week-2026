# PawLens MCP server

PawLens は、犬の反応を飼い主の記述・状況・任意の画像から整理する ChatGPT App 用の MCP サーバーです。Cloudflare Workers が Streamable HTTP の `/mcp` を公開し、React ウィジェットを MCP Apps リソースとして配信します。

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

`ui://pawlens/hello-widget-v3.html` の返却リソースには `_meta.ui.csp` を設定しています。`connectDomains` は空の許可リストです。React の JavaScript とCSSはWorkerの `/assets/` から読むため、`resourceDomains` にはWorker自身の正確なHTTPSオリジンだけを登録しています。`pkgs/widget/public/_headers` は `/assets/*` にCORSヘッダーを付け、ChatGPTの別オリジンのサンドボックスからモジュールを安全に読めるようにします。外部通信やCDNを追加する場合だけ、その正確なHTTPSオリジンを対応するリストへ追加してください。`frameDomains` は不要なため設定しません。

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
3. **Resources** で `ui://pawlens/hello-widget-v3.html` を確認する。
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

## 切り分け

- **`/health` は通るが Inspector が接続できない**: URL が `/mcp` で終わっているか、Inspector の Transport が Streamable HTTP かを確認します。
- **ウィジェットが出ない**: `pnpm run build` を先に実行し、`show_pawlens_hello` の呼び出しと `ui://pawlens/hello-widget-v3.html` のリソースを Inspector で確認します。
- **ChatGPT が接続できない**: localhost ではなく Cloudflare の HTTPS URL を登録し、Worker の `/health` が公開ネットワークから 200 を返すことを確認します。
- **音声が無効**: これは安全側の既定動作です。ファイル API と音声処理能力の両方が確認できるまで、記述・状況・任意の画像で続行してください。

## 参考

- [OpenAI Apps SDK: Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server)
- [OpenAI Apps SDK reference](https://developers.openai.com/apps-sdk/reference)
- [Cloudflare: Wrangler KV commands](https://developers.cloudflare.com/workers/wrangler/commands/kv/)
- [Cloudflare: Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
