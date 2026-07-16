# PawLens ポジショニング強化 — Impact / Idea Quality を天井へ

> 目的: 審査軸「Potential Impact」「Quality of Idea」を天井（4.0 / 4.5）まで引き上げる。
> レビュー（`review-pawlens-winnability.md`）で特定したギャップに対応:
> - Impact: 日本ローカル訴求 → **普遍的フック＋英語化**、**問題の深刻さ・規模の根拠不足**
> - Idea: 逆張りが3分デモで**"地味"に埋もれるリスク** → **抑制を"賢さ"として体感させる**
> ※ 数値根拠（§4, §5）は `pm-research-analyst` の調査（出典付き一次データ）を統合済み。詳細・出典URLは `docs/pm/research-pawlens.md`。

---

## 1. 普遍的フック（グローバル審査向け・英語ファースト）

日本ローカルの「制度差」ではなく、**世界中の飼い主が毎日経験する普遍的な瞬間**を入口にする。原体験（ヨーロッパでの気づき）は"個人のきっかけ"として1文だけ残し、主張は普遍化する。

### 1.1 ワンライナー候補（英語）
1. **"Every dog is talking. Most of us only hear noise."**
   *PawLens helps you notice what your dog is already telling you — without putting words in their mouth.*
2. **"A bark is not a problem to silence. It's a signal to read."**
   *PawLens turns a dog's voice, context, and history into observations you can act on — honestly, with its uncertainty shown.*
3. **"We built the opposite of a dog translator."**
   *Instead of faking what your dog 'said', PawLens shows you what to look at, how sure it is, and what to safely do next.*

→ **推奨: #3 を主コピー**（競合＝dog translator への明確な対立軸で、アイデアの新規性が一撃で伝わる）。#1をサブに。

### 1.3 データで殴る問題提起（Impactの掴み・研究の数字をそのまま使う）
派手さでなく"事実の重さ"で始める場合の一撃。デモ冒頭やDevpost見出しに:
> **"99% of dogs in the U.S. have a behavior problem — and 7 in 10 owners who rehomed their dog never realized it."**
> *We don't misread our dogs because we don't care. We misread them because no one taught us what to look at.*

（Beaver 2024 / PMC8461173 の一次研究数値。規模と"気づけなさ"を同時に突く最強の掴み。）

### 1.2 原体験の普遍化（Before → After の語り）
- Before（ローカルに寄りすぎ）: 「ヨーロッパは犬に優しく、日本は遅れている」
- After（普遍・個人の気づき）:
  > "Traveling abroad, I noticed how differently a society can make room for dogs — and realized the first step isn't policy, it's simply *noticing* what a dog needs. That's a gap every owner has, everywhere."

---

## 2. バリュープロポジション（JTBD）

| 要素 | 内容 |
|---|---|
| **誰が（Who）** | 犬と暮らす飼い主。特に来客・留守番・散歩前後の小さな不安を繰り返し抱える人 |
| **なぜ（Why / 状況）** | 犬が吠える/落ち着かない時、「警戒か興奮か要求か」わからず、決めつけて対応してしまう |
| **これまで（Before）** | 「うるさい→止めさせる」。犬の状態を確かめる入口が無い。あるいは"断定翻訳アプリ"の当てにならない一言に頼る |
| **どう変わる（How）** | 鳴き声＋状況＋写真を渡すと、**根拠付きの複数仮説・確信度と限界・観察ポイント・安全な次の一手**が返る |
| **その後（After）** | 決めつけではなく観察に基づいて動ける。記録が貯まり「その子の普段との差」に気づける関係が育つ |
| **代替（Alternatives）** | 犬語翻訳アプリ（断定・非科学的）／獣医・行動専門家（高コスト・その場で使えない）／自己流の当て推量 |

**一文**: *For dog owners who freeze between "is it fear or excitement?", PawLens turns a bark, its context, and the dog's history into honest, research-grounded observations — so they respond with care instead of assumption.*

---

## 3. アイデア品質を"賢さ"として体感させる（地味さリスクの解体）

PawLensの抑制（＝断定しない）は思想的に正しいが、放置すると3分デモで競合の派手さに負ける。**抑制を"物足りなさ"ではなく"誠実で賢い選択"として演出**する3つの装置:

1. **断定回避リビール（デザイン仕様 §10・静的版が正式）**: 「よくある翻訳: ~~こわいよ！~~ → PawLensの見立て」という**静的な before→after の対比表示**。*引き算で思想を証明する。* デモ最大の見せ場。（**2026-07-16 デスコープ判断（M-3）**: 0.8秒フルアニメ版は未実装であり提出後の拡張とする。spec §10.2 の reduced-motion 定義を正式版へ昇格）
2. **確信度の"霧が晴れる"表現**: 進捗バー（＝断定的）を捨て、輪郭のぼやけで不確実性を美しく見せる。**弱点を思いやりに変える**独自ビジュアル。
3. **低確信度＝失敗ではなく合図**（デッキslide5）: 情報が足りない時、PawLens自身が「吠える前に何がありましたか？」と観察を促す。**"わからない"を価値に反転**させる。

> メッセージ: 「派手に間違える翻訳」より「誠実に問いを返す通訳」の方が賢い、と審査員に思わせる。

---

## 4. 問題の深刻さ・規模の根拠（Impact のエビデンス）

> 出典の一次データは `docs/pm/research-pawlens.md`。数値は捏造せず、幅がある/未確認のものはその旨を保持する。**Impactの核は下記2つの一次研究数値**（規模と深刻さを同時に、捏造リスクゼロで示せる）。

### 4.1 核となる2つの数字（これをImpactの主役にする）
- 🟢 **米国の犬の 99.12% が、中程度以上の行動問題を少なくとも1つ抱える**（43,517頭・Dog Aging Project / Beaver 2024, *Journal of Veterinary Behavior*, テキサスA&M大学）。うち分離・愛着関連（留守番中の吠え・破壊を含む）85.9%、恐怖・不安 49.9%。→ **ほぼすべての犬が対象**という規模。
- 🟢 **犬を手放した飼い主の 69.3% は、引き渡し前に「行動に問題があると気づいていなかった」**（PMC8461173）。行動問題はシェルター引き渡し理由の 28〜40%（PMC11394480 ほか）。→ 問題は「無関心」ではなく**"サインの誤読・過小評価"**。**PawLensの中核課題を一次研究が直接裏付ける最重要データ。**

### 4.2 「吠え」が最頻出という頻度シグナル
- 🟢 **日本 2,050人調査で、行動問題トップ2はいずれも吠え**：室内の物音への吠え 41.1%（1位）、来客への吠え 38.4%（2位）。トイプードル・ダックス・チワワで来客吠えのオッズが高い（Yamada et al. 2019, PMC6715928）。
- 🟢 米国でも分離・愛着関連（吠え・破壊を含む）が 85.9% で最上位（Beaver 2024）。
- 🟡 飼い主の 33% が「自分の犬は分離不安だと思う」と回答（臨床有病率13〜56%より高い＝**判断に迷う飼い主が多い**傍証）。

### 4.3 規模（TAM）とWhy now
- 🟢 市場: 米ペット産業 $158B（2025, APPA）／米の犬飼育 約6,500万世帯（世帯の53%）／日本ペット市場 1.91兆円（2024, 矢野経済）／欧州の犬 1.04億頭（世帯の25%, FEDIAF）。
- 🟢 家族化: **米ペット飼い主の約半数が「ペットは人間の家族と同じくらい家族」**（Pew 2023）。
- 🟢 Why now（AI）: ミシガン大が人間音声モデル（Wav2Vec2）を鳴き声解析へ転用し高精度化（2024）。**一方で精度はまだ限定的（手法により43〜93%）**＝「断定翻訳」は科学的に無理があり、「不確実性の通訳」が技術成熟度と整合。

> **狙い達成**: 「個人の原体験」だけだったImpact根拠に、**規模（99%）・深刻さ（69.3%が気づけない）・頻度（吠えが1位）・普遍性（日米欧）**の客観シグナルが揃った。応募文では TAM は単独のトップダウン数字に頼らず、米欧日のボトムアップ＋前提明示で語る（研究の推奨）。

---

## 5. 競合差別化テーブル（Idea Quality の防御）

> 実在の競合（`research-pawlens.md` §4）: アプリ系＝**BarkGPT / Barkly / Barkingo**、ハード系＝**Inupathy（心拍）/ PetPace（健康監視・吠え非対応）/ No More Woof（脳波）/ Camicoo**、研究系＝**Zoolingua**。
> **決定的事実**: BarkGPT・Barkly は公式に *"entertainment purposes only / 科学的に正確ではない"* と自認している。＝鳴き声単体からの断定翻訳には構造的に無理がある。

| 軸 | よくある「犬語翻訳」（BarkGPT/Barkly等） | **PawLens** |
|---|---|---|
| 出力の性質 | 犬のセリフを**断定**（「お腹すいたよ」）。自ら"エンタメ"と免責 | **仮説＋確信度＋限界**（断定しない） |
| 科学的姿勢 | 精度に自信がなく免責で逃げる | 研究コーパスに接地、限界を**設計思想の中核**に |
| 入力 | 音声のみ or 単一センサー（Inupathy=心拍、No More Woof=脳波） | 鳴き声＋写真/動画＋状況＋履歴のマルチモーダル |
| 必要機材 | 専用ハード購入必須の製品が多い（Inupathy/PetPace/Camicoo） | **ChatGPT App＝スマホのみ**で完結 |
| アウトプットの実用性 | 感情ラベルで終わる | **観察ポイント＋安全な次の一手**まで |
| 時間軸 | 単発の"翻訳"体験 | **履歴で"その子の普段"を学ぶ**（＝69.3%の"気づけない"問題に直接対応） |

**差別化の一言**: 既存は "what the dog said" を**でっち上げ、自らエンタメと認める**。PawLensは "what to look at, how sure, what to do" を**正直に返す**。既存業界の構造的な誠実さの欠如そのものが、PawLensの参入余地。

---

## 6. 3分デモ台本（Impact × Idea × Design を束ねる）

> テンプレ（deliverable-templates）のビート配分に、シグネチャーリビールを組み込む。英語ナレーション＋字幕（グローバル対応）。

| 時間 | ビート | 見せるもの / ナレーション |
|---|---|---|
| 0:00–0:20 | 痛み | 来客チャイム→犬が激しく吠える実映像。*"Your dog is barking. Fear? Excitement? A demand? You have three seconds to decide — and you usually guess."* |
| 0:20–0:40 | アハ（差別化） | **静的リビール**（before→after 対比: 「よくある翻訳: ~~I'm scared!~~ → PawLensの見立て」）を一時停止で強調。*"A dog translator would just say 'I'm scared.' PawLens refuses to —"* 字幕: **"We don't put words in their mouth."** |
| 0:40–2:10 | 実ワークフロー | ChatGPT内で音声＋写真＋状況を渡す→見立てカード結像→観察ポイントを実際にチェック→次の一手→観察を記録→（2回目）「前回より落ち着くのが早い」差分表示 |
| 2:10–2:40 | 技術の証明 | GPT-5.6の構造化出力・確信度/限界・研究接地・ガードレールを1画面で。Codex協働に1言。 |
| 2:40–3:00 | インパクトと締め | *"99% of dogs have a behavior problem — and 7 in 10 owners who gave up their dog never saw it coming. PawLens helps you notice."*（Beaver 2024 / PMC8461173。**M-5対応: 主語を出典どおり「手放した飼い主」に限定**。"most of us never notice" は一次研究が支持しない合成主張のため使用禁止）→ *"Every dog is already talking. We just help you listen — honestly."* MVP: 来客ケースのURL提示。 |

---

## 7. この強化が効く先（スコアカードへの反映見込み）

| 軸 | 現状 | 本強化後の見込み | 効いた要素 |
|---|---|---|---|
| デザイン | 3.5 | 4.0+（実装で4.5） | §10 シグネチャーリビールで"思想を動きで証明" |
| インパクト | 3.0 | 4.0 | 普遍的フック＋英語化（§1）＋一次研究の客観データ統合済み（§4: 99.12%／69.3%） |
| アイデア品質 | 4.5 | 4.5（確実化） | 抑制を賢さとして体感させる装置（§3）＋差別化テーブル（§5） |

> 技術実装（後フェーズ）が伴えば、4軸合計は17/20圏内。**この3軸の強化は"実装前に確定できる勝ち幅"の最大化。**
