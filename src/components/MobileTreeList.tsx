import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { CurrencyCode, formatCurrencyAmount, Language } from '../utils/i18n';

interface MobileProblemListProps {
  activeProject: any;
  updateProject: (fn: (p: any) => void) => void;
  handleAddAxe: () => void;
  handleDeleteAxe: (i: number, name: string) => void;
  handleAddProject: (i: number) => void;
  handleDeleteProject: (i: number, j: number, name: string) => void;
  handleAddCauseActivity: (i: number, j: number) => void;
  handleRemoveCauseActivity: (i: number, j: number, k: number) => void;
  ensureArray: (v: any) => string[];
  lang: Language;
}

export const MobileProblemList: React.FC<MobileProblemListProps> = ({
  activeProject,
  updateProject,
  handleAddAxe,
  handleDeleteAxe,
  handleAddProject,
  handleDeleteProject,
  handleAddCauseActivity,
  handleRemoveCauseActivity,
  ensureArray,
  lang,
}) => {
  const branches = activeProject.garData?.problems?.branches || [];
  return (
    <div className="space-y-3 p-1.5 sm:p-3 max-w-4xl mx-auto w-full">
      {/* Racine: Conséquence Globale */}
      <div className="bg-red-900 text-white p-3 rounded-lg shadow-sm border border-red-700">
        <div className="text-[9px] uppercase font-black text-red-200 tracking-widest mb-1">
          {lang === 'fr' ? 'Conséquence Globale (Impact Négatif)' : 'Global Negative Impact'}
        </div>
        {activeProject.isEditable ? (
          <textarea
            className="w-full bg-red-950/70 text-white text-[11px] sm:text-xs font-bold border border-red-500 rounded p-1.5 focus:outline-none resize-none"
            value={activeProject.garData?.problems?.consequenceGlobale || ''}
            onChange={(e) =>
              updateProject((p) => (p.garData.problems.consequenceGlobale = e.target.value))
            }
            rows={2}
          />
        ) : (
          <p className="font-bold text-[11px] sm:text-xs text-white">
            {activeProject.garData?.problems?.consequenceGlobale || '-'}
          </p>
        )}
      </div>

      {activeProject.isEditable && (
        <button
          onClick={handleAddAxe}
          className="w-full py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
        >
          <Plus size={12} /> {lang === 'fr' ? 'Ajouter un Service / Axe' : 'Add Department / Axis'}
        </button>
      )}

      {branches.map((branch: any, i: number) => (
        <div
          key={i}
          className="border border-red-300 bg-red-50/80 dark:bg-slate-900 dark:border-red-900/70 rounded-lg p-2.5 sm:p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              {activeProject.isEditable ? (
                <input
                  type="text"
                  className="bg-white border border-red-300 text-red-900 px-1.5 py-0.5 rounded text-[10px] font-black uppercase w-28"
                  value={branch.axeName?.includes('Service') ? branch.axeName : `Service ${i + 1}`}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith('Service ')) val = 'Service ';
                    updateProject((p) => {
                      p.garData.problems.branches[i].axeName = val;
                      if (p.garData.rendement.axes[i]) p.garData.rendement.axes[i].nom = val;
                    });
                  }}
                />
              ) : (
                <span className="font-black text-[10px] uppercase text-red-800 dark:text-red-300">
                  {branch.axeName || `Service ${i + 1}`}
                </span>
              )}
              <span className="text-[9px] font-black uppercase text-red-700 dark:text-red-400">
                {lang === 'fr' ? ': Problème Central' : ': Central Problem'}
              </span>
            </div>
            {activeProject.isEditable && (
              <button
                onClick={() => handleDeleteAxe(i, branch.axeName)}
                className="text-red-600 hover:text-red-800 p-1 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>

          {activeProject.isEditable ? (
            <textarea
              className="w-full bg-white text-slate-900 text-[11px] font-bold border border-red-200 rounded p-1.5"
              value={branch.central || ''}
              onChange={(e) =>
                updateProject((p) => (p.garData.problems.branches[i].central = e.target.value))
              }
              rows={2}
            />
          ) : (
            <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
              {branch.central || '-'}
            </p>
          )}

          {/* Branches / Contraintes */}
          <div className="space-y-2 pl-2 border-l-2 border-red-300">
            {(branch.details || []).map((detail: any, j: number) => {
              const causesArr = ensureArray(detail.cause);
              const besoinsArr = ensureArray(detail.besoin);
              const actArr = ensureArray(
                activeProject.garData.rendement.axes[i]?.projets?.[j]?.activites
              );
              const maxLen = Math.max(causesArr.length, actArr.length, besoinsArr.length, 1);
              const causes = Array.from({ length: maxLen }, (_, idx) => causesArr[idx] || '');
              const besoins = Array.from({ length: maxLen }, (_, idx) => besoinsArr[idx] || '');

              return (
                <div
                  key={j}
                  className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-900">
                      Branche {j + 1} — {lang === 'fr' ? 'Contrainte' : 'Constraint'} {j + 1}
                    </span>
                    {activeProject.isEditable && (
                      <button
                        onClick={() => handleDeleteProject(i, j, '')}
                        className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  {activeProject.isEditable ? (
                    <textarea
                      className="w-full bg-orange-50/70 text-slate-900 text-[11px] font-bold border border-orange-200 rounded p-1.5"
                      value={detail.contrainte || ''}
                      onChange={(e) =>
                        updateProject(
                          (p) =>
                            (p.garData.problems.branches[i].details[j].contrainte = e.target.value)
                        )
                      }
                      rows={2}
                    />
                  ) : (
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                      {detail.contrainte || '-'}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {causes.map((c, k) => (
                      <div
                        key={k}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 relative"
                      >
                        <div>
                          <label className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 block mb-0.5">
                            {lang === 'fr' ? `Cause Profonde ${k + 1}` : `Root Cause ${k + 1}`}
                          </label>
                          {activeProject.isEditable ? (
                            <textarea
                              className="w-full bg-white text-slate-900 text-[10px] border border-amber-200 rounded p-1"
                              value={c}
                              onChange={(e) =>
                                updateProject((p) => {
                                  const arr = ensureArray(
                                    p.garData.problems.branches[i].details[j].cause
                                  );
                                  arr[k] = e.target.value;
                                  p.garData.problems.branches[i].details[j].cause = arr;
                                })
                              }
                              rows={2}
                            />
                          ) : (
                            <p className="text-[10px] text-slate-900 dark:text-slate-100">
                              {c || '-'}
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">
                              {lang === 'fr' ? `Besoin ${k + 1}` : `Need ${k + 1}`}
                            </label>
                            {activeProject.isEditable && causes.length > 1 && (
                              <button
                                onClick={() => handleRemoveCauseActivity(i, j, k)}
                                className="text-red-500 text-[10px] cursor-pointer"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                          {activeProject.isEditable ? (
                            <textarea
                              className="w-full bg-white text-slate-900 text-[10px] border border-slate-300 rounded p-1"
                              value={besoins[k] || ''}
                              onChange={(e) =>
                                updateProject((p) => {
                                  const arr = ensureArray(
                                    p.garData.problems.branches[i].details[j].besoin
                                  );
                                  arr[k] = e.target.value;
                                  p.garData.problems.branches[i].details[j].besoin = arr;
                                })
                              }
                              rows={2}
                            />
                          ) : (
                            <p className="text-[10px] text-slate-900 dark:text-slate-100">
                              {besoins[k] || '-'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {activeProject.isEditable && (
                    <button
                      onClick={() => handleAddCauseActivity(i, j)}
                      className="w-full py-1 text-[9px] font-bold uppercase text-red-700 bg-red-50 hover:bg-red-100 rounded border border-dashed border-red-300 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={10} />{' '}
                      {lang === 'fr' ? 'Ajouter Cause & Besoin' : 'Add Root Cause & Need'}
                    </button>
                  )}
                </div>
              );
            })}

            {activeProject.isEditable && (
              <button
                onClick={() => handleAddProject(i)}
                className="w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-[9px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={11} />{' '}
                {lang === 'fr' ? 'Ajouter une Branche / Projet' : 'Add Branch / Project'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface MobileSolutionListProps {
  activeProject: any;
  updateProject: (fn: (p: any) => void) => void;
  ensureArray: (v: any) => string[];
  getSafe2D: (arr: any, k: number) => any[];
  updateIntrants: (axeIdx: number, projIdx: number, actIdx: number, field: string, val: any) => void;
  EditableResourceList: React.FC<any>;
  calculateActivityTotal: (proj: any, k: number) => { sum: number; hasAmounts: boolean };
  currency: CurrencyCode;
  lang: Language;
}

export const MobileSolutionList: React.FC<MobileSolutionListProps> = ({
  activeProject,
  updateProject,
  ensureArray,
  getSafe2D,
  updateIntrants,
  EditableResourceList,
  calculateActivityTotal,
  currency,
  lang,
}) => {
  const axes = activeProject.garData?.rendement?.axes || [];
  return (
    <div className="space-y-3 p-1.5 sm:p-3 max-w-4xl mx-auto w-full">
      {/* Impact Global */}
      <div className="bg-red-800 text-white p-3 rounded-lg shadow-sm border border-red-700">
        <div className="text-[9px] uppercase font-black text-red-200 tracking-widest mb-1">
          {lang === 'fr' ? 'Impact Global (Objectif Global)' : 'Global Positive Impact'}
        </div>
        {activeProject.isEditable ? (
          <textarea
            className="w-full bg-red-950/60 text-white text-[11px] sm:text-xs font-bold border border-red-500 rounded p-1.5 focus:outline-none resize-none"
            value={activeProject.garData?.rendement?.impact || ''}
            onChange={(e) =>
              updateProject((p) => (p.garData.rendement.impact = e.target.value))
            }
            rows={2}
          />
        ) : (
          <p className="font-bold text-[11px] sm:text-xs text-white">
            {activeProject.garData?.rendement?.impact || '-'}
          </p>
        )}
      </div>

      {axes.map((axe: any, i: number) => (
        <div
          key={i}
          className="border border-red-300 bg-red-50/60 dark:bg-slate-900 dark:border-red-900/60 rounded-lg p-2.5 sm:p-3 space-y-2"
        >
          <div className="text-[10px] font-black uppercase text-red-800 dark:text-red-400">
            {axe.nom || `Service ${i + 1}`} — {lang === 'fr' ? 'EFFET' : 'OUTCOME'}
          </div>
          {activeProject.isEditable ? (
            <textarea
              className="w-full bg-white text-slate-900 text-[11px] font-bold border border-red-300 rounded p-1.5"
              value={axe.effet || ''}
              onChange={(e) =>
                updateProject((p) => (p.garData.rendement.axes[i].effet = e.target.value))
              }
              rows={2}
            />
          ) : (
            <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
              {axe.effet || '-'}
            </p>
          )}

          <div className="space-y-2 pl-2 border-l-2 border-red-400">
            {(axe.projets || []).map((proj: any, j: number) => {
              const activites = Array.from(
                {
                  length: Math.max(
                    ensureArray(activeProject.garData.problems?.branches?.[i]?.details?.[j]?.cause)
                      .length,
                    ensureArray(proj.activites).length,
                    1
                  ),
                },
                (_, idx) => ensureArray(proj.activites)[idx] || ''
              );

              return (
                <div
                  key={j}
                  className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2"
                >
                  <div className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-900 inline-block">
                    Branche {j + 1} — {lang === 'fr' ? 'Extrant (Livrable)' : 'Output (Deliverable)'}{' '}
                    {j + 1}
                  </div>
                  {activeProject.isEditable ? (
                    <textarea
                      className="w-full bg-red-50/50 text-slate-900 text-[11px] font-bold border border-red-200 rounded p-1.5"
                      value={proj.extrant || ''}
                      onChange={(e) =>
                        updateProject(
                          (p) => (p.garData.rendement.axes[i].projets[j].extrant = e.target.value)
                        )
                      }
                      rows={2}
                    />
                  ) : (
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                      {proj.extrant || '-'}
                    </p>
                  )}

                  <div className="space-y-1.5">
                    {activites.map((act, k) => {
                      const { sum } = calculateActivityTotal(proj, k);
                      return (
                        <div
                          key={k}
                          className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase text-red-700 dark:text-red-400">
                              {lang === 'fr' ? `Activité ${k + 1}` : `Activity ${k + 1}`}
                            </span>
                            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-red-100 text-red-900">
                              {formatCurrencyAmount(sum, currency)}
                            </span>
                          </div>
                          {activeProject.isEditable ? (
                            <textarea
                              className="w-full bg-white text-slate-900 text-[10px] border border-red-200 rounded p-1"
                              value={act}
                              onChange={(e) =>
                                updateProject((p) => {
                                  const arr = ensureArray(
                                    p.garData.rendement.axes[i].projets[j].activites
                                  );
                                  arr[k] = e.target.value;
                                  p.garData.rendement.axes[i].projets[j].activites = arr;
                                })
                              }
                              rows={2}
                            />
                          ) : (
                            <p className="text-[10px] text-slate-900 dark:text-slate-100">
                              {act || '-'}
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            <div>
                              <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-0.5">
                                {lang === 'fr' ? 'Ressources Humaines' : 'Human Resources'}
                              </span>
                              <EditableResourceList
                                isEditable={activeProject.isEditable}
                                items={getSafe2D(proj?.intrants_rh, k)}
                                onChange={(v: any) => updateIntrants(i, j, k, 'intrants_rh', v)}
                                placeholderLabel="Poste..."
                              />
                            </div>
                            <div>
                              <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-300 block mb-0.5">
                                {lang === 'fr' ? 'Ressources Matérielles' : 'Material Resources'}
                              </span>
                              <EditableResourceList
                                isEditable={activeProject.isEditable}
                                items={getSafe2D(proj?.intrants_mat, k)}
                                onChange={(v: any) => updateIntrants(i, j, k, 'intrants_mat', v)}
                                placeholderLabel="Équipement..."
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
