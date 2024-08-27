# 開発者向け情報

## Requirements

- Node.js
  - v22.7.0で動作確認済み
  - 最新のLTSバージョンであれば動作すると思われます。
- npm
  - 10.8.2で動作確認済み
  - 最新のLTSバージョンであれば動作すると思われます。

## 環境構築

依存ライブラリのインストールが必要です。
```bash
npm i
```

## コマンド

### Build

`./dist/main.mjs`にバンドルされたjsファイルが出力されます。
```bash
npm run build
```

### Lint

```bash
npm run lint
```

### 型チェック

```bash
npm run type-check
```
