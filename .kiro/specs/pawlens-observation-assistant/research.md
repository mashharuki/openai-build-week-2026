# リサーチと設計判断

## サマリー

- **機能**: `pawlens-observation-assistant`
- **調査区分**: 新規機能 / 複雑な外部連携
- **主要な発見**:
  - Apps SDKでは、ツールの入出力スキーマと`ui://`リソースURIを明示する。モデルに見える`structuredContent`と、ウィジェット専用メタデータは分離される。
  - ファイル入力はツールに渡せるが、犬の非言語音を有意に扱えることは別の検証事項である。ガイド付き記述は常に完結する主要フローとする。
  - 指定された雛形は、pnpmモノレポ、Hono、MCP SDK、Cloudflare Workers、依存性注入可能なツール登録、ヘルスチェック、Streamable HTTPの接続終了処理を備える。PawLensはこの構造だけを採用し、x402決済と天気APIは採用しない。

## 調査ログ

### Apps SDKのツール・ウィジェット契約

- **背景**: PRDはリソースメタデータの仕様差を実装リスクとしている。
- **参照**: [MCPサーバー構築](https://developers.openai.com/apps-sdk/build/mcp-server/)、[ChatGPT UI構築](https://developers.openai.com/apps-sdk/build/chatgpt-ui/)、[Apps SDKリファレンス](https://developers.openai.com/apps-sdk/reference/)。
- **発見**:
  - ツールは引数スキーマ、出力スキーマ、`_meta.ui.resourceUri`を持つ。ウィジェットはMCP Apps bridge経由でツール結果を受け取る。
  - UIリソースは`ui://` URIと`text/html;profile=mcp-app`を使う。バンドルの破壊的変更時はURIも更新する。
  - ウィジェットは`window.openai.callTool`で、アプリに公開されたツールだけを呼び出せる。
- **設計への影響**: MCP登録モジュールがリソースURIとツール記述子を所有し、ウィジェットは検証済み出力の表示と明示的な保存・削除操作だけを担う。

### 添付と音声の境界

- **背景**: 確定要件では、記述を基本入力、音声を条件付き補助入力とする。
- **参照**: [Apps SDKのファイル入力](https://developers.openai.com/apps-sdk/reference/)、[GPT Liveの発表](https://openai.com/ja-JP/index/introducing-gpt-live/)。
- **発見**:
  - ファイル入力は`openai/fileParams`で宣言し、`download_url`と`file_id`を持つファイルオブジェクトを受け取る。
  - GPT Liveは自然なChatGPT音声会話のためのモデルであり、Apps SDKツールへ犬の非言語音を渡す経路や解析品質を保証するものではない。
- **設計への影響**: 音声入力は能力プローブと評価が成功した場合のみ有効にする。短命のダウンロードURLは保存・返却しない。失敗時でも記述、状況、任意の画像で完走する。

### 指定雛形の調査

- **背景**: `mashharuki/vibekanban-gitworktree-sample`を実装基盤の候補として追加調査した。
- **参照**: [リポジトリREADME](https://github.com/mashharuki/vibekanban-gitworktree-sample)、[`mcpserver`のエントリポイント](https://github.com/mashharuki/vibekanban-gitworktree-sample/blob/main/pkgs/mcpserver/src/index.ts)。
- **発見**:
  - `pkgs/mcpserver`を独立Workerとして置き、`createApp`でHonoと`McpServer`を組み立てる。ツール依存をfactoryで注入でき、テスト時に外部依存を差し替えられる。
  - `/`のヘルスチェックと`/mcp`のStreamable HTTPを分離し、DELETE時にMCP接続を明示的に閉じる。
  - ルートのpnpmワークスペースとVitestによる単体・結合テストはPawLensの初期構成に適合する。
- **設計への影響**: PawLensは`pkgs/mcpserver`と`pkgs/widget`のモノレポ構成を採用する。Worker組み立て、テスト可能な依存注入、ヘルスチェック、接続ライフサイクルを再利用する。決済・天気・x402用のパッケージや設定は取り込まない。

### 既存成果物の分析

- **参照**: `docs/requirements.md`、`docs/ui_design/pawlens-widget-design-spec.md`、`docs/review/review-pawlens-final-redteam.md`。
- **発見**: AI仮説と飼い主確認済み観察の分離、同一会話内2ラウンド比較、4状態UI、限界文、主CTA一つ、部分成功が不変条件である。
- **設計への影響**: 永続化するのは確認済み観察と実行行動だけとし、`Assessment`は一時値に限定する。

## アーキテクチャパターンの評価

| 選択肢 | 内容 | 長所 | 制約 | 判定 |
|---|---|---|---|---|
| 単一のMCPハンドラ | 登録、推論、保存、描画を一箇所に置く | 着手は速い | 安全・保存の境界が崩れる | 不採用 |
| レイヤー化した機能スライス | ツール、ドメイン、リポジトリ、ウィジェットを分離 | 小さくテスト可能 | 初期契約が必要 | 採用 |
| GPT Live中心 | ライブ音声を主要入力にする | 会話は自然 | API・添付経路・犬音解析が未検証 | 保留 |

## 設計判断

### 判断: 記述優先の証拠契約

- **採用**: `SignalInput`は常に記述と状況を持ち、画像・音声は任意の証拠とする。
- **理由**: 添付経路に依存せず、主要体験を常に利用可能にする。
- **フォローアップ**: 音声を有効化する前に、経路プローブと反証評価を記録する。

### 判断: 確認済み観察を唯一の履歴根拠にする

- **採用**: `DogProfile`と`ObservationLog`だけを永続化し、`Assessment`を保存APIの型から除外する。
- **理由**: プロダクトの信頼境界を型とリポジトリで強制する。

### 判断: 雛形のWorker構造を採用する

- **採用**: pnpmワークスペース、`createApp`、依存性注入、`/health`、MCP接続の明示終了、Vitest構成を採用する。
- **理由**: 現行のApps SDK契約を取り込む余地を保ちながら、既にWorker/MCP境界が検証された構造を再利用できる。
- **除外**: x402、決済、天気API、別バックエンドWorkerは本Specの責務外である。

### 判断: 共有契約と決定的表示を専用層へ集約する

- **採用**: `shared`にTypeScript契約、Zodスキーマ、システムエラーメッセージ、列挙定数、純粋ユーティリティを置く。
- **理由**: MCP入力検証とウィジェット表示で同じ契約・メッセージ・許可値を使い、二重定義による安全・ロケール・評価のずれを防ぐ。
- **境界**: `shared`は副作用を持たない。モデル推論、KV、Worker環境、UI bridge、ドメイン判断は各専用層が所有する。

### 判断: OpenAPIをMCP検証契約として生成する

- **採用**: 共有Zodスキーマから`pkgs/mcpserver/openapi.yaml`を生成し、`/health`と4つのMCPツールの契約を記録する。
- **理由**: MCPのJSON-RPC実装とは別に、ヘルスチェックとツール契約を人・CI・外部検証ツールが確認できる形式で固定する。
- **境界**: `/mcp`をREST APIとして二重実装しない。OpenAPIは`/health`のHTTP契約と`x-mcp-tools`拡張によるMCPスキーマの可視化だけを担う。

## リスクと軽減策

- 添付経路または犬音解析が使えない — 音声を能力フラグで保護し、記述優先フローを維持する。
- 構造化出力が安全規則に違反する — Zod検証、1回だけの修復、部分成功または行動可能なエラーに限定する。
- 匿名IDで会話を越えて同一個体を特定できない — 同一会話のみを保証し、UIにも明記する。
- Apps SDK契約が変わる — Hello Widgetを最初のゲートにし、破壊的UI変更時はリソースURIを更新する。

## 参考資料

- [Apps SDK MCPサーバーガイド](https://developers.openai.com/apps-sdk/build/mcp-server/)
- [Apps SDK ChatGPT UIガイド](https://developers.openai.com/apps-sdk/build/chatgpt-ui/)
- [Apps SDKリファレンス](https://developers.openai.com/apps-sdk/reference/)
- [GPT Liveの紹介](https://openai.com/ja-JP/index/introducing-gpt-live/)
- [mashharuki/vibekanban-gitworktree-sample](https://github.com/mashharuki/vibekanban-gitworktree-sample)
