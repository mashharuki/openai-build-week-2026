# PawLens MCP サーバー

[English README](./README.md)

![PawLens](./docs/img/pawlens-background.png)

PawLens は、犬の反応についての飼い主の記述、状況、任意の画像・音声を、落ち着いて確認できる次の観察と行動に整理する ChatGPT App です。診断や「犬語の翻訳」は行わず、仮説・根拠の限界・飼い主が確かめるサインを分けて示します。

録画用の英語・日本語プロンプトと進行台本は、[デモ運用ガイド](./docs/operation.md) を参照してください。

## Elevator pitch

> 愛犬の「いつもと違う」を、落ち着いて観察できる次の一手へ変える。

## Built with Codex and GPT-5.6

PawLens は Responses API 経由で `gpt-5.6-sol` を使い、事実ベースの記述・状況・同一会話内で確認済みの観察を、構造化された観察ガイドに変換します。モデルは可能性、限界、観察点、低刺激の次の一手を提案します。

アプリ側では strict JSON Schema、最大1回の修復、媒体参照の検証、研究コンテキストの境界、生成後の安全ガードレール、緊急時のエスカレーション、保存前の飼い主確認を強制します。モデルの推測を「飼い主が確認した観察」として保存することはありません。

Codex は Cloudflare Worker MCP サーバー、React ウィジェット、MCP Apps bridge、Responses API gateway、KV 保存、ガードレール、テストを加速しました。Durable Object の休止で MCP transport 状態が失われる本番不具合も、セッションスコープを維持して再開リクエストを処理する設計へ修正しました。

- **Codex Session ID:** `019f8484-36e2-7b50-9ab2-901e6138d67a`
- **ライセンス:** [MIT License](./LICENSE)
- **制約:** PawLens は獣医学的・行動学的な診断や緊急判断の代替ではありません。音声はホストが安全な一時参照を提供できる場合だけ利用します。

## 事前条件

- Node.js 22 以降
- pnpm 10 以降
- デプロイには Cloudflare アカウント
- ChatGPT へ接続するには Developer Mode へのアクセス

```sh
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm test
```

## ローカル実行と検証

```sh
pnpm --filter @pawlens/mcpserver dev
curl http://127.0.0.1:8787/health
```

ローカルの MCP URL は `http://127.0.0.1:8787/mcp` です。MCP Inspector では Streamable HTTP を選び、この URL を指定してください。`show_pawlens_hello`、`analyze_dog_signal`、`save_observation`、`get_dog_history`、`manage_dog_profile` が列挙されることを確認します。

```sh
npx @modelcontextprotocol/inspector --cli http://127.0.0.1:8787/mcp --transport http --method tools/list
```

## Cloudflare Workers へのデプロイ

`pkgs/mcpserver/wrangler.toml` の KV namespace を自分の Cloudflare アカウント用に設定し、API キーは必ず Worker Secret として登録します。

```sh
pnpm --filter @pawlens/mcpserver exec wrangler secret put OPENAI_API_KEY
pnpm run build
pnpm --filter @pawlens/mcpserver exec wrangler deploy
```

公開 URL:

```text
https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/mcp
```

デプロイ後に確認します。

```sh
curl https://pawlens-mcpserver.avp-104-106-107-a78.workers.dev/health
```

ログ監視には `pnpm --filter @pawlens/mcpserver exec wrangler tail pawlens-mcpserver` を使います。プロンプト、添付 URL、API キーをログへ出力しないでください。

## ChatGPT Developer Mode

1. ChatGPT の **Settings → Security and login** で **Developer mode** を有効化します。
2. **Settings → Plugins**（または Plugins ページ）で開発者モード用アプリを追加します。
3. 上記の公開 MCP URL を登録します。
4. 新しい英語会話で次のプロンプトを送ります。

```text
Open PawLens. My dog barked twice after the doorbell, stepped back about one meter, and looked stiff. Without diagnosing, organize what I can observe next and one calm action for tonight.
```

期待結果は、可能性、確信度、根拠の限界、観察点、低刺激の行動を含む PawLens カードです。Developer Mode 上で実際にウィジェットが表示されることは、提出動画を撮る前に必ず確認してください。

## 公開 Worker の検証記録

2026-07-21（JST）、Worker version `995bc305-3dde-4881-ac4c-e8b9c584ffaa` で以下を確認しました。

| 確認項目 | 結果 |
| --- | --- |
| `GET /health` | HTTP 200、`status: "ok"` |
| MCP `initialize` | protocol `2025-03-26` のネゴシエーションに成功 |
| MCP `tools/list` | 5つの PawLens ツールを取得 |
| Session recovery | Durable Object 休止後のツール呼び出しを回帰テストで確認 |
| 実モデル eval | 通常・情報不足・緊急の3ケースで期待する安全な結果を確認 |
| ChatGPT Developer Mode のウィジェット表示 | **Action required**（実アカウントでの接続・表示記録が未完了） |

実モデル eval は臨床検証やベンチマークではありません。通常ケースでは `success`、情報不足では `partial` / low confidence、持続する強い震えでは `urgent` と安全な獣医師相談導線を返しました。生成結果は実行ごとに変わり得ます。

## 使用技術

ChatGPT Apps、Model Context Protocol、OpenAI Responses API、GPT-5.6、Codex、Cloudflare Workers、Durable Objects、Cloudflare KV、React、TypeScript、Hono、Vite、Vitest、JSON Schema、Zod。

## トラブルシューティング

- `/health` は通るが MCP Inspector が接続できない: URL の末尾が `/mcp` か、Transport が Streamable HTTP か確認します。
- ウィジェットが表示されない: `pnpm run build` を先に実行し、`show_pawlens_hello` と `ui://pawlens/hello-widget-v8.html` を Inspector で確認します。
- ChatGPT が接続できない: localhost ではなく公開 HTTPS URL を登録します。
- 音声が無効: 安全側の既定動作です。飼い主の記述・状況・任意の画像でフローを継続してください。

## 参考

- [OpenAI Apps SDK: Build your MCP server](https://developers.openai.com/apps-sdk/build/mcp-server)
- [OpenAI Apps SDK reference](https://developers.openai.com/apps-sdk/reference)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
