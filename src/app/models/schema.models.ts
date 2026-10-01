export interface Column {
  id: string;
  name: string;
  type: string;
  isPK?: boolean;
  isFK?: boolean;
  isUQ?: boolean;
  isNN?: boolean;
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  columns: Column[];
  x: number;
  y: number;
}

export type RelationType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';

export interface Relation {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: RelationType;
}

export interface DatabaseSchema {
  name: string;
  version: string;
  tables: Table[];
  relations: Relation[];
}
