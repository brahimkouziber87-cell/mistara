import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Grid3X3,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  ExamItemDefinition,
  MassarMetadata,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import {
  computeItemMatrixStats,
  exportItemScoresTemplateToExcel,
  parseItemScoresFromExcelFile,
  syncStudentTotalScoresFromItems,
} from '../utils/pedagogicalAnalytics';

interface ItemAnalysisMatrixPanelProps {
  students: StudentRecord[];
  metadata: MassarMetadata;
  itemDefinitions: ExamItemDefinition[];
  studentItemScores: StudentItemScores;
  onUpdateItemDefinitions: (items: ExamItemDefinition[]) => void;
  onUpdateStudentItemScores: (scores: StudentItemScores) => void;
  onSyncTotalScores?: (updatedStudents: StudentRecord[]) => void;
  onUpdateTemplate: (updater: (prev: ReportTemplateSchema) => ReportTemplateSchema) => void;
}

export const ItemAnalysisMatrixPanel: React.FC<ItemAnalysisMatrixPanelProps> = ({
  students,
  metadata,
  itemDefinitions,
  studentItemScores,
  onUpdateItemDefinitions,
  onUpdateStudentItemScores,
  onSyncTotalScores,
  onUpdateTemplate,
}) => {
  const [showStudentGrid, setShowStudentGrid] = useState(false);
  const [injectedMessage, setInjectedMessage] = useState<string | null>(null);
  const [excelImportMessage, setExcelImportMessage] = useState<string | null>(null);
  const [excelImportError, setExcelImportError] = useState<string | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement | null>(null);

  const totalMaxScore = useMemo(
    () => itemDefinitions.reduce((sum, it) => sum + (Number(it.maxScore) || 0), 0),
    [itemDefinitions]
  );

  const itemStats = useMemo(
    () => computeItemMatrixStats(students, itemDefinitions, studentItemScores, 50),
    [students, itemDefinitions, studentItemScores]
  );

  const handleInitStandardExercises = () => {
    const baseCompetencies = (metadata.examContent || '')
      .split(/[·،؛\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const defaults: ExamItemDefinition[] = [
      {
        id: `item-${Date.now()}-1`,
        label: 'التمرين 1',
        competency: baseCompetencies[0] || 'استرداد المعارف والتطبيق المباشر للقواعد',
        maxScore: 6,
        remediationTask: 'إنجاز بطاقة مراجعة القواعد الأساسية وتمارين التطبيق المباشر',
      },
      {
        id: `item-${Date.now()}-2`,
        label: 'التمرين 2',
        competency: baseCompetencies[1] || 'توظيف المفاهيم في وضعيات مألوفة',
        maxScore: 7,
        remediationTask: 'حل سلسلة تمارين نموذجية موجهة لتثبيت المنهجية',
      },
      {
        id: `item-${Date.now()}-3`,
        label: 'التمرين 3',
        competency: baseCompetencies[2] || 'وضعيات مركبة والبرهنة وحل المشكلات',
        maxScore: 7,
        remediationTask: 'التمرن على تفكيك الأسئلة المركبة وصياغة التعليل المتدرج',
      },
    ];
    onUpdateItemDefinitions(defaults);
    setShowStudentGrid(true);
  };

  const handleAddItem = () => {
    const nextIdx = itemDefinitions.length + 1;
    const remaining = Math.max(1, Math.round((20 - totalMaxScore) * 4) / 4);
    onUpdateItemDefinitions([
      ...itemDefinitions,
      {
        id: `item-${Date.now()}-${nextIdx}`,
        label: `التمرين ${nextIdx}`,
        competency: '',
        maxScore: remaining > 0 && totalMaxScore < 20 ? remaining : 4,
        remediationTask: '',
      },
    ]);
  };

  const handleUpdateItem = (id: string, patch: Partial<ExamItemDefinition>) => {
    onUpdateItemDefinitions(
      itemDefinitions.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  };

  const handleRemoveItem = (id: string) => {
    onUpdateItemDefinitions(itemDefinitions.filter((it) => it.id !== id));
    const nextScores: StudentItemScores = {};
    for (const [stId, row] of Object.entries(studentItemScores)) {
      const rest = { ...row };
      delete rest[id];
      nextScores[stId] = rest;
    }
    onUpdateStudentItemScores(nextScores);
  };

  const handleCellScoreChange = (
    studentId: string,
    itemId: string,
    maxScore: number,
    rawVal: string
  ) => {
    const prevRow = studentItemScores[studentId] || {};
    if (rawVal === '') {
      onUpdateStudentItemScores({
        ...studentItemScores,
        [studentId]: { ...prevRow, [itemId]: null },
      });
      return;
    }
    const num = Number.parseFloat(rawVal);
    if (!Number.isFinite(num)) return;
    const clamped = Math.max(0, Math.min(maxScore, num));
    onUpdateStudentItemScores({
      ...studentItemScores,
      [studentId]: { ...prevRow, [itemId]: clamped },
    });
  };

  const handlePrefillProportional = () => {
    if (itemDefinitions.length === 0 || students.length === 0) return;
    const scaleTotal = totalMaxScore > 0 ? totalMaxScore : 20;
    const nextScores: StudentItemScores = { ...studentItemScores };

    for (const st of students) {
      if (st.isAbsent || st.score === null) continue;
      const ratio = Math.max(0, Math.min(1, st.score / 20));
      const row: Record<string, number | null> = {};
      let allocated = 0;

      itemDefinitions.forEach((it, idx) => {
        const max = Math.max(0.25, Number(it.maxScore) || 1);
        if (idx === itemDefinitions.length - 1) {
          const targetTotal = ratio * scaleTotal;
          const rem = Math.max(0, Math.min(max, targetTotal - allocated));
          row[it.id] = Math.round(rem * 4) / 4;
        } else {
          const val = Math.round(Math.min(max, Math.max(0, ratio * max)) * 4) / 4;
          row[it.id] = val;
          allocated += val;
        }
      });

      nextScores[st.id] = row;
    }

    onUpdateStudentItemScores(nextScores);
    setShowStudentGrid(true);
  };

  const handleApplySumToTotalScores = () => {
    if (!onSyncTotalScores || itemDefinitions.length === 0) return;
    const updated = syncStudentTotalScoresFromItems(
      students,
      itemDefinitions,
      studentItemScores
    );
    onSyncTotalScores(updated);
    setInjectedMessage('تم تحديث النقط الإجمالية للتلاميذ انطلاقاً من مجموع نقط التمارين.');
  };

  const handleInjectWeakItemsIntoDiagnosis = () => {
    const weakItems = itemStats.filter(
      (s) => s.evaluatedCount > 0 && s.masteryRate < 65
    );
    if (weakItems.length === 0) {
      setInjectedMessage('لم يتم رصد تمارين بنسبة تحكم أقل من 65% لإدراجها في التشخيص.');
      return;
    }

    onUpdateTemplate((prev) => {
      const existingWeaknesses = new Set(prev.pedagogicalContent.weaknesses);
      const newWeaknesses = [...prev.pedagogicalContent.weaknesses];
      const existingBullets = new Set(
        prev.pedagogicalContent.programmedRemediationBullets
      );
      const newBullets = [...prev.pedagogicalContent.programmedRemediationBullets];

      weakItems.forEach((st) => {
        const wLine = `تعثر في ${st.item.label} (${st.item.competency || 'الكفاية المستهدفة'}) — نسبة التحكم ${st.masteryRate.toFixed(0)}% (متوسط ${st.averageScore.toFixed(2)}/${st.item.maxScore})`;
        if (!existingWeaknesses.has(wLine)) {
          newWeaknesses.push(wLine);
        }
        if (st.item.remediationTask?.trim()) {
          const rLine = `${st.item.label}: ${st.item.remediationTask.trim()}`;
          if (!existingBullets.has(rLine)) {
            newBullets.push(rLine);
          }
        }
      });

      return {
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          weaknesses: newWeaknesses,
          programmedRemediationBullets: newBullets,
        },
      };
    });

    setInjectedMessage(
      `تم إدراج ${weakItems.length} تعثر(ات) مستخلصة من شبكة التمارين في التشخيص وخطة المعالجة وتحديث البطاقات الفردية تلقائياً.`
    );
  };

  const handleDownloadExcelTemplate = () => {
    setExcelImportError(null);
    exportItemScoresTemplateToExcel(
      students,
      itemDefinitions,
      studentItemScores,
      metadata
    );
    setExcelImportMessage(
      `تم تنزيل قالب Excel جاهز بأسماء تلاميذ القسم (${students.length}) وأعمدة التمارين (${itemDefinitions.length}). املأ النقط وأعد استيراده هنا.`
    );
  };

  const handleImportExcelItemScores = async (file: File) => {
    setExcelImportError(null);
    setExcelImportMessage(null);
    setIsImportingExcel(true);
    try {
      const result = await parseItemScoresFromExcelFile(
        file,
        students,
        itemDefinitions,
        studentItemScores
      );
      if (result.importedCellsCount === 0) {
        setExcelImportError(
          'تمت قراءة الملف ولكن لم يتم العثور على نقط رقمية قابلة للاستيراد. تأكد من تطابق رموز مسار أو أسماء التلاميذ.'
        );
        return;
      }
      onUpdateStudentItemScores(result.mergedScores);
      setShowStudentGrid(true);
      setExcelImportMessage(
        `تم استيراد ${result.importedCellsCount} نقطة لـ ${result.matchedStudentsCount} تلميذ(ة) عبر الأعمدة (${result.matchedItemLabels.join('، ')}) بنجاح.`
      );
    } catch (err) {
      setExcelImportError(
        err instanceof Error ? err.message : 'تعذر قراءة ملف نقط التمارين.'
      );
    } finally {
      setIsImportingExcel(false);
    }
  };

  const hasEvaluatedItems = itemStats.some((s) => s.evaluatedCount > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Grid3X3 className="h-4 w-4 text-teal-700" />
            <span>شبكة تحليل النتائج حسب التمارين والكفايات (Item Competency Matrix)</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            حدّد تمارين الفرض والكفايات المرتبطة بها وسلّم تنقيطها لتشخيص نسب التحكم وتخصيص بطاقات الدعم الفردية بدقة لكل متعلم
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {itemDefinitions.length === 0 ? (
            <button
              type="button"
              onClick={handleInitStandardExercises}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              تهيئة شبكة تمارين الفرض (3 تمارين / 20)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700/40 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100/80 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة تمرين / سؤال
            </button>
          )}
        </div>
      </div>

      {itemDefinitions.length > 0 && (
        <div className="mt-4 space-y-4">
          {/* Scale status strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">مجموع سلّم التمارين:</span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  Math.abs(totalMaxScore - 20) < 0.01
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {totalMaxScore.toFixed(2)} / 20
              </span>
              {Math.abs(totalMaxScore - 20) >= 0.01 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
                  <AlertTriangle className="h-3 w-3" />
                  يُستحسن ضبط المجموع على 20 نقطة
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportExcelItemScores(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                disabled={students.length === 0 || itemDefinitions.length === 0}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-700/30 bg-emerald-50/70 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 transition-colors hover:bg-emerald-100/80 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                تنزيل قالب النقط (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => excelInputRef.current?.click()}
                disabled={students.length === 0 || itemDefinitions.length === 0 || isImportingExcel}
                className="inline-flex items-center gap-1 rounded-md border border-teal-700/40 bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-900 transition-colors hover:bg-teal-50 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5 text-teal-700" />
                {isImportingExcel ? 'جاري الاستيراد...' : 'استيراد نقط التمارين (Excel)'}
              </button>
              <button
                type="button"
                onClick={handlePrefillProportional}
                disabled={students.length === 0}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 whitespace-nowrap shrink-0 cursor-pointer"
              >
                ملء ابتدائي متناسب من النقط العامة
              </button>
              <button
                type="button"
                onClick={() => setShowStudentGrid((v) => !v)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showStudentGrid
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-teal-700/40 bg-white text-teal-800 hover:bg-teal-50'
                }`}
              >
                {showStudentGrid
                  ? 'إخفاء شبكة نقط التلاميذ'
                  : `رصد نقط التمارين للتلاميذ (${students.length})`}
              </button>
            </div>
          </div>

          {excelImportError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
              <span>{excelImportError}</span>
            </div>
          )}

          {excelImportMessage && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-950">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700" />
                <span>{excelImportMessage}</span>
              </div>
              {onSyncTotalScores && (
                <button
                  type="button"
                  onClick={handleApplySumToTotalScores}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-700/40 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-900 transition-colors hover:bg-emerald-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowDownCircle className="h-3.5 w-3.5" />
                  اعتماد مجموع التمارين كنقطة عامة (/20)
                </button>
              )}
            </div>
          )}

          {/* Exercise definitions list */}
          <div className="space-y-2">
            {itemDefinitions.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 md:grid-cols-12"
              >
                <div className="md:col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    التمرين #{idx + 1}
                  </label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    الكفاية أو الهدف التربوي المستهدف
                  </label>
                  <input
                    type="text"
                    value={item.competency}
                    onChange={(e) =>
                      handleUpdateItem(item.id, { competency: e.target.value })
                    }
                    placeholder="مثال: حل المعادلات والمتراجحات..."
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    السلم
                  </label>
                  <input
                    type="number"
                    min={0.25}
                    max={20}
                    step={0.25}
                    value={item.maxScore}
                    onChange={(e) => {
                      const v = Number.parseFloat(e.target.value);
                      if (Number.isFinite(v)) {
                        handleUpdateItem(item.id, {
                          maxScore: Math.max(0.25, Math.min(20, v)),
                        });
                      }
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center font-mono text-xs font-bold tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">
                    نشاط الدعم الموجه عند التعثر
                  </label>
                  <input
                    type="text"
                    value={item.remediationTask || ''}
                    onChange={(e) =>
                      handleUpdateItem(item.id, { remediationTask: e.target.value })
                    }
                    placeholder="تمرين علاجي يظهر في بطاقة المتعلم المتعثر..."
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                  />
                </div>
                <div className="flex items-end justify-end md:col-span-1">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    title="حذف التمرين"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Student per-item score entry grid */}
          {showStudentGrid && students.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3.5 py-2">
                <span className="text-xs font-bold text-slate-800">
                  جدول إدخال نقط التمارين حسب كل متعلم(ة)
                </span>
                {onSyncTotalScores && (
                  <button
                    type="button"
                    onClick={handleApplySumToTotalScores}
                    className="inline-flex items-center gap-1.5 rounded-md border border-teal-700/40 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-900 transition-colors hover:bg-teal-100 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowDownCircle className="h-3.5 w-3.5" />
                    تحديث النقطة العامة (/20) من مجموع التمارين
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-auto">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700">
                    <tr>
                      <th className="px-2.5 py-2 text-center w-10">ر.ت</th>
                      <th className="px-2.5 py-2 min-w-[150px]">التلميذ(ة)</th>
                      <th className="px-2.5 py-2 text-center w-20">العامة</th>
                      {itemDefinitions.map((it) => (
                        <th key={it.id} className="px-2 py-2 text-center min-w-[92px]">
                          <div>{it.label}</div>
                          <div className="font-mono text-[10px] font-normal text-slate-500">
                            /{it.maxScore}
                          </div>
                        </th>
                      ))}
                      <th className="px-2.5 py-2 text-center w-20">مجموع التمارين</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((st, idx) => {
                      const row = studentItemScores[st.id] || {};
                      let itemsSum = 0;
                      let hasItemScore = false;
                      itemDefinitions.forEach((it) => {
                        const v = row[it.id];
                        if (typeof v === 'number' && Number.isFinite(v)) {
                          hasItemScore = true;
                          itemsSum += v;
                        }
                      });

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70">
                          <td className="px-2.5 py-1.5 text-center font-mono tabular-nums text-slate-500">
                            {st.order || idx + 1}
                          </td>
                          <td className="px-2.5 py-1.5 font-semibold text-slate-900 truncate max-w-[170px]">
                            {st.fullName}
                          </td>
                          <td className="px-2.5 py-1.5 text-center font-mono font-bold tabular-nums text-slate-700">
                            {st.isAbsent || st.score === null ? 'غائب' : st.score.toFixed(2)}
                          </td>
                          {itemDefinitions.map((it) => (
                            <td key={it.id} className="px-1.5 py-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={it.maxScore}
                                step={0.25}
                                disabled={st.isAbsent}
                                value={
                                  st.isAbsent
                                    ? ''
                                    : row[it.id] === null || row[it.id] === undefined
                                    ? ''
                                    : row[it.id]!
                                }
                                placeholder={st.isAbsent ? 'غ' : '—'}
                                onChange={(e) =>
                                  handleCellScoreChange(
                                    st.id,
                                    it.id,
                                    it.maxScore,
                                    e.target.value
                                  )
                                }
                                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-1 text-center font-mono text-xs font-semibold tabular-nums text-slate-900 focus:border-teal-700 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </td>
                          ))}
                          <td className="px-2.5 py-1.5 text-center font-mono font-bold tabular-nums text-teal-800">
                            {st.isAbsent ? '—' : hasItemScore ? itemsSum.toFixed(2) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Competency Mastery Analytics Summary */}
          {hasEvaluatedItems && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-900">
                  حصيلة التحكم في الكفايات المقومة (عتبة التحكم في التمرين ≥ 50% من السلّم)
                </div>
                <button
                  type="button"
                  onClick={handleInjectWeakItemsIntoDiagnosis}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  إدراج التمارين المتعثرة في التشخيص والمعالجة
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {itemStats.map((st) => {
                  const barColor =
                    st.status === 'mastered'
                      ? '#16a34a'
                      : st.status === 'partial'
                      ? '#d97706'
                      : '#dc2626';
                  return (
                    <div
                      key={st.item.id}
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {st.item.label}
                        </span>
                        <span
                          className="font-mono text-xs font-extrabold tabular-nums"
                          style={{ color: barColor }}
                        >
                          {st.masteryRate.toFixed(0)}% تحكم
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-600" title={st.item.competency}>
                        {st.item.competency || 'كفاية التمرين'}
                      </p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(4, Math.min(100, st.masteryRate))}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                        <span>
                          المتوسط: {st.averageScore.toFixed(2)}/{st.item.maxScore}
                        </span>
                        <span>متعثرون: {st.weakStudentIds.length} ت</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {injectedMessage && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{injectedMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
