import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing">
      <!-- Decorative Background Orbs -->
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="orb orb-3"></div>

      <header class="topbar slide-down">
        <a class="brand" routerLink="/">
          <span class="brand-dot"></span>
          <div>
            <p class="brand-kicker">L'Humain au centre</p>
            <p class="brand-title">SIRH Next</p>
          </div>
        </a>
        <nav class="top-links">
          <a href="#features" (click)="scrollTo('features', $event)">L'Expérience</a>
          <a href="#innovation" (click)="scrollTo('innovation', $event)">Notre Technologie</a>
          <a href="#contact" (click)="scrollTo('contact', $event)">Nous Contacter</a>
        </nav>
        <div class="top-cta">
          <a class="btn ghost-shimmer" routerLink="/auth/login">Se Connecter 👋</a>
        </div>
      </header>

      <section class="hero fade-in-up">
        <div class="hero-copy">
          <p class="eyebrow">Redonnez du sens aux Ressources Humaines</p>
          <h1>Cultivez le potentiel de <br><span class="highlight-text">chaque talent.</span></h1>
          <p class="lead">
            SIRH Next n'est pas qu'un outil RH. C'est une plateforme vivante conçue pour connecter, inspirer et faire grandir vos collaborateurs tout en offrant une administration fluide et chaleureuse.
          </p>
          <div class="hero-actions">
            <a class="btn ghost large" href="#features" (click)="scrollTo('features', $event)">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Découvrir la magie
            </a>
          </div>
          
          <div class="user-avatars">
            <div class="avatars-stack">
              <img src="https://i.pravatar.cc/100?img=47" alt="User" />
              <img src="https://i.pravatar.cc/100?img=32" alt="User" />
              <img src="https://i.pravatar.cc/100?img=12" alt="User" />
              <img src="https://i.pravatar.cc/100?img=5" alt="User" />
              <div class="avatar-more">+2k</div>
            </div>
            <div class="avatars-text">
              <strong>Talents épanouis</strong>
              <span>Déjà recrutés via notre plateforme.</span>
            </div>
          </div>
        </div>

        <div class="hero-visual float-animation">
          <div class="hero-card glass-panel">
            <div class="card-header">
              <div class="card-icon">✨</div>
              <div>
                <p class="card-title">Matching Intelligent</p>
                <small class="card-subtitle">Analyse bienveillante des profils</small>
              </div>
            </div>
            <div class="score-row" *ngFor="let c of candidates; let i = index" [style.animation-delay]="i * 0.15 + 's'">
              <div class="identity">
                <img [src]="c.image" alt="Avatar" class="realistic-avatar" />
                <div>
                  <p>{{ c.name }}</p>
                  <small>{{ c.role }}</small>
                </div>
              </div>
              <div class="score">
                <div class="track">
                  <div class="fill shimmer-bg" [style.width.%]="c.score"></div>
                </div>
                <strong>{{ c.score }}%</strong>
              </div>
            </div>
            <div class="card-footer">
              <p>L'IA met en lumière les compétences cachées.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" class="section fade-in-scroll">
        <div class="section-head center-align">
          <p class="eyebrow">Une expérience sur-mesure</p>
          <h2>Pensé pour ceux qui font grandir l'entreprise.</h2>
        </div>
        <div class="grid role-grid">
          <article class="tile glass-panel hover-lift">
            <div class="tile-icon pulse-glow">👤</div>
            <h3>Pour l'Employé</h3>
            <p>Un espace bienveillant pour suivre son parcours, demander des formations et candidater en toute transparence.</p>
          </article>
          <article class="tile glass-panel hover-lift">
            <div class="tile-icon pulse-glow">🎯</div>
            <h3>Pour le Manager</h3>
            <p>Des outils intuitifs pour accompagner son équipe, célébrer les réussites et structurer les recrutements.</p>
          </article>
          <article class="tile glass-panel hover-lift">
            <div class="tile-icon pulse-glow">🛡️</div>
            <h3>Pour le DRH</h3>
            <p>Une vue d'ensemble claire, des reportings automatisés et une gouvernance sécurisée de l'entreprise.</p>
          </article>
        </div>
      </section>

      <section id="innovation" class="section innovation fade-in-scroll">
        <div class="innovation-content glass-panel">
          <div class="section-head">
            <p class="eyebrow">Innovation & Éthique</p>
            <h2>L'IA au service de l'humain, <br>pas l'inverse.</h2>
            <p class="lead" style="max-width: 500px">
              Notre moteur Gemini 1.5 analyse les CVs et les lettres de motivation avec une approche inclusive, favorisant la diversité et détectant le vrai potentiel au-delà des simples mots-clés.
            </p>
            <a class="btn primary glow-effect" style="margin-top: 1.5rem; display: inline-flex" routerLink="/auth/login">Comprendre notre charte IA</a>
          </div>
          <div class="innovation-visual">
            <div class="sphere"></div>
            <div class="chat-bubble left">"Identifie les soft-skills de ce candidat"</div>
            <div class="chat-bubble right highlight">✨ Excellente capacité de communication et leadership naturel détectés !</div>
          </div>
        </div>
      </section>

      <footer id="contact" class="footer">
        <div class="footer-content">
          <div class="brand">
            <span class="brand-dot"></span>
            <p class="brand-title">SIRH Next</p>
          </div>
          <p>© 2026 SIRH Next. Fabriqué avec passion.</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host { 
      display: block; 
      min-height: 100vh; 
      color: #0F172A; 
      font-family: 'Inter', system-ui, sans-serif;
      overflow-x: hidden;
    }
    
    /* Variables de design premium */
    :root {
      --primary: #4F46E5;
      --primary-light: #818CF8;
      --accent: #EC4899;
      --accent-warm: #F43F5E;
      --bg: #F8FAFC;
      --text: #0F172A;
      --text-dim: #475569;
      --text-muted: #94A3B8;
      --glass-bg: rgba(255, 255, 255, 0.7);
      --glass-border: rgba(255, 255, 255, 0.5);
      --glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
    }

    .landing {
      min-height: 100vh;
      background-color: var(--bg);
      position: relative;
      padding: 1.5rem;
      overflow: hidden;
    }

    /* Background Orbs pour profondeur et modernité */
    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      z-index: 0;
      opacity: 0.6;
      animation: float 20s infinite ease-in-out alternate;
    }
    .orb-1 {
      top: -10%; left: -5%;
      width: 50vw; height: 50vw;
      background: radial-gradient(circle, var(--primary-light), transparent 70%);
      animation-delay: 0s;
    }
    .orb-2 {
      bottom: -20%; right: -10%;
      width: 60vw; height: 60vw;
      background: radial-gradient(circle, #FBCFE8, transparent 70%);
      animation-delay: -5s;
    }
    .orb-3 {
      top: 40%; left: 60%;
      width: 40vw; height: 40vw;
      background: radial-gradient(circle, #C7D2FE, transparent 70%);
      animation-delay: -10s;
    }

    /* All sections must be above orbs */
    header, section, footer {
      position: relative;
      z-index: 10;
    }

    /* Glassmorphism Utilities */
    .glass-panel {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: 24px;
      box-shadow: var(--glass-shadow);
    }

    .topbar {
      max-width: 1200px; 
      margin: 0 auto;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }

    .brand { display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: inherit; }
    .brand-dot {
      width: 14px; height: 14px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      box-shadow: 0 0 16px rgba(236, 72, 153, 0.6);
      animation: pulse 3s infinite;
    }
    .brand-kicker { margin: 0; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; color: var(--accent); }
    .brand-title { margin: 0; font-size: 1.1rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
    
    .top-links { display: flex; gap: 2rem; }
    .top-links a { 
      color: var(--text-dim); text-decoration: none; font-weight: 600; font-size: 0.95rem; 
      position: relative; transition: color 0.3s;
    }
    .top-links a:hover { color: var(--primary); }
    .top-links a::after {
      content: ''; position: absolute; bottom: -4px; left: 0; width: 0; height: 2px;
      background: var(--primary); transition: width 0.3s ease; border-radius: 2px;
    }
    .top-links a:hover::after { width: 100%; }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 12px;
      padding: 0.6rem 1.2rem;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }
    .btn.large { padding: 0.9rem 1.8rem; font-size: 1.05rem; }
    .btn.primary {
      color: white;
      background: linear-gradient(135deg, var(--primary), #6366F1);
      border: none;
    }
    .btn.primary:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 10px 25px rgba(79, 70, 229, 0.4);
    }
    .btn.ghost {
      color: var(--text);
      background: rgba(255, 255, 255, 0.5);
      border: 1px solid rgba(0,0,0,0.05);
    }
    .btn.ghost:hover {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
    }
    .btn.ghost-shimmer {
      background: rgba(255, 255, 255, 0.9);
      color: var(--primary);
      border: 1px solid rgba(79, 70, 229, 0.2);
    }
    .btn.ghost-shimmer:hover {
      background: var(--primary);
      color: white;
    }

    .hero {
      max-width: 1200px; margin: 4rem auto 2rem;
      display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 4rem;
      align-items: center;
    }
    
    .eyebrow { 
      display: inline-block;
      margin: 0 0 1rem; 
      padding: 0.4rem 1rem;
      color: var(--accent); 
      background: rgba(236, 72, 153, 0.1);
      border-radius: 999px;
      text-transform: uppercase; letter-spacing: .08em; font-size: .75rem; font-weight: 800; 
    }
    h1 { 
      margin: 0; 
      font-size: clamp(2.5rem, 5vw, 4rem); 
      line-height: 1.1; 
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .highlight-text {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline-block;
    }
    .lead { 
      color: var(--text-dim); 
      margin: 1.5rem 0 2.5rem; 
      line-height: 1.8; 
      font-size: 1.15rem;
      max-width: 540px;
    }
    .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 3rem; }

    /* Social Proof / Human Touch elements */
    .user-avatars {
      display: flex; align-items: center; gap: 1rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(0,0,0,0.08);
    }
    .avatars-stack { display: flex; }
    .avatars-stack img, .avatar-more {
      width: 44px; height: 44px; border-radius: 50%;
      border: 3px solid #F8FAFC;
      margin-left: -12px;
      object-fit: cover;
    }
    .avatars-stack img:first-child { margin-left: 0; }
    .avatar-more {
      background: linear-gradient(135deg, #F1F5F9, #E2E8F0);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; color: var(--text-dim);
      z-index: 10;
    }
    .avatars-text strong { display: block; font-size: 0.95rem; }
    .avatars-text span { color: var(--text-muted); font-size: 0.85rem; }

    /* Right Card (Visual) */
    .hero-visual { position: relative; }
    .hero-card {
      padding: 2rem;
      position: относительно;
    }
    
    .card-header {
      display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;
    }
    .card-icon {
      width: 48px; height: 48px; border-radius: 14px;
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(236, 72, 153, 0.1));
      display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
    }
    .card-title { margin: 0; font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; }
    .card-subtitle { color: var(--text-muted); font-size: 0.9rem; }

    .score-row { 
      display: flex; align-items: center; justify-content: space-between; gap: 1rem; 
      margin-bottom: 1.25rem; 
      padding: 0.75rem;
      border-radius: 16px;
      transition: background 0.3s;
      animation: slideInRight 0.5s ease backwards;
    }
    .score-row:hover { background: rgba(255,255,255,0.6); }
    
    .identity { display: flex; gap: 1rem; align-items: center; }
    .realistic-avatar {
      width: 46px; height: 46px; border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 4px 10px rgba(0,0,0,0.08);
    }
    .identity p { margin: 0; font-weight: 700; font-size: 1rem; color: var(--text); }
    .identity small { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }
    
    .score { min-width: 140px; display: flex; align-items: center; gap: 1rem; }
    .track { flex: 1; height: 8px; border-radius: 999px; background: rgba(0,0,0,0.05); overflow: hidden; }
    .fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--primary-light), var(--primary)); }
    .score strong { font-size: 0.95rem; font-weight: 800; color: var(--text); width: 40px; text-align: right; }
    
    .card-footer {
      margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(0,0,0,0.05);
      text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;
    }

    /* Sections Common */
    .section {
      max-width: 1200px; margin: 6rem auto;
    }
    .center-align { text-align: center; margin-bottom: 4rem; }
    .center-align .eyebrow { margin: 0 auto 1rem; }
    .section-head h2 { margin: 0; font-size: clamp(2rem, 3.5vw, 3rem); font-weight: 800; letter-spacing: -0.03em; }
    
    .grid { display: grid; gap: 2rem; }
    .role-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
    
    .tile {
      padding: 2.5rem 2rem;
      text-align: center;
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .hover-lift:hover { transform: translateY(-10px); }
    
    .tile-icon {
      width: 64px; height: 64px; border-radius: 20px;
      background: white;
      margin: 0 auto 1.5rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
    }
    .tile h3 { margin: 0 0 1rem; font-size: 1.4rem; font-weight: 800; }
    .tile p { margin: 0; color: var(--text-dim); line-height: 1.7; font-size: 1.05rem; }

    /* Innovation Section */
    .innovation-content {
      display: grid; grid-template-columns: 1fr 1fr; gap: 4rem;
      padding: 4rem;
      align-items: center;
      background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,255,0.7));
    }
    .innovation-visual {
      position: relative; height: 400px; display: flex; flex-direction: column; justify-content: center;
    }
    .sphere {
      position: absolute; width: 300px; height: 300px; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: conic-gradient(from 0deg, var(--primary), var(--accent), var(--primary-light), var(--primary));
      filter: blur(40px); opacity: 0.15;
      animation: spin 10s linear infinite;
    }
    .chat-bubble {
      position: relative; z-index: 2;
      padding: 1.2rem 1.5rem; border-radius: 20px;
      font-size: 1.05rem; max-width: 85%; margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      animation: float 6s infinite ease-in-out;
    }
    .chat-bubble.left {
      background: white; border-bottom-left-radius: 4px; border: 1px solid rgba(0,0,0,0.05);
      align-self: flex-start;
    }
    .chat-bubble.right {
      background: #1E293B; color: white; border-bottom-right-radius: 4px;
      align-self: flex-end; animation-delay: 1s;
    }
    .chat-bubble.highlight {
      background: linear-gradient(135deg, var(--primary), #312E81);
    }

    .footer {
      border-top: 1px solid rgba(0,0,0,0.05);
      padding: 3rem 1.5rem;
      margin-top: 6rem;
    }
    .footer-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
    .footer p { color: var(--text-muted); font-size: 0.9rem; margin: 0; }

    /* Animations */
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
    @keyframes spin { 100% { transform: translate(-50%, -50%) rotate(360deg); } }
    @keyframes slide-down { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(236, 72, 153, 0); } 100% { box-shadow: 0 0 0 0 rgba(236, 72, 153, 0); } }
    
    .slide-down { animation: slide-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .fade-in-up { animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.2s; opacity: 0; }
    .float-animation { animation: float 10s infinite ease-in-out; }

    @media (max-width: 980px) {
      .top-links { display: none; }
      .hero, .innovation-content { grid-template-columns: 1fr; gap: 3rem; }
      .role-grid { grid-template-columns: 1fr; }
      .hero-copy { text-align: center; }
      .hero-actions { justify-content: center; }
      .user-avatars { justify-content: center; }
      .innovation-content { padding: 2.5rem 1.5rem; }
    }
    @media (max-width: 640px) {
      h1 { font-size: 2.5rem; }
      .topbar { flex-wrap: wrap; justify-content: center; }
      .top-cta { width: 100%; display: flex; justify-content: center; }
      .hero-card { padding: 1.5rem; }
      .footer-content { flex-direction: column; gap: 1rem; text-align: center; }
    }
  `]
})
export class HomePageComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);

  // Real-looking avatar placeholders to make it "humanized"
  candidates = [
    { name: 'Sarah L.', role: 'Tech Lead', score: 96, image: 'https://i.pravatar.cc/150?img=44' },
    { name: 'Thomas M.', role: 'Data Analyst', score: 89, image: 'https://i.pravatar.cc/150?img=11' },
    { name: 'Elena K.', role: 'Responsable RH', score: 82, image: 'https://i.pravatar.cc/150?img=5' },
  ];

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl(this.auth.defaultRouteForSession());
    }
  }

  scrollTo(id: string, event?: Event): void {
    event?.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY,
      behavior: 'smooth',
    });
  }

  ngOnDestroy(): void { }
}
