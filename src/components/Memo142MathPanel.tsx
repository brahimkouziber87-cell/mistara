import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookMarked,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  FileCheck2,
  Info,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  auditMemo142Compliance,
  detectMathTrackFromMetadata,
  isHighSchoolCycle,
  MATH_TEACHER_OFFICIAL_DOCS,
  MEMO_142_MATH_TRACKS,
  MathTrackId,
} from '../data/memo142MathGuide';
import { ComputedStats, MassarMetadata, ReportTemplateSchema } from '../types/report';

interface Memo142MathPanelProps {
  metadata: MassarMetadata;
  stats: ComputedStats;
  template: ReportTemplateSchema;
  onUpdateMetadata: (patch: Partial<MassarMetadata>) => void;
  onUpdateTemplate: (updater: (prev: ReportTemplateSchema) => ReportTemplateSchema) => void;
}

const DOCS_CHECKLIST_STORAGE_KEY = 'mistara_math_official_docs_v1';

function loadCheckedDocs(): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(DOCS_CHECKLIST_STORAGE_KEY);
    if (!raw) return { 'memo-142-08': true, 'orientations-2007': true };
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return { 'memo-142-08': true, 'orientations-2007': true };
  }
}

export const Memo142MathPanel: React.FC<Memo142MathPanelProps> = ({
  metadata,
  stats,
  template,
  onUpdateMetadata,
  onUpdateTemplate,
}) => {
  const isHigh = isHighSchoolCycle(metadata);

  const detectedTrack = useMemo(
    () => detectMathTrackFromMetadata(metadata),
    [metadata.level, metadata.className]
  );

  const [selectedTrackId, setSelectedTrackId] = useState<MathTrackId>(detectedTrack.id);
  const [isManualTrack, setIsManualTrack] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(() => isHigh);
  const [showDocsChecklist, setShowDocsChecklist] = useState(false);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>(() =>
    loadCheckedDocs()
  );
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isManualTrack) {
      setSelectedTrackId(detectedTrack.id);
    }
  }, [detectedTrack.id, isManualTrack]);

  const activeTrack = useMemo(
    () =>
      MEMO_142_MATH_TRACKS.find((t) => t.id === selectedTrackId) || MEMO_142_MATH_TRACKS[0],
    [selectedTrackId]
  );

  const audit = useMemo(
    () => auditMemo142Compliance(metadata, stats, template, activeTrack),
    [metadata, stats, template, activeTrack]
  );

  const checkedDocsCount = useMemo(
    () => MATH_TEACHER_OFFICIAL_DOCS.filter((d) => checkedDocs[d.id]).length,
    [checkedDocs]
  );

  const handleToggleDoc = (id: string) => {
    setCheckedDocs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(DOCS_CHECKLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      return next;
    });
  };

  const handleApplyMemo142Standards = () => {
    onUpdateMetadata({
      cycle: 'السلك الثانوي التأهيلي',
      level: metadata.level?.trim() ? metadata.level : activeTrack.levelLabel,
      duration: activeTrack.officialDuration,
      coefficient: activeTrack.singleExamWeightLabel,
      examCriteria: activeTrack.examCriteriaTemplate,
      gradingScaleNote: activeTrack.gradingScaleTemplate,
    });
    onUpdateTemplate((prev) => ({
      ...prev,
      headerConfig: {
        ...prev.headerConfig,
        ministryLine: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
        reportSubtitle:
          'تقرير إحصائي وتشخيصي لنتائج الفرض المحروس وفق مذكرة التقويم (الرياضيات)',
      },
    }));
    setAppliedNotice(
      `تم ضبط المدة (${activeTrack.officialDuration})، الوزن (${activeTrack.singleExamWeightLabel})، وجدول التخصيص وفق مذكرة التقويم لمسلك ${activeTrack.shortCode}.`
    );
    window.setTimeout(() => setAppliedNotice(null), 3500);
  };

  return (
    <section
      aria-label="مُضبِط ومدقّق مذكرة التقويم للرياضيات"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-5 py-3.5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-teal-700">
            <Scale className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                مُضبِط ومدقّق مذكرة التقويم (الرياضيات — الثانوي التأهيلي)
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${
                  audit.scorePct >= 80
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                المطابقة {audit.passedCount}/{audit.totalChecks} ({audit.scorePct}%)
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              <span>{activeTrack.label}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">
                {activeTrack.examsPerSemester} فروض/دورة
              </span>
              <span aria-hidden="true"> · </span>
              <span>المدة القانونية: {activeTrack.officialDuration}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">100% فروض محروسة</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap cursor-pointer"
          >
            <span>{isExpanded ? 'طي المدقّق' : 'فتح مدقّق مذكرة التقويم'}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {appliedNotice && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs font-semibold text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {isExpanded && (
        <div className="p-5 space-y-5">
          {/* Track Selector + One-click Standard Apply */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1 max-w-md">
              <label
                htmlFor="memo142-track-select"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                الشعبة / المسلك بالتأهيلي (حسب التوجيهات التربوية ومذكرة التقويم)
              </label>
              <select
                id="memo142-track-select"
                value={selectedTrackId}
                onChange={(e) => {
                  setIsManualTrack(true);
                  setSelectedTrackId(e.target.value as MathTrackId);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
              >
                {MEMO_142_MATH_TRACKS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortCode} — {t.label} ({t.examsPerSemester} فروض · {t.officialDuration})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDocsChecklist((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap cursor-pointer"
              >
                <BookMarked className="h-3.5 w-3.5 text-teal-700" />
                <span>الوثائق التربوية ({checkedDocsCount}/{MATH_TEACHER_OFFICIAL_DOCS.length})</span>
              </button>

              <button
                type="button"
                onClick={handleApplyMemo142Standards}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>تطبيق مواصفات مذكرة التقويم على الفرض</span>
              </button>
            </div>
          </div>

          {/* 4-Column Hairline Official Spec Strip */}
          <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200 rounded-lg border border-slate-200 bg-slate-50/60 lg:grid-cols-4">
            <div className="px-4 py-3">
              <div className="text-[11px] font-semibold text-slate-500">عدد الفروض والمدة</div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                {activeTrack.examsPerSemester} فروض · {activeTrack.officialDuration}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                الغلاف الأسبوعي: {activeTrack.weeklyHours}
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-[11px] font-semibold text-slate-500">
                توزيع المراقبة المستمرة
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-teal-800 tabular-nums">
                {activeTrack.supervisedWeightPct}% فروض محروسة
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                وزن الفرض الواحد: <span className="font-mono font-semibold">{activeTrack.singleExamWeightLabel}</span> · المعامل{' '}
                <span className="font-mono font-semibold">{activeTrack.subjectCoefficient}</span>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-[11px] font-semibold text-slate-500">
                جدول التخصيص (المهارات)
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                {activeTrack.taxonomyBreakdown.directApplicationPct}% ·{' '}
                {activeTrack.taxonomyBreakdown.familiarSituationsPct}% ·{' '}
                {activeTrack.taxonomyBreakdown.complexProblemsPct}%
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                تطبيق مباشر · وضعيات مألوفة · مسائل مركبة
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-[11px] font-semibold text-slate-500">
                أجل التصحيح وإرجاع الأوراق
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums text-slate-900">
                <Clock className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                {audit.turnaroundDays !== null ? (
                  <span
                    className={
                      audit.turnaroundDays >= 0 && audit.turnaroundDays <= 14
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }
                  >
                    {audit.turnaroundDays} يوماً
                  </span>
                ) : (
                  <span className="text-slate-500">غير محدد</span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                الموصى به في المذكرة: ≤ 14 يوماً
              </div>
            </div>
          </div>

          {/* Syllabus Reference Line */}
          <div className="text-xs leading-relaxed text-slate-600">
            <span className="font-bold text-slate-800">محاور المقرر الرسمي للمسلك: </span>
            {activeTrack.keySyllabusHighlights}
          </div>

          {/* Live 5-Point Compliance Audit Grid */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ClipboardCheck className="h-4 w-4 text-teal-700" />
              <span>التدقيق الآلي لمطابقة التقرير مع مذكرة التقويم</span>
            </div>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
              {audit.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {chk.status === 'pass' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : chk.status === 'warn' ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    ) : (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900">{chk.label}: </span>
                      <span className="text-slate-600">{chk.detail}</span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-bold ${
                      chk.status === 'pass'
                        ? 'text-emerald-700'
                        : chk.status === 'warn'
                        ? 'text-amber-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {chk.status === 'pass'
                      ? 'مطابق'
                      : chk.status === 'warn'
                      ? 'للمراجعة'
                      : 'إرشادي'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Math Teacher Documents Checklist */}
          {showDocsChecklist && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <FileCheck2 className="h-4 w-4 text-teal-700" />
                  <span>قائمة الوثائق التربوية المرجعية لأستاذ الرياضيات بالتأهيلي</span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-teal-800 tabular-nums">
                  {checkedDocsCount} / {MATH_TEACHER_OFFICIAL_DOCS.length} مستوفاة
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MATH_TEACHER_OFFICIAL_DOCS.map((doc) => {
                  const done = Boolean(checkedDocs[doc.id]);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleToggleDoc(doc.id)}
                      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-right transition-colors cursor-pointer ${
                        done
                          ? 'border-emerald-300 bg-emerald-50/60'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          done
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {done && <Check className="h-3 w-3" strokeWidth={2.5} />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">{doc.title}</div>
                        <div className="text-[10.5px] font-medium text-teal-800">
                          {doc.reference}
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-slate-600">
                          {doc.purpose}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
