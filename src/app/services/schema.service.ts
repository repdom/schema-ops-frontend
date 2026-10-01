import { Injectable, signal, computed } from '@angular/core';
import { DatabaseSchema, Table, Column, Relation, RelationType } from '../models/schema.models';

@Injectable({
  providedIn: 'root'
})
export class SchemaService {
  readonly schema = signal<DatabaseSchema>({
    name: 'E-commerce Microservices',
    version: 'v1.0.0',
    tables: [
      {
        id: '1',
        name: 'Users',
        description: 'Core user account data including authentication details.',
        x: 180,
        y: 150,
        columns: [
          { id: '1-1', name: 'id', type: 'UUID', isPK: true },
          { id: '1-2', name: 'email', type: 'VARCHAR', isUQ: true, isNN: true },
          { id: '1-3', name: 'created_at', type: 'TIMESTAMP', isNN: true }
        ]
      },
      {
        id: '2',
        name: 'Orders',
        x: 560,
        y: 200,
        columns: [
          { id: '2-1', name: 'id', type: 'UUID', isPK: true },
          { id: '2-2', name: 'user_id', type: 'UUID', isFK: true, isNN: true },
          { id: '2-3', name: 'total', type: 'DECIMAL', isNN: true }
        ]
      }
    ],
    relations: [
      {
        id: 'r1',
        sourceTableId: '1',
        sourceColumnId: '1-1',
        targetTableId: '2',
        targetColumnId: '2-2',
        type: 'ONE_TO_MANY' as RelationType
      }
    ]
  });

  readonly selectedTableId = signal<string | null>(null);
  readonly explorerVisible = signal<boolean>(true);
  addRelation(sourceTableId: string, targetTableId: string, type: RelationType = 'ONE_TO_MANY') {
    if (sourceTableId === targetTableId) return;
    const already = this.schema().relations.some(
      r => r.sourceTableId === sourceTableId && r.targetTableId === targetTableId
    );
    if (already) return;

    const s = this.schema();
    const sourceTable = s.tables.find(t => t.id === sourceTableId)!;
    const sourcePK = sourceTable?.columns.find(c => c.isPK);

    let fkColumnId = '';
    let updatedTables = s.tables;

    // For ONE_TO_ONE and ONE_TO_MANY: inject FK column into target table if source has a PK
    if (type !== 'MANY_TO_MANY' && sourcePK) {
      const fkName = `${sourceTable.name.toLowerCase()}_id`;
      const targetTable = s.tables.find(t => t.id === targetTableId)!;
      const alreadyHasFK = targetTable.columns.some(c => c.name === fkName);

      if (!alreadyHasFK) {
        fkColumnId = Math.random().toString(36).substr(2, 9);
        const fkColumn: Column = {
          id: fkColumnId,
          name: fkName,
          type: sourcePK.type,
          isFK: true,
          isNN: true,
          ...(type === 'ONE_TO_ONE' ? { isUQ: true } : {})
        };
        updatedTables = s.tables.map(t =>
          t.id === targetTableId ? { ...t, columns: [...t.columns, fkColumn] } : t
        );
      } else {
        fkColumnId = targetTable.columns.find(c => c.name === fkName)!.id;
      }
    }

    const rel: Relation = {
      id: Math.random().toString(36).substr(2, 9),
      sourceTableId,
      sourceColumnId: sourcePK?.id ?? '',
      targetTableId,
      targetColumnId: fkColumnId,
      type
    };
    this.schema.update(curr => ({ ...curr, tables: updatedTables, relations: [...curr.relations, rel] }));
  }

  updateRelationType(id: string, type: RelationType) {
    this.schema.update(s => {
      const rel = s.relations.find(r => r.id === id);
      if (!rel) return s;

      // Sync isUQ on the FK column: required for 1:1, remove for others
      const updatedTables = rel.targetColumnId
        ? s.tables.map(t => t.id === rel.targetTableId ? {
            ...t,
            columns: t.columns.map(c => c.id === rel.targetColumnId
              ? { ...c, isUQ: type === 'ONE_TO_ONE' }
              : c
            )
          } : t)
        : s.tables;

      return {
        ...s,
        tables: updatedTables,
        relations: s.relations.map(r => r.id === id ? { ...r, type } : r),
      };
    });
  }

  deleteRelation(id: string) {
    this.schema.update(s => ({ ...s, relations: s.relations.filter(r => r.id !== id) }));
  }

  toggleExplorer() {
    this.explorerVisible.update(v => !v);
  }

  readonly tablesWithoutPK = computed(() =>
    new Set(this.schema().tables.filter(t => !t.columns.some(c => c.isPK)).map(t => t.id))
  );

  readonly selectedTable = computed(() => {
    const id = this.selectedTableId();
    if (!id) return null;
    return this.schema().tables.find(t => t.id === id) || null;
  });

  selectTable(id: string | null) {
    this.selectedTableId.set(id);
  }

  updateTableName(id: string, name: string) {
    this.schema.update(s => ({
      ...s,
      tables: s.tables.map(t => t.id === id ? { ...t, name } : t)
    }));
  }

  updateTableDescription(id: string, description: string) {
    this.schema.update(s => ({
      ...s,
      tables: s.tables.map(t => t.id === id ? { ...t, description } : t)
    }));
  }

  updateColumn(tableId: string, columnId: string, updates: Partial<Column>) {
    this.schema.update(s => ({
      ...s,
      tables: s.tables.map(t => t.id === tableId ? {
        ...t,
        columns: t.columns.map(c => c.id === columnId ? { ...c, ...updates } : c)
      } : t)
    }));
  }

  addColumn(tableId: string) {
    const newColumn: Column = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'new_column',
      type: 'VARCHAR'
    };
    this.schema.update(s => ({
      ...s,
      tables: s.tables.map(t => t.id === tableId ? {
        ...t,
        columns: [...t.columns, newColumn]
      } : t)
    }));
  }

  addTable() {
    const id = Math.random().toString(36).substr(2, 9);
    const newTable: Table = {
      id,
      name: 'new_table',
      columns: [{ id: `${id}-1`, name: 'id', type: 'UUID', isPK: true }],
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300
    };
    this.schema.update(s => ({ ...s, tables: [...s.tables, newTable] }));
    this.selectedTableId.set(id);
  }

  deleteColumn(tableId: string, columnId: string) {
    this.schema.update(s => ({
      ...s,
      tables: s.tables.map(t => t.id === tableId ? {
        ...t,
        columns: t.columns.filter(c => c.id !== columnId)
      } : t)
    }));
  }

  deleteTable(id: string) {
    this.schema.update(s => ({
      ...s,
      tables: s.tables.filter(t => t.id !== id),
      relations: s.relations.filter(r => r.sourceTableId !== id && r.targetTableId !== id)
    }));
    if (this.selectedTableId() === id) {
      this.selectedTableId.set(null);
    }
  }
}
