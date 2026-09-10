# プロジェクトコンテキスト：定期便 在庫・引当・出荷管理システム

## 1. 目的

- 毎月お茶を届ける個人サブスク事業の裏側で動く **在庫・ロット・引当・出荷の管理ツール**
- 同時に、DDD / TDD / クリーンアーキテクチャと最新フロント技術（React 19 系）を実践で身につけるための学習プロジェクト
- 優先順位：**実運用できること > 設計の学習 > 技術のキャッチアップ**。迷ったら運用上シンプルな方を選ぶ

## 2. システム境界

### Stripe が持つもの（自作しない）

- 商品・プラン（Product / Price）
- 顧客・決済手段
- 定期課金・請求サイクル・請求書
- 申込画面（Checkout）、顧客マイページ（Customer Portal：スキップ・解約・カード変更）
- 決済失敗時の再試行（Smart Retries）

### 自作システムが持つもの

- 配送先住所・配送希望（Stripe 顧客 ID で紐づけ。個人情報は配送に必要な最小限のみ）
- 注文（Order）：Stripe の請求成功のたびに生成される事実
- 在庫・ロット（賞味期限・仕入原価）
- 引当（Allocation）
- 出荷（Shipment）・ピッキングリスト
- 仕入・入荷予定

### 原則

- Stripe には「注文」という概念がない。`invoice.paid` を **Order** に変換するのは自作側の責務
- Stripe 固有の概念（invoice、subscription、price_id など）は **腐敗防止層（ACL）の外に漏らさない**。`domain/` と `application/` は Stripe を知らない

## 3. 運用前提

- 出荷は **月 1 回、まとめて一斉出荷**
  - 月次で「当月分の Order 全件 → 引当 → ピッキングリスト → 出荷確定」のバッチ的なフローを回す
  - 随時出荷は想定しない（将来の拡張候補としては残す）
- 想定規模：1 年後で契約数 50〜300 件、SKU は少数（十数種以内）
  - パフォーマンス最適化は不要。SQLite で十分。可読性と正しさを優先
- 利用者は事業者本人（管理画面のみ）。顧客向け UI は Stripe に任せる

## 4. ドメインモデル（初期案。テストが形を決める）

| 集約 / 概念               | 責務・主なルール                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **Lot**                   | 商品・数量・製造日・賞味期限・仕入原価。賞味期限まで N 日を切ったら引当対象外           |
| **Inventory**（SKU ごと） | Lot の集合。物理在庫・引当済み・出荷可能数を計算。FIFO（期限が近い順）で引当            |
| **Allocation**            | Order 1 件に対し、どの Lot から何個引くかの結果。不足時は部分引当 or 保留               |
| **Order**                 | Stripe 請求書 ID をキーに一意（冪等）。状態：受付 → 引当済 → 出荷済 / 保留 / キャンセル |
| **Shipment**              | 引当済み Order を出荷日でまとめる。出荷確定で物理在庫を減らす                           |
| **Purchase**              | 入荷予定。「当月分の不足を次の入荷で賄えるか」の見通しに使う                            |
| **Customer**（配送情報）  | 住所・配送希望日・置き配指定など。Stripe 顧客 ID で紐づけ                               |
| **プラン→SKU マッピング** | 「玉露コース = SKU-A × 2」のような対応表。自作側のテーブルで管理                        |
| 値オブジェクト            | `SKU`, `Quantity`, `Money`（税込/税抜・端数処理）, `ExpiryDate` など                    |

### Stripe イベントと自作ドメインの対応（ACL）

- `checkout.session.completed` → 初回申込。配送先住所を保存
- `invoice.paid` → **Order 生成**（月次出荷の起点）
- `customer.subscription.updated / deleted` → 一時停止・解約。次回出荷を止める
- `invoice.payment_failed` → Order を保留
- 同一イベントの重複配信を前提に、すべて **冪等** に処理する
- イベント名・ペイロードは実装時に Stripe 公式ドキュメントで確認する

## 5. アーキテクチャ

```text
packages/
  domain/          # 純粋 TS。フレームワーク・DB・Stripe に依存しない
    inventory/     # Lot, Inventory
    allocation/    # Allocation
    order/         # Order
    shipment/      # Shipment
    shared/        # 値オブジェクト（SKU, Quantity, Money ...）
apps/
  admin/           # Next.js (App Router)。管理画面 + Webhook 受け口
    application/   # ユースケース。リポジトリは interface のみ
    infrastructure/
      db/          # Drizzle + SQLite
      stripe/      # ACL：Webhook 検証（署名 + Zod）→ ドメインへ変換
    ui/            # React 19 / Server Actions
```

- 依存の向きは常に **ui → application → domain**、**infrastructure → application/domain**
- `domain/` は `apps/admin` から独立したパッケージとして分離し、フレームワーク非依存を構造で保証する
- 「層が多すぎて辛い」と感じたら、その感覚を記録する。どこまで分けると得で、どこから過剰かを言語化することも目標

## 6. 技術スタック

- パッケージ管理：pnpm workspace
- ドメイン：TypeScript（strict）
- UI / サーバ：Next.js（App Router）、React 19（Server Components, Server Actions, `useOptimistic`）、TanStack Table
- DB：Drizzle ORM + SQLite（Turso 等。Postgres への移行は Drizzle で吸収）
- 決済：Stripe（Billing, Checkout, Customer Portal, Webhook）。ローカルは `stripe listen`
- 検証：Zod（Webhook ペイロード、フォーム入力）
- テスト：Vitest（domain / application / ACL）、Testing Library、Playwright（管理画面の主要フロー）
- Lint / Format：Biome

## 7. 開発方針

- **TDD**：ドメインとユースケースはテストファースト。赤 → 緑 → リファクタ
- **ドメインから作る**：DB・Stripe・UI はドメインが固まるまで触らない
- **DDD**：集約の不変条件はドメイン内で守る。ユースケースは薄く。命名はユビキタス言語（Lot, Allocation, Shipment）に揃える
- ACL のテストは Stripe イベントの fixture JSON を置いて行う
- 学習の気づき（設計判断、迷った点、過剰だった点）は `docs/decisions/` に短く残す

## 8. ロードマップ

1. **Lot / Inventory / Allocation を TDD**（FIFO、期限切れ除外、部分引当、出荷確定で物理在庫減）
2. Order 集約と「invoice.paid → Order」変換を ACL として TDD（冪等性含む）
3. 管理画面の最小版：在庫一覧（ロット別・期限順）、入荷登録、当月 Order 一覧と引当実行
   → **ここで手入力運用として実用化（最初のマイルストーン）**
4. Stripe テストモードで Webhook 受信（署名検証 + Zod）
5. Checkout + Customer Portal 接続。申込 → 住所取得 → Order 生成 → 出荷まで通す
6. 出荷確定・ピッキングリスト、入荷予定と来月の見通し画面

## 9. 未決事項

- 賞味期限の引当除外日数（N 日）の具体値
- 出荷日の固定（毎月 X 日）と、それに対する住所変更の締め切り
- 配送業者との連携方法（当面は手作業・CSV 出力で十分か）
- 引当不足時の扱い（部分出荷するか、全体を保留するか）
- ホスティング先（Vercel 想定だが未確定）
