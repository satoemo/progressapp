import { UnifiedDataStore } from '../../data/UnifiedDataStore';
import { perfMonitor } from '../../utils/PerformanceMonitor';
import { CutData } from '@/types/cut';
import { DomainEvent } from '@/models/events/DomainEvent';
import { IRepository } from '@/types/repository';
import { IMemoRepository } from '@/data/IMemoRepository';
import { Logger } from '@/utils/Logger';

interface CutDataWrapper {
  getData(): CutData;
}

interface ExtendedRepository<T> extends IRepository<T> {
  findAll(): Promise<T[]>;
}

export class ReadModelUpdateService {
  constructor(
    private readonly unifiedStore: UnifiedDataStore,
    private readonly repository: ExtendedRepository<CutDataWrapper> | null,
    private readonly memoRepository: IMemoRepository | null,
    private readonly logger: Logger
  ) {}

  async updateReadModel(event: DomainEvent): Promise<void> {
    const aggregateId = event.aggregateId;
    const operationId = `updateReadModel-${aggregateId}-${Date.now()}`;
    perfMonitor.startOperation(operationId, 'updateReadModel', { aggregateId });
    
    try {
      switch (event.eventType) {
        case 'CutCreated':
          this.unifiedStore.handleCutCreated(event);
          break;
          
        case 'ProgressUpdated':
        case 'CostUpdated':
        case 'BasicInfoUpdated':
        case 'KenyoUpdated':
          // repositoryがnullの場合はApplicationFacadeから取得（Phase2移行対応）
          if (this.repository) {
            const cut = await this.repository.findById(aggregateId);
            if (cut) {
              this.unifiedStore.updateReadModel(aggregateId, cut.getData());
            }
          } else {
            // UnifiedDataStoreから直接取得
            const { ApplicationFacade } = await import('@/core/ApplicationFacade');
            const store = ApplicationFacade.getInstance().getUnifiedStore();
            const cutData = await store.load(aggregateId) as CutData | null;
            if (cutData) {
              this.unifiedStore.updateReadModel(aggregateId, cutData);
            }
          }
          break;
          
        case 'CutDeleted':
          // 削除されたカットをReadModelから除外
          this.unifiedStore.removeReadModel(aggregateId);
          break;
          
        case 'CellMemoUpdated':
        case 'CellMemoRemoved':
        case 'AllMemosLoaded':
          // memoRepositoryがnullでない場合のみ処理（Phase2移行対応）
          if (this.memoRepository) {
            const memoAggregate = await this.memoRepository.findOrCreate();
            if (memoAggregate) {
              const memoData = memoAggregate.getData();
              this.unifiedStore.updateMemoReadModel(memoData);
            }
          }
          break;
          
        default:
          this.logger.warn('Unknown event type in ReadModelUpdateService', { eventType: event.eventType });
      }
    } finally {
      perfMonitor.endOperation(operationId);
    }
  }
}