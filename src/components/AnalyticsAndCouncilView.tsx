import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CheckSquare,
  FileSpreadsheet,
  FolderPlus,
  LineChart as LineChartIcon,
  Save,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { ArchivedClassProject } from '../types/report';
import {
  computeClassCouncilSummary,
  computeLongitudinalComparison,
} from '../utils/pedagogicalAnalytics';

interface AnalyticsAndCouncilViewProps {
  projects: ArchivedClassProject[];
  hasActiveStudents: boolean;
  onSaveCurrentToArchive: () => Promise<void>;
  onCreateDemoCohort: () => Promise<void>;
  onLoadProject: (project: ArchivedClassProject) => void;
  onOpenArchiveDrawer: () => void;
  onBackToWorkflow: () => void;
}

type AnalyticsTab = 'longitudinal' | 'council';
type TrajectoryFilter = 'all' | 'improved' | 'declined' | 'recovered';

export const AnalyticsAndCouncilView: React.FC<AnalyticsAndCouncilViewProps> = ({
  projects,
  hasActiveStudents,
  onSaveCurrentToArchive,
  onCreateDemoCohort,
  onLoadProject,
  onOpenArchiveDrawer,
  onBackToWorkflow,
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('longitudinal');
  const [selectedLongitudinalIds, setSelectedLongitudinalIds] = useState<string[] | null>(
    null
  );
  const [selectedCouncilIds, setSelectedCouncilIds] = useState<string[] | null>(null);
  const [trajectoryFilter, setTrajectoryFilter] = useState<TrajectoryFilter>('all');
  const [isBusy, setIsBusy] = useState(false);

  // Auto-select chronological projects of the first/most common class for Longitudinal view when none explicitly picked
  const effectiveLongitudinalProjects = useMemo(() => {
    if (selectedLongitudinalIds !== null) {
      const set = new Set(selectedLongitudinalIds);
      return projects.filter((p) => set.has(p.id));
    }
    if (projects.length === 0) return [];
    const countsByClass = new Map<string, ArchivedClassProject[]>();
    for (const p of projects) {
      const key = `${p.metadata.className || p.name}::${p.metadata.subject || ''}`;
      if (!countsByClass.has(key)) countsByClass.set(key, []);
      countsByClass.get(key)!.push(p);
    }
    const groups = Array.from(countsByClass.values()).sort(
      (a, b) => b.length - a.length
    );
    return groups[0] && groups[0].length >= 2 ? groups[0] : projects.slice(0, 4);
  }, [projects, selectedLongitudinalIds]);

  const effectiveCouncilProjects = useMemo(() => {
    if (selectedCouncilIds !== null) {
      const set = new Set(selectedCouncilIds);
      return projects.filter((p) => set.has(p.id));
    }
    return projects;
  }, [projects, selectedCouncilIds]);

  const activePassThreshold = effectiveLongitudinalProjects[0]?.template.passThreshold ?? 10;

  const longitudinal = useMemo(
    () =>
      computeLongitudinalComparison(
        effectiveLongitudinalProjects,
        activePassThreshold
      ),
    [effectiveLongitudinalProjects, activePassThreshold]
  );

  const council = useMemo(
    () => computeClassCouncilSummary(effectiveCouncilProjects),
    [effectiveCouncilProjects]
  );

  const filteredTrajectories = useMemo(() => {
    return longitudinal.trajectories.filter((t) => {
      if (trajectoryFilter === 'improved') return t.trend === 'improved';
      if (trajectoryFilter === 'declined') return t.trend === 'declined';
      if (trajectoryFilter === 'recovered') return t.recoveredPass;
      return true;
    });
  }, [longitudinal.trajectories, trajectoryFilter]);

  const toggleLongitudinalId = (id: string) => {
    const current = new Set(effectiveLongitudinalProjects.map((p) => p.id));
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setSelectedLongitudinalIds(Array.from(current));
  };

  const toggleCouncilId = (id: string) => {
    const current = new Set(effectiveCouncilProjects.map((p) => p.id));
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    setSelectedCouncilIds(Array.from(current));
  };

  const handleExportCouncilExcel = () => {
    const wb = XLSX.utils.book_new();
    const classRows: (string | number)[][] = [
      ['لوحة مقارنة الأقسام والمواد لمجالس الأقسام والتوجيه'],
      [
        'القسم',
        'المستوى',
        'المادة',
        'الفرض / الدورة',
        'المسجلون',
        'الحاضرون',
        'الغائبون',
        'المعدل العام (/20)',
        'نسبة التحكم (%)',
        'الانحراف المعياري',
        'دون المعدل',
      ],
      ...council.classes.map((c) => [
        c.className,
        c.level,
        c.subject,
        `${c.examNumber} (${c.semester})`,
        c.total,
        c.present,
        c.absent,
        Number(c.average.toFixed(2)),
        Number(c.passRate.toFixed(1)),
        Number(c.stdDev.toFixed(2)),
        c.failed,
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(classRows);
    ws1['!cols'] = [
      { wch: 16 },
      { wch: 24 },
      { wch: 16 },
      { wch: 24 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 16 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'مقارنة الأقسام');

    const alertRows: (string | number)[][] = [
      ['التلاميذ المتعثرون بشكل متكرر أو الحادين (محضر التوجيه والدعم)'],
      ['الاسم الكامل', 'رمز مسار', 'عدد التعثرات', 'متوسط النقط (/20)', 'التفاصيل'],
      ...council.recurringStruggling.map((st) => [
        st.fullName,
        st.code,
        st.occurrences,
        Number(st.meanScore.toFixed(2)),
        st.contexts
          .map((cx) => `${cx.subject} (${cx.examNumber}): ${cx.score.toFixed(2)}`)
          .join(' | '),
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(alertRows);
    ws2['!cols'] = [
      { wch: 26 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 48 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'المتعثرون المتكررون');

    XLSX.writeFile(
      wb,
      `لوحة_مجلس_الأقسام_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleExportLongitudinalExcel = () => {
    if (longitudinal.exams.length < 2) return;
    const wb = XLSX.utils.book_new();

    const examSummaryRows: (string | number)[][] = [
      ['حصيلة التتبع التطوري لأداء القسم عبر الفروض المتتالية'],
      ['الفرض', 'المسجلون', 'الحاضرون', 'الغائبون', 'المعدل العام (/20)', 'نسبة التحكم (%)'],
      ...longitudinal.exams.map((ex) => [
        ex.label,
        ex.present + ex.absent,
        ex.present,
        ex.absent,
        Number(ex.average.toFixed(2)),
        Number(ex.passRate.toFixed(1)),
      ]),
    ];
    const wsExams = XLSX.utils.aoa_to_sheet(examSummaryRows);
    wsExams['!cols'] = [
      { wch: 24 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsExams, 'تطور الفروض');

    const trajectoryRows: (string | number)[][] = [
      ['تتبع المسار الفردي للمتعلمين عبر الفروض (Δ وأثر الدعم)'],
      [
        'رمز مسار',
        'الاسم الكامل',
        ...longitudinal.exams.map((ex) => ex.label),
        'الفارق (Δ)',
        'المنحى التطوري',
        'تدارك العتبة بعد الدعم',
      ],
      ...longitudinal.trajectories.map((tr) => [
        tr.code || '—',
        tr.fullName,
        ...longitudinal.exams.map((ex) => {
          if (tr.absentByExam[ex.projectId]) return 'غائب';
          const sc = tr.scoresByExam[ex.projectId];
          return typeof sc === 'number' ? Number(sc.toFixed(2)) : '—';
        }),
        tr.delta !== null ? Number(tr.delta.toFixed(2)) : '—',
        tr.trend === 'improved'
          ? 'تحسن ملحوظ'
          : tr.trend === 'declined'
          ? 'تراجع يستوجب التتبع'
          : tr.trend === 'stable'
          ? 'استقرار نسبي'
          : 'نقط غير كافية',
        tr.recoveredPass ? 'نعم (تجاوز العتبة)' : '—',
      ]),
    ];
    const wsTraj = XLSX.utils.aoa_to_sheet(trajectoryRows);
    wsTraj['!cols'] = [
      { wch: 16 },
      { wch: 28 },
      ...longitudinal.exams.map(() => ({ wch: 16 })),
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTraj, 'مسار التلاميذ');

    XLSX.writeFile(
      wb,
      `التتبع_التطوري_للفروض_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleSeedDemo = async () => {
    setIsBusy(true);
    try {
      await onCreateDemoCohort();
      setSelectedLongitudinalIds(null);
      setSelectedCouncilIds(null);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="step-transition space-y-6">
      {/* Header Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              مختبر التتبع التطوري للأداء ومجالس الأقسام والتوجيه
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              مقارنة تطور التلاميذ بين الفروض المتتالية (F1 ← F4) وتركيب حصيلة الأقسام والمواد لمجالس الأقسام والتوجيه انطلاقاً من الأرشيف المحلي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('longitudinal')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'longitudinal'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LineChartIcon className="h-3.5 w-3.5" />
                التتبع التطوري (F1 ← F4)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('council')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'council'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                لوحة مجالس الأقسام والتوجيه
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenArchiveDrawer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5 text-teal-700" />
              الأرشيف ({projects.length})
            </button>

            <button
              type="button"
              onClick={onBackToWorkflow}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              العودة لمحرر التقرير
            </button>
          </div>
        </div>
      </section>

      {/* Empty State when fewer than 1 or 2 projects */}
      {projects.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <FolderPlus className="mx-auto mb-3 h-10 w-10 text-teal-700" strokeWidth={1.6} />
          <h2 className="text-base font-bold text-slate-900">
            الأرشيف المحلي فارغ حالياً — ابدأ بحفظ فروضك للمقارنة والتتبع
          </h2>
          <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600">
            لقياس التطور التربوي بين الفرض 1 و2 و3 و4 أو عقد مقارنة بين عدة أقسام ومواد في مجلس القسم، احفظ الفرض الحالي في الأرشيف ثم استورد الفرض الموالي، أو أنشئ لقطات نموذجية متتابعة لاختبار اللوحة فوراً.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {hasActiveStudents && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onSaveCurrentToArchive()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                حفظ القسم النشط في الأرشيف
              </button>
            )}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleSeedDemo()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <TrendingUp className="h-3.5 w-3.5 text-teal-700" />
              إنشاء 3 فروض متتابعة نموذجية (ف1←ف3) وقسمين للمعاينة
            </button>
          </div>
        </section>
      ) : activeTab === 'longitudinal' ? (
        <div className="space-y-6">
          {/* Exam Snapshot Picker */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  1. اختر سلسلة الفروض المراد تتبع تطورها ({effectiveLongitudinalProjects.length} محددة)
                </h2>
                <p className="text-xs text-slate-500">
                  يتم التوفيق التلقائي بين التلاميذ عبر رمز مسار أو الاسم الكامل لاحتساب التطور الفردي (Δ) وأثر حصص الدعم
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedLongitudinalIds !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedLongitudinalIds(null)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    إعادة التحديد التلقائي
                  </button>
                )}
                {projects.length < 2 && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleSeedDemo()}
                    className="rounded-lg border border-teal-700/40 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    إضافة سلسلة فروض نموذجية (ف1←ف3)
                  </button>
                )}
                {longitudinal.exams.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleExportLongitudinalExcel}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    تصدير التتبع التطوري Excel (.xlsx)
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {projects.map((p) => {
                const isSelected = effectiveLongitudinalProjects.some(
                  (sel) => sel.id === p.id
                );
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleLongitudinalId(p.id)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50 text-teal-950'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckSquare
                      className={`h-3.5 w-3.5 ${
                        isSelected ? 'text-teal-700' : 'text-slate-300'
                      }`}
                    />
                    <span>{p.name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-slate-500">
                      ({p.summaryStats.average.toFixed(2)})
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {longitudinal.exams.length < 2 ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 text-center text-xs text-amber-950">
              يرجى تحديد فرضين (2) على الأقل أعلاه لحساب المنحنى التطوري ومعاملات التقدم (Δ) بين الفروض.
            </section>
          ) : (
            <>
              {/* Longitudinal KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">
                    تطور معدل القسم (من الأول للأخير)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {longitudinal.exams[longitudinal.exams.length - 1].average.toFixed(2)}/20
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        longitudinal.overallDeltaAverage >= 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                      dir="ltr"
                    >
                      {longitudinal.overallDeltaAverage >= 0 ? '+' : ''}
                      {longitudinal.overallDeltaAverage.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">
                    تطور نسبة التحكم (≥ العتبة)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {longitudinal.exams[longitudinal.exams.length - 1].passRate.toFixed(1)}%
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        longitudinal.overallDeltaPassRate >= 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                      dir="ltr"
                    >
                      {longitudinal.overallDeltaPassRate >= 0 ? '+' : ''}
                      {longitudinal.overallDeltaPassRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">
                    التلاميذ المتحسّنون (Δ ≥ +0.50)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
                    <span className="text-2xl font-extrabold text-emerald-700">
                      {longitudinal.improvedCount}
                    </span>
                    <span className="text-xs text-slate-500">
                      مقابل {longitudinal.declinedCount} متراجعاً
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">
                    أثر الدعم (متعثرون بلغوا المعدل)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
                    <span className="text-2xl font-extrabold text-teal-700">
                      {longitudinal.recoveredPassCount}
                    </span>
                    <span className="text-xs text-slate-500">
                      تجاوزوا العتبة في الفرض الأخير
                    </span>
                  </div>
                </div>
              </div>

              {/* Trend Chart */}
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="mb-4 text-sm font-bold text-slate-900">
                  المنحنى التطوري للمعدل العام ونسبة التحكم عبر الفروض
                </h2>
                <div className="h-64 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={longitudinal.exams}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="avg" domain={[0, 20]} tick={{ fontSize: 11 }} />
                      <YAxis
                        yAxisId="pct"
                        orientation="right"
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="avg"
                        type="monotone"
                        dataKey="average"
                        name="معدل القسم (/20)"
                        stroke="#0f766e"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        yAxisId="pct"
                        type="monotone"
                        dataKey="passRate"
                        name="نسبة التحكم (%)"
                        stroke="#1e3a8a"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Student-by-student Longitudinal Matrix */}
              <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
                  <h2 className="text-sm font-bold text-slate-900">
                    تتبع المسار الفردي للمتعلمين ({filteredTrajectories.length} تلميذ)
                  </h2>
                  <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                    {(
                      [
                        { id: 'all', label: 'الجميع' },
                        { id: 'improved', label: `المتحسّنون (${longitudinal.improvedCount})` },
                        { id: 'recovered', label: `تداركوا العتبة (${longitudinal.recoveredPassCount})` },
                        { id: 'declined', label: `المتراجعون (${longitudinal.declinedCount})` },
                      ] as { id: TrajectoryFilter; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTrajectoryFilter(tab.id)}
                        className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                          trajectoryFilter === tab.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[460px] overflow-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                      <tr>
                        <th className="px-3 py-2.5 w-24">رمز مسار</th>
                        <th className="px-3 py-2.5">الاسم الكامل</th>
                        {longitudinal.exams.map((ex) => (
                          <th key={ex.projectId} className="px-3 py-2.5 text-center font-mono">
                            {ex.label}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 text-center">الفارق (Δ)</th>
                        <th className="px-3 py-2.5 text-center">التشخيص التطوري</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTrajectories.map((tr) => (
                        <tr key={tr.key} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2 font-mono text-slate-500">
                            {tr.code || '—'}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {tr.fullName}
                            {tr.recoveredPass && (
                              <span className="mr-2 text-[11px] font-bold text-teal-700">
                                · تدارك العتبة بعد الدعم
                              </span>
                            )}
                          </td>
                          {longitudinal.exams.map((ex) => {
                            const sc = tr.scoresByExam[ex.projectId];
                            const abs = tr.absentByExam[ex.projectId];
                            return (
                              <td
                                key={ex.projectId}
                                className="px-3 py-2 text-center font-mono font-bold tabular-nums"
                              >
                                {abs ? (
                                  <span className="text-amber-700">غائب</span>
                                ) : typeof sc === 'number' ? (
                                  <span
                                    className={
                                      sc >= activePassThreshold
                                        ? 'text-emerald-700'
                                        : 'text-red-700'
                                    }
                                  >
                                    {sc.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td
                            className="px-3 py-2 text-center font-mono font-extrabold tabular-nums"
                            dir="ltr"
                          >
                            {tr.delta === null ? (
                              '—'
                            ) : (
                              <span
                                className={
                                  tr.delta >= 0.5
                                    ? 'text-emerald-700'
                                    : tr.delta <= -0.5
                                    ? 'text-red-700'
                                    : 'text-slate-600'
                                }
                              >
                                {tr.delta > 0 ? `+${tr.delta.toFixed(2)}` : tr.delta.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {tr.trend === 'improved' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <TrendingUp className="h-3.5 w-3.5" />
                                تحسّن ملحوظ
                              </span>
                            ) : tr.trend === 'declined' ? (
                              <span className="inline-flex items-center gap-1 text-red-700">
                                <TrendingDown className="h-3.5 w-3.5" />
                                تراجع يستوجب التتبع
                              </span>
                            ) : tr.trend === 'stable' ? (
                              <span className="text-slate-600">استقرار نسبي</span>
                            ) : (
                              <span className="text-slate-400">نقط غير كافية</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      ) : (
        /* TAB 2: Class Council & Guidance Dashboard */
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  الأقسام والمواد المدرجة في محضر مجلس القسم ({effectiveCouncilProjects.length})
                </h2>
                <p className="text-xs text-slate-500">
                  حدد الأقسام أو المواد لمقارنة المردودية العامة واستخراج لائحة الحالات المستعصية أو المتعثرة بشكل متكرر
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedCouncilIds !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedCouncilIds(null)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    تحديد جميع الأقسام
                  </button>
                )}
                <button
                  type="button"
                  disabled={council.classes.length === 0}
                  onClick={handleExportCouncilExcel}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  تصدير محضر مجلس القسم Excel (.xlsx)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {projects.map((p) => {
                const active = effectiveCouncilProjects.some((c) => c.id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleCouncilId(p.id)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-teal-700 bg-teal-50 text-teal-950'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckSquare
                      className={`h-3.5 w-3.5 ${active ? 'text-teal-700' : 'text-slate-300'}`}
                    />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Council KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                المعدل التجميعي للأقسام المحددة
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-slate-900">
                {council.globalAverage.toFixed(2)}/20
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                نسبة التحكم المؤسساتية
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-emerald-700">
                {council.globalPassRate.toFixed(1)}%
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                القسم الأعلى مردودية
              </div>
              <div className="mt-1.5 text-sm font-bold text-slate-900 truncate">
                {council.bestClass ? council.bestClass.name : '—'}
              </div>
              {council.bestClass && (
                <div className="font-mono text-xs font-semibold tabular-nums text-teal-700">
                  {council.bestClass.average.toFixed(2)}/20 · {council.bestClass.passRate.toFixed(0)}%
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                حالات الدعم المستعجل (تكرار التعثر)
              </div>
              <div className="mt-1.5 font-mono text-2xl font-extrabold tabular-nums text-red-700">
                {council.recurringStruggling.length}
              </div>
            </div>
          </div>

          {/* Comparative Bar Chart */}
          {council.classes.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-slate-900">
                مقارنة بيانية للمعدل العام ونسبة التحكم حسب الأقسام
              </h2>
              <div className="h-64 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={council.classes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="avg" domain={[0, 20]} tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="pct"
                      orientation="right"
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="avg"
                      dataKey="average"
                      name="المعدل (/20)"
                      fill="#0f766e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="pct"
                      dataKey="passRate"
                      name="نسبة التحكم (%)"
                      fill="#1e3a8a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Ranked Council Comparison Table */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-teal-700" />
                الترتيب التركيبي للأقسام والملفات
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">القسم / الملف</th>
                    <th className="px-3 py-2.5">المادة</th>
                    <th className="px-3 py-2.5">الفرض</th>
                    <th className="px-3 py-2.5 text-center">الحاضرون</th>
                    <th className="px-3 py-2.5 text-center">المعدل / 20</th>
                    <th className="px-3 py-2.5 text-center">نسبة التحكم</th>
                    <th className="px-3 py-2.5 text-center">الانحراف (σ)</th>
                    <th className="px-3 py-2.5 text-center">فتح التقرير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {council.classes.map((c) => {
                    const proj = projects.find((p) => p.id === c.projectId);
                    return (
                      <tr key={c.projectId} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 font-bold text-slate-900">{c.name}</td>
                        <td className="px-3 py-2 text-slate-700">{c.subject}</td>
                        <td className="px-3 py-2 text-slate-600">{c.examNumber}</td>
                        <td className="px-3 py-2 text-center font-mono tabular-nums">
                          {c.present}/{c.total}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold tabular-nums text-teal-800">
                          {c.average.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold tabular-nums">
                          {c.passRate.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-center font-mono tabular-nums text-slate-600">
                          {c.stdDev.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {proj && (
                            <button
                              type="button"
                              onClick={() => onLoadProject(proj)}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              معاينة
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Recurring Struggling Students Table */}
          {council.recurringStruggling.length > 0 && (
            <section className="rounded-xl border border-red-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/60 px-5 py-3">
                <AlertTriangle className="h-4 w-4 text-red-700" />
                <h2 className="text-sm font-bold text-red-950">
                  توصيات مجلس القسم والتوجيه: حالات التعثر المتكرر أو الحاد ({council.recurringStruggling.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">التلميذ(ة)</th>
                      <th className="px-3 py-2 font-mono">رمز مسار</th>
                      <th className="px-3 py-2 text-center">تكرار التعثر</th>
                      <th className="px-3 py-2 text-center">متوسط النقط</th>
                      <th className="px-3 py-2">الفروض / المواد المرصودة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {council.recurringStruggling.map((st) => (
                      <tr key={st.key} className="hover:bg-red-50/30">
                        <td className="px-3 py-2 font-bold text-slate-900">{st.fullName}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{st.code || '—'}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-red-700">
                          {st.occurrences}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold tabular-nums text-red-700">
                          {st.meanScore.toFixed(2)}/20
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {st.contexts
                            .map((cx) => `${cx.className} · ${cx.subject} (${cx.score.toFixed(2)})`)
                            .join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
