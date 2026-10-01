import { Component, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DbConnectionService } from '../services/db-connection.service';

@Component({
  selector: 'app-connect-db-dialog',
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" (click)="close.emit()">
      <div class="bg-panel-dark border border-border-dark rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between">
          <h2 class="text-white font-semibold text-base flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">database</span>
            Connect Database
          </h2>
          <button (click)="close.emit()" class="text-text-muted hover:text-white">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-muted">JDBC URL</label>
            <input [(ngModel)]="jdbcUrl" placeholder="jdbc:postgresql://host:5432/mydb"
              class="bg-slate-800 border border-border-dark rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary" />
          </div>
          <div class="flex gap-3">
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs text-text-muted">Username</label>
              <input [(ngModel)]="username" placeholder="user"
                class="bg-slate-800 border border-border-dark rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary" />
            </div>
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs text-text-muted">Password</label>
              <input [(ngModel)]="password" type="password" placeholder="••••••••"
                class="bg-slate-800 border border-border-dark rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs text-text-muted">Schema Name <span class="text-slate-600">(optional)</span></label>
            <input [(ngModel)]="schemaName" placeholder="public"
              class="bg-slate-800 border border-border-dark rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary" />
          </div>
        </div>

        @if (error()) {
          <p class="text-red-400 text-xs">{{ error() }}</p>
        }

        <div class="flex justify-end gap-2 pt-1">
          <button (click)="close.emit()" class="px-4 py-2 text-sm text-text-muted hover:text-white rounded-lg hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button (click)="submit()" [disabled]="loading()"
            class="flex items-center gap-2 bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            @if (loading()) { <span class="material-symbols-outlined text-base animate-spin">progress_activity</span> }
            Connect
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectDbDialogComponent {
  close   = output<void>();
  connected = output<void>();

  jdbcUrl    = '';
  username   = '';
  password   = '';
  schemaName = '';

  loading = signal(false);
  error   = signal('');

  private dbService = inject(DbConnectionService);

  async submit() {
    if (!this.jdbcUrl || !this.username || !this.password) {
      this.error.set('JDBC URL, username and password are required.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.dbService.connect(this.jdbcUrl, this.username, this.password, this.schemaName || undefined);
      this.connected.emit();
      this.close.emit();
    } catch {
      this.error.set('Connection failed. Check your credentials and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
