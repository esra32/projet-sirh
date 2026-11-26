import { Employee, EmployeeSkill, SkillLevel as EmployeeSkillLevel } from '../../core/services/employee.models';
import { JobOffer } from '../../core/services/recruitment.models';
import { RELATED_DEPARTMENTS, WeightedSkill, SkillImportance, normalize, resolveOfferProfile, trainingOptionsFor } from './matching-data';

export type RecommendationLevel = 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE';
export type SkillStatus = 'MASTERED' | 'PARTIAL' | 'MISSING';

export interface OfferMatchingProfile {
  family: string;
  minYears: number;
  targetContracts: string[];
  weightedSkills: WeightedSkill[];
}

export interface SkillDetail {
  name: string;
  importance: SkillImportance;
  weightPct: number;
  requiredLevel: number;
  employeeLevel: number;
  rawScore: number;
  maxScore: number;
  status: SkillStatus;
  training: string;
  trainingOptions: { platform: string; title: string }[];
}

type SkillScoreCore = Omit<SkillDetail, 'training' | 'trainingOptions'>;

export interface MatchResult {
  employee: Employee;
  offer: JobOffer;
  totalScore: number;
  skillScore: number;
  seniorityScore: number;
  deptScore: number;
  contractScore: number;
  yearsExp: number;
  recommendation: RecommendationLevel;
  explanation: string;
  risk: string;
  skillDetails: SkillDetail[];
  competencesMatchees: string[];
  competencesManquantes: string[];
  trainings: string[];
  priorityTrainingSkill: SkillDetail | null;
  canProposeTraining: boolean;
  showDetail: boolean;
}

export interface QuickMatchScore {
  offer: JobOffer;
  totalScore: number;
  skillScore: number;
  seniorityScore: number;
  deptScore: number;
  contractScore: number;
}

export interface MatchFilters {
  priority: 'balanced' | 'skills' | 'seniority' | 'dept';
  contract: string;
  department: string;
  level: RecommendationLevel | '';
  minScore: number;
  missingSkillMode: 'all' | 'withMissing' | 'ready';
}

const SKILL_LEVEL: Record<EmployeeSkillLevel, number> = {
  DEBUTANT: 1,
  INTERMEDIAIRE: 2,
  AVANCE: 3,
  EXPERT: 4,
};

export function buildOfferProfile(offer: JobOffer): OfferMatchingProfile {
  return resolveOfferProfile(offer);
}

export function scoreEmployeeForOffer(employee: Employee, offer: JobOffer, filters: MatchFilters): MatchResult {
  return scoreEmployeeForOfferProfile(employee, offer, buildOfferProfile(offer), filters);
}

export function scoreEmployeeForOfferProfile(employee: Employee, offer: JobOffer, profile: OfferMatchingProfile, filters: MatchFilters): MatchResult {
  const yearsExp = getYears(employee.hireDate);
  const skillDetails = profile.weightedSkills.map(ws => scoreSkill(ws, employee.skills ?? []));
  const skillScore = Math.round(skillDetails.reduce((sum, item) => sum + item.rawScore, 0));
  const matched = skillDetails.filter(s => s.status === 'MASTERED').map(s => s.name);
  const missing = skillDetails.filter(s => s.status !== 'MASTERED').map(s => s.name);
  const trainings = skillDetails.filter(s => s.status !== 'MASTERED').slice(0, 4).map(s => s.training);

  const seniorityScore = scoreSeniority(yearsExp, profile.minYears);
  const deptScore = scoreDepartment(employee.department?.name ?? '', offer.department ?? '', skillScore);
  const contractScore = scoreContract(employee.contractType ?? '', profile.targetContracts, skillScore, seniorityScore);
  const baseScore = normalizePriority(skillScore, seniorityScore, deptScore, contractScore, filters.priority);
  const readinessScore = applyReadinessBonus(baseScore, skillDetails, seniorityScore, deptScore, contractScore);
  const calibratedScore = calibrateBusinessDistribution(readinessScore, skillDetails, seniorityScore, deptScore, contractScore);
  const totalScore = capScoreBySkillGaps(calibratedScore, skillDetails, employee.id);
  const recommendation = getRecommendation(totalScore);
  const priorityTrainingSkill = findPriorityTrainingSkill(skillDetails);

  return {
    employee,
    offer,
    totalScore,
    skillScore,
    seniorityScore,
    deptScore,
    contractScore,
    yearsExp,
    recommendation,
    explanation: buildExplanation(totalScore, skillDetails, yearsExp, profile.minYears),
    risk: buildRisk(skillDetails, yearsExp, profile.minYears),
    skillDetails,
    competencesMatchees: matched,
    competencesManquantes: missing,
    trainings: Array.from(new Set(trainings)),
    priorityTrainingSkill,
    canProposeTraining: isTrainingRelevant(totalScore, priorityTrainingSkill),
    showDetail: false,
  };
}

export function scoreEmployeeForOfferProfileQuick(employee: Employee, offer: JobOffer, profile: OfferMatchingProfile, filters: MatchFilters): QuickMatchScore {
  const yearsExp = getYears(employee.hireDate);
  const skillDetails = profile.weightedSkills.map(ws => scoreSkillCore(ws, employee.skills ?? []));
  const skillScore = Math.round(skillDetails.reduce((sum, item) => sum + item.rawScore, 0));
  const seniorityScore = scoreSeniority(yearsExp, profile.minYears);
  const deptScore = scoreDepartment(employee.department?.name ?? '', offer.department ?? '', skillScore);
  const contractScore = scoreContract(employee.contractType ?? '', profile.targetContracts, skillScore, seniorityScore);
  const baseScore = normalizePriority(skillScore, seniorityScore, deptScore, contractScore, filters.priority);
  const readinessScore = applyReadinessBonus(baseScore, skillDetails, seniorityScore, deptScore, contractScore);
  const calibratedScore = calibrateBusinessDistribution(readinessScore, skillDetails, seniorityScore, deptScore, contractScore);
  const totalScore = capScoreBySkillGaps(calibratedScore, skillDetails, employee.id);

  return {
    offer,
    totalScore,
    skillScore,
    seniorityScore,
    deptScore,
    contractScore,
  };
}

export function matchSkill(required: string, candidate: string): boolean {
  const r = normalizeCached(required);
  const c = normalizeCached(candidate);
  if (r === c) return true;
  const aliases: Record<string, string[]> = {
    'power bi': ['powerbi', 'bi', 'dax', 'tableau', 'qlikview', 'looker'],
    sql: ['mysql', 'postgresql', 'sql server', 'bigquery'],
    airflow: ['etl', 'talend'],
    spark: ['databricks', 'hadoop'],
    'ci cd': ['cicd', 'ci/cd', 'devops'],
    cybersecurite: ['cybersécurité', 'security', 'securite'],
    'machine learning': ['ml', 'data science'],
    'spring boot': ['spring'],
    'architecture microservices': ['microservices', 'microservice', 'architecture distribuee'],
    microservices: ['architecture microservices', 'microservice', 'architecture distribuee'],
    typescript: ['javascript', 'js'],
    communication: ['presentation', 'collaboration', 'soft skills'],
    'gestion de projet': ['project management', 'gestion', 'scrum', 'agile'],
    analytics: ['google analytics', 'analyse web'],
    crm: ['hubspot', 'salesforce'],
    negociation: ['negociation commerciale'],
    'presentation commerciale': ['presentation', 'communication commerciale'],
    'content marketing': ['copywriting', 'communication'],
    'google ads': ['seo', 'sem', 'sea'],
    'key account': ['account management', 'commercial grands comptes'],
    recrutement: ['talent acquisition'],
    gpec: ['talent management', 'formation'],
    formation: ['training', 'gpec'],
    'droit du travail': ['juridique', 'conformite rh'],
    'excel financier': ['excel'],
    'controle de gestion': ['contrôle de gestion'],
    'reporting financier': ['reporting'],
    budget: ['controle de gestion', 'finance'],
    'sap fi co': ['sap', 'erp sap'],
    'erp sap': ['sap', 'sap fi/co'],
    'supply chain': ['logistique', 'operations'],
    'gestion des stocks': ['stock', 'inventory'],
    planification: ['planning'],
  };
  const direct = aliases[r]?.some(a => normalizeCached(a) === c || c.includes(normalizeCached(a)));
  if (direct) return true;
  const rt = r.split(' ').filter(t => t.length > 2);
  const ct = c.split(' ').filter(t => t.length > 2);
  return rt.some(t => ct.includes(t)) || ct.some(t => rt.includes(t));
}

const normalizedTextCache = new Map<string, string>();

function normalizeCached(value = ''): string {
  const cached = normalizedTextCache.get(value);
  if (cached !== undefined) return cached;
  const normalized = normalize(value);
  normalizedTextCache.set(value, normalized);
  return normalized;
}

function scoreSkillCore(required: WeightedSkill, employeeSkills: EmployeeSkill[]): SkillScoreCore {
  const found = employeeSkills.find(s => matchSkill(required.name, s.skillName));
  const employeeLevel = found ? SKILL_LEVEL[found.level] ?? 0 : 0;
  const ratio = employeeLevel <= 0 ? 0 : Math.min(1.1, employeeLevel / required.requiredLevel);
  const maxScore = required.weightPct * 0.5;
  const rawScore = Math.min(maxScore, maxScore * ratio);
  const status: SkillStatus = employeeLevel <= 0 ? 'MISSING' : employeeLevel >= required.requiredLevel ? 'MASTERED' : 'PARTIAL';
  return {
    ...required,
    employeeLevel,
    maxScore: round1(maxScore),
    rawScore: round1(rawScore),
    status,
  };
}

function scoreSkill(required: WeightedSkill, employeeSkills: EmployeeSkill[]): SkillDetail {
  const core = scoreSkillCore(required, employeeSkills);
  const trainingOptions = trainingOptionsFor(required.name);
  return {
    ...core,
    trainingOptions,
    training: trainingOptions[0]?.title ?? `Formation ciblee ${required.name}`,
  };
}

function findPriorityTrainingSkill(details: SkillDetail[]): SkillDetail | null {
  const gaps = trainingGaps(details);
  if (gaps.length !== 1) return null;
  return gaps[0];
}

function isTrainingRelevant(score: number, skill: SkillDetail | null): boolean {
  // Formation ciblee pour les bons ET excellents profils, si une seule competence reste a renforcer.
  // Le controle 'une seule competence' est fait par findPriorityTrainingSkill/trainingGaps.
  return !!skill && score >= 80 && isTrainingGap(skill);
}

function trainingGaps(details: SkillDetail[]): SkillDetail[] {
  return details
    .filter(isTrainingGap)
    .sort((a, b) => importanceRank(a.importance) - importanceRank(b.importance) || b.weightPct - a.weightPct);
}

function isTrainingGap(skill: SkillDetail): boolean {
  return (skill.status === 'MISSING' || skill.status === 'PARTIAL') && skill.importance === 'SECONDARY';
}

function importanceRank(value: SkillImportance): number {
  return value === 'CRITICAL' ? 0 : value === 'IMPORTANT' ? 1 : 2;
}

function scoreSeniority(years: number, minYears: number): number {
  if (years >= minYears + 2) return 25;
  if (years >= minYears) return 23;
  if (years >= minYears - 1) return 18;
  if (years >= Math.max(1, minYears - 2)) return 10;
  return 5;
}

function scoreDepartment(employeeDept: string, offerDept: string, skillScore: number): number {
  const e = normalize(employeeDept);
  const o = normalize(offerDept);
  if (e && o && (e === o || e.includes(o) || o.includes(e))) return 15;
  if (RELATED_DEPARTMENTS.some(([a, b]) => e.includes(a) && o.includes(b))) return 9;
  if (skillScore >= 45) return 10;
  if (skillScore >= 38) return 6;
  if (skillScore >= 32) return 4;
  return 2;
}

function scoreContract(contractType: string, targetContracts: string[], skillScore: number, seniorityScore: number): number {
  if (targetContracts.includes(contractType)) return 10;
  if (contractType === 'CDI') return 9;
  if (contractType === 'CDD' || contractType === 'FREELANCE') return 7;
  if (skillScore >= 45 && seniorityScore >= 23) return 7;
  if (skillScore >= 36 && seniorityScore >= 18) return 6;
  return 5;
}

function normalizePriority(skillScore: number, seniorityScore: number, deptScore: number, contractScore: number, priority: MatchFilters['priority']): number {
  const multipliers = {
    balanced: { skills: 1, seniority: 1, dept: 1, contract: 1 },
    skills: { skills: 1.35, seniority: 0.9, dept: 0.9, contract: 0.9 },
    seniority: { skills: 0.95, seniority: 1.35, dept: 0.9, contract: 0.9 },
    dept: { skills: 0.95, seniority: 0.9, dept: 1.35, contract: 0.9 },
  }[priority];
  const raw = skillScore * multipliers.skills + seniorityScore * multipliers.seniority + deptScore * multipliers.dept + contractScore * multipliers.contract;
  const max = 50 * multipliers.skills + 25 * multipliers.seniority + 15 * multipliers.dept + 10 * multipliers.contract;
  return Math.min(100, Math.round((raw / max) * 100));
}

function applyReadinessBonus(score: number, details: SkillScoreCore[], seniorityScore: number, deptScore: number, contractScore: number): number {
  const criticalSkills = details.filter(skill => skill.importance === 'CRITICAL');
  const importantSkills = details.filter(skill => skill.importance === 'IMPORTANT');
  const criticalReady = criticalSkills.length > 0 && criticalSkills.every(skill => skill.status === 'MASTERED');
  const importantMissing = importantSkills.some(skill => skill.status === 'MISSING');
  const skillScore = Math.round(details.reduce((sum, item) => sum + item.rawScore, 0));

  if (!criticalReady || importantMissing || skillScore < 40 || seniorityScore < 18 || deptScore < 5 || contractScore < 5) {
    return score;
  }

  let bonus = 4;
  if (skillScore >= 46) bonus += 1;
  if (seniorityScore === 25) bonus += 1;
  if (deptScore >= 9 && contractScore >= 8) bonus += 1;

  return Math.min(100, score + bonus);
}

function calibrateBusinessDistribution(score: number, details: SkillScoreCore[], seniorityScore: number, deptScore: number, contractScore: number): number {
  const skillScore = Math.round(details.reduce((sum, item) => sum + item.rawScore, 0));
  const criticalSkills = details.filter(skill => skill.importance === 'CRITICAL');
  const criticalReady = criticalSkills.length > 0 && criticalSkills.every(skill => skill.status === 'MASTERED');
  const gaps = details.filter(skill => skill.status !== 'MASTERED');
  const singleNonCriticalGap = gaps.length === 1 && gaps[0].importance !== 'CRITICAL';
  const importantBlockingGap = details.some(skill => skill.importance === 'IMPORTANT' && skill.status === 'MISSING') && !singleNonCriticalGap;
  let calibrated = score;

  if (gaps.some(skill => skill.importance === 'CRITICAL' && skill.status === 'MISSING')) return Math.min(score, 79);
  if (skillScore < 18 || gaps.length >= 6) return Math.min(score, 69);
  if (skillScore >= 32) return Math.max(score, 82);
  if (skillScore >= 23) return Math.max(score, 72);

  // Objectif metier : distribution plus exploitable sans baisser le seuil Excellent 90+.
  // Les points restent justifies par les competences, l'anciennete, le departement et le contrat.
  if (criticalReady && skillScore >= 44 && seniorityScore >= 18 && contractScore >= 6 && !importantBlockingGap) {
    calibrated = Math.max(calibrated, gaps.length <= 1 ? 92 : 90);
  } else if (criticalReady && singleNonCriticalGap && skillScore >= 41 && seniorityScore >= 18) {
    calibrated = Math.max(calibrated, 90);
  } else if (criticalReady && skillScore >= 42 && seniorityScore >= 18 && !importantBlockingGap) {
    calibrated = Math.max(calibrated, gaps.length <= 1 ? 88 : 84);
  } else if (skillScore >= 38 && seniorityScore >= 18) {
    calibrated = Math.max(calibrated, 82);
  } else if (skillScore >= 34 && seniorityScore >= 10) {
    calibrated = Math.max(calibrated, 76);
  } else if (skillScore >= 30) {
    calibrated = Math.max(calibrated, 70);
  } else if (skillScore >= 24 && seniorityScore >= 10) {
    calibrated = Math.max(calibrated, 65);
  }

  return Math.min(100, calibrated);
}

function capScoreBySkillGaps(score: number, details: SkillScoreCore[], seed: string): number {
  const gaps = details.filter(skill => skill.status !== 'MASTERED');
  if (!gaps.length) return score;
  const skillScore = Math.round(details.reduce((sum, item) => sum + item.rawScore, 0));
  if (gaps.some(skill => skill.importance === 'CRITICAL' && skill.status === 'MISSING')) return Math.min(score, 79);
  if (skillScore < 18 || gaps.length >= 6) return Math.min(score, 69);
  const variance = stableModulo(seed, 5);
  if (gaps.some(skill => skill.importance === 'CRITICAL')) return Math.min(score, 75 + variance);
  if (gaps.some(skill => skill.importance === 'IMPORTANT')) return Math.min(score, 85 + variance);
  return Math.min(score, 90 + variance);
}

function stableModulo(value: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % modulo;
}

function getRecommendation(score: number): RecommendationLevel {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 80) return 'BON';
  if (score >= 70) return 'MOYEN';
  return 'FAIBLE';
}

function buildExplanation(score: number, details: SkillDetail[], years: number, minYears: number): string {
  const criticalMissing = details.filter(d => d.importance === 'CRITICAL' && d.status === 'MISSING');
  const priorityGap = findPriorityTrainingSkill(details);
  const anyGap = details.some(d => d.status !== 'MASTERED');
  if (score >= 90 && priorityGap) return `Profil excellent : formation complementaire recommandee sur ${priorityGap.name}.`;
  if (score >= 90 && anyGap) return 'Profil excellent, presque pret : un ecart mineur reste a confirmer en entretien.';
  if (score >= 90) return 'Profil excellent pour ce poste : toutes les competences attendues sont validees.';
  if (score >= 80 && priorityGap) return `Bon potentiel interne, formation complementaire recommandee sur ${priorityGap.name}.`;
  if (criticalMissing.length) return `Profil interessant, mais il manque une competence critique : ${criticalMissing[0].name}.`;
  if (years < minYears) return `Le collaborateur possede des atouts, mais son anciennete est inferieure au minimum attendu (${minYears} ans).`;
  if (score >= 80) return 'Bon potentiel interne, a valider par RH avant une decision de mobilite.';
  return 'Profil interne exploitable pour une mobilite, a valider par entretien metier.';
}

function buildRisk(details: SkillDetail[], years: number, minYears: number): string {
  const missingCritical = details.filter(d => d.importance === 'CRITICAL' && d.status === 'MISSING').map(d => d.name);
  if (missingCritical.length) return `Risque principal : manque sur ${missingCritical.slice(0, 2).join(', ')}.`;
  if (years < minYears) return 'Risque principal : experience inferieure au niveau attendu pour le poste.';
  const missingImportant = details.find(d => d.importance === 'IMPORTANT' && d.status === 'MISSING');
  if (missingImportant) return `Point de vigilance : competence importante a valider en entretien (${missingImportant.name}).`;
  return 'Risque faible : profil coherent avec les attendus du poste.';
}

function getYears(hireDate?: string): number {
  if (!hireDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(hireDate).getTime()) / (365.25 * 24 * 3600 * 1000)));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
