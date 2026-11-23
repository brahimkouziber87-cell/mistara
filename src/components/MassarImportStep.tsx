import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  UserX,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EXAM_NUMBER_OPTIONS } from '../data/presets';
import {
  ComputedStats,
  MassarMetadata,
  ParsedMassarWorkbook,
  StudentRecord,
} from '../types/report';
import {
  exportGradebookToExcel,
  extractExamNumberFromHeader,
  parseMassarSheet,
  readExcelFile,
} from '../utils/massarParser';
import { AbsentStudentsPanel } from './AbsentStudentsPanel';

interface MassarImportStepProps {
  students: StudentRecord[];
  metadata: MassarMetadata;
  stats: ComputedStats;
  passThreshold: number;
  excellenceThreshold: number;
  workbookInfo: ParsedMassarWorkbook | null;
  rawWorkbook: XLSX.WorkBook | null;
  onWorkbookLoaded: (wb: XLSX.WorkBook, parsed: ParsedMassarWorkbook) => void;
  onLoadSampleData: () => void;
  onUpdateMetadata: (patch: Partial<MassarMetadata>) => void;
  onClearData: () => void;
  onUpdateStudentScore: (id: string, score: number | null, isAbsent: boolean) => void;
  onAddStudent: (fullName: string, score: number | null, isAbsent: boolean) => void;
  onAddAbsentStudents: (
    entries: Array<{ fullName: string; observation?: string }>
  ) => void;
  onUpdateObservation: (id: string, observation: string) => void;
  onRemoveStudent: (id: string) => void;
  onNextStep: () => void;
}

type FilterMode = 'all' | 'present' | 'passed' | 'struggling' | 'absent';

const AUTO_LOAD_STORAGE_KEY = 'mistara_auto_load_files_v1';

export const MassarImportStep: React.FC<MassarImportStepProps> = ({
  students,
  metadata,
  stats,
  passThreshold,
  excellenceThreshold,
  workbookInfo,
  rawWorkbook,
  onWorkbookLoaded,
  onLoadSampleData,
  onUpdateMetadata,
  onClearData,
  onUpdateStudentScore,
  onAddStudent,
  onAddAbsentStudents,
  onUpdateObservation,
  onRemoveStudent,
  onNextStep,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoProcessedMessage, setAutoProcessedMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const [sortByMerit, setSortByMerit] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [showAddStudentRow, setShowAddStudentRow] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentScore, setNewStudentScore] = useState('12');

  const [autoLoadEnabled, setAutoLoadEnabled] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(AUTO_LOAD_STORAGE_KEY);
      return saved === null ? true : saved === '1';
    } catch {
      return true;
    }
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const processExcelFile = async (file: File, wasAutoTriggered = false) => {
    setErrorMsg(null);
    setAutoProcessedMessage(null);
    setPendingFile(null);
    setIsLoading(true);
    try {
      const wb = await readExcelFile(file);
      const parsed = parseMassarSheet(wb, file.name);
      if (parsed.students.length === 0) {
        setErrorMsg(
          'تعذر العثور على لائحة التلاميذ في هذا الملف. تأكد من اختيار ورقة العمل الصحيحة أو أن الملف يحتوي على أعمدة الاسم والنقطة.'
        );
        return;
      }
      if (wasAutoTriggered) {
        setAutoProcessedMessage(
          `تم التحميل والمعالجة التلقائية للملف «${file.name}» بنجاح (${parsed.students.length} تلميذاً).`
        );
      }
      onWorkbookLoaded(wb, parsed);
    } catch {
      setErrorMsg(
        'حدث خطأ أثناء قراءة ملف Excel. يرجى التأكد من سلامة الملف بصيغة .xlsx أو .xls أو .csv.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectedOrDroppedFile = (file: File) => {
    setErrorMsg(null);
    setAutoProcessedMessage(null);
    if (autoLoadEnabled) {
      void processExcelFile(file, true);
    } else {
      setPendingFile(file);
    }
  };

  const handleToggleAutoLoad = () => {
    const nextValue = !autoLoadEnabled;
    setAutoLoadEnabled(nextValue);
    try {
      window.localStorage.setItem(AUTO_LOAD_STORAGE_KEY, nextValue ? '1' : '0');
    } catch {
      // ignore storage error
    }
    if (nextValue && pendingFile) {
      void processExcelFile(pendingFile, true);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!rawWorkbook || !workbookInfo) return;
    const parsed = parseMassarSheet(rawWorkbook, workbookInfo.fileName, sheetName);
    onWorkbookLoaded(rawWorkbook, parsed);
  };

  const handleScoreColumnChange = (colName: string) => {
    if (!rawWorkbook || !workbookInfo) return;
    const parsed = parseMassarSheet(
      rawWorkbook,
      workbookInfo.fileName,
      workbookInfo.activeSheet,
      colName
    );
    onWorkbookLoaded(rawWorkbook, parsed);
  };

  const handleQuickExamSelect = (examValue: string) => {
    onUpdateMetadata({ examNumber: examValue });
    if (rawWorkbook && workbookInfo?.scoreColumnsAnalysis) {
      const matchedCol = workbookInfo.scoreColumnsAnalysis.find(
        (c) => c.examNumber === examValue
      );
      if (matchedCol && matchedCol.label !== workbookInfo.selectedScoreColumn) {
        handleScoreColumnChange(matchedCol.label);
      }
    }
  };

  const normalizedActiveExamNumber = extractExamNumberFromHeader(metadata.examNumber);

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStudentName.trim();
    if (!trimmed) return;
    const parsedScore = Number.parseFloat(newStudentScore);
    const validScore = Number.isFinite(parsedScore)
      ? Math.max(0, Math.min(20, parsedScore))
      : null;
    onAddStudent(trimmed, validScore, validScore === null);
    setNewStudentName('');
    setNewStudentScore('12');
    setShowAddStudentRow(false);
  };

  const focusScoreRow = (startRowIdx: number, step: 1 | -1 = 1) => {
    let idx = startRowIdx;
    while (idx >= 0 && idx < filteredStudents.length) {
      const el = document.querySelector<HTMLInputElement>(
        `input[data-score-row="${idx}"]:not(:disabled)`
      );
      if (el) {
        el.focus();
        el.select();
        return;
      }
      idx += step;
    }
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeBracketIds = selectedBracketId
      ? new Set(
          stats.bracketsBreakdown
            .find((b) => b.bracket.id === selectedBracketId)
            ?.students.map((s) => s.id) ?? []
        )
      : null;

    const list = students.filter((st) => {
      const matchesQuery =
        !q ||
        st.fullName.toLowerCase().includes(q) ||
        st.code.toLowerCase().includes(q) ||
        (st.observation && st.observation.toLowerCase().includes(q));
      if (!matchesQuery) return false;

      if (activeBracketIds && !activeBracketIds.has(st.id)) {
        return false;
      }

      if (filterMode === 'present') return !st.isAbsent && st.score !== null;
      if (filterMode === 'absent') return st.isAbsent;
      if (filterMode === 'passed')
        return !st.isAbsent && st.score !== null && st.score >= passThreshold;
      if (filterMode === 'struggling')
        return !st.isAbsent && st.score !== null && st.score < passThreshold;
      return true;
    });

    if (!sortByMerit) return list;

    return [...list].sort((a, b) => {
      const aAbs = a.isAbsent || a.score === null;
      const bAbs = b.isAbsent || b.score === null;
      const scoreA = aAbs ? 0 : (a.score as number);
      const scoreB = bAbs ? 0 : (b.score as number);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (aAbs !== bAbs) return aAbs ? 1 : -1;
      return a.order - b.order;
    });
  }, [
    students,
    searchQuery,
    filterMode,
    passThreshold,
    selectedBracketId,
    stats.bracketsBreakdown,
    sortByMerit,
  ]);

  return (
    <div className="step-transition space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSelectedOrDroppedFile(file);
          e.target.value = '';
        }}
      />

      {/* Top 2-Column Split: Upload + Context Summary */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleSelectedOrDroppedFile(file);
          }}
          className={`flex flex-col justify-between rounded-xl border bg-white p-6 transition-colors lg:col-span-8 ${
            isDragging
              ? 'border-teal-700 bg-teal-50/30 ring-2 ring-teal-700/15'
              : 'border-slate-200'
          }`}
        >
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  استيراد لائحة ونقط التلاميذ من مسار
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                  ارفع ملف النقط المصدّر من منظومة مسار (.xlsx أو .xls أو .csv) لاستخراج المعطيات
                  الإدارية ونقط التلاميذ وتوليد التقرير التربوي تلقائياً.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Auto-Load Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoLoadEnabled}
                  onClick={handleToggleAutoLoad}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    autoLoadEnabled
                      ? 'border-teal-700/40 bg-teal-50/80 text-teal-900'
                      : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Zap
                    className={`h-3.5 w-3.5 ${
                      autoLoadEnabled ? 'text-teal-700' : 'text-slate-400'
                    }`}
                  />
                  <span>التحميل التلقائي للملفات</span>
                  <span
                    className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                      autoLoadEnabled ? 'bg-teal-700' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
                        autoLoadEnabled ? '-translate-x-3.5' : '-translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>

                {students.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-teal-700" />
                      استيراد ملف آخر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFile(null);
                        setAutoProcessedMessage(null);
                        onClearData();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      مسح
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Staged file confirmation banner when Auto-Load is turned OFF */}
            {pendingFile && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-300 bg-teal-50/70 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="h-6 w-6 text-teal-700 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">
                      ملف جاهز للمعالجة: {pendingFile.name}
                    </div>
                    <div className="text-xs text-slate-600">
                      الحجم: <span className="font-mono tabular-nums">{(pendingFile.size / 1024).toFixed(1)} KB</span> · التحميل التلقائي متوقف حالياً، اضغط على زر المعالجة لتحميل النقط
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => void processExcelFile(pendingFile, false)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    معالجة وتحميل الملف الآن
                  </button>
                </div>
              </div>
            )}

            {/* Auto-processed feedback banner */}
            {autoProcessedMessage && !errorMsg && (
              <div
                role="status"
                className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-semibold text-emerald-900"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {autoProcessedMessage}
                </span>
                <button
                  type="button"
                  onClick={() => setAutoProcessedMessage(null)}
                  className="text-emerald-700 hover:underline cursor-pointer"
                >
                  إخفاء
                </button>
              </div>
            )}

            {students.length === 0 ? (
              <div
                className={`mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                  isDragging
                    ? 'border-teal-700 bg-teal-50/50'
                    : 'border-slate-300 bg-slate-50/60 hover:border-teal-600/60 hover:bg-slate-50'
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-teal-200 bg-teal-50/70 text-teal-700">
                  <FileSpreadsheet className="h-6 w-6" strokeWidth={1.7} />
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-900">
                  {isLoading
                    ? 'جاري قراءة وتحليل ملف مسار تلقائياً...'
                    : 'اسحب ملف مسار (Excel) وأفلته هنا أو اختره من جهازك'}
                </p>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-500">
                  {autoLoadEnabled
                    ? 'التحميل التلقائي مفعّل: تتم معالجة ملف الإكسل واستخراج لائحة التلاميذ والنقط فور اختياره'
                    : 'التحميل التلقائي متوقف: اختر الملف أولاً ثم اضغط على زر المعالجة لتأكيد التحميل'}
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    {autoLoadEnabled
                      ? 'اختيار ملف مسار (معالجة فورية)'
                      : 'اختيار ملف مسار (.xlsx / .xls)'}
                  </button>
                  <button
                    type="button"
                    onClick={onLoadSampleData}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-teal-700" />
                    تجربة ببيانات قسم نموذجية
                  </button>
                </div>

                {/* Unboxed 3-Step Mechanism-to-Outcome Strip */}
                <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-2 border-t border-slate-200/80 pt-4 text-right sm:grid-cols-3 sm:divide-x sm:divide-x-reverse sm:divide-slate-200">
                  <div className="sm:px-3 first:sm:pr-0">
                    <div className="font-mono text-[11px] font-bold text-teal-700">01 · الاستخراج الآلي</div>
                    <div className="mt-0.5 text-[11.5px] text-slate-600">
                      قراءة فورية للوائح مسار وتحديد الغياب وأعمدة الفروض
                    </div>
                  </div>
                  <div className="sm:px-3">
                    <div className="font-mono text-[11px] font-bold text-teal-700">02 · مذكرة التقويم</div>
                    <div className="mt-0.5 text-[11.5px] text-slate-600">
                      تدقيق المدة وآجال التصحيح وبنك كفايات الرياضيات بالتأهيلي
                    </div>
                  </div>
                  <div className="sm:px-3 last:sm:pl-0">
                    <div className="font-mono text-[11px] font-bold text-teal-700">03 · ملف التفتيش</div>
                    <div className="mt-0.5 text-[11.5px] text-slate-600">
                      تقرير A4 رسمي، بطاقات الدعم الفردي، وتصدير PDF / Word / Excel
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileSpreadsheet className="h-5 w-5 text-teal-700 shrink-0" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {workbookInfo ? workbookInfo.fileName : 'بيانات قسم جاهزة للمعالجة'}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span>{stats.total} تلميذ مستخرج</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {autoLoadEnabled
                            ? 'التحميل التلقائي مفعّل لاستبدال الملف فور اختياره'
                            : 'يمكنك اختيار ملف جديد وتأكيد معالجته'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {workbookInfo ? (
                  <div className="mt-3.5 space-y-2.5">
                    {!rawWorkbook && (
                      <p className="rounded-md border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-[11px] font-medium text-amber-900">
                        تم استرجاع معطيات المسودة المحفوظة. لتبديل الورقة أو عمود الفرض، أعد رفع ملف Excel الأصلي.
                      </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        ورقة العمل (القسم في الملف)
                      </label>
                      {workbookInfo.sheetNames.length > 1 && workbookInfo.sheetNames.length <= 5 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {workbookInfo.sheetNames.map((name, idx) => {
                            const isSelected = workbookInfo.activeSheet === name;
                            const sheetSummary = workbookInfo.sheetSummaries?.find(
                              (s) => s.name === name
                            );
                            return (
                              <button
                                key={`${name}-${idx}`}
                                type="button"
                                disabled={!rawWorkbook}
                                onClick={() => handleSheetChange(name)}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                                  isSelected
                                    ? 'border-teal-700 bg-teal-700 text-white shadow-xs'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span>{name}</span>
                                {sheetSummary && (
                                  <span
                                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                                      isSelected
                                        ? 'bg-teal-900/40 text-teal-50'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {sheetSummary.studentCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <select
                          disabled={!rawWorkbook}
                          value={workbookInfo.activeSheet}
                          onChange={(e) => handleSheetChange(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                        >
                          {workbookInfo.sheetNames.map((name, idx) => {
                            const sheetSummary = workbookInfo.sheetSummaries?.find(
                              (s) => s.name === name
                            );
                            return (
                              <option key={`${name}-${idx}`} value={name}>
                                {name}
                                {sheetSummary ? ` (${sheetSummary.studentCount} تلميذ)` : ''}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        عمود النقطة المستهدف للتقرير
                      </label>
                      {workbookInfo.availableScoreColumns.length > 1 &&
                      workbookInfo.availableScoreColumns.length <= 6 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {workbookInfo.availableScoreColumns.map((col, idx) => {
                            const isSelected = workbookInfo.selectedScoreColumn === col;
                            return (
                              <button
                                key={`${col}-${idx}`}
                                type="button"
                                disabled={!rawWorkbook}
                                onClick={() => handleScoreColumnChange(col)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${
                                  isSelected
                                    ? 'border-teal-700 bg-teal-700 text-white shadow-xs'
                                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {col}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <select
                          disabled={!rawWorkbook}
                          value={workbookInfo.selectedScoreColumn}
                          onChange={(e) => handleScoreColumnChange(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70"
                        >
                          {workbookInfo.availableScoreColumns.length === 0 ? (
                            <option value="">لم يتم رصد عمود نقط</option>
                          ) : (
                            workbookInfo.availableScoreColumns.map((col, idx) => (
                              <option key={`${col}-${idx}`} value={col}>
                                {col}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-600">
                    تم تحميل بيانات القسم بنجاح. يمكنك تعديل النقط مباشرة في الجدول أسفله أو رفع ملف مسار خاص بك.
                  </p>
                )}
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              تُحفظ إعدادات المؤسسة والأستاذ وخيار التحميل التلقائي تلقائياً في متصفحك.
            </span>
            {students.length > 0 && (
              <span className="font-semibold text-teal-800">
                تم استخراج {stats.present} نقطة حضور و {stats.absent} حالة غياب
              </span>
            )}
          </div>
        </div>

        {/* Right Summary Card with Quick Inline Edit */}
        <aside className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">ملخص القسم والملف</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {isEditingSummary
                    ? 'تعديل سريع للمعطيات الأساسية'
                    : 'المعطيات المستخرجة للتقرير'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingSummary((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isEditingSummary ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-teal-700" />
                    تم
                  </>
                ) : (
                  <>
                    <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                    تعديل سريع
                  </>
                )}
              </button>
            </div>

            {!isEditingSummary ? (
              <dl className="mt-4 divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-slate-600 shrink-0">المؤسسة</dt>
                  <dd className="max-w-[210px] truncate font-semibold text-slate-900">
                    {metadata.school || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-slate-600 shrink-0">المستوى</dt>
                  <dd className="max-w-[210px] truncate font-semibold text-slate-900">
                    {metadata.level || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-slate-600 shrink-0">القسم</dt>
                  <dd className="font-semibold text-slate-900">
                    {metadata.className || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-slate-600 shrink-0">المادة</dt>
                  <dd className="max-w-[210px] truncate font-semibold text-slate-900">
                    {metadata.subject || '—'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2 py-2.5">
                  <dt className="text-slate-600 shrink-0">الأستاذ(ة)</dt>
                  <dd className="max-w-[210px] truncate font-semibold text-slate-900">
                    {metadata.teacherName || '—'}
                  </dd>
                </div>
                <div className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-slate-600 shrink-0">الفرض</dt>
                    <dd className="max-w-[210px] truncate font-semibold text-slate-900">
                      {metadata.examNumber} · {metadata.coefficient}
                    </dd>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {EXAM_NUMBER_OPTIONS.map((opt) => {
                      const isActive =
                        metadata.examNumber.trim() === opt.value ||
                        normalizedActiveExamNumber === opt.value;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleQuickExamSelect(opt.value)}
                          className={`rounded-md border px-2.5 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                            isActive
                              ? 'border-teal-700 bg-teal-700 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {opt.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </dl>
            ) : (
              <div className="mt-3 space-y-2.5">
                {(
                  [
                    { key: 'school', label: 'المؤسسة', placeholder: 'اسم المؤسسة التعليمية' },
                    { key: 'level', label: 'المستوى', placeholder: 'المستوى الدراسي' },
                    { key: 'className', label: 'القسم', placeholder: 'مثال: TCSF-1' },
                    { key: 'subject', label: 'المادة', placeholder: 'المادة الدراسية' },
                    { key: 'teacherName', label: 'الأستاذ(ة)', placeholder: 'اسم الأستاذ(ة)' },
                    { key: 'examNumber', label: 'رقم الفرض', placeholder: 'الفرض المحروس رقم 1' },
                  ] as { key: keyof MassarMetadata; label: string; placeholder: string }[]
                ).map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="grid grid-cols-12 items-center gap-2">
                      <label className="col-span-4 text-xs font-semibold text-slate-600">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        value={metadata[item.key]}
                        placeholder={item.placeholder}
                        onChange={(e) => onUpdateMetadata({ [item.key]: e.target.value })}
                        className="col-span-8 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>
                    {item.key === 'examNumber' && (
                      <div className="flex flex-wrap items-center justify-end gap-1 pt-0.5">
                        {EXAM_NUMBER_OPTIONS.map((opt) => {
                          const isActive =
                            metadata.examNumber.trim() === opt.value ||
                            normalizedActiveExamNumber === opt.value;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleQuickExamSelect(opt.value)}
                              className={`rounded border px-2 py-0.5 text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                isActive
                                  ? 'border-teal-700 bg-teal-50 text-teal-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onNextStep}
            disabled={students.length === 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
          >
            <span>الانتقال إلى التخصيص والمعالجة</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
        </aside>
      </section>

      {/* Deep Massar File Analysis & Extracted Information Inspector */}
      {students.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-teal-700/25 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-teal-50/40 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 text-white shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  نتائج التحليل الذكي لملف مسار واستخراج المعطيات
                </h2>
                <p className="text-xs text-slate-600">
                  {workbookInfo
                    ? `تم فحص بنية الملف «${workbookInfo.fileName}» واستخراج المعطيات الإدارية والتربوية ونقط التلاميذ تلقائياً`
                    : 'تحليل شامل للمعطيات الإدارية والتربوية الخاصة بالقسم والفرض المحروس'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {workbookInfo?.headerRowNumber && (
                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                  سطر الترويسة المكتشف:{' '}
                  <strong className="font-mono tabular-nums text-teal-800">
                    #{workbookInfo.headerRowNumber}
                  </strong>
                </span>
              )}
              <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 font-semibold text-teal-900">
                {workbookInfo?.detectedFields?.length ?? 8} معطيات إدارية مستخرجة
              </span>
              {workbookInfo?.scoreColumnsAnalysis &&
                workbookInfo.scoreColumnsAnalysis.length > 0 && (
                  <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
                    أعمدة الفروض المكتشفة:{' '}
                    <strong className="font-mono tabular-nums text-slate-900">
                      {workbookInfo.scoreColumnsAnalysis.length}
                    </strong>
                  </span>
                )}
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Score Columns Analysis Cards (when workbook has score columns) */}
            {workbookInfo?.scoreColumnsAnalysis &&
              workbookInfo.scoreColumnsAnalysis.length > 0 && (
                <div>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      تحليل أعمدة الفروض والنقط المرصودة في الورقة ({workbookInfo.activeSheet}):
                    </span>
                    <span className="text-xs text-slate-500">
                      انقر على أي عمود فرض لاستخراج نقطه وتحديث رقم الفرض تلقائياً
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {workbookInfo.scoreColumnsAnalysis.map((colInfo, idx) => {
                      const isSelected = workbookInfo.selectedScoreColumn === colInfo.label;
                      const hasGrades = colInfo.filledCount > 0;
                      return (
                        <button
                          key={`${colInfo.label}-${idx}`}
                          type="button"
                          onClick={() => handleScoreColumnChange(colInfo.label)}
                          className={`flex flex-col justify-between rounded-xl border p-3.5 text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'border-teal-700 bg-teal-50/60 ring-2 ring-teal-700/15'
                              : hasGrades
                                ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                                : 'border-slate-200/80 bg-slate-50/50 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-slate-900">
                                {colInfo.label}
                              </div>
                              <div className="mt-0.5 text-[11px] font-medium text-teal-800">
                                {colInfo.examNumber}
                              </div>
                            </div>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-teal-700 text-white'
                                  : hasGrades
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-200/70 text-slate-600'
                              }`}
                            >
                              {isSelected ? 'قيد الاستخراج' : hasGrades ? 'يحتوي على نقط' : 'فارغ'}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[11px] text-slate-600">
                            <span>
                              المرصود:{' '}
                              <strong className="font-mono tabular-nums text-slate-900">
                                {colInfo.filledCount}
                              </strong>
                              {' · '}
                              الغياب/الفارغ:{' '}
                              <strong className="font-mono tabular-nums text-slate-700">
                                {colInfo.absentCount}
                              </strong>
                            </span>
                            <span className="font-mono font-bold tabular-nums text-teal-800">
                              {colInfo.average !== null
                                ? `المعدل: ${colInfo.average.toFixed(2)}`
                                : '—'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Extracted Administrative & Pedagogical Fields Grid (Editable Inline) */}
            <div>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  المعطيات الإدارية والتربوية المستخرجة من الملف (قابلة للتعديل المباشر):
                </span>
                <span className="text-xs text-slate-500">
                  يتم ملء هذه الخانات آلياً من ترويسة ملف مسار مع إمكانية تعديل أي بيان فوراً
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(
                  [
                    {
                      key: 'academy',
                      label: 'الأكاديمية الجهوية',
                      placeholder: 'الأكاديمية الجهوية للتربية والتكوين...',
                    },
                    {
                      key: 'directorate',
                      label: 'المديرية الإقليمية',
                      placeholder: 'المديرية الإقليمية...',
                    },
                    {
                      key: 'school',
                      label: 'المؤسسة التعليمية',
                      placeholder: 'الثانوية التأهيلية / الإعدادية...',
                    },
                    {
                      key: 'schoolYear',
                      label: 'الموسم الدراسي',
                      placeholder: '2024/2025',
                    },
                    {
                      key: 'cycle',
                      label: 'السلك التعليمي',
                      placeholder: 'السلك الثانوي التأهيلي / الإعدادي',
                    },
                    {
                      key: 'level',
                      label: 'المستوى الدراسي',
                      placeholder: 'الجذع المشترك / البكالوريا...',
                    },
                    {
                      key: 'className',
                      label: 'القسم / الفوج',
                      placeholder: 'مثال: TCSF-1',
                    },
                    {
                      key: 'subject',
                      label: 'المادة الدراسية',
                      placeholder: 'مادة التدريس...',
                    },
                    {
                      key: 'teacherName',
                      label: 'اسم الأستاذ(ة)',
                      placeholder: 'الأستاذ(ة) المكلف(ة)...',
                    },
                    {
                      key: 'semester',
                      label: 'الدورة الدراسية',
                      placeholder: 'الدورة الأولى / الثانية',
                    },
                    {
                      key: 'examNumber',
                      label: 'رقم الفرض المحروس',
                      placeholder: 'الفرض المحروس رقم 1',
                    },
                    {
                      key: 'examDate',
                      label: 'تاريخ إنجاز الفرض',
                      placeholder: 'يوم / شهر / سنة',
                    },
                  ] as { key: keyof MassarMetadata; label: string; placeholder: string }[]
                ).map((field) => {
                  const detectedItem = workbookInfo?.detectedFields?.find(
                    (d) => d.key === field.key
                  );
                  const currentValue = metadata[field.key] || '';
                  return (
                    <div
                      key={field.key}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 transition-colors focus-within:border-teal-700 focus-within:bg-white"
                    >
                      <div className="mb-1 flex items-center justify-between gap-1.5">
                        <label className="text-[11px] font-bold text-slate-700">
                          {field.label}
                        </label>
                        {detectedItem ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              detectedItem.source === 'cell'
                                ? 'bg-emerald-100/90 text-emerald-800'
                                : 'bg-amber-100/90 text-amber-900'
                            }`}
                          >
                            {detectedItem.source === 'cell'
                              ? 'مستخرج من الملف'
                              : 'مستنتج تلقائياً'}
                          </span>
                        ) : currentValue ? (
                          <span className="rounded bg-slate-200/75 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            محفوظ / معدل
                          </span>
                        ) : (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
                            غير مرصود بالملف
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={currentValue}
                        placeholder={field.placeholder}
                        onChange={(e) => onUpdateMetadata({ [field.key]: e.target.value })}
                        className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-slate-200 focus:bg-white focus:outline-none"
                      />
                      {field.key === 'examNumber' && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 border-t border-slate-200/70 pt-1.5">
                          {EXAM_NUMBER_OPTIONS.map((opt) => {
                            const isActive =
                              currentValue.trim() === opt.value ||
                              normalizedActiveExamNumber === opt.value;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleQuickExamSelect(opt.value)}
                                className={`rounded border px-2 py-0.5 text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                  isActive
                                    ? 'border-teal-700 bg-teal-700 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {opt.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Full-Width 4-Column Quantitative KPI Strip */}
      <section className="grid grid-cols-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-4 md:divide-y-0 md:divide-x md:divide-x-reverse">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">المعدل العام للقسم</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-teal-800">
            {stats.present > 0 ? (
              <>
                {stats.average.toFixed(2)}{' '}
                <span className="text-sm font-normal text-slate-500">/ 20</span>
              </>
            ) : (
              '—'
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            الوسيط:{' '}
            <span className="font-mono tabular-nums">
              {stats.present > 0 ? stats.median.toFixed(2) : '—'}
            </span>{' '}
            · الانحراف:{' '}
            <span className="font-mono tabular-nums">
              {stats.present > 0 ? stats.stdDev.toFixed(2) : '—'}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">
            الحاصلون على المعدل (≥ {passThreshold})
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {stats.present > 0 ? `${stats.passRate.toFixed(1)}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            <span className="font-mono tabular-nums text-emerald-700 font-semibold">
              {stats.passed} حاصل على المعدل
            </span>
            <span aria-hidden="true"> · </span>
            <span className="font-mono tabular-nums text-amber-700 font-semibold">
              {stats.failed} دون المعدل
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">المسجلون والحضور</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {stats.present}{' '}
            <span className="text-sm font-normal text-slate-500">/ {stats.total}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            المتغيبون عن الفرض:{' '}
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {stats.absent}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">أعلى وأدنى نقطة</div>
          <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-slate-900">
            {stats.present > 0 ? (
              <>
                {Number.isInteger(stats.maxScore)
                  ? stats.maxScore.toFixed(0)
                  : stats.maxScore.toFixed(2)}
                <span className="mx-1.5 text-sm font-normal text-slate-400">إلى</span>
                {Number.isInteger(stats.minScore)
                  ? stats.minScore.toFixed(0)
                  : stats.minScore.toFixed(2)}
              </>
            ) : (
              '—'
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            المتفوقون (≥ {excellenceThreshold}):{' '}
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {stats.topStudents.length}
            </span>
          </div>
        </div>
      </section>

      {/* Absent Students Entry & Management */}
      <AbsentStudentsPanel
        students={students}
        absentStudents={stats.absentStudents}
        onAddAbsentStudents={onAddAbsentStudents}
        onUpdateObservation={onUpdateObservation}
        onRestorePresent={(id) => onUpdateStudentScore(id, null, false)}
        onRemoveStudent={onRemoveStudent}
      />

      {/* Full Student Gradebook Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">جدول نقط التلاميذ المستخرج</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>{stats.total} تلميذ</span>
              <span aria-hidden="true"> · </span>
              <span>{stats.passed} حاصل على المعدل</span>
              <span aria-hidden="true"> · </span>
              <span>{stats.failed} دون المعدل</span>
              <span aria-hidden="true"> · </span>
              <span>{stats.absent} غائب</span>
              {students.length > 0 && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="text-teal-800">
                    استخدم الأسهم (↑ ↓) أو Enter للتنقل السريع بين خانات النقط
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو رمز مسار..."
                className="w-52 sm:w-56 rounded-lg border border-slate-300 bg-white py-1.5 pr-9 pl-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              {(
                [
                  { id: 'all', label: `الكل (${stats.total})` },
                  { id: 'passed', label: `المعدل (${stats.passed})` },
                  { id: 'struggling', label: `المتعثرون (${stats.failed})` },
                  { id: 'absent', label: `الغائبون (${stats.absent})` },
                ] as { id: FilterMode; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filterMode === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddStudentRow((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5 text-teal-700" />
              إضافة تلميذ
            </button>

            {students.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  exportGradebookToExcel(
                    metadata,
                    stats,
                    students,
                    passThreshold,
                    excellenceThreshold
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700/30 bg-teal-50/70 px-3 py-1.5 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100/80 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal-700" />
                تصدير Excel
              </button>
            )}
          </div>
        </div>

        {showAddStudentRow && (
          <form
            onSubmit={handleCreateStudentSubmit}
            className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-teal-50/40 px-5 py-3.5"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                الاسم الكامل للتلميذ(ة)
              </label>
              <input
                type="text"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="أدخل النسب والاسم..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                النقطة / 20
              </label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.25}
                value={newStudentScore}
                onChange={(e) => setNewStudentScore(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-center font-mono text-sm font-semibold tabular-nums text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!newStudentName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:bg-slate-300 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة للائحة
              </button>
              <button
                type="button"
                onClick={() => setShowAddStudentRow(false)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}

        {/* Interactive Memo 142 Bracket Distribution Strip */}
        {students.length > 0 && stats.bracketsBreakdown.length > 0 && (
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-700">
                  التفييء الفوري حسب فئات التحكم (مذكرة التقويم):
                </span>
                <span className="text-slate-500">
                  انقر على أي فئة لتصفية التلاميذ المنتمين إليها
                </span>
              </div>
              <div className="flex items-center gap-2">
                {selectedBracketId && (
                  <button
                    type="button"
                    onClick={() => setSelectedBracketId(null)}
                    className="text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
                  >
                    إظهار جميع الفئات
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSortByMerit((v) => !v)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    sortByMerit
                      ? 'border-teal-700 bg-teal-50 text-teal-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sortByMerit ? 'مرتب حسب الاستحقاق (تنازلي)' : 'ترتيب حسب الاستحقاق'}
                </button>
              </div>
            </div>

            <div
              className={`grid grid-cols-2 gap-2 ${
                stats.bracketsBreakdown.length === 6
                  ? 'sm:grid-cols-3 lg:grid-cols-6'
                  : 'sm:grid-cols-5'
              }`}
            >
              {stats.bracketsBreakdown.map((item) => {
                const isSelected = selectedBracketId === item.bracket.id;
                const color = item.bracket.colorHex || '#0f766e';
                return (
                  <button
                    key={item.bracket.id}
                    type="button"
                    onClick={() =>
                      setSelectedBracketId((prev) =>
                        prev === item.bracket.id ? null : item.bracket.id
                      )
                    }
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-white ring-2 ring-slate-900/10 shadow-xs'
                        : 'border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-white'
                    }`}
                    style={{ borderRightWidth: '3.5px', borderRightColor: color }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-900">
                        {item.bracket.appreciation}
                      </div>
                      <div className="font-mono text-[10.5px] text-slate-500" dir="ltr">
                        {item.bracket.label}
                      </div>
                    </div>
                    <div className="text-left font-mono tabular-nums shrink-0">
                      <div className="text-sm font-extrabold" style={{ color }}>
                        {item.count}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.percentage.toFixed(0)}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {students.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-600">
              لم يتم استيراد لائحة التلاميذ بعد. قم باختيار ملف النقط المصدّر من منظومة مسار أعلاه أو اضغط على «تجربة ببيانات قسم نموذجية» لمعاينة سير العمل الكامل.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            لا توجد نتائج مطابقة لخيار البحث أو التصفية المحدد.
          </div>
        ) : (
          <div className="max-h-[540px] overflow-auto">
            <table className="w-full text-right text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-3 text-center w-14">
                    {sortByMerit ? 'الرتبة' : 'ر.ت'}
                  </th>
                  <th className="px-3 py-3 w-28">رمز مسار</th>
                  <th className="px-3 py-3">النسب والاسم</th>
                  <th className="px-3 py-3 w-32 text-center">النقطة / 20</th>
                  <th className="px-3 py-3">الوضعية والتقدير</th>
                  <th className="px-3 py-3 w-52">ملاحظة فردية / مبرر</th>
                  <th className="px-3 py-3 w-28 text-center">الحضور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, idx) => {
                  const isPass = !st.isAbsent && st.score !== null && st.score >= passThreshold;
                  const matchedBracket =
                    !st.isAbsent && st.score !== null
                      ? stats.bracketsBreakdown.find((b) =>
                          b.students.some((s) => s.id === st.id)
                        )?.bracket
                      : undefined;
                  const appreciationLabel = st.isAbsent
                    ? 'غائب'
                    : st.score === null
                    ? 'بانتظار النقطة'
                    : matchedBracket?.appreciation ||
                      (st.score >= excellenceThreshold
                        ? 'ممتاز'
                        : st.score >= passThreshold
                        ? 'متحكم'
                        : 'دون المعدل');
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50/90 focus-within:bg-teal-50/40 transition-colors"
                    >
                      <td className="px-3 py-2 text-center font-mono text-xs tabular-nums text-slate-500">
                        {sortByMerit ? idx + 1 : st.order || idx + 1}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs tabular-nums text-slate-600">
                        {st.code}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{st.fullName}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          data-score-row={idx}
                          disabled={st.isAbsent}
                          value={st.isAbsent ? (sortByMerit ? '0' : '') : st.score === null ? '' : st.score}
                          placeholder={st.isAbsent ? '0.00 (غائب)' : '0.00'}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                              e.preventDefault();
                              focusScoreRow(idx + 1, 1);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              focusScoreRow(idx - 1, -1);
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              onUpdateStudentScore(st.id, null, false);
                              return;
                            }
                            const num = Number.parseFloat(val);
                            if (!Number.isNaN(num)) {
                              onUpdateStudentScore(
                                st.id,
                                Math.max(0, Math.min(20, num)),
                                false
                              );
                            }
                          }}
                          className="w-24 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-center font-mono text-sm font-semibold tabular-nums text-slate-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none disabled:border-amber-200 disabled:bg-amber-50/60 disabled:text-amber-800 disabled:placeholder:text-amber-800"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {st.isAbsent ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                            <UserX className="h-3.5 w-3.5" />
                            غائب (0.00 في الاستحقاق)
                          </span>
                        ) : st.score === null ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
                            بانتظار إدخال النقطة
                          </span>
                        ) : isPass ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{appreciationLabel}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{appreciationLabel} (دعم)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={st.observation || ''}
                          onChange={(e) => onUpdateObservation(st.id, e.target.value)}
                          placeholder={st.isAbsent ? 'مبرر الغياب...' : 'ملاحظة تربوية...'}
                          className="w-full rounded-md border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none transition-colors"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateStudentScore(
                              st.id,
                              null,
                              !st.isAbsent
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                        >
                          {st.isAbsent ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5 text-teal-700" />
                              حضور
                            </>
                          ) : (
                            <>
                              <UserX className="h-3.5 w-3.5 text-slate-500" />
                              غياب
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {students.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-3.5">
            <span className="text-xs text-slate-600">
              مجموع التلاميذ: <strong className="font-mono tabular-nums">{stats.total}</strong> · الحاضرون:{' '}
              <strong className="font-mono tabular-nums">{stats.present}</strong> · الغائبون:{' '}
              <strong className="font-mono tabular-nums">{stats.absent}</strong>
            </span>
            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>متابعة إلى التشخيص والمعالجة (2/3)</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
