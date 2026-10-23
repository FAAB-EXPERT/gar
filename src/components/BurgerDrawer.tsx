import React from 'react';
import {
  X,
  Download,
  Save,
  Upload,
  Printer,
  Sun,
  Moon,
  Globe,
  Coins,
  FolderOpen,
} from 'lucide-react';
import { CurrencyCode, Language, ThemeMode, translations } from '../utils/i18n';
import { LOGO_SRC } from './LandingPage';

interface BurgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (item: any) => void;
  menuItems: any[];
  // 4 Top Icon Actions
  onImportJson: () => void;
  onSaveOverwriteJson: () => void;
  onExportJsonCopy: () => void;
  onDownloadPdf: () => void;
  // Selectors
  portfolios: any[];
  activeProject: any;
  onSelectPortfolio: (port: any) => void;
  onCreateNewPortfolio: () => void;
  currency: CurrencyCode;
  onChangeCurrency: (c: CurrencyCode) => void;
  lang: Language;
  onChangeLang: (l: Language) => void;
  theme: ThemeMode;
  onChangeTheme: (t: ThemeMode) => void;
  lastFileName?: string;
}

export const BurgerDrawer: React.FC<BurgerDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  menuItems,
  onImportJson,
  onSaveOverwriteJson,
  onExportJsonCopy,
  onDownloadPdf,
  portfolios,
  activeProject,
  onSelectPortfolio,
  onCreateNewPortfolio,
  currency,
  onChangeCurrency,
  lang,
  onChangeLang,
  theme,
  onChangeTheme,
  lastFileName,
}) => {
  if (!isOpen) return null;

  const t = translations[lang];
  const isDark = theme === 'dark';
  const activePortfolios = portfolios.filter((p) => !p.isTrashed);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-out Panel */}
      <aside
        className={`relative z-10 w-76 sm:w-80 max-w-[90vw] h-full flex flex-col shadow-2xl border-r transition-colors overflow-hidden ${
          isDark
            ? 'bg-[#0f172a] border-slate-800 text-slate-100'
            : 'bg-[#FFFFFF] border-slate-200 text-slate-900'
        }`}
      >
        {/* 1. TOP HORIZONTAL ICON ACTION BAR (Strictly 4 action icons above Home tab) */}
        <div
          className={`px-3 py-2 border-b flex items-center justify-between gap-1.5 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 justify-around">
            {/* 1) Importer JSON (<Download />) */}
            <button
              onClick={onImportJson}
              title={t.importJson}
              aria-label={t.importJson}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-red-300 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-red-700 hover:bg-red-50 shadow-2xs'
              }`}
            >
              <Download size={17} />
            </button>

            {/* 2) Enregistrer / Mettre à jour JSON (<Save />) */}
            <button
              onClick={onSaveOverwriteJson}
              title={`${t.saveOverwriteJson}${lastFileName ? ` (${lastFileName})` : ''}`}
              aria-label={t.saveOverwriteJson}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isDark
                  ? 'bg-red-900/80 border-red-700 text-white hover:bg-red-800'
                  : 'bg-red-600 border-red-700 text-white hover:bg-red-700 shadow-2xs'
              }`}
            >
              <Save size={17} />
            </button>

            {/* 3) Exporter JSON (<Upload />) */}
            <button
              onClick={onExportJsonCopy}
              title={t.exportJsonCopy}
              aria-label={t.exportJsonCopy}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-amber-700 hover:bg-amber-50 shadow-2xs'
              }`}
            >
              <Upload size={17} />
            </button>

            {/* 4) Télécharger le rapport en PDF (<Printer />) */}
            <button
              onClick={onDownloadPdf}
              title={t.downloadPdfReport}
              aria-label={t.downloadPdfReport}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isDark
                  ? 'bg-red-950 border-red-800 text-red-200 hover:bg-red-900'
                  : 'bg-red-800 border-red-900 text-white hover:bg-red-900 shadow-2xs'
              }`}
            >
              <Printer size={17} />
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer"
            className={`p-1.5 rounded-lg cursor-pointer ${
              isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. BRAND HEADER INSIDE MENU (ENLARGED LOGO) */}
        <div
          className={`px-3 py-2.5 border-b flex items-center gap-2.5 ${
            isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
          }`}
        >
          <img
            src={LOGO_SRC}
            alt="Logo FAAB GAR"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div
              className={`font-black text-base tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {t.appTitle}
            </div>
            <div
              className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-normal leading-snug break-words mt-0.5 ${
                isDark ? 'text-red-400' : 'text-red-700'
              }`}
            >
              {t.appSubtitle}
            </div>
            {lastFileName && (
              <div
                className={`text-[9px] font-mono truncate mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                JSON: {lastFileName}
              </div>
            )}
          </div>
        </div>

        {/* SCROLLABLE BODY: SELECTORS + NAVIGATION TABS */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-3 custom-scrollbar">
          {/* INTEGRATED SELECTORS BLOCK */}
          <div
            className={`p-2.5 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            {/* A) Active Portfolio / Project Selector + Unlimited Creation (No personal fields here) */}
            <div className="space-y-1.5">
              <label
                className={`flex items-center justify-between text-[10px] font-black uppercase tracking-wider ${
                  isDark ? 'text-red-400' : 'text-red-700'
                }`}
              >
                <span className="flex items-center gap-1">
                  <FolderOpen size={12} /> {t.activePortfolioLabel}
                </span>
                <span className="font-mono">({activePortfolios.length})</span>
              </label>
              <select
                value={activeProject?.id || ''}
                onChange={(e) => {
                  const found = activePortfolios.find((p) => p.id === e.target.value);
                  if (found) onSelectPortfolio(found);
                }}
                className={`w-full text-[11px] font-bold rounded-lg px-2 py-1.5 border outline-none cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {activePortfolios.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* B) Currency Selector (FCFA, EUR, USD) */}
            <div
              className={`pt-2 border-t space-y-1 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <label
                className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <Coins size={12} className={isDark ? 'text-red-400' : 'text-red-600'} />{' '}
                {t.currencyLabel}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['FCFA', 'EUR', 'USD'] as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => onChangeCurrency(c)}
                    className={`py-1 px-1.5 rounded text-[10px] font-mono font-black border cursor-pointer transition-colors ${
                      currency === c
                        ? 'bg-red-600 border-red-600 text-white'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {c === 'FCFA' ? 'FCFA' : c === 'EUR' ? '€ EUR' : '$ USD'}
                  </button>
                ))}
              </div>
            </div>

            {/* C) Language & Theme Selectors */}
            <div
              className={`pt-2 border-t grid grid-cols-2 gap-2 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <label
                  className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  <Globe size={11} className={isDark ? 'text-red-400' : 'text-red-600'} />{' '}
                  {t.languageLabel}
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {(['fr', 'en'] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => onChangeLang(l)}
                      className={`py-1 rounded text-[10px] font-black uppercase border cursor-pointer ${
                        lang === l
                          ? 'bg-red-600 border-red-600 text-white'
                          : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-200'
                          : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label
                  className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {isDark ? (
                    <Moon size={11} className="text-red-400" />
                  ) : (
                    <Sun size={11} className="text-red-600" />
                  )}{' '}
                  {t.themeLabel}
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => onChangeTheme('light')}
                    className={`py-1 rounded text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                      theme === 'light'
                        ? 'bg-red-600 border-red-600 text-white'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <Sun size={11} /> {lang === 'fr' ? 'Clair' : 'Light'}
                  </button>
                  <button
                    onClick={() => onChangeTheme('dark')}
                    className={`py-1 rounded text-[10px] font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-red-600 border-red-600 text-white'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  >
                    <Moon size={11} /> {lang === 'fr' ? 'Sombre' : 'Dark'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. NAVIGATION TABS LIST */}
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <React.Fragment key={item.id}>
                  {item.id === 'arbre' && (
                    <div
                      className={`px-2 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-widest ${
                        isDark ? 'text-red-400' : 'text-red-700'
                      }`}
                    >
                      {t.catPrep}
                    </div>
                  )}
                  {item.id === 'terrain' && (
                    <div
                      className={`px-2 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-widest ${
                        isDark ? 'text-red-400' : 'text-red-700'
                      }`}
                    >
                      {t.catIdentification}
                    </div>
                  )}
                  {item.id === 'rendement' && (
                    <div
                      className={`px-2 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-widest ${
                        isDark ? 'text-red-400' : 'text-red-700'
                      }`}
                    >
                      {t.catPlanification}
                    </div>
                  )}
                  {item.id === 'extrants' && (
                    <div
                      className={`px-2 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-widest ${
                        isDark ? 'text-red-400' : 'text-red-700'
                      }`}
                    >
                      {t.catProgrammation}
                    </div>
                  )}
                  {item.id === 'fiche' && (
                    <div
                      className={`px-2 pt-2.5 pb-1 text-[9px] font-black uppercase tracking-widest ${
                        isDark ? 'text-red-400' : 'text-red-700'
                      }`}
                    >
                      {t.catConclusion}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onSelectTab(item);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-red-600 text-white shadow-xs'
                        : isDark
                        ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-800 hover:bg-red-50 hover:text-red-900'
                    }`}
                  >
                    <Icon
                      size={15}
                      className={isActive ? 'text-white' : isDark ? 'text-red-400' : 'text-red-600'}
                    />
                    <span className="truncate text-left flex-1">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};
