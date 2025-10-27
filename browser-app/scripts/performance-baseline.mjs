#!/usr/bin/env node
/**
 * パフォーマンス測定基準スクリプト
 * Phase 0: パフォーマンス測定基準の設定
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// 測定結果を保存するオブジェクト
const metrics = {
  timestamp: new Date().toISOString(),
  build: {},
  test: {},
  fileMetrics: {},
  memory: {}
};

// 色付きコンソール出力用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 1. ビルド時間の測定
function measureBuildTime() {
  log('\n📊 ビルド時間の測定...', 'blue');
  
  try {
    // TypeScriptコンパイル時間
    const tscStart = Date.now();
    execSync('npx tsc -p config/tsconfig.json --noEmit', { cwd: rootDir });
    const tscTime = Date.now() - tscStart;
    metrics.build.typecheck = tscTime;
    log(`  TypeScript型チェック: ${tscTime}ms`, 'green');
    
    // Viteビルド時間
    const buildStart = Date.now();
    execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });
    const buildTime = Date.now() - buildStart;
    metrics.build.total = buildTime;
    log(`  総ビルド時間: ${buildTime}ms`, 'green');
  } catch (error) {
    log(`  ビルドエラー: ${error.message}`, 'red');
    metrics.build.error = error.message;
  }
}

// 2. ファイルメトリクスの測定
function measureFileMetrics() {
  log('\n📊 ファイルメトリクスの測定...', 'blue');
  
  try {
    // TypeScriptファイル数
    const tsFiles = execSync('find src -name "*.ts" -o -name "*.tsx" | wc -l', { 
      cwd: rootDir, 
      encoding: 'utf8' 
    }).trim();
    metrics.fileMetrics.tsFiles = parseInt(tsFiles);
    log(`  TypeScriptファイル数: ${tsFiles}`, 'green');
    
    // 総行数
    const totalLines = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1', { 
      cwd: rootDir, 
      encoding: 'utf8' 
    }).trim().split(/\s+/)[0];
    metrics.fileMetrics.totalLines = parseInt(totalLines);
    log(`  総行数: ${totalLines}`, 'green');
    
    // ApplicationFacadeの行数
    try {
      const facadeLines = execSync('wc -l src/application/ApplicationFacade.ts', {
        cwd: rootDir,
        encoding: 'utf8'
      }).trim().split(/\s+/)[0];
      metrics.fileMetrics.applicationFacadeLines = parseInt(facadeLines);
      log(`  ApplicationFacade行数: ${facadeLines}`, 'yellow');
    } catch {
      log(`  ApplicationFacade: ファイルが見つかりません`, 'yellow');
    }
    
    // ServiceContainer使用箇所
    const serviceContainerUsage = execSync('grep -r "ServiceContainer" src/ --include="*.ts" | grep -v "ServiceContainer.ts" | wc -l', {
      cwd: rootDir,
      encoding: 'utf8'
    }).trim();
    metrics.fileMetrics.serviceContainerReferences = parseInt(serviceContainerUsage);
    log(`  ServiceContainer参照箇所: ${serviceContainerUsage}`, 'green');
    
  } catch (error) {
    log(`  メトリクスエラー: ${error.message}`, 'red');
    metrics.fileMetrics.error = error.message;
  }
}

// 3. テストカバレッジの測定
function measureTestCoverage() {
  log('\n📊 テストカバレッジの測定...', 'blue');
  log('  (初回実行のため時間がかかる場合があります)', 'yellow');
  
  try {
    const coverageOutput = execSync('npm run test:coverage -- --silent --json --outputFile=coverage/coverage-summary.json', {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // カバレッジサマリーファイルを読み込む
    const coveragePath = path.join(rootDir, 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      if (coverage.total) {
        metrics.test.coverage = {
          lines: coverage.total.lines.pct,
          statements: coverage.total.statements.pct,
          functions: coverage.total.functions.pct,
          branches: coverage.total.branches.pct
        };
        log(`  行カバレッジ: ${coverage.total.lines.pct}%`, 'green');
        log(`  文カバレッジ: ${coverage.total.statements.pct}%`, 'green');
        log(`  関数カバレッジ: ${coverage.total.functions.pct}%`, 'green');
        log(`  分岐カバレッジ: ${coverage.total.branches.pct}%`, 'green');
      }
    }
  } catch (error) {
    log(`  テストカバレッジ: 未設定（テストが少ない可能性）`, 'yellow');
    metrics.test.coverage = 'Not measured';
  }
}

// 4. メモリ使用量の測定（ビルドディレクトリサイズ）
function measureMemoryUsage() {
  log('\n📊 ビルドサイズの測定...', 'blue');
  
  try {
    const distSize = execSync('du -sh dist 2>/dev/null || echo "0"', {
      cwd: rootDir,
      encoding: 'utf8'
    }).trim().split('\t')[0];
    metrics.memory.distSize = distSize;
    log(`  distディレクトリサイズ: ${distSize}`, 'green');
    
    const nodeModulesSize = execSync('du -sh node_modules 2>/dev/null || echo "0"', {
      cwd: rootDir,
      encoding: 'utf8'
    }).trim().split('\t')[0];
    metrics.memory.nodeModulesSize = nodeModulesSize;
    log(`  node_modulesサイズ: ${nodeModulesSize}`, 'green');
  } catch (error) {
    log(`  サイズ測定エラー: ${error.message}`, 'red');
  }
}

// 5. 結果の保存
function saveResults() {
  const baselineDir = path.join(rootDir, 'metrics');
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir);
  }
  
  const filename = `baseline-${new Date().toISOString().split('T')[0]}.json`;
  const filepath = path.join(baselineDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(metrics, null, 2));
  log(`\n✅ 測定結果を保存しました: ${filepath}`, 'green');
  
  // 最新のベースラインとしても保存
  const latestPath = path.join(baselineDir, 'baseline-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(metrics, null, 2));
  log(`✅ 最新のベースラインを更新: ${latestPath}`, 'green');
}

// メイン実行
function main() {
  log('========================================', 'blue');
  log('パフォーマンス測定基準の設定', 'blue');
  log('========================================', 'blue');
  
  measureFileMetrics();
  measureBuildTime();
  measureTestCoverage();
  measureMemoryUsage();
  saveResults();
  
  log('\n========================================', 'blue');
  log('測定完了！', 'green');
  log('========================================', 'blue');
  
  // サマリー表示
  log('\n📊 サマリー:', 'yellow');
  log(`  TypeScriptファイル: ${metrics.fileMetrics.tsFiles}個`);
  log(`  総行数: ${metrics.fileMetrics.totalLines}行`);
  log(`  ビルド時間: ${metrics.build.total}ms`);
  log(`  ServiceContainer参照: ${metrics.fileMetrics.serviceContainerReferences}箇所`);
  if (metrics.test.coverage && metrics.test.coverage !== 'Not measured') {
    log(`  テストカバレッジ: ${metrics.test.coverage.lines}%`);
  }
}

// 実行
main();