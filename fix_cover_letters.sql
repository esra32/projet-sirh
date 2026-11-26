SET NAMES utf8mb4;

-- Community Manager (lettre avec suffixe IA)
UPDATE applications SET cover_letter = CONCAT(
  'Passionné par les réseaux sociaux et la communication de marque, je souhaite contribuer à la croissance de votre communauté en ligne. Ma créativité, ma réactivité et ma maîtrise des outils digitaux me permettent de produire du contenu engageant et de fédérer une audience autour de vos valeurs.',
  SUBSTRING(cover_letter, LOCATE('\n\nComp', cover_letter))
) WHERE id = '2de86886-cd60-425e-a452-4e47ead8c543';

-- Community Manager (sans suffixe IA)
UPDATE applications SET cover_letter =
  'Diplômé en communication digitale, je maîtrise l''ensemble des plateformes sociales et les outils d''analyse d''audience. Mon expérience en modération de communauté et en création de contenu visuel me permettra de valoriser efficacement votre image de marque.'
WHERE id = '9f6a6126-0b72-472e-b726-2f58ccce53cb';

-- Data Scientist (avec suffixe IA)
UPDATE applications SET cover_letter = CONCAT(
  'Passionné par l''analyse de données et les modèles prédictifs, je souhaite mettre mes compétences en Python et en machine learning au service de vos projets. Mon expérience en modélisation statistique m''a permis de développer des solutions à fort impact sur la prise de décision.',
  SUBSTRING(cover_letter, LOCATE('\n\nComp', cover_letter))
) WHERE id = 'dde87078-c6f4-4ed1-9e07-ab112a86dd8c';

-- Responsable Marketing Digital INTERVIEW_SCHEDULED (avec suffixe IA)
UPDATE applications SET cover_letter = CONCAT(
  'Fort d''une solide expérience en marketing digital, je maîtrise les leviers SEO, SEA et les outils d''analyse de performance. Ma capacité à piloter des campagnes multi-canaux et à interpréter les KPIs me permettra de renforcer votre visibilité digitale et d''optimiser votre taux de conversion.',
  SUBSTRING(cover_letter, LOCATE('\n\nComp', cover_letter))
) WHERE id = '008cf767-d7cb-489e-aaf2-6392b4d0589e';

-- Analyste Financier (avec suffixe IA)
UPDATE applications SET cover_letter = CONCAT(
  'Diplômé en finance d''entreprise, je dispose d''une solide maîtrise des outils d''analyse financière et de modélisation. Mon expérience en contrôle de gestion et en reporting m''a permis d''accompagner des directions dans leurs prises de décisions stratégiques basées sur des données fiables.',
  SUBSTRING(cover_letter, LOCATE('\n\nComp', cover_letter))
) WHERE id = '374fa2e6-10c5-4364-958d-db2d7eba79b0';

-- Responsable Marketing Digital ACCEPTED (avec suffixe IA)
UPDATE applications SET cover_letter = CONCAT(
  'Avec plusieurs années d''expérience en marketing digital, j''ai développé une expertise pointue en acquisition et fidélisation client. Ma maîtrise des outils d''automatisation marketing et ma culture data me permettront de maximiser le ROI de vos campagnes et d''accélérer votre croissance.',
  SUBSTRING(cover_letter, LOCATE('\n\nComp', cover_letter))
) WHERE id = '511a2b91-e6f9-4961-b83c-0dece8f74438';

-- Chargé de Recrutement Senior (avec suffixe IA)
UPDATE applications SET cover_letter = CONCAT(
  'Fort de mon expérience en recrutement de profils techniques et fonctionnels, je maîtrise l''ensemble du cycle d''acquisition des talents : sourcing, pré-qualification, conduite d''entretiens et intégration. Ma capacité à comprendre les besoins opérationnels des managers fait de moi un partenaire RH de confiance.',
  SUBSTRING(cover_letter, LOCATE('\n\nComp', cover_letter))
) WHERE id = '37c47afd-7269-4e07-a326-6ee4bac0901a';

-- Data Scientist Junior (sans suffixe IA)
UPDATE applications SET cover_letter =
  'Récemment diplômé en data science, j''ai acquis une maîtrise de Python, SQL et des principaux frameworks de machine learning lors de mes projets académiques et de mon stage. Je suis motivé à contribuer au développement de modèles analytiques innovants pour optimiser vos processus décisionnels.'
WHERE id = '636698c6-40db-4294-a6e5-6895bc6fe4b8';

-- Chargé de Recrutement Senior (avec suffixe IA)
UPDATE applications SET cover_letter = CONCAT(
  'Mon parcours en gestion des ressources humaines m''a permis de développer une approche structurée pour identifier et attirer les meilleurs profils. Je maîtrise les outils ATS, les techniques d''entretien comportemental et le sourcing multicanal pour répondre efficacement aux besoins en recrutement.',
  SUBSTRING(cover_letter, LOCATE('\n\nComp', cover_letter))
) WHERE id = 'b90146c4-ed3f-4937-944c-f38bc1979768';

-- Chargé de Recrutement Senior (sans suffixe IA)
UPDATE applications SET cover_letter =
  'Dynamique et orienté résultats, je souhaite mettre mon expertise en recrutement au service de votre croissance. Mon expérience dans la gestion de campagnes de sourcing multicanal et mon réseau professionnel actif me permettront d''apporter rapidement des candidats qualifiés et engagés.'
WHERE id = '23cea69b-9496-4e72-beb9-fa4f956ff390';

-- Responsable Marketing Digital ACCEPTED (sans suffixe IA)
UPDATE applications SET cover_letter =
  'Spécialiste en stratégie marketing digital, je conçois et pilote des campagnes SEO/SEA performantes et des programmes de fidélisation à fort impact. Ma vision data-driven et ma créativité me permettent d''élaborer des plans marketing alignés sur les objectifs business et générateurs de croissance durable.'
WHERE id = '084bc4de-cfcb-4ebf-a81a-c67456b80003';

-- Business Analyst (sans suffixe IA)
UPDATE applications SET cover_letter =
  'En tant que Business Analyst, j''accompagne les équipes métiers et IT dans la modélisation de leurs processus et la formalisation des besoins fonctionnels. Ma rigueur dans la rédaction de spécifications et mon aptitude à faciliter les ateliers de cadrage garantissent la réussite des projets de transformation.'
WHERE id = '5a0ba205-eb93-4650-86ec-a4a0564680ac';

-- Ingénieur Cybersécurité (sans suffixe IA)
UPDATE applications SET cover_letter =
  'Expert en sécurité des systèmes d''information, je maîtrise les standards OWASP et les méthodologies de pentest. Mon expérience en analyse de vulnérabilités, en mise en place de politiques de sécurité et en supervision SOC me permettra de renforcer la résilience et la conformité de votre infrastructure.'
WHERE id = '7e352abb-7358-4109-96d2-c9aa64b5bff1';

-- Développeur Frontend Angular (corriger encodage existant)
UPDATE applications SET cover_letter =
  'Passionné par le développement Frontend, je maîtrise Angular, Spring Boot et Git. Motivé et rigoureux, je souhaite rejoindre votre équipe pour contribuer à la conception d''interfaces modernes et performantes, en appliquant les meilleures pratiques UI/UX et les standards Angular 17.'
WHERE id = 'c6788750-2261-496e-9be0-dbd7a2e237be';

-- Corriger les dates de disponibilité futures (> 2026-06-21) dans les cover letters
UPDATE applications
SET cover_letter = REPLACE(cover_letter, 'Disponibilité : 2026-08-01', 'Disponibilité : 2026-02-15')
WHERE id = 'c6788750-2261-496e-9be0-dbd7a2e237be';

UPDATE applications
SET cover_letter = REPLACE(cover_letter, 'Disponibilité : 2026-07-02', 'Disponibilité : 2026-05-10')
WHERE id = '2de86886-cd60-425e-a452-4e47ead8c543';

SELECT 'Encodage et dates corrigés avec succès' as result;
