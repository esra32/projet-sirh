import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OrgNode } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { filterActiveEmployees, filterActiveOrgTree } from '../../core/services/employee-activity';

const NW  = 170;
const NH  = 108;
const NW_DEPT = 180;
const NH_DEPT = 65;
const HG  = 14;
const VG  = 60;
const PAD = 32;

type ViewMode = 'manager' | 'department';

interface LN {
  id: string;
  node: OrgNode;
  cx: number;
  y: number;
  lx: number;
  depth: number;
  parentId: string | null;
  childCount: number;
  isDept: boolean;
  cardW: number;
  cardH: number;
}

@Component({
  selector: 'app-orgchart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="page">

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="tb-l">
      <h2>Organigramme</h2>
      <span class="n-pill">{{ totalCount() }} employé(s)</span>
    </div>
    <div class="tb-r">
      <div class="mode-toggle">
        <button [class.active]="viewMode() === 'manager'"    (click)="setMode('manager')">👤 Hiérarchie</button>
        <button [class.active]="viewMode() === 'department'" (click)="setMode('department')">🏢 Département</button>
      </div>
      <div class="search-box" [class.focused]="sf">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" placeholder="Rechercher…"
               [ngModel]="search()" (ngModelChange)="search.set($event)"
               (focus)="sf=true" (blur)="sf=false"/>
        <button *ngIf="search()" (click)="search.set('')">✕</button>
      </div>
      <select class="sel" [ngModel]="deptF()" (ngModelChange)="onDeptChange($event)">
        <option value="">Tous les départements</option>
        <option *ngFor="let d of departments()" [value]="d">{{ d }}</option>
      </select>
      <button *ngIf="search() || deptF()" class="btn-sm" (click)="clearF()">✕ Réinitialiser</button>
    </div>
  </div>

  <!-- Info banner when dept selected -->
  <div class="info-banner" *ngIf="deptF() && !loading()">
    <span>🏢 <strong>{{ deptF() }}</strong> — {{ getDeptCount() }} employé(s) affichés</span>
    <button class="btn-sm" (click)="clearF()">Voir tous →</button>
  </div>

  <!-- Flat-mode banner -->
  <div class="flat-banner" *ngIf="isFlat() && viewMode() === 'manager'">
    <span>⚠️ <strong>Aucune relation manager détectée.</strong></span>
    <button class="btn-sm btn-go" (click)="goContracts()">Aller aux Contrats →</button>
    <button class="btn-sm" (click)="setMode('department')">Voir par département →</button>
  </div>

  <!-- Loading / Error / Empty -->
  <div *ngIf="loading()" class="center"><div class="spin"></div><span>Chargement…</span></div>
  <div *ngIf="error()"   class="err">{{ error() }}</div>
  <div *ngIf="!loading() && !error() && totalCount() === 0" class="center">
    <div style="font-size:2.5rem">🏢</div>
    <p>Aucun employé.</p>
  </div>
  <div *ngIf="!loading() && !error() && totalCount() > 0 && layout().nodes.length === 0" class="center">
    <p>Aucun résultat pour ce filtre.</p>
    <button class="btn-sm" (click)="clearF()">Réinitialiser</button>
  </div>

  <!-- Viewport -->
  <div *ngIf="!loading() && !error() && layout().nodes.length > 0"
       class="viewport"
       (wheel)="onWheel($event)"
       (mousedown)="ps($event)" (mousemove)="pm($event)"
       (mouseup)="pe()" (mouseleave)="pe()">

    <div class="canvas"
         [style.transform]="tf()"
         [style.width.px]="layout().w"
         [style.height.px]="layout().h">

      <svg class="svg" [attr.width]="layout().w" [attr.height]="layout().h">
        <path *ngFor="let ln of layout().nodes"
              [attr.d]="connPath(ln)"
              fill="none"
              [attr.stroke]="isHL(ln.node) ? '#4DA3FF' : '#CBD5E1'"
              stroke-width="1.5" stroke-linecap="round"/>
      </svg>

      <ng-container *ngFor="let ln of layout().nodes">

        <!-- Department virtual node -->
        <div *ngIf="ln.isDept"
             class="card dept-card"
             [class.match]="isHL(ln.node)"
             [class.dim]="isDim(ln.node)"
             [style.left.px]="ln.lx"
             [style.top.px]="ln.y"
             (click)="onDeptChange(ln.node.firstName)">
          <div class="dept-inner">
            <div class="dept-icon">🏢</div>
            <div>
              <div class="dept-name">{{ ln.node.firstName }}</div>
              <div class="dept-sub">{{ ln.childCount }} employé{{ ln.childCount > 1 ? 's' : '' }}</div>
            </div>
          </div>
        </div>

        <!-- Employee node -->
        <div *ngIf="!ln.isDept"
             class="card emp-card"
             [class.root]="ln.depth === 0"
             [class.match]="isHL(ln.node)"
             [class.dim]="isDim(ln.node)"
             [style.left.px]="ln.lx"
             [style.top.px]="ln.y"
             (click)="open(ln.node)">
          <div class="card-top">
            <div class="av" [style.background]="avBg(ln.node.firstName)">{{ ini(ln.node) }}</div>
            <span class="rp" [ngClass]="rpCls(ln.depth, ln.childCount)">
              {{ rpLbl(ln.depth, ln.childCount) }}
            </span>
          </div>
          <div class="cn">{{ ln.node.firstName }} {{ ln.node.lastName }}</div>
          <div class="cp">{{ ln.node.positionTitle || '—' }}</div>
          <div class="cd" *ngIf="ln.node.departmentName">{{ ln.node.departmentName }}</div>
          <div class="csub" *ngIf="ln.childCount > 0">{{ ln.childCount }} subordonné{{ ln.childCount > 1 ? 's' : '' }}</div>
        </div>

      </ng-container>
    </div>
  </div>

  <!-- Zoom bar -->
  <div class="zbar" *ngIf="!loading() && layout().nodes.length > 0">
    <button (click)="zo()">−</button>
    <span>{{ pct() }}%</span>
    <button (click)="zi()">+</button>
    <div class="zsep"></div>
    <button title="Réinitialiser la vue" (click)="rv()">⌂</button>
    <div class="zsep"></div>
    <!-- Quick dept nav -->
    <span class="zdept-label">Dept :</span>
    <select class="zdept-sel" [ngModel]="deptF()" (ngModelChange)="onDeptChange($event)">
      <option value="">Tous</option>
      <option *ngFor="let d of departments()" [value]="d">{{ d }}</option>
    </select>
  </div>
</div>

<!-- Detail modal -->
<div class="mbg" *ngIf="sel()" (click)="sel.set(null)">
  <div class="modal" (click)="$event.stopPropagation()">
    <button class="mx" (click)="sel.set(null)">✕</button>
    <div class="mhero">
      <div class="mav" [style.background]="avBg(sel()!.firstName)">{{ ini(sel()!) }}</div>
      <div>
        <div class="mn">{{ sel()!.firstName }} {{ sel()!.lastName }}</div>
        <div class="mp">{{ sel()!.positionTitle || '—' }}</div>
      </div>
    </div>
    <div class="mgrid">
      <div class="mf"><span class="ml">Département</span><span class="mv">{{ sel()!.departmentName || '—' }}</span></div>
      <div class="mf"><span class="ml">Service</span><span class="mv">{{ sel()!.serviceName || '—' }}</span></div>
      <div class="mf"><span class="ml">Email</span><span class="mv xs">{{ sel()!.email || '—' }}</span></div>
      <div class="mf"><span class="ml">Téléphone</span><span class="mv">{{ sel()!.phone || '—' }}</span></div>
      <div class="mf">
        <span class="ml">Contrat</span>
        <span class="ct" *ngIf="sel()!.contractType" [ngClass]="'ct-'+sel()!.contractType">{{ sel()!.contractType }}</span>
      </div>
      <div class="mf"><span class="ml">Subordonnés</span><span class="mv">{{ sel()!.children?.length || 0 }}</span></div>
    </div>
    <div *ngIf="sel()!.children?.length" class="msubs">
      <div class="msl">Subordonnés directs</div>
      <div class="msr">
        <span class="msc" *ngFor="let c of sel()!.children">{{ c.firstName }} {{ c.lastName }}</span>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .page { display:flex; flex-direction:column; height:calc(100vh - 110px); min-height:500px; background:#F0F4F8; border-radius:16px; overflow:hidden; border:1px solid #E2E8F0; }

    .toolbar { display:flex; justify-content:space-between; align-items:center; padding:.7rem 1.2rem; background:#fff; border-bottom:1px solid #E2E8F0; flex-shrink:0; flex-wrap:wrap; gap:.5rem; }
    .tb-l { display:flex; align-items:center; gap:.6rem; }
    .tb-r { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
    h2 { margin:0; font-size:1.1rem; font-weight:800; color:#0F172A; }
    .n-pill { background:#EFF6FF; color:#1D4ED8; border-radius:999px; padding:.13rem .6rem; font-size:.7rem; font-weight:700; }

    .mode-toggle { display:flex; border:1.5px solid #E2E8F0; border-radius:9px; overflow:hidden; }
    .mode-toggle button { padding:.3rem .7rem; font-size:.76rem; font-weight:600; border:none; background:#F8FAFC; color:#64748B; cursor:pointer; transition:all .12s; }
    .mode-toggle button.active { background:#0F172A; color:#fff; }

    .search-box { display:flex; align-items:center; gap:.3rem; background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:9px; padding:.3rem .6rem; min-width:170px; color:#94A3B8; transition:border-color .15s; }
    .search-box.focused { border-color:#4DA3FF; color:#4DA3FF; }
    .search-box input { border:none; background:transparent; outline:none; font-size:.8rem; color:#1e293b; flex:1; }
    .search-box button { background:none; border:none; cursor:pointer; color:#94A3B8; padding:0; font-size:.74rem; }
    .sel { padding:.3rem .5rem; border-radius:8px; border:1.5px solid #E2E8F0; background:#F8FAFC; color:#374151; font-size:.78rem; outline:none; }
    .sel:focus { border-color:#4DA3FF; }
    .btn-sm { padding:.28rem .65rem; border-radius:7px; border:1.5px solid #E2E8F0; background:transparent; color:#374151; font-size:.74rem; cursor:pointer; font-weight:600; white-space:nowrap; }
    .btn-sm:hover { border-color:#4DA3FF; color:#4DA3FF; }
    .btn-go { background:#0F172A; color:#fff; border-color:#0F172A; }
    .btn-go:hover { background:#1E293B; border-color:#1E293B; color:#fff; }

    .info-banner { display:flex; align-items:center; justify-content:space-between; gap:.75rem; padding:.5rem 1.2rem; background:#EFF6FF; border-bottom:1px solid #BFDBFE; font-size:.82rem; color:#1D4ED8; flex-shrink:0; }
    .flat-banner { display:flex; align-items:center; gap:.75rem; padding:.65rem 1.2rem; background:#FFF7ED; border-bottom:1px solid #FED7AA; font-size:.82rem; color:#92400E; flex-shrink:0; flex-wrap:wrap; }

    .center { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.65rem; color:#94A3B8; text-align:center; padding:2rem; }
    .spin { width:30px; height:30px; border:3px solid #E2E8F0; border-top-color:#4DA3FF; border-radius:50%; animation:spin .6s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .err { margin:.75rem; padding:.65rem .9rem; background:rgba(239,68,68,.08); border-left:4px solid #EF4444; color:#991B1B; border-radius:8px; font-size:.85rem; flex-shrink:0; }

    .viewport { flex:1; overflow:hidden; position:relative; cursor:grab; background:radial-gradient(ellipse at 50% 0%,#E8EFF8 0%,#EDF1F7 100%); }
    .viewport:active { cursor:grabbing; }
    .canvas { position:absolute; transform-origin:0 0; }
    .svg { position:absolute; top:0; left:0; pointer-events:none; overflow:visible; }

    .card { position:absolute; border-radius:12px; box-sizing:border-box; }

    .dept-card {
      width: ${NW_DEPT}px;
      height: ${NH_DEPT}px;
      background:linear-gradient(135deg,#1E293B,#334155);
      border:none;
      box-shadow:0 4px 16px rgba(15,23,42,.22);
      display:flex; align-items:center; justify-content:center;
      cursor:pointer;
      transition:transform .15s, box-shadow .15s;
    }
    .dept-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(15,23,42,.3); }
    .dept-card.match { box-shadow:0 0 0 3px #F59E0B, 0 6px 20px rgba(0,0,0,.15) !important; }
    .dept-inner { display:flex; align-items:center; gap:.65rem; padding:.5rem .85rem; }
    .dept-icon { font-size:1.3rem; }
    .dept-name { font-size:.82rem; font-weight:800; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px; }
    .dept-sub  { font-size:.62rem; color:#94A3B8; margin-top:.1rem; }

    .emp-card {
      width: ${NW}px;
      height: ${NH}px;
      background:#fff;
      border:1.5px solid #E2E8F0;
      padding:.6rem .72rem .5rem;
      box-shadow:0 2px 8px rgba(15,23,42,.06);
      cursor:pointer;
      transition:transform .18s,box-shadow .18s,border-color .18s;
    }
    .emp-card:hover { transform:translateY(-3px); box-shadow:0 10px 26px rgba(77,163,255,.18); border-color:rgba(77,163,255,.45); }
    .emp-card.root { border-color:#4DA3FF; border-width:2px; box-shadow:0 4px 18px rgba(77,163,255,.2); }
    .emp-card.match { border-color:#F59E0B !important; box-shadow:0 0 0 3px rgba(245,158,11,.2),0 6px 18px rgba(0,0,0,.08) !important; }
    .emp-card.dim { opacity:.18; pointer-events:none; }

    .card-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:.25rem; }
    .av { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.68rem; font-weight:800; color:#fff; box-shadow:0 2px 5px rgba(0,0,0,.15); flex-shrink:0; }
    .rp { font-size:.48rem; font-weight:800; padding:.08rem .36rem; border-radius:999px; text-transform:uppercase; letter-spacing:.07em; align-self:flex-start; margin-top:.1rem; }
    .rp-pdg { background:#FEF3C7; color:#92400E; }
    .rp-dir { background:#EDE9FE; color:#6D28D9; }
    .rp-mgr { background:#DBEAFE; color:#1D4ED8; }
    .rp-emp { background:#DCFCE7; color:#166534; }

    .cn  { font-size:.78rem; font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cp  { font-size:.65rem; color:#64748B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:.06rem; }
    .cd  { font-size:.58rem; color:#94A3B8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:.05rem; }
    .csub{ font-size:.55rem; font-weight:700; color:#4DA3FF; background:rgba(77,163,255,.1); border-radius:999px; padding:.06rem .36rem; display:inline-block; margin-top:.12rem; }

    .zbar { display:flex; align-items:center; gap:.32rem; padding:.4rem 1rem; justify-content:flex-end; background:rgba(255,255,255,.92); border-top:1px solid #E2E8F0; backdrop-filter:blur(6px); flex-shrink:0; }
    .zbar button { width:26px; height:26px; border:1.5px solid #E2E8F0; border-radius:7px; background:#fff; cursor:pointer; font-size:.95rem; display:flex; align-items:center; justify-content:center; color:#374151; transition:all .1s; }
    .zbar button:hover { border-color:#4DA3FF; color:#4DA3FF; }
    .zbar span { font-size:.74rem; color:#64748B; min-width:34px; text-align:center; }
    .zsep { width:1px; height:16px; background:#E2E8F0; margin:0 .08rem; }
    .zdept-label { font-size:.72rem; color:#64748B; white-space:nowrap; }
    .zdept-sel { padding:.2rem .4rem; border-radius:6px; border:1.5px solid #E2E8F0; background:#F8FAFC; color:#374151; font-size:.72rem; outline:none; max-width:160px; }
    .zdept-sel:focus { border-color:#4DA3FF; }

    .mbg { position:fixed; inset:0; background:rgba(15,23,42,.48); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem; }
    .modal { background:#fff; border-radius:20px; width:100%; max-width:450px; box-shadow:0 28px 72px rgba(0,0,0,.2); padding:1.65rem; position:relative; }
    .mx { position:absolute; top:.9rem; right:.9rem; background:#F8FAFC; border:none; font-size:.85rem; cursor:pointer; color:#94A3B8; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
    .mx:hover { background:#F1F5F9; color:#374151; }
    .mhero { display:flex; align-items:center; gap:.9rem; margin-bottom:1.1rem; }
    .mav { width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.15rem; font-weight:800; color:#fff; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,.15); }
    .mn { font-size:1rem; font-weight:800; color:#0F172A; }
    .mp { font-size:.8rem; color:#64748B; margin-top:.1rem; }
    .mgrid { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; background:#F8FAFC; border-radius:11px; padding:.85rem; margin-bottom:.9rem; }
    .mf { display:flex; flex-direction:column; gap:.14rem; }
    .ml { font-size:.59rem; color:#94A3B8; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
    .mv { font-size:.79rem; color:#1e293b; font-weight:500; }
    .mv.xs { font-size:.71rem; word-break:break-all; }
    .ct { font-size:.62rem; font-weight:700; padding:.12rem .45rem; border-radius:999px; align-self:flex-start; }
    .ct-CDI        { background:rgba(34,197,94,.12);   color:#166534; }
    .ct-CDD        { background:rgba(251,146,60,.12);  color:#c2410c; }
    .ct-STAGE      { background:rgba(167,139,250,.12); color:#6d28d9; }
    .ct-FREELANCE  { background:rgba(236,72,153,.12);  color:#9d174d; }
    .ct-ALTERNANCE { background:rgba(6,182,212,.1);    color:#0e7490; }
    .msubs { }
    .msl { font-size:.64rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.4rem; }
    .msr { display:flex; flex-wrap:wrap; gap:.25rem; }
    .msc { background:rgba(77,163,255,.1); color:#1D4ED8; border-radius:999px; padding:.15rem .58rem; font-size:.71rem; font-weight:600; }
  `]
})
export class OrgchartComponent implements OnInit {
  private empSvc = inject(EmployeeService);
  private router  = inject(Router);

  loading   = signal(true);
  error     = signal('');
  treeRoots = signal<OrgNode[]>([]);
  allFlat   = signal<OrgNode[]>([]);

  viewMode = signal<ViewMode>('manager');
  search   = signal('');
  deptF    = signal('');
  sel      = signal<OrgNode | null>(null);
  sf       = false;

  scale = signal(0.4);
  panX  = signal(20);
  panY  = signal(20);
  private _p = false;
  private _d = { x: 0, y: 0, px: 0, py: 0 };

  totalCount = computed(() => this.allFlat().length);

  isFlat = computed(() => {
    const roots = this.treeRoots();
    return roots.length > 1 && roots.every(n => (n.children || []).length === 0);
  });

  departments = computed(() => {
    const s = new Set<string>();
    this.allFlat().forEach(n => { if (n.departmentName) s.add(n.departmentName); });
    return [...s].sort();
  });

  getDeptCount(): number {
    return this.allFlat().filter(n => n.departmentName === this.deptF()).length;
  }

  private displayRoots = computed<OrgNode[]>(() => {
    const mode = this.viewMode();
    const dept = this.deptF();

    // Si un département est sélectionné → toujours vue département pour ce dept
    if (dept) {
      const filtered = this.allFlat().filter(n => n.departmentName === dept);
      return this.buildDeptTree(filtered);
    }

    const base = (mode === 'department' || this.isFlat())
      ? this.buildDeptTree(this.allFlat())
      : this.treeRoots();

    const q = this.search().trim().toLowerCase();
    if (!q) return base;
    return this.filterBranches(base, q, '');
  });

  layout = computed(() => this.computeLayout(this.displayRoots()));
  tf  = computed(() => `translate(${this.panX()}px,${this.panY()}px) scale(${this.scale()})`);
  pct = computed(() => Math.round(this.scale() * 100));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      tree: this.empSvc.getOrgTree(),
      employees: this.empSvc.getEmployees(),
    }).subscribe({
      next: ({ tree, employees }) => {
        const activeEmployees = filterActiveEmployees(employees);
        const roots = filterActiveOrgTree(tree, activeEmployees);
        this.treeRoots.set(roots);
        this.allFlat.set(this.flatten(roots));
        this.loading.set(false);
        if (this.isFlat()) this.viewMode.set('department');
        // Auto-fit après chargement
        setTimeout(() => this.autoFit(), 200);
      },
      error: (err) => {
        const s = err?.status;
        this.error.set(
          s === 401 ? 'Non authentifié (401).'
          : s === 403 ? 'Accès refusé (403).'
          : s === 404 ? 'Endpoint introuvable (404).'
          : 'Impossible de joindre le backend.'
        );
        this.loading.set(false);
      }
    });
  }

  autoFit(): void {
    const w = this.layout().w;
    const h = this.layout().h;
    if (!w || !h) return;
    const vw = window.innerWidth  - 80;
    const vh = window.innerHeight - 220;
    const s  = Math.min(vw / w, vh / h, 0.55);
    this.scale.set(Math.max(0.12, s));
    this.panX.set(20);
    this.panY.set(20);
  }

  setMode(m: ViewMode): void {
    this.viewMode.set(m);
    setTimeout(() => this.autoFit(), 100);
  }

  onDeptChange(dept: string): void {
    this.deptF.set(dept);
    setTimeout(() => this.autoFit(), 100);
  }

  goContracts(): void { this.router.navigate(['/rh-admin/contrats']); }

  private buildDeptTree(flat: OrgNode[]): OrgNode[] {
    const map = new Map<string, OrgNode[]>();
    for (const n of flat) {
      const k = n.departmentName || 'Sans département';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(n);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(([dept, emps]) => ({
        id: `__dept__${dept}`,
        firstName: dept,
        lastName: '',
        positionTitle: `${emps.length} employé(s)`,
        departmentName: dept,
        departmentId: emps[0]?.departmentId || '',
        children: emps.map(e => ({ ...e, children: [] })),
      } as OrgNode));
  }

  private computeLayout(roots: OrgNode[]) {
    if (!roots.length) return { nodes: [] as LN[], w: 0, h: 0, map: new Map<string, LN>() };

    const all: LN[] = [];
    const wc = new Map<string, number>();

    const cardW = (id: string) => id.startsWith('__dept__') ? NW_DEPT : NW;
    const cardH = (id: string) => id.startsWith('__dept__') ? NH_DEPT : NH;

    const sw = (n: OrgNode): number => {
      if (wc.has(n.id)) return wc.get(n.id)!;
      const ch = n.children || [];
      const w = ch.length === 0
        ? cardW(n.id)
        : Math.max(cardW(n.id), ch.reduce((s, c) => s + sw(c), 0) + HG * (ch.length - 1));
      wc.set(n.id, w);
      return w;
    };

    const assign = (n: OrgNode, d: number, left: number, pid: string | null): void => {
      const w   = sw(n);
      const cw  = cardW(n.id);
      const ch  = cardH(n.id);
      const cx  = left + w / 2 + PAD;
      const y   = d * (NH + VG) + PAD;
      const isDept = n.id.startsWith('__dept__');
      all.push({ id: n.id, node: n, cx, y, lx: cx - cw / 2, depth: d, parentId: pid,
                 childCount: (n.children || []).length, isDept, cardW: cw, cardH: ch });
      let cl = left;
      for (const c of (n.children || [])) { assign(c, d + 1, cl, n.id); cl += sw(c) + HG; }
    };

    let left = 0;
    for (const r of roots) { assign(r, 0, left, null); left += sw(r) + HG; }

    const map = new Map<string, LN>(all.map(n => [n.id, n]));
    const mx = Math.max(...all.map(n => n.cx + n.cardW / 2));
    const my = Math.max(...all.map(n => n.y + n.cardH));
    return { nodes: all, w: mx + PAD, h: my + PAD, map };
  }

  connPath(ln: LN): string {
    if (!ln.parentId) return '';
    const p = this.layout().map.get(ln.parentId);
    if (!p) return '';
    const x1 = p.cx,  y1 = p.y + p.cardH;
    const x2 = ln.cx, y2 = ln.y;
    const my = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
  }

  private filterBranches(nodes: OrgNode[], q: string, dept: string): OrgNode[] {
    return nodes
      .map(n => ({ ...n, children: this.filterBranches(n.children || [], q, dept) }))
      .filter(n => n.children.length > 0 || this.sm(n, q, dept));
  }
  private sm(n: OrgNode, q: string, dept: string): boolean {
    const dOk = !dept || n.departmentName === dept || n.firstName === dept;
    const qOk = !q   || `${n.firstName} ${n.lastName} ${n.positionTitle || ''}`.toLowerCase().includes(q);
    return dOk && qOk;
  }
  isHL(n: OrgNode):  boolean { const q = this.search().trim().toLowerCase(); return !!q && this.sm(n, q, ''); }
  isDim(n: OrgNode): boolean {
    const q = this.search().trim().toLowerCase(), d = this.deptF();
    if (!q && !d) return false;
    return !this.sm(n, q, d);
  }
  clearF(): void {
    this.search.set('');
    this.deptF.set('');
    setTimeout(() => this.autoFit(), 100);
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.scale.update(s => Math.min(2.5, Math.max(0.08, s + (e.deltaY > 0 ? -0.06 : 0.06))));
  }
  ps(e: MouseEvent): void { if (e.button) return; this._p=true; this._d={x:e.clientX,y:e.clientY,px:this.panX(),py:this.panY()}; }
  pm(e: MouseEvent): void { if (!this._p) return; this.panX.set(this._d.px+e.clientX-this._d.x); this.panY.set(this._d.py+e.clientY-this._d.y); }
  pe(): void { this._p=false; }
  zi(): void { this.scale.update(s => Math.min(2.5, s+0.08)); }
  zo(): void { this.scale.update(s => Math.max(0.08, s-0.08)); }
  rv(): void { this.autoFit(); }

  open(n: OrgNode): void { if (!n.id.startsWith('__dept__')) this.sel.set(n); }
  ini(n: OrgNode): string { return (n.firstName||'?').charAt(0).toUpperCase()+(n.lastName||'').charAt(0).toUpperCase(); }

  rpLbl(d: number, ch: number): string {
    if (d === 0) return 'PDG';
    if (d === 1) return 'DIRECTEUR';
    return ch > 0 ? 'MANAGER' : 'EMPLOYÉ';
  }
  rpCls(d: number, ch: number): string {
    if (d === 0) return 'rp-pdg';
    if (d === 1) return 'rp-dir';
    return ch > 0 ? 'rp-mgr' : 'rp-emp';
  }

  private readonly PAL = ['#4DA3FF','#22C55E','#F59E0B','#EC4899','#8B5CF6','#06B6D4','#F97316','#10B981'];
  avBg(n: string): string { return this.PAL[(n?.charCodeAt(0)||0) % this.PAL.length]; }

  private flatten(nodes: OrgNode[]): OrgNode[] {
    return nodes.flatMap(n => [n, ...this.flatten(n.children||[])]);
  }
}