import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MobilityService, MobilityPolicy } from '../../core/services/mobility.service';

const DEFAULT_POLICY: MobilityPolicy = {
  minimumSeniorityMonths: 6,
  allowedContractTypes: ['CDI', 'CDD'],
  maxSimultaneousApplications: 3,
  cooldownAfterRejectionDays: 90,
  managerApprovalRequired: true,
  notifyHrOnApplication: true,
  interDepartmentAllowed: true,
  internationalAllowed: false,
};

@Component({
  selector: 'app-mobility-policies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Politiques de mobilité interne</h2>
          <p class="muted">Configurez les règles d'éligibilité et de gestion des mobilités internes.</p>
        </div>
        <div class="header-actions">
          <button class="btn-reset" (click)="resetToDefaults()">Réinitialiser</button>
          <button class="btn-save" (click)="savePolicies()" [disabled]="saving()">
            {{ saving() ? 'Enregistrement...' : 'Enregistrer les politiques' }}
          </button>
        </div>
      </div>

      <div class="saved-banner" *ngIf="savedMsg()">{{ savedMsg() }}</div>

      <div class="policy-grid">

        <!-- Éligibilité -->
        <div class="policy-card">
          <div class="card-icon">⏱️</div>
          <h3>Critères d'éligibilité</h3>
          <p class="muted card-desc">Définissez qui peut candidater à une mobilité interne.</p>

          <div class="field">
            <label>Ancienneté minimale requise (mois)</label>
            <div class="input-row">
              <input type="range" min="0" max="36" step="1" [(ngModel)]="policy.minimumSeniorityMonths" />
              <span class="range-val">{{ policy.minimumSeniorityMonths }} mois</span>
            </div>
          </div>

          <div class="field">
            <label>Types de contrats autorisés</label>
            <div class="checkbox-group">
              <label class="check-label" *ngFor="let ct of contractTypes">
                <input type="checkbox" [checked]="policy.allowedContractTypes.includes(ct)"
                       (change)="toggleContract(ct)" />
                <span>{{ ct }}</span>
              </label>
            </div>
          </div>

          <div class="field">
            <label>Candidatures simultanées maximales</label>
            <div class="input-row">
              <input type="range" min="1" max="10" step="1" [(ngModel)]="policy.maxSimultaneousApplications" />
              <span class="range-val">{{ policy.maxSimultaneousApplications }}</span>
            </div>
          </div>
        </div>

        <!-- Délais et contraintes -->
        <div class="policy-card">
          <div class="card-icon">🔄</div>
          <h3>Délais et contraintes</h3>
          <p class="muted card-desc">Gérez les périodes de carence et les restrictions temporelles.</p>

          <div class="field">
            <label>Carence après refus (jours)</label>
            <div class="input-row">
              <input type="range" min="0" max="365" step="30" [(ngModel)]="policy.cooldownAfterRejectionDays" />
              <span class="range-val">{{ policy.cooldownAfterRejectionDays }} j</span>
            </div>
            <span class="hint">Période pendant laquelle l'employé ne peut pas re-candidater après un refus.</span>
          </div>

          <div class="field">
            <label>Mobilité inter-départements</label>
            <div class="toggle-row">
              <button class="toggle-btn" [class.on]="policy.interDepartmentAllowed"
                      (click)="policy.interDepartmentAllowed = !policy.interDepartmentAllowed">
                {{ policy.interDepartmentAllowed ? 'Activé' : 'Désactivé' }}
              </button>
              <span class="muted">Autoriser les candidatures vers d'autres départements.</span>
            </div>
          </div>

          <div class="field">
            <label>Mobilité internationale</label>
            <div class="toggle-row">
              <button class="toggle-btn" [class.on]="policy.internationalAllowed"
                      (click)="policy.internationalAllowed = !policy.internationalAllowed">
                {{ policy.internationalAllowed ? 'Activé' : 'Désactivé' }}
              </button>
              <span class="muted">Inclure les postes à l'étranger dans les offres de mobilité.</span>
            </div>
          </div>
        </div>

        <!-- Validation et notifications -->
        <div class="policy-card">
          <div class="card-icon">🔔</div>
          <h3>Validation et notifications</h3>
          <p class="muted card-desc">Configurez les workflows d'approbation et les alertes automatiques.</p>

          <div class="field">
            <label>Approbation du manager requise</label>
            <div class="toggle-row">
              <button class="toggle-btn" [class.on]="policy.managerApprovalRequired"
                      (click)="policy.managerApprovalRequired = !policy.managerApprovalRequired">
                {{ policy.managerApprovalRequired ? 'Activé' : 'Désactivé' }}
              </button>
              <span class="muted">Le manager direct doit valider la candidature avant transmission RH.</span>
            </div>
          </div>

          <div class="field">
            <label>Notifier le service RH à chaque candidature</label>
            <div class="toggle-row">
              <button class="toggle-btn" [class.on]="policy.notifyHrOnApplication"
                      (click)="policy.notifyHrOnApplication = !policy.notifyHrOnApplication">
                {{ policy.notifyHrOnApplication ? 'Activé' : 'Désactivé' }}
              </button>
              <span class="muted">Un email de notification est envoyé aux RH pour chaque nouvelle candidature.</span>
            </div>
          </div>
        </div>

        <!-- Récapitulatif politique active -->
        <div class="policy-card summary-card">
          <div class="card-icon">📋</div>
          <h3>Récapitulatif — Politique active</h3>
          <div class="summary-list">
            <div class="summary-row">
              <span class="summary-label">Ancienneté min.</span>
              <span class="summary-val">{{ policy.minimumSeniorityMonths }} mois</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Contrats éligibles</span>
              <span class="summary-val">{{ policy.allowedContractTypes.join(', ') || 'Aucun' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Candidatures max</span>
              <span class="summary-val">{{ policy.maxSimultaneousApplications }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Carence après refus</span>
              <span class="summary-val">{{ policy.cooldownAfterRejectionDays }} jours</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Inter-départements</span>
              <span class="summary-val chip" [class.chip-on]="policy.interDepartmentAllowed">{{ policy.interDepartmentAllowed ? 'Oui' : 'Non' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">International</span>
              <span class="summary-val chip" [class.chip-on]="policy.internationalAllowed">{{ policy.internationalAllowed ? 'Oui' : 'Non' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Approbation manager</span>
              <span class="summary-val chip" [class.chip-on]="policy.managerApprovalRequired">{{ policy.managerApprovalRequired ? 'Requise' : 'Non requise' }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Notif. RH auto</span>
              <span class="summary-val chip" [class.chip-on]="policy.notifyHrOnApplication">{{ policy.notifyHrOnApplication ? 'Activée' : 'Désactivée' }}</span>
            </div>
          </div>
          <p class="last-saved muted" *ngIf="lastSaved()">Dernière sauvegarde : {{ lastSaved() | date:'dd/MM/yyyy HH:mm' }}</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .page-header h2 { margin: 0 0 0.25rem; color: #1e293b; }
    .muted { color: #9CA3AF; margin: 0; font-size: 0.875rem; }
    .header-actions { display: flex; gap: 0.75rem; align-items: center; }
    .btn-save { padding: 0.55rem 1.25rem; border-radius: 8px; border: none; background: linear-gradient(135deg,#4DA3FF,#6EE7B7); color: white; font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s; box-shadow: 0 2px 8px rgba(77,163,255,0.3); }
    .btn-save:hover:not(:disabled) { opacity: 0.9; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-reset { padding: 0.55rem 1.25rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: transparent; color: #6B7280; font-size: 0.9rem; cursor: pointer; transition: all 0.15s; font-weight: 600; }
    .btn-reset:hover { border-color: #4DA3FF; color: #4DA3FF; background: rgba(77,163,255,0.06); }
    .saved-banner { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); color: #166534; padding: 0.75rem 1.25rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; }
    .policy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
    .policy-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .card-icon { font-size: 1.75rem; margin-bottom: 0.5rem; }
    .policy-card h3 { margin: 0 0 0.3rem; font-size: 1.05rem; color: #1e293b; font-weight: 700; }
    .card-desc { margin-bottom: 1.25rem; }
    .field { margin-bottom: 1.25rem; }
    .field label { display: block; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; margin-bottom: 0.5rem; font-weight: 700; }
    .input-row { display: flex; align-items: center; gap: 0.75rem; }
    .input-row input[type=range] { flex: 1; accent-color: #4DA3FF; }
    .range-val { font-weight: 800; font-size: 0.95rem; min-width: 60px; text-align: right; color: #1e293b; }
    .hint { font-size: 0.78rem; color: #9CA3AF; display: block; margin-top: 0.35rem; }
    .checkbox-group { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .check-label { display: flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; cursor: pointer; background: #F8FAFC; padding: 0.35rem 0.75rem; border-radius: 20px; border: 1.5px solid #E5E7EB; transition: all 0.15s; color: #6B7280; }
    .check-label:has(input:checked) { border-color: #4DA3FF; background: rgba(77,163,255,0.08); color: #2E86FF; font-weight: 600; }
    .check-label input { accent-color: #4DA3FF; }
    .toggle-row { display: flex; align-items: center; gap: 0.75rem; }
    .toggle-btn { padding: 0.35rem 1rem; border-radius: 20px; border: 1.5px solid #E5E7EB; background: #F8FAFC; color: #9CA3AF; font-size: 0.82rem; font-weight: 700; cursor: pointer; transition: all 0.15s; }
    .toggle-btn.on { border-color: #22C55E; background: rgba(34,197,94,0.08); color: #166534; }
    .summary-card { border-color: rgba(77,163,255,0.25); background: rgba(77,163,255,0.02); }
    .summary-list { display: flex; flex-direction: column; gap: 0.6rem; margin: 1.25rem 0 0.75rem; }
    .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; padding-bottom: 0.4rem; border-bottom: 1px solid #F1F5F9; }
    .summary-label { color: #9CA3AF; }
    .summary-val { font-weight: 600; color: #374151; }
    .chip { padding: 0.15rem 0.55rem; border-radius: 4px; font-size: 0.78rem; background: rgba(255,107,107,0.1); color: #B91C1C; font-weight: 600; }
    .chip.chip-on { background: rgba(34,197,94,0.1); color: #166534; }
    .last-saved { font-size: 0.78rem; margin-top: 0.5rem; }
  `]
})
export class MobilityPoliciesComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  contractTypes = ['CDI', 'CDD', 'STAGE', 'FREELANCE', 'ALTERNANCE'];
  saving = signal(false);
  savedMsg = signal('');
  lastSaved = signal<Date | null>(null);

  policy: MobilityPolicy = { ...DEFAULT_POLICY, allowedContractTypes: [...DEFAULT_POLICY.allowedContractTypes] };

  ngOnInit(): void {
    this.mobilityService.getPolicy().subscribe({
      next: (p) => {
        this.policy = p;
      },
      error: () => {
        // Fallback sur les valeurs par défaut si le backend est indisponible
        this.policy = { ...DEFAULT_POLICY, allowedContractTypes: [...DEFAULT_POLICY.allowedContractTypes] };
      }
    });
  }

  toggleContract(ct: string): void {
    const idx = this.policy.allowedContractTypes.indexOf(ct);
    if (idx >= 0) {
      this.policy.allowedContractTypes = this.policy.allowedContractTypes.filter(c => c !== ct);
    } else {
      this.policy.allowedContractTypes = [...this.policy.allowedContractTypes, ct];
    }
  }

  savePolicies(): void {
    this.saving.set(true);
    this.mobilityService.savePolicy(this.policy).subscribe({
      next: (saved) => {
        this.policy = saved;
        this.lastSaved.set(new Date());
        this.saving.set(false);
        this.savedMsg.set('✓ Politiques de mobilité enregistrées avec succès.');
        setTimeout(() => this.savedMsg.set(''), 4000);
      },
      error: () => {
        this.saving.set(false);
        this.savedMsg.set('✗ Erreur lors de l\'enregistrement. Veuillez réessayer.');
        setTimeout(() => this.savedMsg.set(''), 4000);
      }
    });
  }

  resetToDefaults(): void {
    if (confirm('Réinitialiser toutes les politiques aux valeurs par défaut ?')) {
      this.mobilityService.getPolicy().subscribe({
        next: (p) => {
          this.policy = p;
          this.savedMsg.set('');
        }
      });
    }
  }
}
