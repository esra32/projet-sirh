import { JobOffer } from '../../core/services/recruitment.models';

export type SkillImportance = 'CRITICAL' | 'IMPORTANT' | 'SECONDARY';

export interface WeightedSkill {
  name: string;
  importance: SkillImportance;
  weightPct: number;
  requiredLevel: number;
}

export interface OfferProfileDefinition {
  family: string;
  minYears: number;
  targetContracts: string[];
  weightedSkills: WeightedSkill[];
}

export interface TrainingOption {
  platform: string;
  title: string;
}

export const OFFER_FAMILY_ORDER = ['BI & Data', 'Informatique', 'RH', 'Marketing', 'Commercial', 'Finance', 'Juridique', 'Autres'];

export const RELATED_DEPARTMENTS: [string, string][] = [
  ['informatique', 'data analytics'],
  ['data analytics', 'informatique'],
  ['finance controle gestion', 'data analytics'],
  ['data analytics', 'finance controle gestion'],
  ['ressources humaines', 'marketing communication'],
  ['marketing communication', 'ressources humaines'],
  ['marketing communication', 'commercial ventes'],
  ['commercial ventes', 'marketing communication'],
  ['finance controle gestion', 'commercial ventes'],
  ['commercial ventes', 'finance controle gestion'],
  ['operations logistique', 'commercial ventes'],
  ['commercial ventes', 'operations logistique'],
];

export function classifyOfferGroup(offer: JobOffer): string {
  const title = normalize(offer.title);
  const dept = normalize(offer.department);
  if (dept.includes('data') || title.includes('business intelligence') || title.includes('data') || title.includes('analytics')) return 'BI & Data';
  if (dept.includes('informatique') || dept.includes('infrastructure') || title.includes('developpeur') || title.includes('cyber') || title.includes('devops')) return 'Informatique';
  if (dept.includes('ressources humaines') || title.includes('rh') || title.includes('recrutement')) return 'RH';
  if (dept.includes('marketing') || title.includes('marketing') || title.includes('seo')) return 'Marketing';
  if (dept.includes('commercial') || title.includes('commercial') || title.includes('account')) return 'Commercial';
  if (dept.includes('finance') || title.includes('finance') || title.includes('controle')) return 'Finance';
  if (dept.includes('juridique') || title.includes('juridique') || title.includes('conformite')) return 'Juridique';
  return 'Autres';
}

export function normalize(value = ''): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.\-\/+#&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveOfferProfile(offer: JobOffer): OfferProfileDefinition {
  const title = normalize(offer.title);
  const department = normalize(offer.department);

  if (title.includes('business intelligence') || title.includes('consultant bi') || title.includes('power bi')) {
    return profile('Business Intelligence', 4, ['CDI', 'CDD'], [
      skill('Power BI', 'CRITICAL', 24, 3),
      skill('SQL', 'CRITICAL', 22, 3),
      skill('dbt', 'IMPORTANT', 16, 2),
      skill('Python', 'IMPORTANT', 14, 2),
      skill('Spark', 'SECONDARY', 10, 2),
      skill('Communication', 'SECONDARY', 8, 2),
      skill('Gestion de projet', 'SECONDARY', 6, 2),
    ], offer);
  }

  if (title.includes('data engineer') || title.includes('pipeline') || title.includes('etl')) {
    return profile('Data Engineering', 4, ['CDI', 'CDD'], [
      skill('Python', 'CRITICAL', 20, 3),
      skill('SQL', 'CRITICAL', 18, 3),
      skill('Airflow', 'IMPORTANT', 16, 2),
      skill('dbt', 'IMPORTANT', 14, 2),
      skill('Spark', 'IMPORTANT', 12, 2),
      skill('Docker', 'SECONDARY', 10, 2),
      skill('Git', 'SECONDARY', 6, 2),
      skill('Kafka', 'SECONDARY', 4, 1),
    ], offer);
  }

  if (title.includes('data analyst') || title.includes('analyste data') || title.includes('analytics specialist') || department.includes('data')) {
    return profile('Data Analytics', 3, ['CDI', 'CDD'], [
      skill('SQL', 'CRITICAL', 24, 3),
      skill('Power BI', 'CRITICAL', 22, 3),
      skill('Python', 'IMPORTANT', 16, 2),
      skill('Communication', 'IMPORTANT', 14, 2),
      skill('Machine Learning', 'SECONDARY', 8, 1),
      skill('Gestion de projet', 'SECONDARY', 6, 2),
    ], offer);
  }

  if (title.includes('cyber') || title.includes('securite') || title.includes('owasp')) {
    return profile('Cybersecurite', 5, ['CDI'], [
      skill('Cybersecurite', 'CRITICAL', 22, 3),
      skill('OWASP', 'CRITICAL', 20, 3),
      skill('Linux', 'IMPORTANT', 16, 3),
      skill('Docker', 'IMPORTANT', 12, 2),
      skill('CI/CD', 'IMPORTANT', 10, 2),
      skill('Git', 'SECONDARY', 8, 2),
      skill('Kubernetes', 'SECONDARY', 6, 1),
      skill('Communication', 'SECONDARY', 6, 2),
    ], offer);
  }

  if (title.includes('fullstack') || title.includes('java') || title.includes('angular')) {
    return profile('Developpement Fullstack', 3, ['CDI', 'CDD'], [
      skill('Java', 'CRITICAL', 20, 3),
      skill('Spring Boot', 'CRITICAL', 18, 3),
      skill('Angular', 'CRITICAL', 18, 3),
      skill('TypeScript', 'IMPORTANT', 12, 2),
      skill('Git', 'IMPORTANT', 10, 2),
      skill('Docker', 'SECONDARY', 8, 2),
      skill('Architecture microservices', 'SECONDARY', 8, 2),
      skill('SQL', 'SECONDARY', 6, 2),
    ], offer);
  }

  if (title.includes('rh analytics') || title.includes('hr analytics')) {
    return profile('RH Analytics', 3, ['CDI', 'CDD'], [
      skill('Power BI', 'CRITICAL', 22, 3),
      skill('SQL', 'CRITICAL', 18, 2),
      skill('Recrutement', 'IMPORTANT', 16, 2),
      skill('Python', 'IMPORTANT', 12, 2),
      skill('Communication', 'IMPORTANT', 12, 3),
      skill('Gestion de projet', 'SECONDARY', 10, 2),
      skill('Scrum', 'SECONDARY', 10, 1),
    ], offer);
  }

  if (department.includes('ressources humaines') || title.includes('recrutement') || title.includes('hrbp') || title.includes('formation') || title.includes('paie')) {
    return profile('Ressources Humaines', 3, ['CDI', 'CDD'], [
      skill('Recrutement', 'CRITICAL', 22, 3),
      skill('GPEC', 'CRITICAL', 18, 3),
      skill('Droit du travail', 'IMPORTANT', 16, 2),
      skill('Talent management', 'IMPORTANT', 14, 2),
      skill('Formation', 'IMPORTANT', 10, 2),
      skill('SIRH', 'SECONDARY', 10, 2),
      skill('Communication', 'SECONDARY', 10, 2),
    ], offer);
  }

  if (department.includes('finance') || title.includes('controle') || title.includes('comptable') || title.includes('audit') || title.includes('tresor')) {
    return profile('Finance & Controle', 4, ['CDI', 'CDD'], [
      skill('Controle de gestion', 'CRITICAL', 22, 3),
      skill('Budget', 'CRITICAL', 18, 3),
      skill('Excel financier', 'IMPORTANT', 16, 3),
      skill('IFRS', 'IMPORTANT', 14, 2),
      skill('Reporting financier', 'IMPORTANT', 12, 2),
      skill('SAP FI/CO', 'SECONDARY', 10, 2),
      skill('Power BI', 'SECONDARY', 8, 2),
    ], offer);
  }

  if (department.includes('marketing') || title.includes('marketing') || title.includes('seo') || title.includes('content') || title.includes('communication')) {
    return profile('Marketing Digital', 3, ['CDI', 'CDD'], [
      skill('SEO', 'CRITICAL', 22, 3),
      skill('Analytics', 'CRITICAL', 18, 2),
      skill('Content Marketing', 'IMPORTANT', 16, 2),
      skill('CRM', 'IMPORTANT', 14, 2),
      skill('Google Ads', 'IMPORTANT', 12, 2),
      skill('Copywriting', 'SECONDARY', 10, 2),
      skill('HubSpot', 'SECONDARY', 8, 2),
    ], offer);
  }

  if (department.includes('commercial') || title.includes('commercial') || title.includes('account') || title.includes('prospection') || title.includes('ventes')) {
    return profile('Commercial & Ventes', 3, ['CDI', 'CDD', 'FREELANCE'], [
      skill('Negociation', 'CRITICAL', 22, 3),
      skill('B2B', 'CRITICAL', 18, 2),
      skill('Salesforce', 'IMPORTANT', 16, 2),
      skill('Prospection', 'IMPORTANT', 14, 2),
      skill('Key Account', 'IMPORTANT', 12, 2),
      skill('CRM', 'SECONDARY', 10, 2),
      skill('Presentation commerciale', 'SECONDARY', 8, 2),
    ], offer);
  }

  if (department.includes('logistique') || title.includes('supply') || title.includes('achat') || title.includes('qualite') || title.includes('logisticien')) {
    return profile('Operations & Logistique', 3, ['CDI', 'CDD'], [
      skill('Supply Chain', 'CRITICAL', 22, 3),
      skill('ERP SAP', 'CRITICAL', 18, 2),
      skill('Gestion des stocks', 'IMPORTANT', 16, 2),
      skill('Planification', 'IMPORTANT', 14, 2),
      skill('Lean Management', 'IMPORTANT', 12, 2),
      skill('Transport', 'SECONDARY', 10, 2),
      skill('Negociation', 'SECONDARY', 8, 2),
    ], offer);
  }

  const fallback = (offer.requiredSkills ?? []).map((s, index) =>
    skill(s.name, index < 2 ? 'CRITICAL' : index < 4 ? 'IMPORTANT' : 'SECONDARY', index < 2 ? 22 : index < 4 ? 14 : 8, index < 2 ? 3 : 2)
  );
  return profile('Mobilite transverse', 2, ['CDI', 'CDD', 'FREELANCE'], fallback, offer);
}

export function trainingOptionsFor(skillName: string): TrainingOption[] {
  const key = normalize(skillName);
  const specific: Record<string, TrainingOption[]> = {
    'power bi': [
      { platform: 'Microsoft Learn', title: 'Microsoft Learn Power BI Data Analyst PL-300' },
      { platform: 'DataCamp', title: 'DataCamp Power BI Fundamentals' },
      { platform: 'Udemy', title: 'Udemy Power BI de A a Z' },
    ],
    react: [
      { platform: 'Documentation officielle', title: 'React.dev - Learn React' },
      { platform: 'Udemy', title: 'Udemy React - The Complete Guide' },
      { platform: 'OpenClassrooms', title: 'OpenClassrooms React' },
    ],
    airflow: [
      { platform: 'Documentation officielle', title: 'Documentation Apache Airflow' },
      { platform: 'Coursera', title: 'Coursera Data Engineering' },
      { platform: 'Udemy', title: 'Udemy Apache Airflow' },
    ],
    owasp: [
      { platform: 'Documentation officielle', title: 'OWASP Top 10' },
      { platform: 'Coursera', title: 'Coursera Cybersecurity' },
      { platform: 'Udemy', title: 'Udemy Web Security' },
    ],
    dbt: [
      { platform: 'Documentation officielle', title: 'dbt Learn - Analytics Engineering Fundamentals' },
      { platform: 'Udemy', title: 'Udemy dbt Analytics Engineering' },
      { platform: 'Formation interne', title: 'Atelier interne dbt et Data Warehouse RH' },
    ],
    'architecture microservices': [
      { platform: 'Coursera', title: 'Coursera - Microservices with Spring Boot' },
      { platform: 'Udemy', title: 'Udemy Microservices avec Spring Boot et Docker' },
      { platform: 'Microsoft Learn', title: 'Microsoft Learn - Architecture microservices' },
    ],
    microservices: [
      { platform: 'Coursera', title: 'Coursera - Architecture microservices Spring Boot' },
      { platform: 'Udemy', title: 'Udemy Architecture microservices et API' },
      { platform: 'Microsoft Learn', title: 'Microsoft Learn - Architecture microservices' },
    ],
    kafka: [
      { platform: 'Confluent', title: 'Confluent Kafka Fundamentals' },
      { platform: 'Coursera', title: 'Coursera Event Streaming with Kafka' },
      { platform: 'Udemy', title: 'Udemy Apache Kafka pour Data Engineers' },
    ],
    scrum: [
      { platform: 'Scrum.org', title: 'Scrum.org Scrum Fundamentals' },
      { platform: 'Coursera', title: 'Coursera Agile with Atlassian Jira' },
      { platform: 'Udemy', title: 'Udemy Scrum Master et agilité' },
    ],
    copywriting: [
      { platform: 'HubSpot Academy', title: 'HubSpot Content Marketing Certification' },
      { platform: 'Coursera', title: 'Coursera Copywriting and Content Strategy' },
      { platform: 'Udemy', title: 'Udemy Copywriting pour marketing digital' },
    ],
    hubspot: [
      { platform: 'HubSpot Academy', title: 'HubSpot CRM Software Certification' },
      { platform: 'Coursera', title: 'Coursera CRM and Sales Enablement' },
      { platform: 'Udemy', title: 'Udemy HubSpot CRM complet' },
    ],
    'sap fi co': [
      { platform: 'SAP Learning', title: 'SAP Learning - Financial Accounting Overview' },
      { platform: 'Coursera', title: 'Coursera SAP Finance Fundamentals' },
      { platform: 'Udemy', title: 'Udemy SAP FI/CO pour controle de gestion' },
    ],
    spark: [
      { platform: 'Coursera', title: 'Coursera - Big Data with Apache Spark' },
      { platform: 'DataCamp', title: 'DataCamp Introduction to PySpark' },
      { platform: 'Udemy', title: 'Udemy Apache Spark de A a Z' },
    ],
    sql: [
      { platform: 'DataCamp', title: 'DataCamp SQL Fundamentals' },
      { platform: 'Coursera', title: 'Coursera SQL for Data Science' },
      { platform: 'Microsoft Learn', title: 'Microsoft Learn - Requetes SQL' },
    ],
    communication: [
      { platform: 'Coursera', title: 'Coursera Communication efficace en entreprise' },
      { platform: 'Udemy', title: 'Udemy Communication professionnelle' },
      { platform: 'Formation interne', title: 'Atelier communication RH et metiers' },
    ],
    'gestion de projet': [
      { platform: 'Coursera', title: 'Coursera Project Management Principles' },
      { platform: 'Microsoft Learn', title: 'Microsoft Learn - Project fundamentals' },
      { platform: 'Udemy', title: 'Udemy Gestion de projet agile' },
    ],
    git: [
      { platform: 'Atlassian', title: 'Atlassian Git Tutorials' },
      { platform: 'Coursera', title: 'Coursera Version Control with Git' },
      { platform: 'Udemy', title: 'Udemy Git et GitHub en pratique' },
    ],
    python: [
      { platform: 'Coursera', title: 'Coursera Python for Everybody' },
      { platform: 'DataCamp', title: 'DataCamp Python Fundamentals' },
      { platform: 'Udemy', title: 'Udemy Python pour Data Analytics' },
    ],
    docker: [
      { platform: 'Microsoft Learn', title: 'Microsoft Learn - Containerisation avec Docker' },
      { platform: 'Udemy', title: 'Udemy Docker pour developpeurs et DevOps' },
      { platform: 'Coursera', title: 'Coursera Docker and Kubernetes Basics' },
    ],
    linux: [
      { platform: 'Coursera', title: 'Coursera Linux Fundamentals' },
      { platform: 'Udemy', title: 'Udemy Administration Linux' },
      { platform: 'Microsoft Learn', title: 'Microsoft Learn Linux on Azure' },
    ],
    kubernetes: [
      { platform: 'Microsoft Learn', title: 'Microsoft Learn Kubernetes on Azure' },
      { platform: 'Udemy', title: 'Udemy Kubernetes pour DevOps' },
      { platform: 'Coursera', title: 'Coursera Kubernetes Basics' },
    ],
    'google ads': [
      { platform: 'Google Skillshop', title: 'Google Ads Search Certification' },
      { platform: 'Coursera', title: 'Coursera Digital Marketing with Google Ads' },
      { platform: 'Udemy', title: 'Udemy Google Ads de A a Z' },
    ],
    crm: [
      { platform: 'Coursera', title: 'Coursera CRM Strategy' },
      { platform: 'Udemy', title: 'Udemy CRM et automatisation commerciale' },
      { platform: 'Microsoft Learn', title: 'Microsoft Learn Dynamics 365 Fundamentals' },
    ],
    ifrs: [
      { platform: 'Coursera', title: 'Coursera IFRS Financial Reporting' },
      { platform: 'Udemy', title: 'Udemy IFRS et consolidation' },
      { platform: 'Formation interne', title: 'Atelier interne normes IFRS' },
    ],
  };
  return specific[key] ?? [
    { platform: 'Coursera', title: `Coursera - ${skillName}` },
    { platform: 'Udemy', title: `Udemy - ${skillName}` },
    { platform: 'Microsoft Learn', title: `Microsoft Learn - ${skillName}` },
    { platform: 'DataCamp', title: `DataCamp - ${skillName}` },
  ];
}

function profile(family: string, minYears: number, targetContracts: string[], skills: WeightedSkill[], offer: JobOffer): OfferProfileDefinition {
  void offer;
  return { family, minYears, targetContracts, weightedSkills: normalizeWeights(skills) };
}

function skill(name: string, importance: SkillImportance, weightPct: number, requiredLevel: number): WeightedSkill {
  return { name, importance, weightPct, requiredLevel };
}

function normalizeWeights(skills: WeightedSkill[]): WeightedSkill[] {
  const total = skills.reduce((sum, item) => sum + item.weightPct, 0) || 1;
  return skills.map(item => ({ ...item, weightPct: Math.round((item.weightPct / total) * 1000) / 10 }));
}
