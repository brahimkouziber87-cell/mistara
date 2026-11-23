import * as XLSX from 'xlsx';
import {
  ArchivedClassProject,
  ExamItemDefinition,
  ItemCompetencyStat,
  MassarMetadata,
  PostRemediationImpactSummary,
  PostRemediationStudentDelta,
  PostSupportStatus,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import { extractExamNumberFromHeader } from './massarParser';

export interface StudentWeakItemDetail {
  item: ExamItemDefinition;
  score: number;
  ratio: number;
}

export function computeItemMatrixStats(
  students: StudentRecord[],
  itemDefinitions: ExamItemDefinition[],
  studentItemScores: StudentItemScores,
  masteryThresholdPct = 50
): ItemCompetencyStat[] {
  const presentIds = new Set(
    students.filter((s) => !s.isAbsent).map((s) => s.id)
  );

  return itemDefinitions.map((item) => {
    const safeMax = Math.max(0.25, Number(item.maxScore) || 1);
    let evaluatedCount = 0;
    let sum = 0;
    let masteredCount = 0;
    const weakStudentIds: string[] = [];
    const strongStudentIds: string[] = [];

    for (const studentId of presentIds) {
      const val = studentItemScores?.[studentId]?.[item.id];
      if (typeof val === 'number' && Number.isFinite(val)) {
        const clamped = Math.max(0, Math.min(safeMax, val));
        evaluatedCount += 1;
        sum += clamped;
        const pct = (clamped / safeMax) * 100;
        if (pct >= masteryThresholdPct) {
          masteredCount += 1;
          strongStudentIds.push(studentId);
        } else {
          weakStudentIds.push(studentId);
        }
      }
    }

    const averageScore = evaluatedCount > 0 ? sum / evaluatedCount : 0;
    const masteryRate = evaluatedCount > 0 ? (masteredCount / evaluatedCount) * 100 : 0;
    const status: ItemCompetencyStat['status'] =
      evaluatedCount === 0
        ? 'partial'
        : masteryRate >= 70
        ? 'mastered'
        : masteryRate >= 50
        ? 'partial'
        : 'critical';

    return {
      item,
      evaluatedCount,
      averageScore,
      masteryRate,
      weakStudentIds,
      strongStudentIds,
      status,
    };
  });
}

export function getStudentWeakItems(
  studentId: string,
  itemDefinitions: ExamItemDefinition[],
  studentItemScores: StudentItemScores,
  masteryThresholdPct = 50
): StudentWeakItemDetail[] {
  const row = studentItemScores?.[studentId];
  if (!row || itemDefinitions.length === 0) return [];

  const details: StudentWeakItemDetail[] = [];
  for (const item of itemDefinitions) {
    const val = row[item.id];
    const safeMax = Math.max(0.25, Number(item.maxScore) || 1);
    if (typeof val === 'number' && Number.isFinite(val)) {
      const clamped = Math.max(0, Math.min(safeMax, val));
      const ratio = clamped / safeMax;
      if (ratio * 100 < masteryThresholdPct) {
        details.push({ item, score: clamped, ratio });
      }
    }
  }

  return details.sort((a, b) => a.ratio - b.ratio);
}

export function syncStudentTotalScoresFromItems(
  students: StudentRecord[],
  itemDefinitions: ExamItemDefinition[],
  studentItemScores: StudentItemScores
): StudentRecord[] {
  if (itemDefinitions.length === 0) return students;
  return students.map((st) => {
    if (st.isAbsent) return st;
    const row = studentItemScores?.[st.id];
    if (!row) return st;
    let hasAny = false;
    let total = 0;
    for (const item of itemDefinitions) {
      const val = row[item.id];
      if (typeof val === 'number' && Number.isFinite(val)) {
        hasAny = true;
        total += Math.max(0, Math.min(Math.max(0.25, item.maxScore || 1), val));
      }
    }
    if (!hasAny) return st;
    const rounded = Math.round(Math.max(0, Math.min(20, total)) * 100) / 100;
    return { ...st, score: rounded };
  });
}

export interface LongitudinalExamPoint {
  projectId: string;
  label: string;
  examNumber: string;
  examDate: string;
  average: number;
  passRate: number;
  stdDev: number;
  present: number;
  absent: number;
}

export interface StudentLongitudinalTrajectory {
  key: string;
  code: string;
  fullName: string;
  scoresByExam: Record<string, number | null>;
  absentByExam: Record<string, boolean>;
  firstScore: number | null;
  latestScore: number | null;
  delta: number | null;
  trend: 'improved' | 'stable' | 'declined' | 'insufficient';
  recoveredPass: boolean; // was < passThreshold in previous exam and >= passThreshold in latest
}

export interface LongitudinalComparisonResult {
  exams: LongitudinalExamPoint[];
  trajectories: StudentLongitudinalTrajectory[];
  overallDeltaAverage: number;
  overallDeltaPassRate: number;
  improvedCount: number;
  declinedCount: number;
  stableCount: number;
  recoveredPassCount: number;
}

function getExamSortWeight(project: ArchivedClassProject): number {
  const numStr = extractExamNumberFromHeader(project.metadata.examNumber || '');
  const match = numStr.match(/(\d+)/);
  const examIdx = match ? Number.parseInt(match[1], 10) : 99;
  const semIdx = (project.metadata.semester || '').includes('الثانية') ? 2 : 1;
  return semIdx * 100 + examIdx;
}

function normalizeStudentMatchKey(st: StudentRecord): string {
  const code = (st.code || '').trim().toLowerCase();
  if (code && !code.startsWith('m-') && !code.startsWith('abs-')) {
    return `code:${code}`;
  }
  const cleanName = (st.fullName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return `name:${cleanName}`;
}

export function computeLongitudinalComparison(
  projects: ArchivedClassProject[],
  passThreshold = 10
): LongitudinalComparisonResult {
  const sorted = [...projects].sort((a, b) => {
    const wDiff = getExamSortWeight(a) - getExamSortWeight(b);
    if (wDiff !== 0) return wDiff;
    const dA = a.metadata.examDate || a.updatedAt;
    const dB = b.metadata.examDate || b.updatedAt;
    return dA.localeCompare(dB);
  });

  const exams: LongitudinalExamPoint[] = sorted.map((p) => {
    const exNum = p.metadata.examNumber || p.name;
    const shortEx = exNum.replace('الفرض المحروس رقم ', 'ف').trim();
    return {
      projectId: p.id,
      label: `${shortEx}${p.metadata.semester?.includes('الثانية') ? ' (د2)' : ''}`,
      examNumber: exNum,
      examDate: p.metadata.examDate || p.updatedAt.slice(0, 10),
      average: Number(p.summaryStats.average.toFixed(2)),
      passRate: Number(p.summaryStats.passRate.toFixed(1)),
      stdDev: Number(p.summaryStats.stdDev.toFixed(2)),
      present: p.summaryStats.present,
      absent: p.summaryStats.absent,
    };
  });

  const studentMap = new Map<
    string,
    {
      key: string;
      code: string;
      fullName: string;
      scoresByExam: Record<string, number | null>;
      absentByExam: Record<string, boolean>;
    }
  >();

  for (const proj of sorted) {
    for (const st of proj.students) {
      const key = normalizeStudentMatchKey(st);
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          key,
          code: st.code || '',
          fullName: st.fullName,
          scoresByExam: {},
          absentByExam: {},
        });
      }
      const entry = studentMap.get(key)!;
      if (!entry.code && st.code) entry.code = st.code;
      entry.scoresByExam[proj.id] = st.isAbsent ? null : st.score;
      entry.absentByExam[proj.id] = st.isAbsent;
    }
  }

  let improvedCount = 0;
  let declinedCount = 0;
  let stableCount = 0;
  let recoveredPassCount = 0;

  const trajectories: StudentLongitudinalTrajectory[] = Array.from(
    studentMap.values()
  ).map((entry) => {
    const validOrderedScores: Array<{ projectId: string; score: number }> = [];
    for (const proj of sorted) {
      const sc = entry.scoresByExam[proj.id];
      if (typeof sc === 'number' && Number.isFinite(sc)) {
        validOrderedScores.push({ projectId: proj.id, score: sc });
      }
    }

    const firstScore = validOrderedScores.length > 0 ? validOrderedScores[0].score : null;
    const latestScore =
      validOrderedScores.length > 0
        ? validOrderedScores[validOrderedScores.length - 1].score
        : null;
    const prevScore =
      validOrderedScores.length > 1
        ? validOrderedScores[validOrderedScores.length - 2].score
        : null;

    const delta =
      validOrderedScores.length >= 2 && firstScore !== null && latestScore !== null
        ? Math.round((latestScore - firstScore) * 100) / 100
        : null;

    let trend: StudentLongitudinalTrajectory['trend'] = 'insufficient';
    if (delta !== null) {
      if (delta >= 0.5) {
        trend = 'improved';
        improvedCount += 1;
      } else if (delta <= -0.5) {
        trend = 'declined';
        declinedCount += 1;
      } else {
        trend = 'stable';
        stableCount += 1;
      }
    }

    const recoveredPass =
      prevScore !== null &&
      latestScore !== null &&
      prevScore < passThreshold &&
      latestScore >= passThreshold;
    if (recoveredPass) recoveredPassCount += 1;

    return {
      key: entry.key,
      code: entry.code,
      fullName: entry.fullName,
      scoresByExam: entry.scoresByExam,
      absentByExam: entry.absentByExam,
      firstScore,
      latestScore,
      delta,
      trend,
      recoveredPass,
    };
  });

  trajectories.sort((a, b) => {
    const dB = b.delta ?? -999;
    const dA = a.delta ?? -999;
    if (dB !== dA) return dB - dA;
    return a.fullName.localeCompare(b.fullName, 'ar');
  });

  const overallDeltaAverage =
    exams.length >= 2
      ? Math.round((exams[exams.length - 1].average - exams[0].average) * 100) / 100
      : 0;
  const overallDeltaPassRate =
    exams.length >= 2
      ? Math.round((exams[exams.length - 1].passRate - exams[0].passRate) * 10) / 10
      : 0;

  return {
    exams,
    trajectories,
    overallDeltaAverage,
    overallDeltaPassRate,
    improvedCount,
    declinedCount,
    stableCount,
    recoveredPassCount,
  };
}

export interface CouncilClassRow {
  projectId: string;
  name: string;
  className: string;
  level: string;
  subject: string;
  examNumber: string;
  semester: string;
  total: number;
  present: number;
  absent: number;
  average: number;
  passRate: number;
  stdDev: number;
  passed: number;
  failed: number;
}

export interface RecurringStrugglingStudent {
  key: string;
  code: string;
  fullName: string;
  occurrences: number;
  meanScore: number;
  contexts: Array<{ className: string; subject: string; examNumber: string; score: number }>;
}

export interface ClassCouncilSummary {
  classes: CouncilClassRow[];
  totalStudentsEvaluated: number;
  globalAverage: number;
  globalPassRate: number;
  bestClass: CouncilClassRow | null;
  prioritySupportClass: CouncilClassRow | null;
  recurringStruggling: RecurringStrugglingStudent[];
}

export function computeClassCouncilSummary(
  projects: ArchivedClassProject[]
): ClassCouncilSummary {
  const classes: CouncilClassRow[] = projects
    .map((p) => ({
      projectId: p.id,
      name: p.name,
      className: p.metadata.className || p.name,
      level: p.metadata.level || p.metadata.cycle || '—',
      subject: p.metadata.subject || '—',
      examNumber: p.metadata.examNumber || '—',
      semester: p.metadata.semester || '—',
      total: p.summaryStats.total,
      present: p.summaryStats.present,
      absent: p.summaryStats.absent,
      average: p.summaryStats.average,
      passRate: p.summaryStats.passRate,
      stdDev: p.summaryStats.stdDev,
      passed: p.summaryStats.passed,
      failed: p.summaryStats.failed,
    }))
    .sort((a, b) => b.average - a.average);

  const totalPresent = classes.reduce((s, c) => s + c.present, 0);
  const totalPassed = classes.reduce((s, c) => s + c.passed, 0);
  const weightedSum = classes.reduce((s, c) => s + c.average * c.present, 0);

  const globalAverage = totalPresent > 0 ? weightedSum / totalPresent : 0;
  const globalPassRate = totalPresent > 0 ? (totalPassed / totalPresent) * 100 : 0;

  const bestClass = classes.length > 0 ? classes[0] : null;
  const prioritySupportClass =
    classes.length > 0 ? [...classes].sort((a, b) => a.passRate - b.passRate)[0] : null;

  // Cross-exam / cross-subject struggling students tracking
  const recurringMap = new Map<
    string,
    {
      key: string;
      code: string;
      fullName: string;
      contexts: Array<{ className: string; subject: string; examNumber: string; score: number }>;
    }
  >();

  for (const proj of projects) {
    const passThr = proj.template.passThreshold ?? 10;
    for (const st of proj.students) {
      if (st.isAbsent || st.score === null) continue;
      if (st.score < passThr) {
        const key = normalizeStudentMatchKey(st);
        if (!recurringMap.has(key)) {
          recurringMap.set(key, {
            key,
            code: st.code || '',
            fullName: st.fullName,
            contexts: [],
          });
        }
        recurringMap.get(key)!.contexts.push({
          className: proj.metadata.className || proj.name,
          subject: proj.metadata.subject || 'المادة',
          examNumber: proj.metadata.examNumber || 'الفرض',
          score: st.score,
        });
      }
    }
  }

  const recurringStruggling: RecurringStrugglingStudent[] = Array.from(
    recurringMap.values()
  )
    .map((entry) => {
      const sum = entry.contexts.reduce((s, c) => s + c.score, 0);
      return {
        key: entry.key,
        code: entry.code,
        fullName: entry.fullName,
        occurrences: entry.contexts.length,
        meanScore: sum / entry.contexts.length,
        contexts: entry.contexts,
      };
    })
    .filter((entry) =>
      projects.length > 1 ? entry.occurrences >= 2 || entry.meanScore < 8 : entry.meanScore < 10
    )
    .sort((a, b) => {
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
      return a.meanScore - b.meanScore;
    });

  return {
    classes,
    totalStudentsEvaluated: totalPresent,
    globalAverage,
    globalPassRate,
    bestClass,
    prioritySupportClass,
    recurringStruggling,
  };
}

// -----------------------------------------------------------------------------
// Pillar 1: Pre-formatted Exercise Score Excel Template & Bulk Import
// -----------------------------------------------------------------------------

function normalizeMatchToken(val: string): string {
  return (val || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function exportItemScoresTemplateToExcel(
  students: StudentRecord[],
  itemDefinitions: ExamItemDefinition[],
  studentItemScores: StudentItemScores,
  metadata: MassarMetadata
): void {
  const wb = XLSX.utils.book_new();
  const totalMax = itemDefinitions.reduce((s, it) => s + (Number(it.maxScore) || 0), 0);

  const itemHeaders = itemDefinitions.map((it) => `${it.label} (/${it.maxScore})`);
  const rows: (string | number)[][] = [
    [
      'قالب رصد نقط التمارين والكفايات — تطبيق مِسطرة',
      `القسم: ${metadata.className || '—'}`,
      `المادة: ${metadata.subject || '—'}`,
      `الفرض: ${metadata.examNumber || '—'}`,
      `مجموع السلم: ${totalMax}/20`,
    ],
    [
      'إرشادات:',
      'احتفظ برموز مسار أو أسماء التلاميذ كما هي واملأ نقط التمارين فقط دون تعديل صف العناوين.',
      ...itemDefinitions.map((it) => it.competency || 'الكفاية المستهدفة'),
    ],
    ['ر.ت', 'رمز مسار', 'الاسم الكامل', 'النقطة العامة (/20)', ...itemHeaders],
  ];

  students.forEach((st, idx) => {
    const rowScores = studentItemScores?.[st.id] || {};
    rows.push([
      st.order || idx + 1,
      st.code || '',
      st.fullName,
      st.isAbsent ? 'غ' : st.score !== null ? Number(st.score.toFixed(2)) : '',
      ...itemDefinitions.map((it) => {
        if (st.isAbsent) return 'غ';
        const v = rowScores[it.id];
        return typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(2)) : '';
      }),
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 7 },
    { wch: 15 },
    { wch: 28 },
    { wch: 16 },
    ...itemDefinitions.map(() => ({ wch: 18 })),
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'نقط_التمارين');

  const safeClass = (metadata.className || 'القسم').replace(/[\\/:*?"<>|]+/g, '_');
  const safeExam = (metadata.examNumber || 'الفرض').replace(/[\\/:*?"<>|]+/g, '_');
  XLSX.writeFile(wb, `قالب_نقط_التمارين_${safeExam}_${safeClass}.xlsx`);
}

export interface ItemScoresImportResult {
  mergedScores: StudentItemScores;
  matchedStudentsCount: number;
  importedCellsCount: number;
  matchedItemLabels: string[];
  unmatchedColumns: string[];
}

export function parseItemScoresWorkbook(
  wb: XLSX.WorkBook,
  students: StudentRecord[],
  itemDefinitions: ExamItemDefinition[],
  existingScores: StudentItemScores = {}
): ItemScoresImportResult {
  if (!wb.SheetNames.length || itemDefinitions.length === 0) {
    return {
      mergedScores: { ...existingScores },
      matchedStudentsCount: 0,
      importedCellsCount: 0,
      matchedItemLabels: [],
      unmatchedColumns: [],
    };
  }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
    header: 1,
    defval: '',
  });

  // Locate header row: row containing Massar code / fullName / or matching >=1 item label
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(25, matrix.length); r++) {
    const rowCells = (matrix[r] || []).map((c) => normalizeMatchToken(String(c ?? '')));
    const hasIdentityCol = rowCells.some(
      (c) =>
        c.includes('رمز مسار') ||
        c.includes('massar') ||
        c.includes('الاسم الكامل') ||
        c.includes('النسب والاسم') ||
        c === 'code' ||
        c === 'nom'
    );
    const matchesAnyItem = itemDefinitions.some((it) => {
      const lbl = normalizeMatchToken(it.label);
      return lbl && rowCells.some((c) => c === lbl || c.startsWith(`${lbl} (`) || c.includes(lbl));
    });
    if (hasIdentityCol || matchesAnyItem) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      'تعذر التعرف على صف العناوين في ملف التمارين. يُنصح باستخدام «تنزيل قالب النقط (.xlsx)» أولاً.'
    );
  }

  const rawHeaders = (matrix[headerRowIdx] || []).map((c) => String(c ?? '').trim());
  const normHeaders = rawHeaders.map(normalizeMatchToken);

  const codeColIdx = normHeaders.findIndex(
    (h) => h.includes('رمز مسار') || h.includes('massar') || h === 'code' || h.includes('رقم التلميذ')
  );
  const nameColIdx = normHeaders.findIndex(
    (h) =>
      h.includes('الاسم الكامل') ||
      h.includes('النسب والاسم') ||
      h.includes('اسم التلميذ') ||
      h === 'nom' ||
      h.includes('nom et prenom')
  );

  // Map exercise columns
  const itemColMapping = new Map<number, ExamItemDefinition>();
  const usedItemIds = new Set<string>();
  const matchedItemLabels: string[] = [];
  const unmatchedColumns: string[] = [];

  rawHeaders.forEach((rawH, colIdx) => {
    if (!rawH) return;
    if (colIdx === codeColIdx || colIdx === nameColIdx) return;
    const hNorm = normHeaders[colIdx];
    if (
      hNorm === 'ر.ت' ||
      hNorm === '#' ||
      hNorm.includes('النقطه العامه') ||
      hNorm.includes('المجموع') ||
      hNorm === 'note'
    ) {
      return;
    }

    const strippedHeader = normalizeMatchToken(rawH.replace(/\([^)]*\)/g, '').trim());
    const matched = itemDefinitions.find((it) => {
      if (usedItemIds.has(it.id)) return false;
      const itNorm = normalizeMatchToken(it.label);
      return (
        itNorm === hNorm ||
        itNorm === strippedHeader ||
        hNorm.startsWith(`${itNorm} (`) ||
        (itNorm.length >= 3 && strippedHeader.includes(itNorm))
      );
    });

    if (matched) {
      itemColMapping.set(colIdx, matched);
      usedItemIds.add(matched.id);
      matchedItemLabels.push(matched.label);
    } else if (/تمرين|ex|item|سؤال|q\d/i.test(rawH)) {
      unmatchedColumns.push(rawH);
    }
  });

  // Positional fallback if headers were renamed cleanly after identity columns
  if (itemColMapping.size === 0) {
    const startCol = Math.max(codeColIdx, nameColIdx, 2) + 1;
    let fallbackIdx = 0;
    for (let c = startCol; c < rawHeaders.length && fallbackIdx < itemDefinitions.length; c++) {
      const hNorm = normHeaders[c];
      if (hNorm.includes('النقطه العامه') || hNorm.includes('المجموع')) continue;
      if (rawHeaders[c]) {
        const it = itemDefinitions[fallbackIdx++];
        itemColMapping.set(c, it);
        matchedItemLabels.push(it.label);
      }
    }
  }

  if (itemColMapping.size === 0) {
    throw new Error(
      'لم يتم العثور على أعمدة تمارين مطابقة للشبكة الحالية داخل الملف المرفوع.'
    );
  }

  // Build lookup indexes for students
  const byCode = new Map<string, StudentRecord>();
  const byName = new Map<string, StudentRecord>();
  for (const st of students) {
    const c = (st.code || '').trim().toLowerCase();
    if (c) byCode.set(c, st);
    const n = normalizeMatchToken(st.fullName);
    if (n) byName.set(n, st);
  }

  const mergedScores: StudentItemScores = {};
  for (const [k, v] of Object.entries(existingScores)) {
    mergedScores[k] = { ...v };
  }

  const matchedStudentIds = new Set<string>();
  let importedCellsCount = 0;

  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue;

    let student: StudentRecord | undefined;
    if (codeColIdx !== -1) {
      const rawCode = String(row[codeColIdx] ?? '').trim().toLowerCase();
      if (rawCode) student = byCode.get(rawCode);
    }
    if (!student && nameColIdx !== -1) {
      const rawName = normalizeMatchToken(String(row[nameColIdx] ?? ''));
      if (rawName) student = byName.get(rawName);
    }
    if (!student || student.isAbsent) continue;

    const currentStudentRow = { ...(mergedScores[student.id] || {}) };
    let studentUpdated = false;

    for (const [colIdx, item] of itemColMapping.entries()) {
      const rawVal = row[colIdx];
      if (rawVal === undefined || rawVal === null) continue;
      const strVal = String(rawVal).trim().replace(/,/g, '.');
      if (!strVal || /^(غ|غائب|abs|absent|-|—)$/i.test(strVal)) continue;

      const parsed = Number.parseFloat(strVal);
      if (!Number.isFinite(parsed)) continue;

      const safeMax = Math.max(0.25, Number(item.maxScore) || 1);
      const clamped = Math.round(Math.max(0, Math.min(safeMax, parsed)) * 100) / 100;
      currentStudentRow[item.id] = clamped;
      importedCellsCount += 1;
      studentUpdated = true;
    }

    if (studentUpdated) {
      mergedScores[student.id] = currentStudentRow;
      matchedStudentIds.add(student.id);
    }
  }

  return {
    mergedScores,
    matchedStudentsCount: matchedStudentIds.size,
    importedCellsCount,
    matchedItemLabels,
    unmatchedColumns,
  };
}

export async function parseItemScoresFromExcelFile(
  file: File,
  students: StudentRecord[],
  itemDefinitions: ExamItemDefinition[],
  existingScores: StudentItemScores = {}
): Promise<ItemScoresImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  return parseItemScoresWorkbook(wb, students, itemDefinitions, existingScores);
}

// -----------------------------------------------------------------------------
// Pillar 2: Pre / Post Remediation Impact Analytics
// -----------------------------------------------------------------------------

export function inferPostSupportStatus(
  postScore: number | null | undefined,
  passThreshold = 10
): PostSupportStatus {
  if (postScore === null || postScore === undefined || !Number.isFinite(postScore)) {
    return 'pending';
  }
  if (postScore >= passThreshold) return 'mastered';
  if (postScore >= passThreshold * 0.75) return 'in_progress';
  return 'needs_followup';
}

export function computePostRemediationImpact(
  targetStudents: StudentRecord[],
  template: ReportTemplateSchema
): PostRemediationImpactSummary {
  const passThreshold = template.passThreshold || 10;
  const overrides = template.remediationCardsConfig?.studentOverrides || {};

  const studentRows: PostRemediationStudentDelta[] = [];
  let evaluatedCount = 0;
  let masteredCount = 0;
  let inProgressCount = 0;
  let needsFollowupCount = 0;
  let recoveredPassCount = 0;

  let preSum = 0;
  let postSum = 0;
  let pairedScoreCount = 0;
  let preDeficitSum = 0;
  let postDeficitSum = 0;
  let deficitPairsCount = 0;

  for (const st of targetStudents) {
    const ov = overrides[st.id];
    const postScore =
      typeof ov?.postSupportScore === 'number' && Number.isFinite(ov.postSupportScore)
        ? Math.max(0, Math.min(20, ov.postSupportScore))
        : null;
    const explicitStatus = ov?.postSupportStatus;
    const status: PostSupportStatus =
      explicitStatus && explicitStatus !== 'pending'
        ? explicitStatus
        : postScore !== null
        ? inferPostSupportStatus(postScore, passThreshold)
        : 'pending';

    const preScore = st.isAbsent ? null : st.score;
    const delta =
      preScore !== null && postScore !== null
        ? Math.round((postScore - preScore) * 100) / 100
        : null;

    if (status !== 'pending' || postScore !== null) {
      evaluatedCount += 1;
      if (status === 'mastered') masteredCount += 1;
      else if (status === 'in_progress') inProgressCount += 1;
      else if (status === 'needs_followup') needsFollowupCount += 1;
    }

    if (postScore !== null && postScore >= passThreshold && (preScore === null || preScore < passThreshold)) {
      recoveredPassCount += 1;
    }

    if (preScore !== null && postScore !== null) {
      preSum += preScore;
      postSum += postScore;
      pairedScoreCount += 1;

      if (preScore < passThreshold) {
        preDeficitSum += passThreshold - preScore;
        postDeficitSum += Math.max(0, passThreshold - postScore);
        deficitPairsCount += 1;
      }
    }

    studentRows.push({
      student: st,
      preScore,
      postScore,
      delta,
      status,
      postDate: ov?.postSupportDate,
    });
  }

  const targetedCount = targetStudents.length;
  const pendingCount = Math.max(0, targetedCount - evaluatedCount);
  const preAverage = pairedScoreCount > 0 ? preSum / pairedScoreCount : null;
  const postAverage = pairedScoreCount > 0 ? postSum / pairedScoreCount : null;
  const averageGain =
    preAverage !== null && postAverage !== null
      ? Math.round((postAverage - preAverage) * 100) / 100
      : null;

  const recoveryRate = evaluatedCount > 0 ? (masteredCount / evaluatedCount) * 100 : 0;
  const gapClosurePct =
    deficitPairsCount > 0 && preDeficitSum > 0
      ? Math.max(0, Math.min(100, ((preDeficitSum - postDeficitSum) / preDeficitSum) * 100))
      : null;

  return {
    targetedCount,
    evaluatedCount,
    pendingCount,
    masteredCount,
    inProgressCount,
    needsFollowupCount,
    recoveredPassCount,
    preAverage,
    postAverage,
    averageGain,
    recoveryRate,
    gapClosurePct,
    studentRows,
  };
}

