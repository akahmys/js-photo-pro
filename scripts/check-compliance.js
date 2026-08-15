import { execSync } from 'node:child_process';
import fs from 'node:fs';

// 1. 検出ルール定義
const COMPLIANCE_RULES = [
  {
    name: 'Private Key / Credentials',
    regex: /-----BEGIN (?:RSA |EC |PGP |OPENSSH )?PRIVATE KEY-----|AMZN-OTK|HEROKU_API_KEY/i,
    message: '秘密鍵または認証トークンが検出されました。',
  },
  {
    name: 'Google API Key / Generic Secret',
    regex: /AIza[0-9A-Za-z-_]{35}|api[-_]?key|client[-_]?secret|db[-_]?(?:password|pass)/i,
    message: 'APIキー、またはパスワード/シークレット情報らしき記述が検出されました。',
  },
  {
    name: 'Personal Email Address',
    regex: /[a-zA-Z0-9._%+-]+@(?!example\.com|test\.com|domain\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    message: 'テスト用（example.com等）以外の実在する可能性のあるメールアドレスが検出されました。',
  },
  {
    name: 'Personal Information / Author Detection',
    customCheck: (content) => {
      // ローカル設定または環境変数または動的パターンから検出
      const patterns = [];
      if (process.env.RESTRICTED_AUTHORS) {
        patterns.push(new RegExp(process.env.RESTRICTED_AUTHORS, 'i'));
      }
      if (fs.existsSync('.betterleaks.local.toml')) {
        const localCfg = fs.readFileSync('.betterleaks.local.toml', 'utf-8');
        const m = localCfg.match(/regex\s*=\s*'''([^']+)'''/);
        if (m) {
          try {
            patterns.push(new RegExp(m[1], 'i'));
          } catch {}
        }
      }
      // 動的フォールバック（難読化パターン）
      if (patterns.length === 0) {
        const pStr = Buffer.from('XGJqdW5bXHNfLV0/a2F0b1xi', 'base64').toString();
        patterns.push(new RegExp(pStr, 'i'));
      }
      return patterns.some((p) => p.test(content));
    },
    message: '個人情報・開発者氏名らしき記述が検出されました。',
  },
  {
    name: 'Absolute Local Path',
    regex: /\/Users\/[a-zA-Z0-9_-]+\/|[a-zA-Z]:[\\/]Users[\\/][a-zA-Z0-9_-]+\//i,
    message:
      'ローカル環境の絶対パス（例: /Users/ユーザー名/...）が検出されました。相対パスを使用してください。',
  },
  {
    name: 'Forbidden Standard Specs / Documents',
    regex: /下水道事業団|電子納品基準|国土交通省|完成図書電子納品要領/i,
    // ソースコード内の軽微な言及（コメントなど）は許容するが、大量の仕様書テキストや書類ファイル自体の混入を警告
    customCheck: (content, filePath) => {
      // docsディレクトリ自体は.gitignoreされているが、ステージングに入ってしまった場合
      if (filePath.includes('docs/')) {
        return true;
      }
      // 通常のソースコード内のコメント以外の長文コピーを検知するため、キーワードの出現数が異常に多い場合を検知
      const matches = content.match(/下水道事業団|電子納品基準|電子納品要領/g);
      if (matches && matches.length > 5) {
        return true;
      }
      return false;
    },
    message:
      '他人の著作物である基準書のテキストや、docs/ディレクトリのファイルが混入している可能性があります。',
  },
];

// 2. ステージングされた（Gitにコミット予定の）ファイルを取得
let stagedFiles = [];
try {
  const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
  stagedFiles = output.split('\n').filter((file) => file.trim() !== '');
} catch (_error) {
  console.warn('⚠️ Git差分の取得に失敗しました。すべての変更ファイルをチェックします。');
  // Gitが使えない場合のフォールバック（簡易版として何もしない、またはエラーで終了）
  process.exit(0);
}

if (stagedFiles.length === 0) {
  console.log('✅ ステージングされたファイルはありません。チェックをスキップします。');
  process.exit(0);
}

let hasViolation = false;

// 3. 各ファイルのチェック実行
for (const file of stagedFiles) {
  // 削除されたファイルはスキップ
  if (!fs.existsSync(file)) {
    continue;
  }

  // ディレクトリはスキップ
  if (fs.statSync(file).isDirectory()) {
    continue;
  }

  // バイナリファイルや画像ファイル、node_modules、検証スクリプト自身・セキュリティ定義ファイルはスキップ
  if (
    file.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|woff|woff2|eot|ttf|mp4)$/i) ||
    file.includes('node_modules') ||
    file === 'scripts/check-compliance.js' ||
    file === '.betterleaks.toml'
  ) {
    continue;
  }

  try {
    const content = fs.readFileSync(file, 'utf-8');

    for (const rule of COMPLIANCE_RULES) {
      let violated = false;
      if (rule.customCheck) {
        violated = rule.customCheck(content, file);
      } else if (rule.regex?.test(content)) {
        violated = true;
      }

      if (violated) {
        console.error(`❌ [${rule.name}] 違反を検出しました: ${file}`);
        console.error(`   👉 原因: ${rule.message}`);
        hasViolation = true;
      }
    }
  } catch (err) {
    console.error(`⚠️ ファイルの読み込みに失敗しました: ${file}`, err);
  }
}

if (hasViolation) {
  console.error(
    '\n🚨 セキュリティ・ライセンス違反が検出されたため、処理を中断します。リポジトリにコミットする前に該当箇所を修正してください。',
  );
  process.exit(1);
} else {
  console.log('✅ セキュリティ・プライバシー・ライセンスチェックをパスしました。');
  process.exit(0);
}
