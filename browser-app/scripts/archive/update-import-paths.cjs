#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// インポートパスのマッピング定義
const pathMappings = [
  // コア層
  { from: '@/application/ApplicationFacade', to: '@/core/ApplicationFacade' },
  { from: '@/application/AppInitializer', to: '@/core/AppInitializer' },
  { from: '@/application/EventDispatcher', to: '@/core/EventDispatcher' },
  { from: '@/application/UnifiedEventCoordinator', to: '@/core/coordinators/UnifiedEventCoordinator' },
  { from: '@/application/interfaces/IDataAccessFacade', to: '@/core/interfaces/IDataAccessFacade' },
  { from: '@/application/types/notifications', to: '@/core/types/notifications' },
  
  // サービス層
  { from: '@/application/state/DebouncedSyncManager', to: '@/services/state/DebouncedSyncManager' },
  { from: '@/application/state/UnifiedStateManager', to: '@/services/state/UnifiedStateManager' },
  { from: '@/application/services/StateManagerService', to: '@/services/state/StateManagerService' },
  { from: '@/application/services/RealtimeSyncService', to: '@/services/sync/RealtimeSyncService' },
  { from: '@/application/services/ReadModelUpdateService', to: '@/services/sync/ReadModelUpdateService' },
  { from: '@/application/services/PDFExportService', to: '@/services/export/PDFExportService' },
  { from: '@/application/services/KintoneUICustomizationService', to: '@/services/kintone/KintoneUICustomizationService' },
  { from: '@/domain/services/CutStatusCalculator', to: '@/services/domain/CutStatusCalculator' },
  { from: '@/domain/services/ProgressFieldService', to: '@/services/domain/ProgressFieldService' },
  
  // データ層
  { from: '@/infrastructure/UnifiedDataStore', to: '@/data/UnifiedDataStore' },
  { from: '@/infrastructure/IMemoRepository', to: '@/data/IMemoRepository' },
  { from: '@/infrastructure/CutReadModel', to: '@/data/models/CutReadModel' },
  { from: '@/infrastructure/MemoReadModel', to: '@/data/models/MemoReadModel' },
  { from: '@/infrastructure/api/IKintoneApiClient', to: '@/data/api/IKintoneApiClient' },
  { from: '@/infrastructure/api/KintoneApiClient', to: '@/data/api/KintoneApiClient' },
  { from: '@/infrastructure/api/KintoneJsonMapper', to: '@/data/api/KintoneJsonMapper' },
  { from: '@/infrastructure/api/MockKintoneApiClient', to: '@/data/api/MockKintoneApiClient' },
  
  // モデル層
  { from: '@/domain/entities/CellMemoCollection', to: '@/models/entities/CellMemoCollection' },
  { from: '@/domain/events/DomainEvent', to: '@/models/events/DomainEvent' },
  { from: '@/domain/events/CutEvents', to: '@/models/events/CutEvents' },
  { from: '@/domain/events/CellMemoEvents', to: '@/models/events/CellMemoEvents' },
  { from: '@/domain/events/SimulationEvents', to: '@/models/events/SimulationEvents' },
  { from: '@/domain/value-objects/Money', to: '@/models/values/Money' },
  { from: '@/domain/value-objects/CutNumber', to: '@/models/values/CutNumber' },
  { from: '@/domain/value-objects/CellMemo', to: '@/models/values/CellMemo' },
  { from: '@/domain/value-objects/ProgressStatus', to: '@/models/values/ProgressStatus' },
  { from: '@/domain/field-metadata/FieldMetadataRegistry', to: '@/models/metadata/FieldMetadataRegistry' },
  { from: '@/domain/types', to: '@/models/types' },
  
  // ユーティリティ
  { from: '@/infrastructure/Logger', to: '@/utils/Logger' },
  { from: '@/infrastructure/PerformanceMonitor', to: '@/utils/PerformanceMonitor' },
  
  // 相対パスのマッピング（RealtimeSyncService用）
  { from: '../../application/services/RealtimeSyncService', to: '../../services/sync/RealtimeSyncService' }
];

// 相対パスを処理するための追加マッピング生成
function generateRelativePathMappings() {
  const relativeMappings = [];
  
  // applicationからの相対パス
  relativeMappings.push(
    { from: '../application/ApplicationFacade', to: '../core/ApplicationFacade' },
    { from: '../../application/ApplicationFacade', to: '../../core/ApplicationFacade' },
    { from: '../../../application/ApplicationFacade', to: '../../../core/ApplicationFacade' }
  );
  
  // infrastructureからの相対パス
  relativeMappings.push(
    { from: '../infrastructure/UnifiedDataStore', to: '../data/UnifiedDataStore' },
    { from: '../../infrastructure/UnifiedDataStore', to: '../../data/UnifiedDataStore' },
    { from: '../../../infrastructure/UnifiedDataStore', to: '../../../data/UnifiedDataStore' }
  );
  
  // domainからの相対パス
  relativeMappings.push(
    { from: '../domain/types', to: '../models/types' },
    { from: '../../domain/types', to: '../../models/types' },
    { from: '../../../domain/types', to: '../../../models/types' }
  );
  
  return relativeMappings;
}

// TypeScriptファイルを再帰的に検索
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // node_modulesとarchiveは除外
      if (item !== 'node_modules' && item !== 'archive') {
        findTsFiles(fullPath, files);
      }
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// ファイル内のインポートパスを更新
function updateImportPaths(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const allMappings = [...pathMappings, ...generateRelativePathMappings()];
  
  // 長いパスから短いパスの順にソート（部分一致を防ぐ）
  allMappings.sort((a, b) => b.from.length - a.from.length);
  
  allMappings.forEach(mapping => {
    // import文の更新
    const importRegex = new RegExp(
      `(import\\s+[^'"]*['"])${escapeRegex(mapping.from)}(['"])`,
      'g'
    );
    const newContent = content.replace(importRegex, `$1${mapping.to}$2`);
    
    // import()動的インポートの更新
    const dynamicImportRegex = new RegExp(
      `(import\\(['"])${escapeRegex(mapping.from)}(['"]\\))`,
      'g'
    );
    const newContent2 = newContent.replace(dynamicImportRegex, `$1${mapping.to}$2`);
    
    // export fromの更新
    const exportRegex = new RegExp(
      `(export\\s+[^'"]*from\\s+['"])${escapeRegex(mapping.from)}(['"])`,
      'g'
    );
    const newContent3 = newContent2.replace(exportRegex, `$1${mapping.to}$2`);
    
    if (newContent3 !== content) {
      modified = true;
      content = newContent3;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  
  return false;
}

// 正規表現エスケープ
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// メイン処理
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const tsFiles = findTsFiles(srcDir);
  
  console.log(`Found ${tsFiles.length} TypeScript files`);
  
  let updatedCount = 0;
  tsFiles.forEach(file => {
    if (updateImportPaths(file)) {
      updatedCount++;
      console.log(`Updated: ${path.relative(srcDir, file)}`);
    }
  });
  
  console.log(`\nTotal files updated: ${updatedCount}`);
}

// 実行
if (require.main === module) {
  main();
}