# 学習記録

実装過程で学んだ技術、設計パターン、トラブルシューティングなどを記録するディレクトリです。

## 記録の目的

1. **知識の定着**: 実装で得た学びを言語化して理解を深める
2. **振り返り**: 後から同じ課題に直面したときの参考資料
3. **チーム共有**: 他のメンバーが同様の実装をする際のガイド

## ディレクトリ構成

```
learning/
├── README.md                          # このファイル
├── templates/
│   └── learning-note.md               # 学習記録テンプレート
├── 2025-10-27-cloudflare-workers.md   # Cloudflare Workers学習記録
├── 2025-10-27-claude-api.md           # Claude API学習記録
└── ...
```

## 記録のタイミング

- 新しい技術を学んだとき
- 設計上の重要な決定をしたとき
- トラブルシューティングで解決策を見つけたとき
- CodeRabbitから有益なフィードバックを得たとき
- リファクタリングで改善できたとき

## テンプレートの使用方法

`templates/learning-note.md` をコピーして、日付とトピック名でファイルを作成：

```bash
cp browser-app/docs/learning/templates/learning-note.md \
   browser-app/docs/learning/2025-10-27-your-topic.md
```

## 命名規則

```
YYYY-MM-DD-トピック名.md
```

例：
- `2025-10-27-cors-configuration.md`
- `2025-10-28-typescript-generics.md`
- `2025-10-29-error-handling-patterns.md`
