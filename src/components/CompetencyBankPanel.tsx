import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Wrench,
} from 'lucide-react';
import {
  BankSemester,
  COMPETENCY_FRAMEWORK_BANK,
  CompetencyFrameworkUnit,
  EDUCATION_CYCLES,
  EducationCycleId,
  getUnitsForFilter,
  matchCompetencyBankSelection,
} from '../data/competencyBank';
import { MassarMetadata, ReportTemplateSchema } from '../types/report';
import { getRemediationCardsConfig } from './IndividualRemediationCardsSheet';

interface CompetencyBankPanelProps {
  metadata: MassarMetadata;
  template: ReportTemplateSchema;
  onUpdateMetadata: (patch: Partial<MassarMetadata>) => void;
  onUpdateTemplate: (updater: (prev: ReportTemplateSchema) => ReportTemplateSchema) => void;
}

export const CompetencyBankPanel: React.FC<CompetencyBankPanelProps> = ({
  metadata,
  template,
  onUpdateMetadata,
  onUpdateTemplate,
}) => {
  const [initialMatch] = useState(() => matchCompetencyBankSelection(metadata));

  const [isExpanded, setIsExpanded] = useState<boolean>(
    () => !metadata.examContent?.trim()
  );
  const [isManualSelection, setIsManualSelection] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<EducationCycleId>(
    initialMatch.cycle
  );
  const [selectedSemester, setSelectedSemester] = useState<BankSemester | 'الكل'>(
    initialMatch.semester
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    initialMatch.unitId
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isManualSelection) return;
    const matched = matchCompetencyBankSelection(metadata);
    setSelectedCycle(matched.cycle);
    setSelectedSemester(matched.semester);
    setSelectedUnitId(matched.unitId);
  }, [
    isManualSelection,
    metadata.cycle,
    metadata.level,
    metadata.className,
    metadata.semester,
    metadata.examNumber,
  ]);

  const filteredUnits = useMemo(
    () =>
      getUnitsForFilter(
        selectedCycle,
        'الرياضيات',
        selectedSemester,
        searchQuery
      ),
    [selectedCycle, selectedSemester, searchQuery]
  );

  const activeUnit: CompetencyFrameworkUnit | null = useMemo(() => {
    if (filteredUnits.length === 0) {
      return searchQuery.trim()
        ? null
        : COMPETENCY_FRAMEWORK_BANK.find((u) => u.cycle === selectedCycle) || null;
    }
    return (
      filteredUnits.find((u) => u.id === selectedUnitId) ||
      filteredUnits[0] ||
      null
    );
  }, [filteredUnits, selectedUnitId, selectedCycle, searchQuery]);

  useEffect(() => {
    if (filteredUnits.length > 0 && !filteredUnits.some((u) => u.id === selectedUnitId)) {
      setSelectedUnitId(filteredUnits[0].id);
    }
  }, [filteredUnits, selectedUnitId]);

  const showNotice = (msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setFeedbackToast(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setFeedbackToast(null);
      toastTimerRef.current = null;
    }, 2800);
  };

  const handleSyncWithClassMetadata = () => {
    setIsManualSelection(false);
    const matched = matchCompetencyBankSelection(metadata);
    setSelectedCycle(matched.cycle);
    setSelectedSemester(matched.semester);
    setSelectedUnitId(matched.unitId);
    setSearchQuery('');
    showNotice('تمت مطابقة بنك الرياضيات تلقائياً مع السلك والمستوى والدورة الحالية.');
  };

  const togglePedagogyArrayItem = (
    field: 'strengths' | 'weaknesses' | 'programmedRemediationBullets',
    text: string
  ) => {
    const clean = text.trim();
    if (!clean) return;
    onUpdateTemplate((prev) => {
      const existing = prev.pedagogicalContent[field]
        .map((x) => x.trim())
        .filter(Boolean);
      const alreadyExists = existing.includes(clean);
      const nextList = alreadyExists
        ? existing.filter((x) => x !== clean)
        : [...existing, clean];
      return {
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          [field]: nextList,
        },
      };
    });
  };

  const handleApplyContentAndCriteria = (unit: CompetencyFrameworkUnit) => {
    onUpdateMetadata({
      examContent: unit.examContent,
      examCriteria: unit.examCriteria,
    });
    showNotice(`تم إدراج مضمون ومعايير «${unit.subject}» في بطاقة الفرض.`);
  };

  const handleApplyFullFramework = (unit: CompetencyFrameworkUnit) => {
    onUpdateMetadata({
      examContent: unit.examContent,
      examCriteria: unit.examCriteria,
    });
    onUpdateTemplate((prev) => {
      const cardsCfg = getRemediationCardsConfig(prev, metadata);
      return {
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          strengths:
            unit.strengths.length > 0
              ? [...unit.strengths]
              : unit.competencies.slice(0, 2),
          weaknesses: unit.commonWeaknesses.slice(0, 3),
          programmedRemediationBullets: [...unit.remediationBullets],
        },
        remediationCardsConfig: {
          ...cardsCfg,
          defaultExerciseTask: unit.recommendedExerciseTask,
        },
      };
    });
    showNotice(
      `تم تطبيق الإطار المرجعي الكامل لـ «${unit.subject}» (المضمون + المعايير + التشخيص + الدعم).`
    );
  };

  const handleAssignCardsExercise = (unit: CompetencyFrameworkUnit) => {
    onUpdateTemplate((prev) => {
      const cardsCfg = getRemediationCardsConfig(prev, metadata);
      return {
        ...prev,
        remediationCardsConfig: {
          ...cardsCfg,
          defaultExerciseTask: unit.recommendedExerciseTask,
        },
      };
    });
    showNotice('تم تعيين التمرين الموجه للبطاقات الفردية تلقائياً.');
  };

  const strengthsSet = new Set(
    template.pedagogicalContent.strengths.map((s) => s.trim())
  );
  const weaknessesSet = new Set(
    template.pedagogicalContent.weaknesses.map((w) => w.trim())
  );
  const bulletsSet = new Set(
    template.pedagogicalContent.programmedRemediationBullets.map((b) => b.trim())
  );

  const cycleMeta = EDUCATION_CYCLES.find((c) => c.id === selectedCycle);

  return (
    <section
      id="competency-framework-bank"
      aria-label="بنك كفايات وأطر الرياضيات المرجعية"
      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-5 py-3.5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-teal-700">
            <BookOpenCheck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                بنك كفايات وأطر الرياضيات المرجعية
              </h2>
              <span className="text-xs font-semibold text-teal-800">
                · {cycleMeta?.shortLabel} · الرياضيات · {selectedSemester}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              قوائم معيارية لمضامين وكفايات وتعثرات الرياضيات الديداكتيكية لإدراج تشخيص دقيق بنقرة واحدة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSyncWithClassMetadata}
            title="مطابقة القوائم تلقائياً مع السلك والمادة والدورة المستوردة"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-teal-700" />
            <span>مطابقة مع القسم</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <span>{isExpanded ? 'طي البنك' : 'فتح بنك الكفايات'}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {feedbackToast && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-5 py-2 text-xs font-semibold text-emerald-900"
        >
          <Check className="h-4 w-4 shrink-0 text-emerald-700" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {isExpanded && (
        <div className="p-5 space-y-4">
          {/* 3 Cascading Dropdowns + Quick Search (Mathematics Exclusive) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label
                htmlFor="bank-cycle-select"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                1. السلك التعليمي
              </label>
              <select
                id="bank-cycle-select"
                value={selectedCycle}
                onChange={(e) => {
                  setIsManualSelection(true);
                  setSelectedCycle(e.target.value as EducationCycleId);
                  setSearchQuery('');
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
              >
                {EDUCATION_CYCLES.map((cyc) => (
                  <option key={cyc.id} value={cyc.id}>
                    {cyc.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label
                htmlFor="bank-semester-select"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                2. الدورة / الأسدوس
              </label>
              <select
                id="bank-semester-select"
                value={selectedSemester}
                onChange={(e) => {
                  setIsManualSelection(true);
                  setSelectedSemester(e.target.value as BankSemester | 'الكل');
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
              >
                <option value="الدورة الأولى">الدورة الأولى</option>
                <option value="الدورة الثانية">الدورة الثانية</option>
                <option value="الكل">كل الدورات</option>
              </select>
            </div>

            <div className="lg:col-span-4">
              <label
                htmlFor="bank-unit-select"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                3. المحور / الإطار المرجعي في الرياضيات
              </label>
              <select
                id="bank-unit-select"
                value={activeUnit?.id || ''}
                onChange={(e) => {
                  setIsManualSelection(true);
                  setSelectedUnitId(e.target.value);
                }}
                disabled={filteredUnits.length === 0}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none disabled:bg-slate-100"
              >
                {filteredUnits.length === 0 ? (
                  <option value="">لا توجد نتائج مطابقة للبحث</option>
                ) : (
                  filteredUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.levelHint} — {u.moduleTitle}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="lg:col-span-3">
              <label
                htmlFor="bank-search-input"
                className="mb-1 block text-xs font-bold text-slate-800"
              >
                تصفية بكلمة مفتاحية
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="bank-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن تعثر أو درس رياضيات..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-8 pl-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {activeUnit ? (
            <div className="space-y-4">
              {/* Exam Content & Reference Criteria Summary Box with One-Click Apply */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/75 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-teal-700 px-2 py-0.5 text-[11px] font-bold text-white">
                        <Layers className="h-3 w-3" />
                        {activeUnit.levelHint}
                      </span>
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-800">
                        {activeUnit.examHint}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {activeUnit.moduleTitle}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700">
                      <strong className="text-slate-900">محتوى الفرض المقترح: </strong>
                      {activeUnit.examContent}
                    </p>
                    <p className="text-[11.5px] leading-relaxed text-slate-600">
                      <strong className="text-slate-800">مواصفات الإطار المرجعي: </strong>
                      {activeUnit.examCriteria}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApplyContentAndCriteria(activeUnit)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-teal-600 hover:bg-teal-50/50 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-teal-700" />
                      <span>إدراج المضمون والمعايير فقط</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyFullFramework(activeUnit)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-teal-800 cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>تطبيق الإطار المرجعي بالكامل</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Interactive Quick-Pick Columns */}
              <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
                {/* Column 1: Common Weaknesses */}
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/35 p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-950">
                      <Target className="h-3.5 w-3.5 text-amber-700" />
                      <span>التعثرات الشائعة المرصودة (انقر للإضافة/الإزالة)</span>
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {activeUnit.commonWeaknesses.map((item, idx) => {
                      const active = weaknessesSet.has(item.trim());
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => togglePedagogyArrayItem('weaknesses', item)}
                          className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-right text-[11.5px] leading-snug transition-all cursor-pointer ${
                            active
                              ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-950 shadow-2xs'
                              : 'border-amber-200/80 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-50/60'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              active
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-slate-50 text-slate-500'
                            }`}
                          >
                            {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </span>
                          <span className="flex-1">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Competencies & Strengths */}
                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/35 p-3.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                      <BookOpenCheck className="h-3.5 w-3.5 text-emerald-700" />
                      <span>الكفايات والمكتسبات المستهدفة</span>
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {[...activeUnit.competencies, ...activeUnit.strengths].map((item, idx) => {
                      const active = strengthsSet.has(item.trim());
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => togglePedagogyArrayItem('strengths', item)}
                          className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-right text-[11.5px] leading-snug transition-all cursor-pointer ${
                            active
                              ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-950 shadow-2xs'
                              : 'border-emerald-200/80 bg-white text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/60'
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              active
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-slate-300 bg-slate-50 text-slate-500'
                            }`}
                          >
                            {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </span>
                          <span className="flex-1">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Column 3: Remediation Actions & Card Task */}
                <div className="rounded-xl border border-teal-200/90 bg-teal-50/35 p-3.5 flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-950">
                        <Wrench className="h-3.5 w-3.5 text-teal-700" />
                        <span>إجراءات المعالجة والدعم المبرمجة</span>
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {activeUnit.remediationBullets.map((item, idx) => {
                        const active = bulletsSet.has(item.trim());
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              togglePedagogyArrayItem('programmedRemediationBullets', item)
                            }
                            className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-right text-[11.5px] leading-snug transition-all cursor-pointer ${
                              active
                                ? 'border-teal-700 bg-teal-50 font-semibold text-teal-950 shadow-2xs'
                                : 'border-teal-200/80 bg-white text-slate-800 hover:border-teal-500 hover:bg-teal-50/60'
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                                active
                                  ? 'border-teal-700 bg-teal-700 text-white'
                                  : 'border-slate-300 bg-slate-50 text-slate-500'
                              }`}
                            >
                              {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </span>
                            <span className="flex-1">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Card Exercise Task Hook */}
                  <div className="rounded-lg border border-teal-200 bg-white p-2.5 text-[11px]">
                    <div className="font-bold text-teal-950">
                      تمرين علاجي مقترح للبطاقات الفردية:
                    </div>
                    <p className="mt-0.5 leading-snug text-slate-600">
                      {activeUnit.recommendedExerciseTask}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAssignCardsExercise(activeUnit)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 hover:underline cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>اعتماد في البطاقات الفردية للدعم</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-600">
              لم يتم العثور على محور مطابق لعبارة البحث. امسح البحث لعرض جميع أطر المادة.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
