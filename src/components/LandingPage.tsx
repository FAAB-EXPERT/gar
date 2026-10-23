import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Menu,
  Target,
  ShieldAlert,
  Save,
  Database,
  Share2,
  CheckCircle,
  Mail,
  Phone,
  Layers,
  FileCheck,
  Lock,
  Cpu,
} from 'lucide-react';
import { CurrencyCode, Language, ThemeMode, translations } from '../utils/i18n';

interface LandingPageProps {
  onOpenBurger: () => void;
  lang: Language;
  theme: ThemeMode;
  currency: CurrencyCode;
  activeProject: any;
  lastSavedStatus?: string;
}

export const LOGO_SRC = './assets/aistudio/LOGO_FAAB_GAR_06f40241.png';

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenBurger,
  lang,
  theme,
  currency,
  activeProject,
  lastSavedStatus,
}) => {
  const t = translations[lang];
  const isDark = theme === 'dark';
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const totalScroll = el.scrollHeight - el.clientHeight;
    if (totalScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const pct = Math.min(100, Math.max(0, Math.round((el.scrollTop / totalScroll) * 100)));
    setScrollProgress(pct);
  };

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      onScroll={handleScroll}
      className={`flex-1 h-full overflow-y-auto overflow-x-hidden relative scroll-smooth transition-colors duration-300 ${
        isDark ? 'bg-[#0f172a] text-slate-100' : 'bg-[#FFFFFF] text-slate-900'
      }`}
    >
      {/* SUBTLE FIXED THEMATIC WATERMARK IN BACKGROUND (pointer-events-none) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden select-none"
      >
        <div
          className={`w-[560px] h-[560px] md:w-[760px] md:h-[760px] rounded-full blur-3xl transition-opacity duration-500 ${
            isDark
              ? 'bg-gradient-to-tr from-red-900/15 via-rose-900/10 to-amber-900/10 opacity-60'
              : 'bg-gradient-to-r from-white via-red-50/40 to-orange-50/40 opacity-75'
          }`}
        />
        <img
          src={LOGO_SRC}
          alt=""
          className={`w-[300px] sm:w-[400px] md:w-[480px] object-contain transition-opacity duration-500 ${
            isDark ? 'opacity-[0.04] brightness-125' : 'opacity-[0.035] contrast-125'
          }`}
        />
      </div>

      {/* STICKY INSTITUTIONAL HEADER WITH BURGER ICON IMMEDIATELY LEFT OF ENLARGED LOGO + TITLE */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${
          isDark
            ? 'bg-[#0f172a]/95 border-slate-800 text-white'
            : 'bg-[#FFFFFF]/95 border-slate-200 text-slate-900'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 min-h-[76px] flex items-center justify-between gap-2">
          {/* Left: Burger Icon (☰) immediately left of Enlarged Logo + Full App Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <button
              onClick={onOpenBurger}
              aria-label="Menu"
              className={`p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-700'
                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
              }`}
              title={t.navExclusiveHint}
            >
              <Menu size={22} />
            </button>

            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <img
                src={LOGO_SRC}
                alt="Logo FAAB GAR"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg shrink-0"
              />
              <div className="flex flex-col shrink-0">
                <span
                  className={`font-black text-lg sm:text-xl tracking-tight leading-none whitespace-nowrap ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {t.appTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Center/Right: Internal Anchor Summary Links (Only internal scroll, never switches tabs) */}
          <nav className="hidden lg:flex items-center gap-1 text-xs font-bold">
            {[
              { id: 'sec-intro', label: t.anchorIntro },
              { id: 'sec-methode', label: t.anchorMethod },
              { id: 'sec-sauvegarde', label: t.anchorSaveGuide },
              { id: 'sec-ingenierie', label: t.anchorEngineering },
              { id: 'sec-legal', label: t.anchorLegal },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  isDark
                    ? 'text-slate-200 hover:text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:text-red-800 hover:bg-red-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right status badge (read-only indicator) */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] font-bold font-mono ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-red-300'
                  : 'bg-red-50/70 border-red-200 text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="truncate max-w-[140px]">{activeProject?.name || 'FAAB GAR'}</span>
              <span className="opacity-60">|</span>
              <span>{currency}</span>
            </div>
            <div
              className={`px-2 py-1 rounded text-[10px] font-mono font-black border ${
                isDark
                  ? 'bg-red-950/80 border-red-800 text-red-300'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
              title={t.scrollProgress}
            >
              {scrollProgress}%
            </div>
          </div>
        </div>

        {/* Scroll Progress Bar (0% to 100%) */}
        <div className={`w-full h-1 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-red-700 via-red-500 to-amber-500 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </header>

      {/* MAIN CONTENT WITH ALTERNATING LEFT/RIGHT SKROLL REVEAL */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-12 sm:space-y-16">
        {/* SECTION 1: HERO PRESENTATION (Arrives from Left x: -85 -> 0)
            Light Mode: White background with subtle gradient tending to the right + dark readable text.
            Dark Mode: Dark slate background with crimson gradient tending to the right + light readable text. */}
        <motion.section
          id="sec-intro"
          initial={{ opacity: 0, x: -85 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className={`rounded-2xl p-6 sm:p-9 border shadow-lg relative overflow-hidden ${
            isDark
              ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-red-950/75 border-red-900/60 text-white'
              : 'bg-gradient-to-r from-[#FFFFFF] via-[#FFFFFF] to-red-50/90 border-red-200 text-slate-900'
          }`}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3.5 max-w-2xl">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border font-bold text-xs uppercase tracking-widest ${
                  isDark
                    ? 'bg-red-500/20 border-red-400/30 text-red-300'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <Target size={14} /> {t.heroBadge}
              </div>
              <h1
                className={`text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {t.heroTitle1} <br />
                <span className={isDark ? 'text-red-400' : 'text-red-700'}>{t.heroTitle2}</span>
              </h1>
              <p
                className={`text-xs sm:text-sm leading-relaxed ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {t.heroDesc}
              </p>

              {/* Notice explaining strict navigation via Burger Menu (Non-redirecting) */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  isDark
                    ? 'bg-slate-950/70 border-red-500/40 text-red-200'
                    : 'bg-red-50/80 border-red-200 text-red-900'
                }`}
              >
                <Menu
                  size={17}
                  className={`shrink-0 mt-0.5 ${isDark ? 'text-red-400' : 'text-red-700'}`}
                />
                <p className="text-xs font-semibold leading-snug">{t.strictBurgerNotice}</p>
              </div>
            </div>

            <div
              className={`flex flex-col items-center justify-center p-5 rounded-2xl border shrink-0 mx-auto md:mx-0 ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-white/95 border-red-100 shadow-sm'
              }`}
            >
              <img
                src={LOGO_SRC}
                alt="Logo Officiel FAAB GAR"
                className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain drop-shadow-md"
              />
              <span
                className={`mt-2 text-xs sm:text-sm font-black tracking-widest uppercase ${
                  isDark ? 'text-red-400' : 'text-red-700'
                }`}
              >
                {t.appTitle}
              </span>
              {lastSavedStatus && (
                <span
                  className={`mt-1 text-[10px] font-mono ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {lastSavedStatus}
                </span>
              )}
            </div>
          </div>
        </motion.section>

        {/* SECTION 2: 4-STAGE GAR ARCHITECTURE (Cards alternating Left / Right) */}
        <section id="sec-methode" className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: 85 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-1.5"
          >
            <div
              className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${
                isDark ? 'text-red-400' : 'text-red-700'
              }`}
            >
              <Layers size={15} /> {t.anchorMethod}
            </div>
            <h2
              className={`text-lg sm:text-2xl font-black tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {t.methodTitle}
            </h2>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t.methodSubtitle}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {t.phases.map((phase, idx) => {
              const fromLeft = idx % 2 === 0;
              return (
                <motion.div
                  key={phase.code}
                  initial={{ opacity: 0, x: fromLeft ? -85 : 85 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`p-4 sm:p-5 rounded-xl border transition-colors ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                        isDark
                          ? 'bg-red-950/80 text-red-300 border-red-800'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {phase.code}
                    </span>
                    <CheckCircle size={15} className={isDark ? 'text-red-400' : 'text-red-600'} />
                  </div>
                  <h3
                    className={`text-sm sm:text-base font-black mb-1 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {phase.title}
                  </h3>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {phase.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: PEDAGOGICAL JSON SAVE / OVERWRITE & INDEXEDDB GUIDE */}
        <section id="sec-sauvegarde" className="space-y-5">
          <motion.div
            initial={{ opacity: 0, x: -85 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`p-5 sm:p-7 rounded-2xl border ${
              isDark
                ? 'bg-slate-900 border-red-900/60 text-slate-100'
                : 'bg-gradient-to-r from-white via-white to-red-50/50 border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div
              className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-2 ${
                isDark ? 'text-red-400' : 'text-red-700'
              }`}
            >
              <Save size={15} /> {t.saveGuideBadge}
            </div>
            <h2
              className={`text-lg sm:text-xl font-black mb-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {t.saveGuideTitle}
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed mb-5 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              {t.saveGuideIntro}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Left block: HOW */}
              <motion.div
                initial={{ opacity: 0, x: -85 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`p-4 sm:p-5 rounded-xl border ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-black text-xs sm:text-sm mb-2.5 ${
                    isDark ? 'text-amber-400' : 'text-amber-700'
                  }`}
                >
                  <Database size={16} />
                  <span>{t.saveHowTitle}</span>
                </div>
                <ol className="space-y-2 text-xs leading-relaxed list-decimal pl-4">
                  {t.saveHowSteps.map((step, i) => (
                    <li key={i} className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                      {step}
                    </li>
                  ))}
                </ol>
              </motion.div>

              {/* Right block: WHY */}
              <motion.div
                initial={{ opacity: 0, x: 85 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.2 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`p-4 sm:p-5 rounded-xl border ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                }`}
              >
                <div
                  className={`flex items-center gap-2 font-black text-xs sm:text-sm mb-2.5 ${
                    isDark ? 'text-red-400' : 'text-red-700'
                  }`}
                >
                  <Share2 size={16} />
                  <span>{t.saveWhyTitle}</span>
                </div>
                <div className="space-y-2.5">
                  {t.saveWhyReasons.map((reason, i) => (
                    <div key={i} className="space-y-0.5">
                      <h4
                        className={`text-xs font-black ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {reason.title}
                      </h4>
                      <p
                        className={`text-[11px] leading-snug ${
                          isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {reason.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* SECTION 4: CONCEPTION & ENGINEERING + CONFIDENTIALITY & IP AGREEMENT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Conception & Engineering (From Left) */}
          <motion.section
            id="sec-ingenierie"
            initial={{ opacity: 0, x: -85 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`lg:col-span-5 p-5 rounded-2xl border flex flex-col justify-between ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}
          >
            <div className="space-y-2.5">
              <div
                className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest ${
                  isDark ? 'text-red-400' : 'text-red-700'
                }`}
              >
                <Cpu size={15} /> {t.engBadge}
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-wide">KOFFIE FABIEN MICHAEL</h3>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {t.engRole}
              </p>
              <div
                className={`pt-2.5 border-t space-y-1.5 text-xs font-mono ${
                  isDark ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mail size={14} className={isDark ? 'text-red-400' : 'text-red-600'} />
                  <span className="break-all">fabien.frikupgeneration@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className={isDark ? 'text-red-400' : 'text-red-600'} />
                  <span>00225 0748082739</span>
                </div>
              </div>
            </div>

            <div
              className={`mt-5 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}
            >
              <span
                className={`font-bold flex items-center gap-1 ${
                  isDark ? 'text-red-400' : 'text-red-700'
                }`}
              >
                <FileCheck size={14} /> IndexedDB + JSON + PDF
              </span>
              <span className="font-mono opacity-75">v2.5 Enterprise</span>
            </div>
          </motion.section>

          {/* Confidentiality & IP Agreement (From Right) */}
          <motion.section
            id="sec-legal"
            initial={{ opacity: 0, x: 85 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`lg:col-span-7 p-5 rounded-2xl border relative overflow-hidden ${
              isDark
                ? 'bg-red-950/30 border-red-900/60 text-slate-100'
                : 'bg-red-50/70 border-red-200 text-slate-900'
            }`}
          >
            <div
              className={`flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider mb-2.5 ${
                isDark ? 'text-red-400' : 'text-red-700'
              }`}
            >
              <Lock size={15} />
              <span>{t.legalTitle}</span>
            </div>
            <p className="text-xs leading-relaxed text-justify">{t.legalText}</p>
            <div
              className={`mt-3.5 flex items-center gap-2 text-[11px] font-bold ${
                isDark ? 'text-red-300' : 'text-red-800'
              }`}
            >
              <ShieldAlert size={14} />
              <span>© {new Date().getFullYear()} KOFFIE FABIEN MICHAEL — Protection Intégrale</span>
            </div>
          </motion.section>
        </div>
      </div>

      {/* INSTITUTIONAL FOOTER WITH ENLARGED OFFICIAL LOGO */}
      <footer
        className={`relative z-10 border-t mt-10 py-6 px-4 sm:px-6 transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-300'
            : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={LOGO_SRC}
              alt="Logo FAAB GAR"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-lg"
            />
            <div>
              <div
                className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {t.appTitle} — {t.appSubtitle}
              </div>
              <div className="text-[11px]">
                © {new Date().getFullYear()} KOFFIE FABIEN MICHAEL. {t.footerRights}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-center sm:text-right">
            <span>IndexedDB Realtime • Multi-Devises ({currency}) • FR/EN • Export PDF Direct</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
