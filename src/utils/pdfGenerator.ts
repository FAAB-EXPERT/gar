import { jsPDF } from 'jspdf';
import { CurrencyCode, formatCurrencyAmount, Language } from './i18n';
import { UserProfile } from './db';

const ensureArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : v?.label || '')).filter(Boolean);
  if (typeof val === 'string')
    return val
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  return [String(val)];
};

const getSafe2D = (arr: any, k: number) => {
  if (!Array.isArray(arr)) return [];
  if (arr.length > 0 && !Array.isArray(arr[0])) return k === 0 ? arr : [];
  return arr[k] || [];
};

const parseAmount = (val: any): number => {
  if (!val) return 0;
  const cleaned = val
    .toString()
    .replace(/\s+/g, '')
    .replace(/FCFA|CFA|EUR|USD|€|\$|F/gi, '')
    .replace(',', '.');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  return isNaN(num) ? 0 : num;
};

const calculateActivityTotal = (proj: any, k: number): number => {
  let sum = 0;
  const process = (items: any) => {
    if (!Array.isArray(items)) return;
    items.forEach((item: any) => {
      if (typeof item === 'object' && item?.amount) {
        const val = parseAmount(item.amount);
        if (val > 0) sum += val;
      }
    });
  };
  process(getSafe2D(proj?.intrants_rh, k));
  process(getSafe2D(proj?.intrants_mat, k));
  return sum;
};

const getProjectEffectiveCost = (proj: any): number => {
  if (!proj) return 0;
  const actCount = Math.max(ensureArray(proj.activites).length, 1);
  let total = 0;
  for (let k = 0; k < actCount; k++) {
    total += calculateActivityTotal(proj, k);
  }
  return total;
};

export function generateDirectGARPdf(
  project: any,
  currency: CurrencyCode = 'FCFA',
  lang: Language = 'fr',
  userProfile?: UserProfile
): void {
  if (!project) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Enforce 100% pure white background (#FFFFFF) on every page regardless of app theme
  const paintPureWhiteBackground = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  paintPureWhiteBackground();

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      paintPureWhiteBackground();
      y = margin;
    }
  };

  const drawSectionHeader = (title: string, r = 153, g = 27, b = 27) => {
    checkPageBreak(14);
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), margin + 3, y + 5.5);
    y += 11;
    doc.setTextColor(15, 23, 42);
  };

  const drawKeyValueRow = (label: string, value: string, highlight = false) => {
    const safeVal = value && value.trim() !== '' ? value.trim() : '-';
    const lines = doc.splitTextToSize(safeVal, contentWidth - 52);
    const rowHeight = Math.max(lines.length * 4.5 + 3, 7.5);
    checkPageBreak(rowHeight + 1);

    // Label cell
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, 48, rowHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    const labelLines = doc.splitTextToSize(label, 44);
    doc.text(labelLines, margin + 2, y + 4.5);

    // Value cell
    if (highlight) {
      doc.setFillColor(254, 242, 242);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin + 48, y, contentWidth - 48, rowHeight, 'FD');
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(highlight ? 153 : 15, highlight ? 27 : 23, highlight ? 27 : 42);
    doc.text(lines, margin + 50, y + 4.5);

    y += rowHeight;
  };

  const profileInstitution = userProfile?.institution || project.institution || '-';
  const profileName = userProfile?.nomPrenoms || project.designerName || '-';
  const profileRole = userProfile?.fonction || project.designerRole || '-';
  const profileEmail = userProfile?.email || project.designerEmail || '-';
  const profileContact = userProfile?.contact || '-';

  // --- HEADER BANNER ---
  doc.setFillColor(127, 29, 29);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    lang === 'fr'
      ? 'RAPPORT OFFICIEL - GESTION AXÉE SUR LES RÉSULTATS (FAAB GAR)'
      : 'OFFICIAL REPORT - RESULTS-BASED MANAGEMENT (FAAB RBM)',
    margin + 4,
    y + 8
  );

  doc.setFontSize(9.5);
  doc.setTextColor(254, 226, 226);
  doc.text(
    `${lang === 'fr' ? 'Portefeuille / Dossier' : 'Portfolio / Project'} : ${project.name || '-'}`,
    margin + 4,
    y + 14.5
  );
  doc.setFontSize(8);
  doc.text(
    `${lang === 'fr' ? 'Institution' : 'Institution'} : ${profileInstitution}   |   ${
      lang === 'fr' ? 'Devise active' : 'Active Currency'
    } : ${currency}   |   Date : ${new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}`,
    margin + 4,
    y + 19.5
  );
  y += 26;

  // --- 1. IDENTIFICATION DU DOSSIER & PROFIL UTILISATEUR ---
  drawSectionHeader(
    lang === 'fr' ? '1. Identification du Dossier & Profil Utilisateur' : '1. Portfolio Identification & User Profile',
    153,
    27,
    27
  );
  drawKeyValueRow(lang === 'fr' ? 'Intitulé du Dossier' : 'Portfolio Name', project.name || '-');
  drawKeyValueRow(lang === 'fr' ? 'Description' : 'Description', project.description || '-');
  drawKeyValueRow(lang === 'fr' ? 'Nom & Prénoms' : 'Full Name', profileName);
  drawKeyValueRow(lang === 'fr' ? 'Fonction' : 'Role / Position', profileRole);
  drawKeyValueRow(lang === 'fr' ? 'Institution' : 'Institution', profileInstitution);
  drawKeyValueRow(lang === 'fr' ? 'Email & Contact' : 'Email & Contact', `${profileEmail} | ${profileContact}`);
  drawKeyValueRow(
    lang === 'fr' ? 'Durée Globale' : 'Global Duration',
    project.garData?.fiche?.duree || '-'
  );
  drawKeyValueRow(
    lang === 'fr' ? 'Lieu / Zone' : 'Location / Area',
    project.garData?.fiche?.lieu || '-'
  );
  drawKeyValueRow(
    lang === 'fr' ? 'Objectif Général' : 'General Objective',
    project.cadrageStrategique?.objectifGeneral || '-'
  );
  drawKeyValueRow(
    lang === 'fr' ? 'Mission / Orientation' : 'Mission / Orientation',
    project.cadrageStrategique?.mission || '-'
  );

  // Calculate consolidated portfolio budget
  const axes = project.garData?.rendement?.axes || [];
  let grandTotal = 0;
  axes.forEach((axe: any) => {
    (axe.projets || []).forEach((proj: any) => {
      grandTotal += getProjectEffectiveCost(proj);
    });
  });
  drawKeyValueRow(
    lang === 'fr' ? 'Budget Consolidé Global' : 'Total Consolidated Budget',
    formatCurrencyAmount(grandTotal, currency),
    true
  );
  y += 5;

  // --- 2. DIAGNOSTIC : ARBRE À PROBLÈMES ---
  drawSectionHeader(
    lang === 'fr' ? '2. Diagnostic Causal (Arbre à Problèmes)' : '2. Causal Diagnosis (Problem Tree)',
    153,
    27,
    27
  );
  drawKeyValueRow(
    lang === 'fr' ? 'Conséquence Globale' : 'Global Negative Impact',
    project.garData?.problems?.consequenceGlobale || '-'
  );
  (project.garData?.problems?.branches || []).forEach((branch: any, i: number) => {
    drawKeyValueRow(
      `${branch.axeName || `Service ${i + 1}`} - ${lang === 'fr' ? 'Problème Central' : 'Central Problem'}`,
      branch.central || '-'
    );
    (branch.details || []).forEach((det: any, j: number) => {
      const causes = ensureArray(det.cause).join(' ; ');
      const besoins = ensureArray(det.besoin).join(' ; ');
      drawKeyValueRow(
        `  Branche ${j + 1} (${lang === 'fr' ? 'Contrainte' : 'Constraint'})`,
        `${det.contrainte || '-'}\n• ${lang === 'fr' ? 'Causes' : 'Causes'}: ${causes || '-'}\n• ${
          lang === 'fr' ? 'Besoins' : 'Needs'
        }: ${besoins || '-'}`
      );
    });
  });
  y += 5;

  // --- 3. CADRE DE RENDEMENT & FICHES TECHNIQUES PAR PROJET ---
  drawSectionHeader(
    lang === 'fr'
      ? '3. Cadre de Rendement, Extrants, Activités & Budgets'
      : '3. Performance Framework, Outputs, Activities & Budgets',
    185,
    28,
    28
  );
  drawKeyValueRow(
    lang === 'fr' ? 'Impact Positif Global' : 'Global Positive Impact',
    project.garData?.rendement?.impact || '-',
    true
  );

  axes.forEach((axe: any, i: number) => {
    checkPageBreak(16);
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${axe.nom || `Service ${i + 1}`} — ${lang === 'fr' ? 'EFFET' : 'OUTCOME'} : ${axe.effet || '-'}`,
      margin + 3,
      y + 4.8
    );
    y += 8;

    (axe.projets || []).forEach((proj: any, pIdx: number) => {
      const projCost = getProjectEffectiveCost(proj);
      const benefs =
        (project.garData?.stakeholders?.beneficiaires || [])
          .filter((b: any) => b.axe === i + 1 && b.projetIndex === pIdx && b.nom)
          .map((b: any) => b.nom)
          .join(', ') || '-';
      const techPartners = (project.garData?.stakeholders?.operateursTechniques || [])
        .filter((a: any) => a.axe === i + 1 && a.projetIndex === pIdx && a.nom)
        .map((a: any) => a.nom.trim());
      const finPartners = (project.garData?.stakeholders?.ptf || [])
        .filter((a: any) => a.axe === i + 1 && a.projetIndex === pIdx && a.nom)
        .map((a: any) => a.nom.trim());
      const partnersList = [...techPartners, ...finPartners].join(', ') || '-';

      drawKeyValueRow(
        `${lang === 'fr' ? 'Projet / Extrant' : 'Project / Output'} ${pIdx + 1}`,
        proj.extrant || '-',
        true
      );
      drawKeyValueRow(lang === 'fr' ? 'Bénéficiaires Directs' : 'Direct Beneficiaries', benefs);
      drawKeyValueRow(lang === 'fr' ? 'Partenaires Tech. & Fin.' : 'Tech & Fin Partners', partnersList);

      const acts = ensureArray(proj.activites);
      acts.forEach((act: string, k: number) => {
        const actCost = calculateActivityTotal(proj, k);
        const rhItems = getSafe2D(proj.intrants_rh, k)
          .map((it: any) =>
            typeof it === 'string'
              ? it
              : `${it.label || ''} ${
                  it.amount ? `(${formatCurrencyAmount(parseAmount(it.amount), currency)})` : ''
                }`
          )
          .filter((s: string) => s.trim())
          .join(', ');
        const matItems = getSafe2D(proj.intrants_mat, k)
          .map((it: any) =>
            typeof it === 'string'
              ? it
              : `${it.label || ''} ${
                  it.amount ? `(${formatCurrencyAmount(parseAmount(it.amount), currency)})` : ''
                }`
          )
          .filter((s: string) => s.trim())
          .join(', ');

        drawKeyValueRow(
          `  ${lang === 'fr' ? 'Activité' : 'Activity'} ${k + 1}`,
          `${act || '-'}\n• RH : ${rhItems || '-'}\n• ${
            lang === 'fr' ? 'Matériel' : 'Material'
          } : ${matItems || '-'}\n• ${lang === 'fr' ? 'Sous-total Activité' : 'Activity Subtotal'} : ${formatCurrencyAmount(
            actCost,
            currency
          )}`
        );
      });

      drawKeyValueRow(
        `  ${lang === 'fr' ? 'Coût Total Projet' : 'Project Total Cost'} ${pIdx + 1}`,
        formatCurrencyAmount(projCost, currency),
        true
      );
      y += 2;
    });
    y += 3;
  });

  // --- 4. CADRE DE MESURE DU RENDEMENT (CMR) ---
  drawSectionHeader(
    lang === 'fr'
      ? '4. Cadre de Mesure du Rendement (CMR / KPI)'
      : '4. Performance Measurement Framework (PMF / KPI)',
    153,
    27,
    27
  );
  const cmrList = project.garData?.cmr || [];
  if (cmrList.length === 0) {
    drawKeyValueRow('CMR', '-');
  } else {
    cmrList.forEach((row: any) => {
      drawKeyValueRow(
        `${row.niveau || 'NIVEAU'} ${row.axe ? `(Axe ${row.axe})` : ''}`,
        `${lang === 'fr' ? 'Indicateur' : 'Indicator'}: ${row.indicateur || '-'} | Réf: ${
          row.ref || '0'
        } | Cible: ${row.cible || '0'} | Réal: ${row.real || '0'} | Fréq: ${
          row.freq || '-'
        } | Source: ${row.source || '-'} | Resp: ${row.responsable || '-'}`
      );
    });
  }
  y += 5;

  // --- 5. HYPOTHÈSES & RISQUES ---
  drawSectionHeader(
    lang === 'fr' ? '5. Matrice des Hypothèses & Risques' : '5. Assumptions & Risks Matrix',
    180,
    83,
    9
  );
  const risksList = project.garData?.risks || [];
  if (risksList.length === 0) {
    drawKeyValueRow(lang === 'fr' ? 'Risques' : 'Risks', '-');
  } else {
    risksList.forEach((r: any) => {
      drawKeyValueRow(
        `${r.niveau || 'RISQUE'} (Axe ${r.axe || 1}) [${r.level || 'MOYEN'}]`,
        `${lang === 'fr' ? 'Hypothèse' : 'Assumption'}: ${r.hypothese || '-'} | Resp: ${
          r.responsable || '-'
        } | Mitigation: ${r.mitigation || '-'}`
      );
    });
  }

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `FAAB GAR — ${project.name || 'Portefeuille'} (${currency}) — ${profileName !== '-' ? `${profileName} | ` : ''}Conception : KOFFIE FABIEN MICHAEL`,
      margin,
      pageHeight - 6
    );
    doc.text(`Page ${p} / ${totalPages}`, pageWidth - margin - 18, pageHeight - 6);
  }

  const safeName = (project.name || 'FAAB_GAR_Rapport')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  doc.save(`${safeName}_${currency}.pdf`);
}
