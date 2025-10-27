#!/usr/bin/env node

/**
 * Phase1 削除機能レガシーコードの復元スクリプト
 * 使用方法: node src/archive/restoration-scripts/restore-phase1.js
 */

const fs = require('fs');
const path = require('path');

const ARCHIVE_DIR = path.join(__dirname, '../phase1-deletion-legacy');
const SRC_DIR = path.join(__dirname, '../..');

// 復元するファイルのマッピング
const filesToRestore = [
  {
    from: path.join(ARCHIVE_DIR, 'commands/DeleteCutCommand.ts'),
    to: path.join(SRC_DIR, 'application/commands/DeleteCutCommand.ts')
  },
  {
    from: path.join(ARCHIVE_DIR, 'commands/handlers/DeleteCutCommandHandler.ts'),
    to: path.join(SRC_DIR, 'application/commands/handlers/DeleteCutCommandHandler.ts')
  }
];

// HandlerRegistry.tsの修正内容
const handlerRegistryUpdates = {
  file: path.join(SRC_DIR, 'application/HandlerRegistry.ts'),
  updates: [
    {
      search: "// Phase1-Step1.2: DeleteCutCommandHandlerは無効化（CutDeletionService使用）\n// import { DeleteCutCommandHandler } from './commands/handlers/DeleteCutCommandHandler';",
      replace: "import { DeleteCutCommandHandler } from './commands/handlers/DeleteCutCommandHandler';"
    },
    {
      search: `    // Phase1-Step1.2: CommandBusのバイパス - DeleteCutCommandの登録を無効化
    // 削除処理は直接CutDeletionServiceを使用するように変更
    // this.commandBus.register(
    //   'DeleteCut',
    //   new DeleteCutCommandHandler(this.repository)
    // );`,
      replace: `    this.commandBus.register(
      'DeleteCut',
      new DeleteCutCommandHandler(this.repository)
    );`
    }
  ]
};

async function restorePhase1() {
  console.log('Phase1 削除機能レガシーコードの復元を開始...\n');
  
  let success = true;
  
  // 1. ファイルを復元
  console.log('1. ファイルの復元:');
  for (const file of filesToRestore) {
    try {
      if (!fs.existsSync(file.from)) {
        console.error(`  ❌ アーカイブファイルが見つかりません: ${file.from}`);
        success = false;
        continue;
      }
      
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(file.to);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // ファイルをコピー
      fs.copyFileSync(file.from, file.to);
      console.log(`  ✅ 復元: ${path.basename(file.to)}`);
    } catch (error) {
      console.error(`  ❌ エラー: ${file.to} - ${error.message}`);
      success = false;
    }
  }
  
  // 2. HandlerRegistry.tsを更新
  console.log('\n2. HandlerRegistry.tsの更新:');
  try {
    let content = fs.readFileSync(handlerRegistryUpdates.file, 'utf8');
    let updated = false;
    
    for (const update of handlerRegistryUpdates.updates) {
      if (content.includes(update.search)) {
        content = content.replace(update.search, update.replace);
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(handlerRegistryUpdates.file, content);
      console.log('  ✅ HandlerRegistry.tsを更新しました');
    } else {
      console.log('  ℹ️ HandlerRegistry.tsは既に復元されています');
    }
  } catch (error) {
    console.error(`  ❌ HandlerRegistry.tsの更新に失敗: ${error.message}`);
    success = false;
  }
  
  // 3. CutEvents.tsの確認
  console.log('\n3. 注意事項:');
  console.log('  ⚠️ CutDeletedEventを使用する場合は、CutEvents.tsに手動で追加してください');
  console.log('  ⚠️ または src/archive/phase1-deletion-legacy/events/CutDeletedEvent.ts を参照');
  
  // 4. 結果サマリー
  console.log('\n=== 復元結果 ===');
  if (success) {
    console.log('✅ Phase1レガシーコードの復元が完了しました');
    console.log('\n次のステップ:');
    console.log('1. TypeScriptのコンパイルを確認');
    console.log('2. test-api-mock.htmlで削除機能をテスト');
    console.log('3. 必要に応じてProgressTable.tsの削除処理を旧システムに戻す');
  } else {
    console.log('⚠️ 一部のファイルの復元に失敗しました');
    console.log('上記のエラーメッセージを確認してください');
  }
}

// 実行
restorePhase1().catch(error => {
  console.error('復元スクリプトエラー:', error);
  process.exit(1);
});