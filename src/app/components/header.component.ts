import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { SchemaService } from '../services/schema.service';
import { ConnectDbDialogComponent } from './connect-db-dialog.component';

@Component({
  selector: 'app-header',
  imports: [ConnectDbDialogComponent],
  template: `
    <header class="h-14 bg-panel-dark border-b border-border-dark flex items-center justify-between px-4 shrink-0 z-20 relative shadow-md">
      <!-- Left: Logo & Project Info -->
      <div class="flex items-center gap-2 md:gap-4 overflow-hidden">
        <button (click)="toggleExplorer()" class="md:hidden p-1.5 text-text-muted hover:text-white" title="Toggle Sidebar">
          <span class="material-symbols-outlined text-2xl">menu</span>
        </button>
        <div class="flex items-center gap-2 text-primary shrink-0">
          <span class="material-symbols-outlined text-3xl">schema</span>
          <span class="text-white text-lg font-bold tracking-tight hidden sm:inline">SchemaOps</span>
        </div>
        <div class="h-6 w-px bg-border-dark shrink-0 hidden sm:block"></div>
        <div class="flex flex-col overflow-hidden">
          <div class="flex items-center gap-2">
            <span class="text-xs md:text-sm font-medium text-white truncate max-w-[120px] sm:max-w-none">{{ schema().name }}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 hidden xs:inline">LATEST</span>
          </div>
        </div>
      </div>

      <!-- Center: Floating Toolbar -->
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
        <div class="flex items-center bg-slate-700/50 rounded-lg p-0.5 md:p-1 border border-border-dark shadow-sm backdrop-blur-sm">
          <button class="p-1.5 md:p-2 hover:bg-slate-600 rounded text-text-muted hover:text-white transition-colors" title="Select">
            <span class="material-symbols-outlined text-lg md:text-xl">arrow_selector_tool</span>
          </button>
          <div class="w-px h-5 bg-border-dark mx-0.5 md:mx-1"></div>
          <button class="p-1.5 md:p-2 hover:bg-slate-600 rounded text-text-muted hover:text-white transition-colors" title="Add Table">
            <span class="material-symbols-outlined text-lg md:text-xl">table_view</span>
          </button>
          <button class="p-1.5 md:p-2 hover:bg-slate-600 rounded text-text-muted hover:text-white transition-colors hidden xs:block" title="Add Database Group">
            <span class="material-symbols-outlined text-lg md:text-xl">folder_data</span>
          </button>
          <button class="p-1.5 md:p-2 hover:bg-slate-600 rounded text-text-muted hover:text-white transition-colors hidden sm:block" title="Add Note">
            <span class="material-symbols-outlined text-lg md:text-xl">sticky_note_2</span>
          </button>
          <button class="p-1.5 md:p-2 hover:bg-slate-600 rounded text-text-muted hover:text-white transition-colors" title="Relationship">
            <span class="material-symbols-outlined text-lg md:text-xl">polyline</span>
          </button>
        </div>
      </div>

      <!-- Right: Actions & Avatars -->
      <div class="flex items-center gap-2 md:gap-4">
        <div class="hidden lg:flex items-center gap-2 text-text-muted text-xs font-medium shrink-0">
          <span class="material-symbols-outlined text-base">cloud_done</span>
          <span>Saved to Cloud</span>
        </div>
        <div class="flex -space-x-2 shrink-0">
          <div class="h-7 w-7 md:h-8 md:w-8 rounded-full border-2 border-panel-dark bg-purple-500 flex items-center justify-center text-[10px] md:text-xs font-bold text-white relative group cursor-pointer" title="Alice">
            AM
          </div>
          <div class="h-7 w-7 md:h-8 md:w-8 rounded-full border-2 border-panel-dark bg-indigo-500 flex items-center justify-center text-[10px] md:text-xs font-bold text-white relative group cursor-pointer" title="Bob">
            BJ
          </div>
          <div class="h-7 w-7 md:h-8 md:w-8 rounded-full border-2 border-panel-dark bg-emerald-500 flex items-center justify-center text-[10px] md:text-xs font-bold text-white relative group cursor-pointer hidden xs:flex" title="Charlie">
            CK
          </div>
        </div>
        <button (click)="showConnectDialog.set(true)" class="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors shadow-lg shrink-0">
          <span class="material-symbols-outlined text-lg">database</span>
          <span class="hidden md:inline">Connect DB</span>
        </button>
        <button class="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-colors shadow-lg shadow-blue-900/20 shrink-0">
          <span class="material-symbols-outlined text-lg">download</span>
          <span class="hidden md:inline">Migration Pack (ZIP)</span>
          <span class="md:hidden">ZIP</span>
        </button>
      </div>
    </header>

    @if (showConnectDialog()) {
      <app-connect-db-dialog (close)="showConnectDialog.set(false)" />
    }
  `,
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private schemaService = inject(SchemaService);
  protected schema = this.schemaService.schema;
  protected showConnectDialog = signal(false);

  protected toggleExplorer() {
    this.schemaService.toggleExplorer();
  }
}
