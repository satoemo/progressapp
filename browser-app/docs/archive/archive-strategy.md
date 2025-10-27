# アーカイブ戦略 - レガシーコードの安全な保管と管理
最終更新: 2025年9月1日

## 概要
Phase1-4の実装に伴い、旧システムのコードを即座に削除するのではなく、アーカイブフォルダに移動して管理する。これにより、リスクを最小化しながら段階的な移行を実現する。

## 基本方針

### 1. 削除ではなくアーカイブ
- **即座の削除は行わない**
- 動作確認期間を設ける
- 必要に応じて復元可能

### 2. 段階的な移行
- Phaseごとに対応するアーカイブフォルダを作成
- 機能単位でアーカイブ
- 依存関係を明確に記録

### 3. ドキュメント化
- 移動理由を明記
- 復元手順を記載
- 依存関係マップを作成

## アーカイブフォルダ構造

```
/src/archive/
├── README.md                        # アーカイブ全体の説明
├── restoration-scripts/              # 復元用スクリプト
│   ├── restore-phase1.js
│   ├── restore-phase2.js
│   ├── restore-phase3.js
│   └── restore-phase4.js
│
├── phase1-deletion-legacy/          # Phase1: 削除機能
│   ├── README.md                    # 移動理由と日時
│   ├── dependency-map.json          # 依存関係マップ
│   ├── commands/
│   │   ├── DeleteCutCommand.ts
│   │   └── handlers/
│   │       └── DeleteCutCommandHandler.ts
│   ├── events/
│   │   └── CutDeletedEvent.ts
│   └── services/
│       └── legacy-deletion/
│
├── phase2-cqrs-legacy/              # Phase2: CQRS/EventSourcing
│   ├── README.md
│   ├── dependency-map.json
│   ├── CommandBus.ts
│   ├── QueryBus.ts
│   ├── EventDispatcher.ts
│   ├── UnifiedEventCoordinator.ts
│   └── ReadModelUpdateService.ts
│
├── phase3-structure-legacy/         # Phase3: 旧ディレクトリ構造
│   ├── README.md
│   ├── dependency-map.json
│   ├── application/
│   ├── domain/
│   └── infrastructure/
│
└── phase4-state-legacy/            # Phase4: 旧状態管理
    ├── README.md
    ├── dependency-map.json
    ├── EventStore/
    ├── ReadModelStore/
    └── UnifiedStateManager/
```

## アーカイブプロセス

### Step 1: 事前準備
```bash
# 現在の状態を記録
git status > archive-log.txt
npm list > dependencies-before.txt

# アーカイブブランチ作成
git checkout -b archive-phase[N]
```

### Step 2: 依存関係の分析
```javascript
// scripts/analyze-dependencies.js
const analyzeDependencies = (targetFiles) => {
  const dependencies = {
    imports: [],      // このファイルがimportしているもの
    importedBy: [],   // このファイルをimportしているもの
    tests: [],        // 関連するテストファイル
    configs: []       // 関連する設定ファイル
  };
  
  // 分析処理...
  return dependencies;
};
```

### Step 3: アーカイブ実行
```javascript
// scripts/archive-files.js
const archiveFiles = async (phase, files) => {
  for (const file of files) {
    // 1. アーカイブ先ディレクトリ作成
    await createArchiveDir(phase, file);
    
    // 2. ファイルをコピー
    await copyFile(file, getArchivePath(phase, file));
    
    // 3. メタデータを記録
    await recordMetadata(phase, file, {
      archivedAt: new Date(),
      reason: getArchiveReason(phase),
      originalPath: file,
      dependencies: await analyzeDependencies(file)
    });
    
    // 4. 元ファイルを削除（オプション）
    if (shouldDelete) {
      await deleteOriginal(file);
    }
  }
};
```

### Step 4: ドキュメント生成
```markdown
# テンプレート: src/archive/phase[N]-[name]-legacy/README.md

## アーカイブ情報
- **移動日**: YYYY-MM-DD
- **実行者**: [実行者名]
- **Phase**: [N] ([Phase名])
- **理由**: [詳細な理由]

## 移動したファイル
| ファイル | 元のパス | 移動理由 |
|---------|---------|---------|
| File1.ts | src/... | 新システムで代替 |
| File2.ts | src/... | 不要になった |

## 依存関係
### このコードを使用していた箇所
- [ ] ProgressTable.ts - 新サービスに切り替え済み
- [ ] ApplicationFacade.ts - 参照を削除済み

### このコードが依存していたもの
- Repository（引き続き使用中）
- EventStore（Phase4でアーカイブ予定）

## 復元方法
### 自動復元
```bash
npm run restore:phase[N]
```

### 手動復元
1. アーカイブフォルダから元の場所にコピー
2. import文を復活
3. 設定ファイルを更新

## 削除までのスケジュール
- アーカイブ日: YYYY-MM-DD
- 観察期間: 2週間
- 削除予定日: YYYY-MM-DD（問題がなければ）
```

## 復元スクリプト

### 基本構造
```javascript
// restoration-scripts/restore-phase[N].js
const restorePhase = async (phaseNumber) => {
  console.log(`Phase ${phaseNumber} の復元を開始...`);
  
  // 1. アーカイブファイルのリスト取得
  const archivedFiles = await getArchivedFiles(phaseNumber);
  
  // 2. 各ファイルを復元
  for (const file of archivedFiles) {
    await restoreFile(file);
    await restoreImports(file);
    await restoreConfigs(file);
  }
  
  // 3. TypeScriptコンパイル確認
  await verifyCompilation();
  
  // 4. テスト実行
  await runTests();
  
  console.log(`Phase ${phaseNumber} の復元完了`);
};
```

## メタデータ管理

### dependency-map.json
```json
{
  "phase": 1,
  "archivedAt": "2025-09-01T10:00:00Z",
  "files": [
    {
      "name": "DeleteCutCommand.ts",
      "originalPath": "src/application/commands/DeleteCutCommand.ts",
      "archivePath": "src/archive/phase1-deletion-legacy/commands/DeleteCutCommand.ts",
      "imports": [
        "src/domain/types.ts"
      ],
      "importedBy": [
        "src/application/HandlerRegistry.ts",
        "src/application/commands/handlers/DeleteCutCommandHandler.ts"
      ],
      "status": "archived",
      "canDelete": false,
      "deleteAfter": "2025-09-15"
    }
  ]
}
```

## アーカイブポリシー

### 保持期間
| Phase | 観察期間 | 削除可能時期 |
|-------|---------|-------------|
| Phase 1 | 2週間 | 動作確認後 |
| Phase 2 | 3週間 | Phase3完了後 |
| Phase 3 | 4週間 | Phase4完了後 |
| Phase 4 | 1ヶ月 | 全Phase完了後 |

### 削除基準
1. **観察期間経過**: 指定期間内に問題なし
2. **代替機能確認**: 新システムが完全に機能
3. **依存なし**: 他のコードから参照されていない
4. **テスト合格**: 全テストが新システムで合格

### 永続保管対象
- 重要なビジネスロジック
- 将来参照の可能性があるアルゴリズム
- ドキュメント的価値があるコード

## モニタリング

### チェック項目
```javascript
// scripts/monitor-archive.js
const monitorArchive = async () => {
  const report = {
    totalArchived: 0,
    byPhase: {},
    canDelete: [],
    requiresAttention: []
  };
  
  // 各アーカイブをチェック
  for (const phase of getPhases()) {
    const files = await getArchivedFiles(phase);
    
    for (const file of files) {
      // 削除可能かチェック
      if (await canDelete(file)) {
        report.canDelete.push(file);
      }
      
      // 問題がないかチェック
      if (await hasIssues(file)) {
        report.requiresAttention.push(file);
      }
    }
  }
  
  return report;
};
```

## 最終的な削除

### 削除前チェックリスト
- [ ] 観察期間が経過
- [ ] 新システムで全機能が動作
- [ ] 全テストが合格
- [ ] チーム全員の承認
- [ ] バックアップ作成済み

### 削除実行
```bash
# 最終バックアップ
tar -czf archive-backup-$(date +%Y%m%d).tar.gz src/archive/

# 削除実行
npm run cleanup:archive -- --phase=1 --confirm

# Gitから完全削除
git rm -r src/archive/phase1-deletion-legacy/
git commit -m "cleanup: Phase1のアーカイブを削除（観察期間終了）"
```

## 利点

1. **リスク最小化**: 即座の削除によるリスクを回避
2. **段階的移行**: 問題があれば即座に復元可能
3. **学習資料**: 新メンバーが旧実装を参照可能
4. **監査対応**: 変更履歴の完全な保持
5. **心理的安全性**: 削除への抵抗感を軽減

## 注意事項

### してはいけないこと
- アーカイブなしでの削除
- ドキュメントなしでの移動
- 依存関係を無視した移動
- テストなしでの削除

### 推奨事項
- 小さな単位でアーカイブ
- 十分な観察期間を設ける
- チーム全員に通知
- 定期的なモニタリング

---
*このドキュメントはアーカイブ戦略のガイドラインです。各Phaseの実装時に参照し、安全な移行を実現してください。*