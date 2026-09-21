# 公式資料との対応と照合範囲

採用本文：日本総合研究所「令和7年度改訂版 適切なケアマネジメント手法 基本ケア及び疾患別ケア」（2026年3月31日）。資料確認：2026年9月18日。

## 収録した体系

|領域|期|支援項目数|本文ページ|
|---|---|---:|---|
|基本ケア|共通|44|15–109|
|脳血管疾患|Ⅰ／Ⅱ|22／22|112–165|
|大腿骨頸部骨折|Ⅰ／Ⅱ|12／9|167–192|
|心疾患|Ⅰ／Ⅱ|21／21|194–267|
|認知症|共通|41|270–333|
|誤嚥性肺炎の予防|共通|15|337–359|

合計207項目。基本ケアの中項目24件と、支援項目44件は別の階層です。疾患別は領域・期ごとに番号が振り直されるため、番号だけをIDにしません。

全項目の番号・名称・階層・本文頁・PDF頁・原典リンクは [対応表CSV](knowledge/public/official-care-crosswalk.csv)、アプリ用データは [カタログJSON](knowledge/public/official-care-catalog.json) に収録しています。本文頁に12を足した値が、このPDFのページ番号です。

## ユーザー確認済みの扱い

|入力例|23項目の整理先|適ケアの参照先|質問の扱い|
|---|---|---|---|
|本人は自宅で暮らしたい|07 主訴・意向|Ⅰ-2 意思決定過程の支援／Ⅰ-2-1／支援15、本文p43|本人が望む生活と発言の背景。住宅の物理情報は別に22へ|
|昨年は転倒したが、その後は転倒していない|原文の過去と現在の否定を保持|Ⅰ-1-3 目指す生活を踏まえたリスクの予測／支援12、本文p37|過去の場面、変更した環境・支援、現在の動作。現在の痛みを推測しない|
|転倒だけの記載|転倒の原文を保持|上記リスク予測|意思疎通に直接関係する記載なしでは支援36を関連候補にしない|

## 本文・概要版・手引きの区別

最新版本文と、公式掲載の一覧表版／ページ分割版18件を取得して版・ハッシュを記録しました。本文PDF巻末には旧版の概要版と手引きも含まれます。最新版本文の支援番号・ページの正本と、概要表や手引きの参照箇所を混同しません。基本方針Ⅰは目次の「重視」と本文の「尊重」に相違があり、画面では本文の「尊厳を尊重した意思決定の支援」を採用しました。

期の説明は巻末手引きも参照。日数だけから期を自動決定しません。認知症・誤嚥性肺炎にⅠ／Ⅱ期を設けません。症状だけから診断、家族の疾病から本人の疾病を推定しません。心疾患名だけで終末期、水分・塩分・活動制限を決めません。誤嚥性肺炎は発症前の予防も対象とし、むせなしを安全の根拠にしません。

## アプリ独自部分と残る検証

原典から見出し・番号・階層・参照先を収録しています。加えて、各支援の実施内容をもとにした短い編集要約207件をサイト内に表示します。各項目の実施内容、関連アセスメント・モニタリング項目、相談すべき専門職は該当PDFページから確認できます。全文の転載は行いません。

原文との関連付け、表示順、確認質問はアプリ独自の規則です。207項目すべてに照合ルールを設けましたが、全項目の確認質問を個別事例で臨床検証したことを意味しません。従来の独自44質問は別表示であり、公式44支援と一対一対応させたものではありません。資料から診断・サービス導入・必要性を自動決定する仕組みではありません。

現時点の日本語処理は規則方式です。複雑な複数主体、二重否定、長距離の省略関係などはなお原文確認が必要です。現場での独立評価、実機スマホ／タブレット、ローカルAIの実推論は別途検証が残ります。

## 参照資料一覧

- [令和7年度改訂版・基本ケア及び疾患別ケア](https://www.jri.co.jp/file/column/opinion/pdf/2026/0330_tekisetsunacare_r7.pdf) — 本文は令和7年度改訂版。巻末に旧概要版・手引きを収録。
- [基本ケア 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2kihoncare.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [基本ケア ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/230403_kihoncare.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [脳血管疾患Ⅰ期 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2noukekkan_I.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [脳血管疾患Ⅰ期 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_noukekanshikkan1.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [脳血管疾患Ⅱ期 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2noukekkan_II.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [脳血管疾患Ⅱ期 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_noukekanshikkan2.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [大腿骨頸部骨折Ⅰ期 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2daitaikotsu_I.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [大腿骨頸部骨折Ⅰ期 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_daitaikotsukeibukossetsu1.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [大腿骨頸部骨折Ⅱ期 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2daitaikotsu_II.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [大腿骨頸部骨折Ⅱ期 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_daitaikotsukeibukossetsu2.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [心疾患Ⅰ期 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2sinsikkan_I.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [心疾患Ⅰ期 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_shinsikkan1.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [心疾患Ⅱ期 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2sinsikkan_II.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [心疾患Ⅱ期 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_shinsikkan2.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [認知症 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2ninchisho.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [認知症 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_ninchisho.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [誤嚥性肺炎の予防 一覧表版（PDF）](https://www.jri.co.jp/MediaLibrary/file/column/opinion/pdf/210414_r2goensei2.pdf) — 概要版。最新版本文の番号・ページと区別して照合。
- [誤嚥性肺炎の予防 ページ分割版（PDF）](https://www.jri.co.jp/MediaLibrary/file/pdf/service/special/content11/corner113/241206_goenseihaienyobo.pdf) — 概要版。最新版本文の番号・ページと区別して照合。

取得ファイルのSHA-256は [資料台帳](knowledge/public/jri-source-inventory.json)。自動監視は掲載ページと採用PDFを対象とし、概要PDF18件すべての内容ハッシュを定期監視するものではありません。詳しくはREADME「公式資料の更新確認」。

## サイト内の要点（2026-09-19追加）

[要点データ](knowledge/public/official-care-summaries.json) は、該当する実施内容を中心に読み直して作成した短い要約です。原文の引用や、実施内容・必要性・アセスメント等の全文の代替ではありません。各項目に版・本文ページを表示します。レビュー担当が全207件を原典と照合し、意味の逆転・期違い・新たな医学的断定は見つかりませんでした。この整合確認は臨床的有効性の証明ではありません。
