import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FolderPlus,
  GitCompare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { ArchivedClassProject, StudentRecord } from '../types/report';
import { computeExamStats } from '../utils/massarParser';
import { GaussDistributionDataset } from './GaussDistributionPanel';

interface ArchiveExamComparisonPanelProps {
  activeDataset?: GaussDistributionDataset | null;
  archivedProjects: ArchivedClassProject[];
  onCreateDemoCohort?: () => Promise<void>;
  onSaveCurrentToArchive?: () => Promise<void>;
}

interface ComparisonOption {
  id: string;
  label: string;
  semester: string;
  examNumber: string;
  className: string;
  examDate: string;
  isLive?: boolean;
  dataset: GaussDistributionDataset;
}

interface MetricChartRow {
  metric: string;
  previousValue: number;
  currentValue: number;
  delta: number;
  unit: string;
}

interface BracketComparisonRow {
  id: string;
  label: string;
  rangeText: string;
  min: number;
  max: number;
  previousCount: number;
  currentCount: number;
  previousPct: number;
  currentPct: number;
  deltaPct: number;
}

interface MatchedStudentDeltaRow {
  key: string;
  code: string;
  fullName: string;
  previousScore: number | null;
  currentScore: number | null;
  previousAbsent: boolean;
  currentAbsent: boolean;
  delta: number | null;
  status: 'improved' | 'declined' | 'stable' | 'recovered_pass' | 'incomplete';
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

export const ArchiveExamComparisonPanel: React.FC<ArchiveExamComparisonPanelProps> = ({
  activeDataset,
  archivedProjects,
  onCreateDemoCohort,
  onSaveCurrentToArchive,
}) => {
  const [semesterFilter, setSemesterFilter] = useState<'all' | 's1' | 's2'>('all');
  const [selectedPreviousId, setSelectedPreviousId] = useState<string>('');
  const [selectedCurrentId, setSelectedCurrentId] = useState<string>('');
  const [studentFilter, setStudentFilter] = useState<
    'all' | 'improved' | 'recovered_pass' | 'declined'
  >('all');
  const [isBusy, setIsBusy] = useState(false);

  // Convert activeDataset + archivedProjects into unified ComparisonOptions
  const allOptions = useMemo<ComparisonOption[]>(() => {
    const list: ComparisonOption[] = [];

    if (activeDataset && activeDataset.students.length > 0) {
      list.push({
        id: activeDataset.id,
        label: `[الفرض الحالي النشط] ${activeDataset.metadata.className || 'القسم'} · ${
          activeDataset.metadata.examNumber || 'الفرض الحالي'
        } (${activeDataset.metadata.semester || 'الدورة الأولى'})`,
        semester: activeDataset.metadata.semester || 'الدورة الأولى',
        examNumber: activeDataset.metadata.examNumber || 'الفرض الحالي',
        className: activeDataset.metadata.className || 'القسم النشط',
        examDate: activeDataset.metadata.examDate || 'الحالي',
        isLive: true,
        dataset: activeDataset,
      });
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
        label: `${proj.name} (${proj.metadata.semester || 'الدورة الأولى'})`,
        semester: proj.metadata.semester || 'الدورة الأولى',
        examNumber: proj.metadata.examNumber || proj.name,
        className: proj.metadata.className || proj.name,
        examDate: proj.metadata.examDate || proj.updatedAt.slice(0, 10),
        isLive: false,
        dataset: {
          id: proj.id,
          label: proj.name,
          isLiveWorkspace: false,
          students: proj.students,
          metadata: proj.metadata,
          template: proj.template,
          stats: computed,
        },
      });
    }

    return list;
  }, [activeDataset, archivedProjects]);

  // Filter previous exam candidates by semester filter if selected
  const filteredPreviousOptions = useMemo<ComparisonOption[]>(() => {
    return allOptions.filter((opt) => {
      if (semesterFilter === 's1') {
        return opt.semester.includes('الأولى') || opt.semester.includes('1');
      }
      if (semesterFilter === 's2') {
        return opt.semester.includes('الثانية') || opt.semester.includes('2');
      }
      return true;
    });
  }, [allOptions, semesterFilter]);

  // Determine default Current Exam (prefer live workspace, else latest archived)
  const currentOption = useMemo<ComparisonOption | null>(() => {
    if (allOptions.length === 0) return null;
    if (selectedCurrentId) {
      const found = allOptions.find((o) => o.id === selectedCurrentId);
      if (found) return found;
    }
    return allOptions[0];
  }, [allOptions, selectedCurrentId]);

  // Determine default Previous Exam (prefer same class from archive that is not currentOption)
  const previousOption = useMemo<ComparisonOption | null>(() => {
    const pool =
      filteredPreviousOptions.length > 0 ? filteredPreviousOptions : allOptions;
    if (pool.length === 0) return null;

    if (selectedPreviousId) {
      const found = pool.find((o) => o.id === selectedPreviousId);
      if (found) return found;
    }

    const candidates = pool.filter((o) => o.id !== currentOption?.id);
    if (candidates.length === 0) return pool[0];

    if (currentOption) {
      const sameClass = candidates.find(
        (c) =>
          c.className.trim().toLowerCase() ===
          currentOption.className.trim().toLowerCase()
      );
      if (sameClass) return sameClass;
    }

    return candidates[0];
  }, [filteredPreviousOptions, allOptions, selectedPreviousId, currentOption]);

  const handleSwapExams = () => {
    if (!previousOption || !currentOption) return;
    setSelectedPreviousId(currentOption.id);
    setSelectedCurrentId(previousOption.id);
  };

  // Core Statistical Averages Comparison (0..20 scale)
  const averagesChartData = useMemo<MetricChartRow[]>(() => {
    if (!previousOption || !currentOption) return [];
    const prev = previousOption.dataset.stats;
    const curr = currentOption.dataset.stats;

    return [
      {
        metric: 'المعدل العام (μ)',
        previousValue: Number(prev.average.toFixed(2)),
        currentValue: Number(curr.average.toFixed(2)),
        delta: Number((curr.average - prev.average).toFixed(2)),
        unit: '/20',
      },
      {
        metric: 'القيمة الوسطية (Me)',
        previousValue: Number(prev.median.toFixed(2)),
        currentValue: Number(curr.median.toFixed(2)),
        delta: Number((curr.median - prev.median).toFixed(2)),
        unit: '/20',
      },
      {
        metric: 'أعلى نقطة',
        previousValue: Number(prev.maxScore.toFixed(2)),
        currentValue: Number(curr.maxScore.toFixed(2)),
        delta: Number((curr.maxScore - prev.maxScore).toFixed(2)),
        unit: '/20',
      },
      {
        metric: 'أدنى نقطة',
        previousValue: Number(prev.minScore.toFixed(2)),
        currentValue: Number(curr.minScore.toFixed(2)),
        delta: Number((curr.minScore - prev.minScore).toFixed(2)),
        unit: '/20',
      },
      {
        metric: 'الانحراف المعياري (σ)',
        previousValue: Number(prev.stdDev.toFixed(2)),
        currentValue: Number(curr.stdDev.toFixed(2)),
        delta: Number((curr.stdDev - prev.stdDev).toFixed(2)),
        unit: 'ن',
      },
    ];
  }, [previousOption, currentOption]);

  // Memo 142-08 5 Mastery Brackets Comparison
  const bracketsComparisonData = useMemo<BracketComparisonRow[]>(() => {
    if (!previousOption || !currentOption) return [];

    const prevScores = previousOption.dataset.students
      .filter((s) => !s.isAbsent && typeof s.score === 'number')
      .map((s) => s.score as number);
    const currScores = currentOption.dataset.students
      .filter((s) => !s.isAbsent && typeof s.score === 'number')
      .map((s) => s.score as number);

    const prevN = Math.max(1, prevScores.length);
    const currN = Math.max(1, currScores.length);

    const rawBrackets = [
      { id: 'b1', label: 'تعثر حاد', rangeText: '[0 - 5[', min: 0, max: 5 },
      { id: 'b2', label: 'دون المتوسط', rangeText: '[5 - 10[', min: 5, max: 10 },
      { id: 'b3', label: 'تحكم متوسط', rangeText: '[10 - 14[', min: 10, max: 14 },
      { id: 'b4', label: 'تحكم جيد', rangeText: '[14 - 18[', min: 14, max: 18 },
      { id: 'b5', label: 'تميز وإتقان', rangeText: '[18 - 20]', min: 18, max: 20 },
    ];

    return rawBrackets.map((b, idx) => {
      const isLast = idx === rawBrackets.length - 1;
      const previousCount = prevScores.filter((s) =>
        isLast ? s >= b.min && s <= b.max : s >= b.min && s < b.max
      ).length;
      const currentCount = currScores.filter((s) =>
        isLast ? s >= b.min && s <= b.max : s >= b.min && s < b.max
      ).length;

      const previousPct = Number(((previousCount / prevN) * 100).toFixed(1));
      const currentPct = Number(((currentCount / currN) * 100).toFixed(1));
      const deltaPct = Number((currentPct - previousPct).toFixed(1));

      return {
        ...b,
        previousCount,
        currentCount,
        previousPct,
        currentPct,
        deltaPct,
      };
    });
  }, [previousOption, currentOption]);

  // Student-by-Student Matched Comparison between Previous Exam and Current Exam
  const studentComparison = useMemo(() => {
    if (!previousOption || !currentOption) {
      return {
        rows: [] as MatchedStudentDeltaRow[],
        improvedCount: 0,
        declinedCount: 0,
        stableCount: 0,
        recoveredPassCount: 0,
        matchedCount: 0,
      };
    }

    const passThreshold = currentOption.dataset.template.passThreshold || 10;
    const prevMap = new Map<string, StudentRecord>();
    for (const st of previousOption.dataset.students) {
      prevMap.set(normalizeStudentMatchKey(st), st);
    }

    const allKeys = new Set<string>();
    for (const st of previousOption.dataset.students) {
      allKeys.add(normalizeStudentMatchKey(st));
    }
    for (const st of currentOption.dataset.students) {
      allKeys.add(normalizeStudentMatchKey(st));
    }

    const currMap = new Map<string, StudentRecord>();
    for (const st of currentOption.dataset.students) {
      currMap.set(normalizeStudentMatchKey(st), st);
    }

    let improvedCount = 0;
    let declinedCount = 0;
    let stableCount = 0;
    let recoveredPassCount = 0;
    let matchedCount = 0;

    const rows: MatchedStudentDeltaRow[] = [];

    for (const key of allKeys) {
      const prevSt = prevMap.get(key);
      const currSt = currMap.get(key);

      const previousAbsent = Boolean(prevSt?.isAbsent);
      const currentAbsent = Boolean(currSt?.isAbsent);
      const previousScore =
        prevSt && !prevSt.isAbsent && typeof prevSt.score === 'number'
          ? prevSt.score
          : null;
      const currentScore =
        currSt && !currSt.isAbsent && typeof currSt.score === 'number'
          ? currSt.score
          : null;

      let delta: number | null = null;
      let status: MatchedStudentDeltaRow['status'] = 'incomplete';

      if (previousScore !== null && currentScore !== null) {
        matchedCount += 1;
        delta = Math.round((currentScore - previousScore) * 100) / 100;

        const isRecovered =
          previousScore < passThreshold && currentScore >= passThreshold;
        if (isRecovered) {
          recoveredPassCount += 1;
        }

        if (delta >= 0.5) {
          improvedCount += 1;
          status = isRecovered ? 'recovered_pass' : 'improved';
        } else if (delta <= -0.5) {
          declinedCount += 1;
          status = 'declined';
        } else {
          stableCount += 1;
          status = isRecovered ? 'recovered_pass' : 'stable';
        }
      }

      rows.push({
        key,
        code: currSt?.code || prevSt?.code || '',
        fullName: currSt?.fullName || prevSt?.fullName || 'تلميذ',
        previousScore,
        currentScore,
        previousAbsent,
        currentAbsent,
        delta,
        status,
      });
    }

    rows.sort((a, b) => {
      const dB = b.delta ?? -999;
      const dA = a.delta ?? -999;
      if (dB !== dA) return dB - dA;
      return a.fullName.localeCompare(b.fullName, 'ar');
    });

    return {
      rows,
      improvedCount,
      declinedCount,
      stableCount,
      recoveredPassCount,
      matchedCount,
    };
  }, [previousOption, currentOption]);

  const filteredStudentRows = useMemo(() => {
    return studentComparison.rows.filter((r) => {
      if (studentFilter === 'improved') {
        return r.status === 'improved' || r.status === 'recovered_pass';
      }
      if (studentFilter === 'recovered_pass') {
        return r.status === 'recovered_pass';
      }
      if (studentFilter === 'declined') {
        return r.status === 'declined';
      }
      return true;
    });
  }, [studentComparison.rows, studentFilter]);

  const handleExportComparisonExcel = () => {
    if (!previousOption || !currentOption) return;
    const wb = XLSX.utils.book_new();
    const prevStats = previousOption.dataset.stats;
    const currStats = currentOption.dataset.stats;

    const summarySheetRows: (string | number)[][] = [
      ['تقرير المقارنة الثنائية بين الفرض السابق والفرض الحالي (المذكرة 142-08)'],
      ['المؤشر الإحصائي', previousOption.label, currentOption.label, 'الفارق (Δ)'],
      [
        'المعدل العام للقسم (/20)',
        Number(prevStats.average.toFixed(2)),
        Number(currStats.average.toFixed(2)),
        Number((currStats.average - prevStats.average).toFixed(2)),
      ],
      [
        'القيمة الوسطية (/20)',
        Number(prevStats.median.toFixed(2)),
        Number(currStats.median.toFixed(2)),
        Number((currStats.median - prevStats.median).toFixed(2)),
      ],
      [
        'نسبة التحكم والنجاح (%)',
        Number(prevStats.passRate.toFixed(1)),
        Number(currStats.passRate.toFixed(1)),
        Number((currStats.passRate - prevStats.passRate).toFixed(1)),
      ],
      [
        'الانحراف المعياري (σ)',
        Number(prevStats.stdDev.toFixed(2)),
        Number(currStats.stdDev.toFixed(2)),
        Number((currStats.stdDev - prevStats.stdDev).toFixed(2)),
      ],
      [
        'أعلى نقطة (/20)',
        Number(prevStats.maxScore.toFixed(2)),
        Number(currStats.maxScore.toFixed(2)),
        Number((currStats.maxScore - prevStats.maxScore).toFixed(2)),
      ],
      [
        'أدنى نقطة (/20)',
        Number(prevStats.minScore.toFixed(2)),
        Number(currStats.minScore.toFixed(2)),
        Number((currStats.minScore - prevStats.minScore).toFixed(2)),
      ],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summarySheetRows);
    ws1['!cols'] = [{ wch: 26 }, { wch: 30 }, { wch: 30 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'مقارنة_المتوسطات');

    const studentsSheetRows: (string | number)[][] = [
      ['مقارنة نقط التلاميذ الفردية بين الفرض السابق والفرض الحالي'],
      [
        'رمز مسار',
        'الاسم الكامل',
        `الفرض السابق: ${previousOption.examNumber}`,
        `الفرض الحالي: ${currentOption.examNumber}`,
        'الفارق (Δ)',
        'التشخيص التطوري',
      ],
      ...studentComparison.rows.map((r) => [
        r.code || '—',
        r.fullName,
        r.previousAbsent
          ? 'غائب'
          : r.previousScore !== null
          ? Number(r.previousScore.toFixed(2))
          : '—',
        r.currentAbsent
          ? 'غائب'
          : r.currentScore !== null
          ? Number(r.currentScore.toFixed(2))
          : '—',
        r.delta !== null ? Number(r.delta.toFixed(2)) : '—',
        r.status === 'recovered_pass'
          ? 'تدارك عتبة التحكم (≥ 10)'
          : r.status === 'improved'
          ? 'تحسن ملحوظ'
          : r.status === 'declined'
          ? 'تراجع يستوجب الدعم'
          : r.status === 'stable'
          ? 'استقرار'
          : 'معطيات غير مكتملة',
      ]),
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(studentsSheetRows);
    ws2['!cols'] = [
      { wch: 15 },
      { wch: 28 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'تطور_التلاميذ');

    XLSX.writeFile(
      wb,
      `مقارنة_الفرض_السابق_والحالي_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  if (allOptions.length < 2) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <GitCompare className="mx-auto mb-3 h-10 w-10 text-teal-700" strokeWidth={1.6} />
        <h2 className="text-base font-bold text-slate-900">
          مقارنة الفرض الحالي مع فرض أو فصل دراسي سابق من الأرشيف
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600">
          لإجراء مقارنة بيانية مباشرة بين متوسطات الفرض الحالي وفرض سابق (أو دورة دراسية سابقة)، يرجى حفظ الفرض الحالي في الأرشيف أو إنشاء سلسلة فروض نموذجية (ف1 ← ف3) لمعاينة المقارنة فوراً.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {activeDataset && onSaveCurrentToArchive && (
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                setIsBusy(true);
                try {
                  await onSaveCurrentToArchive();
                } finally {
                  setIsBusy(false);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              حفظ الفرض النشط في الأرشيف
            </button>
          )}
          {onCreateDemoCohort && (
            <button
              type="button"
              disabled={isBusy}
              onClick={async () => {
                setIsBusy(true);
                try {
                  await onCreateDemoCohort();
                } finally {
                  setIsBusy(false);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-700" />
              إنشاء أرشيف فروض سابقة تجريبي (ف1 ← ف3) للمقارنة الفورية
            </button>
          )}
        </div>
      </section>
    );
  }

  if (!previousOption || !currentOption) return null;

  const prevStats = previousOption.dataset.stats;
  const currStats = currentOption.dataset.stats;
  const deltaAverage = Number((currStats.average - prevStats.average).toFixed(2));
  const deltaMedian = Number((currStats.median - prevStats.median).toFixed(2));
  const deltaPassRate = Number((currStats.passRate - prevStats.passRate).toFixed(1));
  const deltaStdDev = Number((currStats.stdDev - prevStats.stdDev).toFixed(2));

  const isSameExamSelected = previousOption.id === currentOption.id;

  return (
    <div className="space-y-6">
      {/* Selector Card: Choose Previous Semester/Exam vs Current Exam */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  مقارنة الفرض الحالي مع فرض أو فصل دراسي سابق من الأرشيف
                </h2>
                <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-900">
                  <BookOpen className="h-3 w-3" />
                  تتبع التطور الدراسي وأثر الدعم (142-08)
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                اختر الفرض أو الفصل الدراسي المرجعي (السابق) من الأرشيف لمقارنة متوسطات القسم ونسب التحكم وتطور التلاميذ بيانيًا مع الفرض الحالي
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Semester Filter for Archive Picker */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setSemesterFilter('all')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  semesterFilter === 'all'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كل الدورات ({allOptions.length})
              </button>
              <button
                type="button"
                onClick={() => setSemesterFilter('s1')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  semesterFilter === 's1'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الدورة الأولى
              </button>
              <button
                type="button"
                onClick={() => setSemesterFilter('s2')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  semesterFilter === 's2'
                    ? 'bg-white text-teal-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الدورة الثانية
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportComparisonExcel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              تصدير جدول المقارنة Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Dual Selectors: Previous Archive Exam vs Current Exam */}
        <div className="mt-4 grid grid-cols-1 items-center gap-3 lg:grid-cols-11">
          {/* Box 1: Previous Archived Exam / Semester */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <label
              htmlFor="prev-archive-exam-select"
              className="flex items-center justify-between text-xs font-bold text-slate-700"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />
                1. الفرض أو الفصل الدراسي السابق (المرجع من الأرشيف)
              </span>
              <span className="font-mono text-[11px] font-semibold text-slate-500">
                {previousOption.semester}
              </span>
            </label>
            <select
              id="prev-archive-exam-select"
              value={previousOption.id}
              onChange={(e) => setSelectedPreviousId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-teal-700 focus:outline-none"
            >
              {(filteredPreviousOptions.length > 0
                ? filteredPreviousOptions
                : allOptions
              ).map((opt) => (
                <option key={`prev-${opt.id}`} value={opt.id}>
                  {opt.label} — المعدل {opt.dataset.stats.average.toFixed(2)}/20
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 text-slate-400" />
                تاريخ الإنجاز: <strong className="font-mono">{previousOption.examDate}</strong>
              </span>
              <span className="font-mono font-semibold">
                الحاضرون: {prevStats.present}/{prevStats.total} · المعدل:{' '}
                <strong className="text-slate-900">{prevStats.average.toFixed(2)}/20</strong>
              </span>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center lg:col-span-1">
            <button
              type="button"
              onClick={handleSwapExams}
              title="تبديل الفرض السابق والفرض الحالي"
              aria-label="تبديل الفرض السابق والفرض الحالي"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-2xs transition-colors hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800 cursor-pointer"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>

          {/* Box 2: Current Exam (Active Workspace or Target Archive Exam) */}
          <div className="lg:col-span-5 rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
            <label
              htmlFor="curr-exam-select"
              className="flex items-center justify-between text-xs font-bold text-teal-950"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-700" />
                2. الفرض الحالي (المراد تقييم تطوره)
              </span>
              <span className="rounded bg-teal-100 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-teal-900">
                {currentOption.isLive ? 'القسم النشط حالياً' : currentOption.semester}
              </span>
            </label>
            <select
              id="curr-exam-select"
              value={currentOption.id}
              onChange={(e) => setSelectedCurrentId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-teal-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-teal-700 focus:outline-none"
            >
              {allOptions.map((opt) => (
                <option key={`curr-${opt.id}`} value={opt.id}>
                  {opt.label} — المعدل {opt.dataset.stats.average.toFixed(2)}/20
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-teal-900">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3 text-teal-700" />
                تاريخ الإنجاز: <strong className="font-mono">{currentOption.examDate}</strong>
              </span>
              <span className="font-mono font-semibold">
                الحاضرون: {currStats.present}/{currStats.total} · المعدل:{' '}
                <strong className="text-teal-950">{currStats.average.toFixed(2)}/20</strong>
              </span>
            </div>
          </div>
        </div>

        {isSameExamSelected && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900">
            تنبيه: لقد اخترت نفس الفرض في الخانتين. يرجى اختيار فرض سابق مختلف من القائمة الأولى لمعاينة الفوارق (Δ) والتطور الدراسي.
          </div>
        )}
      </section>

      {/* Delta KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Class Average Delta */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">
            تطور المعدل العام للقسم (μ)
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-extrabold text-slate-900">
                {currStats.average.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">
                {' '}
                ← {prevStats.average.toFixed(2)}
              </span>
            </div>
            <span
              dir="ltr"
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold ${
                deltaAverage > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : deltaAverage < 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {deltaAverage > 0 ? `+${deltaAverage.toFixed(2)}` : deltaAverage.toFixed(2)}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-600">
            {deltaAverage > 0.2
              ? 'تحسن إيجابي في متوسط التحصيل'
              : deltaAverage < -0.2
              ? 'تراجع في المتوسط يستدعي دعماً'
              : 'استقرار في المعدل العام للقسم'}
          </div>
        </div>

        {/* KPI 2: Median Score Delta */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">
            تطور القيمة الوسطية (Me)
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-extrabold text-slate-900">
                {currStats.median.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">
                {' '}
                ← {prevStats.median.toFixed(2)}
              </span>
            </div>
            <span
              dir="ltr"
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold ${
                deltaMedian > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : deltaMedian < 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {deltaMedian > 0 ? `+${deltaMedian.toFixed(2)}` : deltaMedian.toFixed(2)}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-600">
            الانحراف المعياري: σ = {currStats.stdDev.toFixed(2)} (
            <span dir="ltr">
              {deltaStdDev > 0 ? `+${deltaStdDev.toFixed(2)}` : deltaStdDev.toFixed(2)}
            </span>
            )
          </div>
        </div>

        {/* KPI 3: Mastery / Pass Rate Delta */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-500">
            تطور نسبة التحكم (≥ 10/20)
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-extrabold text-teal-800">
                {currStats.passRate.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">
                {' '}
                ← {prevStats.passRate.toFixed(1)}%
              </span>
            </div>
            <span
              dir="ltr"
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-extrabold ${
                deltaPassRate > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : deltaPassRate < 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {deltaPassRate > 0 ? `+${deltaPassRate.toFixed(1)}%` : `${deltaPassRate.toFixed(1)}%`}
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-600">
            المتحكمون: {currStats.passed} تلميذ(ة) مقابل {prevStats.passed} سابقاً
          </div>
        </div>

        {/* KPI 4: Individual Student Progression & Support Recovery */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
          <div className="text-xs font-semibold text-teal-900">
            حصيلة التطور الفردي وأثر الدعم
          </div>
          <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-2xl font-extrabold text-emerald-700">
              {studentComparison.improvedCount}
            </span>
            <span className="text-xs font-bold text-teal-950">متحسّن</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-sm font-bold text-red-700">
              {studentComparison.declinedCount} متراجع
            </span>
          </div>
          <div className="mt-1.5 text-[11px] font-semibold text-teal-800">
            تداركوا عتبة التحكم بعد التعثر:{' '}
            <strong className="font-mono">{studentComparison.recoveredPassCount}</strong> تلميذ(ة)
          </div>
        </div>
      </div>

      {/* Dual Visual Charts: 1) Class Averages Bar Chart  2) Mastery Brackets Shift Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Direct Visual Comparison of Class Averages & Statistical Indicators */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BarChart3 className="h-4 w-4 text-teal-700" />
                المقارنة البيانية لمتوسطات القسم والمؤشرات الإحصائية (/20)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                مقارنة مباشرة للمعدل العام والوسيط وأعلى/أدنى نقطة والانحراف المعياري بين الفرضين
              </p>
            </div>
          </div>

          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={averagesChartData}
                margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="metric"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="previousValue"
                  name={`السابق: ${previousOption.examNumber}`}
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="currentValue"
                  name={`الحالي: ${currentOption.examNumber}`}
                  fill="#0f766e"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Shift in Memo 142-08 Mastery Brackets (%) */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Award className="h-4 w-4 text-indigo-700" />
                تحول توزيع فئات التحكم الخمس (المذكرة 142-08) بين الفرضين (%)
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                رصد انتقال التلاميذ من فئات التعثر [0-10[ نحو فئات التحكم والتميز [10-20]
              </p>
            </div>
          </div>

          <div className="h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bracketsComparisonData}
                margin={{ top: 12, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="previousPct"
                  name={`السابق: ${previousOption.examNumber} (%)`}
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="currentPct"
                  name={`الحالي: ${currentOption.examNumber} (%)`}
                  fill="#1e3a8a"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Automated Pedagogical Synthesis of Class Progression */}
      <section className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" />
          <div className="space-y-1 text-xs leading-relaxed text-slate-800">
            <div className="font-extrabold text-teal-950">
              قراءة تربوية آلية لتطور مستوى القسم بين «{previousOption.examNumber}» و«
              {currentOption.examNumber}»:
            </div>
            <p>
              {deltaAverage >= 0.3 ? (
                <>
                  سجّل القسم <strong>منحىً تصاعدياً إيجابياً</strong> حيث ارتفع المعدل العام بـ{' '}
                  <strong dir="ltr">+{deltaAverage.toFixed(2)}</strong> نقطة (من{' '}
                  {prevStats.average.toFixed(2)} إلى {currStats.average.toFixed(2)}/20)، وتطورت
                  نسبة التحكم بـ <strong dir="ltr">{deltaPassRate >= 0 ? `+${deltaPassRate.toFixed(1)}%` : `${deltaPassRate.toFixed(1)}%`}</strong>. كما تمكن{' '}
                  <strong>{studentComparison.recoveredPassCount} متعلم(ة)</strong> من تجاوز عتبة
                  10/20 بعد أن كانوا دون المعدل في الفرض السابق، مما يؤكد نجاعة أنشطة الدعم
                  والمعالجة المنجزة.
                </>
              ) : deltaAverage <= -0.3 ? (
                <>
                  يُلاحظ <strong>تراجع في متوسط أداء القسم</strong> بفارق{' '}
                  <strong dir="ltr">{deltaAverage.toFixed(2)}</strong> نقطة (من{' '}
                  {prevStats.average.toFixed(2)} إلى {currStats.average.toFixed(2)}/20) مع تسجيل
                  تراجع لدى <strong>{studentComparison.declinedCount} متعلم(ة)</strong>. وفق
                  المذكرة 142-08، يُعزى هذا التفاوت غالباً إلى انتقال المقرر نحو وحدات ذات تجريد
                  أعلى أو تراكم تعثرات قبلية، مما يستدعي تكييف خطة الدعم الفوري ومراجعة الأخطاء
                  المنهجية الأكثر تردداً.
                </>
              ) : (
                <>
                  حافظ القسم على <strong>إيقاع تحصيل مستقر ومتوازن</strong> بين الفرضين (المعدل
                  السابق {prevStats.average.toFixed(2)} والحالي {currStats.average.toFixed(2)}/20)،
                  مع تحسن فردي لدى <strong>{studentComparison.improvedCount} متعلم(ة)</strong>{' '}
                  وانتقال <strong>{studentComparison.recoveredPassCount} متعلم(ة)</strong> إلى ضفة
                  التحكم (≥ 10/20).
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Student-by-Student Matched Comparison Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-700" />
            <h3 className="text-sm font-bold text-slate-900">
              مقارنة النتائج الفردية للتلاميذ بين الفرضين ({filteredStudentRows.length} تلميذ)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
            {(
              [
                { id: 'all', label: `الكل (${studentComparison.rows.length})` },
                {
                  id: 'improved',
                  label: `المتحسّنون (${studentComparison.improvedCount})`,
                },
                {
                  id: 'recovered_pass',
                  label: `تداركوا العتبة (${studentComparison.recoveredPassCount})`,
                },
                {
                  id: 'declined',
                  label: `المتراجعون (${studentComparison.declinedCount})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStudentFilter(tab.id)}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  studentFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-right text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
              <tr>
                <th className="px-3.5 py-2.5 w-28">رمز مسار</th>
                <th className="px-3.5 py-2.5">الاسم الكامل</th>
                <th className="px-3.5 py-2.5 text-center">
                  السابق: {previousOption.examNumber}
                </th>
                <th className="px-3.5 py-2.5 text-center">
                  الحالي: {currentOption.examNumber}
                </th>
                <th className="px-3.5 py-2.5 text-center">الفارق (Δ)</th>
                <th className="px-3.5 py-2.5 text-center">تشخيص التطور الفردي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudentRows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/70">
                  <td className="px-3.5 py-2 font-mono text-slate-500">
                    {row.code || '—'}
                  </td>
                  <td className="px-3.5 py-2 font-semibold text-slate-900">
                    {row.fullName}
                  </td>
                  <td className="px-3.5 py-2 text-center font-mono font-bold tabular-nums text-slate-600">
                    {row.previousAbsent ? (
                      <span className="text-amber-700">غائب</span>
                    ) : row.previousScore !== null ? (
                      row.previousScore.toFixed(2)
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-center font-mono font-bold tabular-nums">
                    {row.currentAbsent ? (
                      <span className="text-amber-700">غائب</span>
                    ) : row.currentScore !== null ? (
                      <span
                        className={
                          row.currentScore >=
                          (currentOption.dataset.template.passThreshold || 10)
                            ? 'text-emerald-700'
                            : 'text-red-700'
                        }
                      >
                        {row.currentScore.toFixed(2)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td
                    className="px-3.5 py-2 text-center font-mono font-extrabold tabular-nums"
                    dir="ltr"
                  >
                    {row.delta === null ? (
                      '—'
                    ) : (
                      <span
                        className={
                          row.delta >= 0.5
                            ? 'text-emerald-700'
                            : row.delta <= -0.5
                            ? 'text-red-700'
                            : 'text-slate-600'
                        }
                      >
                        {row.delta > 0 ? `+${row.delta.toFixed(2)}` : row.delta.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2 text-center font-semibold">
                    {row.status === 'recovered_pass' ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-900">
                        <TrendingUp className="h-3.5 w-3.5 text-teal-700" />
                        تدارك العتبة (≥ 10)
                      </span>
                    ) : row.status === 'improved' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        تحسّن ملحوظ
                      </span>
                    ) : row.status === 'declined' ? (
                      <span className="inline-flex items-center gap-1 text-red-700">
                        <TrendingDown className="h-3.5 w-3.5" />
                        تراجع يستوجب التتبع
                      </span>
                    ) : row.status === 'stable' ? (
                      <span className="text-slate-600">استقرار نسبي</span>
                    ) : (
                      <span className="text-slate-400">بيانات غير مكتملة</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
