export type Language = 'fr' | 'en';
export type CurrencyCode = 'FCFA' | 'EUR' | 'USD';
export type ThemeMode = 'light' | 'dark';

export const CURRENCIES: Record<CurrencyCode, { code: CurrencyCode; label: string; symbol: string; position: 'prefix' | 'suffix' }> = {
  FCFA: { code: 'FCFA', label: 'Franc CFA (FCFA)', symbol: 'FCFA', position: 'suffix' },
  EUR: { code: 'EUR', label: 'Euro (€ EUR)', symbol: '€', position: 'suffix' },
  USD: { code: 'USD', label: 'Dollar ($ USD)', symbol: '$', position: 'prefix' },
};

export function formatCurrencyAmount(num: number, currency: CurrencyCode = 'FCFA'): string {
  const safeNum = isNaN(num) ? 0 : num;
  const formatted = new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'fr-FR').format(safeNum);
  const cfg = CURRENCIES[currency] || CURRENCIES.FCFA;
  if (cfg.position === 'prefix') {
    return `${cfg.symbol}${formatted} USD`;
  }
  if (currency === 'EUR') {
    return `${formatted} € (EUR)`;
  }
  return `${formatted} ${cfg.symbol}`;
}

export const translations = {
  fr: {
    appTitle: 'FAAB GAR',
    appSubtitle: 'Gestion Axée sur les Résultats',
    navExclusiveHint: 'Navigation exclusive par le menu déroulant (☰)',
    // Action Bar Tooltips
    importJson: 'Importer un fichier JSON',
    saveOverwriteJson: 'Enregistrer / Écraser le fichier JSON',
    exportJsonCopy: 'Exporter une copie JSON',
    downloadPdfReport: 'Télécharger le rapport PDF officiel',
    // Selectors in Burger Menu
    activePortfolioLabel: 'Dossier / Projet Actif',
    createNewProject: '+ Nouveau Dossier / Projet (Illimité)',
    currencyLabel: 'Devise Monétaire',
    languageLabel: 'Langue / Language',
    themeLabel: 'Thème Visuel',
    themeLight: 'Mode Clair (#FFFFFF)',
    themeDark: 'Mode Sombre (#0f172a)',
    // User Profile Tab
    profileTitle: 'Profil de l’Utilisateur / Concepteur',
    profileSubtitle:
      'Ces informations sont enregistrées automatiquement et reportées dans la Fiche Technique, le Résumé Exécutif et le rapport PDF de vos dossiers.',
    profileFullName: 'Nom & Prénoms',
    profileFullNamePlaceholder: 'Ex: KOFFIE FABIEN MICHAEL',
    profileEmail: 'Adresse Email',
    profileEmailPlaceholder: 'Ex: expert@institution.org',
    profileContact: 'Contact / Téléphone',
    profileContactPlaceholder: 'Ex: +225 00 00 00 00',
    profileInstitution: 'Institution / Organisation',
    profileInstitutionPlaceholder: "Nom de l'Institution ou Ministère...",
    profileRole: 'Fonction / Titre',
    profileRolePlaceholder: 'Ex: Coordonnateur / Expert GAR...',
    profileSavedBadge: 'Synchronisé automatiquement (IndexedDB) & lié aux Fiches Techniques',
    // Menu Categories & Items
    catPrep: 'Phase Préparatoire',
    catActiveTools: "Outils de l'Entité Active",
    catIdentification: 'Identification',
    catPlanification: 'Planification',
    catProgrammation: 'Programmation',
    catConclusion: 'Conclusion & Livrables',
    tabs: {
      accueil: 'Accueil',
      profil: 'Profil Utilisateur',
      dossier: 'Dossiers & Projets',
      arbre: 'Arbre à problèmes',
      solutions: 'Arbre à solutions',
      registre_parties: 'Registre Parties Prenantes',
      terrain: 'Analyse des problèmes',
      parties: 'Analyse Parties Prenantes',
      rendement: 'Cadre de Rendement',
      cmr: 'Cadre Mesure Rendement',
      risques_hypo: 'Hypothèses & Risques',
      extrants: 'Matrice Extrants & Activités',
      clar: 'Cadre Logique (CLAR)',
      fiche: 'Fiche Technique & Résumé',
    },
    subTabs: {
      beneficiaires: 'Bénéficiaires',
      interne: "Interne à l'Institution",
      externe: "Externe à l'Institution",
      tech: 'Partenaires Techniques',
      fin: 'Partenaires Financiers',
      ficheTech: 'Fiche Technique',
      resume: 'Résumé Exécutif',
    },
    // Mobile View Toggle
    viewTree: 'Vue Arbre',
    viewList: 'Vue Liste',
    zoomIn: 'Zoom +',
    zoomOut: 'Zoom -',
    zoomReset: 'Ajuster',
    // Landing Page
    scrollProgress: 'Progression de lecture',
    anchorIntro: 'Présentation',
    anchorMethod: 'Architecture GAR',
    anchorSaveGuide: 'Sauvegarde JSON & IndexedDB',
    anchorEngineering: 'Ingénierie & Crédits',
    anchorLegal: 'Confidentialité & PI',
    heroBadge: 'Architecture Institutionnelle de Pilotage',
    heroTitle1: 'Maîtrisez le Cycle Complet de la',
    heroTitle2: 'Gestion Axée sur les Résultats',
    heroDesc:
      "FAAB GAR structure l'intégralité de la chaîne de valeur publique et institutionnelle : du diagnostic causal (Arbre à problèmes) à la programmation budgétaire multi-devises, au Cadre de Mesure du Rendement (CMR) et à la génération directe de livrables PDF officiels.",
    strictBurgerNotice:
      "Accès sécurisé : Utilisez exclusivement l'icône du Menu Burger (☰) en haut à gauche pour naviguer vers les modules opérationnels, renseigner votre Profil, gérer vos dossiers ou exporter vos rapports.",
    methodTitle: 'Chaîne Logique & Architecture Méthodologique GAR',
    methodSubtitle: 'Une synchronisation intégrale en 4 phases entre le diagnostic de terrain et la budgétisation opérationnelle.',
    phases: [
      {
        code: 'PHASE 01',
        title: 'Diagnostic Causal & Parties Prenantes',
        desc: "Modélisation de l'Arbre à problèmes (Conséquence globale, Problèmes centraux par service, Contraintes, Causes profondes et Besoins) et cartographie complète des acteurs internes, externes, bénéficiaires et PTF.",
      },
      {
        code: 'PHASE 02',
        title: 'Arbre à Solutions & Cadre de Rendement',
        desc: "Transposition automatique des problèmes en objectifs positifs : Impact global, Effets par axe de service, Extrants livrables, Activités opérationnelles et quantification fine des Intrants RH et Matériels.",
      },
      {
        code: 'PHASE 03',
        title: 'Mesure du Rendement (CMR) & Gestion des Risques',
        desc: "Suivi des indicateurs clés de performance (KPI, référence, cible, réalisation, fréquence, source de vérification) et liaison dynamique des hypothèses conditionnelles entre branches et services.",
      },
      {
        code: 'PHASE 04',
        title: 'Cadre Logique (CLAR) & Livrable PDF Direct',
        desc: "Consolidation matricielle automatique des coûts par activité et par projet dans la devise choisie (FCFA, € EUR, $ USD) et téléchargement instantané du rapport officiel en PDF sur fond blanc pur.",
      },
    ],
    // Pedagogical JSON Save Section
    saveGuideBadge: 'Guide Méthodologique & Sécurité des Données',
    saveGuideTitle: 'Comment et Pourquoi Enregistrer / Écraser votre Fichier JSON ?',
    saveGuideIntro:
      "FAAB GAR intègre un double système de persistance : l'enregistrement temps réel dans l'IndexedDB de votre appareil et la synchronisation directe sur fichier JSON via l'icône disquette (Enregistrer) du menu déroulant.",
    saveHowTitle: 'Comment fonctionne le bouton « Enregistrer / Mettre à jour JSON » ?',
    saveHowSteps: [
      "Ouvrez le menu déroulant (☰) en haut à gauche et cliquez sur l'icône Disquette (2e icône de la barre d'outils).",
      "Lors du premier enregistrement (ou après avoir importé un fichier .json), sélectionnez votre fichier de travail : l'application écrase et remplace directement l'ancien fichier JSON portant le même nom par la nouvelle version à jour.",
      "Toutes vos modifications (profil, dossiers, arbres, budgets, devise) sont simultanément synchronisées dans la mémoire IndexedDB de votre appareil.",
    ],
    saveWhyTitle: 'Pourquoi privilégier l’écrasement direct du fichier JSON ?',
    saveWhyReasons: [
      {
        title: '1. Unicité de la Version (Zéro Doublon)',
        desc: "Évite la prolifération de fichiers multiples (projet_v1.json, projet_v2_copie.json) et garantit une source unique de vérité toujours à jour sur votre ordinateur ou support USB.",
      },
      {
        title: '2. Double Sécurité (IndexedDB + Fichier Local)',
        desc: "Même si le cache du navigateur est nettoyé ou si vous changez de poste, votre fichier JSON consolidé contient 100 % de vos portefeuilles, profil et paramètres.",
      },
      {
        title: '3. Portabilité Institutionnelle & Travail Collaboratif',
        desc: "Permet de transmettre un dossier unique et certifié à vos équipes, ministères ou partenaires techniques et financiers (PTF) pour révision ou audit.",
      },
    ],
    // Engineering & Legal
    engBadge: 'Conception & Ingénierie Logicielle',
    engRole: 'Architecte & Concepteur Principal de la Plateforme FAAB GAR',
    legalTitle: 'Accord de Confidentialité & Propriété Intellectuelle',
    legalText:
      "La présente plateforme FAAB GAR, incluant son architecture structurelle, sa logique algorithmique, ses matrices de calcul GAR et son design d'interface, constitue une œuvre de l'esprit protégée appartenant exclusivement à son créateur (KOFFIE FABIEN MICHAEL). En utilisant cette application, l'administration, l'expert ou l'institution utilisatrice s'engage formellement à respecter la stricte confidentialité de ce système. Toute copie, reproduction, ingénierie inverse ou distribution non expressément autorisée à des tiers est rigoureusement interdite sous peine de poursuites légales.",
    footerRights: 'Plateforme Institutionnelle FAAB GAR protégée. Tous droits réservés.',
  },
  en: {
    appTitle: 'FAAB RBM',
    appSubtitle: 'Results-Based Management',
    navExclusiveHint: 'Exclusive navigation via the slide-out menu (☰)',
    // Action Bar Tooltips
    importJson: 'Import existing JSON file',
    saveOverwriteJson: 'Save / Overwrite JSON file',
    exportJsonCopy: 'Export a JSON copy',
    downloadPdfReport: 'Download official PDF report',
    // Selectors in Burger Menu
    activePortfolioLabel: 'Active Portfolio / Project',
    createNewProject: '+ New Portfolio / Project (Unlimited)',
    currencyLabel: 'Monetary Currency',
    languageLabel: 'Language / Langue',
    themeLabel: 'Visual Theme',
    themeLight: 'Light Mode (#FFFFFF)',
    themeDark: 'Dark Mode (#0f172a)',
    // User Profile Tab
    profileTitle: 'User / Designer Profile',
    profileSubtitle:
      'This information is saved automatically and included in the Technical Sheet, Executive Summary, and PDF report of your portfolios.',
    profileFullName: 'Full Name (Last & First Name)',
    profileFullNamePlaceholder: 'E.g. KOFFIE FABIEN MICHAEL',
    profileEmail: 'Email Address',
    profileEmailPlaceholder: 'E.g. expert@institution.org',
    profileContact: 'Contact / Phone',
    profileContactPlaceholder: 'E.g. +225 00 00 00 00',
    profileInstitution: 'Institution / Organization',
    profileInstitutionPlaceholder: 'Ministry or Institution Name...',
    profileRole: 'Role / Position',
    profileRolePlaceholder: 'E.g. RBM Coordinator / Senior Expert...',
    profileSavedBadge: 'Automatically synced (IndexedDB) & linked to Technical Sheets',
    // Menu Categories & Items
    catPrep: 'Preparatory Phase',
    catActiveTools: 'Active Entity Tools',
    catIdentification: 'Identification',
    catPlanification: 'Planning',
    catProgrammation: 'Programming',
    catConclusion: 'Conclusion & Deliverables',
    tabs: {
      accueil: 'Home',
      profil: 'User Profile',
      dossier: 'Portfolios & Projects',
      arbre: 'Problem Tree',
      solutions: 'Solution Tree',
      registre_parties: 'Stakeholder Register',
      terrain: 'Problem Analysis',
      parties: 'Stakeholder Analysis',
      rendement: 'Performance Framework',
      cmr: 'Performance Measurement (PMF)',
      risques_hypo: 'Assumptions & Risks',
      extrants: 'Outputs & Activities Matrix',
      clar: 'Logical Framework (LFA)',
      fiche: 'Technical Sheet & Summary',
    },
    subTabs: {
      beneficiaires: 'Beneficiaries',
      interne: 'Internal to Institution',
      externe: 'External to Institution',
      tech: 'Technical Partners',
      fin: 'Financial Partners',
      ficheTech: 'Technical Sheet',
      resume: 'Executive Summary',
    },
    // Mobile View Toggle
    viewTree: 'Tree View',
    viewList: 'List View',
    zoomIn: 'Zoom +',
    zoomOut: 'Zoom -',
    zoomReset: 'Fit',
    // Landing Page
    scrollProgress: 'Reading progress',
    anchorIntro: 'Overview',
    anchorMethod: 'RBM Architecture',
    anchorSaveGuide: 'JSON & IndexedDB Backup',
    anchorEngineering: 'Engineering & Credits',
    anchorLegal: 'Confidentiality & IP',
    heroBadge: 'Institutional Performance Architecture',
    heroTitle1: 'Master the Full Lifecycle of',
    heroTitle2: 'Results-Based Management',
    heroDesc:
      'FAAB GAR structures the entire institutional value chain: from causal problem tree diagnostics to multi-currency budget programming, Performance Measurement Frameworks (PMF), and direct structured PDF report generation.',
    strictBurgerNotice:
      'Secure Navigation: Use exclusively the Burger Menu icon (☰) at the top-left to access operational modules, fill in your Profile, switch portfolios, or export official reports.',
    methodTitle: 'Logical Chain & RBM Methodological Architecture',
    methodSubtitle: 'Full 4-stage synchronization between field diagnostics and operational multi-currency budgeting.',
    phases: [
      {
        code: 'STAGE 01',
        title: 'Causal Diagnosis & Stakeholder Mapping',
        desc: 'Model the Problem Tree (Global consequence, Central problems per department, Constraints, Root causes, and Needs) alongside comprehensive stakeholder mapping.',
      },
      {
        code: 'STAGE 02',
        title: 'Solution Tree & Performance Framework',
        desc: 'Automatic transposition of problems into positive objectives: Global Impact, Outcomes per department, Deliverable Outputs, Operational Activities, and HR/Material Inputs.',
      },
      {
        code: 'STAGE 03',
        title: 'Performance Measurement (PMF) & Risk Matrix',
        desc: 'Track Key Performance Indicators (KPI, baseline, target, actual, frequency, verification source) and link conditional assumptions across branches and departments.',
      },
      {
        code: 'STAGE 04',
        title: 'Logical Framework (LFA) & Direct PDF Deliverable',
        desc: 'Automatic matrix consolidation of activity and project costs in your active currency (FCFA, € EUR, $ USD) and instant pure-white official PDF generation.',
      },
    ],
    // Pedagogical JSON Save Section
    saveGuideBadge: 'Methodological Guide & Data Security',
    saveGuideTitle: 'How and Why to Save / Overwrite Your JSON File?',
    saveGuideIntro:
      'FAAB GAR combines dual persistence: real-time automatic storage in your device IndexedDB and direct JSON file synchronization via the Save (Floppy Disk) icon in the slide-out menu.',
    saveHowTitle: 'How does the "Save / Overwrite JSON" button work?',
    saveHowSteps: [
      'Open the slide-out burger menu (☰) at the top-left and click the Floppy Disk icon (2nd icon in the top action bar).',
      'On first save (or after importing an existing .json file), select your working file: the application directly overwrites and replaces the old JSON file of the same name with the updated version.',
      'All changes (profile, portfolios, trees, budgets, currency) are simultaneously synchronized with your device IndexedDB.',
    ],
    saveWhyTitle: 'Why overwrite the existing JSON file directly?',
    saveWhyReasons: [
      {
        title: '1. Single Source of Truth (Zero Duplicates)',
        desc: 'Eliminates confusing duplicate files (project_v1.json, project_v2_copy.json) and guarantees one authoritative, up-to-date file on your computer or USB drive.',
      },
      {
        title: '2. Dual Redundancy (IndexedDB + Local File)',
        desc: 'Even if browser storage is cleared or you switch workstations, your consolidated JSON file preserves 100% of your portfolios, profile, and settings.',
      },
      {
        title: '3. Institutional Portability & Team Collaboration',
        desc: 'Allows instant sharing of a certified, single-file portfolio with ministries, technical teams, or financial partners for review and auditing.',
      },
    ],
    // Engineering & Legal
    engBadge: 'Software Conception & Engineering',
    engRole: 'Lead Architect & Creator of the FAAB GAR Platform',
    legalTitle: 'Confidentiality & Intellectual Property Agreement',
    legalText:
      'This FAAB GAR platform, including its structural architecture, algorithmic logic, RBM calculation matrices, and interface design, constitutes a protected intellectual work belonging exclusively to its creator (KOFFIE FABIEN MICHAEL). By using this application, the administration, expert, or institution formally agrees to maintain strict confidentiality. Any unauthorized copying, reproduction, reverse engineering, or distribution to third parties is strictly prohibited and subject to legal prosecution.',
    footerRights: 'Protected FAAB GAR Institutional Platform. All rights reserved.',
  },
};
