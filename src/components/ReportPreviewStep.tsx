import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  FileDown,
  FileSpreadsheet,
  FileText,
  FolderCheck,
  IdCard,
  Loader2,
  Maximize2,
  Palette,
  Paperclip,
  Printer,
  SlidersHorizontal,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  REPORT_COLOR_THEMES,
  REPORT_FONT_OPTIONS,
  REPORT_FRAME_OPTIONS,
  TEMPLATE_PRESETS,
} from '../data/presets';
import {
  ArchivedClassProject,
  ComputedStats,
  ExamItemDefinition,
  ExamPdfAttachment,
  MassarMetadata,
  ReportFontFamily,
  ReportFontScale,
  ReportFrameStyle,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import { buildProjectFromWorkspace } from '../utils/classArchiveDb';
import { escapeHtml, exportGradebookToExcel, exportReportToWordDoc } from '../utils/massarParser';
import {
  computeLongitudinalComparison,
  computePostRemediationImpact,
} from '../utils/pedagogicalAnalytics';
import { renderExamPdfAttachment } from '../utils/pdfAttachment';
import { exportReportContainerToPdf } from '../utils/pdfExporter';
import { AchievementChartsPanel } from './AchievementChartsPanel';
import {
  buildRemediationCardsWordSectionHtml,
  exportRemediationCardsToWordDoc,
  getFilteredRemediationStudents,
  getRemediationCardsConfig,
} from './IndividualRemediationCardsSheet';
import { RemediationCardsConfigPanel } from './RemediationCardsConfigPanel';
import { PreviewDocumentMode, ReportDocument } from './ReportDocument';
import { resolveReportFrameStyle } from './ReportSheetFrame';
import { ScoreHistogramCard } from './ScoreHistogramCard';
import { GaussDistributionPanel } from './GaussDistributionPanel';

interface ReportPreviewStepProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  stats: ComputedStats;
  students: StudentRecord[];
  examAttachment?: ExamPdfAttachment | null;
  itemDefinitions?: ExamItemDefinition[];
  studentItemScores?: StudentItemScores;
  archivedProjects?: ArchivedClassProject[];
  documentMode?: PreviewDocumentMode;
  onChangeDocumentMode?: (mode: PreviewDocumentMode) => void;
  onUpdateExamAttachment?: (attachment: ExamPdfAttachment | null) => void;
  onUpdateTemplate?: (updater: (prev: ReportTemplateSchema) => ReportTemplateSchema) => void;
  onBackToMassar: () => void;
  onBackToCustomize: () => void;
  externalPdfTrigger?: number;
  onExportingStateChange?: (isExporting: boolean) => void;
}

const computeIdealZoom = () => {
  if (typeof window === 'undefined') return 1;
  const availableWidth = Math.max(300, window.innerWidth - 56);
  const a4PixelWidth = 794; // 210mm at 96dpi
  if (availableWidth < a4PixelWidth) {
    return Math.max(0.4, Math.min(1, Math.floor((availableWidth / a4PixelWidth) * 20) / 20));
  }
  return 1;
};

export const ReportPreviewStep: React.FC<ReportPreviewStepProps> = ({
  template,
  metadata,
  stats,
  students,
  examAttachment = null,
  itemDefinitions = [],
  studentItemScores = {},
  archivedProjects = [],
  documentMode: controlledDocumentMode,
  onChangeDocumentMode,
  onUpdateExamAttachment,
  onUpdateTemplate,
  onBackToMassar,
  onBackToCustomize,
  externalPdfTrigger = 0,
  onExportingStateChange,
}) => {
  const [zoom, setZoom] = useState<number>(() => computeIdealZoom());
  const [unscaledHeight, setUnscaledHeight] = useState<number | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isAttachingExamPdf, setIsAttachingExamPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isPage1Overflowing, setIsPage1Overflowing] = useState(false);
  const [internalDocMode, setInternalDocMode] = useState<PreviewDocumentMode>('report');
  const documentMode = controlledDocumentMode ?? internalDocMode;
  const setDocumentMode = (mode: PreviewDocumentMode) => {
    setInternalDocMode(mode);
    onChangeDocumentMode?.(mode);
  };
  const reportContainerRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectExamPdf = async (file: File) => {
    if (!onUpdateExamAttachment) return;
    setPdfError(null);
    setIsAttachingExamPdf(true);
    try {
      const rendered = await renderExamPdfAttachment(file);
      onUpdateExamAttachment(rendered);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : 'تعذر إرفاق ملف PDF للفرض الأصلي.'
      );
    } finally {
      setIsAttachingExamPdf(false);
    }
  };

  const cohortProjects = useMemo(() => {
    if (students.length === 0) return [];
    const norm = (s?: string) => (s || '').replace(/\s+/g, '').trim().toLowerCase();
    const curClass = norm(metadata.className);
    const curSubj = norm(metadata.subject);
    const matching = archivedProjects.filter((p) => {
      if (curClass && norm(p.metadata.className) !== curClass) return false;
      if (curSubj && norm(p.metadata.subject) && norm(p.metadata.subject) !== curSubj) {
        return false;
      }
      return p.students.length > 0;
    });
    const currentSnapshot = buildProjectFromWorkspace({
      id: 'current-workspace-snapshot',
      metadata,
      students,
      template,
      itemDefinitions,
      studentItemScores,
      examAttachment,
    });
    const curKey = `${norm(metadata.examNumber)}|${norm(metadata.semester)}`;
    const withoutDuplicateCurrent = matching.filter(
      (p) => `${norm(p.metadata.examNumber)}|${norm(p.metadata.semester)}` !== curKey
    );
    return [...withoutDuplicateCurrent, currentSnapshot];
  }, [
    archivedProjects,
    examAttachment,
    itemDefinitions,
    metadata,
    studentItemScores,
    students,
    template,
  ]);

  useEffect(() => {
    const el = reportContainerRef.current;
    if (!el) return;
    const updateHeight = () => {
      setUnscaledHeight(el.offsetHeight);
    };
    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [template, students, metadata, examAttachment, documentMode, itemDefinitions, studentItemScores, cohortProjects]);

  const isExportingRef = useRef(false);
  const lastHandledTriggerRef = useRef(externalPdfTrigger);
  const onExportingStateChangeRef = useRef(onExportingStateChange);

  useEffect(() => {
    onExportingStateChangeRef.current = onExportingStateChange;
  }, [onExportingStateChange]);

  useEffect(() => {
    return () => {
      isExportingRef.current = false;
      onExportingStateChangeRef.current?.(false);
    };
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (!reportContainerRef.current || isExportingRef.current || students.length === 0) return;
    isExportingRef.current = true;
    setPdfError(null);
    setIsExportingPdf(true);
    onExportingStateChangeRef.current?.(true);

    try {
      const prefix =
        documentMode === 'cards'
          ? 'بطاقات_الدعم_الفردية'
          : documentMode === 'both'
          ? 'تقرير_وبطاقات_دعم'
          : documentMode === 'inspection'
          ? 'ملف_التفتيش_الموحد'
          : 'تقرير';
      const fileName = `${prefix}_${metadata.examNumber || 'الفرض'}_${metadata.className || 'القسم'}.pdf`;
      await exportReportContainerToPdf({
        container: reportContainerRef.current,
        fileName,
      });
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? err.message
          : 'تعذر إنشاء ملف PDF. يمكنك استخدام خيار الطباعة كبديل.'
      );
    } finally {
      isExportingRef.current = false;
      setIsExportingPdf(false);
      onExportingStateChangeRef.current?.(false);
    }
  }, [documentMode, metadata.className, metadata.examNumber, students.length]);

  useEffect(() => {
    if (externalPdfTrigger > 0 && externalPdfTrigger !== lastHandledTriggerRef.current) {
      lastHandledTriggerRef.current = externalPdfTrigger;
      void handleExportPdf();
    }
  }, [externalPdfTrigger, handleExportPdf]);

  if (students.length === 0) {
    return (
      <div className="step-transition rounded-xl border border-slate-200 bg-white p-10 text-center">
        <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-teal-700" strokeWidth={1.6} />
        <h2 className="text-lg font-bold text-slate-900">
          لا توجد معطيات تلاميذ للمعاينة بعد
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          قم باستيراد ملف النقط المصدّر من منظومة مسار أولاً حتى يتم حساب الإحصائيات وتوليد التقرير التربوي.
        </p>
        <button
          type="button"
          onClick={onBackToMassar}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 cursor-pointer"
        >
          الانتقال إلى استيراد ملف مسار
        </button>
      </div>
    );
  }

  const basePageCount =
    template.sections.some((s) => s.enabled && s.page === 2) ? 2 : 1;
  const attachmentPagesCount = examAttachment?.pageImages.length ?? 0;
  const hasItemMatrixSheet = itemDefinitions.length > 0 ? 1 : 0;
  const hasLongitudinalSheet =
    documentMode === 'inspection' && cohortProjects.length >= 2 ? 1 : 0;
  const inspectionCoverCount = documentMode === 'inspection' ? 1 : 0;

  const cardsConfig = getRemediationCardsConfig(template, metadata);
  const remediationTargetStudents = getFilteredRemediationStudents(
    students,
    stats,
    template,
    cardsConfig
  );
  const postImpact = computePostRemediationImpact(remediationTargetStudents, template);
  const hasPostImpactSheet =
    documentMode === 'inspection' && postImpact.evaluatedCount > 0 ? 1 : 0;
  const cardsPerSheet = cardsConfig.cardsPerSheet === 2 ? 2 : 4;
  const remediationSheetsCount =
    documentMode === 'inspection' && remediationTargetStudents.length === 0
      ? 0
      : Math.max(1, Math.ceil(remediationTargetStudents.length / cardsPerSheet));

  const includeCardsInCurrentMode =
    documentMode === 'both' ||
    documentMode === 'inspection' ||
    cardsConfig.enabledInFullReport;

  const totalPagesCount =
    documentMode === 'cards'
      ? remediationSheetsCount
      : inspectionCoverCount +
        basePageCount +
        hasItemMatrixSheet +
        hasLongitudinalSheet +
        hasPostImpactSheet +
        attachmentPagesCount +
        (includeCardsInCurrentMode ? remediationSheetsCount : 0);

  const scaledContainerHeight =
    unscaledHeight && zoom < 1 ? Math.ceil(unscaledHeight * zoom) + 16 : undefined;

  return (
    <div className="step-transition space-y-6">
      <div className="no-print flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {documentMode === 'cards'
                ? 'معاينة وطباعة البطاقات الفردية للتقويم والدعم (Fiches de Remédiation)'
                : documentMode === 'inspection'
                ? 'ملف التسليم الموحّد للتفتيش والمراقبة التربوية'
                : 'معاينة التقرير النهائي الجاهز للطباعة'}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>{metadata.className ? `القسم ${metadata.className}` : 'القسم غير محدد'}</span>
              <span aria-hidden="true"> · </span>
              <span>{stats.present} حاضراً</span>
              <span aria-hidden="true"> · </span>
              <span>{stats.absent} غائباً</span>
              <span aria-hidden="true"> · </span>
              <span>
                {documentMode === 'cards'
                  ? `${remediationTargetStudents.length} بطاقة فردية (${remediationSheetsCount} لوحة A4)`
                  : documentMode === 'inspection'
                  ? `${totalPagesCount} صفحات A4 (غلاف التفتيش + التقرير${hasItemMatrixSheet ? ' + شبكة التمارين' : ''}${hasLongitudinalSheet ? ' + التتبع التطوري' : ''}${hasPostImpactSheet ? ' + أثر الدعم البعدي' : ''} + ${remediationTargetStudents.length} بطاقة دعم)`
                  : includeCardsInCurrentMode
                  ? `${totalPagesCount} صفحات A4 (التقرير${hasItemMatrixSheet ? ' + شبكة التمارين' : ''} + ${remediationTargetStudents.length} بطاقة دعم فردية)`
                  : attachmentPagesCount > 0 || hasItemMatrixSheet > 0
                  ? `${totalPagesCount} صفحات A4 (التقرير${hasItemMatrixSheet ? ' + شبكة التمارين' : ''}${attachmentPagesCount > 0 ? ` + ${attachmentPagesCount} مرفق الفرض` : ''})`
                  : basePageCount === 2
                  ? 'صفحتا A4 (التقرير + الملحق)'
                  : 'صفحة A4 واحدة'}
              </span>
            </p>
          </div>

          {/* Document Mode Switcher: Report vs Cards vs Both vs Unified Inspection */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-teal-200 bg-teal-50/50 p-1">
            <button
              type="button"
              onClick={() => setDocumentMode('report')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                documentMode === 'report'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-teal-950 hover:bg-teal-100/70'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>التقرير الرسمي</span>
            </button>
            <button
              type="button"
              onClick={() => setDocumentMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                documentMode === 'cards'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-teal-950 hover:bg-teal-100/70'
              }`}
            >
              <IdCard className="h-3.5 w-3.5" />
              <span>البطاقات الفردية · {remediationTargetStudents.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setDocumentMode('both')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                documentMode === 'both'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-teal-950 hover:bg-teal-100/70'
              }`}
            >
              <span>التقرير + البطاقات</span>
            </button>
            <button
              type="button"
              onClick={() => setDocumentMode('inspection')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                documentMode === 'inspection'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-800 hover:bg-teal-100/70'
              }`}
            >
              <FolderCheck className="h-3.5 w-3.5" />
              <span>ملف التفتيش الموحّد</span>
            </button>
          </div>
        </div>

        {/* Live Quick Appearance Bar (Report Template Structure, Fonts, Color Palettes, Page Frame, Font Scale) */}
        {onUpdateTemplate && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-slate-200/90 bg-slate-50/75 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                <FileText className="h-3.5 w-3.5 text-teal-700" />
                قالب الهيكل:
              </span>
              <select
                aria-label="اختيار قالب هيكل التقرير"
                value={
                  TEMPLATE_PRESETS.some((p) => p.id === template.id)
                    ? template.id
                    : TEMPLATE_PRESETS[0].id
                }
                onChange={(e) => {
                  const selectedPreset = TEMPLATE_PRESETS.find(
                    (p) => p.id === e.target.value
                  );
                  if (!selectedPreset) return;
                  onUpdateTemplate((prev) => {
                    const clonedSections = selectedPreset.sections.map((s) => ({ ...s }));
                    const clonedSignatures = selectedPreset.signatures.map((sig) => ({
                      ...sig,
                    }));
                    return {
                      ...prev,
                      id: selectedPreset.id,
                      name: selectedPreset.name,
                      focusBadge: selectedPreset.focusBadge,
                      useCaseTag: selectedPreset.useCaseTag,
                      sections: clonedSections,
                      signatures: clonedSignatures,
                      hasTwoPages: clonedSections.some((s) => s.enabled && s.page === 2),
                      brackets: selectedPreset.brackets,
                      passThreshold: selectedPreset.passThreshold,
                      excellenceThreshold: selectedPreset.excellenceThreshold,
                      headerConfig: {
                        ...prev.headerConfig,
                        reportTitle:
                          (prev.headerConfig.reportLanguage || 'ar') === 'ar'
                            ? selectedPreset.headerConfig.reportTitle
                            : prev.headerConfig.reportTitle,
                        reportSubtitle:
                          (prev.headerConfig.reportLanguage || 'ar') === 'ar'
                            ? selectedPreset.headerConfig.reportSubtitle
                            : prev.headerConfig.reportSubtitle,
                        appendixTitle:
                          (prev.headerConfig.reportLanguage || 'ar') === 'ar'
                            ? selectedPreset.headerConfig.appendixTitle ||
                              prev.headerConfig.appendixTitle
                            : prev.headerConfig.appendixTitle,
                      },
                      styleConfig: {
                        ...selectedPreset.styleConfig,
                        fontScale: prev.styleConfig.fontScale ?? 'standard',
                      },
                    };
                  });
                }}
                className="max-w-[235px] rounded-md border border-teal-700/40 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {TEMPLATE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.focusBadge ? preset.focusBadge.split(':')[0] + ' — ' : ''}
                    {preset.name.split(' (')[0]}
                  </option>
                ))}
              </select>

              <span className="text-slate-300" aria-hidden="true">|</span>

              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                <Type className="h-3.5 w-3.5 text-teal-700" />
                الخط:
              </span>
              <select
                aria-label="اختيار خط التقرير"
                value={template.styleConfig.fontFamily}
                onChange={(e) =>
                  onUpdateTemplate((prev) => ({
                    ...prev,
                    styleConfig: {
                      ...prev.styleConfig,
                      fontFamily: e.target.value as ReportFontFamily,
                    },
                  }))
                }
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {REPORT_FONT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>

              <span className="text-slate-300" aria-hidden="true">|</span>

              <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                الإطار:
              </span>
              <select
                aria-label="اختيار إطار صفحة التقرير"
                value={resolveReportFrameStyle(template.styleConfig)}
                onChange={(e) => {
                  const nextFrame = e.target.value as ReportFrameStyle;
                  onUpdateTemplate((prev) => ({
                    ...prev,
                    styleConfig: {
                      ...prev.styleConfig,
                      frameStyle: nextFrame,
                      showOuterFrame: nextFrame !== 'none',
                    },
                  }));
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                {REPORT_FRAME_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>

              <span className="text-slate-300" aria-hidden="true">|</span>

              <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                المبيان:
              </span>
              <select
                aria-label="اختيار نمط المبيان في التقرير"
                value={template.styleConfig.chartType}
                onChange={(e) => {
                  const nextChart = e.target
                    .value as ReportTemplateSchema['styleConfig']['chartType'];
                  onUpdateTemplate((prev) => ({
                    ...prev,
                    styleConfig: {
                      ...prev.styleConfig,
                      chartType: nextChart,
                    },
                  }));
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none"
              >
                <option value="gauss">منحنى غوص (Gauss)</option>
                <option value="donut">مبيان دائري (Donut)</option>
                <option value="bar">أعمدة عمودية</option>
                <option value="horizontal-bar">أشرطة أفقية</option>
                <option value="none">بدون مبيان</option>
              </select>

              <span className="text-slate-300" aria-hidden="true">|</span>

              <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5">
                {(
                  [
                    { id: 'compact', label: 'مكثف' },
                    { id: 'standard', label: 'قياسي' },
                    { id: 'comfortable', label: 'مريح' },
                  ] as { id: ReportFontScale; label: string }[]
                ).map((sc) => {
                  const active = (template.styleConfig.fontScale || 'standard') === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          styleConfig: { ...prev.styleConfig, fontScale: sc.id },
                        }))
                      }
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {sc.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 whitespace-nowrap">
                <Palette className="h-3.5 w-3.5 text-teal-700" />
                الألوان:
              </span>
              <div className="flex items-center gap-1">
                {REPORT_COLOR_THEMES.map((theme) => {
                  const isActive =
                    template.styleConfig.accentColor.toLowerCase() ===
                      theme.accentColor.toLowerCase() &&
                    (template.styleConfig.secondaryAccent || '#1e293b').toLowerCase() ===
                      theme.secondaryAccent.toLowerCase();
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      title={`${theme.name} — ${theme.subtitle}`}
                      aria-label={theme.name}
                      onClick={() =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          styleConfig: {
                            ...prev.styleConfig,
                            accentColor: theme.accentColor,
                            secondaryAccent: theme.secondaryAccent,
                          },
                        }))
                      }
                      className={`flex h-6 w-6 overflow-hidden rounded-md border transition-transform cursor-pointer ${
                        isActive
                          ? 'scale-110 border-slate-900 ring-2 ring-slate-900/20'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                    >
                      <span
                        className="h-full w-3.5"
                        style={{ backgroundColor: theme.accentColor }}
                      />
                      <span
                        className="h-full w-2.5"
                        style={{ backgroundColor: theme.secondaryAccent }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 100) / 100))}
              title="تصغير المعاينة"
              aria-label="تصغير المعاينة"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom(computeIdealZoom())}
              title="ملاءمة حجم العرض مع الشاشة"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 cursor-pointer"
            >
              <Maximize2 className="h-3 w-3" />
              <span>ملاءمة</span>
            </button>
            {[
              { label: '50%', val: 0.5 },
              { label: '75%', val: 0.75 },
              { label: '90%', val: 0.9 },
              { label: '100%', val: 1 },
            ].map((z) => (
              <button
                key={z.label}
                type="button"
                onClick={() => setZoom(z.val)}
                className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                  Math.abs(zoom - z.val) < 0.03
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {z.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.25, Math.round((z + 0.1) * 100) / 100))}
              title="تكبير المعاينة"
              aria-label="تكبير المعاينة"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white hover:text-slate-900 cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {onUpdateExamAttachment && (
            <>
              <input
                ref={attachmentInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleSelectExamPdf(file);
                  e.target.value = '';
                }}
              />
              {!examAttachment ? (
                <button
                  type="button"
                  disabled={isAttachingExamPdf}
                  onClick={() => attachmentInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700/40 bg-teal-50/70 px-3 py-2 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100/80 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isAttachingExamPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-700" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5 text-teal-700" />
                  )}
                  <span>{isAttachingExamPdf ? 'جاري الإرفاق...' : 'إرفاق الفرض (PDF)'}</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-900">
                  <Paperclip className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  <span className="max-w-[130px] truncate" title={examAttachment.fileName}>
                    الفرض المرفق ({examAttachment.pageCount} ص)
                  </span>
                  <button
                    type="button"
                    title="إزالة مرفق الفرض الأصلي"
                    onClick={() => onUpdateExamAttachment(null)}
                    className="mr-1 rounded p-0.5 text-slate-500 hover:bg-red-100 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onBackToCustomize}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            تعديل المعطيات
          </button>

          <button
            type="button"
            onClick={() =>
              exportGradebookToExcel(
                metadata,
                stats,
                students,
                template.passThreshold,
                template.excellenceThreshold,
                itemDefinitions,
                studentItemScores,
                template.remediationCardsConfig
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
            تصدير Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={() => {
              if (documentMode === 'cards') {
                exportRemediationCardsToWordDoc(
                  template,
                  metadata,
                  stats,
                  students,
                  itemDefinitions,
                  studentItemScores
                );
              } else {
                const includeCards =
                  documentMode === 'both' ||
                  documentMode === 'inspection' ||
                  cardsConfig.enabledInFullReport;
                const extraCardsHtml = includeCards
                  ? buildRemediationCardsWordSectionHtml(
                      template,
                      metadata,
                      stats,
                      students,
                      itemDefinitions,
                      studentItemScores
                    )
                  : '';
                let longitudinalWordHtml = '';
                if (documentMode === 'inspection' && cohortProjects.length >= 2) {
                  const longit = computeLongitudinalComparison(
                    cohortProjects,
                    template.passThreshold
                  );
                  if (longit.exams.length >= 2) {
                    const accent = template.styleConfig.accentColor || '#0f766e';
                    longitudinalWordHtml = `
                      <div style="margin-bottom: 12px;">
                        <h2 style="font-size:13px; color:#ffffff; background:${accent}; padding:5px 10px; margin:12px 0 6px; border-radius:3px;">
                          حصيلة التتبع التطوري عبر الفروض (${longit.exams.length} فروض)
                        </h2>
                        <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center; margin-bottom:10px;">
                          <tr style="background:#f1f5f9;">
                            <th style="border:1px solid #cbd5e1; padding:5px;">الفرض</th>
                            <th style="border:1px solid #cbd5e1; padding:5px;">الحاضرون</th>
                            <th style="border:1px solid #cbd5e1; padding:5px;">المعدل العام (/20)</th>
                            <th style="border:1px solid #cbd5e1; padding:5px;">نسبة التحكم (%)</th>
                          </tr>
                          ${longit.exams
                            .map(
                              (ex) => `
                            <tr>
                              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${escapeHtml(ex.label)}</td>
                              <td style="border:1px solid #cbd5e1; padding:5px;">${ex.present}/${ex.present + ex.absent}</td>
                              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${ex.average.toFixed(2)}</td>
                              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${ex.passRate.toFixed(1)}%</td>
                            </tr>`
                            )
                            .join('')}
                        </table>
                      </div>
                    `;
                  }
                }
                const combinedExtraHtml =
                  [longitudinalWordHtml, extraCardsHtml].filter(Boolean).join('\n') ||
                  undefined;
                exportReportToWordDoc(
                  template,
                  metadata,
                  stats,
                  students,
                  examAttachment,
                  combinedExtraHtml,
                  itemDefinitions,
                  studentItemScores
                );
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-teal-700" />
            {documentMode === 'cards'
              ? 'تصدير البطاقات Word (.doc)'
              : documentMode === 'both' || documentMode === 'inspection'
              ? 'تصدير الملف الشامل Word (.doc)'
              : 'تصدير Word (.doc)'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-700" />
            طباعة A4
          </button>

          <button
            type="button"
            disabled={isExportingPdf}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            {isExportingPdf ? 'جاري التصدير...' : 'تصدير PDF'}
          </button>
        </div>
      </div>

      {pdfError && (
        <div
          role="alert"
          className="no-print flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pdfError}</span>
        </div>
      )}

      {documentMode !== 'cards' && isPage1Overflowing && (
        <div
          role="status"
          className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-xs text-amber-950"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <div className="font-bold">
                تنبيه سعة الصفحة الأولى (A4): المحتوى المكتوب كثيف وقد يتجاوز حدود الصفحة الواحدة
              </div>
              <div className="mt-0.5 text-amber-900">
                تم تقليص الهوامش الداخلية تلقائياً، ويُنصح بتفعيل حجم الخط «مضغوط» أو اختصار بعض السطور لضمان ظهور التوقيعات كاملة عند الطباعة.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onUpdateTemplate && template.styleConfig.fontScale !== 'compact' && (
              <button
                type="button"
                onClick={() =>
                  onUpdateTemplate((prev) => ({
                    ...prev,
                    styleConfig: { ...prev.styleConfig, fontScale: 'compact' },
                  }))
                }
                className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-900 cursor-pointer"
              >
                ضبط حجم الخط «مضغوط» تلقائياً
              </button>
            )}
            <button
              type="button"
              onClick={onBackToCustomize}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100/60 cursor-pointer"
            >
              تعديل الأقسام والسطور
            </button>
          </div>
        </div>
      )}

      {/* Absent Students Summary Section (compared to total class size) */}
      {(() => {
        const absentPercentage = stats.total > 0 ? (stats.absent / stats.total) * 100 : 0;
        const presentPercentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
        const hasAbsences = stats.absent > 0;

        return (
          <section
            aria-label="ملخص الغياب والحضور بالقسم"
            className="no-print rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  ملخص التلاميذ الغائبين ونسبتهم من إجمالي القسم
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {hasAbsences
                    ? `سُجّل غياب ${stats.absent} من أصل ${stats.total} تلميذاً مسجلاً بالقسم (${absentPercentage.toFixed(1)}%)، وتُحتسب لهم نقطة 0.00 في الترتيب الاستحقاقي.`
                    : `جميع تلاميذ القسم المسجلين (${stats.total} تلميذاً) حضروا الفرض المحروس بنسبة حضور 100%.`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:min-w-[520px]">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-center">
                  <div className="text-[11px] font-semibold text-slate-500">إجمالي القسم</div>
                  <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-slate-900">
                    {stats.total}
                  </div>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-center">
                  <div className="text-[11px] font-semibold text-emerald-800">الحاضرون</div>
                  <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-emerald-700">
                    {stats.present}{' '}
                    <span className="text-xs font-semibold">
                      ({presentPercentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded-lg border px-3 py-2 text-center ${
                    hasAbsences
                      ? 'border-amber-200 bg-amber-50/70'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div
                    className={`text-[11px] font-semibold ${
                      hasAbsences ? 'text-amber-900' : 'text-slate-500'
                    }`}
                  >
                    عدد الغائبين
                  </div>
                  <div
                    className={`mt-0.5 font-mono text-base font-extrabold tabular-nums ${
                      hasAbsences ? 'text-amber-800' : 'text-slate-700'
                    }`}
                  >
                    {stats.absent}
                  </div>
                </div>

                <div
                  className={`rounded-lg border px-3 py-2 text-center ${
                    hasAbsences
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-emerald-200 bg-emerald-50/50'
                  }`}
                >
                  <div
                    className={`text-[11px] font-semibold ${
                      hasAbsences ? 'text-red-800' : 'text-emerald-800'
                    }`}
                  >
                    نسبة الغياب
                  </div>
                  <div
                    className={`mt-0.5 font-mono text-base font-extrabold tabular-nums ${
                      hasAbsences ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {absentPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Proportional Attendance vs Absence Bar */}
            <div className="mt-3.5">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${presentPercentage}%` }}
                  title={`الحاضرون: ${stats.present} (${presentPercentage.toFixed(1)}%)`}
                />
                {hasAbsences && (
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${absentPercentage}%` }}
                    title={`الغائبون: ${stats.absent} (${absentPercentage.toFixed(1)}%)`}
                  />
                )}
              </div>
            </div>

            {/* Absent Student Names List when present */}
            {hasAbsences && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-700">
                  قائمة التلاميذ الغائبين:
                </span>
                {stats.absentStudents.map((st) => (
                  <span
                    key={st.id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-950"
                  >
                    <span className="font-mono text-[11px] text-amber-700">#{st.order}</span>
                    <span>{st.fullName}</span>
                    {st.observation && (
                      <span className="text-[11px] font-normal text-amber-800">
                        ({st.observation})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      <GaussDistributionPanel
        activeDataset={{
          id: 'preview-workspace',
          label:
            [metadata.className || 'القسم الحالي', metadata.examNumber]
              .filter(Boolean)
              .join(' · ') || 'القسم النشط',
          isLiveWorkspace: true,
          students,
          metadata,
          template,
          stats,
        }}
        archivedProjects={archivedProjects}
        compact
      />

      <ScoreHistogramCard
        students={students}
        stats={stats}
        metadata={metadata}
        passThreshold={template.passThreshold}
        excellenceThreshold={template.excellenceThreshold}
      />

      <AchievementChartsPanel
        stats={stats}
        metadata={metadata}
        passThreshold={template.passThreshold}
      />

      {(documentMode === 'cards' ||
        documentMode === 'both' ||
        documentMode === 'inspection' ||
        cardsConfig.enabledInFullReport) &&
        onUpdateTemplate && (
          <RemediationCardsConfigPanel
            template={template}
            metadata={metadata}
            stats={stats}
            students={students}
            itemDefinitions={itemDefinitions}
            studentItemScores={studentItemScores}
            onUpdateTemplate={onUpdateTemplate}
          />
        )}

      <div
        className="print-only-container overflow-x-auto overflow-y-hidden rounded-xl border border-slate-200 bg-slate-200/75 p-4 sm:p-8 print:border-none print:bg-transparent print:p-0"
        style={scaledContainerHeight ? { height: `${scaledContainerHeight + 48}px` } : undefined}
      >
        <div
          ref={reportContainerRef}
          className="report-zoom-wrapper origin-top transition-transform [&>.space-y-8>.report-sheet]:shadow-[0_8px_30px_rgba(15,23,42,0.10)]"
          style={{ transform: `scale(${zoom})` }}
        >
          <ReportDocument
            template={template}
            metadata={metadata}
            stats={stats}
            students={students}
            examAttachment={examAttachment}
            documentMode={documentMode}
            itemDefinitions={itemDefinitions}
            studentItemScores={studentItemScores}
            cohortProjects={cohortProjects}
            onPage1OverflowChange={setIsPage1Overflowing}
          />
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          onClick={onBackToCustomize}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>العودة إلى التخصيص والمعالجة (2/3)</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>طباعة التقرير (A4)</span>
          </button>
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-teal-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExportingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            <span>{isExportingPdf ? 'جاري تصدير PDF...' : 'تحميل التقرير بصيغة PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
