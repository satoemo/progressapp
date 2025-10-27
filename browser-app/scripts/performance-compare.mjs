#!/usr/bin/env node
/**
 * パフォーマンス比較スクリプト
 * ベースラインとの差分を表示
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const metricsDir = path.join(rootDir, 'metrics');

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

// パーセンテージ変化を計算
function calculatePercentChange(baseline, current) {
  if (!baseline || baseline === 0) return 'N/A';
  const change = ((current - baseline) / baseline) * 100;
  return change.toFixed(2);
}

// 変化の色を決定
function getChangeColor(baseline, current, inverseGood = false) {
  const change = current - baseline;
  if (change === 0) return 'yellow';
  if (inverseGood) {
    return change > 0 ? 'red' : 'green';
  }
  return change > 0 ? 'green' : 'red';
}

// 比較結果を表示
function displayComparison(baseline, current) {
  log('\n========================================', 'blue');
  log('パフォーマンス比較レポート', 'blue');
  log('========================================', 'blue');
  
  // ファイルメトリクス
  log('\n📊 ファイルメトリクス:', 'yellow');
  if (baseline.fileMetrics && current.fileMetrics) {
    const tsFilesChange = current.fileMetrics.tsFiles - baseline.fileMetrics.tsFiles;
    const linesChange = current.fileMetrics.totalLines - baseline.fileMetrics.totalLines;
    const facadeChange = current.fileMetrics.applicationFacadeLines - baseline.fileMetrics.applicationFacadeLines;
    const scRefsChange = current.fileMetrics.serviceContainerReferences - baseline.fileMetrics.serviceContainerReferences;
    
    log(`  TypeScriptファイル数: ${baseline.fileMetrics.tsFiles} → ${current.fileMetrics.tsFiles} (${tsFilesChange >= 0 ? '+' : ''}${tsFilesChange})`, 
        getChangeColor(baseline.fileMetrics.tsFiles, current.fileMetrics.tsFiles, true));
    
    log(`  総行数: ${baseline.fileMetrics.totalLines} → ${current.fileMetrics.totalLines} (${linesChange >= 0 ? '+' : ''}${linesChange})`,
        getChangeColor(baseline.fileMetrics.totalLines, current.fileMetrics.totalLines, true));
    
    if (baseline.fileMetrics.applicationFacadeLines) {
      log(`  ApplicationFacade: ${baseline.fileMetrics.applicationFacadeLines} → ${current.fileMetrics.applicationFacadeLines} 行 (${facadeChange >= 0 ? '+' : ''}${facadeChange})`,
          getChangeColor(baseline.fileMetrics.applicationFacadeLines, current.fileMetrics.applicationFacadeLines, true));
    }
    
    log(`  ServiceContainer参照: ${baseline.fileMetrics.serviceContainerReferences} → ${current.fileMetrics.serviceContainerReferences} 箇所 (${scRefsChange >= 0 ? '+' : ''}${scRefsChange})`,
        getChangeColor(baseline.fileMetrics.serviceContainerReferences, current.fileMetrics.serviceContainerReferences, true));
  }
  
  // ビルドパフォーマンス
  log('\n📊 ビルドパフォーマンス:', 'yellow');
  if (baseline.build && current.build) {
    const typecheckChange = calculatePercentChange(baseline.build.typecheck, current.build.typecheck);
    const buildChange = calculatePercentChange(baseline.build.total, current.build.total);
    
    log(`  TypeScript型チェック: ${baseline.build.typecheck}ms → ${current.build.typecheck}ms (${typecheckChange}%)`,
        getChangeColor(baseline.build.typecheck, current.build.typecheck, true));
    
    log(`  総ビルド時間: ${baseline.build.total}ms → ${current.build.total}ms (${buildChange}%)`,
        getChangeColor(baseline.build.total, current.build.total, true));
  }
  
  // テストカバレッジ
  log('\n📊 テストカバレッジ:', 'yellow');
  if (baseline.test?.coverage && current.test?.coverage && 
      baseline.test.coverage !== 'Not measured' && current.test.coverage !== 'Not measured') {
    const coverageChange = current.test.coverage.lines - baseline.test.coverage.lines;
    log(`  行カバレッジ: ${baseline.test.coverage.lines}% → ${current.test.coverage.lines}% (${coverageChange >= 0 ? '+' : ''}${coverageChange}%)`,
        getChangeColor(baseline.test.coverage.lines, current.test.coverage.lines));
  } else {
    log(`  テストカバレッジ: 測定データなし`, 'yellow');
  }
  
  // サマリー
  log('\n📊 改善サマリー:', 'blue');
  const improvements = [];
  const degradations = [];
  
  if (baseline.fileMetrics && current.fileMetrics) {
    const scRefsChange = current.fileMetrics.serviceContainerReferences - baseline.fileMetrics.serviceContainerReferences;
    if (scRefsChange < 0) improvements.push(`ServiceContainer参照: ${Math.abs(scRefsChange)}箇所削減`);
    if (scRefsChange > 0) degradations.push(`ServiceContainer参照: ${scRefsChange}箇所増加`);
    
    const facadeChange = current.fileMetrics.applicationFacadeLines - baseline.fileMetrics.applicationFacadeLines;
    if (facadeChange < 0) improvements.push(`ApplicationFacade: ${Math.abs(facadeChange)}行削減`);
    if (facadeChange > 0) degradations.push(`ApplicationFacade: ${facadeChange}行増加`);
  }
  
  if (baseline.build && current.build) {
    const buildChange = current.build.total - baseline.build.total;
    if (buildChange < 0) improvements.push(`ビルド時間: ${Math.abs(buildChange)}ms短縮`);
    if (buildChange > 0) degradations.push(`ビルド時間: ${buildChange}ms増加`);
  }
  
  if (improvements.length > 0) {
    log('\n  ✅ 改善項目:', 'green');
    improvements.forEach(item => log(`    - ${item}`, 'green'));
  }
  
  if (degradations.length > 0) {
    log('\n  ⚠️ 劣化項目:', 'red');
    degradations.forEach(item => log(`    - ${item}`, 'red'));
  }
  
  if (improvements.length === 0 && degradations.length === 0) {
    log('  変化なし', 'yellow');
  }
}

// 現在のメトリクスを測定
async function measureCurrent() {
  log('現在のメトリクスを測定中...', 'blue');
  try {
    execSync('node scripts/performance-baseline.mjs', { 
      cwd: rootDir,
      stdio: 'inherit'
    });
    return JSON.parse(fs.readFileSync(path.join(metricsDir, 'baseline-latest.json'), 'utf8'));
  } catch (error) {
    log(`エラー: ${error.message}`, 'red');
    return null;
  }
}

// メイン実行
async function main() {
  // ベースラインファイルを探す
  const baselineFiles = fs.readdirSync(metricsDir)
    .filter(f => f.startsWith('baseline-') && f.endsWith('.json') && f !== 'baseline-latest.json')
    .sort()
    .reverse();
  
  if (baselineFiles.length === 0) {
    log('ベースラインが見つかりません。先に npm run perf:baseline を実行してください。', 'red');
    process.exit(1);
  }
  
  // 最新のベースラインを読み込み
  const baselinePath = path.join(metricsDir, baselineFiles[0]);
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  
  log(`ベースライン: ${baselineFiles[0]}`, 'blue');
  
  // 現在のメトリクスを測定
  const current = await measureCurrent();
  
  if (!current) {
    log('現在のメトリクスの測定に失敗しました。', 'red');
    process.exit(1);
  }
  
  // 比較結果を表示
  displayComparison(baseline, current);
}

// 実行
main().catch(error => {
  log(`エラー: ${error.message}`, 'red');
  process.exit(1);
});