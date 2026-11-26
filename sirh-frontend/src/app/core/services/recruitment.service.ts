import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Application, ApplicationSource, ApplicationStatusUpdateRequest, JobOffer, OfferStatus, Skill } from './recruitment.models';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class RecruitmentService {
    private http = inject(HttpClient);
    private base = `${environment.apiBaseUrl}`;

    // ── Job Offers ─────────────────────────────────────────────
    getJobOffers(status?: OfferStatus): Observable<JobOffer[]> {
        const url = status
            ? `${this.base}/job-offers?status=${status}`
            : `${this.base}/job-offers`;
        return this.http.get<JobOffer[]>(url);
    }

    /** Offres créées par un manager spécifique */
    getJobOffersByCreator(email: string): Observable<JobOffer[]> {
        return this.http.get<JobOffer[]>(`${this.base}/job-offers?createdByEmail=${encodeURIComponent(email)}`);
    }

    /** Offres en attente de validation RH */
    getPendingValidationOffers(): Observable<JobOffer[]> {
        return this.http.get<JobOffer[]>(`${this.base}/job-offers/pending-validation`);
    }

    getJobOffer(id: string): Observable<JobOffer> {
        return this.http.get<JobOffer>(`${this.base}/job-offers/${id}`);
    }

    createJobOffer(offer: any): Observable<JobOffer> {
        return this.http.post<JobOffer>(`${this.base}/job-offers`, offer);
    }

    /** RH : valide et publie l'offre */
    validateJobOffer(id: string): Observable<JobOffer> {
        return this.http.post<JobOffer>(`${this.base}/job-offers/${id}/publish`, {});
    }

    /** RH : refuse l'offre avec motif */
    refuseJobOffer(id: string, reason: string): Observable<JobOffer> {
        return this.http.post<JobOffer>(`${this.base}/job-offers/${id}/refuse`, { reason });
    }

    closeJobOffer(id: string): Observable<JobOffer> {
        return this.http.post<JobOffer>(`${this.base}/job-offers/${id}/close`, {});
    }

    deleteJobOffer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/job-offers/${id}`);
    }

    updateJobOffer(id: string, offer: any): Observable<JobOffer> {
        return this.http.put<JobOffer>(`${this.base}/job-offers/${id}`, offer);
    }

    updateJobOfferStatus(id: string, status: OfferStatus): Observable<JobOffer> {
        if (status === 'CLOSED' || status === 'CANCELLED') {
            return this.closeJobOffer(id);
        }
        return this.http.put<JobOffer>(`${this.base}/job-offers/${id}`, { status });
    }

    // ── Applications ───────────────────────────────────────────
    /** Toutes les candidatures (sans filtre) — usage BI */
    getApplications(): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.base}/applications`);
    }

    getApplicationsByOffer(offerId: string): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.base}/applications?offerId=${offerId}`);
    }

    getMatchedApplicationsByOffer(offerId: string): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.base}/applications/match/${offerId}`);
    }

    getMyApplications(email: string): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.base}/applications?email=${encodeURIComponent(email)}`);
    }

    applyToJob(application: any): Observable<Application> {
        return this.http.post<Application>(`${this.base}/applications`, application);
    }

    /** Candidature externe — endpoint public sans JWT */
    applyExternal(application: any): Observable<Application> {
        return this.http.post<Application>(`${this.base}/applications/public`, application);
    }

    /** Offres publiées pour le formulaire public (sans JWT) */
    getPublishedOffersPublic(): Observable<JobOffer[]> {
        return this.http.get<JobOffer[]>(`${this.base}/applications/public/offers`);
    }

    /** Candidatures externes uniquement */
    getExternalApplications(): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.base}/applications?source=EXTERNAL`);
    }

    /** Candidatures externes pour une offre */
    getExternalApplicationsByOffer(offerId: string): Observable<Application[]> {
        return this.http.get<Application[]>(`${this.base}/applications?offerId=${offerId}&source=EXTERNAL`);
    }

    /** Met à jour le statut d'une candidature — envoie le corps complet (statut + détails entretien/refus) */
    updateApplicationStatus(id: string, req: ApplicationStatusUpdateRequest): Observable<Application> {
        return this.http.put<Application>(`${this.base}/applications/${id}/status`, req);
    }

    /** Supprime définitivement une candidature. */
    deleteApplication(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/applications/${id}`);
    }

   downloadCv(appId: string, fileName?: string, app?: Application): void {
  this.http
    .get(`${this.base}/applications/${appId}/cv`, { responseType: 'blob' })
    .subscribe({
      next: (blob) => {
        // CV réel existe → télécharger normalement
        if (blob.size === 0 && app) {
          this.generateCv(app);
          return;
        }
        const safeName = fileName?.trim() || `cv-${appId}.pdf`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = safeName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      },
      error: () => {
        // Pas de CV blob → générer automatiquement
        if (app) this.generateCv(app);
      }
    });
}

generateCv(app: Application): void {
  const profile = app.candidateProfile;
  const formation = profile?.formation ?? '';
  const langues = (profile?.langues ?? []);
  const experience = profile?.anneesExperience ?? 0;
  const niveau = profile?.niveau ?? '';
  const softSkills = (profile?.softSkills ?? []);
  const EXCLUDED = ['ci/cd','stage','alternance','dfbd','ing cloud com','fullstack devops'];
  const skills = (app.skills ?? []).filter((s: any) => !EXCLUDED.includes(s.name.toLowerCase()));
  const initials = app.applicantName ? app.applicantName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase() : '?';

  const expLines = experience > 0 ? [
    `${experience >= 8 ? '8+' : experience >= 5 ? '5+' : experience >= 3 ? '3+' : '1+'} ans — ${app.jobOfferTitle ?? 'Poste visé'}`,
  ] : [];

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
  <title>CV — ${app.applicantName}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    html { background:#c8c8c8; display:flex; justify-content:center; padding:30px 0; font-family:'Segoe UI',Arial,sans-serif; min-height:100vh; }
    body { display:flex; justify-content:center; align-items:flex-start; width:100%; }
    .page { width:210mm; min-height:297mm; background:#fff; display:flex; box-shadow:0 6px 32px rgba(0,0,0,.25); position:relative; }

    /* SIDEBAR */
    .sidebar { width:72mm; background:#1a1a2e; padding:0; color:#fff; flex-shrink:0; display:flex; flex-direction:column; }
    .sidebar-top { background:#16213e; padding:32px 22px 24px; text-align:center; border-bottom:3px solid #4DA3FF; }
    .avatar { width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg,#4DA3FF,#6366F1); display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:800; color:#fff; margin:0 auto 14px; border:3px solid #4DA3FF; }
    .s-name { font-size:15px; font-weight:800; color:#fff; line-height:1.3; }
    .s-title { font-size:10px; color:#94A3B8; margin-top:5px; line-height:1.4; }
    .sidebar-body { padding:22px 20px; display:flex; flex-direction:column; gap:20px; flex:1; }
    .s-section { }
    .s-section-title { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.12em; color:#4DA3FF; margin-bottom:10px; padding-bottom:5px; border-bottom:1px solid #2a2a4a; }
    .contact-item { display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; font-size:10px; color:#CBD5E1; line-height:1.4; word-break:break-all; }
    .c-icon { font-size:11px; flex-shrink:0; margin-top:1px; }
    .lang-item { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
    .lang-name { font-size:10.5px; color:#CBD5E1; }
    .lang-dots { display:flex; gap:3px; }
    .dot { width:7px; height:7px; border-radius:50%; background:#2a2a4a; }
    .dot.filled { background:#4DA3FF; }
    .skill-item { margin-bottom:9px; }
    .skill-name { font-size:10px; color:#CBD5E1; margin-bottom:3px; }
    .skill-bar-bg { width:100%; height:3px; background:#2a2a4a; border-radius:2px; }
    .skill-bar-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,#4DA3FF,#6366F1); }
    .soft-item { font-size:10px; color:#CBD5E1; margin-bottom:6px; padding-left:10px; position:relative; }
    .soft-item::before { content:'▸'; position:absolute; left:0; color:#4DA3FF; font-size:9px; }

    /* MAIN */
    .main { flex:1; padding:32px 28px; display:flex; flex-direction:column; gap:20px; }
    .main-header { border-bottom:3px solid #1a1a2e; padding-bottom:14px; }
    .main-name { font-size:26px; font-weight:800; color:#1a1a2e; letter-spacing:-.5px; }
    .main-subtitle { font-size:11px; color:#64748B; margin-top:4px; text-transform:uppercase; letter-spacing:.08em; font-weight:600; }
    .m-section { }
    .m-section-title { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.12em; color:#1a1a2e; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
    .m-section-title::before { content:''; width:20px; height:3px; background:#4DA3FF; border-radius:2px; flex-shrink:0; }
    .profile-text { font-size:11.5px; color:#475569; line-height:1.7; text-align:justify; }
    .exp-block { margin-bottom:12px; padding-left:12px; border-left:2px solid #E5E7EB; }
    .exp-title { font-size:12px; font-weight:700; color:#1e293b; }
    .exp-company { font-size:10.5px; color:#4DA3FF; font-weight:600; margin-top:2px; }
    .exp-date { font-size:10px; color:#94A3B8; margin-top:1px; }
    .exp-desc { font-size:10.5px; color:#475569; margin-top:5px; line-height:1.5; }
    .exp-desc li { margin-left:14px; margin-bottom:3px; }
    .form-block { margin-bottom:10px; }
    .form-degree { font-size:12px; font-weight:700; color:#1e293b; }
    .form-school { font-size:10.5px; color:#4DA3FF; font-weight:600; margin-top:2px; }
    .tags-wrap { display:flex; flex-wrap:wrap; gap:6px; }
    .tag { background:#F8FAFC; border:1px solid #E2E8F0; color:#334155; border-radius:4px; padding:3px 9px; font-size:10.5px; }
  </style></head><body>
  <div class="page">

    <!-- SIDEBAR -->
    <div class="sidebar">
      <div class="sidebar-top">
        <div class="avatar">${initials}</div>
        <div class="s-name">${app.applicantName}</div>
        <div class="s-title">${app.jobOfferTitle ?? ''}</div>
      </div>
      <div class="sidebar-body">

        <div class="s-section">
          <div class="s-section-title">Contact</div>
          <div class="contact-item"><span class="c-icon">✉</span>${app.applicantEmail}</div>
         <div class="contact-item"><span class="c-icon">📞</span>Non renseigné</div>
        </div>

        ${langues.length > 0 ? `
        <div class="s-section">
          <div class="s-section-title">Langues</div>
          ${langues.map((l: string, i: number) => `
            <div class="lang-item">
              <span class="lang-name">${l}</span>
              <div class="lang-dots">
                ${[1,2,3,4,5].map(n => `<div class="dot ${n <= (i === 0 ? 5 : i === 1 ? 4 : 3) ? 'filled' : ''}"></div>`).join('')}
              </div>
            </div>`).join('')}
        </div>` : ''}

        ${skills.length > 0 ? `
        <div class="s-section">
          <div class="s-section-title">Compétences</div>
          ${skills.slice(0, 7).map((s: any, i: number) => `
            <div class="skill-item">
              <div class="skill-name">${s.name}</div>
              <div class="skill-bar-bg"><div class="skill-bar-fill" style="width:${90 - i * 8}%"></div></div>
            </div>`).join('')}
        </div>` : ''}

        ${softSkills.length > 0 ? `
        <div class="s-section">
          <div class="s-section-title">Soft Skills</div>
          ${softSkills.map((s: string) => `<div class="soft-item">${s}</div>`).join('')}
        </div>` : ''}

      </div>
    </div>

    <!-- MAIN -->
    <div class="main">
      <div class="main-header">
        <div class="main-name">${app.applicantName.toUpperCase()}</div>
        <div class="main-subtitle">${app.jobOfferTitle ?? ''}${niveau ? ' · ' + niveau : ''}</div>
      </div>

      ${app.coverLetter ? `
      <div class="m-section">
        <div class="m-section-title">Profil</div>
        <div class="profile-text">${app.coverLetter}</div>
      </div>` : ''}

      ${formation ? `
      <div class="m-section">
        <div class="m-section-title">Formation</div>
        <div class="form-block">
          <div class="form-degree">${formation}</div>
          <div class="form-school">Ingénierie${experience > 0 ? ' · ' + experience + ' ans d\'expérience' : ''}</div>
        </div>
      </div>` : ''}

      ${expLines.length > 0 ? `
      <div class="m-section">
        <div class="m-section-title">Expériences</div>
        ${expLines.map((line: string) => `
          <div class="exp-block">
            <div class="exp-title">${line.split('—')[1]?.trim() ?? line}</div>
            <div class="exp-company">Candidature interne</div>
            <div class="exp-date">${experience} ans d'expérience</div>
          </div>`).join('')}
      </div>` : ''}

      ${skills.length > 0 ? `
      <div class="m-section">
        <div class="m-section-title">Compétences techniques</div>
        <div class="tags-wrap">
          ${skills.map((s: any) => `<span class="tag">${s.name}</span>`).join('')}
        </div>
      </div>` : ''}

    </div>
  </div>
  </body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}  


    getInterviewQuestions(applicationId: string): Observable<{ applicationId: string; questions: string[] }> {
        return this.http.get<{ applicationId: string; questions: string[] }>(
            `${this.base}/applications/${applicationId}/interview-questions`
        );
    }

    // ── Skills ─────────────────────────────────────────────────
    getAllSkills(): Observable<Skill[]> {
        return this.http.get<Skill[]>(`${this.base}/skills`);
    }

    createSkill(name: string): Observable<Skill> {
        return this.http.post<Skill>(`${this.base}/skills`, { name });
    }
}