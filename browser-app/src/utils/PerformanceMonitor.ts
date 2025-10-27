import { LoggerFactory } from './Logger';
import { DataProcessor } from '../ui/shared/utils/DataProcessor';

const logger = LoggerFactory.create('PerformanceMonitor');

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * 集計されたメトリクス
 */
export interface AggregatedMetrics {
  name: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
}

/**
 * パフォーマンスモニター
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private activeOperations: Map<string, PerformanceMetrics> = new Map();

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 計測を開始
   */
  startOperation(operationId: string, name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetrics = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.activeOperations.set(operationId, metric);
    logger.trace(`Operation started: ${name}`, { operationId, metadata });
  }

  /**
   * 計測を終了
   */
  endOperation(operationId: string): void {
    const metric = this.activeOperations.get(operationId);
    if (!metric) {
      logger.warn(`Operation not found: ${operationId}`);
      return;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // メトリクスを保存
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    this.metrics.get(metric.name)!.push(metric);

    // アクティブな操作から削除
    this.activeOperations.delete(operationId);

    logger.debug(`Operation completed: ${metric.name}`, {
      operationId,
      duration: `${metric.duration.toFixed(2)}ms`
    });
  }

  /**
   * 同期的な操作を計測
   */
  measure<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    this.startOperation(operationId, name, metadata);
    
    try {
      const result = operation();
      return result;
    } finally {
      this.endOperation(operationId);
    }
  }

  /**
   * 非同期操作を計測
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const operationId = `${name}_${Date.now()}_${Math.random()}`;
    this.startOperation(operationId, name, metadata);
    
    try {
      const result = await operation();
      return result;
    } finally {
      this.endOperation(operationId);
    }
  }

  /**
   * メトリクスを集計
   */
  getAggregatedMetrics(name?: string): AggregatedMetrics[] {
    const results: AggregatedMetrics[] = [];
    
    const metricsToAggregate = name 
      ? [{ name, metrics: this.metrics.get(name) || [] }]
      : Array.from(this.metrics.entries()).map(([name, metrics]) => ({ name, metrics }));

    for (const { name, metrics } of metricsToAggregate) {
      if (metrics.length === 0) continue;

      const durations = metrics
        .filter(m => m.duration !== undefined)
        .map(m => m.duration!);

      if (durations.length === 0) continue;

      const totalDuration = DataProcessor.sum(durations);
      const averageDuration = DataProcessor.average(durations);
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      results.push({
        name,
        count: durations.length,
        totalDuration,
        averageDuration,
        minDuration,
        maxDuration
      });
    }

    return results;
  }

  /**
   * アクティブな操作を取得
   */
  getActiveOperations(): Map<string, PerformanceMetrics> {
    return new Map(this.activeOperations);
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * レポートを生成
   */
  generateReport(): string {
    const aggregated = this.getAggregatedMetrics();
    const active = this.getActiveOperations();

    let report = 'Performance Report\n';
    report += '==================\n\n';

    report += 'Completed Operations:\n';
    for (const metric of aggregated) {
      report += `  ${metric.name}:\n`;
      report += `    Count: ${metric.count}\n`;
      report += `    Average: ${metric.averageDuration.toFixed(2)}ms\n`;
      report += `    Min: ${metric.minDuration.toFixed(2)}ms\n`;
      report += `    Max: ${metric.maxDuration.toFixed(2)}ms\n`;
      report += `    Total: ${metric.totalDuration.toFixed(2)}ms\n\n`;
    }

    if (active.size > 0) {
      report += '\nActive Operations:\n';
      for (const [id, metric] of active) {
        const elapsed = performance.now() - metric.startTime;
        report += `  ${metric.name} (${id}): ${elapsed.toFixed(2)}ms elapsed\n`;
      }
    }

    return report;
  }
}

/**
 * デコレーター：メソッドのパフォーマンスを計測
 */
export function measurePerformance(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const monitor = PerformanceMonitor.getInstance();
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return await monitor.measureAsync(
        metricName,
        async () => await originalMethod.apply(this, args),
        { className: target.constructor.name, method: propertyKey }
      );
    };

    return descriptor;
  };
}

/**
 * 便利なヘルパー関数
 */
export const perfMonitor = PerformanceMonitor.getInstance();