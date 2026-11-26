import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

const BASE_SYSTEM_PROMPT = `Tu es ARIA (Assistant RH Intelligent Avancé), l'assistante virtuelle intégrée au SIRH.

## Ton rôle
Tu aides les employés à :
- 🔍 Trouver des offres d'emploi internes correspondant à leur profil
- 📋 Comprendre le processus de candidature interne
- 📄 Poser des questions sur les contrats (CDI, CDD, STAGE)
- 🚀 Gérer leur mobilité interne
- ❓ Toute question RH

## Processus de candidature
1. Consulter les offres publiées dans "Offres internes"
2. Cliquer sur "Postuler" sur l'offre souhaitée
3. Remplir : lettre de motivation + CV
4. L'IA analyse automatiquement le profil (score 0-100)
5. Le manager examine et répond sous 2-7 jours ouvrés

## Types de contrats
- **CDI** : Contrat permanent, sans date de fin
- **CDD** : Contrat temporaire avec date de fin définie
- **STAGE** : Pour étudiants ou personnes en formation

## Score de matching IA
Notre IA Gemini analyse : compétences + années d'expérience + qualité de la lettre.
Score 80-100% = excellent, 50-79% = bon, 0-49% = à renforcer.

## Règles absolues
- Réponds TOUJOURS en français
- Sois concis (max 200 mots)
- Utilise des emojis pour la lisibilité
- Si des offres sont disponibles dans le contexte, cite-les avec leurs détails
- Ne dis JAMAIS que tu n'as pas accès aux données — si des offres sont dans ton contexte, utilise-les`;

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly base = environment.apiBaseUrl;
  private sessionId: string;
  private offersContext = '';
  private rawOffers: { title: string; department: string; location: string; skills: string[]; deadline: string | null }[] = [];

  constructor(private http: HttpClient) {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    const storageKey = 'ariaChatSessionId';
    let id = localStorage.getItem(storageKey);
    if (!id) {
      id = 'aria-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
      localStorage.setItem(storageKey, id);
    }
    return id;
  }

  /** Injecter les offres réelles avant de démarrer le chat */
  setOffersContext(offers: { title: string; department: string; location: string; skills: string[]; deadline: string | null }[]): void {
    this.rawOffers = offers || [];
    if (!offers || offers.length === 0) {
      this.offersContext = '\n\n## Offres internes actuellement publiées\nAucune offre disponible pour le moment.';
      return;
    }
    // Limite le contexte Gemini à 10 offres — évite de saturer le prompt
    const sample = offers.slice(0, 10);
    const lines = sample.map(o =>
      `- **${o.title}** | Département: ${o.department || 'N/A'} | Lieu: ${o.location || 'N/A'} | Compétences: ${o.skills.join(', ') || 'N/A'} | Date limite: ${o.deadline || 'N/A'}`
    ).join('\n');
    const note = offers.length > 10 ? `\n_(${offers.length - 10} autres offres non listées ici)_` : '';
    this.offersContext = `\n\n## Offres internes actuellement publiées (données réelles)\n${lines}${note}`;
  }

  /** Supprime les mots génériques et retourne le vrai mot-clé de recherche */
  private extractKeyword(m: string): string {
    return m
      .replace(/\b(offre|offres|poste|postes|emploi|travail|disponible|disponibles|cherche|je cherche|montre|liste|quelles?|y a-t-il|est-ce qu|pour moi|actuellement)\b/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /** Fallback local quand le backend est indisponible */
  private localFallback(message: string): string {
    const m = message.toLowerCase();

    // Postuler / candidature — DOIT être avant le bloc "offre" pour éviter le mauvais matching
    // ex: "Comment postuler à une offre ?" contient "offre" → sans ce test en premier, mauvaise branche
    if (m.includes('postuler') || m.includes('candidature') || m.includes('candidater') || m.includes('soumettre')) {
      return '📝 **Comment postuler ?**\n\n1. Allez dans **"Offres internes"**\n2. Cliquez sur l\'offre qui vous intéresse\n3. Cliquez sur **"Postuler"**\n4. Remplissez votre lettre de motivation et joignez votre CV\n5. L\'IA analyse votre profil automatiquement (score 0-100)\n6. Le manager vous répond sous 2-7 jours ouvrés';
    }

    // Offres disponibles — max 5, filtrées par mot-clé si possible
    if (m.includes('offre') || m.includes('disponible') || m.includes('poste') || m.includes('emploi')) {
      if (this.rawOffers.length === 0) {
        return '📋 Aucune offre interne n\'est disponible pour le moment. Revenez prochainement !';
      }
      const keyword = this.extractKeyword(m);
      let filtered = keyword
        ? this.rawOffers.filter(o =>
            o.title.toLowerCase().includes(keyword) ||
            (o.department || '').toLowerCase().includes(keyword) ||
            o.skills.some(s => s.toLowerCase().includes(keyword) || keyword.includes(s.toLowerCase()))
          )
        : [];
      const display = filtered.length > 0 ? filtered.slice(0, 5) : this.rawOffers.slice(0, 5);
      const total = this.rawOffers.length;
      const list = display.map((o, i) =>
        `**${i + 1}. ${o.title}**\n   📁 ${o.department || 'N/A'} | 📍 ${o.location || 'N/A'}${o.skills.length ? '\n   🛠️ ' + o.skills.slice(0, 4).join(', ') : ''}${o.deadline ? '\n   ⏰ Deadline : ' + o.deadline : ''}`
      ).join('\n\n');
      const footer = total > 5
        ? `\n\n💬 ${total - display.length} autre(s) offre(s) disponible(s). Précisez un domaine (ex: "offres Java", "postes RH") pour affiner.`
        : '';
      return `📋 **${display.length} offre(s) trouvée(s) :**\n\n${list}\n\nPour postuler, rendez-vous dans la section **"Offres internes"** de l'application.${footer}`;
    }

    // Score IA / matching
    if (m.includes('score') || m.includes('ia') || m.includes('matching') || m.includes('intelligenc')) {
      return '🎯 **Score de matching IA**\n\nNotre IA Gemini analyse votre profil :\n- ✅ **80-100%** : Excellent profil, très bonne adéquation\n- 🟡 **50-79%** : Bon profil, quelques points à renforcer\n- 🔴 **0-49%** : Profil à renforcer pour ce poste\n\nL\'IA prend en compte : compétences, années d\'expérience, et la qualité de la lettre de motivation.';
    }

    // Contrats
    if (m.includes('cdi') || m.includes('cdd') || m.includes('stage') || m.includes('contrat')) {
      return '📄 **Types de contrats**\n\n- **CDI** : Contrat à Durée Indéterminée — poste permanent sans date de fin\n- **CDD** : Contrat à Durée Déterminée — poste temporaire avec date de fin définie\n- **STAGE** : Pour étudiants ou personnes en formation\n\nLe type de contrat est précisé sur chaque offre d\'emploi.';
    }

    // Mobilité interne
    if (m.includes('mobilit') || m.includes('évolution') || m.includes('evolut') || m.includes('interne')) {
      return '🚀 **Mobilité interne**\n\nPour évoluer en interne :\n1. Consultez les offres internes disponibles\n2. Postulez comme pour une offre externe\n3. Votre manager actuel sera informé\n4. Un entretien de mobilité sera organisé\n\nN\'hésitez pas à en parler aussi avec votre responsable RH !';
    }

    // Bonjour / salut
    if (m.includes('bonjour') || m.includes('salut') || m.includes('bonsoir') || m.includes('hello')) {
      return '👋 Bonjour ! Je suis **ARIA**, votre assistant RH.\n\nJe peux vous aider avec :\n- 📋 Les offres d\'emploi internes disponibles\n- 📝 Le processus de candidature\n- 🎯 Le score de matching IA\n- 📄 Les types de contrats\n- 🚀 La mobilité interne\n\nQue puis-je faire pour vous ?';
    }

    // Délais / réponse
    if (m.includes('délai') || m.includes('delai') || m.includes('réponse') || m.includes('quand')) {
      return '⏰ **Délais de traitement**\n\nAprès soumission de votre candidature :\n- L\'IA analyse votre profil **immédiatement**\n- Le manager examine votre dossier sous **2 à 7 jours ouvrés**\n- Vous recevez une notification dans l\'application';
    }

    // Réponse générique
    return '🤖 Je suis ARIA, votre assistant RH. Je peux vous renseigner sur :\n\n- 📋 Les **offres disponibles**\n- 📝 Comment **postuler**\n- 🎯 Le **score IA de matching**\n- 📄 Les **types de contrats** (CDI, CDD, STAGE)\n- 🚀 La **mobilité interne**\n\nPosez-moi une question sur l\'un de ces sujets !';
  }

  private getChatBackendUrl(): string {
    return `${this.base}/chat/${this.sessionId}`;
  }

  /**
   * Envoie un message au chat avec mémoire de conversation.
   */
  async chat(message: string): Promise<string> {
    if (!message || !message.trim()) {
      return '⚠️ Veuillez saisir un message pour démarrer la conversation.';
    }

    try {
      const response = await firstValueFrom(this.http.post<{ content: string }>(
        this.getChatBackendUrl(),
        { message }
      ));
      const text = response?.content?.trim();
      return text && text.length > 0 ? text : this.localFallback(message);
    } catch (error: any) {
      console.error('Backend AI chat error:', error);
      return this.localFallback(message);
    }
  }

  /**
   * Réinitialise la session de chat (efface l'historique).
   */
  resetChat(): void {
    localStorage.removeItem('ariaChatSessionId');
    this.sessionId = this.getOrCreateSessionId();
  }

  /**
   * Générateur de Fiches de Poste (sans historique de chat)
   */
  async generateJobDescription(title: string, department: string, requirements: string): Promise<string> {
    return '⚠️ Génération de fiche de poste disponible dans la prochaine version sécurisée du chatbot. Utilisez le chat pour poser une question RH.';
  }

  /**
   * Analyse de Candidature (Fit) — sans historique de chat
   */
  async analyzeCandidateFit(jobOfferTitle: string, jobRequirements: string, candidateCvText: string, coverLetterText: string): Promise<string> {
    return '⚠️ Analyse de candidature disponible dans la prochaine version sécurisée du chatbot. Utilisez le chat pour poser une question RH.';
  }
}
