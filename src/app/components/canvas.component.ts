import {
  Component, ElementRef, OnInit, ViewChild,
  inject, effect, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { Graph, Node } from '@antv/x6';
import { SchemaService } from '../services/schema.service';
import { Table, RelationType } from '../models/schema.models';

const RELATION_STYLES: Record<RelationType, { stroke: string; dash: string; label: string }> = {
  ONE_TO_ONE:   { stroke: '#6366f1', dash: '0',   label: '1 — 1' },
  ONE_TO_MANY:  { stroke: '#94a3b8', dash: '5 5', label: '1 — N' },
  MANY_TO_MANY: { stroke: '#f59e0b', dash: '6 3', label: 'N — N' },
};

Graph.registerNode('table-node', {
  inherit: 'rect',
  markup: [
    { tagName: 'rect',          selector: 'body' },
    { tagName: 'foreignObject', selector: 'fo'   },
  ],
  attrs: {
    body: { fill: 'transparent', stroke: 'transparent', width: '100%', height: '100%' },
    fo:   { refWidth: '100%', refHeight: '100%', x: 0, y: 0 },
  },
}, true);

@Component({
  selector: 'app-canvas',
  template: `
    <main class="flex-1 relative bg-dot-grid overflow-hidden">
      <div #container class="w-full h-full"></div>

      <!-- Floating Zoom Controls -->
      <div class="absolute bottom-6 right-6 flex flex-col gap-2 z-10 sm:bottom-8 sm:right-8">
        <div class="bg-panel-dark border border-border-dark rounded-lg flex flex-col shadow-lg">
          <button (click)="zoomIn()" class="p-2 hover:bg-slate-700 rounded-t-lg text-text-muted hover:text-white">
            <span class="material-symbols-outlined text-xl">add</span>
          </button>
          <div class="h-px bg-border-dark"></div>
          <button (click)="zoomOut()" class="p-2 hover:bg-slate-700 rounded-b-lg text-text-muted hover:text-white">
            <span class="material-symbols-outlined text-xl">remove</span>
          </button>
        </div>
        <div class="bg-panel-dark border border-border-dark rounded-lg p-2 shadow-lg text-xs font-mono text-center text-text-muted">
          {{ zoomLevel }}%
        </div>
      </div>

      <!-- Minimap -->
      <div
        class="absolute bottom-6 left-6 w-40 h-24 sm:w-52 sm:h-32 bg-panel-dark border border-border-dark rounded-lg shadow-lg overflow-hidden z-10 transition-all md:translate-x-0"
        [class.-translate-x-full]="!explorerVisible()"
        [class.ml-[-1.5rem]]="!explorerVisible()"
      >
        <canvas #miniCanvas class="w-full h-full"></canvas>
      </div>
    </main>
  `,
  styles: [`
    :host { display: flex; flex: 1; min-width: 0; min-height: 0; overflow: hidden; }
    :host ::ng-deep .x6-port-body { display: none; }
    :host ::ng-deep .x6-node:hover .x6-port-body { display: block; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CanvasComponent implements OnInit {
  @ViewChild('container',     { static: true }) container!:     ElementRef<HTMLDivElement>;
  @ViewChild('miniCanvas',    { static: true }) miniCanvas!:    ElementRef<HTMLCanvasElement>;

  private graph!: Graph;
  private schemaService = inject(SchemaService);
  private cdr = inject(ChangeDetectorRef);
  private miniRaf = 0;

  protected zoomLevel = 100;
  protected explorerVisible = this.schemaService.explorerVisible;

  constructor() {
    effect(() => {
      const schema = this.schemaService.schema();
      this.renderSchema(schema);
    });
  }

  ngOnInit() {
    this.graph = new Graph({
      container: this.container.nativeElement,
      autoResize: true,
      grid: false,
      mousewheel: true,
      panning: { enabled: true, eventTypes: ['rightMouseDown'] },
      connecting: {
        router: 'manhattan',
        connector: { name: 'rounded', args: { radius: 8 } },
        allowBlank: false,
        allowLoop: false,
        allowMulti: false,
        snap: { radius: 20 },
        createEdge() {
          return this.createEdge({
            attrs: {
              line: {
                stroke: '#94a3b8',
                strokeWidth: 2,
                strokeDasharray: '5 5',
                targetMarker: { name: 'classic', size: 8, fill: '#94a3b8' },
              },
            },
          });
        },
        validateConnection({ sourceCell, targetCell }) {
          return !!sourceCell && !!targetCell && sourceCell.id !== targetCell.id;
        },
      },
    });

    this.graph.on('node:click', ({ node }) => {
      this.schemaService.selectTable(node.id);
    });

    this.graph.on('blank:click', () => {
      this.schemaService.selectTable(null);
    });

    this.graph.on('scale', ({ sx }) => {
      this.zoomLevel = Math.round(sx * 100);
      this.cdr.markForCheck();
    });

    this.graph.on('edge:connected', ({ edge }) => {
      const sourceId = edge.getSourceCellId();
      const targetId = edge.getTargetCellId();
      this.graph.removeEdge(edge);
      if (sourceId && targetId) {
        this.schemaService.addRelation(sourceId, targetId);
      }
    });

    const syncMini = () => {
      cancelAnimationFrame(this.miniRaf);
      this.miniRaf = requestAnimationFrame(() => this.drawMinimap());
    };
    this.graph.on('node:moved',   syncMini);
    this.graph.on('node:added',   syncMini);
    this.graph.on('node:removed', syncMini);
    this.graph.on('edge:added',   syncMini);
    this.graph.on('edge:removed', syncMini);
    this.graph.on('scale',        syncMini);
    this.graph.on('translate',    syncMini);
    setTimeout(syncMini, 150);
  }

  private drawMinimap() {
    const canvas = this.miniCanvas.nativeElement;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    const nodes = this.graph.getNodes();
    if (!nodes.length) return;

    // Compute bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const { x, y } = n.getPosition();
      const { width, height } = n.getSize();
      if (x         < minX) minX = x;
      if (y         < minY) minY = y;
      if (x + width  > maxX) maxX = x + width;
      if (y + height > maxY) maxY = y + height;
    });

    const PAD  = 12;
    const scaleX = (W - PAD * 2) / (maxX - minX || 1);
    const scaleY = (H - PAD * 2) / (maxY - minY || 1);
    const scale  = Math.min(scaleX, scaleY);
    const offX   = PAD + ((W - PAD * 2) - (maxX - minX) * scale) / 2;
    const offY   = PAD + ((H - PAD * 2) - (maxY - minY) * scale) / 2;

    const toMX = (x: number) => offX + (x - minX) * scale;
    const toMY = (y: number) => offY + (y - minY) * scale;

    // Draw edges
    ctx.strokeStyle = '#475569';
    ctx.lineWidth   = 1;
    this.graph.getEdges().forEach(e => {
      const src = this.graph.getCellById(e.getSourceCellId()) as Node;
      const tgt = this.graph.getCellById(e.getTargetCellId()) as Node;
      if (!src || !tgt) return;
      const sp = src.getPosition(), ss = src.getSize();
      const tp = tgt.getPosition(), ts = tgt.getSize();
      ctx.beginPath();
      ctx.moveTo(toMX(sp.x + ss.width), toMY(sp.y + ss.height / 2));
      ctx.lineTo(toMX(tp.x),            toMY(tp.y + ts.height / 2));
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      const { x, y } = n.getPosition();
      const { width, height } = n.getSize();
      const mx = toMX(x), my = toMY(y);
      const mw = width * scale, mh = height * scale;
      ctx.fillStyle   = '#1e293b';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, mh, 2);
      ctx.fill();
      ctx.stroke();
      // Header bar
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, Math.min(10, mh), 2);
      ctx.fill();
    });

    // Draw viewport indicator
    const m  = this.graph.matrix();
    const cw = this.container.nativeElement.clientWidth;
    const ch = this.container.nativeElement.clientHeight;
    const vx = -m.e / m.a;
    const vy = -m.f / m.d;
    const vw =  cw  / m.a;
    const vh =  ch  / m.d;
    ctx.strokeStyle = '#6366f1';
    ctx.fillStyle   = 'rgba(99,102,241,0.08)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(toMX(vx), toMY(vy), vw * scale, vh * scale, 2);
    ctx.fill();
    ctx.stroke();
  }

  private renderSchema(schema: any) {
    if (!this.graph) return;

    const tableIds    = new Set(schema.tables.map((t: Table) => t.id));
    const relationIds = new Set(schema.relations.map((r: any) => r.id));

    this.graph.getNodes().forEach(n => { if (!tableIds.has(n.id))    this.graph.removeNode(n); });
    this.graph.getEdges().forEach(e => { if (!relationIds.has(e.id)) this.graph.removeEdge(e); });

    // Add or update nodes
    schema.tables.forEach((table: Table) => {
      const isSelected = this.schemaService.selectedTableId() === table.id;
      const hasNoPK = this.schemaService.tablesWithoutPK().has(table.id);
      const height = 40 + table.columns.length * 32 + (hasNoPK ? 24 : 0);
      let node = this.graph.getCellById(table.id) as Node | undefined;

      if (!node) {
        node = this.graph.addNode({
          id: table.id,
          shape: 'table-node',
          x: table.x,
          y: table.y,
          width: 240,
          height,
          ports: {
            groups: {
              conn: {
                position: 'absolute',
                attrs: {
                  circle: {
                    r: 5,
                    magnet: true,
                    fill: '#3b82f6',
                    stroke: '#1e40af',
                    strokeWidth: 1.5,
                  },
                },
              },
            },
            items: [
              { group: 'conn', id: `${table.id}-left`,  args: { x: 0,   y: height / 2 } },
              { group: 'conn', id: `${table.id}-right`, args: { x: 240, y: height / 2 } },
            ],
          },
        });
      } else {
        node.resize(240, height);
      }

      this.setNodeContent(node, table, isSelected, hasNoPK);
    });

    // Add or update edges
    schema.relations.forEach((rel: any) => {
      const relStyle = RELATION_STYLES[rel.type as RelationType] ?? RELATION_STYLES.ONE_TO_MANY;
      const existing = this.graph.getCellById(rel.id);
      if (existing) {
        existing.setAttrByPath('line/stroke', relStyle.stroke);
        existing.setAttrByPath('line/strokeDasharray', relStyle.dash);
        existing.setAttrByPath('line/targetMarker', { name: 'classic', size: 8, fill: relStyle.stroke });
        existing.setAttrByPath('line/sourceMarker', rel.type === 'ONE_TO_ONE' ? { name: 'classic', size: 8, fill: relStyle.stroke } : null);
        return;
      }
      this.graph.addEdge({
        id: rel.id,
        source: rel.sourceTableId,
        target: rel.targetTableId,
        router: 'manhattan',
        connector: { name: 'rounded', args: { radius: 8 } },
        labels: [{
          attrs: { label: { text: relStyle.label, fill: relStyle.stroke, fontSize: 10, fontFamily: 'monospace' } },
          position: 0.5,
        }],
        attrs: {
          line: {
            stroke: relStyle.stroke,
            strokeWidth: 2,
            strokeDasharray: relStyle.dash,
            targetMarker: { name: 'classic', size: 8, fill: relStyle.stroke },
            sourceMarker: rel.type === 'ONE_TO_ONE'
              ? { name: 'classic', size: 8, fill: relStyle.stroke }
              : null,
          },
        },
      });
    });
  }

  private setNodeContent(node: Node, table: Table, isSelected: boolean, hasNoPK = false) {
    requestAnimationFrame(() => {
      const view = this.graph.findViewByCell(node);
      if (!view) return;
      const fo = (view.container as SVGGElement).querySelector('foreignObject');
      if (!fo) return;
      let body = fo.querySelector('body') as HTMLBodyElement | null;
      if (!body) {
        const ns = 'http://www.w3.org/1999/xhtml';
        body = document.createElementNS(ns, 'body') as unknown as HTMLBodyElement;
        (body as any).style.cssText = 'margin:0;padding:0;width:100%;height:100%;overflow:hidden;';
        fo.appendChild(body);
      }
      body.innerHTML = this.buildTableHtml(table, isSelected, hasNoPK);
    });
  }

  private buildTableHtml(table: Table, isSelected: boolean, hasNoPK = false): string {
    const border = hasNoPK
      ? 'border-color:#ef4444;box-shadow:0 0 0 1px rgba(239,68,68,0.4);'
      : isSelected
        ? 'border-color:#6366f1;box-shadow:0 0 0 1px rgba(99,102,241,0.5);'
        : 'border-color:#2d3748;';

    const warning = hasNoPK
      ? `<div style="display:flex;align-items:center;gap:4px;background:rgba(239,68,68,0.1);border-bottom:1px solid rgba(239,68,68,0.3);padding:4px 12px;">
           <span class="material-symbols-outlined" style="font-size:11px;color:#f87171;">warning</span>
           <span style="font-size:10px;color:#f87171;font-family:sans-serif;">No Primary Key defined</span>
         </div>`
      : '';

    const columns = table.columns.map(col => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;border-bottom:1px solid #2d3748;">
        <div style="display:flex;align-items:center;gap:6px;overflow:hidden;">
          ${col.isPK ? '<span class="material-symbols-outlined" style="font-size:10px;color:#f59e0b;">vpn_key</span>' : '<div style="width:10px;"></div>'}
          ${col.isFK ? '<span class="material-symbols-outlined" style="font-size:10px;color:#60a5fa;">link</span>' : ''}
          <span style="font-size:12px;font-family:monospace;color:${col.isPK ? '#fff' : '#e2e8f0'};font-weight:${col.isPK ? '600' : '400'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${col.name}</span>
        </div>
        <span style="font-size:11px;font-family:monospace;color:#94a3b8;white-space:nowrap;">${col.type}</span>
      </div>
    `).join('');

    return `
      <div style="width:100%;height:100%;background:#1e293b;border-radius:8px;border:1px solid;${border}display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">
        <div style="background:#0f172a;border-bottom:1px solid #2d3748;padding:8px 12px;display:flex;align-items:center;gap:8px;cursor:grab;">
          <span class="material-symbols-outlined" style="font-size:14px;color:#94a3b8;">table_chart</span>
          <span style="font-size:13px;font-weight:700;color:#e2e8f0;">${table.name}</span>
        </div>
        ${warning}
        <div style="display:flex;flex-direction:column;">${columns}</div>
      </div>
    `;
  }

  protected zoomIn()  { this.graph.zoom(0.1);  }
  protected zoomOut() { this.graph.zoom(-0.1); }
}
