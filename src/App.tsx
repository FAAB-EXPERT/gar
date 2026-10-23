import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FolderOpen, LayoutDashboard, Users, AlertCircle, Target, 
  Activity, ShieldAlert, FileText, Settings, Menu, 
  Plus, CheckCircle, Briefcase, X, Home, Trash2, Network, Lightbulb, BookOpen,
  ZoomIn, ZoomOut, RotateCcw, ListFilter, UserCheck, User, Mail, Phone, Building2
} from 'lucide-react';
import { hydrateFullState, saveToIndexedDB, loadFromIndexedDB, UserProfile, DEFAULT_USER_PROFILE } from './utils/db';
import { CurrencyCode, formatCurrencyAmount, Language, ThemeMode, translations } from './utils/i18n';
import { generateDirectGARPdf } from './utils/pdfGenerator';
import { LandingPage, LOGO_SRC } from './components/LandingPage';
import { BurgerDrawer } from './components/BurgerDrawer';
import { MobileProblemList, MobileSolutionList } from './components/MobileTreeList';

let currentGlobalCurrency: CurrencyCode = 'FCFA';

// HELPER: Garantit que les données sont toujours un tableau
const ensureArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
  return [val];
};

// HELPERS DE DONNÉES 2D (Pour gérer multiples intrants par activité)
const getSafe2D = (arr: any, k: number) => {
  if (!Array.isArray(arr)) return [];
  if (arr.length > 0 && !Array.isArray(arr[0])) return k === 0 ? arr : [];
  return arr[k] || [];
};

// HELPER: Formatage et calculs financiers
const parseAmount = (val: any) => {
  if (!val) return 0;
  const strVal = val.toString();
  const cleaned = strVal.replace(/\s+/g, '').replace(/FCFA|CFA|EUR|USD|€|\$|F/gi, '').replace(',', '.');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  return isNaN(num) ? 0 : num;
};

const formatAmount = (num: number) => formatCurrencyAmount(num, currentGlobalCurrency);

const calculateActivityTotal = (proj: any, k: number) => {
  let sum = 0; let hasAmounts = false;
  const process = (items: any) => {
     if(!Array.isArray(items)) return;
     items.forEach((item: any) => {
       if (typeof item === 'object' && item.amount) {
         const val = parseAmount(item.amount);
         if (val > 0) { sum += val; hasAmounts = true; }
       }
     });
  };
  process(getSafe2D(proj?.intrants_rh, k));
  process(getSafe2D(proj?.intrants_mat, k));
  return { sum, hasAmounts };
};

const getProjectEffectiveCost = (proj: any) => {
  if (!proj) return 0;
  const actCount = Math.max(ensureArray(proj.activites).length, 1);
  let total = 0;
  for(let k=0; k < actCount; k++) {
     const { sum } = calculateActivityTotal(proj, k);
     total += sum;
  }
  return total;
};

// NOUVEAU HELPER : Récupérer les parties prenantes du projet
const getAvailableActors = (projData: any, axeIdx: number, pIdx: number) => {
  const stakeholders = projData?.garData?.stakeholders || {};
  const actors: string[] = [];
  ['instCentralises', 'instDecentralises'].forEach(key => {
    (stakeholders[key] || []).forEach((a: any) => {
      if (a.axe === axeIdx && a.projetIndex === pIdx && a.nom && a.nom.trim() !== '') {
        actors.push(a.nom.trim());
      }
    });
  });
  return [...new Set(actors)];
};

// COMPOSANT: Cellule Editable générique compacte avec fort contraste
interface EditableCellProps {
  isEditable: boolean;
  value: any;
  onChange: (val: any) => void;
  type?: string;
  placeholder?: string;
  fixedPrefix?: string;
}

const EditableCell: React.FC<EditableCellProps> = ({ isEditable, value, onChange, type = "text", placeholder = "...", fixedPrefix = "" }) => {
  let displayValue = value || '';
  if (fixedPrefix && typeof displayValue === 'string' && !displayValue.startsWith(fixedPrefix)) {
    displayValue = fixedPrefix; 
  }

  if (!isEditable) {
    if (type === "list") {
      const arr = ensureArray(displayValue);
      if (arr.length === 0) return <span className="text-slate-800">-</span>;
      return <ul className="list-disc pl-3.5 space-y-0.5 text-[10px] sm:text-[11px] text-slate-900">{arr.map((v, i) => <li key={i}>{v}</li>)}</ul>;
    }
    if (type === "numberList") {
      const arr = ensureArray(displayValue);
      if (arr.length === 0) return <span className="text-slate-800">-</span>;
      return <ul className="list-decimal pl-3.5 space-y-0.5 text-[10px] sm:text-[11px] text-slate-900">{arr.map((v, i) => <li key={i}>{v}</li>)}</ul>;
    }
    return <span className="whitespace-pre-line text-[10px] sm:text-[11px] text-slate-900">{displayValue || '-'}</span>;
  }

  if (type === "textarea" || type === "list" || type === "numberList") {
    const textVal = Array.isArray(displayValue) ? displayValue.join('\n') : displayValue;
    return (
      <textarea 
        className="w-full bg-orange-50 border border-orange-300 rounded p-1 text-slate-900 text-[10px] sm:text-[11px] font-medium focus:ring-1 focus:ring-red-500 min-h-[34px] shadow-inner transition-all leading-tight custom-scrollbar" 
        value={textVal || ''} 
        onChange={(e) => {
          let val = e.target.value;
          if (fixedPrefix && !val.startsWith(fixedPrefix)) val = fixedPrefix; 
          onChange(type === "list" || type === "numberList" ? val.split('\n') : val);
        }} 
        placeholder={placeholder} 
      />
    );
  }

  return (
    <input 
      type="text" 
      className="w-full bg-orange-50 border border-orange-300 rounded p-1 text-slate-900 text-[10px] sm:text-[11px] font-medium focus:ring-1 focus:ring-red-500 shadow-inner transition-all" 
      value={displayValue || ''} 
      onChange={(e) => {
        let val = e.target.value;
        if (fixedPrefix && !val.startsWith(fixedPrefix)) val = fixedPrefix;
        onChange(val);
      }} 
      placeholder={placeholder} 
    />
  );
};

// COMPOSANT: Liste de Ressources Éditable Compacte (RH & Matériel)
interface EditableResourceListProps {
  isEditable: boolean;
  items: any;
  onChange?: (val: any) => void;
  placeholderLabel?: string;
}

const EditableResourceList: React.FC<EditableResourceListProps> = ({ isEditable, items, onChange = () => {}, placeholderLabel = "Désignation..." }) => {
  const normalizedArr = useMemo(() => {
    if (!items) return [];
    if (!Array.isArray(items)) {
      if (typeof items === 'string') return items.split('\n').filter((s: string)=>s.trim()).map((s: string) => ({ label: s.trim(), amount: '' }));
      return [];
    }
    return items.map((item: any) => typeof item === 'string' ? { label: item, amount: '' } : item);
  }, [items]);

  if (!isEditable) {
    if (normalizedArr.length === 0) return <p className="text-[9px] italic text-slate-500">Non défini</p>;
    return (
      <ul className="text-[9px] sm:text-[10px] leading-tight font-medium text-slate-900 list-disc pl-3.5 space-y-0.5">
        {normalizedArr.map((item: any, idx: number) => (
          <li key={idx} className="break-words">
            {item.label} {item.amount && <span className="font-bold text-red-700 ml-1 font-mono">({formatAmount(parseAmount(item.amount))})</span>}
          </li>
        ))}
      </ul>
    );
  }

  const updateItem = (idx: number, field: string, val: string) => {
    const newArr = [...normalizedArr];
    newArr[idx] = { ...newArr[idx], [field]: val };
    onChange(newArr);
  };

  const addItem = () => onChange([...normalizedArr, { label: '', amount: '' }]);
  const removeItem = (idx: number) => onChange(normalizedArr.filter((_: any, i: number) => i !== idx));

  return (
    <div className="space-y-1 w-full">
      {normalizedArr.map((item: any, idx: number) => (
         <div key={idx} className="flex items-center gap-1 bg-white p-0.5 rounded border border-slate-300 shadow-2xs">
           <input type="text" className="flex-1 min-w-0 bg-transparent text-[9px] sm:text-[10px] font-bold text-slate-900 focus:outline-none placeholder:text-slate-400" value={item.label || ''} onChange={e => updateItem(idx, 'label', e.target.value)} placeholder={placeholderLabel} />
           <input type="text" className="w-16 sm:w-20 min-w-0 bg-red-50 text-[9px] sm:text-[10px] font-mono font-black text-red-800 border-l border-slate-200 pl-1 focus:outline-none placeholder:text-red-400" value={item.amount || ''} onChange={e => updateItem(idx, 'amount', e.target.value)} placeholder={`Coût (${currentGlobalCurrency})`} />
           <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 px-0.5 cursor-pointer" title="Supprimer"><X size={11} /></button>
         </div>
      ))}
      <button onClick={addItem} className="flex items-center justify-center w-full gap-1 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-dashed border-red-300 transition-colors text-[8px] font-bold uppercase tracking-wider cursor-pointer">
        <Plus size={9} /> Ajouter
      </button>
    </div>
  );
};

// HELPER UI: Rendu du budget par activité (Couleur Rouge)
const renderActivityCost = (proj: any, k: number, _showLabel = true) => {
  const { sum } = calculateActivityTotal(proj, k);
  return (
    <div className="text-center p-1 bg-red-50 rounded border border-red-300 shadow-inner w-full">
      <span className="text-[10px] font-mono font-black text-red-900 block">{formatAmount(sum)}</span>
      <span className="text-[7px] uppercase font-bold text-red-700 block mt-0.5 opacity-90 tracking-widest">Calcul auto</span>
    </div>
  );
};

// LIGNES RÉUTILISABLES POUR LES TABLEAUX
const AxeRow: React.FC<{ axe: any; colSpan: number }> = ({ axe, colSpan }) => (
  <tr className="bg-slate-200 border-y border-slate-400">
    <td colSpan={colSpan} className="sticky left-0 z-10 px-2.5 py-1 font-black text-slate-900 text-[10px] sm:text-xs bg-slate-200 uppercase tracking-wider shadow-[inset_0_-1px_0_0_#cbd5e1]">{axe?.nom || 'Axe sans nom'}</td>
  </tr>
);

const ProjRow: React.FC<{ proj: any; pIdx: number; colSpan: number }> = ({ proj, pIdx, colSpan }) => (
  <tr className="bg-slate-100 border-y border-slate-300">
    <td colSpan={colSpan} className="sticky left-0 z-10 px-2.5 py-1 font-bold text-slate-700 bg-slate-100 uppercase text-[9px] tracking-wider shadow-[inset_0_-1px_0_0_#cbd5e1]">
      Sous-Problème {pIdx + 1} (Projet {pIdx + 1}) : {proj?.extrant || 'Projet sans nom'}
    </td>
  </tr>
);

// --- BASE DE DONNÉES EXPERTE INITIALE ---
const initialData: any[] = [
  {
    id: 'port-1',
    name: 'Nouveau Portefeuille (À nommer)',
    description: 'Espace d\'expérimentation libre pour simuler et créer un portefeuille avec la méthodologie GAR.',
    serviceName: 'Service ',
    budget: '0 FCFA',
    status: 'Brouillon',
    isEditable: true, 
    isTrashed: false,
    cadrageStrategique: { vision: "", mission: "", objectifGeneral: "" },
    garData: {
      stakeholders: { beneficiaires: [], instCentralises: [], instDecentralises: [], operateursTechniques: [], ptf: [] },
      problems: { consequenceGlobale: "", branches: [{ axeName: "Service 1", central: "", details: [{ contrainte: "", cause: [""], besoin: [""] }] }] },
      rendement: { impact: "", axes: [{ nom: "Service 1", effet: "", budget: "0 FCFA", projets: [{ extrant: "", extrantCmr: "", activites: [""], intrants_rh: [[]], intrants_mat: [[]], couts: [""], responsable: "", periode: "" }] }] },
      cmr: [{ niveau: "IMPACT GLOBAL", resultat: "", indicateur: "", ref: "0", cible: "100", real: "0", freq: "Annuelle", source: "Rapport de ", responsable: "", axe: 0 }],
      risks: [],
      fiche: { lieu: "", duree: "", moa: "", moe: "", partenaires: "", strategie: "" }
    }
  }
];

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e?: any) => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: any;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = "primary", icon: Icon, className = "" }) => {
  const baseStyle = "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer";
  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-xs",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300",
    danger: "bg-red-50 text-red-700 hover:bg-red-100"
  };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = "", onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 ${className}`}>
    {children}
  </div>
);

const NoProjectScreen: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-600 dark:text-slate-300 py-10">
    <FolderOpen size={48} className="mb-3 text-red-500" />
    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aucune Entité Active</h2>
    <p className="mt-1.5 text-center max-w-md text-xs">Pour accéder aux outils de la GAR, sélectionnez ou créez un dossier depuis le menu déroulant (☰) ou les Dossiers.</p>
    <Button className="mt-4 bg-red-600 hover:bg-red-700" onClick={() => setActiveTab('dossier')}>Aller aux Dossiers</Button>
  </div>
);

// --- APPLICATION PRINCIPALE ---
export default function App() {
  const [isBurgerOpen, setIsBurgerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('accueil');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [lang, setLang] = useState<Language>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('FCFA');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [lastFileName, setLastFileName] = useState<string>('FAAB_GAR_Portefeuilles.json');
  const [statusBanner, setStatusBanner] = useState<string>('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);

  // Mobile/Responsive Tree vs List view & compact default zoom
  const [treeViewMode, setTreeViewMode] = useState<'tree' | 'list'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'tree'
  );
  const [treeZoom, setTreeZoom] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 0.72 : 0.85
  );

  const fileHandleRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  currentGlobalCurrency = currency;
  const t = translations[lang];

  const [portfolios, setPortfolios] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('faab_gar_portfolios');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialData;
  });

  const [activeProject, setActiveProject] = useState<any>(() => {
    return portfolios[0] || null;
  });

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? '' : prev));
    }, 4500);
  };

  // Hydrate full state from native IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    hydrateFullState().then(async (state) => {
      if (!mounted) return;
      if (state.portfolios && Array.isArray(state.portfolios) && state.portfolios.length > 0) {
        setPortfolios(state.portfolios);
        const target =
          state.portfolios.find((p: any) => p.id === state.activeProjectId && !p.isTrashed) ||
          state.portfolios.find((p: any) => !p.isTrashed) ||
          state.portfolios[0];
        setActiveProject(target || null);
      }
      if (state.language) setLang(state.language);
      if (state.currency) {
        setCurrency(state.currency);
        currentGlobalCurrency = state.currency;
      }
      if (state.theme) setTheme(state.theme);
      if (state.lastFileName) setLastFileName(state.lastFileName);
      if (state.userProfile) setUserProfile({ ...DEFAULT_USER_PROFILE, ...state.userProfile });

      try {
        const savedHandle = await loadFromIndexedDB('fileHandle');
        if (savedHandle) fileHandleRef.current = savedHandle;
      } catch {}

      setIsHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Automatically persist all state in real time to IndexedDB
  useEffect(() => {
    if (!isHydrated) return;
    saveToIndexedDB('portfolios', portfolios);
    try {
      localStorage.setItem('faab_gar_portfolios', JSON.stringify(portfolios));
    } catch {}
  }, [portfolios, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveToIndexedDB('activeProjectId', activeProject?.id || null);
  }, [activeProject?.id, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveToIndexedDB('language', lang);
  }, [lang, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    currentGlobalCurrency = currency;
    saveToIndexedDB('currency', currency);
  }, [currency, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveToIndexedDB('theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveToIndexedDB('lastFileName', lastFileName);
  }, [lastFileName, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    saveToIndexedDB('userProfile', userProfile);
  }, [userProfile, isHydrated]);

  // SYSTÈME DE FILTRE MULTI-BRANCHES
  const [filterContext, setFilterContext] = useState<any>({ type: 'all', focusedBranches: [], focusedAxes: [] });
  
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: null });
  const openConfirmModal = (title: string, message: string, onConfirm: () => void) => setConfirmModal({ isOpen: true, title, message, onConfirm });
  const closeConfirmModal = () => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });

  // HELPERS DE VISIBILITÉ POUR LE MULTI-FOCUS
  const isAxeFocused = (axeIdx: number) => {
    if (filterContext.type === 'all') return true;
    if (filterContext.type === 'axe') return (filterContext.focusedAxes || []).includes(axeIdx);
    return (filterContext.focusedBranches || []).some((f: any) => f.axeIndex === axeIdx);
  };
  const isProjFocused = (axeIdx: number, projIdx: number) => {
    if (filterContext.type === 'all') return true;
    if (filterContext.type === 'axe') return (filterContext.focusedAxes || []).includes(axeIdx);
    return (filterContext.focusedBranches || []).some((f: any) => f.axeIndex === axeIdx && f.projetIndex === projIdx);
  };

  const menuItems = [
    { id: 'accueil', label: t.tabs.accueil, icon: Home },
    { id: 'profil', label: t.tabs.profil, icon: UserCheck },
    { id: 'dossier', label: t.tabs.dossier, icon: FolderOpen },
    { id: 'arbre', label: t.tabs.arbre, icon: Network },
    { id: 'solutions', label: t.tabs.solutions, icon: Lightbulb },
    { id: 'registre_parties', label: t.tabs.registre_parties, icon: BookOpen },
    { id: 'terrain', label: t.tabs.terrain, icon: LayoutDashboard },
    { id: 'parties', label: t.tabs.parties, icon: Users, subs: ['Bénéficiaires', 'Interne à l\'Institution', 'Externe à l\'Institution', 'Partenaires Techniques', 'Partenaires Financiers'] },
    { id: 'rendement', label: t.tabs.rendement, icon: Target },
    { id: 'cmr', label: t.tabs.cmr, icon: Activity },
    { id: 'risques_hypo', label: t.tabs.risques_hypo, icon: ShieldAlert },
    { id: 'extrants', label: t.tabs.extrants, icon: CheckCircle },
    { id: 'clar', label: t.tabs.clar, icon: LayoutDashboard },
    { id: 'fiche', label: t.tabs.fiche, icon: FileText, subs: ['Fiche Technique', 'Résumé'] }
  ];

  const handleTabClick = (item: any) => {
    if (!item) return;
    setActiveTab(item.id);
    if (item.subs) setActiveSubTab(item.subs[0]);
  };

  const handleEnterGAR = (entity: any) => {
    setActiveProject({ ...entity });
    setFilterContext({ type: 'all', focusedBranches: [], focusedAxes: [] });
    setActiveTab('arbre');
  };

  const getStakeholderKey = (subTabName: string) => {
    if (subTabName === 'Bénéficiaires') return 'beneficiaires';
    if (subTabName === 'Interne à l\'Institution') return 'instCentralises';
    if (subTabName === 'Externe à l\'Institution') return 'instDecentralises';
    if (subTabName === 'Partenaires Techniques') return 'operateursTechniques';
    if (subTabName === 'Partenaires Financiers') return 'ptf';
    return '';
  };

  const updateProject = (updaterFn: (proj: any) => void) => {
    if (!activeProject?.isEditable) return;
    const clone = JSON.parse(JSON.stringify(activeProject));
    updaterFn(clone);
    setActiveProject(clone);
    setPortfolios(prev => prev.map(p => p.id === clone.id ? clone : p));
  };

  // Unlimited portfolio creation
  const createNewSandbox = () => {
    const newSandbox = JSON.parse(JSON.stringify(initialData[0]));
    newSandbox.id = `port-${Date.now()}`;
    newSandbox.name = `${lang === 'fr' ? 'Nouveau Dossier' : 'New Portfolio'} ${portfolios.filter(p => !p.isTrashed).length + 1}`;
    const nextList = [...portfolios, newSandbox];
    setPortfolios(nextList);
    setActiveProject(newSandbox);
    showToast(lang === 'fr' ? 'Nouveau dossier créé et enregistré dans IndexedDB' : 'New portfolio created and saved in IndexedDB');
  };

  // --- 4 TOP ACTION BAR HANDLERS (IMPORT JSON, SAVE/OVERWRITE JSON, EXPORT COPY JSON, DOWNLOAD PDF) ---
  const buildFullExportPayload = () => ({
    app: 'FAAB_GAR',
    version: '2.5',
    updatedAt: new Date().toISOString(),
    language: lang,
    currency,
    theme,
    userProfile,
    activeProjectId: activeProject?.id || null,
    portfolios,
  });

  const applyImportedPayload = (parsed: any, fileName?: string, handle?: any) => {
    if (Array.isArray(parsed)) {
      setPortfolios(parsed);
      setActiveProject(parsed.find((p: any) => !p.isTrashed) || parsed[0] || null);
    } else if (parsed && Array.isArray(parsed.portfolios)) {
      setPortfolios(parsed.portfolios);
      const target =
        parsed.portfolios.find((p: any) => p.id === parsed.activeProjectId && !p.isTrashed) ||
        parsed.portfolios.find((p: any) => !p.isTrashed) ||
        parsed.portfolios[0];
      setActiveProject(target || null);
      if (parsed.language) setLang(parsed.language);
      if (parsed.currency) setCurrency(parsed.currency);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.userProfile) setUserProfile({ ...DEFAULT_USER_PROFILE, ...parsed.userProfile });
    } else if (parsed && parsed.garData) {
      const single = { ...parsed, id: parsed.id || `port-${Date.now()}` };
      setPortfolios([single]);
      setActiveProject(single);
    }
    if (fileName) setLastFileName(fileName);
    if (handle) {
      fileHandleRef.current = handle;
      saveToIndexedDB('fileHandle', handle);
    }
    showToast(
      lang === 'fr'
        ? `Fichier JSON importé et synchronisé (${fileName || 'FAAB_GAR.json'})`
        : `JSON file imported & synced (${fileName || 'FAAB_GAR.json'})`
    );
  };

  const handleImportJson = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
          multiple: false,
        });
        const file = await handle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        applyImportedPayload(parsed, file.name, handle);
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      applyImportedPayload(parsed, file.name);
    } catch {
      showToast(lang === 'fr' ? 'Erreur : Fichier JSON invalide' : 'Error: Invalid JSON file');
    }
    e.target.value = '';
  };

  // Save / Overwrite JSON directly via FileSystemFileHandle / showSaveFilePicker + IndexedDB sync
  const handleSaveOverwriteJson = async () => {
    const payloadStr = JSON.stringify(buildFullExportPayload(), null, 2);
    await saveToIndexedDB('portfolios', portfolios);
    await saveToIndexedDB('userProfile', userProfile);
    const targetFileName = lastFileName?.endsWith('.json') ? lastFileName : `${lastFileName || 'FAAB_GAR_Portefeuilles'}.json`;

    try {
      let handle = fileHandleRef.current;
      if (handle) {
        const opts = { mode: 'readwrite' };
        if (
          (await handle.queryPermission?.(opts)) === 'granted' ||
          (await handle.requestPermission?.(opts)) === 'granted'
        ) {
          const writable = await handle.createWritable();
          await writable.write(payloadStr);
          await writable.close();
          showToast(
            lang === 'fr'
              ? `Fichier "${handle.name || targetFileName}" écrasé et synchronisé avec IndexedDB`
              : `File "${handle.name || targetFileName}" overwritten & synced with IndexedDB`
          );
          return;
        }
      }

      if ('showSaveFilePicker' in window) {
        handle = await (window as any).showSaveFilePicker({
          suggestedName: targetFileName,
          types: [{ description: 'Fichier FAAB GAR JSON', accept: { 'application/json': ['.json'] } }],
        });
        fileHandleRef.current = handle;
        await saveToIndexedDB('fileHandle', handle);
        if (handle.name) setLastFileName(handle.name);
        const writable = await handle.createWritable();
        await writable.write(payloadStr);
        await writable.close();
        showToast(
          lang === 'fr'
            ? `Fichier "${handle.name || targetFileName}" enregistré et synchronisé`
            : `File "${handle.name || targetFileName}" saved & synced`
        );
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }

    const blob = new Blob([payloadStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = targetFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(
      lang === 'fr'
        ? `Version mise à jour enregistrée (${targetFileName}) + IndexedDB synchronisée`
        : `Updated version saved (${targetFileName}) + IndexedDB synced`
    );
  };

  const handleExportJsonCopy = () => {
    const payloadStr = JSON.stringify(buildFullExportPayload(), null, 2);
    const safeProject = (activeProject?.name || 'FAAB_GAR').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeProject}_copie_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([payloadStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(lang === 'fr' ? `Copie JSON exportée (${fileName})` : `JSON copy exported (${fileName})`);
  };

  const handleDownloadPdf = () => {
    const targetProj = activeProject || portfolios.find(p => !p.isTrashed) || portfolios[0];
    if (!targetProj) return;
    generateDirectGARPdf(targetProj, currency, lang, userProfile);
    showToast(
      lang === 'fr'
        ? `Rapport PDF généré et téléchargé en ${currency} (Fond 100% Blanc)`
        : `PDF Report generated & downloaded in ${currency} (100% White Background)`
    );
  };

  const handleTrashPortfolio = (e: any, id: string) => {
    e.stopPropagation();
    openConfirmModal("Mettre à la corbeille", "Voulez-vous placer ce portefeuille dans la corbeille ?", () => {
      setPortfolios(prev => prev.map(p => p.id === id ? { ...p, isTrashed: true } : p));
      if (activeProject?.id === id) setActiveProject(null);
    });
  };

  const handleDeletePortfolio = (e: any, id: string) => {
    e.stopPropagation();
    openConfirmModal("Suppression définitive", "Êtes-vous sûr de vouloir supprimer DÉFINITIVEMENT ce portefeuille ? Cette action est irréversible.", () => {
      setPortfolios(prev => prev.filter(p => p.id !== id));
    });
  };

  const handleAddAxe = () => {
    updateProject(p => {
      const idx = p.garData.rendement.axes.length + 1;
      p.garData.rendement.axes.push({ nom: `Service ${idx}`, effet: "", budget: "0 FCFA", projets: [] });
      p.garData.problems.branches.push({ axeName: `Service ${idx}`, central: "", details: [] });
    });
  };

  const handleAddProject = (axeIndex: number) => {
    updateProject(p => {
      const pIdx = p.garData.rendement.axes[axeIndex].projets.length + 1;
      p.garData.rendement.axes[axeIndex].projets.push({ extrant: `Nouveau Projet ${pIdx}`, activites: [""], intrants_rh: [[]], intrants_mat: [[]], couts: [""], cout: "", responsable: "", periode: "" });
      p.garData.problems.branches[axeIndex].details.push({ contrainte: "", cause: [""], besoin: [""] });
    });
  };

  const handleDeleteAxe = (axeIndex: number, axeName: string) => {
    openConfirmModal("Supprimer l'Axe", `Supprimer l'axe "${axeName}" et tous ses projets ?`, () => {
      updateProject(p => {
        p.garData.rendement.axes.splice(axeIndex, 1);
        p.garData.problems.branches.splice(axeIndex, 1);
      });
    });
  };

  const handleDeleteProject = (axeIndex: number, projetIndex: number, projetName: string) => {
    openConfirmModal("Supprimer le Projet", `Supprimer le projet "${projetName}" ?`, () => {
      updateProject(p => {
         p.garData.rendement.axes[axeIndex].projets.splice(projetIndex, 1);
         p.garData.problems.branches[axeIndex].details.splice(projetIndex, 1);
      });
    });
  };

  const handleAddCauseActivity = (axeIdx: number, projIdx: number) => {
    updateProject(p => {
      const detail = p.garData.problems.branches[axeIdx].details[projIdx];
      const proj = p.garData.rendement.axes[axeIdx].projets[projIdx];
      
      ensureArray(detail.cause).push('');
      ensureArray(detail.besoin).push('');
      ensureArray(proj.activites).push('');
      
      if(!Array.isArray(proj.intrants_rh) || (proj.intrants_rh.length > 0 && !Array.isArray(proj.intrants_rh[0]))) proj.intrants_rh = [proj.intrants_rh || []];
      proj.intrants_rh.push([]);
      
      if(!Array.isArray(proj.intrants_mat) || (proj.intrants_mat.length > 0 && !Array.isArray(proj.intrants_mat[0]))) proj.intrants_mat = [proj.intrants_mat || []];
      proj.intrants_mat.push([]);
      
      if(!Array.isArray(proj.couts)) proj.couts = [proj.cout || ''];
      proj.couts.push('');
    });
  };

  const handleRemoveCauseActivity = (axeIdx: number, projIdx: number, itemIdx: number) => {
    updateProject(p => {
      const detail = p.garData.problems.branches[axeIdx].details[projIdx];
      const proj = p.garData.rendement.axes[axeIdx].projets[projIdx];

      const causes = ensureArray(detail.cause);
      const besoins = ensureArray(detail.besoin);
      const acts = ensureArray(proj.activites);
      let rh = Array.isArray(proj.intrants_rh) ? (Array.isArray(proj.intrants_rh[0]) ? proj.intrants_rh : [proj.intrants_rh]) : [];
      let mat = Array.isArray(proj.intrants_mat) ? (Array.isArray(proj.intrants_mat[0]) ? proj.intrants_mat : [proj.intrants_mat]) : [];
      let couts = Array.isArray(proj.couts) ? proj.couts : [proj.cout || ''];

      const removeAt = (arr: any[]) => { if(arr.length > 1) arr.splice(itemIdx, 1); else arr[0] = (Array.isArray(arr[0]) ? [] : ''); };
      
      removeAt(causes); removeAt(besoins); removeAt(acts); removeAt(rh); removeAt(mat); removeAt(couts);

      detail.cause = causes; detail.besoin = besoins;
      proj.activites = acts; proj.intrants_rh = rh; proj.intrants_mat = mat; proj.couts = couts;
    });
  };

  const updateIntrants = (axeIdx: number, projIdx: number, actIdx: number, field: string, val: any) => {
    updateProject(p => {
       const proj = p.garData.rendement.axes[axeIdx].projets[projIdx];
       let arr = proj[field];
       if (!Array.isArray(arr)) arr = [];
       if (arr.length > 0 && !Array.isArray(arr[0])) arr = [arr];
       while(arr.length <= actIdx) arr.push([]);
       arr[actIdx] = val;
       proj[field] = arr;
    });
  };

  const updateCmr = (axeIdx: number, niveau: string, field: string, value: any) => {
    updateProject(p => {
      let row = p.garData.cmr.find((c: any) => c.axe === axeIdx && c.niveau === niveau);
      if (!row) { row = { niveau, resultat: "", indicateur: "", ref: "0", cible: "0", real: "0", freq: "Annuelle", source: "Rapport de ", responsable: "", axe: axeIdx }; p.garData.cmr.push(row); }
      row[field] = value;
    });
  };

  const updateRisk = (axeIdx: number, niveau: string, field: string, value: any) => {
    updateProject(p => {
      let row = p.garData.risks.find((c: any) => c.axe === axeIdx && c.niveau === niveau);
      if (!row) { row = { id: Date.now().toString(), niveau, logique: "", hypothese: "", contrainte: "", cause: "", level: "MOYEN", responsable: "", mitigation: "", axe: axeIdx }; p.garData.risks.push(row); }
      row[field] = value;
    });
  };

  const addStakeholder = (key: string, axeIdx: number, pIdx: number) => {
    updateProject(p => {
      if (!p.garData.stakeholders[key]) p.garData.stakeholders[key] = [];
      p.garData.stakeholders[key].push({ nom: "", intervention: "", competence: "", attentes: "", contraintes: "", pointFort: "", pointFaible: "", problemes: "", axe: axeIdx, projetIndex: pIdx });
    });
  };

  const updateStakeholder = (key: string, _axeIdx: number, _pIdx: number, absIdx: number, field: string, value: any) => {
    updateProject(p => { if (p.garData.stakeholders[key]?.[absIdx]) p.garData.stakeholders[key][absIdx][field] = value; });
  };

  const deleteStakeholder = (key: string, absIdx: number) => {
    updateProject(p => { if(p.garData.stakeholders[key]) p.garData.stakeholders[key].splice(absIdx, 1); });
  };

  return (
    <div
      className={`flex h-screen font-sans overflow-hidden relative transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#0f172a] text-slate-100 dark' : 'bg-[#FFFFFF] text-slate-900'
      }`}
    >
      {/* HIDDEN FILE INPUT FOR JSON IMPORT FALLBACK */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* EXCLUSIVE SLIDE-OUT BURGER MENU (☰) */}
      <BurgerDrawer
        isOpen={isBurgerOpen}
        onClose={() => setIsBurgerOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleTabClick}
        menuItems={menuItems}
        onImportJson={handleImportJson}
        onSaveOverwriteJson={handleSaveOverwriteJson}
        onExportJsonCopy={handleExportJsonCopy}
        onDownloadPdf={handleDownloadPdf}
        portfolios={portfolios}
        activeProject={activeProject}
        onSelectPortfolio={(port) => {
          setActiveProject({ ...port });
          setFilterContext({ type: 'all', focusedBranches: [], focusedAxes: [] });
        }}
        onCreateNewPortfolio={createNewSandbox}
        currency={currency}
        onChangeCurrency={setCurrency}
        lang={lang}
        onChangeLang={setLang}
        theme={theme}
        onChangeTheme={setTheme}
        lastFileName={lastFileName}
      />

      {/* REAL-TIME TOAST NOTIFICATION */}
      {statusBanner && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-red-900 text-white border border-red-500 px-3.5 py-2 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle size={15} className="text-red-300 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

      {/* ZONE CENTRALE PLEINE LARGEUR */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        {/* SI ACCUEIL : LANDING PAGE INSTITUTIONNELLE AVEC SON HEADER COLLANT & EFFET SKROLL */}
        {activeTab === 'accueil' ? (
          <LandingPage
            onOpenBurger={() => setIsBurgerOpen(true)}
            lang={lang}
            theme={theme}
            currency={currency}
            activeProject={activeProject}
            lastSavedStatus={statusBanner}
          />
        ) : (
          <>
            {/* HEADER COMPACT POUR LES MODULES OPÉRATIONNELS AVEC LOGO AGRANDI */}
            <header
              className={`min-h-[72px] py-1.5 border-b px-3 sm:px-5 flex items-center justify-between gap-2 z-20 shrink-0 transition-colors ${
                theme === 'dark'
                  ? 'bg-[#0f172a] border-slate-800 text-white'
                  : 'bg-[#FFFFFF] border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setIsBurgerOpen(true)}
                  aria-label="Menu"
                  className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-700'
                      : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <Menu size={20} />
                </button>

                <img
                  src={LOGO_SRC}
                  alt="FAAB GAR"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded shrink-0"
                />

                <h1 className="text-xs sm:text-sm md:text-base font-black truncate">
                  {menuItems.find((m) => m.id === activeTab)?.label}
                </h1>

                {activeProject && activeTab !== 'dossier' && activeTab !== 'profil' && (
                  <div className="hidden md:flex items-center bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-md px-2 py-0.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse mr-1.5" />
                    <span className="text-[10px] font-bold text-red-900 dark:text-red-200 uppercase truncate max-w-[200px]">
                      {activeProject.displayName || activeProject.name} ({currency})
                    </span>
                    {filterContext.type !== 'all' && (
                      <button
                        onClick={() => {
                          setFilterContext({ type: 'all', focusedBranches: [], focusedAxes: [] });
                          setActiveProject({
                            ...activeProject,
                            entityLevel: 'Portefeuille',
                            displayName: activeProject.name,
                          });
                        }}
                        className="ml-2 text-[9px] bg-white dark:bg-slate-800 border border-red-300 px-1.5 py-0.5 rounded text-red-700 dark:text-red-300 cursor-pointer"
                      >
                        {lang === 'fr' ? 'Voir tout' : 'Show all'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Controls: Tree vs List View Toggle + Zoom Controls on Arbre / Solutions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {(activeTab === 'arbre' || activeTab === 'solutions') && (
                  <>
                    <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-[10px] font-bold">
                      <button
                        onClick={() => setTreeViewMode('tree')}
                        className={`px-2 py-1 flex items-center gap-1 cursor-pointer ${
                          treeViewMode === 'tree'
                            ? 'bg-red-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <Network size={12} />
                        <span className="hidden sm:inline">{t.viewTree}</span>
                      </button>
                      <button
                        onClick={() => setTreeViewMode('list')}
                        className={`px-2 py-1 flex items-center gap-1 cursor-pointer ${
                          treeViewMode === 'list'
                            ? 'bg-red-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <ListFilter size={12} />
                        <span className="hidden sm:inline">{t.viewList}</span>
                      </button>
                    </div>

                    {treeViewMode === 'tree' && (
                      <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-1 py-0.5 text-slate-800 dark:text-slate-200">
                        <button
                          onClick={() => setTreeZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))}
                          className="p-1 hover:text-red-600 cursor-pointer"
                          title={t.zoomOut}
                        >
                          <ZoomOut size={12} />
                        </button>
                        <span className="text-[9px] font-mono font-bold px-0.5">
                          {Math.round(treeZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setTreeZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))}
                          className="p-1 hover:text-red-600 cursor-pointer"
                          title={t.zoomIn}
                        >
                          <ZoomIn size={12} />
                        </button>
                        <button
                          onClick={() =>
                            setTreeZoom(
                              typeof window !== 'undefined' && window.innerWidth < 1024 ? 0.72 : 0.85
                            )
                          }
                          className="p-1 hover:text-red-600 cursor-pointer"
                          title={t.zoomReset}
                        >
                          <RotateCcw size={11} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </header>

            {menuItems.find((m) => m.id === activeTab)?.subs && activeProject && (
              <div
                className={`border-b px-2.5 sm:px-4 flex gap-1 pt-1.5 pb-0 overflow-x-auto whitespace-nowrap shrink-0 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                {menuItems
                  .find((m) => m.id === activeTab)!
                  .subs!.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setActiveSubTab(sub)}
                      className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-t-lg transition-colors cursor-pointer ${
                        activeSubTab === sub
                          ? theme === 'dark'
                            ? 'bg-[#0f172a] text-red-400 border-t border-x border-slate-700'
                            : 'bg-white text-red-700 border-t border-x border-slate-200 border-b-2 border-b-white translate-y-[1px]'
                          : 'text-slate-600 hover:text-red-700 dark:text-slate-300'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
              </div>
            )}

            <main
              className={`flex-1 flex flex-col overflow-y-auto px-2 sm:px-3 pb-4 pt-2.5 relative transition-colors ${
                theme === 'dark' ? 'bg-[#0f172a]' : 'bg-[#FFFFFF]'
              }`}
            >
              {/* ONGLET PROFIL UTILISATEUR (Nom & Prénoms, Email, Contact, Institution, Fonction) */}
              {activeTab === 'profil' && (
                <div className="flex-1 w-full max-w-2xl mx-auto py-2 sm:py-4">
                  <Card className="border-t-4 border-t-red-600 space-y-4">
                    <div className="flex items-start gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-400 shrink-0">
                        <UserCheck size={24} />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {t.profileTitle}
                        </h2>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                          {t.profileSubtitle}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <UserCheck size={12} className="text-red-600" /> {t.profileFullName}
                        </label>
                        <input
                          type="text"
                          value={userProfile.nomPrenoms}
                          onChange={(e) =>
                            setUserProfile((prev) => ({ ...prev, nomPrenoms: e.target.value }))
                          }
                          placeholder={t.profileFullNamePlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:border-red-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <Mail size={12} className="text-red-600" /> {t.profileEmail}
                        </label>
                        <input
                          type="email"
                          value={userProfile.email}
                          onChange={(e) =>
                            setUserProfile((prev) => ({ ...prev, email: e.target.value }))
                          }
                          placeholder={t.profileEmailPlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-red-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <Phone size={12} className="text-red-600" /> {t.profileContact}
                        </label>
                        <input
                          type="text"
                          value={userProfile.contact}
                          onChange={(e) =>
                            setUserProfile((prev) => ({ ...prev, contact: e.target.value }))
                          }
                          placeholder={t.profileContactPlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-red-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <Building2 size={12} className="text-red-600" /> {t.profileInstitution}
                        </label>
                        <input
                          type="text"
                          value={userProfile.institution}
                          onChange={(e) =>
                            setUserProfile((prev) => ({ ...prev, institution: e.target.value }))
                          }
                          placeholder={t.profileInstitutionPlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-red-500 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <Briefcase size={12} className="text-red-600" /> {t.profileRole}
                        </label>
                        <input
                          type="text"
                          value={userProfile.fonction}
                          onChange={(e) =>
                            setUserProfile((prev) => ({ ...prev, fonction: e.target.value }))
                          }
                          placeholder={t.profileRolePlaceholder}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:border-red-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                        <CheckCircle size={13} /> {t.profileSavedBadge}
                      </span>
                      <Button
                        onClick={() => setActiveTab('dossier')}
                        className="bg-red-600 hover:bg-red-700 text-white text-[11px]"
                      >
                        {lang === 'fr' ? 'Aller aux Dossiers & Projets' : 'Go to Portfolios & Projects'}
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* DOSSIERS & PROJETS (SANS CHAMPS PERSONNELS — UNIQUEMENT INTITULÉ & DESCRIPTION DU DOSSIER) */}
              {activeTab === 'dossier' && (
                <div className="flex-1 space-y-3 w-full max-w-6xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {portfolios
                      .filter((p) => !p.isTrashed)
                      .map((port) => (
                        <Card
                          key={port.id}
                          className="!p-3.5 transition-all hover:shadow-md border-l-4 border-l-red-600"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
                              <Briefcase size={18} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              {port.isEditable && (
                                <span className="bg-red-100 text-red-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                  Éditable
                                </span>
                              )}
                              <button
                                onClick={(e) => handleTrashPortfolio(e, port.id)}
                                className="p-1 text-slate-400 hover:bg-red-100 hover:text-red-600 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          {port.isEditable ? (
                            <div className="mb-2.5 space-y-1.5">
                              <input
                                type="text"
                                value={port.name || ''}
                                onChange={(e) =>
                                  setPortfolios((prev) =>
                                    prev.map((p) =>
                                      p.id === port.id ? { ...p, name: e.target.value } : p
                                    )
                                  )
                                }
                                className="w-full font-black text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent border-b-2 border-dashed border-red-300 focus:border-solid outline-none pb-0.5"
                                placeholder="Nom du Portefeuille / Projet..."
                              />
                              <textarea
                                value={port.description || ''}
                                onChange={(e) =>
                                  setPortfolios((prev) =>
                                    prev.map((p) =>
                                      p.id === port.id ? { ...p, description: e.target.value } : p
                                    )
                                  )
                                }
                                className="w-full text-[11px] text-slate-700 dark:text-slate-200 bg-transparent border-b border-dashed border-red-200 focus:border-solid outline-none h-12 resize-none custom-scrollbar"
                                placeholder="Description du dossier..."
                              />
                            </div>
                          ) : (
                            <>
                              <h3 className="font-black text-xs sm:text-sm mb-1 text-slate-900 dark:text-white">
                                {port.name}
                              </h3>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2.5 h-10 overflow-hidden">
                                {port.description}
                              </p>
                            </>
                          )}
                          <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                            <Button
                              className="flex-1 text-[11px] px-2 py-1 text-white bg-red-600 hover:bg-red-700 cursor-pointer"
                              icon={Settings}
                              onClick={() => handleEnterGAR(port)}
                            >
                              {lang === 'fr' ? 'Ouvrir GAR' : 'Open RBM'}
                            </Button>
                          </div>
                        </Card>
                      ))}

                    <Card
                      onClick={createNewSandbox}
                      className="!p-4 border-dashed border-2 border-slate-300 dark:border-slate-700 hover:border-red-500 cursor-pointer flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 hover:text-red-600 min-h-[160px] bg-slate-50/60 dark:bg-slate-900/50"
                    >
                      <Plus size={28} className="mb-1.5 text-red-600" />
                      <h3 className="font-black text-xs sm:text-sm text-center">{t.createNewProject}</h3>
                    </Card>
                  </div>
                </div>
              )}

              {/* ARBRE À PROBLÈMES */}
              {activeTab === 'arbre' &&
                (!activeProject ? (
                  <NoProjectScreen setActiveTab={setActiveTab} />
                ) : treeViewMode === 'list' ? (
                  <MobileProblemList
                    activeProject={activeProject}
                    updateProject={updateProject}
                    handleAddAxe={handleAddAxe}
                    handleDeleteAxe={handleDeleteAxe}
                    handleAddProject={handleAddProject}
                    handleDeleteProject={handleDeleteProject}
                    handleAddCauseActivity={handleAddCauseActivity}
                    handleRemoveCauseActivity={handleRemoveCauseActivity}
                    ensureArray={ensureArray}
                    lang={lang}
                  />
                ) : (
                  <div className="flex-1 flex flex-col w-full max-w-full 2xl:max-w-[1600px] mx-auto space-y-2">
                    <div className="bg-slate-200/50 dark:bg-slate-900/70 rounded-xl shadow-inner border border-slate-300 dark:border-slate-800 overflow-auto flex-1 max-h-[82vh] relative p-2 sm:p-4 custom-scrollbar">
                      <div
                        className="min-w-max flex justify-center pb-8 transition-transform duration-150"
                        style={{ transform: `scale(${treeZoom})`, transformOrigin: 'top center' }}
                      >
                        <div className="flex flex-col items-center">
                          {/* RACINE */}
                          <div className="bg-red-900 text-white p-2.5 sm:p-3 rounded-lg shadow-md border-2 border-red-700 w-[280px] sm:w-[320px] max-w-[85vw] text-center z-10 relative">
                            <h4 className="text-[9px] uppercase font-black mb-1 text-red-200 tracking-wider">
                              Conséquence Globale (Impact Négatif)
                            </h4>
                            {activeProject.isEditable ? (
                              <textarea
                                className="w-full bg-red-950/60 text-white text-[11px] font-bold text-center border border-red-500 rounded p-1.5 focus:outline-none resize-none custom-scrollbar"
                                value={activeProject.garData?.problems?.consequenceGlobale || ''}
                                onChange={(e) =>
                                  updateProject(
                                    (p) => (p.garData.problems.consequenceGlobale = e.target.value)
                                  )
                                }
                                rows={2}
                              />
                            ) : (
                              <p className="font-bold text-[11px]">
                                {activeProject.garData?.problems?.consequenceGlobale}
                              </p>
                            )}
                          </div>

                          {/* CONNECTEUR AJOUT AXE */}
                          <div className="flex flex-col items-center">
                            <div className="w-0.5 h-3 bg-slate-400"></div>
                            {activeProject.isEditable && (
                              <button
                                onClick={handleAddAxe}
                                className="bg-red-700 text-white rounded-full p-1 hover:bg-red-800 shadow-sm cursor-pointer z-20 relative"
                              >
                                <Plus size={13} />
                              </button>
                            )}
                            {(activeProject.garData?.problems?.branches || []).length > 0 && (
                              <div className="w-0.5 h-3 bg-slate-400"></div>
                            )}
                          </div>

                          {/* AXES */}
                          <div className="flex justify-center relative">
                            {(activeProject.garData?.problems?.branches || []).map(
                              (branch: any, i: number) => {
                                const branches = activeProject.garData.problems.branches || [];
                                const isOnlyAxe = branches.length === 1;
                                return (
                                  <div key={i} className="flex flex-col items-center relative px-1.5 sm:px-2">
                                    {isOnlyAxe ? (
                                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div>
                                    ) : (
                                      <>
                                        {i !== 0 && (
                                          <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-400"></div>
                                        )}
                                        {i !== branches.length - 1 && (
                                          <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-400"></div>
                                        )}
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div>
                                      </>
                                    )}
                                    <div className="bg-red-100 text-red-950 p-2 sm:p-2.5 rounded-lg shadow-sm border border-red-300 w-[240px] sm:w-[280px] max-w-[82vw] text-center z-10 relative mt-5">
                                      <div className="flex justify-between items-center mb-1 gap-1">
                                        <div className="flex-1 flex items-center text-[8px] uppercase font-black text-red-700">
                                          {activeProject.isEditable ? (
                                            <input
                                              type="text"
                                              className="bg-white/70 border border-red-200 text-red-900 px-1 py-0.5 rounded outline-none focus:border-red-400 w-24 font-black uppercase text-[8px] mr-1 shadow-inner"
                                              value={
                                                branch.axeName?.includes('Service')
                                                  ? branch.axeName
                                                  : `Service ${i + 1}`
                                              }
                                              onChange={(e) => {
                                                let val = e.target.value;
                                                if (!val.startsWith('Service ')) val = 'Service ';
                                                updateProject((p) => {
                                                  p.garData.problems.branches[i].axeName = val;
                                                  if (p.garData.rendement.axes[i])
                                                    p.garData.rendement.axes[i].nom = val;
                                                });
                                              }}
                                            />
                                          ) : (
                                            <span className="mr-1">
                                              {branch.axeName || `Service ${i + 1}`}
                                            </span>
                                          )}
                                          <span>: PROBLÈME CENTRAL</span>
                                        </div>
                                        {activeProject.isEditable && (
                                          <button
                                            onClick={() => handleDeleteAxe(i, branch.axeName)}
                                            className="text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        )}
                                      </div>
                                      {activeProject.isEditable ? (
                                        <textarea
                                          className="w-full bg-white/80 text-red-950 text-[10px] sm:text-[11px] font-bold text-center border border-red-200 rounded p-1.5 outline-none resize-none custom-scrollbar"
                                          value={branch.central || ''}
                                          onChange={(e) =>
                                            updateProject(
                                              (p) =>
                                                (p.garData.problems.branches[i].central =
                                                  e.target.value)
                                            )
                                          }
                                          rows={2}
                                        />
                                      ) : (
                                        <p className="font-bold text-[11px]">{branch.central}</p>
                                      )}
                                    </div>

                                    {/* CONNECTEUR AJOUT PROJET */}
                                    <div className="flex flex-col items-center">
                                      <div className="w-0.5 h-3 bg-slate-300"></div>
                                      {activeProject.isEditable && (
                                        <button
                                          onClick={() => handleAddProject(i)}
                                          className="bg-slate-700 text-white rounded-full p-1 hover:bg-slate-800 shadow-sm cursor-pointer z-20 relative"
                                        >
                                          <Plus size={12} />
                                        </button>
                                      )}
                                      {(branch.details || []).length > 0 && (
                                        <div className="w-0.5 h-3 bg-slate-300"></div>
                                      )}
                                    </div>

                                    {/* SOUS-PROBLÈMES */}
                                    <div className="flex justify-center relative">
                                      {(branch.details || []).map((detail: any, j: number) => {
                                        const details = branch.details || [];
                                        const isOnlyDetail = details.length === 1;
                                        const isFocused =
                                          filterContext.type === 'projet' &&
                                          (filterContext.focusedBranches || []).some(
                                            (f: any) => f.axeIndex === i && f.projetIndex === j
                                          );

                                        const causesArr = ensureArray(detail.cause);
                                        const besoinsArr = ensureArray(detail.besoin);
                                        const actArr = ensureArray(
                                          activeProject.garData.rendement.axes[i]?.projets?.[j]
                                            ?.activites
                                        );
                                        const maxLen = Math.max(
                                          causesArr.length,
                                          actArr.length,
                                          besoinsArr.length,
                                          1
                                        );
                                        const causes = Array.from(
                                          { length: maxLen },
                                          (_, idx) => causesArr[idx] || ''
                                        );
                                        const besoins = Array.from(
                                          { length: maxLen },
                                          (_, idx) => besoinsArr[idx] || ''
                                        );

                                        return (
                                          <div
                                            key={j}
                                            className="flex flex-col items-center relative px-1"
                                          >
                                            {isOnlyDetail ? (
                                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div>
                                            ) : (
                                              <>
                                                {j !== 0 && (
                                                  <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                )}
                                                {j !== details.length - 1 && (
                                                  <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                )}
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div>
                                              </>
                                            )}
                                            <div
                                              className={`bg-white p-2 rounded-lg shadow-sm border ${
                                                isFocused
                                                  ? 'border-red-600 ring-2 ring-red-200'
                                                  : 'border-slate-300'
                                              } w-auto inline-flex flex-col items-center z-10 relative gap-0 mt-5 transition-all`}
                                            >
                                              {activeProject.isEditable && (
                                                <div className="absolute -top-2 -right-2 z-20">
                                                  <button
                                                    onClick={() => handleDeleteProject(i, j, '')}
                                                    className="bg-red-50 text-red-600 rounded-full p-1 hover:bg-red-100 border border-red-200 shadow-xs cursor-pointer"
                                                  >
                                                    <Trash2 size={10} />
                                                  </button>
                                                </div>
                                              )}

                                              <div className="text-[9px] font-black uppercase text-slate-600 tracking-wider mb-1.5 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                Branche {j + 1}
                                              </div>

                                              {/* Contrainte */}
                                              <div className="bg-orange-50 p-1.5 rounded border border-orange-200 w-44 sm:w-48 text-center z-10 shadow-2xs">
                                                <h5 className="text-[8px] uppercase font-black text-orange-700 mb-0.5">
                                                  Contrainte {j + 1}
                                                </h5>
                                                {activeProject.isEditable ? (
                                                  <textarea
                                                    className="w-full bg-white/80 text-orange-950 text-[10px] font-bold text-center border border-orange-200 rounded p-1 outline-none resize-none custom-scrollbar"
                                                    value={detail.contrainte}
                                                    onChange={(e) =>
                                                      updateProject(
                                                        (p) =>
                                                          (p.garData.problems.branches[i].details[
                                                            j
                                                          ].contrainte = e.target.value)
                                                      )
                                                    }
                                                    rows={2}
                                                  />
                                                ) : (
                                                  <p className="text-[10px] font-bold text-orange-950">
                                                    {detail.contrainte}
                                                  </p>
                                                )}
                                                {activeProject.isEditable && (
                                                  <button
                                                    onClick={() => handleAddCauseActivity(i, j)}
                                                    className="mt-1 text-[8px] font-bold uppercase text-orange-700 bg-orange-100/70 hover:bg-orange-200 px-1.5 py-0.5 rounded w-full flex items-center justify-center gap-1 border border-orange-300 border-dashed cursor-pointer"
                                                  >
                                                    <Plus size={9} /> + Cause & Besoin
                                                  </button>
                                                )}
                                              </div>
                                              <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                              {/* Causes & Besoins */}
                                              <div className="flex justify-center relative w-full">
                                                {causes.map((c, k) => (
                                                  <div
                                                    key={k}
                                                    className="flex flex-col items-center relative px-1"
                                                  >
                                                    {causes.length > 1 && (
                                                      <>
                                                        {k !== 0 && (
                                                          <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                        )}
                                                        {k !== causes.length - 1 && (
                                                          <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>
                                                        )}
                                                      </>
                                                    )}
                                                    <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                                    <div className="bg-amber-50 p-1.5 rounded border border-amber-200 w-36 sm:w-40 text-center z-10 relative group shadow-2xs mb-0">
                                                      {activeProject.isEditable &&
                                                        causes.length > 1 && (
                                                          <button
                                                            onClick={() =>
                                                              handleRemoveCauseActivity(i, j, k)
                                                            }
                                                            className="absolute -top-1.5 -right-1.5 bg-red-50 text-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 border border-red-200 cursor-pointer z-20"
                                                          >
                                                            <Trash2 size={9} />
                                                          </button>
                                                        )}
                                                      <h5 className="text-[8px] uppercase font-black text-amber-800 mb-0.5">
                                                        Cause {k + 1}
                                                      </h5>
                                                      {activeProject.isEditable ? (
                                                        <textarea
                                                          className="w-full bg-white/80 text-amber-950 text-[10px] font-medium italic text-center border border-amber-200 rounded p-1 outline-none resize-none custom-scrollbar"
                                                          value={c}
                                                          onChange={(e) =>
                                                            updateProject((p) => {
                                                              const arr = ensureArray(
                                                                p.garData.problems.branches[i]
                                                                  .details[j].cause
                                                              );
                                                              arr[k] = e.target.value;
                                                              p.garData.problems.branches[i].details[
                                                                j
                                                              ].cause = arr;
                                                            })
                                                          }
                                                          placeholder={`Cause ${k + 1}...`}
                                                          rows={2}
                                                        />
                                                      ) : (
                                                        <p className="text-[10px] font-medium italic text-amber-950">
                                                          {c}
                                                        </p>
                                                      )}
                                                    </div>

                                                    <div className="w-0.5 h-3.5 bg-slate-300"></div>

                                                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200 w-36 sm:w-40 text-center z-10 relative shadow-2xs">
                                                      <h5 className="text-[8px] uppercase font-black text-slate-700 mb-0.5">
                                                        Besoin {k + 1}
                                                      </h5>
                                                      {activeProject.isEditable ? (
                                                        <textarea
                                                          className="w-full bg-white/80 text-slate-900 text-[10px] font-medium text-center border border-slate-300 rounded p-1 outline-none resize-none custom-scrollbar"
                                                          value={besoins[k] || ''}
                                                          onChange={(e) =>
                                                            updateProject((p) => {
                                                              const arr = ensureArray(
                                                                p.garData.problems.branches[i]
                                                                  .details[j].besoin
                                                              );
                                                              arr[k] = e.target.value;
                                                              p.garData.problems.branches[i].details[
                                                                j
                                                              ].besoin = arr;
                                                            })
                                                          }
                                                          placeholder="Besoin..."
                                                          rows={2}
                                                        />
                                                      ) : (
                                                        <p className="text-[10px] font-medium text-slate-900">
                                                          {besoins[k]}
                                                        </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {/* ARBRE À SOLUTIONS */}
              {activeTab === 'solutions' && (
                !activeProject ? (
                  <NoProjectScreen setActiveTab={setActiveTab} />
                ) : treeViewMode === 'list' ? (
                  <MobileSolutionList
                    activeProject={activeProject}
                    updateProject={updateProject}
                    ensureArray={ensureArray}
                    getSafe2D={getSafe2D}
                    updateIntrants={updateIntrants}
                    EditableResourceList={EditableResourceList}
                    calculateActivityTotal={calculateActivityTotal}
                    currency={currency}
                    lang={lang}
                  />
                ) : (
                  <div className="flex-1 flex flex-col w-full max-w-full 2xl:max-w-[1600px] mx-auto space-y-2">
                    <div className="bg-slate-200/50 dark:bg-slate-900/70 rounded-xl shadow-inner border border-slate-300 dark:border-slate-800 overflow-auto flex-1 max-h-[82vh] relative p-2 sm:p-4 custom-scrollbar">
                      <div
                        className="min-w-max flex justify-center pb-8 transition-transform duration-150"
                        style={{ transform: `scale(${treeZoom})`, transformOrigin: 'top center' }}
                      >
                        <div className="flex flex-col items-center">
                          {/* RACINE */}
                          <div className="bg-red-800 text-white p-2.5 sm:p-3 rounded-lg shadow-md border-2 border-red-600 w-[280px] sm:w-[320px] max-w-[85vw] text-center z-10 relative">
                            <h4 className="text-[9px] uppercase font-black mb-1 text-red-100 tracking-wider">Impact Global (Objectif Global)</h4>
                            {activeProject.isEditable ? <textarea className="w-full bg-red-950/40 text-white text-[11px] font-bold text-center border border-red-500 rounded p-1.5 outline-none resize-none custom-scrollbar" value={activeProject.garData?.rendement?.impact || ''} onChange={(e) => updateProject(p => p.garData.rendement.impact = e.target.value)} rows={2} /> : <p className="font-bold text-[11px]">{activeProject.garData?.rendement?.impact}</p>}
                          </div>

                       {/* CONNECTEUR AXE (Verrouillé) */}
                       {(activeProject.garData?.rendement?.axes || []).length > 0 && (
                         <div className="flex flex-col items-center">
                           <div className="w-0.5 h-6 bg-slate-400"></div>
                         </div>
                       )}

                       <div className="flex justify-center relative">
                         {(activeProject.garData?.rendement?.axes || []).map((axe: any, i: number) => {
                            const axes = activeProject.garData.rendement.axes || [];
                            const isOnlyAxe = axes.length === 1;
                            return (
                              <div key={i} className="flex flex-col items-center relative px-1.5 sm:px-2">
                                {isOnlyAxe ? <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div> : <>{i !== 0 && <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-400"></div>}{i !== axes.length - 1 && <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-400"></div>}<div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-400"></div></>}
                                {(() => {
                                  const isFocused = filterContext.type === 'axe' && (filterContext.focusedAxes || []).includes(i);
                                  const dependentAxes: number[] = [];
                                  axes.forEach((_: any, aIdx: number) => {
                                      if (aIdx === i) return;
                                      const targetRisk = (activeProject.garData.risks || []).find((r: any) => r.axe === aIdx + 1 && r.niveau === 'EFFET');
                                      if (targetRisk && (targetRisk.linkedAxeIndex === i || (targetRisk.hypothese && targetRisk.hypothese === axe.effet))) {
                                          dependentAxes.push(aIdx);
                                      }
                                  });

                                  return (
                                    <div className={`bg-red-50 text-red-950 p-2 sm:p-2.5 rounded-lg shadow-sm border ${isFocused ? 'border-red-600 ring-2 ring-red-200' : dependentAxes.length > 0 ? 'border-red-400 ring-1 ring-red-200' : 'border-red-300'} w-[240px] sm:w-[280px] max-w-[82vw] text-center z-10 relative mt-5 transition-all`}>
                                      <div className="flex justify-between items-center mb-1 gap-1">
                                        <div className="flex-1 flex items-center text-[8px] uppercase font-black text-red-700">
                                          <span className="mr-1">{axe.nom || `Service ${i+1}`}</span>
                                          <span>: EFFET</span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-1 w-full mb-1.5 mt-1">
                                        {isFocused && (
                                          <div className="bg-red-100 text-red-800 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-300 text-center uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs">
                                             En cours de traitement
                                          </div>
                                        )}
                                        {dependentAxes.map(depIdx => (
                                          <div key={depIdx} className="bg-red-50 text-red-800 text-[8px] font-bold px-1.5 py-0.5 rounded border border-red-200 flex justify-between items-center shadow-2xs">
                                            <span> Condition pour {axes[depIdx].nom || `Service ${depIdx + 1}`}</span>
                                            {activeProject.isEditable && (
                                              <button 
                                                onClick={() => {
                                                  updateRisk(depIdx + 1, 'EFFET', 'hypothese', '');
                                                  updateRisk(depIdx + 1, 'EFFET', 'linkedAxeIndex', null);
                                                }}
                                                className="text-red-500 hover:text-red-700 cursor-pointer p-0.5" title="Retirer cette condition"
                                              ><X size={10} /></button>
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      <div className="mb-1.5 w-full text-left">
                                        <select
                                          className={`w-full bg-white/90 border ${isFocused ? 'border-red-500 text-red-800' : dependentAxes.length > 0 ? 'border-red-400 text-red-800' : 'border-red-200 text-red-800'} text-[8px] font-bold rounded p-1 outline-none cursor-pointer hover:border-red-400 transition-all shadow-2xs`}
                                          value=""
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;
                                            if (val === 'focus_axe') {
                                              const currentFocused = filterContext.focusedAxes || [];
                                              const newFocused = [...currentFocused, i];
                                              setFilterContext({ type: 'axe', focusedAxes: newFocused });
                                              setActiveProject({...activeProject, entityLevel: 'Focus Multiple', displayName: `Traitement de ${newFocused.length} service(s)`});
                                            } else if (val === 'unfocus_axe') {
                                              const currentFocused = filterContext.focusedAxes || [];
                                              const newFocused = currentFocused.filter((f: any) => f !== i);
                                              if (newFocused.length === 0) {
                                                setFilterContext({ type: 'all', focusedBranches: [], focusedAxes: [] });
                                                setActiveProject({...activeProject, entityLevel: 'Portefeuille', displayName: activeProject.name});
                                              } else {
                                                setFilterContext({ type: 'axe', focusedAxes: newFocused });
                                                setActiveProject({...activeProject, entityLevel: 'Focus Multiple', displayName: `Traitement de ${newFocused.length} service(s)`});
                                              }
                                            } else if (val.startsWith('add_hypo_axe_')) {
                                              const targetIdx = parseInt(val.split('_')[3]);
                                              const textHypo = `${axe.effet || 'Effet non défini'}`;
                                              updateRisk(targetIdx + 1, 'EFFET', 'hypothese', textHypo);
                                              updateRisk(targetIdx + 1, 'EFFET', 'linkedAxeIndex', i);
                                            }
                                            e.target.value = "";
                                          }}
                                        >
                                          <option value=""> Actions sur cet Effet...</option>
                                          <optgroup label="1. FOCUS SUR L'ÉTUDE">
                                            {isFocused ? (
                                              <option value="unfocus_axe"> Annuler le traitement (Voir tout)</option>
                                            ) : (
                                              <option value="focus_axe"> Traiter cet Effet (Service)</option>
                                            )}
                                          </optgroup>
                                          {activeProject.isEditable && axes.length > 1 && (
                                            <optgroup label="2. DÉFINIR COMME HYPOTHÈSE POUR :">
                                              {axes.map((a: any, aIdx: number) => {
                                                if (aIdx === i) return null;
                                                const targetRisk = (activeProject.garData.risks || []).find((r: any) => r.axe === aIdx + 1 && r.niveau === 'EFFET');
                                                const isAlreadyConditioned = (targetRisk?.linkedAxeIndex !== undefined && targetRisk?.linkedAxeIndex !== null) || (targetRisk?.hypothese && targetRisk.hypothese.length > 0);
                                                if (!dependentAxes.includes(aIdx) && !isAlreadyConditioned) {
                                                  return <option key={aIdx} value={`add_hypo_axe_${aIdx}`}> {a.nom || `Service ${aIdx + 1}`}</option>;
                                                }
                                                return null;
                                              })}
                                            </optgroup>
                                          )}
                                        </select>
                                      </div>

                                      {activeProject.isEditable ? <textarea className="w-full bg-white/80 text-red-950 text-[10px] sm:text-[11px] font-bold text-center border border-red-200 rounded p-1.5 outline-none resize-none custom-scrollbar" value={axe.effet || ''} onChange={(e) => updateProject(p => p.garData.rendement.axes[i].effet = e.target.value)} rows={2} /> : <p className="font-bold text-[11px]">{axe.effet}</p>}
                                    </div>
                                  );
                                })()}

                                {/* CONNECTEUR PROJET (Verrouillé) */}
                                {(axe.projets || []).length > 0 && (
                                  <div className="flex flex-col items-center">
                                    <div className="w-0.5 h-6 bg-slate-300"></div>
                                  </div>
                                )}

                                <div className="flex justify-center relative">
                                  {(axe.projets || []).map((proj: any, j: number) => {
                                     const projs = axe.projets || [];
                                     const isOnlyProj = projs.length === 1;
                                     const isFocused = filterContext.type === 'projet' && (filterContext.focusedBranches || []).some((f: any) => f.axeIndex === i && f.projetIndex === j);
                                     
                                     // LOGIQUE : Trouver toutes les branches qui dépendent de celle-ci
                                     const dependentBranches: number[] = [];
                                     projs.forEach((_: any, pIndex: number) => {
                                         if (pIndex === j) return;
                                         const targetRisk = (activeProject.garData.risks || []).find((r: any) => r.axe === i + 1 && r.niveau === `EXTRANT ${pIndex + 1}`);
                                         if (targetRisk && (targetRisk.linkedBranchIndex === j || (targetRisk.hypothese && (targetRisk.hypothese.includes(`Hypothèse de la Branche ${j+1}`) || targetRisk.hypothese.includes(`Réalisation préalable de la Branche ${j+1}`))))) {
                                             dependentBranches.push(pIndex);
                                         }
                                     });
                                     
                                     const activites = Array.from({ length: Math.max(ensureArray(activeProject.garData.problems?.branches?.[i]?.details?.[j]?.cause).length, ensureArray(proj.activites).length, 1) }, (_, idx) => ensureArray(proj.activites)[idx] || '');

                                     return (
                                       <div key={j} className="flex flex-col items-center relative px-1">
                                          {isOnlyProj ? <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div> : <>{j !== 0 && <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>}{j !== projs.length - 1 && <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>}<div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 bg-slate-300"></div></>}
                                          <div className={`bg-white p-2 rounded-lg shadow-sm border ${isFocused ? 'border-red-600 ring-2 ring-red-200' : dependentBranches.length > 0 ? 'border-red-400 ring-1 ring-red-100' : 'border-slate-300'} w-auto inline-flex flex-col items-center z-10 relative gap-0 mt-5 transition-all`}>
                                            
                                            <div className="text-[9px] font-black uppercase text-slate-600 tracking-wider mb-1.5 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">Branche {j+1}</div>

                                            {/* AFFICHAGE DES ÉTATS (FOCUS / HYPOTHÈSES) */}
                                            <div className="flex flex-col gap-1 w-44 sm:w-48 mb-1.5">
                                              {isFocused && (
                                                <div className="bg-red-100 text-red-800 text-[8px] font-black px-1.5 py-0.5 rounded border border-red-300 text-center uppercase tracking-wider flex items-center justify-center gap-1 shadow-2xs">
                                                   En cours de traitement
                                                </div>
                                              )}
                                              {dependentBranches.map(depIdx => (
                                                <div key={depIdx} className="bg-red-50 text-red-800 text-[8px] font-bold px-1.5 py-0.5 rounded border border-red-200 flex justify-between items-center shadow-2xs">
                                                  <span> Condition pour Branche {depIdx + 1}</span>
                                                  {activeProject.isEditable && (
                                                    <button 
                                                      onClick={() => {
                                                        const targetNiveau = `EXTRANT ${depIdx + 1}`;
                                                        updateRisk(i + 1, targetNiveau, 'hypothese', '');
                                                        updateRisk(i + 1, targetNiveau, 'linkedBranchIndex', null);
                                                      }}
                                                      className="text-red-500 hover:text-red-700 cursor-pointer p-0.5" title="Retirer cette condition"
                                                    ><X size={10} /></button>
                                                  )}
                                                </div>
                                              ))}
                                            </div>

                                            {/* MENU D'ACTIONS INTELLIGENT */}
                                            <div className="mb-2 w-44 sm:w-48">
                                              <select
                                                className={`w-full bg-slate-50 border ${isFocused ? 'border-red-500 text-red-800' : dependentBranches.length > 0 ? 'border-red-400 text-red-800' : 'border-slate-300 text-slate-800'} text-[8px] font-bold rounded p-1 outline-none cursor-pointer hover:border-red-400 transition-all shadow-2xs`}
                                                value=""
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  if (!val) return;
                                                  
                                                  if (val === 'focus') {
                                                    const currentFocused = filterContext.focusedBranches || [];
                                                    const newFocused = [...currentFocused, { axeIndex: i, projetIndex: j }];
                                                    setFilterContext({ type: 'projet', focusedBranches: newFocused });
                                                    setActiveProject({...activeProject, entityLevel: 'Focus Multiple', displayName: `Traitement de ${newFocused.length} branche(s)`});
                                                  } else if (val === 'unfocus') {
                                                    const currentFocused = filterContext.focusedBranches || [];
                                                    const newFocused = currentFocused.filter((f: any) => !(f.axeIndex === i && f.projetIndex === j));
                                                    if (newFocused.length === 0) {
                                                      setFilterContext({ type: 'all', focusedBranches: [] });
                                                      setActiveProject({...activeProject, entityLevel: 'Portefeuille', displayName: activeProject.name});
                                                    } else {
                                                      setFilterContext({ type: 'projet', focusedBranches: newFocused });
                                                      setActiveProject({...activeProject, entityLevel: 'Focus Multiple', displayName: `Traitement de ${newFocused.length} branche(s)`});
                                                    }
                                                  } else if (val.startsWith('add_hypo_')) {
                                                    const targetIdx = parseInt(val.split('_')[2]);
                                                    const targetNiveau = `EXTRANT ${targetIdx + 1}`;
                                                    const textHypo = `${proj.extrant || 'Extrant non défini'}`;
                                                    
                                                    // RÈGLE MÉTIER : On remplace complètement (1 branche max) au lieu d'ajouter à la suite
                                                    updateRisk(i + 1, targetNiveau, 'hypothese', textHypo);
                                                    updateRisk(i + 1, targetNiveau, 'linkedBranchIndex', j);
                                                  }
                                                  e.target.value = ""; 
                                                }}
                                              >
                                                <option value=""> Actions sur la Branche {j+1}...</option>
                                                <optgroup label="1. FOCUS SUR L'ÉTUDE">
                                                  {isFocused ? (
                                                    <option value="unfocus"> Annuler le traitement (Voir tout)</option>
                                                  ) : (
                                                    <option value="focus"> Traiter cette branche</option>
                                                  )}
                                                </optgroup>
                                                {activeProject.isEditable && projs.length > 1 && (
                                                  <optgroup label="2. DÉFINIR COMME HYPOTHÈSE POUR :">
                                                    {projs.map((_p: any, pIndex: number) => {
                                                      if (pIndex === j) return null;
                                                      
                                                      // On vérifie si cette branche cible a DÉJÀ été conditionnée par une autre branche
                                                      const targetRisk = (activeProject.garData.risks || []).find((r: any) => r.axe === i + 1 && r.niveau === `EXTRANT ${pIndex + 1}`);
                                                      const isAlreadyConditioned = (targetRisk?.linkedBranchIndex !== undefined && targetRisk?.linkedBranchIndex !== null) || targetRisk?.hypothese?.includes('Hypothèse de la Branche');
                                                      
                                                      if (!dependentBranches.includes(pIndex) && !isAlreadyConditioned) {
                                                        return <option key={pIndex} value={`add_hypo_${pIndex}`}> La Branche {pIndex + 1}</option>;
                                                      }
                                                      return null;
                                                    })}
                                                  </optgroup>
                                                )}
                                              </select>
                                            </div>

                                            {/* Extrant */}
                                            <div className="bg-red-50/70 p-1.5 rounded border border-red-200 w-44 sm:w-48 text-center z-10 shadow-2xs">
                                              <h5 className="text-[8px] uppercase font-black text-red-700 mb-0.5">Extrant {j+1} (Livrable)</h5>
                                              {activeProject.isEditable ? <textarea className="w-full bg-white/80 text-red-950 text-[10px] font-bold text-center border border-red-200 rounded p-1 outline-none resize-none custom-scrollbar" value={proj.extrant || ''} onChange={(e) => updateProject(p => p.garData.rendement.axes[i].projets[j].extrant = e.target.value)} rows={2} /> : <p className="text-[10px] font-bold text-red-950">{proj.extrant}</p>}
                                            </div>
                                            <div className="w-0.5 h-3.5 bg-slate-300"></div>
                                            
                                            {/* Activités & Intrants alignés */}
                                            <div className="flex justify-center relative w-full">
                                              {activites.map((act, k) => (
                                                <div key={k} className="flex flex-col items-center relative px-1">
                                                   {activites.length > 1 && <>{k !== 0 && <div className="absolute top-0 left-0 w-1/2 h-0.5 bg-slate-300"></div>}{k !== activites.length - 1 && <div className="absolute top-0 right-0 w-1/2 h-0.5 bg-slate-300"></div>}</>}
                                                   <div className="w-0.5 h-3.5 bg-slate-300"></div>
                                                   
                                                   <div className="bg-rose-50/80 p-1.5 rounded border border-rose-200 w-44 sm:w-48 text-center z-10 relative shadow-2xs">
                                                     <h5 className="text-[8px] uppercase font-black text-rose-800 mb-0.5">Activité {k+1}</h5>
                                                     {activeProject.isEditable ? <textarea className="w-full bg-white/80 text-rose-950 text-[10px] font-medium text-center border border-rose-200 rounded p-1 outline-none resize-none custom-scrollbar" value={act} onChange={(e) => updateProject(p => { const arr = ensureArray(p.garData.rendement.axes[i].projets[j].activites); arr[k] = e.target.value; p.garData.rendement.axes[i].projets[j].activites = arr; })} rows={2} /> : <p className="text-[10px] font-medium text-rose-950">{act}</p>}
                                                   </div>
                                                   
                                                   <div className="w-0.5 h-3.5 bg-slate-300"></div>
                                                   
                                                   <div className="bg-slate-50 p-2 rounded border border-slate-200 w-44 sm:w-48 text-left z-10 shadow-2xs relative">
                                                     <h5 className="text-[8px] uppercase font-black text-slate-700 mb-1.5 text-center border-b border-slate-200 pb-0.5">Intrants {k+1}</h5>
                                                     <div className="space-y-1.5">
                                                       <div><h6 className="text-[7px] uppercase font-bold text-slate-600 mb-0.5">Ressources Humaines</h6><EditableResourceList isEditable={activeProject.isEditable} items={getSafe2D(proj?.intrants_rh, k)} onChange={v => updateIntrants(i, j, k, 'intrants_rh', v)} placeholderLabel="Poste..." /></div>
                                                       <div><h6 className="text-[7px] uppercase font-bold text-slate-600 mb-0.5">Ressources Matérielles</h6><EditableResourceList isEditable={activeProject.isEditable} items={getSafe2D(proj?.intrants_mat, k)} onChange={v => updateIntrants(i, j, k, 'intrants_mat', v)} placeholderLabel="Équipement..." /></div>
                                                       <div className="pt-1.5 border-t border-slate-200 mt-1"><h6 className="text-[7px] uppercase font-bold text-red-700 mb-0.5 text-center">Ressources Financières</h6>{renderActivityCost(proj, k)}</div>
                                                     </div>
                                                   </div>

                                                </div>
                                              ))}
                                            </div>

                                          </div>
                                       </div>
                                     )
                                  })}
                                </div>
                              </div>
                            )
                         })}
                       </div>
                     </div>
                   </div>
                 </div>
              </div>
            )
          )}

          {/* TERRAIN / ANALYSE DES PROBLÈMES (TABLEAU) */}
          {activeTab === 'terrain' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col w-full max-w-full 2xl:max-w-[1600px] mx-auto space-y-2">
                 <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                   <table className="w-full gar-compact-table text-xs border-collapse mb-0 min-w-[540px] sm:min-w-[680px]">
                     <thead className="bg-slate-800 text-white">
                       <tr>
                         <th style={{ width: '24%' }} className="sticky top-0 left-0 z-30 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-left font-bold uppercase text-[10px]">Niveau de Problème</th>
                         <th style={{ width: '38%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-left font-bold uppercase text-[10px]">Diagnostic / Description</th>
                         <th style={{ width: '38%' }} className="sticky top-0 z-20 px-2 py-1.5 border-slate-700 bg-slate-800 text-left font-bold uppercase text-[10px]">Correspondance GAR (Solution)</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white">
                       <tr className="border-b-2 border-slate-400">
                         <td className="sticky left-0 z-10 px-2 py-1.5 font-black bg-red-900 text-white border-r border-slate-300 align-middle">IMPACT NÉGATIF GLOBAL</td>
                         <td className="px-2 py-1.5 font-bold text-red-900 bg-red-50 border-r border-slate-300 align-top"><EditableCell isEditable={false} type="textarea" value={activeProject.garData?.problems?.consequenceGlobale} onChange={() => {}} /></td>
                         <td className="px-2 py-1.5 bg-slate-50 border-r border-slate-300 align-top"><span className="text-[8px] font-black uppercase text-red-700 block mb-0.5">Impact Positif Global</span><EditableCell isEditable={false} type="textarea" value={activeProject.garData?.rendement?.impact} onChange={() => {}} /></td>
                       </tr>
                       {(activeProject.garData?.problems?.branches || []).map((branch: any, idx: number) => {
                         if (!isAxeFocused(idx)) return null;
                         const axeRendement = activeProject.garData.rendement?.axes?.[idx] || { nom: branch.axeName, effet: '', projets: [] };
                         return (
                           <React.Fragment key={idx}>
                             <AxeRow axe={axeRendement} colSpan={3} />
                             <tr className="border-b border-slate-200">
                               <td className="sticky left-0 z-10 px-2 py-1.5 font-black bg-red-50 text-red-900 border-r border-slate-300 align-middle">PROBLÈME CENTRAL</td>
                               <td className="px-2 py-1.5 font-bold text-slate-900 border-r border-slate-300 align-top"><EditableCell isEditable={false} type="textarea" value={branch.central} onChange={() => {}} /></td>
                               <td className="px-2 py-1.5 bg-slate-50 border-r border-slate-300 align-top"><span className="text-[8px] font-black uppercase text-red-700 block mb-0.5">Effet (Objectif Spécifique)</span><EditableCell isEditable={false} type="textarea" value={axeRendement.effet} onChange={() => {}} /></td>
                             </tr>
                             {(branch.details || []).map((detail: any, dIdx: number) => {
                               if (!isProjFocused(idx, dIdx)) return null;
                               const proj = axeRendement.projets?.[dIdx] || { extrant: '', activites: [], intrants_rh: [], intrants_mat: [] };
                               return (
                                 <React.Fragment key={dIdx}>
                                   <ProjRow proj={proj} pIdx={dIdx} colSpan={3} />
                                   <tr className="border-b border-slate-200">
                                     <td className="sticky left-0 z-10 px-2 py-1.5 font-black bg-yellow-50 text-yellow-900 border-r border-slate-300 align-middle">CONTRAINTE CRITIQUE</td>
                                     <td className="px-2 py-1.5 font-medium text-slate-900 border-r border-slate-300 align-top"><EditableCell isEditable={false} type="textarea" value={detail.contrainte} onChange={() => {}} /></td>
                                     <td className="px-2 py-1.5 bg-slate-50 border-r border-slate-300 align-top"><span className="text-[8px] font-black uppercase text-red-700 block mb-0.5">Extrant (Livrable)</span><EditableCell isEditable={false} type="textarea" value={proj.extrant} onChange={() => {}} /></td>
                                   </tr>
                                   <tr className="border-b border-slate-200">
                                     <td className="sticky left-0 z-10 px-2 py-1.5 font-black bg-orange-50 text-orange-900 border-r border-slate-300 align-middle">CAUSES PROFONDES</td>
                                     <td className="px-2 py-1.5 font-medium text-slate-900 border-r border-slate-300 align-top"><EditableCell isEditable={false} type="numberList" value={detail.cause} onChange={() => {}} /></td>
                                     <td className="px-2 py-1.5 bg-slate-50 border-r border-slate-300 align-top"><span className="text-[8px] font-black uppercase text-orange-700 block mb-0.5">Activités</span><EditableCell isEditable={false} type="numberList" value={proj.activites} onChange={() => {}} /></td>
                                   </tr>
                                   <tr className="border-b border-slate-300">
                                     <td className="sticky left-0 z-10 px-2 py-1.5 font-black bg-slate-50 text-slate-900 border-r border-slate-300 align-middle">BESOINS & INTRANTS PRIORITAIRES</td>
                                     <td className="px-0 py-0 border-r border-slate-300 align-top">
                                       {ensureArray(detail.besoin).map((bes, k) => (
                                         <div key={k} className={`p-1.5 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                           <span className="text-[8px] font-black uppercase text-red-700 block mb-0.5">Besoin {k+1}</span>
                                           <EditableCell isEditable={false} type="textarea" value={bes} onChange={() => {}} />
                                         </div>
                                       ))}
                                     </td>
                                     <td className="px-0 py-0 bg-slate-50 border-r border-slate-300 align-top">
                                       {ensureArray(detail.besoin).map((_bes, k) => (
                                         <div key={k} className={`p-1.5 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                           <span className="text-[8px] font-black uppercase text-slate-700 block mb-0.5">Intrants {k+1} (RH)</span>
                                           <EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_rh, k)} onChange={() => {}} />
                                           <span className="text-[8px] font-black uppercase text-slate-700 block mt-1.5 mb-0.5">Intrants {k+1} (Matériel)</span>
                                           <EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_mat, k)} onChange={() => {}} />
                                         </div>
                                       ))}
                                     </td>
                                   </tr>
                                 </React.Fragment>
                               );
                             })}
                           </React.Fragment>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
              </div>
            )
          )}

          {/* REGISTRE PARTIES PRENANTES */}
          {activeTab === 'registre_parties' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col w-full max-w-full 2xl:max-w-[1600px] mx-auto space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                  <table className="w-full gar-compact-table text-left text-xs text-slate-700 border-collapse mb-0 min-w-[620px] sm:min-w-[760px]">
                    <thead className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                      <tr>
                        <th style={{ width: '20%' }} className="sticky top-0 z-30 px-2 py-1.5 border-r border-slate-700 bg-slate-800">Bénéficiaires</th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800">Interne à l'Institution</th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800">Externe à l'Institution</th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800">Part. Techniques</th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 bg-slate-800">Part. Financiers</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {(activeProject.garData.rendement?.axes || []).map((axe: any, i: number) => {
                        if (!isAxeFocused(i)) return null;
                        return (
                          <React.Fragment key={i}>
                            <AxeRow axe={axe} colSpan={5} />
                            {(axe.projets || []).map((proj: any, pIdx: number) => {
                              if (!isProjFocused(i, pIdx)) return null;
                              const cats = [
                                { key: 'beneficiaires', label: 'Bénéficiaires' },
                                { key: 'instCentralises', label: 'Interne à l\'Institution' },
                                { key: 'instDecentralises', label: 'Externe à l\'Institution' },
                                { key: 'operateursTechniques', label: 'Techniques' },
                                { key: 'ptf', label: 'Financiers' }
                              ];
                              return (
                                <React.Fragment key={pIdx}>
                                  <ProjRow proj={proj} pIdx={pIdx} colSpan={5} />
                                  <tr className="border-b border-slate-200 bg-white">
                                    {cats.map((cat, catIdx) => {
                                      const actors = (activeProject.garData.stakeholders?.[cat.key] || []).map((a: any, idx: number) => ({...a, absIdx: idx})).filter((a: any) => a.axe === i+1 && a.projetIndex === pIdx);
                                      return (
                                        <td key={cat.key} className={`p-1.5 align-top ${catIdx < cats.length - 1 ? 'border-r border-slate-300' : ''}`}>
                                          <div className="space-y-1.5">
                                            {actors.map((act: any) => (
                                              <div key={act.absIdx} className="flex items-start gap-1 bg-slate-50 p-1 rounded border border-slate-200 shadow-2xs group">
                                                <div className="flex-1"><EditableCell isEditable={activeProject.isEditable} value={act.nom} onChange={v => updateStakeholder(cat.key, i+1, pIdx, act.absIdx, 'nom', v)} type="textarea" placeholder="Nom..." /></div>
                                                {activeProject.isEditable && <button onClick={() => deleteStakeholder(cat.key, act.absIdx)} className="mt-0.5 p-0.5 text-red-500 hover:bg-red-100 rounded cursor-pointer opacity-0 group-hover:opacity-100"><Trash2 size={10}/></button>}
                                              </div>
                                            ))}
                                            {activeProject.isEditable && <button onClick={() => addStakeholder(cat.key, i+1, pIdx)} className="flex w-full justify-center gap-1 py-1 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded border border-dashed text-[8px] font-bold uppercase cursor-pointer"><Plus size={9} /> Ajouter</button>}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </React.Fragment>
                              )
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ANALYSE PARTIES PRENANTES */}
          {activeTab === 'parties' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col w-full max-w-full 2xl:max-w-[1600px] mx-auto space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                  <table className={`w-full gar-compact-table ${activeSubTab === 'Partenaires Financiers' ? 'min-w-[680px] sm:min-w-[820px]' : 'min-w-[580px] sm:min-w-[740px]'} table-fixed text-left text-xs text-slate-700 border-collapse mb-0`}>
                    <thead className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                      {(() => {
                        const currentSubTab = activeSubTab || 'Bénéficiaires';
                        if (currentSubTab === 'Bénéficiaires') return (
                          <tr>
                            <th style={{ width: '20%' }} className="sticky top-0 left-0 z-30 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_-1px_-1px_0_0_#334155]">Acteurs Identifiés</th>
                            <th style={{ width: '30%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Attentes & Besoins (Auto)</th>
                            <th style={{ width: '25%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Contraintes (Auto)</th>
                            <th style={{ width: '25%' }} className="sticky top-0 z-20 px-2 py-1.5 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Problèmes (Auto)</th>
                          </tr>
                        );
                        if (currentSubTab === 'Interne à l\'Institution' || currentSubTab === 'Externe à l\'Institution') return (
                          <tr>
                            <th style={{ width: '20%' }} className="sticky top-0 left-0 z-30 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_-1px_-1px_0_0_#334155]">Acteurs Identifiés</th>
                            <th style={{ width: '15%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Intervention</th>
                            <th style={{ width: '15%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Compétence</th>
                            <th style={{ width: '25%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Attentes & Besoins (Auto)</th>
                            <th style={{ width: '25%' }} className="sticky top-0 z-20 px-2 py-1.5 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Problèmes (Auto)</th>
                          </tr>
                        );
                        return (
                          <tr>
                            <th style={{ width: '20%' }} className="sticky top-0 left-0 z-30 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_-1px_-1px_0_0_#334155]">Acteurs Identifiés</th>
                            <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Attentes & Besoins (Auto)</th>
                            <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Contraintes (Auto)</th>
                            <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Point Fort (Activités) (Auto)</th>
                            <th style={{ width: '20%' }} className="sticky top-0 z-20 px-2 py-1.5 bg-slate-800 shadow-[inset_0_-1px_0_0_#334155]">Point Faible (Causes) (Auto)</th>
                          </tr>
                        );
                      })()}
                    </thead>
                    <tbody className="bg-white">
                      {(activeProject.garData.rendement?.axes || []).map((axe: any, i: number) => {
                        if (!isAxeFocused(i)) return null;
                        const currentSubTab = activeSubTab || 'Bénéficiaires';
                        const key = getStakeholderKey(currentSubTab);
                        const items = activeProject.garData.stakeholders?.[key] || [];
                        const isSpecial = currentSubTab === 'Partenaires Techniques' || currentSubTab === 'Partenaires Financiers';
                        const isBen = currentSubTab === 'Bénéficiaires';
                        const isInst = !isBen && !isSpecial;
                        let colSpan = isSpecial ? 5 : (isBen ? 4 : 5);
                        
                        return (
                          <React.Fragment key={i}>
                            <AxeRow axe={axe} colSpan={colSpan} />
                            {(axe.projets || []).map((proj: any, pIdx: number) => {
                              if (!isProjFocused(i, pIdx)) return null;
                              const actorIndices: number[] = []; items.forEach((a: any, idx: number) => { if(a.axe === i+1 && a.projetIndex === pIdx) actorIndices.push(idx); });
                              
                              const problemDetail = activeProject.garData.problems?.branches?.[i]?.details?.[pIdx] || {};
                              const centralProblem = activeProject.garData.problems?.branches?.[i]?.central || '-';
                              const besoinsText = ensureArray(problemDetail.besoin).join('\n') || '-';
                              const contrainteText = problemDetail.contrainte || '-';
                              const activitesText = ensureArray(proj.activites).join('\n') || '-';
                              const causesText = ensureArray(problemDetail.cause).join('\n') || '-';
                              
                              return (
                                <React.Fragment key={pIdx}>
                                  <ProjRow proj={proj} pIdx={pIdx} colSpan={colSpan} />
                                  {actorIndices.length === 0 ? (
                                    <tr>
                                      <td colSpan={colSpan} className="px-2 py-3 text-center text-slate-400 italic bg-white border-b border-slate-100">
                                        Aucun acteur de cette catégorie n'a été défini pour ce projet. (Allez dans "Registre Parties Prenantes" pour en ajouter).
                                      </td>
                                    </tr>
                                  ) : (
                                    actorIndices.map((absIdx) => {
                                      const acteur = items[absIdx];
                                      return (
                                        <tr key={absIdx} className="bg-white hover:bg-slate-50 border-b border-slate-100">
                                          <td className="sticky left-0 z-10 px-2 py-1.5 font-bold text-slate-900 border-r border-slate-300 align-top bg-white shadow-[inset_-1px_0_0_0_#cbd5e1]">{acteur.nom || 'Acteur sans nom'}</td>
                                          {isInst && <td className="px-2 py-1.5 border-r bg-red-50/30 text-red-900 align-top"><EditableCell isEditable={activeProject.isEditable} value={acteur.intervention} onChange={v => updateStakeholder(key, i+1, pIdx, absIdx, 'intervention', v)} type="textarea"/></td>}
                                          {isInst && <td className="px-2 py-1.5 border-r bg-red-50/30 text-red-900 align-top"><EditableCell isEditable={activeProject.isEditable} value={acteur.competence} onChange={v => updateStakeholder(key, i+1, pIdx, absIdx, 'competence', v)} type="textarea"/></td>}
                                          
                                          {/* Remplissage automatique des Besoins */}
                                          <td className="px-2 py-1.5 border-r align-top bg-slate-50"><EditableCell isEditable={false} value={besoinsText} onChange={() => {}} type="textarea"/></td>
                                          
                                          {/* Remplissage automatique des Contraintes */}
                                          {(isBen || isSpecial) && <td className="px-2 py-1.5 border-r text-slate-800 align-top bg-slate-50"><EditableCell isEditable={false} value={contrainteText} onChange={() => {}} type="textarea"/></td>}
                                          
                                          {/* Remplissage automatique des Points Forts et Points Faibles */}
                                          {isSpecial && <td className="px-2 py-1.5 border-r text-red-800 font-medium align-top bg-slate-50"><EditableCell isEditable={false} value={activitesText} onChange={() => {}} type="textarea"/></td>}
                                          {isSpecial && <td className="px-2 py-1.5 border-r text-orange-800 font-medium align-top bg-slate-50"><EditableCell isEditable={false} value={causesText} onChange={() => {}} type="textarea"/></td>}
                                          
                                          {/* Remplissage automatique du Problème Central */}
                                          {!isSpecial && <td className="px-2 py-1.5 text-red-700 font-bold align-top bg-red-50/30"><EditableCell isEditable={false} value={centralProblem} onChange={() => {}} type="textarea"/></td>}
                                        </tr>
                                      );
                                    })
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* RENDEMENT */}
          {activeTab === 'rendement' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col max-w-full 2xl:max-w-[1600px] mx-auto w-full space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                   <table className="w-full gar-compact-table text-xs border-collapse mb-0 min-w-[520px] sm:min-w-[660px]">
                     <thead className="bg-slate-800 text-white">
                        <tr>
                          <th style={{ width: '25%' }} className="sticky top-0 left-0 z-30 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-left font-bold uppercase text-[10px]">Niveau de Résultat</th>
                          <th style={{ width: '75%' }} className="sticky top-0 z-20 px-2 py-1.5 bg-slate-800 text-left font-bold uppercase text-[10px]">Logique d'Intervention</th>
                        </tr>
                     </thead>
                     <tbody className="bg-white">
                         <tr className="border-b-2 border-slate-400">
                           <td className="sticky left-0 z-10 px-2 py-1.5 bg-slate-900 text-white border-r border-slate-300 align-top"><div className="font-black">IMPACT POSITIF</div></td>
                           <td className="px-2 py-1.5 font-bold text-red-800 bg-slate-50"><EditableCell isEditable={false} type="textarea" value={activeProject.garData.rendement.impact} onChange={() => {}} /></td>
                         </tr>
                         {(activeProject.garData.rendement.axes || []).map((axe: any, idx: number) => {
                           if (!isAxeFocused(idx)) return null;
                           return (
                             <React.Fragment key={idx}>
                               <AxeRow axe={axe} colSpan={2} />
                               <tr className="border-b border-slate-200">
                                 <td className="sticky left-0 z-10 px-2 py-1.5 bg-red-50 border-r border-slate-300 align-top"><div className="font-black text-red-900">EFFET</div></td>
                                 <td className="px-2 py-1.5 font-bold text-slate-900"><EditableCell isEditable={false} type="textarea" value={axe.effet} onChange={() => {}} /></td>
                               </tr>
                               {(axe.projets || []).map((proj: any, pIdx: number) => {
                                 if (!isProjFocused(idx, pIdx)) return null;
                                 return (
                                   <React.Fragment key={pIdx}>
                                     <ProjRow proj={proj} pIdx={pIdx} colSpan={2} />
                                     <tr className="border-b border-slate-200">
                                       <td className="sticky left-0 z-10 px-2 py-1.5 bg-red-50/70 border-r border-slate-300 align-top font-black text-red-900">EXTRANT {pIdx+1}</td>
                                       <td className="px-2 py-1.5 font-bold text-slate-900"><EditableCell isEditable={false} type="textarea" value={proj.extrant} onChange={() => {}} /></td>
                                     </tr>
                                     <tr className="border-b border-slate-200">
                                       <td className="sticky left-0 z-10 px-2 py-1.5 bg-orange-50 border-r border-slate-300 align-top font-black text-orange-900">ACTIVITÉS {pIdx+1}</td>
                                       <td className="px-2 py-1.5 font-medium text-slate-900"><EditableCell isEditable={false} type="numberList" value={proj.activites} onChange={() => {}} /></td>
                                     </tr>
                                     <tr className="border-b border-slate-300">
                                       <td className="sticky left-0 z-10 px-2 py-1.5 bg-slate-100 border-r border-slate-300 align-top font-black text-slate-900">INTRANTS {pIdx+1}</td>
                                       <td className="px-0 py-0 font-medium text-slate-900 align-top">
                                         {ensureArray(proj.activites).map((_act, k) => (
                                           <div key={k} className={`p-1.5 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                             <div className="font-bold text-red-800 mb-1 text-[9px] uppercase">Ressources pour l'Activité {k+1}</div>
                                             <div className="mb-1"><span className="text-[8px] font-bold text-slate-600 uppercase">RH:</span><EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_rh, k)} onChange={() => {}} /></div>
                                             <div><span className="text-[8px] font-bold text-slate-600 uppercase">Matériel:</span><EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_mat, k)} onChange={() => {}} /></div>
                                           </div>
                                         ))}
                                       </td>
                                     </tr>
                                   </React.Fragment>
                                 );
                               })}
                             </React.Fragment>
                           );
                         })}
                     </tbody>
                   </table>
                </div>
              </div>
            )
          )}

          {/* CMR */}
          {activeTab === 'cmr' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col max-w-full 2xl:max-w-[1600px] mx-auto w-full space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                  <table className="w-full gar-compact-table text-left text-xs border-collapse mb-0 min-w-[680px] sm:min-w-[820px]">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th style={{ width: '9%' }} className="sticky top-0 left-0 z-30 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-[10px] uppercase">Niveau</th>
                        <th style={{ width: '21%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-[10px] uppercase">Logique d'Intervention</th>
                        <th style={{ width: '16%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-[10px] uppercase">Indicateur (KPI)</th>
                        <th style={{ width: '5%' }} className="sticky top-0 z-20 px-1.5 py-1.5 border-r border-slate-700 bg-slate-800 text-center text-[10px] uppercase">Réf.</th>
                        <th style={{ width: '5%' }} className="sticky top-0 z-20 px-1.5 py-1.5 border-r border-slate-700 bg-slate-800 text-center text-[10px] uppercase">Cible</th>
                        <th style={{ width: '7%' }} className="sticky top-0 z-20 px-1.5 py-1.5 border-r border-slate-700 bg-slate-800 text-center text-[10px] uppercase">Réal.</th>
                        <th style={{ width: '10%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-left text-[10px] uppercase">Fréquence</th>
                        <th style={{ width: '15%' }} className="sticky top-0 z-20 px-2 py-1.5 border-r border-slate-700 bg-slate-800 text-left text-[10px] uppercase">Source de vérification</th>
                        <th style={{ width: '12%' }} className="sticky top-0 z-20 px-2 py-1.5 bg-slate-800 text-left text-[10px] uppercase">Resp. de collecte</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white text-slate-900">
                      {activeProject.garData.rendement?.axes ? (
                        <>
                          <tr className="hover:bg-slate-50 border-b-2 border-slate-400">
                             <td className="sticky left-0 z-10 px-2 py-1.5 border-r border-slate-300 font-black text-[9px] uppercase bg-slate-900 text-white">IMPACT GLOBAL</td>
                             <td className="px-2 py-1.5 border-r border-slate-300 font-bold text-red-800">{activeProject.garData.rendement.impact}</td>
                             <td className="px-2 py-1.5 border-r border-slate-300"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={(activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.indicateur} onChange={v => updateCmr(0, 'IMPACT GLOBAL', 'indicateur', v)} /></td>
                             <td className="px-1.5 py-1.5 border-r border-slate-300 text-center"><EditableCell isEditable={activeProject.isEditable} value={(activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.ref} onChange={v => updateCmr(0, 'IMPACT GLOBAL', 'ref', v)} /></td>
                             <td className="px-1.5 py-1.5 border-r border-slate-300 text-center font-bold"><EditableCell isEditable={activeProject.isEditable} value={(activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.cible} onChange={v => updateCmr(0, 'IMPACT GLOBAL', 'cible', v)} /></td>
                             <td className="px-1.5 py-1.5 border-r border-slate-300 text-center font-black text-red-700"><EditableCell isEditable={activeProject.isEditable} value={(activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.real} onChange={v => updateCmr(0, 'IMPACT GLOBAL', 'real', v)} /></td>
                             <td className="px-2 py-1.5 border-r border-slate-300 text-[10px]">
                               {activeProject.isEditable ? (
                                 <select className="w-full bg-orange-50 border border-orange-300 rounded p-0.5 text-slate-900 text-[10px] font-bold outline-none cursor-pointer" value={(activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.freq || 'Annuelle'} onChange={e => updateCmr(0, 'IMPACT GLOBAL', 'freq', e.target.value)}>
                                   <option value="Annuelle">Annuelle</option><option value="Semestrielle">Semestrielle</option><option value="Trimestrielle">Trimestrielle</option><option value="Mensuelle">Mensuelle</option><option value="Par semaine">Par semaine</option>
                                 </select>
                               ) : <span className="font-medium text-slate-900">{(activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.freq || '-'}</span>}
                             </td>
                             <td className="px-2 py-1.5 border-r border-slate-300"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={((activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.source) ?? 'Rapport de '} onChange={v => updateCmr(0, 'IMPACT GLOBAL', 'source', v)} fixedPrefix="Rapport de " /></td>
                             <td className="px-2 py-1.5"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={(activeProject.garData.cmr || []).find((r: any)=>r.niveau==='IMPACT GLOBAL')?.responsable} onChange={v => updateCmr(0, 'IMPACT GLOBAL', 'responsable', v)} /></td>
                          </tr>
                          {(activeProject.garData.rendement.axes || []).map((axe: any, i: number) => {
                             if (!isAxeFocused(i)) return null;
                             const effetRow = (activeProject.garData.cmr || []).find((r: any) => r.axe === i+1 && r.niveau?.includes('EFFET')) || {};
                             return (
                               <React.Fragment key={i}>
                                 <AxeRow axe={axe} colSpan={9} />
                                 <tr className="border-b border-slate-300">
                                   <td className="sticky left-0 z-10 px-2 py-1.5 border-r border-slate-300 font-black text-[9px] uppercase bg-red-50 text-red-900">EFFET</td>
                                   <td className="px-2 py-1.5 border-r border-slate-300 font-bold">{axe.effet}</td>
                                   <td className="px-2 py-1.5 border-r border-slate-300"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={effetRow.indicateur} onChange={v => updateCmr(i+1, 'EFFET', 'indicateur', v)} /></td>
                                   <td className="px-1.5 py-1.5 border-r border-slate-300 text-center bg-slate-50"><EditableCell isEditable={activeProject.isEditable} value={effetRow.ref} onChange={v => updateCmr(i+1, 'EFFET', 'ref', v)} /></td>
                                   <td className="px-1.5 py-1.5 border-r border-slate-300 text-center font-bold"><EditableCell isEditable={activeProject.isEditable} value={effetRow.cible} onChange={v => updateCmr(i+1, 'EFFET', 'cible', v)} /></td>
                                   <td className="px-1.5 py-1.5 border-r border-slate-300 text-center font-black text-red-700"><EditableCell isEditable={activeProject.isEditable} value={effetRow.real} onChange={v => updateCmr(i+1, 'EFFET', 'real', v)} /></td>
                                   <td className="px-2 py-1.5 border-r border-slate-300 text-[10px]">
                                     {activeProject.isEditable ? (
                                       <select className="w-full bg-orange-50 border border-orange-300 rounded p-0.5 text-slate-900 text-[10px] font-bold outline-none cursor-pointer" value={effetRow.freq || 'Annuelle'} onChange={e => updateCmr(i+1, 'EFFET', 'freq', e.target.value)}>
                                         <option value="Annuelle">Annuelle</option><option value="Semestrielle">Semestrielle</option><option value="Trimestrielle">Trimestrielle</option><option value="Mensuelle">Mensuelle</option><option value="Par semaine">Par semaine</option>
                                       </select>
                                     ) : <span className="font-medium text-slate-900">{effetRow.freq || '-'}</span>}
                                   </td>
                                   <td className="px-2 py-1.5 border-r border-slate-300"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={effetRow.source ?? 'Rapport de '} onChange={v => updateCmr(i+1, 'EFFET', 'source', v)} fixedPrefix="Rapport de " /></td>
                                   <td className="px-2 py-1.5"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={effetRow.responsable} onChange={v => updateCmr(i+1, 'EFFET', 'responsable', v)} /></td>
                                 </tr>
                                 {(axe.projets || []).map((proj: any, pIdx: number) => {
                                    if (!isProjFocused(i, pIdx)) return null;
                                    const rowLevel = `EXTRANT ${pIdx + 1}`;
                                    const extRow = (activeProject.garData.cmr || []).find((r: any) => r.axe === i+1 && r.niveau === rowLevel) || {};
                                    return (
                                      <React.Fragment key={pIdx}>
                                        <ProjRow proj={proj} pIdx={pIdx} colSpan={9} />
                                        <tr className="border-b border-slate-300">
                                          <td className="sticky left-0 z-10 px-2 py-1.5 border-r border-slate-300 font-black text-[9px] uppercase bg-red-50/70 text-red-900">{rowLevel}</td>
                                          <td className="px-2 py-1.5 border-r border-slate-300 font-bold">{proj.extrant}</td>
                                          <td className="px-2 py-1.5 border-r border-slate-300"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={extRow.indicateur} onChange={v => updateCmr(i+1, rowLevel, 'indicateur', v)} /></td>
                                          <td className="px-1.5 py-1.5 border-r border-slate-300 text-center bg-slate-50"><EditableCell isEditable={activeProject.isEditable} value={extRow.ref} onChange={v => updateCmr(i+1, rowLevel, 'ref', v)} /></td>
                                          <td className="px-1.5 py-1.5 border-r border-slate-300 text-center font-bold"><EditableCell isEditable={activeProject.isEditable} value={extRow.cible} onChange={v => updateCmr(i+1, rowLevel, 'cible', v)} /></td>
                                          <td className="px-1.5 py-1.5 border-r border-slate-300 text-center font-black text-red-700"><EditableCell isEditable={activeProject.isEditable} value={extRow.real} onChange={v => updateCmr(i+1, rowLevel, 'real', v)} /></td>
                                          <td className="px-2 py-1.5 border-r border-slate-300 text-[10px]">
                                            {activeProject.isEditable ? (
                                              <select className="w-full bg-orange-50 border border-orange-300 rounded p-0.5 text-slate-900 text-[10px] font-bold outline-none cursor-pointer" value={extRow.freq || 'Annuelle'} onChange={e => updateCmr(i+1, rowLevel, 'freq', e.target.value)}>
                                                <option value="Annuelle">Annuelle</option><option value="Semestrielle">Semestrielle</option><option value="Trimestrielle">Trimestrielle</option><option value="Mensuelle">Mensuelle</option><option value="Par semaine">Par semaine</option>
                                              </select>
                                            ) : <span className="font-medium text-slate-900">{extRow.freq || '-'}</span>}
                                          </td>
                                          <td className="px-2 py-1.5 border-r border-slate-300"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={extRow.source ?? 'Rapport de '} onChange={v => updateCmr(i+1, rowLevel, 'source', v)} fixedPrefix="Rapport de " /></td>
                                          <td className="px-2 py-1.5"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={extRow.responsable} onChange={v => updateCmr(i+1, rowLevel, 'responsable', v)} /></td>
                                        </tr>
                                      </React.Fragment>
                                    )
                                 })}
                               </React.Fragment>
                             );
                          })}
                        </>
                      ) : null }
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* EXTRANTS */}
          {activeTab === 'extrants' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col max-w-full 2xl:max-w-[1600px] mx-auto w-full space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                  <table className="w-full gar-compact-table text-xs border-collapse min-w-[660px] sm:min-w-[800px] mb-0">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th style={{ width: '9%' }} className="sticky top-0 left-0 z-30 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Niveau</th>
                        <th style={{ width: '21%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Extrants (Livrables)</th>
                        <th style={{ width: '25%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Activités Nécessaires</th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Intrants (Ressources)</th>
                        <th style={{ width: '10%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Coût Estimatif</th>
                        <th style={{ width: '15%' }} className="sticky top-0 z-20 px-2 py-1.5 text-[10px] uppercase">Partenaires Tech/Fin.</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white text-slate-900">
                      {activeProject.garData.rendement?.axes ? (
                         (activeProject.garData.rendement.axes || []).map((axe: any, i: number) => {
                            if (!isAxeFocused(i)) return null;
                            return (
                              <React.Fragment key={i}>
                                <AxeRow axe={axe} colSpan={6} />
                                {(axe.projets || []).map((proj: any, pIdx: number) => {
                                   if (!isProjFocused(i, pIdx)) return null;
                                   
                                   const techPartners = (activeProject.garData.stakeholders?.operateursTechniques || [])
                                     .filter((a: any) => a.axe === i + 1 && a.projetIndex === pIdx && a.nom)
                                     .map((a: any) => a.nom.trim());
                                   const finPartners = (activeProject.garData.stakeholders?.ptf || [])
                                     .filter((a: any) => a.axe === i + 1 && a.projetIndex === pIdx && a.nom)
                                     .map((a: any) => a.nom.trim());
                                   const allPartners = [...techPartners, ...finPartners];
                                   const partnersText = allPartners.length > 0 ? '- ' + allPartners.join('\n- ') : '-';

                                   return (
                                     <React.Fragment key={pIdx}>
                                       <ProjRow proj={proj} pIdx={pIdx} colSpan={6} />
                                       <tr className="border-b border-slate-200 bg-white">
                                         <td className="sticky left-0 z-10 px-2 py-1.5 border-r border-slate-300 font-black text-[9px] uppercase bg-red-50/70 text-red-900 align-top">EXTRANT {pIdx+1}</td>
                                         <td className="px-2 py-1.5 border-r border-slate-300 font-bold text-red-800 align-top">{proj.extrant}</td>
                                         <td className="px-0 py-0 border-r border-slate-300 align-top">
                                            {ensureArray(proj.activites).map((act, k) => (
                                              <div key={k} className={`p-1.5 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                <span className="text-[9px] font-black text-red-800 underline block mb-0.5">Activité {k+1} :</span>
                                                <EditableCell isEditable={false} type="textarea" value={act} onChange={() => {}} />
                                              </div>
                                            ))}
                                         </td>
                                         <td className="px-0 py-0 border-r border-slate-300 bg-slate-50 align-top">
                                           {ensureArray(proj.activites).map((_act, k) => (
                                              <div key={k} className={`p-1.5 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                <div className="mb-1"><span className="text-[8px] font-bold text-slate-600 uppercase">Humaines:</span><EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_rh, k)} onChange={() => {}} /></div>
                                                <div><span className="text-[8px] font-bold text-slate-600 uppercase">Matérielles:</span><EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_mat, k)} onChange={() => {}} /></div>
                                              </div>
                                           ))}
                                         </td>
                                         <td className="px-0 py-0 border-r border-slate-300 align-top text-center">
                                           {ensureArray(proj.activites).map((_act, k) => (
                                              <div key={k} className={`p-1.5 flex flex-col justify-center h-full ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                 {renderActivityCost(proj, k)}
                                              </div>
                                            ))}
                                            {ensureArray(proj.activites).length > 1 && (
                                              <div className="p-1.5 border-t-2 border-slate-300 bg-slate-100 mt-auto">
                                                 <span className="text-[8px] uppercase font-black block mb-0.5">Total:</span>
                                                 <span className="font-black text-red-700">{formatAmount(getProjectEffectiveCost(proj))}</span>
                                              </div>
                                            )}
                                         </td>
                                         <td className="px-2 py-1.5 font-medium align-top bg-slate-50">
                                            <span className="whitespace-pre-line font-bold text-slate-800">{partnersText}</span>
                                         </td>
                                       </tr>
                                     </React.Fragment>
                                   );
                                })}
                              </React.Fragment>
                            );
                         })
                      ) : null }
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* RISQUES */}
          {activeTab === 'risques_hypo' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col max-w-full 2xl:max-w-[1600px] mx-auto w-full space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                  <table className="w-full gar-compact-table text-xs border-collapse min-w-[680px] sm:min-w-[820px] mb-0">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th style={{ width: '9%' }} className="sticky top-0 left-0 z-30 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Niveau</th>
                        <th style={{ width: '16%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Logique d'Intervention</th>
                        <th style={{ width: '15%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Hypothèse (Condition)</th>
                        <th style={{ width: '15%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Événement Critique</th>
                        <th style={{ width: '15%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Risque Identifié (Cause)</th>
                        <th style={{ width: '8%' }} className="sticky top-0 z-20 border-r border-slate-700 px-1.5 py-1.5 text-center text-[10px] uppercase">Criticité</th>
                        <th style={{ width: '10%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Responsable</th>
                        <th style={{ width: '12%' }} className="sticky top-0 z-20 px-2 py-1.5 text-[10px] uppercase">Plan d'Atténuation</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white text-slate-900">
                      {activeProject.garData.rendement?.axes ? (
                         <>
                           {(activeProject.garData.rendement.axes || []).map((axe: any, i: number) => {
                              if (!isAxeFocused(i)) return null;
                              const items = activeProject.garData.risks || [];
                              
                              return (
                                <React.Fragment key={i}>
                                  <AxeRow axe={axe} colSpan={8} />

                                  {/* LIGNES DE RISQUES POUR LES EXTRANTS */}
                                  {(axe.projets || []).map((proj: any, pIdx: number) => {
                                      if (!isProjFocused(i, pIdx)) return null;
                                      const rowLevel = `EXTRANT ${pIdx + 1}`;
                                      const risk = items.find((r: any) => r.axe === i+1 && r.niveau === rowLevel) || { niveau: rowLevel, logique: proj.extrant, hypothese: '', contrainte: '', cause: '', level: '-', responsable: '', mitigation: '' };
                                      const detail = activeProject.garData.problems?.branches?.[i]?.details?.[pIdx] || {};
                                      
                                      // LECTURE DYNAMIQUE DE L'HYPOTHÈSE LIEE
                                      let hypotheseText = risk.hypothese;
                                      let isHypoLinked = false;
                                      if (risk.linkedBranchIndex !== undefined && risk.linkedBranchIndex !== null) {
                                          const linkedProj = activeProject.garData.rendement?.axes?.[i]?.projets?.[risk.linkedBranchIndex];
                                          if (linkedProj) {
                                              hypotheseText = linkedProj.extrant;
                                              isHypoLinked = true;
                                          }
                                      }

                                      return (
                                        <React.Fragment key={pIdx}>
                                          <ProjRow proj={proj} pIdx={pIdx} colSpan={8} />
                                          <tr className="border-b border-slate-300 bg-white">
                                            <td className="sticky left-0 z-10 px-2 py-1.5 font-black text-[9px] uppercase border-r border-slate-300 bg-red-50/70 text-red-900">{rowLevel}</td>
                                            <td className="px-2 py-1.5 font-bold border-r border-slate-300">{proj.extrant}</td>
                                            <td className="px-2 py-1.5 font-medium border-r border-slate-300 bg-red-50/30 text-red-900">
                                              <EditableCell isEditable={activeProject.isEditable && !isHypoLinked} type="textarea" value={hypotheseText} onChange={v => updateRisk(i+1, rowLevel, 'hypothese', v)} />
                                            </td>
                                            <td className="px-2 py-1.5 font-bold border-r border-slate-300 text-red-900 bg-red-50/30 text-center"><EditableCell isEditable={false} type="textarea" value={detail.contrainte || '-'} onChange={() => {}} /></td>
                                            <td className="px-2 py-1.5 font-medium border-r border-slate-300 text-orange-900 bg-orange-50/30 text-center"><EditableCell isEditable={false} type="textarea" value={ensureArray(detail.cause).join('\n') || '-'} onChange={() => {}} /></td>
                                            <td className="px-1.5 py-1.5 border-r border-slate-300 text-center">
                                              {activeProject.isEditable ? (
                                                <select className="w-full bg-orange-50 border border-orange-300 rounded p-0.5 text-slate-900 text-[10px] font-bold outline-none cursor-pointer" value={risk.level || '-'} onChange={(e) => updateRisk(i+1, rowLevel, 'level', e.target.value)}>
                                                  <option value="-">-</option><option value="FAIBLE">Faible</option><option value="MOYEN">Moyen</option><option value="ÉLEVÉ">Élevé</option><option value="CRITIQUE">Critique</option>
                                                </select>
                                              ) : (risk.level === '-' || !risk.level ? <span className="text-slate-400 font-bold">-</span> : <span className={`px-1.5 py-0.5 rounded font-black text-[8px] uppercase ${risk.level==='CRITIQUE'?'bg-red-100 text-red-700':risk.level==='ÉLEVÉ'?'bg-orange-100 text-orange-700':risk.level==='MOYEN'?'bg-yellow-100 text-yellow-700':'bg-slate-200 text-slate-800'}`}>{risk.level}</span>)}
                                            </td>
                                            <td className="px-2 py-1.5 border-r border-slate-300 font-bold text-center">
                                              {activeProject.isEditable ? (
                                                  <select 
                                                    className="w-full bg-orange-50 border border-orange-300 rounded p-0.5 text-slate-900 text-[10px] font-bold outline-none cursor-pointer custom-scrollbar"
                                                    value={risk.responsable || ''}
                                                    onChange={(e) => updateRisk(i+1, rowLevel, 'responsable', e.target.value)}
                                                  >
                                                    <option value="">- Acteur -</option>
                                                    {getAvailableActors(activeProject, i + 1, pIdx).map((actor, aIdx) => (
                                                      <option key={aIdx} value={actor}>{actor}</option>
                                                    ))}
                                                  </select>
                                              ) : (
                                                <span className="whitespace-pre-line">{risk.responsable || '-'}</span>
                                              )}
                                            </td>
                                            <td className="px-2 py-1.5 italic bg-slate-50"><EditableCell isEditable={activeProject.isEditable} type="textarea" value={risk.mitigation} onChange={v => updateRisk(i+1, rowLevel, 'mitigation', v)} /></td>
                                          </tr>
                                        </React.Fragment>
                                      );
                                  })}
                                </React.Fragment>
                              );
                           })}
                         </>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* CLAR */}
          {activeTab === 'clar' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col max-w-full 2xl:max-w-[1600px] mx-auto w-full space-y-2">
                <div className="bg-white rounded-xl shadow-md border border-slate-300 overflow-auto flex-1 max-h-[82vh] relative custom-scrollbar">
                  <table className="w-full gar-compact-table text-xs border-collapse min-w-[660px] sm:min-w-[800px] mb-0">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th style={{ width: '10%' }} className="sticky top-0 left-0 z-30 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Niveau</th>
                        <th style={{ width: '25%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Logique d'Intervention</th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Indicateurs / Ressources</th>
                        <th style={{ width: '20%' }} className="sticky top-0 z-20 border-r border-slate-700 px-2 py-1.5 text-[10px] uppercase">Sources / Coûts</th>
                        <th style={{ width: '25%' }} className="sticky top-0 z-20 border-slate-700 px-2 py-1.5 text-[10px] uppercase">Hypothèses / Conditions</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-900 bg-white">
                      {activeProject.garData.rendement?.axes ? (
                        <>
                          <tr className="border-b-2 border-slate-400">
                            <td className="sticky left-0 z-10 border-r border-slate-300 px-2 py-1.5 font-black bg-slate-900 text-white">IMPACT GLOBAL</td>
                            <td className="border-r border-slate-300 px-2 py-1.5 font-bold text-red-800">{activeProject.garData.rendement.impact}</td>
                            <td className="border-r border-slate-300 px-2 py-1.5 font-medium">{(activeProject.garData.cmr || []).find((c: any) => c.niveau === 'IMPACT GLOBAL' || c.axe === 0)?.indicateur || '-'}</td>
                            <td className="border-r border-slate-300 px-2 py-1.5">{(activeProject.garData.cmr || []).find((c: any) => c.niveau === 'IMPACT GLOBAL' || c.axe === 0)?.source || 'Rapport de '}</td>
                            <td className="px-2 py-1.5 bg-slate-50"></td>
                          </tr>
                          {(activeProject.garData.rendement.axes || []).map((axe: any, i: number) => {
                            if (!isAxeFocused(i)) return null;
                            const effetCmr = (activeProject.garData.cmr || []).find((c: any) => c.axe === i+1 && c.niveau?.includes('EFFET'))?.indicateur || '-';
                            const effetSource = (activeProject.garData.cmr || []).find((c: any) => c.axe === i+1 && c.niveau?.includes('EFFET'))?.source || 'Rapport de ';
                            
                            // HYPOTHÈSE EFFET (Appliquée comme pour les extrants)
                            const riskEffet = (activeProject.garData.risks || []).find((r: any) => r.axe === i+1 && r.niveau === 'EFFET');
                            let effetHypoText = riskEffet?.hypothese || '-';
                            if (riskEffet?.linkedAxeIndex !== undefined && riskEffet?.linkedAxeIndex !== null) {
                               const linkedAxe = activeProject.garData.rendement?.axes?.[riskEffet.linkedAxeIndex];
                               if (linkedAxe) {
                                   effetHypoText = linkedAxe.effet || '-';
                               }
                            }

                            return (
                              <React.Fragment key={i}>
                                <AxeRow axe={axe} colSpan={5} />
                                <tr className="border-b border-slate-300 bg-white">
                                   <td className="sticky left-0 z-10 border-r border-slate-300 px-2 py-1.5 font-black bg-red-50 text-red-900">EFFET</td>
                                   <td className="border-r border-slate-300 px-2 py-1.5 font-bold">{axe.effet}</td>
                                   <td className="border-r border-slate-300 px-2 py-1.5 font-medium">{effetCmr}</td>
                                   <td className="border-r border-slate-300 px-2 py-1.5">{effetSource}</td>
                                   <td className="px-2 py-1.5 text-red-800 font-medium bg-slate-50">{effetHypoText}</td>
                                </tr>
                                {(axe.projets || []).map((proj: any, pIdx: number) => {
                                   if (!isProjFocused(i, pIdx)) return null;
                                   const extrantCmr = (activeProject.garData.cmr || []).find((c: any) => c.axe === i+1 && c.niveau === `EXTRANT ${pIdx+1}`)?.indicateur || '-';
                                   const extrantSource = (activeProject.garData.cmr || []).find((c: any) => c.axe === i+1 && c.niveau === `EXTRANT ${pIdx+1}`)?.source || 'Rapport de ';
                                   
                                   // LECTURE DYNAMIQUE DE L'HYPOTHÈSE LIEE DANS LE CLAR
                                   const riskExtrant = (activeProject.garData.risks || []).find((r: any) => r.axe === i+1 && r.niveau === `EXTRANT ${pIdx+1}`);
                                   let extrantHypo = riskExtrant?.hypothese || '-';
                                   if (riskExtrant?.linkedBranchIndex !== undefined && riskExtrant?.linkedBranchIndex !== null) {
                                      const linkedProj = activeProject.garData.rendement?.axes?.[i]?.projets?.[riskExtrant.linkedBranchIndex];
                                      if (linkedProj) extrantHypo = linkedProj.extrant || '-';
                                   }

                                   return (
                                     <React.Fragment key={pIdx}>
                                       <ProjRow proj={proj} pIdx={pIdx} colSpan={5} />
                                       <tr className="border-b border-slate-300 bg-white">
                                         <td className="sticky left-0 z-10 border-r border-slate-300 px-2 py-1.5 font-black bg-red-50/70 text-red-900">EXTRANT {pIdx+1}</td>
                                         <td className="border-r border-slate-300 px-2 py-1.5 font-bold">{proj.extrant}</td>
                                         <td className="border-r border-slate-300 px-2 py-1.5 font-medium">{extrantCmr}</td>
                                         <td className="border-r border-slate-300 px-2 py-1.5">{extrantSource}</td>
                                         <td className="px-2 py-1.5 text-red-800 font-medium bg-slate-50">{extrantHypo}</td>
                                       </tr>
                                       <tr className="border-b border-slate-300 bg-white">
                                         <td className="sticky left-0 z-10 border-r border-slate-300 px-2 py-1.5 font-black bg-orange-50 text-orange-900">ACTIVITÉS {pIdx+1}</td>
                                         <td className="px-0 py-0 border-r border-slate-300 align-top">
                                            {ensureArray(proj.activites).map((act, k) => (
                                              <div key={k} className={`p-1.5 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                <span className="text-[9px] font-black text-red-800 underline block mb-0.5">Activité {k+1} :</span>
                                                {act}
                                              </div>
                                            ))}
                                         </td>
                                         <td className="px-0 py-0 border-r border-slate-300 bg-slate-50 align-top">
                                           {ensureArray(proj.activites).map((_act, k) => (
                                              <div key={k} className={`p-1.5 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                <div className="mb-1"><span className="text-[8px] font-bold text-slate-600 uppercase">Humaines:</span><EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_rh, k)} /></div>
                                                <div><span className="text-[8px] font-bold text-slate-600 uppercase">Matérielles:</span><EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_mat, k)} /></div>
                                              </div>
                                           ))}
                                         </td>
                                         <td className="px-0 py-0 border-r border-slate-300 align-top text-center">
                                           {ensureArray(proj.activites).map((_act, k) => (
                                              <div key={k} className={`p-1.5 flex flex-col justify-center h-full ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                 {renderActivityCost(proj, k, false)}
                                              </div>
                                            ))}
                                            {ensureArray(proj.activites).length > 1 && (
                                              <div className="p-1.5 border-t-2 border-slate-300 bg-slate-100 mt-auto">
                                                 <span className="text-[8px] uppercase font-black block mb-0.5">Total:</span>
                                                 <span className="font-black text-red-700">{formatAmount(getProjectEffectiveCost(proj))}</span>
                                              </div>
                                            )}
                                         </td>
                                         <td className="px-2 py-1.5 bg-slate-50"></td>
                                       </tr>
                                     </React.Fragment>
                                   )
                                })}
                              </React.Fragment>
                            )
                          })}
                        </>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* RÉSUMÉ ET FICHE TECHNIQUE */}
          {activeTab === 'fiche' && (
            !activeProject ? <NoProjectScreen setActiveTab={setActiveTab} /> : (
              <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white p-3 sm:p-5 md:p-6 rounded-xl shadow-lg border border-slate-200 relative w-full space-y-2">
                {/* FICHE TECHNIQUE */}
                {activeSubTab === 'Fiche Technique' && (
                  <div className="overflow-y-auto max-h-[82vh] px-1 sm:px-2 custom-scrollbar">
                    <div className="text-center mb-5 border-b-2 border-red-800 pb-4 relative">
                      <h1 className="text-lg sm:text-xl md:text-2xl font-black uppercase text-red-900 leading-tight">Fiche Technique des Projets</h1>
                      <div className="mt-2.5 flex justify-center gap-2.5 flex-col items-center">
                        <span className="px-3 py-1 bg-red-50 text-red-800 border border-red-200 rounded-full font-bold text-[10px] uppercase">Entité Active</span>
                        {activeProject.isEditable ? (
                          <input type="text" value={activeProject.name} onChange={e => updateProject(p => { p.name = e.target.value; p.displayName = e.target.value; })} className="text-sm sm:text-base font-bold text-center border-b-2 border-red-400 bg-red-50/40 text-slate-900 focus:outline-none w-full max-w-xl p-1 rounded" placeholder="Nommez votre Plan/Projet ici..." />
                        ) : (
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 text-center">{activeProject.name}</h2>
                        )}

                        {/* INFORMATIONS DU CONCEPTEUR ISSUES DE L'ONGLET PROFIL */}
                        <div className="mt-2 w-full max-w-2xl bg-red-50/50 border border-red-200 rounded-lg p-2.5 text-left shadow-2xs">
                          <div className="flex items-center justify-between mb-1.5 border-b border-red-200/70 pb-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-red-800 flex items-center gap-1">
                              <User size={11} /> Identification du Concepteur / Responsable (Profil)
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveTab('profil')}
                              className="text-[9px] font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
                            >
                              Modifier le profil
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-slate-800">
                            <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Nom & Prénoms :</span><span className="font-black text-slate-900">{userProfile.nomPrenoms || activeProject.designerName || 'Non renseigné'}</span></div>
                            <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Fonction :</span><span className="font-bold text-slate-900">{userProfile.fonction || activeProject.designerRole || 'Non renseignée'}</span></div>
                            <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Institution :</span><span className="font-bold text-slate-900">{userProfile.institution || 'Non renseignée'}</span></div>
                            <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Email :</span><span className="font-medium text-slate-900">{userProfile.email || activeProject.designerEmail || 'Non renseigné'}</span></div>
                            <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Contact :</span><span className="font-medium text-slate-900">{userProfile.contact || 'Non renseigné'}</span></div>
                          </div>
                        </div>
                        
                        {/* CHAMP DURÉE GLOBALE */}
                        <div className="mt-1 flex justify-center items-center gap-2 text-xs text-slate-700">
                          <span className="font-bold uppercase text-[9px]">Durée globale :</span>
                          {activeProject.isEditable ? (
                            <input
                              type="text"
                              value={activeProject.garData?.fiche?.duree || ''}
                              onChange={e => updateProject(p => {
                                if (!p.garData.fiche) p.garData.fiche = {};
                                p.garData.fiche.duree = e.target.value;
                              })}
                              className="border-b border-slate-300 bg-transparent focus:outline-none focus:border-red-600 text-center text-slate-900 font-medium px-2 py-0.5 w-52 text-xs"
                              placeholder="Ex: 2026 - 2030 (60 mois)..."
                            />
                          ) : (
                            <span className="font-medium text-slate-900">{activeProject.garData?.fiche?.duree || 'Non définie'}</span>
                          )}
                        </div>

                        {/* DESCRIPTION DU PORTEFEUILLE (Auto) */}
                        <div className="mt-2 flex flex-col items-center gap-1 w-full max-w-2xl">
                          <span className="font-bold uppercase text-[9px] text-slate-600 tracking-wider">Description du Portefeuille :</span>
                          <p className="font-medium text-slate-800 text-center text-xs w-full bg-slate-50 border border-slate-200 p-2 rounded-lg min-h-[36px] italic shadow-inner">
                            {activeProject.description || 'Aucune description renseignée.'}
                          </p>
                        </div>

                        {/* OBJECTIF GÉNÉRAL */}
                        <div className="mt-2 flex flex-col items-center gap-1 w-full max-w-2xl">
                          <span className="font-bold uppercase text-[9px] text-slate-600 tracking-wider">Objectif Général du Portefeuille :</span>
                          {activeProject.isEditable ? (
                            <textarea
                              value={activeProject.cadrageStrategique?.objectifGeneral || ''}
                              onChange={e => updateProject(p => {
                                if (!p.cadrageStrategique) p.cadrageStrategique = {};
                                p.cadrageStrategique.objectifGeneral = e.target.value;
                              })}
                              className="w-full border border-slate-200 bg-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-100 text-center text-slate-900 text-xs font-medium p-1.5 rounded shadow-inner resize-none custom-scrollbar"
                              placeholder="Renseignez l'objectif général ici..."
                              rows={2}
                            />
                          ) : (
                            <p className="font-medium text-slate-900 text-center text-xs w-full bg-slate-50 border border-slate-100 p-1.5 rounded min-h-[32px]">
                              {activeProject.cadrageStrategique?.objectifGeneral || 'Non défini'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {(activeProject.garData.rendement?.axes || []).map((axe: any, i: number) => {
                        if (!isAxeFocused(i)) return null;
                        return (
                          <div key={i} className="space-y-4">
                             <div className="bg-slate-800 text-white px-3.5 py-2 rounded-lg font-black uppercase text-xs sm:text-sm shadow-sm">
                               {axe.nom}
                             </div>
                             
                             {(axe.projets || []).map((proj: any, pIdx: number) => {
                                if (!isProjFocused(i, pIdx)) return null;
                                const problemDetail = activeProject.garData?.problems?.branches?.[i]?.details?.[pIdx] || {};
                                
                                const benefs = (activeProject.garData?.stakeholders?.beneficiaires || [])
                                  .filter((b: any) => b.axe === i + 1 && b.projetIndex === pIdx)
                                  .map((b: any) => b.nom)
                                  .join(', ') || '-';

                                return (
                                  <div key={pIdx} className="border border-slate-300 rounded-lg overflow-hidden shadow-xs bg-white sm:ml-2">
                                    <div className="bg-slate-200 px-3 py-1.5 border-b border-slate-300">
                                      <span className="font-bold text-slate-800 uppercase text-[9px] tracking-wider">Sous-Problème {pIdx + 1} (Projet {pIdx + 1}) : {proj.extrant}</span>
                                    </div>
                                    <table className="w-full gar-compact-table text-xs text-left border-collapse">
                                      <tbody>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 w-[34%] font-bold text-slate-800 border-r border-slate-300">Nom du Programme</td>
                                          <td className="p-2 font-black text-slate-900 uppercase"><EditableCell isEditable={activeProject.isEditable} value={axe.nom} onChange={v => updateProject(p => { p.garData.rendement.axes[i].nom = v; if (p.garData.problems.branches[i]) p.garData.problems.branches[i].axeName = v; })} placeholder="Nom du programme" /></td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">Intitulé du Projet</td>
                                          <td className="p-2 font-black text-red-900"><EditableCell isEditable={activeProject.isEditable} value={proj.extrant} onChange={v => updateProject(p => p.garData.rendement.axes[i].projets[pIdx].extrant = v)} placeholder="Intitulé du projet" type="textarea" /></td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">Orientation</td>
                                          <td className="p-2 font-medium text-slate-900"><EditableCell isEditable={activeProject.isEditable} value={activeProject.cadrageStrategique?.mission} onChange={v => updateProject(p => p.cadrageStrategique.mission = v)} placeholder="Mission / Orientation" type="textarea" /></td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">Objectif Général</td>
                                          <td className="p-2 font-medium text-slate-900 bg-slate-50"><EditableCell isEditable={false} value={activeProject.cadrageStrategique?.objectifGeneral} onChange={() => {}} type="textarea" placeholder="Renseigné automatiquement depuis l'en-tête..." /></td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">Durée d'exécution</td>
                                          <td className="p-2 font-black text-slate-900 bg-orange-50/30">{activeProject.garData?.fiche?.duree || '-'}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">Lieu</td>
                                          <td className="p-2 font-medium text-slate-900"><EditableCell isEditable={activeProject.isEditable} value={activeProject.garData?.fiche?.lieu} onChange={v => updateProject(p => p.garData.fiche.lieu = v)} placeholder="Lieu..." /></td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300">Bénéficiaires Directs</td>
                                          <td className="p-2 font-bold text-slate-900">{benefs}</td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300 align-top">Stratégie (Besoins)</td>
                                          <td className="p-0 font-medium text-slate-900">
                                            {ensureArray(problemDetail.besoin).map((bes, k) => (
                                              <div key={k} className={`p-2 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                <span className="text-[9px] font-black text-red-800 uppercase block mb-0.5">Besoin {k+1}</span>
                                                {bes}
                                              </div>
                                            ))}
                                          </td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300 align-top">Activités Proposées</td>
                                          <td className="p-0 font-medium text-slate-900">
                                            {ensureArray(proj.activites).map((act, k) => (
                                              <div key={k} className={`p-2 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                <span className="text-[9px] font-black text-red-800 uppercase block mb-0.5">Activité {k+1}</span>
                                                {act}
                                              </div>
                                            ))}
                                          </td>
                                        </tr>
                                        <tr className="border-b border-slate-200">
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300 align-middle">Coût Prévisionnel Total</td>
                                          <td className="p-2">
                                            {(() => {
                                              const effCost = getProjectEffectiveCost(proj);
                                              return <span className="inline-block px-2.5 py-1 bg-red-100 text-red-900 font-black rounded-md text-xs sm:text-sm border border-red-300">{effCost > 0 ? formatAmount(effCost) : proj.cout || '-'}</span>;
                                            })()}
                                          </td>
                                        </tr>
                                        <tr>
                                          <td className="p-2 bg-slate-100 font-bold text-slate-800 border-r border-slate-300 align-top rounded-bl-lg">Ressources (Intrants)</td>
                                          <td className="p-0 font-medium text-slate-900">
                                            {ensureArray(proj.activites).map((_act, k) => (
                                              <div key={k} className={`p-2 ${k > 0 ? 'border-t border-slate-200' : ''}`}>
                                                <div className="font-bold text-red-800 mb-1 text-[9px] uppercase">Pour l'Activité {k+1}</div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  <div>
                                                    <span className="font-bold text-[8px] uppercase text-slate-600">Ressources Humaines</span>
                                                    <EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_rh, k)} />
                                                  </div>
                                                  <div>
                                                    <span className="font-bold text-[8px] uppercase text-slate-600">Ressources Matérielles</span>
                                                    <EditableResourceList isEditable={false} items={getSafe2D(proj?.intrants_mat, k)} />
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )
                             })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RÉSUMÉ */}
                {activeSubTab === 'Résumé' && (
                  <div className="text-slate-900 overflow-y-auto max-h-[82vh] px-1 sm:px-2 custom-scrollbar">
                    <div className="text-center mb-5 pb-4 relative border-b-2 border-red-800">
                      <h1 className="text-lg sm:text-xl md:text-2xl font-black uppercase text-red-900 leading-tight">Gestion Axée sur les Résultats (GAR)</h1>
                      <h2 className="text-sm sm:text-base font-bold text-slate-700 mt-1">Entité : {activeProject.name}</h2>
                      {activeProject.garData?.fiche?.duree && (
                        <h3 className="text-xs font-bold text-red-700 mt-1 uppercase tracking-wider">Durée Globale : {activeProject.garData.fiche.duree}</h3>
                      )}

                      {/* RÉCAPITULATIF DU PROFIL DANS LE RÉSUMÉ */}
                      <div className="mt-3 max-w-2xl mx-auto bg-red-50/50 border border-red-200 rounded-lg p-2.5 text-left">
                        <div className="flex items-center justify-between mb-1 border-b border-red-200/70 pb-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-800 flex items-center gap-1">
                            <User size={11} /> Concepteur / Responsable du Dossier
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('profil')}
                            className="text-[9px] font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
                          >
                            Modifier le profil
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1 text-[11px] text-slate-800">
                          <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Nom & Prénoms :</span><span className="font-black text-slate-900">{userProfile.nomPrenoms || activeProject.designerName || 'Non renseigné'}</span></div>
                          <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Fonction :</span><span className="font-bold text-slate-900">{userProfile.fonction || activeProject.designerRole || 'Non renseignée'}</span></div>
                          <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Institution :</span><span className="font-bold text-slate-900">{userProfile.institution || 'Non renseignée'}</span></div>
                          <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Email :</span><span className="font-medium text-slate-900">{userProfile.email || activeProject.designerEmail || 'Non renseigné'}</span></div>
                          <div><span className="font-bold text-slate-500 text-[9px] uppercase block">Contact :</span><span className="font-medium text-slate-900">{userProfile.contact || 'Non renseigné'}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 mb-8">
                       <h3 className="text-sm sm:text-base font-black text-slate-900 border-l-4 border-red-600 pl-3 uppercase">Détails par Projets Opérationnels</h3>
                       {(activeProject.garData.rendement?.axes || []).map((axe: any, i: number) => {
                         if (!isAxeFocused(i)) return null;
                         return (
                           <div key={i} className="space-y-3">
                             <div className="bg-slate-800 text-white px-3.5 py-1.5 rounded-lg font-black uppercase text-xs">{axe.nom}</div>
                             {(axe.projets || []).map((proj: any, pIdx: number) => {
                               if (!isProjFocused(i, pIdx)) return null;
                               const effCost = getProjectEffectiveCost(proj);
                               return (
                                 <div key={pIdx} className="sm:ml-2 border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                                   <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                                     <span className="font-black text-red-900 text-[10px] uppercase tracking-wider">Sous-Problème {pIdx + 1} (Projet {pIdx + 1}) : {proj.extrant}</span>
                                     <span className="px-2.5 py-0.5 bg-red-100 text-red-900 border border-red-200 font-black rounded-full text-[10px] shadow-2xs">{effCost > 0 ? formatAmount(effCost) : proj.cout || '-'}</span>
                                   </div>
                                   <div className="p-3 space-y-2.5 text-xs">
                                     <div><span className="font-bold text-slate-600 uppercase text-[9px] block mb-0.5">Dénomination du Projet (Livrable)</span><p className="font-black text-slate-900 text-xs sm:text-sm">{proj.extrant}</p></div>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                       <div><span className="font-bold text-slate-600 uppercase text-[9px] block mb-0.5">Objectif Spécifique (Effet)</span><p className="font-medium text-slate-800 italic">{axe.effet}</p></div>
                                       <div><span className="font-bold text-slate-600 uppercase text-[9px] block mb-0.5">Période & Durée</span><p className="font-bold text-slate-900 whitespace-pre-line">{activeProject.garData?.fiche?.duree || '-'}</p></div>
                                     </div>
                                   </div>
                                 </div>
                               )
                             })}
                           </div>
                         )
                       })}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </main>
          </>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-5 max-w-md w-full mx-4 border border-slate-200 animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-full"><AlertCircle size={20} /></div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">{confirmModal.title}</h3>
            </div>
            <p className="text-slate-700 text-xs sm:text-sm mb-6 font-medium leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" onClick={closeConfirmModal}>Annuler</Button>
              <Button onClick={() => { if(confirmModal.onConfirm) confirmModal.onConfirm(); closeConfirmModal(); }} className="bg-red-600 hover:bg-red-700 text-white shadow-md border-transparent">
                Oui, supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
