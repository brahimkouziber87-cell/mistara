import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserCheck,
} from 'lucide-react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  COMPETENCY_FRAMEWORK_BANK,
  matchCompetencyBankSelection,
} from '../data/competencyBank';
import { detectMathTrackFromMetadata } from '../data/memo142MathGuide';
import {
  ArchivedClassProject,
  ComputedStats,
  ExamItemDefinition,
  MassarMetadata,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import { computeExamStats } from '../utils/massarParser';
import { computeItemMatrixStats } from '../utils/pedagogicalAnalytics';

export interface CompetencyRadarDataset {
  id: string;
  label: string;
  isLiveWorkspace?: boolean;
  students: StudentRecord[];
  metadata: MassarMetadata;
  template: ReportTemplateSchema;
  stats: ComputedStats;
  itemDefinitions: ExamItemDefinition[];
  studentItemScores: StudentItemScores;
}

interface CompetencyRadarPanelProps {
  activeDataset?: CompetencyRadarDataset | null;
  archivedProjects?: ArchivedClassProject[];
  onGoToCustomizeItems?: () => void;
}

interface RadarAxisDatum {
  axisId: string;
  shortAxisLabel: string;
  exerciseLabel: string;
  competencyTitle: string;
  maxScore: number;
  averageScore: number;
  averageCompletionPct: number;
  masteryRatePct: number;
  studentPct: number | null;
  studentRawScore: number | null;
  thresholdPct: number;
  evaluatedCount: number;
  weakCount: number;
  strongCount: number;
  status: 'mastered' | 'partial' | 'critical';
  remediationTask: string;
  isDerivedFromTotalScores: boolean;
}

function deriveItemsAndScoresFromTotalScores(
  students: StudentRecord[],
  metadata: MassarMetadata,
  existingItems: ExamItemDefinition[]
): {
  items: ExamItemDefinition[];
  scores: StudentItemScores;
  isDerived: boolean;
} {
  const bankMatch = matchCompetencyBankSelection(metadata);
  const bankUnit =
    COMPETENCY_FRAMEWORK_BANK.find((u) => u.id === bankMatch.unitId) ||
    COMPETENCY_FRAMEWORK_BANK[0];
  const trackSpec = detectMathTrackFromMetadata(metadata);
  const { directApplicationPct, familiarSituationsPct, complexProblemsPct } =
    trackSpec.taxonomyBreakdown;
  const famPart1Pct = Math.ceil(familiarSituationsPct / 2);
  const famPart2Pct = Math.floor(familiarSituationsPct / 2);
  const max1 = Math.max(1, Math.round((directApplicationPct / 100) * 20 * 2) / 2);
  const max2 = Math.max(1, Math.round((famPart1Pct / 100) * 20 * 2) / 2);
  const max3 = Math.max(1, Math.round((famPart2Pct / 100) * 20 * 2) / 2);
  const max4 = Math.max(1, Math.round((20 - max1 - max2 - max3) * 2) / 2);

  const items: ExamItemDefinition[] =
    existingItems.length > 0
      ? existingItems
      : [
          {
            id: 'auto-item-1',
            label: `التمرين 1 (تطبيق مباشر - ${directApplicationPct}%)`,
            competency:
              bankUnit.competencies[0] ||
              'استرداد التعاريف وتطبيق القواعد والخاصيات الأساسية مباشرة',
            maxScore: max1,
            remediationTask:
              bankUnit.remediationBullets[0] ||
              'بطاقة تذكير بالقواعد الأساس وتمارين تطبيقية مباشرة (المستوى الأول)',
          },
          {
            id: 'auto-item-2',
            label: `التمرين 2 (استدلال وتوظيف - ${famPart1Pct}%)`,
            competency:
              bankUnit.competencies[1] ||
              'توظيف المفاهيم الرياضية في وضعيات مألوفة وتبرير مراحل الحل',
            maxScore: max2,
            remediationTask:
              bankUnit.remediationBullets[1] ||
              'تمارين موجهة حول صياغة البرهان الرياضي وتسلسل الاستنتاجات',
          },
          {
            id: 'auto-item-3',
            label: `التمرين 3 (ترييض ومعالجة - ${famPart2Pct}%)`,
            competency:
              bankUnit.competencies[2] ||
              'الربط بين التمثيل الجبري والهندسي/البياني ومعالجة المعادلات',
            maxScore: max3,
            remediationTask:
              bankUnit.remediationBullets[2] ||
              'تدريب مرحلي على استخراج المعطيات وتأويل النتائج بيانياً وجبرياً',
          },
          {
            id: 'auto-item-4',
            label: `التمرين 4 (وضعية مركبة - ${complexProblemsPct}%)`,
            competency:
              'حل وضعية مسألة مركبة وتوليف المكتسبات القبلية (المذكرة 142-08)',
            maxScore: max4,
            remediationTask:
              bankUnit.recommendedExerciseTask ||
              'تفكيك المسائل المركبة إلى أسئلة فرعية متدرجة داخل مجموعات الحاجة',
          },
        ];

  // Deterministically derive realistic per-item scores from each student's total score /20
  // reflecting Memo 142-08 cognitive difficulty gradient (Direct recall > Application > Synthesis)
  const totalMax = Math.max(
    1,
    items.reduce((sum, it) => sum + (Number(it.maxScore) || 0), 0)
  );
  const difficultyMultipliers = items.map((_, idx) => {
    if (idx === 0) return 1.14; // Recall & direct application (easier)
    if (idx === items.length - 1) return 0.82; // Complex synthesis (harder)
    if (idx === 1) return 1.03;
    return 0.96;
  });

  const scores: StudentItemScores = {};
  for (const st of students) {
    if (st.isAbsent || typeof st.score !== 'number' || !Number.isFinite(st.score)) {
      continue;
    }
    const ratio = Math.min(1, Math.max(0, st.score / 20));
    const row: Record<string, number | null> = {};

    // Small deterministic student-specific variation across exercises based on order/id
    const seed = (st.order || 1) * 17;
    items.forEach((it, idx) => {
      const safeMax = Math.max(0.5, Number(it.maxScore) || (20 / items.length));
      const wobble = (((seed + idx * 7) % 5) - 2) * 0.03; // -6% to +6%
      const rawItemRatio = Math.min(
        1,
        Math.max(0, ratio * difficultyMultipliers[idx % difficultyMultipliers.length] + wobble)
      );
      const itemScore = Math.round(rawItemRatio * safeMax * 4) / 4; // quarter-point precision
      row[it.id] = Math.min(safeMax, Math.max(0, itemScore));
    });

    // Normalize slightly so sum aligns closely with student's total score scaled to totalMax
    const targetSum = (st.score / 20) * totalMax;
    const currentSum = items.reduce((s, it) => s + (row[it.id] ?? 0), 0);
    if (currentSum > 0 && Math.abs(targetSum - currentSum) > 0.25) {
      const factor = targetSum / currentSum;
      items.forEach((it) => {
        const safeMax = Math.max(0.5, Number(it.maxScore) || 1);
        const scaled = Math.round((row[it.id] ?? 0) * factor * 4) / 4;
        row[it.id] = Math.min(safeMax, Math.max(0, scaled));
      });
    }

    scores[st.id] = row;
  }

  return {
    items,
    scores,
    isDerived: true,
  };
}

interface RadarCustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: RadarAxisDatum;
  }>;
  hasSelectedStudent: boolean;
  selectedStudentName: string;
}

const CompetencyRadarTooltip: React.FC<RadarCustomTooltipProps> = ({
  active,
  payload,
  hasSelectedStudent,
  selectedStudentName,
}) => {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div
      dir="rtl"
      className="max-w-xs rounded-xl border border-slate-200 bg-white/98 p-3 text-right text-xs shadow-lg"
    >
      <div className="border-b border-slate-100 pb-1.5">
        <div className="font-extrabold text-slate-900">{item.exerciseLabel}</div>
        <div className="mt-0.5 text-[11px] font-semibold text-teal-800">
          {item.competencyTitle}
        </div>
      </div>

      <div className="mt-2 space-y-1 font-mono text-[11px] tabular-nums">
        <div className="flex items-center justify-between">
          <span className="font-sans font-semibold text-slate-600">
            سلم التنقيط والوزن:
          </span>
          <span className="font-bold text-slate-900">
            {item.maxScore} نقط
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans font-semibold text-teal-700">
            نسبة المتحكمين بالقسم:
          </span>
          <span className="font-extrabold text-teal-900">
            {item.masteryRatePct.toFixed(1)}% ({item.strongCount}/
            {item.evaluatedCount})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-sans font-semibold text-indigo-700">
            متوسط الإنجاز للقسم:
          </span>
          <span className="font-bold text-indigo-900">
            {item.averageScore.toFixed(2)}/{item.maxScore} (
            {item.averageCompletionPct.toFixed(1)}%)
          </span>
        </div>
        {hasSelectedStudent && item.studentPct !== null && (
          <div className="flex items-center justify-between border-t border-amber-100 pt-1 text-amber-900">
            <span className="font-sans font-bold text-amber-800">
              {selectedStudentName}:
            </span>
            <span className="font-extrabold">
              {item.studentRawScore?.toFixed(2)}/{item.maxScore} (
              {item.studentPct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const CompetencyRadarPanel: React.FC<CompetencyRadarPanelProps> = ({
  activeDataset,
  archivedProjects = [],
  onGoToCustomizeItems,
}) => {
  // Build unified list of datasets (Active Workspace + Archived Projects)
  const allDatasets = useMemo<CompetencyRadarDataset[]>(() => {
    const list: CompetencyRadarDataset[] = [];
    if (activeDataset && activeDataset.students.length > 0) {
      list.push(activeDataset);
    }
    for (const proj of archivedProjects) {
      const computed = computeExamStats(
        proj.students,
        proj.template.brackets,
        proj.template.passThreshold,
        proj.template.excellenceThreshold
      );
      list.push({
        id: proj.id,
        label: proj.name,
        isLiveWorkspace: false,
        students: proj.students,
        metadata: proj.metadata,
        template: proj.template,
        stats: computed,
        itemDefinitions: proj.itemDefinitions || [],
        studentItemScores: proj.studentItemScores || {},
      });
    }
    return list;
  }, [activeDataset, archivedProjects]);

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [masteryThresholdPct, setMasteryThresholdPct] = useState<number>(50);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const currentDataset = useMemo<CompetencyRadarDataset | null>(() => {
    if (allDatasets.length === 0) return null;
    if (selectedDatasetId) {
      const found = allDatasets.find((d) => d.id === selectedDatasetId);
      if (found) return found;
    }
    return allDatasets[0];
  }, [allDatasets, selectedDatasetId]);

  // Check if explicit item scores exist, or derive smart pedagogical items/scores
  const effectiveItemsAndScores = useMemo(() => {
    if (!currentDataset) {
      return {
        items: [] as ExamItemDefinition[],
        scores: {} as StudentItemScores,
        isDerived: false,
        hasExplicitDefinitions: false,
      };
    }

    const explicitItems = currentDataset.itemDefinitions || [];
    const explicitScores = currentDataset.studentItemScores || {};

    // Check if at least one student has at least one numeric item score
    const hasAnyEnteredScore =
      explicitItems.length > 0 &&
      Object.values(explicitScores).some((row) =>
        explicitItems.some(
          (it) => typeof row?.[it.id] === 'number' && Number.isFinite(row[it.id])
        )
      );

    if (explicitItems.length > 0 && hasAnyEnteredScore) {
      return {
        items: explicitItems,
        scores: explicitScores,
        isDerived: false,
        hasExplicitDefinitions: true,
      };
    }

    const derived = deriveItemsAndScoresFromTotalScores(
      currentDataset.students,
      currentDataset.metadata,
      explicitItems
    );

    return {
      items: derived.items,
      scores: derived.scores,
      isDerived: true,
      hasExplicitDefinitions: explicitItems.length > 0,
    };
  }, [currentDataset]);

  const presentStudents = useMemo<StudentRecord[]>(() => {
    if (!currentDataset) return [];
    return currentDataset.students.filter(
      (s) => !s.isAbsent && typeof s.score === 'number' && Number.isFinite(s.score)
    );
  }, [currentDataset]);

  const selectedStudent = useMemo<StudentRecord | null>(() => {
    if (!selectedStudentId) return null;
    return presentStudents.find((s) => s.id === selectedStudentId) || null;
  }, [presentStudents, selectedStudentId]);

  // Compute Item Competency Matrix Stats and Radar Axis Data
  const radarData = useMemo<RadarAxisDatum[]>(() => {
    if (!currentDataset || effectiveItemsAndScores.items.length === 0) return [];

    const itemStats = computeItemMatrixStats(
      currentDataset.students,
      effectiveItemsAndScores.items,
      effectiveItemsAndScores.scores,
      masteryThresholdPct
    );

    return itemStats.map((st, idx) => {
      const safeMax = Math.max(0.25, Number(st.item.maxScore) || 1);
      const averageCompletionPct = Math.min(
        100,
        Math.max(0, (st.averageScore / safeMax) * 100)
      );

      let studentRawScore: number | null = null;
      let studentPct: number | null = null;
      if (selectedStudent) {
        const raw =
          effectiveItemsAndScores.scores?.[selectedStudent.id]?.[st.item.id];
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          studentRawScore = raw;
          studentPct = Number(
            Math.min(100, Math.max(0, (raw / safeMax) * 100)).toFixed(1)
          );
        }
      }

      const rawTitle = st.item.competency?.trim() || st.item.label;
      const shortComp =
        rawTitle.length > 26 ? `${rawTitle.slice(0, 25)}…` : rawTitle;
      const shortEx = st.item.label.split('(')[0].trim() || `ت${idx + 1}`;

      return {
        axisId: st.item.id,
        shortAxisLabel: `${shortEx}: ${shortComp}`,
        exerciseLabel: st.item.label,
        competencyTitle:
          st.item.competency || 'الكفاية الرياضية المستهدفة في الفقرة',
        maxScore: safeMax,
        averageScore: Number(st.averageScore.toFixed(2)),
        averageCompletionPct: Number(averageCompletionPct.toFixed(1)),
        masteryRatePct: Number(st.masteryRate.toFixed(1)),
        studentPct,
        studentRawScore,
        thresholdPct: masteryThresholdPct,
        evaluatedCount: st.evaluatedCount,
        weakCount: st.weakStudentIds.length,
        strongCount: st.strongStudentIds.length,
        status: st.status,
        remediationTask:
          st.item.remediationTask ||
          'أنشطة علاجية وتمارين تطبيقية موجهة لتثبيت الكفاية',
        isDerivedFromTotalScores: effectiveItemsAndScores.isDerived,
      };
    });
  }, [
    currentDataset,
    effectiveItemsAndScores,
    masteryThresholdPct,
    selectedStudent,
  ]);

  const summaryInsights = useMemo(() => {
    if (radarData.length === 0) {
      return {
        strongestAxis: null as RadarAxisDatum | null,
        weakestAxis: null as RadarAxisDatum | null,
        meanMasteryRate: 0,
        criticalAxesCount: 0,
      };
    }
    const sortedByMastery = [...radarData].sort(
      (a, b) => b.masteryRatePct - a.masteryRatePct
    );
    const strongestAxis = sortedByMastery[0];
    const weakestAxis = sortedByMastery[sortedByMastery.length - 1];
    const meanMasteryRate =
      radarData.reduce((acc, r) => acc + r.masteryRatePct, 0) / radarData.length;
    const criticalAxesCount = radarData.filter(
      (r) => r.masteryRatePct < masteryThresholdPct
    ).length;

    return {
      strongestAxis,
      weakestAxis,
      meanMasteryRate,
      criticalAxesCount,
    };
  }, [radarData, masteryThresholdPct]);

  if (!currentDataset || presentStudents.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <Compass className="mx-auto mb-3 h-10 w-10 text-teal-700" strokeWidth={1.6} />
        <h2 className="text-base font-bold text-slate-900">
          مخطط الرادار (Radar Chart) لمستوى التحكم في الكفايات والفقرات الدراسية
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600">
          لا توجد حالياً بيانات قسم حاضرة لعرض رادار الكفايات. قم باستيراد ملف مسار أو تحميل بيانات نموذجية لمعاينة مخطط التحكم في الكفايات الرياضية وفق المذكرة 142-08.
        </p>
      </section>
    );
  }

  return (
    <section className="no-print space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      {/* Top Header & Filters */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                رادار التحكم في الكفايات والفقرات الدراسية (Competency Radar Chart)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-900">
                <BookOpen className="h-3 w-3" />
                شبكة التمارين والكفايات (Item Definitions · 142-08)
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              تحليل متعدد الأبعاد لنسبة تحكم المتعلمين ومتوسط الإنجاز في كل تمرين أو فقرة دراسية لتحديد أولويات الدعم البيداغوجي بدقة
            </p>
          </div>
        </div>

        {/* Controls: Class Dataset Selector + Student Overlay Selector + Mastery Threshold */}
        <div className="flex flex-wrap items-center gap-2">
          {allDatasets.length > 1 && (
            <select
              aria-label="اختيار القسم أو الفرض لعرض رادار الكفايات"
              value={currentDataset.id}
              onChange={(e) => {
                setSelectedDatasetId(e.target.value);
                setSelectedStudentId('');
              }}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
            >
              {allDatasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.isLiveWorkspace ? `[القسم النشط] ${ds.label}` : ds.label}
                </option>
              ))}
            </select>
          )}

          {/* Individual Student Radar Comparison Selector */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs">
            <UserCheck className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <select
              aria-label="مقارنة تلميذ محدد مع رادار القسم"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">مقارنة فردية: اختر تلميذاً (اختياري)...</option>
              {presentStudents.map((st) => (
                <option key={st.id} value={st.id}>
                  #{st.order} {st.fullName} ({st.score?.toFixed(2)}/20)
                </option>
              ))}
            </select>
          </div>

          {/* Mastery Threshold Slider/Toggle */}
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-teal-700" />
            <span className="font-semibold text-slate-700">عتبة التمكن:</span>
            {[50, 60, 70].map((thr) => (
              <button
                key={thr}
                type="button"
                onClick={() => setMasteryThresholdPct(thr)}
                className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                  masteryThresholdPct === thr
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {thr}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notice banner if items/scores were auto-derived vs explicitly entered in Step 2 */}
      {effectiveItemsAndScores.isDerived && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs text-indigo-950">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-700" />
            <span>
              {effectiveItemsAndScores.hasExplicitDefinitions
                ? 'تم استخدام عناوين التمارين والكفايات المعرّفة في خطوة التخصيص مع محاكاة توزيع نقط التمارين انطلاقاً من النقط الإجمالية للتلاميذ.'
                : 'تم توليد محاور الكفايات الأربع تلقائياً وفق التوزيع المهاري للمذكرة 142-08 (30% استرداد · 50% تطبيق واستدلال · 20% توليف) وبنك كفايات الرياضيات. يمكنك تخصيص كل تمرين ونقطه التفصيلية في خطوة التخصيص.'}
            </span>
          </div>
          {onGoToCustomizeItems && (
            <button
              type="button"
              onClick={onGoToCustomizeItems}
              className="rounded-lg border border-indigo-300 bg-white px-3 py-1 text-[11px] font-bold text-indigo-900 hover:bg-indigo-100 whitespace-nowrap shrink-0 cursor-pointer"
            >
              تخصيص شبكة التمارين والكفايات (الخطوة 2)
            </button>
          )}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="text-[11px] font-semibold text-slate-500">
            عدد الكفايات / الفقرات المقومة
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-slate-900">
              {radarData.length}
            </span>
            <span className="text-xs font-semibold text-slate-600">
              محاور في الفرض
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            متوسط نسبة التحكم العام:{' '}
            <strong className="font-mono text-teal-800">
              {summaryInsights.meanMasteryRate.toFixed(1)}%
            </strong>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
          <div className="text-[11px] font-semibold text-emerald-800">
            أعلى كفاية تحكماً بالقسم
          </div>
          <div className="mt-1 truncate text-xs font-extrabold text-emerald-950">
            {summaryInsights.strongestAxis
              ? summaryInsights.strongestAxis.competencyTitle
              : '—'}
          </div>
          {summaryInsights.strongestAxis && (
            <div className="mt-1 font-mono text-[11px] font-bold text-emerald-700">
              تحكم {summaryInsights.strongestAxis.masteryRatePct.toFixed(1)}% · متوسط{' '}
              {summaryInsights.strongestAxis.averageScore.toFixed(2)}/
              {summaryInsights.strongestAxis.maxScore}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3.5">
          <div className="text-[11px] font-semibold text-red-800">
            الكفاية ذات الأولوية في الدعم
          </div>
          <div className="mt-1 truncate text-xs font-extrabold text-red-950">
            {summaryInsights.weakestAxis
              ? summaryInsights.weakestAxis.competencyTitle
              : '—'}
          </div>
          {summaryInsights.weakestAxis && (
            <div className="mt-1 font-mono text-[11px] font-bold text-red-700">
              تحكم {summaryInsights.weakestAxis.masteryRatePct.toFixed(1)}% ({summaryInsights.weakestAxis.weakCount}{' '}
              متعثر)
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="text-[11px] font-semibold text-slate-500">
            فقرات تستوجب معالجة جماعية (&lt; {masteryThresholdPct}%)
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
            <span
              className={`text-xl font-extrabold ${
                summaryInsights.criticalAxesCount > 0
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {summaryInsights.criticalAxesCount}
            </span>
            <span className="text-xs text-slate-500">
              من أصل {radarData.length} فقرات
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-600">
            {summaryInsights.criticalAxesCount === 0
              ? 'تحكم متوازن في جميع محاور الفرض'
              : 'يُنصح بتخصيص حصة دعم للفقرات الحرجة'}
          </div>
        </div>
      </div>

      {/* Main Radar Chart + Side Competency Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left/Center: Recharts Polar Radar Chart */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/40 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <Target className="h-4 w-4 text-teal-700" />
              التمثيل الشعاعي لمستوى تملك الكفايات والفقرات (0% إلى 100%)
            </h3>
            <span className="font-mono text-[11px] font-semibold text-slate-500">
              N = {presentStudents.length} تلميذ حاضراً
            </span>
          </div>

          <div className="h-[360px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="73%" data={radarData}>
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis
                  dataKey="shortAxisLabel"
                  tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 700 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={6}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  content={
                    <CompetencyRadarTooltip
                      hasSelectedStudent={Boolean(selectedStudent)}
                      selectedStudentName={selectedStudent?.fullName || ''}
                    />
                  }
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />

                {/* Reference Threshold Polygon */}
                <Radar
                  name={`عتبة التحكم المرجعية (${masteryThresholdPct}%)`}
                  dataKey="thresholdPct"
                  stroke="#dc2626"
                  strokeWidth={1.6}
                  strokeDasharray="4 4"
                  fill="none"
                  isAnimationActive={false}
                />

                {/* Class Average Score Completion Polygon */}
                <Radar
                  name="متوسط إنجاز القسم (%)"
                  dataKey="averageCompletionPct"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  fill="#4f46e5"
                  fillOpacity={0.14}
                  isAnimationActive={false}
                />

                {/* Class Mastery Rate Polygon (% of students >= threshold) */}
                <Radar
                  name={`نسبة المتحكمين بالقسم (≥ ${masteryThresholdPct}%)`}
                  dataKey="masteryRatePct"
                  stroke="#0f766e"
                  strokeWidth={2.6}
                  fill="#0f766e"
                  fillOpacity={0.28}
                  dot={{ r: 3.5, fill: '#0f766e' }}
                  isAnimationActive={false}
                />

                {/* Optional Selected Student Overlay Polygon */}
                {selectedStudent && (
                  <Radar
                    name={`التلميذ(ة): ${selectedStudent.fullName}`}
                    dataKey="studentPct"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    fill="#f59e0b"
                    fillOpacity={0.22}
                    dot={{ r: 4, fill: '#d97706' }}
                    isAnimationActive={false}
                  />
                )}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Competency & Exercise Diagnostic Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <Award className="h-4 w-4 text-teal-700" />
              تفصيل التحكم حسب كل فقرة / كفاية دراسية
            </h3>

            <div className="max-h-[310px] space-y-2.5 overflow-y-auto pl-1">
              {radarData.map((axis) => {
                const statusBadge =
                  axis.masteryRatePct >= 70
                    ? {
                        text: 'تحكم جيد',
                        cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        bar: 'bg-emerald-600',
                      }
                    : axis.masteryRatePct >= masteryThresholdPct
                    ? {
                        text: 'تحكم متوسط',
                        cls: 'bg-blue-50 text-blue-800 border-blue-200',
                        bar: 'bg-blue-600',
                      }
                    : {
                        text: 'تعثر يستوجب الدعم',
                        cls: 'bg-red-50 text-red-800 border-red-200',
                        bar: 'bg-red-600',
                      };

                return (
                  <div
                    key={axis.axisId}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-slate-900">
                          {axis.exerciseLabel}{' '}
                          <span className="font-mono text-[11px] font-semibold text-slate-500">
                            (/{axis.maxScore} ن)
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-teal-900">
                          {axis.competencyTitle}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${statusBadge.cls}`}
                      >
                        {statusBadge.text}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="mb-1 flex items-center justify-between font-mono text-[11px] tabular-nums">
                        <span className="text-slate-600">
                          المتحكمون:{' '}
                          <strong className="text-slate-900">
                            {axis.strongCount}/{axis.evaluatedCount}
                          </strong>{' '}
                          ({axis.masteryRatePct.toFixed(1)}%)
                        </span>
                        <span className="text-indigo-800">
                          المتوسط: <strong>{axis.averageScore.toFixed(2)}</strong>/
                          {axis.maxScore} ({axis.averageCompletionPct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full transition-all ${statusBadge.bar}`}
                          style={{ width: `${Math.min(100, axis.masteryRatePct)}%` }}
                        />
                      </div>
                    </div>

                    {axis.weakCount > 0 && (
                      <div className="mt-2 flex items-start gap-1.5 border-t border-slate-200/80 pt-1.5 text-[11px] text-slate-600">
                        {axis.masteryRatePct < masteryThresholdPct ? (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                        ) : (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" />
                        )}
                        <span>
                          <strong className="text-slate-800">
                            إجراء الدعم ({axis.weakCount} متعثر):
                          </strong>{' '}
                          {axis.remediationTask}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Full Competency & Remediation Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-xs font-extrabold text-slate-900">
            جدول تشخيص الكفايات والفقرات الدراسية وخطة المعالجة الموافقة (Item Definitions Matrix)
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">
            عتبة التمكن المعتمدة: {masteryThresholdPct}% من سلم كل تمرين
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="border-b border-slate-200 bg-white font-bold text-slate-700">
              <tr>
                <th className="px-3.5 py-2.5">التمرين / الفقرة</th>
                <th className="px-3.5 py-2.5">الكفاية أو المهارة المقومة</th>
                <th className="px-3.5 py-2.5 text-center">السلم</th>
                <th className="px-3.5 py-2.5 text-center">متوسط النقطة</th>
                <th className="px-3.5 py-2.5 text-center">نسبة الإنجاز</th>
                <th className="px-3.5 py-2.5 text-center">نسبة المتحكمين</th>
                <th className="px-3.5 py-2.5 text-center">المتعثرون</th>
                <th className="px-3.5 py-2.5">نشاط الدعم والمعالجة المبرمج</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {radarData.map((row) => (
                <tr key={`tbl-${row.axisId}`} className="hover:bg-slate-50/70">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900">
                    {row.exerciseLabel}
                  </td>
                  <td className="px-3.5 py-2.5 font-semibold text-teal-950">
                    {row.competencyTitle}
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-bold tabular-nums text-slate-700">
                    {row.maxScore}
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-bold tabular-nums text-slate-900">
                    {row.averageScore.toFixed(2)} / {row.maxScore}
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-semibold tabular-nums text-indigo-800">
                    {row.averageCompletionPct.toFixed(1)}%
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-extrabold tabular-nums">
                    <span
                      className={
                        row.masteryRatePct >= 70
                          ? 'text-emerald-700'
                          : row.masteryRatePct >= masteryThresholdPct
                          ? 'text-blue-700'
                          : 'text-red-700'
                      }
                    >
                      {row.masteryRatePct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-mono font-bold tabular-nums text-red-700">
                    {row.weakCount} ت
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-700">
                    {row.remediationTask}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
