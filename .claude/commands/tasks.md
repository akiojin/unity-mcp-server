
計画を実行可能なタスクに分解します。

これはSpec駆動開発ライフサイクルの3番目のステップです。

引数として提供されたコンテキストに基づいて、以下を実行します:

1. リポジトリルートから `scripts/check-task-prerequisites.sh --json` を実行し、FEATURE_DIRとAVAILABLE_DOCSリストを解析します。/specifyからspecファイルが既にわかっている場合は、ブランチベースの仮定を避けるために `--spec <SPEC_FILE>` (または `--feature-dir <FEATURE_DIR>`) を渡します。すべてのパスは絶対パスである必要があります。
2. 利用可能な設計ドキュメントを読み込んで分析します:
   - 常にplan.mdを読んで技術スタックとライブラリを確認
   - 存在する場合: data-model.mdを読んでエンティティを確認
   - 存在する場合: contracts/を読んでAPIエンドポイントを確認
   - 存在する場合: research.mdを読んで技術的決定を確認
   - 存在する場合: quickstart.mdを読んでテストシナリオを確認

   注意: すべてのプロジェクトにすべてのドキュメントがあるわけではありません。例えば:
   - CLIツールはcontracts/がない可能性があります
   - シンプルなライブラリはdata-model.mdが不要な可能性があります
   - 利用可能なものに基づいてタスクを生成します

3. テンプレートに従ってタスクを生成します:
   - `/templates/tasks-template.md` をベースとして使用
   - 例のタスクを以下に基づいた実際のタスクに置き換えます:
     * **Setupタスク**: プロジェクト初期化、依存関係、リンティング
     * **Testタスク [P]**: contractごとに1つ、integrationシナリオごとに1つ
     * **Coreタスク**: entity、サービス、CLIコマンド、endpointごとに1つ
     * **Integrationタスク**: DB接続、ミドルウェア、ロギング
     * **Polishタスク [P]**: unit tests、performance、docs

4. タスク生成ルール:
   - 各contractファイル → [P]マーク付きのcontract testタスク
   - data-modelの各entity → [P]マーク付きのmodel作成タスク
   - 各endpoint → 実装タスク (共有ファイルの場合は並列不可)
   - 各ユーザーストーリー → [P]マーク付きのintegration test
   - 異なるファイル = 並列可能 [P]
   - 同じファイル = 順次実行 ([P]なし)

5. 依存関係でタスクを順序付け:
   - すべての前にSetup
   - 実装の前にTests (TDD)
   - サービスの前にModels
   - エンドポイントの前にServices
   - 統合の前にCore
   - すべての前にPolish

6. 並列実行例を含めます:
   - 一緒に実行できる[P]タスクをグループ化
   - 実際のTaskエージェントコマンドを表示

7. 以下を含むFEATURE_DIR/tasks.mdを作成:
   - 実装計画からの正しい機能名
   - 番号付きタスク (T001, T002, etc.)
   - 各タスクの明確なファイルパス
   - 依存関係の注記
   - 並列実行ガイダンス

タスク生成のためのコンテキスト: $ARGUMENTS

tasks.mdはすぐに実行可能である必要があります - 各タスクは追加のコンテキストなしでLLMが完了できる程度に具体的である必要があります。
