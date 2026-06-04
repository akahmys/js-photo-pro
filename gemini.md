# Gemini (Antigravity) 開発ガイドライン

## 🤖 基本スタンス (AI Behavior & Harness Engineering)
- **目標駆動**: ユーザーから要件（What）を受け取り、AIが設計・実装（How）を主導する。
- **自己検証（ハーネス）の徹底**:
  - 変更時は必ず検証用ハーネス（テスト、ビルド検証、静的チェック等）を活用し自己検証すること。
  - **「同じエラーを二度と発生させない」**: バグ修正時は型定義の強化や検証ハーネスを拡張し、再発防止を自動化する（プロンプトでの謝罪は不要）。
- **最小限の変更**: 既存コードの変更箇所は必要最小限に留める。未指示の不要なリファクタリングや設計・機能変更は**絶対に行わないこと**。

## 👥 マルチエージェント体制による分業
開発は親エージェント（Orchestrator）が3つのサブエージェントを制御して実施する。
1. 👑 **統括 (Orchestrator)**: タスクアサイン、進捗管理、最終マージ、動作確認。
2. 📝 **設計 (Planner)**: 要件調査、`implementation_plan.md` の作成・更新（ソースコード変更は不可）。
3. 💻 **実装 (Coder)**: 設計に基づくコーディング、`task.md` の更新。
4. 🔬 **検証 (Validator)**: `npm run harness` 実行、`walkthrough.md` での完了報告。
※ 各成果物（.md）は App Data Directory 配下の `brain/<conversation-id>/` 内に作成する。

## 💻 技術スタックとコーディング規約 (Tech Stack & Coding Standards)
- **フロントエンド / UI**: Vite + React (TypeScript) + Tailwind CSS (SPA)
  - 新規コンポーネントやロジックは `src/` 配下の適切なディレクトリ（`components/`, `utils/` 等）へ分割して実装する。
- **コード品質**: 型定義は `src/types.ts` に集約し型安全を維持。複雑な処理には日本語コメントを付与。

### 🏷️ 命名規則 (Naming Conventions)
一貫性と可読性のために以下を厳守すること。
- **ファイル/フォルダ**:
  - Reactコンポーネント: パスカルケース (`PascalCase.tsx`)
  - カスタムHooks: `use` 開始キャメルケース (`useCamelCase.ts`)
  - ユーティリティ: キャメルケース (`camelCase.ts`)
  - 静的アセット/スタイル: ケバブケース (`kebab-case`)
- **コンポーネント/関数**:
  - Reactコンポーネント: パスカルケース (`PascalCase`)
  - 関数/メソッド: 動詞開始キャメルケース (`camelCase`)
  - イベントハンドラ: `handle` 開始キャメルケース (`handleClick`)
- **変数/定数**:
  - 一般変数/プロパティ: キャメルケース (`camelCase`)
  - ブーリアン値: `is`, `has`, `should` 等を前置
  - 定数（グローバル/ファイルレベル）: 大文字スネークケース (`UPPER_SNAKE_CASE`)
- **型/インターフェース**:
  - Type/Interface: パスカルケース (`PascalCase`)
  - ジェネリクス: `T` または `T` 開始の大文字パスカルケース (`TData`)

### 🚀 React/TypeScript向け NASA "Power of 10" 原則
1. **シンプルな制御フロー**: 複雑な分岐や深いネストを避け、早期リターン (Early Return) を徹底する。
2. **ループ・イテレーションの安全性**: 命令的な `for`/`while` を避け、`map`/`filter`/`reduce` を使用。Reactの `map` 展開時は安定した一意の `key` が必須。
3. **状態・副作用の局所化**: `useState`/`useRef` は最小限に抑え、状態の乱立や Prop Drilling を避ける。状態は可能な限り派生状態 (Derived State) として計算する。
4. **関数のサイズ制限**: 1つのコンポーネント/関数は最大100行程度（1画面）に抑え、単一責任を守る。肥大化時はHookやサブコンポーネントに分割する。
5. **アサーションと型ガード**: `any` や `as`（型キャスト）は禁止。外部APIレスポンス等の不確実なデータは型ガードやバリデーションで安全性を保証する。
6. **不変性とスコープ最小化**: 変数は `const` を基本とし `let` は最小限に（`var` は禁止）。Reactの状態は常に不変 (Immutable) として扱う。
7. **エラーハンドリング**: 非同期処理 (`async/await`, `Promise`) は必ず `try-catch` 等で処理しエラーを握り潰さない。Error Boundary を適切に配置。
8. **依存関係の制限**: 外部ライブラリ導入は最小限にし、標準のReact/Web APIでの実装を優先する。
9. **Null/Undefined 安全性**: オプショナルチェイニング (`?.`) や Null合体演算子 (`??`) を使用し、実行時エラーを防ぐ。
10. **警告ゼロビルド**: `tsconfig.json` の `strict: true` を維持。ESLint/Prettier/Viteビルドの警告およびエラーを全て解消してコミットする。

## 📝 自律型ワークフロー (Autonomous Workflow)
1. **計画**: `Planner` が `implementation_plan.md` を作成し、ユーザー合意を得る。
2. **実行**: `Coder` が `task.md` で進捗管理しながら実装。
3. **ビルド検証**: `Validator` が `npm run harness` を実行し、コンパイルエラーやビルド警告を全て解消する。
4. **検証・報告**: `Validator` が `walkthrough.md` にテスト結果等をまとめ、`Orchestrator` が最終報告。
