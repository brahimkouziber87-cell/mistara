import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronUp,
  FileText,
  IdCard,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import {
  ComputedStats,
  ExamItemDefinition,
  MassarMetadata,
  PostSupportStatus,
  RemediationCardsConfig,
  RemediationCardsPerSheet,
  RemediationCardTargetFilter,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
  StudentRemediationOverride,
} from '../types/report';
import {
  computePostRemediationImpact,
  inferPostSupportStatus,
} from '../utils/pedagogicalAnalytics';
import {
  buildStudentRemediationPlan,
  exportRemediationCardsToWordDoc,
  getFilteredRemediationStudents,
  getRemediationCardsConfig,
} from './IndividualRemediationCardsSheet';

interface RemediationCardsConfigPanelProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  stats: ComputedStats;
  students: StudentRecord[];
  itemDefinitions?: ExamItemDefinition[];
  studentItemScores?: StudentItemScores;
  onUpdateTemplate: (updater: (prev: ReportTemplateSchema) => ReportTemplateSchema) => void;
  onOpenCardsPreview?: () => void;
  compact?: boolean;
}

export const RemediationCardsConfigPanel: React.FC<RemediationCardsConfigPanelProps> = ({
  template,
  metadata,
  stats,
  students,
  itemDefinitions = [],
  studentItemScores = {},
  onUpdateTemplate,
  onOpenCardsPreview,
  compact = false,
}) => {
  const config = getRemediationCardsConfig(template, metadata);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [showPerStudentEditor, setShowPerStudentEditor] = useState(false);
  const [showPostImpactTracker, setShowPostImpactTracker] = useState(false);

  const updateConfig = (patch: Partial<RemediationCardsConfig>) => {
    onUpdateTemplate((prev) => {
      const current = getRemediationCardsConfig(prev, metadata);
      return {
        ...prev,
        remediationCardsConfig: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const targetStudents = getFilteredRemediationStudents(
    students,
    stats,
    template,
    config
  );
  const postImpact = useMemo(
    () => computePostRemediationImpact(targetStudents, template),
    [targetStudents, template]
  );
  const cardsPerSheet =
    config.cardsPerSheet === 2 ? 2 : config.cardsPerSheet === 3 ? 3 : 4;
  const sheetsCount = Math.ceil(targetStudents.length / cardsPerSheet);

  const activeStudent =
    targetStudents.find((s) => s.id === selectedStudentId) || targetStudents[0] || null;

  const activeStudentRank = activeStudent
    ? Math.max(
        1,
        stats.rankedStudents.findIndex((s) => s.id === activeStudent.id) + 1
      )
    : 1;

  const activeStudentPlan = activeStudent
    ? buildStudentRemediationPlan(
        activeStudent,
        activeStudentRank,
        stats,
        metadata,
        template,
        config,
        itemDefinitions,
        studentItemScores
      )
    : null;

  const activeOverride =
    (activeStudent && config.studentOverrides?.[activeStudent.id]) || {};

  const updateStudentOverride = (
    studentId: string,
    field: 'diagnosticText' | 'exerciseTask' | 'teacherNote',
    value: string
  ) => {
    onUpdateTemplate((prev) => {
      const current = getRemediationCardsConfig(prev, metadata);
      const prevOverrides = current.studentOverrides || {};
      return {
        ...prev,
        remediationCardsConfig: {
          ...current,
          studentOverrides: {
            ...prevOverrides,
            [studentId]: {
              ...(prevOverrides[studentId] || {}),
              [field]: value,
            },
          },
        },
      };
    });
  };

  const resetStudentOverride = (studentId: string) => {
    onUpdateTemplate((prev) => {
      const current = getRemediationCardsConfig(prev, metadata);
      const nextOverrides = { ...(current.studentOverrides || {}) };
      delete nextOverrides[studentId];
      return {
        ...prev,
        remediationCardsConfig: {
          ...current,
          studentOverrides: nextOverrides,
        },
      };
    });
  };

  const patchStudentPostSupport = (
    studentId: string,
    patch: Partial<StudentRemediationOverride>
  ) => {
    onUpdateTemplate((prev) => {
      const current = getRemediationCardsConfig(prev, metadata);
      const prevOverrides = current.studentOverrides || {};
      return {
        ...prev,
        remediationCardsConfig: {
          ...current,
          studentOverrides: {
            ...prevOverrides,
            [studentId]: {
              ...(prevOverrides[studentId] || {}),
              ...patch,
            },
          },
        },
      };
    });
  };

  const toggleCustomStudentId = (studentId: string) => {
    const currentSet = new Set(
      config.customSelectedIds && config.customSelectedIds.length > 0
        ? config.customSelectedIds
        : targetStudents.map((s) => s.id)
    );
    if (currentSet.has(studentId)) {
      currentSet.delete(studentId);
    } else {
      currentSet.add(studentId);
    }
    updateConfig({
      targetFilter: 'custom',
      customSelectedIds: Array.from(currentSet),
    });
  };

  return (
    <section
      aria-label="إعدادات البطاقات الفردية للتقويم والدعم"
      className="no-print rounded-xl border border-teal-200 bg-white p-5 shadow-2xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
            <IdCard className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                بطاقات فردية للتقويم والدعم (Fiches Individuelles de Remédiation)
              </h2>
              <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-[11px] font-bold text-teal-800 border border-teal-200">
                {targetStudents.length} بطاقة · {sheetsCount} لوحة A4
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              توليد جذاذات فردية قابلة للقص والصق في دفتر التمارين أو تسليمها لولي الأمر مع تشخيص مشخصن وخطة دعم لكل متعلم(ة)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={targetStudents.length === 0}
            onClick={() =>
              exportRemediationCardsToWordDoc(
                template,
                metadata,
                stats,
                students,
                itemDefinitions,
                studentItemScores
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-teal-700" />
            <span>تصدير البطاقات Word (.doc)</span>
          </button>

          {onOpenCardsPreview && (
            <button
              type="button"
              onClick={onOpenCardsPreview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 cursor-pointer"
            >
              <IdCard className="h-3.5 w-3.5" />
              <span>معاينة وطباعة البطاقات الفردية (A4)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Target Filter Selection */}
        <div className="lg:col-span-4 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            1. الفئة المستهدفة بالبطاقات الفردية:
          </label>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(
              [
                {
                  id: 'struggling',
                  label: `غير المتحكمين (< ${template.passThreshold}/20)`,
                  count:
                    stats.strugglingStudents.length +
                    (config.includeAbsent ? stats.absentStudents.length : 0),
                },
                {
                  id: 'below_excellence',
                  label: `الدعم والتثبيت (< ${template.excellenceThreshold}/20)`,
                  count: students.filter((s) =>
                    s.isAbsent
                      ? config.includeAbsent
                      : s.score !== null && s.score < template.excellenceThreshold
                  ).length,
                },
                {
                  id: 'all',
                  label: 'جميع تلاميذ القسم (شامل)',
                  count: students.filter((s) =>
                    s.isAbsent ? config.includeAbsent : s.score !== null
                  ).length,
                },
                {
                  id: 'custom',
                  label: 'تحديد يدوي للتلاميذ',
                  count: config.customSelectedIds?.length || targetStudents.length,
                },
              ] as { id: RemediationCardTargetFilter; label: string; count: number }[]
            ).map((opt) => {
              const isSelected = config.targetFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (
                      opt.id === 'custom' &&
                      (!config.customSelectedIds || config.customSelectedIds.length === 0)
                    ) {
                      updateConfig({
                        targetFilter: 'custom',
                        customSelectedIds: targetStudents.map((s) => s.id),
                      });
                    } else {
                      updateConfig({ targetFilter: opt.id });
                    }
                  }}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-right text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-700 bg-teal-50/70 text-teal-950 ring-1 ring-teal-700/20'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="mr-1 rounded bg-white px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-slate-700 border border-slate-200 shrink-0">
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layout Density & Options */}
        <div className="lg:col-span-5 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            2. تخطيط الصفحة (A4) وخيارات البطاقة:
          </label>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {(
              [
                {
                  val: 4 as RemediationCardsPerSheet,
                  title: '4 بطاقات في الصفحة',
                  sub: 'شبكة 2×2 قياسية للدفتر',
                },
                {
                  val: 3 as RemediationCardsPerSheet,
                  title: '3 بطاقات في الصفحة',
                  sub: '3 صفوف أفقية (ثلث A4)',
                },
                {
                  val: 2 as RemediationCardsPerSheet,
                  title: 'بطاقتان في الصفحة',
                  sub: 'حجم موسع (نصف A5)',
                },
              ]
            ).map((layoutOpt) => {
              const active = config.cardsPerSheet === layoutOpt.val;
              return (
                <button
                  key={layoutOpt.val}
                  type="button"
                  onClick={() => updateConfig({ cardsPerSheet: layoutOpt.val })}
                  className={`rounded-lg border p-2 text-right transition-all cursor-pointer ${
                    active
                      ? 'border-teal-700 bg-teal-50/70 text-teal-950 ring-1 ring-teal-700/20'
                      : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs font-bold">{layoutOpt.title}</div>
                  <div className="text-[10px] text-slate-500">{layoutOpt.sub}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeAbsent}
                onChange={(e) => updateConfig({ includeAbsent: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span>تضمين الغائبين ({stats.absent})</span>
            </label>

            <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showParentSignature}
                onChange={(e) => updateConfig({ showParentSignature: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span>توقيع ولي الأمر</span>
            </label>

            <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showCutGuides}
                onChange={(e) => updateConfig({ showCutGuides: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span className="inline-flex items-center gap-1">
                <Scissors className="h-3 w-3 text-slate-500" />
                خطوط القص
              </span>
            </label>

            <label className="inline-flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showPostSupportEval}
                onChange={(e) => updateConfig({ showPostSupportEval: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span>تتبع أثر الدعم البعدي</span>
            </label>

            <label className="inline-flex items-center gap-1.5 font-semibold text-teal-900 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabledInFullReport}
                onChange={(e) => updateConfig({ enabledInFullReport: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
              />
              <span>إرفاق تلقائي في نهاية التقرير العام</span>
            </label>
          </div>
        </div>

        {/* Default Remediation Activity & Date */}
        <div className="lg:col-span-3 space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            3. التمرين الموجه وتاريخ حصة الدعم:
          </label>
          <input
            type="text"
            value={config.defaultExerciseTask}
            onChange={(e) => updateConfig({ defaultExerciseTask: e.target.value })}
            placeholder="مثال: إنجاز سلسلة تمارين الدعم رقم 1 ص 34..."
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 shrink-0">
              تاريخ الدعم:
            </span>
            <input
              type="date"
              value={config.sessionDate || metadata.correctionDate || ''}
              onChange={(e) => updateConfig({ sessionDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Custom Student Picker when targetFilter === 'custom' */}
      {config.targetFilter === 'custom' && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-teal-700" />
              اختر التلاميذ المراد إصدار بطاقات فردية لهم ({targetStudents.length} محدد):
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateConfig({
                    customSelectedIds: stats.strugglingStudents.map((s) => s.id),
                  })
                }
                className="text-[11px] font-semibold text-teal-800 hover:underline cursor-pointer"
              >
                تحديد المتعثرين فقط
              </button>
              <button
                type="button"
                onClick={() =>
                  updateConfig({
                    customSelectedIds: students.map((s) => s.id),
                  })
                }
                className="text-[11px] font-semibold text-slate-600 hover:underline cursor-pointer"
              >
                تحديد الكل
              </button>
            </div>
          </div>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto p-1">
            {students.map((st) => {
              const isChecked = targetStudents.some((t) => t.id === st.id);
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => toggleCustomStudentId(st.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    isChecked
                      ? 'border-teal-700 bg-teal-50 text-teal-950'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckSquare
                    className={`h-3 w-3 ${isChecked ? 'text-teal-700' : 'text-slate-300'}`}
                  />
                  <span>{st.fullName}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    ({st.isAbsent ? 'غ' : st.score !== null ? st.score.toFixed(2) : '—'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Per-Student Diagnostic & Exercise Customization */}
      {!compact && targetStudents.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowPerStudentEditor((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-700" />
              <span>
                تخصيص التشخيص والتمرين الموجه لكل تلميذ على حدة (اختياري — يتم التوليد آلياً حسب نقطة كل تلميذ)
              </span>
            </span>
            {showPerStudentEditor ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {showPerStudentEditor && activeStudent && activeStudentPlan && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    اختر التلميذ(ة) لتخصيص بطاقته:
                  </label>
                  <select
                    value={activeStudent.id}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none"
                  >
                    {targetStudents.map((st, idx) => (
                      <option key={st.id} value={st.id}>
                        #{idx + 1} — {st.fullName} (
                        {st.isAbsent
                          ? 'غائب'
                          : st.score !== null
                          ? `${st.score.toFixed(2)}/20`
                          : '—'}
                        )
                      </option>
                    ))}
                  </select>

                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px]">
                    <div className="font-bold text-slate-900">{activeStudent.fullName}</div>
                    <div className="mt-0.5 text-slate-600">
                      الفئة:{' '}
                      <strong className="text-teal-800">{activeStudentPlan.groupLabel}</strong>
                    </div>
                    {Object.keys(activeOverride).length > 0 && (
                      <button
                        type="button"
                        onClick={() => resetStudentOverride(activeStudent.id)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        استعادة التشخيص الآلي لهذا التلميذ
                      </button>
                    )}
                  </div>
                </div>

                <div className="md:col-span-8 space-y-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      تشخيص التعثرات / المكتسبات الخاص بـ {activeStudent.fullName}:
                    </label>
                    <textarea
                      rows={2}
                      value={
                        activeOverride.diagnosticText ?? activeStudentPlan.diagnosticText
                      }
                      onChange={(e) =>
                        updateStudentOverride(
                          activeStudent.id,
                          'diagnosticText',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      النشاط العلاجي / التمرين الموجه لهذا التلميذ:
                    </label>
                    <input
                      type="text"
                      value={activeOverride.exerciseTask ?? activeStudentPlan.exerciseTask}
                      onChange={(e) =>
                        updateStudentOverride(
                          activeStudent.id,
                          'exerciseTask',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pre / Post Remediation Quantitative Impact Tracker */}
      {targetStudents.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowPostImpactTracker((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100 cursor-pointer"
          >
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                أداة تقويم أثر الدعم البيداغوجي (Pre / Post Remediation)
                {postImpact.evaluatedCount > 0 &&
                  ` — تم تقويم ${postImpact.evaluatedCount} من ${postImpact.targetedCount} · نسبة التدارك ${postImpact.recoveryRate.toFixed(0)}%`}
              </span>
            </span>
            {showPostImpactTracker ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {showPostImpactTracker && (
            <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              {/* Quantitative Impact KPIs */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">
                    المقوَّمون بعدياً
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-slate-900">
                    {postImpact.evaluatedCount} / {postImpact.targetedCount}
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-center">
                  <div className="text-[11px] font-semibold text-emerald-800">
                    نسبة التدارك الفعلي
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-emerald-700">
                    {postImpact.evaluatedCount > 0
                      ? `${postImpact.recoveryRate.toFixed(1)}%`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">
                    تطور المعدل (قبل ← بعد)
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-teal-800" dir="ltr">
                    {postImpact.preAverage !== null && postImpact.postAverage !== null
                      ? `${postImpact.preAverage.toFixed(2)} → ${postImpact.postAverage.toFixed(2)}`
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">
                    متوسط التحسن / تقليص التعثر
                  </div>
                  <div className="mt-0.5 font-mono text-sm font-extrabold tabular-nums text-slate-900" dir="ltr">
                    {postImpact.averageGain !== null
                      ? `${postImpact.averageGain >= 0 ? '+' : ''}${postImpact.averageGain.toFixed(2)}`
                      : '—'}
                    {postImpact.gapClosurePct !== null
                      ? ` (${postImpact.gapClosurePct.toFixed(0)}%)`
                      : ''}
                  </div>
                </div>
              </div>

              {/* Fast Pre / Post Entry Table */}
              <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                    <tr>
                      <th className="px-2.5 py-2 text-center w-10">#</th>
                      <th className="px-2.5 py-2">المتعلم(ة)</th>
                      <th className="px-2.5 py-2 text-center w-24">قبل الدعم (/20)</th>
                      <th className="px-2.5 py-2 text-center w-28">نقطة الرائز البعدي</th>
                      <th className="px-2.5 py-2 text-center w-20">الفارق (Δ)</th>
                      <th className="px-2.5 py-2 text-center min-w-[230px]">الوضعية البعدية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {postImpact.studentRows.map((row, idx) => {
                      const st = row.student;
                      const statusOpts: Array<{
                        id: PostSupportStatus;
                        label: string;
                        activeClass: string;
                      }> = [
                        {
                          id: 'mastered',
                          label: 'متحكم',
                          activeClass: 'border-emerald-600 bg-emerald-50 text-emerald-900',
                        },
                        {
                          id: 'in_progress',
                          label: 'في طور التحكم',
                          activeClass: 'border-amber-600 bg-amber-50 text-amber-900',
                        },
                        {
                          id: 'needs_followup',
                          label: 'يحتاج مواكبة',
                          activeClass: 'border-red-600 bg-red-50 text-red-900',
                        },
                      ];

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70">
                          <td className="px-2.5 py-1.5 text-center font-mono tabular-nums text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-2.5 py-1.5 font-semibold text-slate-900 truncate max-w-[170px]">
                            {st.fullName}
                          </td>
                          <td className="px-2.5 py-1.5 text-center font-mono font-bold tabular-nums text-slate-700">
                            {row.preScore !== null ? row.preScore.toFixed(2) : 'غائب'}
                          </td>
                          <td className="px-2 py-1 text-center">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              step={0.25}
                              value={row.postScore === null ? '' : row.postScore}
                              placeholder="—"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  patchStudentPostSupport(st.id, {
                                    postSupportScore: null,
                                    postSupportStatus: 'pending',
                                  });
                                  return;
                                }
                                const parsed = Number.parseFloat(val);
                                if (!Number.isFinite(parsed)) return;
                                const clamped = Math.max(0, Math.min(20, parsed));
                                patchStudentPostSupport(st.id, {
                                  postSupportScore: clamped,
                                  postSupportStatus: inferPostSupportStatus(
                                    clamped,
                                    template.passThreshold
                                  ),
                                  postSupportDate:
                                    config.sessionDate ||
                                    new Date().toISOString().slice(0, 10),
                                });
                              }}
                              className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs font-bold tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
                            />
                          </td>
                          <td
                            className={`px-2 py-1.5 text-center font-mono font-bold tabular-nums ${
                              row.delta === null
                                ? 'text-slate-400'
                                : row.delta > 0
                                ? 'text-emerald-700'
                                : row.delta < 0
                                ? 'text-red-700'
                                : 'text-slate-600'
                            }`}
                            dir="ltr"
                          >
                            {row.delta === null
                              ? '—'
                              : row.delta > 0
                              ? `+${row.delta.toFixed(2)}`
                              : row.delta.toFixed(2)}
                          </td>
                          <td className="px-2 py-1">
                            <div className="flex items-center justify-center gap-1">
                              {statusOpts.map((opt) => {
                                const isActive = row.status === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() =>
                                      patchStudentPostSupport(st.id, {
                                        postSupportStatus: isActive ? 'pending' : opt.id,
                                        postSupportDate:
                                          config.sessionDate ||
                                          new Date().toISOString().slice(0, 10),
                                      })
                                    }
                                    className={`rounded border px-2 py-0.5 text-[10.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                      isActive
                                        ? opt.activeClass
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500">
                تُدرج نتائج التقويم البعدي تلقائياً داخل البطاقات الفردية، التقرير المصدَّر إلى Word، وملف التفتيش الموحّد.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
