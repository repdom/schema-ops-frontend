import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SchemaService } from '../services/schema.service';

@Component({
  selector: 'app-explorer',
  template: `
    <aside
      style="height: 100%;"
      class="fixed inset-y-0 left-0 z-40 w-64 bg-panel-dark border-r border-border-dark flex flex-col shrink-0 transition-transform duration-300 md:relative md:translate-x-0"
      [class.-translate-x-full]="!visible()"
    >
      <!-- Search -->
      <div class="p-4 border-b border-border-dark">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-2.5 top-2 text-text-muted text-lg">search</span>
          <input class="w-full bg-background-dark border border-border-dark rounded-md py-1.5 pl-9 pr-3 text-sm text-text-main focus:outline-none focus:border-primary placeholder-text-muted transition-colors" placeholder="Find object..." type="text"/>
        </div>
      </div>

      <!-- Explorer Tree -->
      <div class="flex-1 overflow-y-auto p-2">
        <div class="flex items-center justify-between mb-2 px-2 mt-2">
          <span class="text-xs font-bold text-text-muted uppercase tracking-wider">Database Explorer</span>
          <button
            class="flex items-center gap-1 text-xs text-primary hover:text-blue-400 transition-colors"
            (click)="addTable()"
          >
            <span class="material-symbols-outlined text-base">add</span>
            New Table
          </button>
        </div>

        <!-- Root Database Item -->
        <div class="space-y-1">
          <div class="flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-500/10 text-blue-200 cursor-pointer">
            <span class="material-symbols-outlined text-lg transform rotate-90">arrow_right</span>
            <span class="material-symbols-outlined text-lg text-primary">database</span>
            <span class="text-sm font-medium">{{ schema().name }} (Postgres)</span>
          </div>

          <!-- Children -->
          <div class="ml-4 pl-2 border-l border-border-dark space-y-1">
            @for (table of schema().tables; track table.id) {
              <div
                class="flex items-center justify-between group px-2 py-1.5 rounded hover:bg-slate-700/50 cursor-pointer text-text-muted hover:text-white transition-colors"
                (click)="selectTable(table.id)"
                [class.bg-slate-700]="selectedTableId() === table.id"
                [class.text-white]="selectedTableId() === table.id"
              >
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-lg text-amber-500">table_chart</span>
                  <span class="text-sm">{{ table.name }}</span>
                </div>
                <span class="text-[10px] bg-slate-700 px-1 rounded opacity-0 group-hover:opacity-100">{{ table.columns.length }} cols</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- History/Versions -->
      <div class="p-3 border-t border-border-dark bg-slate-800/50">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-text-muted uppercase">History</span>
          <button class="text-primary hover:text-blue-400 text-xs">View All</button>
        </div>
        <div class="space-y-2">
          <div class="flex items-start gap-2 text-xs">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5"></div>
            <div class="flex flex-col">
              <span class="text-white">v1.0.2 - Add Indexes</span>
              <span class="text-text-muted text-[10px]">2 mins ago by Alice</span>
            </div>
          </div>
          <div class="flex items-start gap-2 text-xs">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5"></div>
            <div class="flex flex-col">
              <span class="text-text-muted">v1.0.1 - Init Schema</span>
              <span class="text-text-muted text-[10px]">1 hr ago by Bob</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExplorerComponent {
  private schemaService = inject(SchemaService);
  protected schema = this.schemaService.schema;
  protected selectedTableId = this.schemaService.selectedTableId;
  protected visible = this.schemaService.explorerVisible;

  protected addTable() {
    this.schemaService.addTable();
  }

  protected selectTable(id: string) {
    this.schemaService.selectTable(id);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 768) {
      this.schemaService.toggleExplorer();
    }
  }
}
