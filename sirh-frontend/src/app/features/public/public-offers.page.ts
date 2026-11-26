import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { JobOffer } from '../../core/services/recruitment.models';

@Component({
  selector: 'app-public-offers',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="public-offers-page">

      <!-- Header -->
      <header class="offers-header">
        <div class="header-content">
          <div class="logo-area">
            <span class="logo-icon">🏢</span>
            <span class="logo-text">SIRH — Offres d'emploi</span>
          </div>
          <p class="header-sub">Rejoignez notre équipe — découvrez nos opportunités ouvertes</p>
        </div>
      </header>

      <main class="offers-main">

        <!-- Barre de recherche -->
        <div class="search-bar">
          <input
            type="text"
            placeholder="🔍  Rechercher un poste, département..."
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
          />
          <span class="count">{{ filtered().length }} offre(s)</span>
        </div>

        <!-- Chargement -->
        <div *ngIf="loading()" class="state-msg">Chargement des offres...</div>
        <div *ngIf="!loading() && filtered().length === 0" class="state-msg">
          Aucune offre disponible pour le moment. Revenez bientôt !
        </div>

        <!-- Liste des offres -->
        <div class="offers-grid" *ngIf="!loading() && filtered().length > 0">
          <div class="offer-card" *ngFor="let offer of filtered()">

            <div class="card-top">
              <div class="offer-dept">{{ offer.department }}</div>
              <div class="offer-badge">{{ offer.status === 'PUBLISHED' ? 'Ouvert' : offer.status }}</div>
            </div>

            <h2 class="offer-title">{{ offer.title }}</h2>

            <div class="offer-meta">
              <span *ngIf="offer.location">📍 {{ offer.location }}</span>
              <span *ngIf="offer.deadlineDate">📅 Jusqu'au {{ offer.deadlineDate | date:'dd/MM/yyyy' }}</span>
            </div>

            <p class="offer-desc" *ngIf="offer.description">
              {{ offer.description | slice:0:160 }}{{ offer.description.length > 160 ? '...' : '' }}
            </p>

            <div class="offer-skills" *ngIf="offer.requiredSkills?.length">
              <span class="skill-tag" *ngFor="let s of offer.requiredSkills | slice:0:5">{{ s.name }}</span>
              <span class="skill-more" *ngIf="offer.requiredSkills.length > 5">
                +{{ offer.requiredSkills.length - 5 }}
              </span>
            </div>

            <button class="btn-apply" (click)="apply(offer.id)">
              Postuler à cette offre →
            </button>

          </div>
        </div>

      </main>

      <footer class="offers-footer">
        <p>© 2026 SIRH · Tous droits réservés</p>
      </footer>

    </div>
  `,
  styles: [`
    .public-offers-page {
      min-height: 100vh;
      background: #f0f4f8;
      font-family: 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .offers-header {
      background: linear-gradient(135deg, #1e293b 0%, #1e3a5f 100%);
      padding: 2.5rem 2rem;
      text-align: center;
      color: #fff;
    }
    .logo-area { display: flex; align-items: center; justify-content: center; gap: .75rem; margin-bottom: .75rem; }
    .logo-icon { font-size: 2rem; }
    .logo-text { font-size: 1.4rem; font-weight: 700; }
    .header-sub { color: rgba(255,255,255,.65); font-size: .95rem; margin: 0; }

    /* ── Main ── */
    .offers-main { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; flex: 1; width: 100%; box-sizing: border-box; }

    /* ── Search ── */
    .search-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .search-bar input {
      flex: 1;
      padding: .8rem 1.2rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: .95rem;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }
    .search-bar input:focus { outline: none; border-color: #6366f1; }
    .count { color: #64748b; font-size: .85rem; white-space: nowrap; }

    /* ── Grid ── */
    .offers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    /* ── Card ── */
    .offer-card {
      background: #fff;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
      display: flex;
      flex-direction: column;
      gap: .75rem;
      border: 1.5px solid transparent;
      transition: border-color .2s, box-shadow .2s;
    }
    .offer-card:hover { border-color: #6366f1; box-shadow: 0 4px 20px rgba(99,102,241,.12); }

    .card-top { display: flex; align-items: center; justify-content: space-between; }
    .offer-dept { font-size: .78rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: .05em; }
    .offer-badge { font-size: .72rem; font-weight: 600; background: #dcfce7; color: #16a34a; padding: .2rem .6rem; border-radius: 20px; }

    .offer-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; line-height: 1.3; }

    .offer-meta { display: flex; gap: 1rem; flex-wrap: wrap; }
    .offer-meta span { font-size: .82rem; color: #64748b; }

    .offer-desc { font-size: .88rem; color: #475569; line-height: 1.6; margin: 0; flex: 1; }

    .offer-skills { display: flex; flex-wrap: wrap; gap: .4rem; }
    .skill-tag { font-size: .75rem; background: #eff6ff; color: #3b82f6; padding: .25rem .65rem; border-radius: 20px; font-weight: 500; }
    .skill-more { font-size: .75rem; color: #94a3b8; padding: .25rem .5rem; }

    .btn-apply {
      margin-top: .5rem;
      padding: .75rem 1rem;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: .9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background .2s;
      text-align: center;
    }
    .btn-apply:hover { background: #4f46e5; }

    /* ── States ── */
    .state-msg { text-align: center; padding: 4rem; color: #94a3b8; font-size: 1rem; }

    /* ── Footer ── */
    .offers-footer { text-align: center; padding: 1.5rem; color: #94a3b8; font-size: .82rem; }
  `]
})
export class PublicOffersPageComponent implements OnInit {
  offers = signal<JobOffer[]>([]);
  loading = signal(true);
  searchQuery = signal('');

  filtered = () => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.offers();
    return this.offers().filter(o =>
      o.title?.toLowerCase().includes(q) ||
      o.department?.toLowerCase().includes(q) ||
      o.location?.toLowerCase().includes(q) ||
      o.requiredSkills?.some(s => s.name.toLowerCase().includes(q))
    );
  };

  constructor(private recruitment: RecruitmentService, private router: Router) {}

  ngOnInit() {
    this.recruitment.getPublishedOffersPublic().subscribe({
      next: (offers) => { this.offers.set(offers); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  apply(offerId: string) {
    this.router.navigate(['/postuler', offerId]);
  }
}
