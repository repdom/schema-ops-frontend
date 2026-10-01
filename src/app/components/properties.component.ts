import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { SchemaService } from '../services/schema.service';
import { FormsModule } from '@angular/forms';
import { RelationType } from '../models/schema.models';

@Component({
  selector: 'app-properties',
  imports: [FormsModule],
  template: `
    <aside
      style="height: 100%;"
      class="fixed inset-y-0 right-0 z-40 w-full sm:w-80 bg-panel-dark border-l border-border-dark flex flex-col shrink-0 transition-transform duration-300 lg:relative lg:translate-x-0"
      [class.translate-x-full]="!table()"
    >
      <!-- Header -->
      <div class="h-12 border-b border-border-dark px-4 flex items-center justify-between shrink-0 bg-panel-dark">
        <span class="font-bold text-sm text-white">Table Properties</span>
        <button class="text-text-muted hover:text-white p-1" (click)="close()"><span class="material-symbols-outlined text-lg">close</span></button>
      </div>

      @if (table(); as t) {
        <!-- No-PK Warning -->
        @if (noPK()) {
          <div class="mx-4 mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
            <span class="material-symbols-outlined text-red-400 text-base mt-0.5">warning</span>
            <p class="text-xs text-red-400 leading-snug">This table has no Primary Key. A PK is required for relations and data integrity.</p>
          </div>
        }

        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <!-- Basic Info -->
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1.5">Table Name</label>
              <input
                class="w-full bg-background-dark border rounded-md py-2 px-3 text-sm text-white font-mono focus:outline-none focus:ring-1 transition-colors"
                [class]="nameError() ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : 'border-border-dark focus:border-primary focus:ring-primary'"
                type="text"
                [ngModel]="t.name"
                (ngModelChange)="updateName($event)"
              />
              @if (nameError()) {
                <p class="text-[10px] text-red-400 mt-1">{{ nameError() }}</p>
              }
            </div>
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1.5">Description</label>
              <textarea
                class="w-full bg-background-dark border border-border-dark rounded-md py-2 px-3 text-sm text-white h-20 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-text-muted"
                placeholder="Add a description..."
                [ngModel]="t.description"
                (ngModelChange)="updateDescription($event)"
              ></textarea>
            </div>
          </div>

          <div class="h-px bg-border-dark"></div>

          <!-- Relations -->
          @if (tableRelations().length > 0) {
            <div class="space-y-3">
              <span class="text-xs font-bold text-text-muted uppercase">Relations ({{ tableRelations().length }})</span>
              @for (rel of tableRelations(); track rel.id) {
                <div class="bg-slate-800/50 border border-border-dark rounded-md p-2 flex items-center gap-2">
                  <span class="material-symbols-outlined text-slate-400 text-sm">cable</span>
                  <span class="text-xs font-mono text-slate-300 flex-1 truncate">
                    {{ rel.sourceTableId === t.id ? '→ ' + getTableName(rel.targetTableId) : '← ' + getTableName(rel.sourceTableId) }}
                  </span>
                  <select
                    class="bg-background-dark border border-border-dark rounded text-[10px] text-slate-300 py-0.5 px-1 font-mono focus:border-primary focus:ring-0"
                    [value]="rel.type"
                    (change)="updateRelationType(rel.id, $any($event.target).value)"
                  >
                    <option value="ONE_TO_ONE">1:1</option>
                    <option value="ONE_TO_MANY">1:N</option>
                    <option value="MANY_TO_MANY">N:N</option>
                  </select>
                  <button class="text-text-muted hover:text-red-400" (click)="deleteRelation(rel.id)">
                    <span class="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              }
            </div>
            <div class="h-px bg-border-dark"></div>
          }

          <!-- Columns List -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-text-muted uppercase">Columns ({{ t.columns.length }})</span>
              <div class="flex gap-2">
                <span class="text-[10px] text-text-muted cursor-help" title="Primary Key">PK</span>
                <span class="text-[10px] text-text-muted cursor-help" title="Not Null">NN</span>
                <span class="text-[10px] text-text-muted cursor-help" title="Unique">UQ</span>
              </div>
            </div>

            @for (col of t.columns; track col.id) {
              <div class="group bg-slate-800/50 border border-border-dark rounded-md p-2 hover:border-slate-500 transition-colors">
                <div class="flex items-center gap-2 mb-2">
                  <span class="material-symbols-outlined text-text-muted cursor-grab text-base">drag_indicator</span>
                  <input
                    class="flex-1 bg-transparent border-b p-0 text-sm font-mono text-white focus:ring-0 focus:outline-none transition-colors"
                    [class]="colNameInvalid(col.name) ? 'border-red-500' : 'border-transparent'"
                    type="text"
                    [ngModel]="col.name"
                    (ngModelChange)="updateColumn(col.id, { name: sanitize($event) })"
                  />
                  <span class="material-symbols-outlined text-text-muted hover:text-red-400 cursor-pointer text-base" (click)="deleteColumn(col.id)">delete</span>
                </div>
                <div class="flex items-center gap-2">
                  <select
                    class="flex-1 bg-background-dark border border-border-dark rounded text-xs text-slate-300 py-1 pl-2 pr-6 font-mono focus:border-primary focus:ring-0"
                    [ngModel]="col.type"
                    (ngModelChange)="updateColumn(col.id, { type: $event })"
                  >
                    <option value="UUID">UUID</option>
                    <option value="INTEGER">INTEGER</option>
                    <option value="VARCHAR">VARCHAR</option>
                    <option value="TIMESTAMP">TIMESTAMP</option>
                    <option value="DECIMAL">DECIMAL</option>
                  </select>
                  <div class="flex gap-1.5">
                    <button
                      class="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-colors"
                      [class]="col.isPK ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40' : 'bg-slate-700 text-slate-400 hover:text-white border border-border-dark'"
                      (click)="updateColumn(col.id, { isPK: !col.isPK })"
                    >PK</button>
                    <button
                      class="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-colors"
                      [class]="col.isNN ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : 'bg-slate-700 text-slate-400 hover:text-white border border-border-dark'"
                      (click)="updateColumn(col.id, { isNN: !col.isNN })"
                    >NN</button>
                    <button
                      class="w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] transition-colors"
                      [class]="col.isUQ ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-700 text-slate-400 hover:text-white border border-border-dark'"
                      (click)="updateColumn(col.id, { isUQ: !col.isUQ })"
                    >UQ</button>
                  </div>
                </div>
              </div>
            }

            <button
              class="w-full py-2.5 rounded-lg border border-dashed border-border-dark text-text-muted hover:text-primary hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium flex items-center justify-center gap-2"
              (click)="addColumn()"
            >
              <span class="material-symbols-outlined text-lg">add</span>
              Add Column
            </button>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="p-4 border-t border-border-dark bg-slate-800/30">
          <button
            class="w-full py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 text-sm font-medium transition-colors"
            (click)="deleteTable()"
          >
            Delete Table
          </button>
        </div>
      } @else {
        <div class="flex-1 flex flex-col items-center justify-center p-6 text-center text-text-muted">
          <span class="material-symbols-outlined text-4xl mb-2">info</span>
          <p class="text-sm">Select a table to view its properties</p>
        </div>
      }
    </aside>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertiesComponent {
  protected schemaService = inject(SchemaService);
  protected table = this.schemaService.selectedTable;

  protected updateName(name: string) {
    const t = this.table();
    if (t) this.schemaService.updateTableName(t.id, this.sanitize(name));
  }

  protected updateDescription(desc: string) {
    const t = this.table();
    if (t) this.schemaService.updateTableDescription(t.id, desc);
  }

  protected updateColumn(columnId: string, updates: any) {
    const t = this.table();
    if (t) this.schemaService.updateColumn(t.id, columnId, updates);
  }

  protected deleteColumn(columnId: string) {
    const t = this.table();
    if (t) this.schemaService.deleteColumn(t.id, columnId);
  }

  protected addColumn() {
    const t = this.table();
    if (t) this.schemaService.addColumn(t.id);
  }

  protected deleteTable() {
    const t = this.table();
    if (t) this.schemaService.deleteTable(t.id);
  }

  /** Only allow letters, digits and underscores — valid SQL identifiers */
  protected sanitize(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  protected colNameInvalid(name: string): boolean {
    return !name || /[^a-zA-Z0-9_]/.test(name);
  }

  protected nameError = computed(() => {
    const t = this.table();
    if (!t) return '';
    if (!t.name) return 'Name cannot be empty.';
    if (/[^a-zA-Z0-9_]/.test(t.name)) return 'Only letters, digits and underscores are allowed.';
    return '';
  });

  protected noPK = computed(() => {
    const t = this.table();
    return t ? !t.columns.some(c => c.isPK) : false;
  });

  protected tableRelations = computed(() => {
    const t = this.table();
    if (!t) return [];
    return this.schemaService.schema().relations.filter(
      r => r.sourceTableId === t.id || r.targetTableId === t.id
    );
  });

  protected getTableName(id: string): string {
    return this.schemaService.schema().tables.find(t => t.id === id)?.name ?? id;
  }

  protected updateRelationType(id: string, type: RelationType) {
    this.schemaService.updateRelationType(id, type);
  }

  protected deleteRelation(id: string) {
    this.schemaService.deleteRelation(id);
  }

  protected close() {
    this.schemaService.selectTable(null);
  }
}
