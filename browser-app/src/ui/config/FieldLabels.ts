import { FieldKey } from '@/models/types';
import { FieldMetadataRegistry } from '@/models/metadata/FieldMetadataRegistry';

/**
 * フィールドラベル定義
 * FieldMetadataRegistryから自動生成
 */
export const FIELD_LABELS: Record<FieldKey, string> = FieldMetadataRegistry.getInstance().generateFieldLabels();