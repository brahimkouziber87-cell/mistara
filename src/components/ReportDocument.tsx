import React from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { getReportFontClass } from '../data/presets';
import {
  getLocalizedAppreciation,
  getReportLabels,
  LocalizedReportLabels,
  translateBracketAppreciation,
} from '../data/reportI18n';
import {
  ArchivedClassProject,
  ComputedStats,
  ExamItemDefinition,
  ExamPdfAttachment,
  MassarMetadata,
  PreviewDocumentMode,
  ReportSection,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import {
  computeDocimologicalSummary,
  formatCoefficientAsPercentage,
  getStudentAppreciation,
} from '../utils/massarParser';
import { computePostRemediationImpact } from '../utils/pedagogicalAnalytics';
import {
  getFilteredRemediationStudents,
  getRemediationCardsConfig,
  IndividualRemediationCardsSheet,
} from './IndividualRemediationCardsSheet';
import {
  InspectionCoverSheet,
  InspectionTocEntry,
  ItemMatrixReportSheet,
  LongitudinalSummaryReportSheet,
  PostRemediationImpactReportSheet,
} from './InspectionPortfolioSheets';

export type { PreviewDocumentMode };

interface ReportDocumentProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  stats: ComputedStats;
  students: StudentRecord[];
  examAttachment?: ExamPdfAttachment | null;
  documentMode?: PreviewDocumentMode;
  itemDefinitions?: ExamItemDefinition[];
  studentItemScores?: StudentItemScores;
  cohortProjects?: ArchivedClassProject[];
  onPage1OverflowChange?: (isOverflowing: boolean) => void;
}

const BRACKET_PALETTE = ['#dc2626', '#ea580c', '#2563eb', '#0d9488', '#16a34a', '#7c3aed'];

const DonutDistributionSvg: React.FC<{
  stats: ComputedStats;
  accentColor: string;
  labels: LocalizedReportLabels;
}> = ({ stats, accentColor, labels }) => {
  const segments = stats.bracketsBreakdown.map((item, idx) => {
    const color = item.bracket.colorHex || BRACKET_PALETTE[idx % BRACKET_PALETTE.length];
    const pct = stats.present > 0 ? (item.count / stats.present) * 100 : 0;
    return { item, color, pct };
  });

  const nonZeroSlices = segments
    .filter((seg) => seg.item.count > 0)
    .map((seg) => ({
      id: seg.item.bracket.id,
      name: translateBracketAppreciation(seg.item.bracket.appreciation, labels.lang),
      value: seg.item.count,
      color: seg.color,
    }));

  const pieData =
    nonZeroSlices.length > 0
      ? nonZeroSlices
      : [{ id: 'empty', name: '—', value: 1, color: '#e2e8f0' }];

  return (
    <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative h-[134px] w-[134px] shrink-0" dir="ltr">
        <PieChart width={134} height={134}>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx={67}
            cy={67}
            innerRadius={37}
            outerRadius={58}
            startAngle={90}
            endAngle={-270}
            stroke="#ffffff"
            strokeWidth={1}
            isAnimationActive={false}
          >
            {pieData.map((entry, idx) => (
              <Cell key={entry.id || idx} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
        <div
          dir={labels.dir}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1.5 text-center"
        >
          <span
            className="font-mono text-[10.5px] font-bold tabular-nums"
            style={{ color: accentColor }}
          >
            {stats.average.toFixed(2)}/20
          </span>
          <span className="mt-0.5 text-[7px] font-bold leading-tight text-emerald-700">
            {labels.kpiMastered}
          </span>
          <span className="font-mono text-[9.5px] font-bold text-emerald-700 tabular-nums">
            {stats.passRate.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1 text-[10px]">
        {[...segments].reverse().map((seg) => (
          <div
            key={seg.item.bracket.id}
            className="flex items-center justify-between gap-1.5 rounded border border-slate-200 bg-slate-50/70 px-2 py-0.5 whitespace-nowrap"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate font-semibold text-slate-800">
                {translateBracketAppreciation(seg.item.bracket.appreciation, labels.lang)}
              </span>
              <span
                className="font-mono text-[9px] tracking-tighter text-slate-500 shrink-0"
                dir="ltr"
              >
                {seg.item.bracket.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono tabular-nums shrink-0">
              <span className="font-semibold text-slate-700">
                {seg.item.count} {labels.studentShort}
              </span>
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: seg.color }}
              >
                {seg.pct.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarChartSvg: React.FC<{
  stats: ComputedStats;
  horizontal?: boolean;
  accentColor: string;
  labels: LocalizedReportLabels;
}> = ({ stats, horizontal = false, accentColor, labels }) => {
  const maxCount = Math.max(1, ...stats.bracketsBreakdown.map((b) => b.count));

  if (horizontal) {
    return (
      <div className="space-y-2 py-2">
        {stats.bracketsBreakdown.map((item, idx) => {
          const widthPct = (item.count / maxCount) * 100;
          const color = item.bracket.colorHex || BRACKET_PALETTE[idx % BRACKET_PALETTE.length];
          return (
            <div key={item.bracket.id} className="grid grid-cols-12 items-center gap-2 text-xs">
              <span className="col-span-4 truncate font-semibold text-slate-700">
                {translateBracketAppreciation(item.bracket.appreciation, labels.lang)} ({item.bracket.label})
              </span>
              <div className="col-span-6 h-4 overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full rounded transition-all"
                  style={{ width: `${widthPct}%`, backgroundColor: color || accentColor }}
                />
              </div>
              <span className="col-span-2 text-end font-mono text-[11px] font-bold tabular-nums text-slate-800">
                {item.count} ({item.percentage.toFixed(0)}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-40 items-end justify-around gap-3 border-b border-slate-300 px-4 pt-6 pb-2">
      {stats.bracketsBreakdown.map((item, idx) => {
        const heightPct = (item.count / maxCount) * 100;
        const color = item.bracket.colorHex || BRACKET_PALETTE[idx % BRACKET_PALETTE.length];
        return (
          <div key={item.bracket.id} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
            <span className="font-mono text-[10px] font-bold tabular-nums text-slate-700">
              {item.count} ({item.percentage.toFixed(0)}%)
            </span>
            <div
              className="w-full max-w-[44px] rounded-t"
              style={{
                height: `${Math.max(4, heightPct)}%`,
                backgroundColor: color || accentColor,
              }}
            />
            <span className="text-center text-[10px] font-semibold text-slate-700" dir="ltr">
              {item.bracket.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export const ReportDocument: React.FC<ReportDocumentProps> = ({
  template,
  metadata,
  stats,
  students,
  examAttachment = null,
  documentMode = 'report',
  itemDefinitions = [],
  studentItemScores = {},
  cohortProjects = [],
  onPage1OverflowChange,
}) => {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const accent = template.styleConfig.accentColor || '#1e3a8a';
  const secondaryAccent = template.styleConfig.secondaryAccent || '#1e293b';
  const fontClass = getReportFontClass(template.styleConfig.fontFamily);
  const fontScale = template.styleConfig.fontScale || 'standard';
  const scaleBodyClass =
    fontScale === 'compact'
      ? 'text-[9.5px] leading-[1.3]'
      : fontScale === 'comfortable'
      ? 'text-[10.5px] leading-[1.52]'
      : 'text-[10px] leading-[1.4]';
  const tableHeaderStyle: React.CSSProperties | undefined =
    template.styleConfig.tableHeaderBg === 'solid-accent'
      ? { backgroundColor: accent, color: '#ffffff' }
      : template.styleConfig.tableHeaderBg === 'tinted'
      ? { backgroundColor: `${accent}14`, color: accent }
      : undefined;
  const isBannerStyle = template.styleConfig.borderStyle === 'section-banners';
  const isDoubleBorder = template.styleConfig.borderStyle === 'official-double';
  const docimology = computeDocimologicalSummary(
    stats,
    template.passThreshold,
    template.excellenceThreshold
  );

  const page1Sections = template.sections.filter(
    (s) => s.enabled && (s.page !== 2)
  );
  const page2Sections = template.sections.filter(
    (s) => s.enabled && s.page === 2
  );
  const hasPage2 = page2Sections.length > 0;
  const attachmentPages = examAttachment?.pageImages ?? [];
  const basePagesCount = hasPage2 ? 2 : 1;
  const isInspection = documentMode === 'inspection';
  const hasItemMatrixSheet = itemDefinitions.length > 0;
  const hasLongitudinalSheet = isInspection && cohortProjects.length >= 2;

  const cardsConfig = getRemediationCardsConfig(template, metadata);
  const showRemediationCards =
    documentMode === 'cards' ||
    documentMode === 'both' ||
    isInspection ||
    (documentMode === 'report' && cardsConfig.enabledInFullReport);
  const targetRemediationStudents = showRemediationCards
    ? getFilteredRemediationStudents(students, stats, template, cardsConfig)
    : [];
  const postImpact = computePostRemediationImpact(
    targetRemediationStudents.length > 0
      ? targetRemediationStudents
      : getFilteredRemediationStudents(students, stats, template, cardsConfig),
    template
  );
  const hasPostImpactSheet = isInspection && postImpact.evaluatedCount > 0;
  const cardsPerSheet = cardsConfig.cardsPerSheet === 2 ? 2 : 4;
  const remediationSheetsCount = showRemediationCards
    ? documentMode === 'inspection' && targetRemediationStudents.length === 0
      ? 0
      : Math.max(1, Math.ceil(targetRemediationStudents.length / cardsPerSheet))
    : 0;

  const coverPagesCount = isInspection ? 1 : 0;
  const matrixPagesCount = hasItemMatrixSheet ? 1 : 0;
  const longitudinalPagesCount = hasLongitudinalSheet ? 1 : 0;
  const postImpactPagesCount = hasPostImpactSheet ? 1 : 0;

  const reportStartPage = coverPagesCount + 1;
  const matrixStartPage = reportStartPage + basePagesCount;
  const longitudinalStartPage = matrixStartPage + matrixPagesCount;
  const postImpactStartPage = longitudinalStartPage + longitudinalPagesCount;
  const attachmentStartPage = postImpactStartPage + postImpactPagesCount;
  const cardsStartPage = attachmentStartPage + attachmentPages.length;

  const totalPages =
    documentMode === 'cards'
      ? remediationSheetsCount
      : coverPagesCount +
        basePagesCount +
        matrixPagesCount +
        longitudinalPagesCount +
        postImpactPagesCount +
        attachmentPages.length +
        remediationSheetsCount;

  const reportTitleDisplay =
    lang === 'ar'
      ? template.headerConfig.reportTitle || labels.defaultReportTitle
      : template.headerConfig.reportTitle &&
          template.headerConfig.reportTitle !== 'بطاقة تقرير وتتبع الفرض المحروس'
        ? template.headerConfig.reportTitle
        : labels.defaultReportTitle;

  const inspectionTocEntries: InspectionTocEntry[] = [];
  if (isInspection) {
    let idx = 1;
    inspectionTocEntries.push({
      index: idx++,
      title: reportTitleDisplay,
      subtitle: `${metadata.examNumber} (${metadata.semester})`,
      startPage: reportStartPage,
      pageCount: basePagesCount,
    });
    if (hasItemMatrixSheet) {
      inspectionTocEntries.push({
        index: idx++,
        title: labels.itemMatrixTitle,
        subtitle: labels.itemMatrixSub,
        startPage: matrixStartPage,
        pageCount: 1,
      });
    }
    if (hasLongitudinalSheet) {
      inspectionTocEntries.push({
        index: idx++,
        title: labels.longitudinalSheetTitle,
        subtitle: `${cohortProjects.length} ${lang === 'fr' ? 'évaluations comparées' : lang === 'en' ? 'compared exams' : 'فروض متتابعة للمقارنة'}`,
        startPage: longitudinalStartPage,
        pageCount: 1,
      });
    }
    if (hasPostImpactSheet) {
      inspectionTocEntries.push({
        index: idx++,
        title: labels.postImpactTitle,
        subtitle: `${postImpact.evaluatedCount}/${postImpact.targetedCount} · ${postImpact.recoveryRate.toFixed(0)}%`,
        startPage: postImpactStartPage,
        pageCount: 1,
      });
    }
    if (attachmentPages.length > 0) {
      inspectionTocEntries.push({
        index: idx++,
        title:
          lang === 'fr'
            ? 'Sujet original du devoir surveillé'
            : lang === 'en'
            ? 'Original Supervised Exam Paper'
            : 'نسخة الفرض المحروس الأصلي المرفقة',
        subtitle: examAttachment?.fileName || 'PDF',
        startPage: attachmentStartPage,
        pageCount: attachmentPages.length,
      });
    }
    if (remediationSheetsCount > 0) {
      inspectionTocEntries.push({
        index: idx++,
        title: labels.cardsHeaderTitle,
        subtitle: `${targetRemediationStudents.length} ${labels.studentShort}`,
        startPage: cardsStartPage,
        pageCount: remediationSheetsCount,
      });
    }
  }

  const page1SheetRef = React.useRef<HTMLElement | null>(null);
  const [isPage1Tight, setIsPage1Tight] = React.useState(false);

  React.useLayoutEffect(() => {
    if (documentMode === 'cards') {
      setIsPage1Tight(false);
      onPage1OverflowChange?.(false);
      return;
    }
    const sheetEl = page1SheetRef.current;
    if (!sheetEl) return;
    const checkOverflow = () => {
      const overflowPx = sheetEl.scrollHeight - sheetEl.clientHeight;
      const overflowing = overflowPx > 4;
      setIsPage1Tight(overflowPx > 0 || page1Sections.length > 6);
      onPage1OverflowChange?.(overflowing);
    };
    checkOverflow();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(checkOverflow);
      observer.observe(sheetEl);
      return () => observer.disconnect();
    }
  }, [documentMode, template, metadata, stats, page1Sections.length, onPage1OverflowChange]);

  const page2RosterWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [measuredRosterHeightPx, setMeasuredRosterHeightPx] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    const el = page2RosterWrapRef.current;
    if (!el) return;
    const updateHeight = () => {
      const h = el.clientHeight;
      if (h > 100) {
        setMeasuredRosterHeightPx(h);
      }
    };
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateHeight());
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, [
    hasPage2,
    students.length,
    stats.absent,
    template.styleConfig.fontFamily,
    template.styleConfig.fontScale,
    template.styleConfig.showOuterFrame,
    template.styleConfig.borderStyle,
    template.signatures.length,
  ]);

  const renderSectionBanner = (title: string) => {
    const bStyle = template.styleConfig.borderStyle;
    if (bStyle === 'section-banners') {
      return (
        <div
          className="rounded-t-md px-3 py-1 text-[11px] font-bold text-white"
          style={{ backgroundColor: accent }}
        >
          {title}
        </div>
      );
    }
    if (bStyle === 'official-double') {
      return (
        <div
          className="mb-1.5 border-y-2 px-2.5 py-1 text-[11px] font-extrabold"
          style={{
            borderColor: accent,
            backgroundColor: `${accent}10`,
            color: accent,
          }}
        >
          {title}
        </div>
      );
    }
    if (bStyle === 'classic-grid') {
      return (
        <div
          className="mb-1 rounded-xs border px-2.5 py-1 text-[11px] font-bold"
          style={{
            borderColor: accent,
            borderRightWidth: '4px',
            backgroundColor: '#f8fafc',
            color: accent,
          }}
        >
          {title}
        </div>
      );
    }
    return (
      <div
        className="mb-1.5 border-b-2 pb-1 text-xs font-bold"
        style={{ borderColor: accent, color: accent }}
      >
        {title}
      </div>
    );
  };

  const getLocalizedSectionTitle = (sec: ReportSection) => {
    if (lang === 'ar') return sec.title;
    switch (sec.type) {
      case 'exam_content_box':
        return labels.examContentSectionTitle;
      case 'kpi_summary':
        return labels.kpiSectionTitle;
      case 'brackets_table':
      case 'brackets_and_donut_split':
        return labels.bracketsSectionTitle;
      case 'chart_distribution':
        return labels.chartSectionTitle;
      case 'top_and_struggling':
        return labels.topStrugglingTitle;
      case 'pedagogical_diagnosis':
        return labels.diagnosisSectionTitle;
      case 'remediation_plan':
        return labels.remediationPlanTitle;
      default:
        return sec.title;
    }
  };

  const renderSectionBody = (sec: ReportSection) => {
    const secTitle = getLocalizedSectionTitle(sec);
    switch (sec.type) {
      case 'metadata_grid':
        return (
          <div
            key={sec.id}
            className="avoid-break overflow-hidden rounded-md border border-slate-300 bg-slate-50/70 text-[10px]"
          >
            <div className="grid grid-cols-4 divide-x rtl:divide-x-reverse divide-slate-200 border-b border-slate-200">
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaClassLevel}
                </div>
                <div className="font-semibold text-slate-900 truncate">
                  {metadata.className || '—'}
                  {metadata.level ? ` · ${metadata.level}` : ''}
                </div>
              </div>
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaTeacher}
                </div>
                <div className="font-semibold text-slate-900 truncate">
                  {metadata.teacherName || '—'}
                </div>
              </div>
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaExamDate}
                </div>
                <div className="font-mono font-semibold tabular-nums text-slate-900">
                  {metadata.examDate || '—'}
                </div>
              </div>
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaCorrectionDate}
                </div>
                <div className="font-mono font-semibold tabular-nums text-slate-900">
                  {metadata.correctionDate || '—'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 divide-x rtl:divide-x-reverse divide-slate-200">
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaDuration}
                </div>
                <div className="font-mono font-semibold tabular-nums text-slate-900">
                  {metadata.duration || '—'}
                </div>
              </div>
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaCoefficient}
                </div>
                <div
                  dir="ltr"
                  className="font-mono font-semibold tabular-nums text-slate-900"
                >
                  {formatCoefficientAsPercentage(metadata.coefficient) || '—'}
                </div>
              </div>
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaClassStructure}
                </div>
                <div className="font-mono font-semibold tabular-nums text-slate-900">
                  {stats.total} {labels.studentShort} ({stats.present} {labels.presentShort} · {stats.absent} {labels.absentShort})
                </div>
              </div>
              <div className="px-2 py-1 text-center">
                <div className="text-[9px] font-bold" style={{ color: accent }}>
                  {labels.metaPassAvg}
                </div>
                <div className="font-mono font-bold tabular-nums text-emerald-700">
                  {stats.passRate.toFixed(0)}% ({stats.average.toFixed(2)}/20)
                </div>
              </div>
            </div>
          </div>
        );

      case 'exam_content_box':
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <div className="rounded-b-md border border-t-0 border-slate-300 bg-white px-3 py-1.5 text-[10px] leading-snug text-slate-800">
              <p className="font-bold text-slate-900">
                <span style={{ color: accent }}>{labels.targetedCompetenciesLabel} </span>
                {metadata.examContent || labels.defaultExamTopic}
              </p>
              <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">
                    {labels.examCriteriaLabel}{' '}
                  </span>
                  {metadata.examCriteria || '—'}
                </p>
                {metadata.gradingScaleNote && (
                  <p>
                    <span className="font-semibold text-slate-900">
                      {labels.gradingScaleLabel}{' '}
                    </span>
                    {metadata.gradingScaleNote}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'kpi_summary': {
        const failPct = stats.present > 0 ? (stats.failed / stats.present) * 100 : 0;
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <div className={isBannerStyle ? 'border border-t-0 border-slate-300 p-1.5 rounded-b-md bg-white' : ''}>
              <table className="w-full border-collapse text-center text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800" style={tableHeaderStyle}>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiEnrolled}</th>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiPresent}</th>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiAbsent}</th>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiMaxScore}</th>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiMinScore}</th>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiAverage}</th>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiMedian}</th>
                    <th className="border border-slate-300 px-1.5 py-1">{labels.kpiStdDev}</th>
                    <th className="border border-slate-300 px-1.5 py-1">
                      {labels.kpiMastered} (≥{template.passThreshold})
                    </th>
                    <th className="border border-slate-300 px-1.5 py-1">
                      {labels.kpiBelowPass} (&lt;{template.passThreshold})
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono font-bold tabular-nums">
                  <tr>
                    <td className="border border-slate-300 px-1.5 py-1 text-slate-900">
                      {stats.total}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-slate-900">
                      {stats.present}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-red-700">
                      {stats.absent}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-emerald-700">
                      {Number.isInteger(stats.maxScore) ? stats.maxScore.toFixed(0) : stats.maxScore.toFixed(2)} / 20
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-red-700">
                      {Number.isInteger(stats.minScore) ? stats.minScore.toFixed(0) : stats.minScore.toFixed(2)} / 20
                    </td>
                    <td
                      className="border border-slate-300 px-1.5 py-1"
                      style={{ color: accent }}
                    >
                      {stats.average.toFixed(2)} / 20
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-indigo-700">
                      {stats.median.toFixed(2)} / 20
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-slate-800">
                      {stats.stdDev.toFixed(2)}
                    </td>
                    <td className="border border-slate-300 bg-emerald-50/70 px-1.5 py-1 text-emerald-800">
                      {stats.passed} ({stats.passRate.toFixed(0)}%)
                    </td>
                    <td className="border border-slate-300 bg-red-50/70 px-1.5 py-1 text-red-700">
                      {stats.failed} ({failPct.toFixed(0)}%)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'brackets_and_donut_split': {
        const showChart = template.styleConfig.chartType !== 'none';
        if (!showChart) {
          return (
            <div key={sec.id} className="avoid-break">
              {renderSectionBanner(labels.bracketsSectionTitle)}
              <table className="w-full border-collapse text-center text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800" style={tableHeaderStyle}>
                    <th className="border border-slate-300 px-2 py-1">{labels.bracketColRange}</th>
                    <th className="border border-slate-300 px-2 py-1">{labels.bracketColAppreciation}</th>
                    <th className="border border-slate-300 px-2 py-1">{labels.bracketColCount}</th>
                    <th className="border border-slate-300 px-2 py-1">{labels.bracketColPct}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bracketsBreakdown.map((b) => (
                    <tr key={b.bracket.id}>
                      <td className="border border-slate-300 px-2 py-0.5 font-mono font-bold" dir="ltr">
                        {b.bracket.label}
                      </td>
                      <td className="border border-slate-300 px-2 py-0.5 font-semibold">
                        {translateBracketAppreciation(b.bracket.appreciation, lang)}
                      </td>
                      <td className="border border-slate-300 px-2 py-0.5 font-mono font-bold tabular-nums">
                        {b.count}
                      </td>
                      <td className="border border-slate-300 px-2 py-0.5 font-mono tabular-nums">
                        {b.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div key={sec.id} className="avoid-break">
            <div className="rounded border border-slate-300 bg-white px-3 py-1.5">
              <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                <h3 className="text-[10.5px] font-bold" style={{ color: accent }}>
                  {labels.chartSectionTitle}
                </h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-700">
                  {docimology.homogeneityLabel}
                </span>
              </div>
              {template.styleConfig.chartType === 'bar' ||
              template.styleConfig.chartType === 'horizontal-bar' ? (
                <BarChartSvg
                  stats={stats}
                  horizontal={template.styleConfig.chartType === 'horizontal-bar'}
                  accentColor={accent}
                  labels={labels}
                />
              ) : (
                <DonutDistributionSvg stats={stats} accentColor={accent} labels={labels} />
              )}
            </div>
          </div>
        );
      }

      case 'brackets_table':
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800" style={tableHeaderStyle}>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.bracketColRange}</th>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.bracketColCount}</th>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.bracketColPct}</th>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.bracketColAppreciation}</th>
                </tr>
              </thead>
              <tbody>
                {stats.bracketsBreakdown.map((b) => (
                  <tr key={b.bracket.id}>
                    <td className="border border-slate-300 px-2 py-1.5 font-mono font-bold" dir="ltr">
                      {b.bracket.label}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 font-mono tabular-nums font-semibold">
                      {b.count}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 font-mono tabular-nums">
                      {b.percentage.toFixed(1)}%
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-start">
                      {translateBracketAppreciation(b.bracket.appreciation, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'chart_distribution':
        if (template.styleConfig.chartType === 'none') return null;
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <div className="rounded border border-slate-200 bg-white p-3">
              {template.styleConfig.chartType === 'donut' ? (
                <DonutDistributionSvg stats={stats} accentColor={accent} labels={labels} />
              ) : (
                <BarChartSvg
                  stats={stats}
                  horizontal={template.styleConfig.chartType === 'horizontal-bar'}
                  accentColor={accent}
                  labels={labels}
                />
              )}
            </div>
          </div>
        );

      case 'top_and_struggling':
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded border border-slate-300 p-2.5">
                <h4 className="mb-1.5 font-bold text-emerald-800">
                  {labels.topStudentsTitle} (≥ {template.excellenceThreshold}/20) — {stats.topStudents.length}
                </h4>
                <p className="leading-relaxed text-slate-700">
                  {stats.topStudents.length > 0
                    ? stats.topStudents
                        .map((s) => `${s.fullName} (${s.score?.toFixed(2)})`)
                        .join(' · ')
                    : labels.noTopStudents}
                </p>
              </div>
              <div className="rounded border border-slate-300 p-2.5">
                <h4 className="mb-1.5 font-bold text-red-700">
                  {labels.strugglingStudentsTitle} (&lt; {template.passThreshold}/20) —{' '}
                  {stats.strugglingStudents.length}
                </h4>
                <p className="leading-relaxed text-slate-700">
                  {stats.strugglingStudents.length > 0
                    ? stats.strugglingStudents
                        .map((s) => `${s.fullName} (${s.score?.toFixed(2)})`)
                        .join(' · ')
                    : labels.noStrugglingStudents}
                </p>
              </div>
            </div>
          </div>
        );

      case 'pedagogical_diagnosis': {
        const hasStrengths = template.pedagogicalContent.strengths.length > 0;
        const hasWeaknesses = template.pedagogicalContent.weaknesses.length > 0;
        const remediationItems =
          template.pedagogicalContent.programmedRemediationBullets.length > 0
            ? template.pedagogicalContent.programmedRemediationBullets
            : [];
        const hasRemediation = remediationItems.length > 0;
        const activeCols =
          (hasStrengths ? 1 : 0) + (hasWeaknesses ? 1 : 0) + (hasRemediation ? 1 : 0);

        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <div
              className={`space-y-1.5 bg-white p-2 text-[10px] leading-snug ${
                isBannerStyle
                  ? 'rounded-b-md border border-t-0 border-slate-300'
                  : 'rounded border border-slate-300'
              }`}
            >
              {template.pedagogicalContent.generalObservation?.trim() && (
                <div className="rounded border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[10px] text-slate-800">
                  <span className="font-bold" style={{ color: accent }}>
                    {labels.generalObsLabel}{' '}
                  </span>
                  {template.pedagogicalContent.generalObservation.trim()}
                </div>
              )}

              {activeCols > 0 && (
                <div
                  className={`grid gap-2 ${
                    activeCols === 3
                      ? 'grid-cols-1 md:grid-cols-3'
                      : activeCols === 2
                      ? 'grid-cols-1 md:grid-cols-2'
                      : 'grid-cols-1'
                  }`}
                >
                  {hasStrengths && (
                    <div className="rounded border border-emerald-200/80 bg-emerald-50/30 p-1.5">
                      <h4 className="font-bold text-emerald-800">
                        {labels.strengthsTitle}
                      </h4>
                      <ul className="mt-0.5 list-disc space-y-0.5 ps-4 text-slate-800">
                        {template.pedagogicalContent.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasWeaknesses && (
                    <div className="rounded border border-red-200/80 bg-red-50/30 p-1.5">
                      <h4 className="font-bold text-red-700">
                        {labels.weaknessesTitle}
                      </h4>
                      <ul className="mt-0.5 list-disc space-y-0.5 ps-4 text-slate-800">
                        {template.pedagogicalContent.weaknesses.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasRemediation && (
                    <div className="rounded border border-blue-200/80 bg-blue-50/25 p-1.5">
                      <h4 className="font-bold" style={{ color: accent }}>
                        {labels.remediationBulletsTitle}
                      </h4>
                      <ul className="mt-0.5 list-disc space-y-0.5 ps-4 text-slate-800">
                        {remediationItems.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(template.pedagogicalContent.remediationNotes?.trim() ||
                metadata.remediationFormat?.trim()) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-teal-200 bg-teal-50/50 px-2.5 py-1 text-[9.5px] leading-snug text-slate-800">
                  {template.pedagogicalContent.remediationNotes?.trim() && (
                    <div>
                      <span className="font-bold text-teal-900">
                        {labels.remediationNotesLabel}{' '}
                      </span>
                      <span>{template.pedagogicalContent.remediationNotes.trim()}</span>
                    </div>
                  )}
                  {metadata.remediationFormat?.trim() && (
                    <div className="font-semibold text-teal-950">
                      <span className="font-bold">{labels.remediationFormatLabel} </span>
                      {metadata.remediationFormat.trim()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'remediation_plan':
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="font-bold" style={tableHeaderStyle}>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.targetGroupCol}</th>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.competenciesCol}</th>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.activityCol}</th>
                  <th className="border border-slate-300 px-2 py-1.5">{labels.timeframeCol}</th>
                </tr>
              </thead>
              <tbody>
                {template.pedagogicalContent.remediationActions.map((row, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 px-2 py-1.5 font-semibold">
                      {row.targetGroup}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5">{row.competencies}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{row.activity}</td>
                    <td className="border border-slate-300 px-2 py-1.5">{row.timeframe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'full_students_table':
        return (
          <div key={sec.id}>
            {renderSectionBanner(secTitle)}
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="font-bold" style={tableHeaderStyle}>
                  <th className="border border-slate-300 px-2 py-1 text-center w-12">{labels.colOrder}</th>
                  <th className="border border-slate-300 px-2 py-1">{labels.cardMassarCode.replace(/[:：]/g, '')}</th>
                  <th className="border border-slate-300 px-2 py-1">{labels.colStudentName}</th>
                  <th className="border border-slate-300 px-2 py-1 text-center">{labels.colScore20}</th>
                  <th className="border border-slate-300 px-2 py-1 text-center">{labels.colAppreciation}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, idx) => {
                  const appLabel = getLocalizedAppreciation(
                    st.score,
                    st.isAbsent || st.score === null,
                    template.passThreshold,
                    template.excellenceThreshold,
                    lang
                  );
                  return (
                    <tr key={st.id}>
                      <td className="border border-slate-300 px-2 py-1 text-center font-mono tabular-nums">
                        {st.order || idx + 1}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 font-mono tabular-nums">
                        {st.code}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 font-semibold">{st.fullName}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center font-mono font-bold tabular-nums">
                        {st.isAbsent || st.score === null ? labels.absentLabel : st.score.toFixed(2)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-center">
                        {appLabel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'custom_table':
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="font-bold" style={tableHeaderStyle}>
                  {(sec.columns || ['البند', 'المحتوى']).map((col, idx) => (
                    <th key={idx} className="border border-slate-300 px-2 py-1.5">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(sec.rows || [['—', '—']]).map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="border border-slate-300 px-2 py-1.5">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'custom_text':
        return (
          <div key={sec.id} className="avoid-break">
            {renderSectionBanner(secTitle)}
            <div className="rounded border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800">
              {sec.bodyText || sec.description || ''}
            </div>
          </div>
        );

      case 'signatures':
        return (
          <div
            key={sec.id}
            className="avoid-break mt-1 grid gap-2.5 pt-1 text-center text-[10px]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, template.signatures.length)}, minmax(0, 1fr))`,
            }}
          >
            {template.signatures.map((sig, i) => {
              const sigLabel =
                lang === 'ar'
                  ? sig.label
                  : i === 0
                  ? labels.sigTeacherLabel
                  : i === 1
                  ? labels.sigInspectorLabel
                  : labels.sigPrincipalLabel;
              const sigSub =
                lang === 'ar'
                  ? sig.sublabel
                  : i === 0
                  ? labels.sigTeacherSub
                  : i === 1
                  ? labels.sigInspectorSub
                  : labels.sigPrincipalSub;
              return (
                <div
                  key={sig.id}
                  className="flex min-h-[54px] flex-col justify-between rounded border border-slate-300 bg-slate-50/40 px-2 py-1.5"
                >
                  <div>
                    <div className="font-bold text-slate-800" style={{ color: accent }}>
                      {sigLabel}
                    </div>
                    {sigSub && (
                      <div className="text-[8.5px] text-slate-500">{sigSub}</div>
                    )}
                  </div>
                  {i === 0 ? (
                    <div className="mt-1 font-semibold text-slate-900">
                      {metadata.teacherName || '—'}
                    </div>
                  ) : (
                    <div className="mx-auto mt-3 w-28 border-b border-dotted border-slate-400" />
                  )}
                </div>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  const countryLineDisplay =
    lang === 'ar' ? template.headerConfig.countryLine || labels.countryLine : labels.countryLine;
  const ministryLineDisplay =
    lang === 'ar' ? template.headerConfig.ministryLine || labels.ministryLine : labels.ministryLine;
  const reportSubtitleDisplay =
    lang === 'ar' ? template.headerConfig.reportSubtitle : labels.defaultReportSubtitle;

  const renderPage1Header = () => {
    if (template.headerConfig.layout === 'centered') {
      return (
        <header className="border-b-2 pb-1.5 text-center" style={{ borderColor: accent }}>
          <p className="text-xs font-bold text-slate-800">{countryLineDisplay}</p>
          <p className="text-[10.5px] font-semibold text-slate-700">{ministryLineDisplay}</p>
          <p className="text-[10px] text-slate-600">
            {[metadata.academy, metadata.directorate, metadata.school].filter(Boolean).join(' · ') || '—'}
          </p>
          <h1 className="mt-1 text-base font-extrabold" style={{ color: accent }}>
            {reportTitleDisplay} ({metadata.examNumber} — {metadata.semester})
          </h1>
          {reportSubtitleDisplay && (
            <p className="mt-0.5 text-[9.5px] text-slate-600">
              {reportSubtitleDisplay}
            </p>
          )}
        </header>
      );
    }

    return (
      <header className="space-y-1">
        <div
          className="grid grid-cols-12 items-start gap-2 border-b-2 pb-1.5 text-[10px] leading-snug"
          style={{ borderColor: accent }}
        >
          <div className="col-span-5 text-start">
            <div className="font-bold text-slate-900">{countryLineDisplay}</div>
            <div className="font-semibold text-slate-800">
              {ministryLineDisplay}
            </div>
            {metadata.academy && <div className="text-slate-700">{metadata.academy}</div>}
            {metadata.directorate && <div className="text-slate-700">{metadata.directorate}</div>}
            <div className="font-bold text-slate-900">
              {labels.schoolLabel}: {metadata.school || '—'}
            </div>
          </div>

          <div className="col-span-4 pt-0.5 text-center">
            <div className="font-bold" style={{ color: accent }}>
              {metadata.subject ? `${labels.subjectPrefix} ${metadata.subject}` : reportTitleDisplay}
              {metadata.cycle ? ` · ${metadata.cycle}` : ''}
            </div>
            {metadata.level && (
              <div className="text-[9.5px] font-semibold text-slate-700">
                {labels.levelLabel}: {metadata.level}
              </div>
            )}
            <div className="mt-0.5 font-mono text-[9.5px] font-semibold text-slate-700">
              {labels.schoolYearLabel}: {metadata.schoolYear || '—'}
            </div>
          </div>

          <div className="col-span-3 text-end text-[9.5px]">
            {template.headerConfig.includeFrenchHeader && lang === 'ar' ? (
              <div dir="ltr" className="text-left leading-snug text-slate-700">
                <div className="font-bold text-slate-900">Royaume du Maroc</div>
                <div>
                  Ministère de l&apos;Éducation Nationale, du Préscolaire et des Sports
                </div>
                <div>Matière : {metadata.subject || '—'}</div>
                <div>Classe : {metadata.className || '—'}</div>
              </div>
            ) : (
              <div className="text-end">
                <div className="font-bold text-slate-900">
                  {labels.subjectPrefix} {metadata.subject || '—'} · {labels.classLabel}: {metadata.className || '—'}
                </div>
                <div className="text-slate-700">
                  {labels.teacherLabel}: {metadata.teacherName || '—'}
                </div>
                <div className="mt-0.5 text-[9px] font-semibold text-slate-500">
                  {labels.memoRefLabel}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-[15px] font-extrabold" style={{ color: accent }}>
            {reportTitleDisplay} — {metadata.examNumber} ({metadata.semester})
          </h1>
          {reportSubtitleDisplay && (
            <p className="mt-0.5 text-[9.5px] text-slate-600">
              {reportSubtitleDisplay}
            </p>
          )}
        </div>
      </header>
    );
  };

  const renderPage2 = () => {
    const hasDualRoster = page2Sections.some((s) => s.type === 'dual_roster_merit');
    const studentCount = Math.max(1, students.length);
    const hasThresholdDivider = stats.rankedStudents.some((st, idx) => {
      if (idx === 0) return false;
      const isAbsent = st.isAbsent || st.score === null;
      const effectiveScore = isAbsent ? 0 : (st.score ?? 0);
      const isPass = !isAbsent && effectiveScore >= template.passThreshold;
      const prevSt = stats.rankedStudents[idx - 1];
      const prevIsPass =
        prevSt &&
        !prevSt.isAbsent &&
        prevSt.score !== null &&
        prevSt.score >= template.passThreshold;
      return Boolean(prevIsPass && !isPass);
    });

    const meritTotalRows = studentCount + (hasThresholdDivider ? 1 : 0);
    const isDensePage2 = studentCount > 35;
    const isUltraDensePage2 = studentCount > 41;

    // Table header overhead: 22px banner + 20px thead + 2px borders = 44px
    const tableHeaderOverheadPx = 44;
    const fallbackTotalRosterPx = isUltraDensePage2
      ? 756
      : isDensePage2
      ? 736
      : 712;
    const effectiveRosterHeightPx = measuredRosterHeightPx ?? fallbackTotalRosterPx;
    const availableBodyPx = Math.max(240, effectiveRosterHeightPx - tableHeaderOverheadPx);

    const meritRowHeightPx = Math.max(
      12.5,
      Math.min(30, Math.floor(((availableBodyPx - 1) / Math.max(1, meritTotalRows)) * 10) / 10)
    );
    const seqRowHeightPx = Math.max(
      12.5,
      Math.min(30, Math.floor(((availableBodyPx - 1) / Math.max(1, studentCount)) * 10) / 10)
    );

    const fontSizePx =
      meritRowHeightPx >= 24.5
        ? 10.2
        : meritRowHeightPx >= 21
        ? 9.5
        : meritRowHeightPx >= 17.5
        ? 8.8
        : meritRowHeightPx >= 14.8
        ? 8.1
        : 7.3;

    const appreciationFontSizePx = Math.max(6.7, Math.round((fontSizePx - 0.8) * 10) / 10);

    return (
      <article
        dir={labels.dir}
        className={`report-sheet mx-auto mt-8 flex w-[210mm] flex-col justify-between overflow-hidden bg-white ${
          isUltraDensePage2 ? 'p-[5mm]' : isDensePage2 ? 'p-[6.5mm]' : 'p-[8mm]'
        } text-slate-900 shadow-sm print:mt-0 print:shadow-none ${fontClass}`}
        style={{
          border: template.styleConfig.showOuterFrame
            ? `${isDoubleBorder ? '4px double' : '1px solid'} ${accent}`
            : undefined,
        }}
      >
        {/* Top Zone: Page 2 Compact Header */}
        <header className="shrink-0 border-b-2 pb-1" style={{ borderColor: accent }}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-slate-700">
            <span className="font-bold text-slate-900">
              {countryLineDisplay} · {ministryLineDisplay}
              {metadata.school ? ` · ${metadata.school}` : ''}
            </span>
            <span className="font-bold" style={{ color: accent }}>
              {metadata.subject ? `${labels.subjectPrefix} ${metadata.subject} · ` : ''}
              {metadata.level || metadata.cycle}{' '}
              {metadata.schoolYear ? `(${metadata.schoolYear})` : ''}
            </span>
            <span className="font-semibold text-slate-900">
              {labels.teacherLabel}: {metadata.teacherName || '—'}
            </span>
          </div>

          <h2
            className="mt-0.5 text-center text-[13px] font-extrabold"
            style={{ color: accent }}
          >
            {labels.appendixPrefix} {metadata.examNumber} ({metadata.semester}):{' '}
            {lang === 'ar'
              ? template.headerConfig.appendixTitle || labels.defaultAppendixTitle
              : labels.defaultAppendixTitle}
          </h2>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[9.5px] font-semibold">
            <span>{labels.classLabel}: {metadata.className || '—'}</span>
            <span>{labels.metaExamDate} {metadata.examDate || '—'}</span>
            <span className="font-mono tabular-nums">{labels.kpiEnrolled}: {stats.total}</span>
            <span className="font-mono tabular-nums">{labels.kpiPresent}: {stats.present}</span>
            <span className="font-mono tabular-nums">{labels.kpiAbsent}: {stats.absent}</span>
            <span className="font-mono tabular-nums" style={{ color: accent }}>
              {labels.kpiAverage}: {stats.average.toFixed(2)} / 20
            </span>
            <span className="font-mono tabular-nums text-emerald-700">
              {labels.kpiMastered}: {stats.passRate.toFixed(0)}%
            </span>
          </div>
        </header>

        {/* Middle Zone: Proportional Dual Roster with an exact 2mm bottom gap before the report continuation */}
        {hasDualRoster && (
          <div
            ref={page2RosterWrapRef}
            className="relative mt-[1.5mm] mb-[2mm] flex-1 min-h-0"
          >
            <div className="absolute inset-0 grid grid-cols-12 gap-2.5 items-stretch overflow-hidden">
              {/* Sequential Order Table */}
              <div className="col-span-5 flex h-full flex-col min-h-0">
                <div
                  className="flex h-[22px] shrink-0 items-center rounded-t px-2 text-[9.5px] font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {labels.seqRosterTitle}
                </div>
                <table
                  className="h-full w-full flex-1 border-collapse"
                  style={{ fontSize: `${fontSizePx}px`, lineHeight: 1.1 }}
                >
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800" style={{ height: '20px' }}>
                      <th className="w-8 border border-slate-300 px-1 py-0 text-center">{labels.colOrder}</th>
                      <th className="border border-slate-300 px-1.5 py-0 text-start">{labels.colStudentName}</th>
                      <th className="w-14 border border-slate-300 px-1 py-0 text-center">
                        {labels.colScore20}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st, idx) => {
                      const isPass =
                        !st.isAbsent && st.score !== null && st.score >= template.passThreshold;
                      return (
                        <tr
                          key={st.id}
                          className="even:bg-slate-50/70"
                          style={{ height: `${seqRowHeightPx}px` }}
                        >
                          <td className="border border-slate-300 px-1 py-0 text-center font-mono tabular-nums text-slate-600">
                            {st.order || idx + 1}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-0 font-semibold text-slate-900">
                            {st.fullName}
                          </td>
                          <td
                            className={`border border-slate-300 px-1 py-0 text-center font-mono font-bold tabular-nums ${
                              st.isAbsent || st.score === null
                                ? 'text-slate-400'
                                : isPass
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            {st.isAbsent || st.score === null ? labels.absentLabel : st.score.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Merit Ranking Table */}
              <div className="col-span-7 flex h-full flex-col min-h-0">
                <div
                  className="flex h-[22px] shrink-0 items-center rounded-t px-2 text-[9.5px] font-bold text-white"
                  style={{ backgroundColor: secondaryAccent }}
                >
                  {labels.meritRosterTitle}
                </div>
                <table
                  className="h-full w-full flex-1 border-collapse"
                  style={{ fontSize: `${fontSizePx}px`, lineHeight: 1.1 }}
                >
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800" style={{ height: '20px' }}>
                      <th className="w-9 border border-slate-300 px-1 py-0 text-center">
                        {labels.colRank}
                      </th>
                      <th className="border border-slate-300 px-1.5 py-0 text-start">{labels.colStudentName}</th>
                      <th className="w-13 border border-slate-300 px-1 py-0 text-center">{labels.colScoreShort}</th>
                      <th className="w-28 border border-slate-300 px-1.5 py-0 text-center">{labels.colAppreciation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.rankedStudents.map((st, idx) => {
                      const isAbsent = st.isAbsent || st.score === null;
                      const effectiveScore = isAbsent ? 0 : (st.score ?? 0);
                      const app = getStudentAppreciation(
                        st.score,
                        isAbsent,
                        template.passThreshold,
                        template.excellenceThreshold
                      );
                      const appLocalized = getLocalizedAppreciation(
                        st.score,
                        isAbsent,
                        template.passThreshold,
                        template.excellenceThreshold,
                        lang
                      );
                      const isPass = !isAbsent && effectiveScore >= template.passThreshold;

                      const prevSt = idx > 0 ? stats.rankedStudents[idx - 1] : null;
                      const prevIsPass =
                        prevSt &&
                        !prevSt.isAbsent &&
                        prevSt.score !== null &&
                        prevSt.score >= template.passThreshold;
                      const showThresholdDivider = idx > 0 && prevIsPass && !isPass;

                      return (
                        <React.Fragment key={st.id}>
                          {showThresholdDivider && (
                            <tr
                              className="bg-red-50/90"
                              style={{ height: `${meritRowHeightPx}px` }}
                            >
                              <td
                                colSpan={4}
                                className="border border-red-300 px-2 py-0 text-center text-[8px] font-extrabold text-red-800"
                              >
                                {labels.thresholdCutLine(template.passThreshold)}
                              </td>
                            </tr>
                          )}
                          <tr
                            className="even:bg-slate-50/70"
                            style={{ height: `${meritRowHeightPx}px` }}
                          >
                            <td
                              className={`border border-slate-300 px-1 py-0 text-center font-mono font-bold tabular-nums ${
                                idx < 3 && !isAbsent ? 'bg-teal-50/70 text-teal-800' : 'text-slate-700'
                              }`}
                            >
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 px-1.5 py-0 font-semibold text-slate-900">
                              {st.fullName}
                            </td>
                            <td
                              className={`border border-slate-300 px-1 py-0 text-center font-mono font-bold tabular-nums ${
                                isAbsent
                                  ? 'bg-amber-50/50 text-amber-800'
                                  : isPass
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                              }`}
                            >
                              {effectiveScore.toFixed(2)}
                            </td>
                            <td
                              className="border border-slate-300 px-1.5 py-0 text-center font-medium text-slate-700 whitespace-nowrap"
                              style={{ fontSize: `${appreciationFontSizePx}px` }}
                            >
                              {lang === 'ar' ? `${app.ar} (${app.fr})` : appLocalized}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Zone: Need Groups + Attendance + Signatures + Footer */}
        <div className="shrink-0 space-y-1.5">
          {/* Pedagogical Need Groups Summary Strip */}
          <div className="avoid-break grid grid-cols-3 divide-x rtl:divide-x-reverse divide-slate-200 rounded border border-slate-300 bg-slate-50/70 text-center text-[9px]">
            <div className="px-2 py-1">
              <div className="font-bold text-emerald-800">
                {labels.needGroupExcellence} (≥{template.excellenceThreshold}/20):{' '}
                <span className="font-mono">
                  {docimology.enrichmentCount} {labels.studentShort} ({docimology.enrichmentPct.toFixed(0)}%)
                </span>
              </div>
              <div className="text-[8.5px] text-slate-600">
                {labels.needGroupExcellenceSub}
              </div>
            </div>
            <div className="px-2 py-1">
              <div className="font-bold text-blue-800">
                {labels.needGroupConsolidation} ({template.passThreshold} - {(template.excellenceThreshold - 0.01).toFixed(2)}):{' '}
                <span className="font-mono">
                  {docimology.consolidationCount} {labels.studentShort} ({docimology.consolidationPct.toFixed(0)}%)
                </span>
              </div>
              <div className="text-[8.5px] text-slate-600">
                {labels.needGroupConsolidationSub}
              </div>
            </div>
            <div className="px-2 py-1">
              <div className="font-bold text-red-700">
                {labels.needGroupRemediation} (&lt;{template.passThreshold}/20):{' '}
                <span className="font-mono">
                  {docimology.remediationCount} {labels.studentShort} ({docimology.remediationPct.toFixed(0)}%)
                </span>
              </div>
              <div className="text-[8.5px] text-slate-600">
                {labels.needGroupRemediationSub}
              </div>
            </div>
          </div>

          {/* Attendance Banner */}
          <div
            className={`avoid-break rounded border px-2.5 py-0.5 text-center text-[9.5px] font-semibold ${
              stats.absent === 0
                ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800'
                : 'border-amber-300 bg-amber-50/70 text-amber-900'
            }`}
          >
            {stats.absent === 0
              ? labels.attendancePerfect
              : `${labels.attendanceAbsentPrefix} ${stats.absent} (${stats.absentStudents
                  .map((a) =>
                    a.observation
                      ? `#${a.order} ${a.fullName} (${a.observation})`
                      : `#${a.order} ${a.fullName}`
                  )
                  .join(' · ')})`}
          </div>

          {/* Page 2 Certification Signatures */}
          <div
            className="avoid-break grid gap-2.5 text-center text-[9.5px]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, template.signatures.length)}, minmax(0, 1fr))`,
            }}
          >
            {template.signatures.map((sig, i) => {
              const sigLabel =
                lang === 'ar'
                  ? sig.label.replace(':', '')
                  : (i === 0
                      ? labels.sigTeacherLabel
                      : i === 1
                      ? labels.sigInspectorLabel
                      : labels.sigPrincipalLabel
                    ).replace(':', '');
              const sigPage2Sub =
                lang === 'ar'
                  ? sig.page2Sublabel
                  : i === 0
                  ? labels.sigTeacherPage2Sub
                  : i === 1
                  ? labels.sigInspectorPage2Sub
                  : labels.sigPrincipalPage2Sub;
              return (
                <div
                  key={sig.id}
                  className={`flex ${
                    isUltraDensePage2
                      ? 'min-h-[38px] p-1'
                      : isDensePage2
                      ? 'min-h-[45px] p-1'
                      : 'min-h-[54px] p-1.5'
                  } flex-col justify-between rounded border border-slate-300 bg-slate-50/40`}
                >
                  <div>
                    <div className="font-bold" style={{ color: accent }}>
                      {sigLabel}
                    </div>
                    {sigPage2Sub && (
                      <div className="mt-0.5 text-[8.5px] text-slate-600">{sigPage2Sub}</div>
                    )}
                  </div>
                  {i === 0 ? (
                    <div className="mt-1">
                      <div className="font-bold text-slate-900">{metadata.teacherName || '—'}</div>
                      <div className="font-mono text-[8.5px] text-slate-600">
                        {labels.dateLabel} {metadata.correctionDate || '—'}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[8.5px] text-slate-500">
                      <div className="mx-auto mb-0.5 w-28 border-b border-dotted border-slate-400" />
                      {lang === 'ar'
                        ? sig.page2Footer ||
                          (i === template.signatures.length - 1
                            ? `${labels.schoolLabel}: ${metadata.school || '—'}`
                            : '')
                        : i === template.signatures.length - 1
                        ? `${labels.schoolLabel}: ${metadata.school || '—'}`
                        : labels.sigInspectorFooter}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <footer className="flex items-center justify-between border-t border-slate-200 pt-1 text-[8.5px] text-slate-500">
            <span>
              {[
                labels.footerBrand,
                labels.footerCompliance,
                `${labels.footerAppendixPrefix} ${metadata.examNumber}${metadata.className ? ` (${metadata.className})` : ''}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <span className="font-mono tabular-nums">
              {labels.pageOfTotal(reportStartPage + 1, totalPages)}
            </span>
          </footer>
        </div>
      </article>
    );
  };

  if (documentMode === 'cards') {
    return (
      <div className="space-y-8 print:space-y-0">
        <IndividualRemediationCardsSheet
          template={template}
          metadata={metadata}
          stats={stats}
          students={students}
          itemDefinitions={itemDefinitions}
          studentItemScores={studentItemScores}
          startPageNumber={1}
          totalDocumentPages={remediationSheetsCount}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 print:space-y-0">
      {isInspection && (
        <InspectionCoverSheet
          template={template}
          metadata={metadata}
          stats={stats}
          tocEntries={inspectionTocEntries}
          totalPages={totalPages}
        />
      )}

      <article
        ref={page1SheetRef}
        dir={labels.dir}
        className={`report-sheet mx-auto ${isInspection ? 'mt-8 print:mt-0' : ''} flex w-[210mm] flex-col justify-between overflow-hidden bg-white ${
          isPage1Tight ? 'p-[6.5mm]' : 'p-[8mm]'
        } text-slate-900 shadow-sm print:shadow-none ${fontClass} ${scaleBodyClass}`}
        style={{
          border: template.styleConfig.showOuterFrame
            ? `${isDoubleBorder ? '4px double' : '1px solid'} ${accent}`
            : undefined,
        }}
      >
        <div className={`flex flex-1 flex-col justify-between ${isPage1Tight ? 'gap-1' : 'gap-1.5'}`}>
          {renderPage1Header()}
          {page1Sections.map((sec) => renderSectionBody(sec))}
        </div>

        <footer className="mt-1.5 flex items-center justify-between border-t border-slate-200 pt-1 text-[9px] text-slate-500">
          <span>
            {[
              labels.footerBrand,
              labels.footerCompliance,
              `${labels.footerReportPrefix} ${metadata.examNumber}${metadata.className ? ` (${metadata.className})` : ''}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className="font-mono tabular-nums">
            {labels.pageOfTotal(reportStartPage, totalPages)}
          </span>
        </footer>
      </article>

      {hasPage2 && renderPage2()}

      {hasItemMatrixSheet && (
        <ItemMatrixReportSheet
          template={template}
          metadata={metadata}
          students={students}
          itemDefinitions={itemDefinitions}
          studentItemScores={studentItemScores}
          pageNumber={matrixStartPage}
          totalPages={totalPages}
        />
      )}

      {hasLongitudinalSheet && (
        <LongitudinalSummaryReportSheet
          template={template}
          metadata={metadata}
          cohortProjects={cohortProjects}
          pageNumber={longitudinalStartPage}
          totalPages={totalPages}
        />
      )}

      {hasPostImpactSheet && (
        <PostRemediationImpactReportSheet
          template={template}
          metadata={metadata}
          impact={postImpact}
          pageNumber={postImpactStartPage}
          totalPages={totalPages}
        />
      )}

      {attachmentPages.map((imgSrc, idx) => {
        const pageNumber = attachmentStartPage + idx;
        return (
          <article
            key={`exam-attachment-${idx}`}
            dir={labels.dir}
            className={`report-sheet mx-auto mt-8 flex w-[210mm] flex-col justify-between bg-white p-[8.5mm] text-slate-900 shadow-sm print:mt-0 print:shadow-none ${fontClass}`}
            style={{
              border: template.styleConfig.showOuterFrame
                ? `${isDoubleBorder ? '4px double' : '1px solid'} ${accent}`
                : undefined,
            }}
          >
            <div className="flex flex-1 flex-col min-h-0">
              <div
                className="flex items-center justify-between border-b-2 pb-1.5 text-[10px]"
                style={{ borderColor: accent }}
              >
                <span className="font-extrabold" style={{ color: accent }}>
                  {labels.appendixPrefix} ({idx + 1} / {attachmentPages.length})
                </span>
                <span className="font-semibold text-slate-700">
                  {metadata.subject ? `${labels.subjectPrefix} ${metadata.subject} · ` : ''}
                  {metadata.className ? `${labels.classLabel} ${metadata.className} · ` : ''}
                  {metadata.examNumber}
                </span>
              </div>

              <div className="mt-2 flex flex-1 items-center justify-center overflow-hidden rounded border border-slate-200 bg-white p-1.5">
                <img
                  src={imgSrc}
                  alt={`${examAttachment?.fileName || 'Exam'} - ${idx + 1}`}
                  className="max-h-[256mm] w-full object-contain"
                />
              </div>
            </div>

            <footer className="mt-2 flex items-center justify-between border-t border-slate-200 pt-1.5 text-[9px] text-slate-500">
              <span>
                {[labels.footerBrand, examAttachment?.fileName || '']
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span className="font-mono tabular-nums">
                {labels.pageOfTotal(pageNumber, totalPages)}
              </span>
            </footer>
          </article>
        );
      })}

      {showRemediationCards && remediationSheetsCount > 0 && (
        <IndividualRemediationCardsSheet
          template={template}
          metadata={metadata}
          stats={stats}
          students={students}
          itemDefinitions={itemDefinitions}
          studentItemScores={studentItemScores}
          startPageNumber={cardsStartPage}
          totalDocumentPages={totalPages}
        />
      )}
    </div>
  );
};
