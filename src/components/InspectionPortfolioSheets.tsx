import React from 'react';
import { getReportFontClass } from '../data/presets';
import { getReportLabels } from '../data/reportI18n';
import {
  ArchivedClassProject,
  ComputedStats,
  ExamItemDefinition,
  MassarMetadata,
  PostRemediationImpactSummary,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import {
  computeItemMatrixStats,
  computeLongitudinalComparison,
} from '../utils/pedagogicalAnalytics';
import { ReportSheetFrame } from './ReportSheetFrame';

export interface InspectionTocEntry {
  index: number;
  title: string;
  subtitle: string;
  startPage: number;
  pageCount: number;
}

interface InspectionCoverSheetProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  stats: ComputedStats;
  tocEntries: InspectionTocEntry[];
  totalPages: number;
}

export const InspectionCoverSheet: React.FC<InspectionCoverSheetProps> = ({
  template,
  metadata,
  stats,
  tocEntries,
  totalPages,
}) => {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const accent = template.styleConfig.accentColor || '#1e3a8a';
  const secondary = template.styleConfig.secondaryAccent || '#0f766e';
  const fontClass = getReportFontClass(template.styleConfig.fontFamily);

  return (
    <ReportSheetFrame
      styleConfig={template.styleConfig}
      dir={labels.dir}
      className={fontClass}
      innerPaddingClass="p-[5.5mm]"
    >
      <div className="space-y-4">
        {/* Institutional Header */}
        <header
          className="flex items-start justify-between border-b-2 pb-3 text-[11px]"
          style={{ borderColor: accent }}
        >
          <div className="space-y-0.5">
            <div className="font-extrabold text-slate-900">{labels.countryLine}</div>
            <div className="font-bold text-slate-800">
              {template.headerConfig.ministryLine || labels.ministryLine}
            </div>
            {metadata.academy && <div className="text-slate-700">{metadata.academy}</div>}
            {metadata.directorate && <div className="text-slate-700">{metadata.directorate}</div>}
            <div className="font-bold text-slate-900">
              {labels.schoolLabel}: {metadata.school || '—'}
            </div>
          </div>

          <div className="text-end space-y-0.5">
            <div className="font-bold" style={{ color: accent }}>
              {labels.schoolYearLabel}: {metadata.schoolYear || '—'}
            </div>
            <div className="font-semibold text-slate-800">
              {labels.subjectPrefix} {metadata.subject || '—'}
            </div>
            <div className="font-semibold text-slate-700">
              {labels.classLabel}: {metadata.className || '—'}
              {metadata.level ? ` (${metadata.level})` : ''}
            </div>
            <div className="text-slate-700">
              {labels.teacherLabel}: {metadata.teacherName || '—'}
            </div>
          </div>
        </header>

        {/* Central Portfolio Title Banner */}
        <div
          className="rounded-lg border-2 px-6 py-5 text-center"
          style={{ borderColor: accent, backgroundColor: `${accent}08` }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: secondary }}>
            {labels.memoRefLabel}
          </div>
          <h1 className="mt-1.5 text-xl font-extrabold" style={{ color: accent }}>
            {labels.inspectionCoverTitle}
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {labels.inspectionCoverSubtitle}
          </p>
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-800">
            <span>{metadata.examNumber}</span>
            <span className="text-slate-400">·</span>
            <span>{metadata.semester}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono tabular-nums">
              {stats.average.toFixed(2)}/20 ({stats.passRate.toFixed(0)}%)
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-mono tabular-nums">
              {totalPages}{' '}
              {lang === 'fr' ? 'pages' : lang === 'en' ? 'pages' : 'صفحات A4'}
            </span>
          </div>
        </div>

        {/* Table of Contents (Index) */}
        <section>
          <h2
            className="mb-2 rounded-t px-3 py-1.5 text-xs font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {labels.inspectionTocTitle}
          </h2>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="w-10 border border-slate-300 px-2 py-1.5 text-center">#</th>
                <th className="border border-slate-300 px-2.5 py-1.5 text-start">
                  {lang === 'fr' ? 'Pièce constitutive du dossier' : lang === 'en' ? 'Portfolio Document' : 'الوثيقة التربوية المدرجة'}
                </th>
                <th className="w-28 border border-slate-300 px-2 py-1.5 text-center">
                  {lang === 'fr' ? 'Pages' : lang === 'en' ? 'Pages' : 'أرقام الصفحات'}
                </th>
                <th className="w-24 border border-slate-300 px-2 py-1.5 text-center">
                  {lang === 'fr' ? 'Nb. feuilles' : lang === 'en' ? 'Sheets' : 'عدد الصفحات'}
                </th>
              </tr>
            </thead>
            <tbody>
              {tocEntries.map((entry) => {
                const endPage = entry.startPage + entry.pageCount - 1;
                const pageRange =
                  entry.pageCount > 1
                    ? `${entry.startPage} – ${endPage}`
                    : `${entry.startPage}`;
                return (
                  <tr key={entry.index} className="even:bg-slate-50/60">
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold text-slate-700">
                      0{entry.index}
                    </td>
                    <td className="border border-slate-300 px-2.5 py-1.5">
                      <div className="font-bold text-slate-900">{entry.title}</div>
                      <div className="text-[10.5px] text-slate-500">{entry.subtitle}</div>
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold tabular-nums text-slate-800">
                      {pageRange}
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono tabular-nums text-slate-700">
                      {entry.pageCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Compliance Verification Block */}
        <section className="rounded-lg border border-slate-300 bg-slate-50/70 p-3.5 text-xs">
          <div className="mb-2 font-bold" style={{ color: accent }}>
            {labels.inspectionChecklistTitle}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-800">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-xs border border-slate-500 bg-white" />
              <span>
                {lang === 'fr'
                  ? 'Conformité aux cadres référentiels et note ministérielle'
                  : lang === 'en'
                  ? 'Aligned with National Assessment Framework'
                  : 'مطابقة موضوع الفرض للإطار المرجعي ومذكرة التقويم'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-xs border border-slate-500 bg-white" />
              <span>
                {lang === 'fr'
                  ? 'Exactitude du relevé de notes et classement Massar'
                  : lang === 'en'
                  ? 'Massar grade roster verified and reconciled'
                  : 'مطابقة كشف النقط الرسمي مع منظومة مسار'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-xs border border-slate-500 bg-white" />
              <span>
                {lang === 'fr'
                  ? 'Programmation des séances de remédiation ciblées'
                  : lang === 'en'
                  ? 'Targeted remediation plan scheduled'
                  : 'برمجة حصص الدعم والمعالجة لفئات الحاجة المرصودة'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-xs border border-slate-500 bg-white" />
              <span>
                {lang === 'fr'
                  ? 'Archivage de l’épreuve originale et fiches individuelles'
                  : lang === 'en'
                  ? 'Original exam paper & individual cards enclosed'
                  : 'تضمين نسخة الموضوع الأصلي وبطاقات الدعم الفردية'}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Signatures + Footer */}
      <div className="space-y-3">
        <div
          className="grid gap-3 text-center text-[10px]"
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
                className="flex min-h-[64px] flex-col justify-between rounded border border-slate-300 bg-slate-50/40 px-2.5 py-2"
              >
                <div>
                  <div className="font-bold" style={{ color: accent }}>
                    {sigLabel}
                  </div>
                  {sigSub && (
                    <div className="text-[9px] text-slate-500">{sigSub}</div>
                  )}
                </div>
                {i === 0 ? (
                  <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
                    <div className="min-w-0 text-start">
                      <div className="truncate font-bold text-slate-900">
                        {metadata.teacherName || '—'}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-center">
                      {(template.headerConfig.teacherSignatureMode || 'manual') === 'image' ? (
                        template.headerConfig.teacherSignatureImage ? (
                          <img
                            src={template.headerConfig.teacherSignatureImage}
                            alt="توقيع الأستاذ"
                            className="max-h-11 max-w-[120px] object-contain"
                          />
                        ) : (
                          <div className="w-20 border-b border-dotted border-slate-400 pt-3" />
                        )
                      ) : template.headerConfig.teacherSignatureText?.trim() ? (
                        <div
                          className="font-serif text-[11.5px] font-bold italic leading-tight"
                          style={{ color: accent }}
                        >
                          {template.headerConfig.teacherSignatureText.trim()}
                        </div>
                      ) : (
                        <div className="w-20 border-b border-dotted border-slate-400 pt-3" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto mt-4 w-28 border-b border-dotted border-slate-400" />
                )}
              </div>
            );
          })}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 pt-1.5 text-[9px] text-slate-500">
          <span>
            {labels.footerBrand} · {labels.footerCompliance}
          </span>
          <span className="font-mono tabular-nums">{labels.pageOfTotal(1, totalPages)}</span>
        </footer>
      </div>
    </ReportSheetFrame>
  );
};

interface ItemMatrixReportSheetProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  students: StudentRecord[];
  itemDefinitions: ExamItemDefinition[];
  studentItemScores: StudentItemScores;
  pageNumber: number;
  totalPages: number;
}

export const ItemMatrixReportSheet: React.FC<ItemMatrixReportSheetProps> = ({
  template,
  metadata,
  students,
  itemDefinitions,
  studentItemScores,
  pageNumber,
  totalPages,
}) => {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const accent = template.styleConfig.accentColor || '#1e3a8a';
  const fontClass = getReportFontClass(template.styleConfig.fontFamily);
  const itemStats = computeItemMatrixStats(students, itemDefinitions, studentItemScores, 50);

  return (
    <ReportSheetFrame
      styleConfig={template.styleConfig}
      dir={labels.dir}
      className={`mt-8 print:mt-0 ${fontClass}`}
      innerPaddingClass="p-[5mm]"
    >
      <div className="space-y-4">
        <header
          className="flex items-center justify-between border-b-2 pb-2 text-[10.5px]"
          style={{ borderColor: accent }}
        >
          <div>
            <div className="font-extrabold" style={{ color: accent }}>
              {labels.itemMatrixTitle}
            </div>
            <div className="text-slate-600">{labels.itemMatrixSub}</div>
          </div>
          <div className="text-end font-semibold text-slate-700">
            <div>
              {metadata.subject || '—'} · {labels.classLabel} {metadata.className || '—'}
            </div>
            <div>{metadata.examNumber}</div>
          </div>
        </header>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr
              className="font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              <th className="border border-slate-300 px-2.5 py-2 text-start">
                {labels.itemColExercise}
              </th>
              <th className="border border-slate-300 px-2.5 py-2 text-start">
                {labels.itemColCompetency}
              </th>
              <th className="border border-slate-300 px-2 py-2 text-center w-16">
                {labels.itemColMaxScore}
              </th>
              <th className="border border-slate-300 px-2 py-2 text-center w-24">
                {labels.itemColAvgScore}
              </th>
              <th className="border border-slate-300 px-2 py-2 text-center w-24">
                {labels.itemColMasteryRate}
              </th>
              <th className="border border-slate-300 px-2 py-2 text-center w-36">
                {labels.itemColStatus}
              </th>
            </tr>
          </thead>
          <tbody>
            {itemStats.map((st) => {
              const statusText =
                st.status === 'mastered'
                  ? labels.itemStatusMastered
                  : st.status === 'partial'
                  ? labels.itemStatusPartial
                  : labels.itemStatusCritical;
              const statusColor =
                st.status === 'mastered'
                  ? '#15803d'
                  : st.status === 'partial'
                  ? '#b45309'
                  : '#b91c1c';
              return (
                <tr key={st.item.id} className="even:bg-slate-50/70">
                  <td className="border border-slate-300 px-2.5 py-2 font-bold text-slate-900">
                    {st.item.label}
                  </td>
                  <td className="border border-slate-300 px-2.5 py-2 text-slate-800">
                    <div>{st.item.competency || '—'}</div>
                    {st.item.remediationTask && (
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {st.item.remediationTask}
                      </div>
                    )}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold tabular-nums">
                    {st.item.maxScore}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold tabular-nums">
                    {st.averageScore.toFixed(2)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-mono font-extrabold tabular-nums">
                    <div style={{ color: statusColor }}>{st.masteryRate.toFixed(1)}%</div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, st.masteryRate)}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                    </div>
                  </td>
                  <td
                    className="border border-slate-300 px-2 py-2 text-center text-[11px] font-bold"
                    style={{ color: statusColor }}
                  >
                    {statusText}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <footer className="mt-4 flex items-center justify-between border-t border-slate-200 pt-1.5 text-[9px] text-slate-500">
        <span>
          {labels.footerBrand} · {labels.itemMatrixTitle}
        </span>
        <span className="font-mono tabular-nums">{labels.pageOfTotal(pageNumber, totalPages)}</span>
      </footer>
    </ReportSheetFrame>
  );
};

interface LongitudinalSummaryReportSheetProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  cohortProjects: ArchivedClassProject[];
  pageNumber: number;
  totalPages: number;
}

export const LongitudinalSummaryReportSheet: React.FC<LongitudinalSummaryReportSheetProps> = ({
  template,
  metadata,
  cohortProjects,
  pageNumber,
  totalPages,
}) => {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const accent = template.styleConfig.accentColor || '#1e3a8a';
  const fontClass = getReportFontClass(template.styleConfig.fontFamily);
  const result = computeLongitudinalComparison(
    cohortProjects,
    template.passThreshold
  );

  return (
    <ReportSheetFrame
      styleConfig={template.styleConfig}
      dir={labels.dir}
      className={`mt-8 print:mt-0 ${fontClass}`}
      innerPaddingClass="p-[5mm]"
    >
      <div className="space-y-4">
        <header
          className="flex items-center justify-between border-b-2 pb-2 text-[10.5px]"
          style={{ borderColor: accent }}
        >
          <div>
            <div className="font-extrabold" style={{ color: accent }}>
              {labels.longitudinalSheetTitle}
            </div>
            <div className="text-slate-600">
              {metadata.school || '—'} · {metadata.subject || '—'} · {labels.classLabel}{' '}
              {metadata.className || '—'}
            </div>
          </div>
          <div className="font-mono text-xs font-bold tabular-nums text-slate-800">
            {result.exams.length}{' '}
            {lang === 'fr' ? 'évaluations' : lang === 'en' ? 'assessments' : 'فروض متتابعة'}
          </div>
        </header>

        {/* Exam progression summary table */}
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="font-bold text-white" style={{ backgroundColor: accent }}>
              <th className="border border-slate-300 px-2 py-1.5 text-start">
                {lang === 'fr' ? 'Devoir' : lang === 'en' ? 'Assessment' : 'الفرض المحروس'}
              </th>
              <th className="border border-slate-300 px-2 py-1.5">{labels.metaExamDate}</th>
              <th className="border border-slate-300 px-2 py-1.5">{labels.kpiPresent}</th>
              <th className="border border-slate-300 px-2 py-1.5">{labels.kpiAverage}</th>
              <th className="border border-slate-300 px-2 py-1.5">{labels.kpiMastered} %</th>
              <th className="border border-slate-300 px-2 py-1.5">{labels.kpiStdDev}</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {result.exams.map((ex) => (
              <tr key={ex.projectId} className="even:bg-slate-50/70">
                <td className="border border-slate-300 px-2 py-1.5 text-start font-sans font-bold">
                  {ex.examNumber}
                </td>
                <td className="border border-slate-300 px-2 py-1.5">{ex.examDate}</td>
                <td className="border border-slate-300 px-2 py-1.5">{ex.present}</td>
                <td className="border border-slate-300 px-2 py-1.5 font-bold" style={{ color: accent }}>
                  {ex.average.toFixed(2)}/20
                </td>
                <td className="border border-slate-300 px-2 py-1.5 font-bold text-emerald-700">
                  {ex.passRate.toFixed(1)}%
                </td>
                <td className="border border-slate-300 px-2 py-1.5">{ex.stdDev.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Progression & remediation impact summary */}
        <div className="grid grid-cols-4 gap-2 rounded-lg border border-slate-300 bg-slate-50/70 p-2.5 text-center text-xs font-mono tabular-nums">
          <div>
            <div className="font-sans text-[10px] font-semibold text-slate-500">
              {lang === 'fr' ? 'Δ Moyenne classe' : lang === 'en' ? 'Δ Class Average' : 'تطور معدل القسم (Δ)'}
            </div>
            <div className="font-extrabold text-slate-900" dir="ltr">
              {result.overallDeltaAverage >= 0 ? '+' : ''}
              {result.overallDeltaAverage.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-sans text-[10px] font-semibold text-slate-500">
              {lang === 'fr' ? 'Δ Taux de maîtrise' : lang === 'en' ? 'Δ Pass Rate' : 'تطور نسبة التحكم (Δ)'}
            </div>
            <div className="font-extrabold text-emerald-700" dir="ltr">
              {result.overallDeltaPassRate >= 0 ? '+' : ''}
              {result.overallDeltaPassRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-sans text-[10px] font-semibold text-slate-500">
              {lang === 'fr' ? 'En progression' : lang === 'en' ? 'Improved' : 'متحسّنون'}
            </div>
            <div className="font-extrabold text-teal-800">{result.improvedCount}</div>
          </div>
          <div>
            <div className="font-sans text-[10px] font-semibold text-slate-500">
              {lang === 'fr' ? 'Rattrapage post-soutien' : lang === 'en' ? 'Recovered Pass' : 'تداركوا العتبة بعد الدعم'}
            </div>
            <div className="font-extrabold text-indigo-800">{result.recoveredPassCount}</div>
          </div>
        </div>

        {/* Full cohort student trajectories: adaptive 2-column split when > 22 students so all appear cleanly on A4 */}
        {(() => {
          const visibleRows = result.trajectories.slice(0, 56);
          const useTwoCols = visibleRows.length > 22;
          const mid = Math.ceil(visibleRows.length / 2);
          const chunks = useTwoCols
            ? [visibleRows.slice(0, mid), visibleRows.slice(mid)]
            : [visibleRows];

          return (
            <div className={useTwoCols ? 'grid grid-cols-2 gap-2.5' : ''}>
              {chunks.map((chunk, chunkIdx) => (
                <table
                  key={chunkIdx}
                  className={`w-full border-collapse ${useTwoCols ? 'text-[8.5px]' : 'text-[10px]'}`}
                >
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <th className="border border-slate-300 px-1.5 py-1 text-start">
                        {labels.colStudentName}
                      </th>
                      {result.exams.map((ex) => (
                        <th
                          key={ex.projectId}
                          className="border border-slate-300 px-1 py-1 text-center font-mono"
                        >
                          {ex.label}
                        </th>
                      ))}
                      <th className="border border-slate-300 px-1 py-1 text-center font-mono">
                        Δ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((tr) => (
                      <tr key={tr.key} className="even:bg-slate-50/60">
                        <td className="border border-slate-300 px-1.5 py-0.5 font-semibold text-slate-900 truncate max-w-[115px]">
                          {tr.fullName}
                        </td>
                        {result.exams.map((ex) => {
                          const sc = tr.scoresByExam[ex.projectId];
                          return (
                            <td
                              key={ex.projectId}
                              className="border border-slate-300 px-1 py-0.5 text-center font-mono tabular-nums"
                            >
                              {tr.absentByExam[ex.projectId]
                                ? labels.absentLabel
                                : typeof sc === 'number'
                                ? sc.toFixed(2)
                                : '—'}
                            </td>
                          );
                        })}
                        <td
                          className={`border border-slate-300 px-1 py-0.5 text-center font-mono font-bold tabular-nums ${
                            (tr.delta ?? 0) >= 0.5
                              ? 'text-emerald-700'
                              : (tr.delta ?? 0) <= -0.5
                              ? 'text-red-700'
                              : 'text-slate-600'
                          }`}
                          dir="ltr"
                        >
                          {tr.delta === null
                            ? '—'
                            : tr.delta > 0
                            ? `+${tr.delta.toFixed(2)}`
                            : tr.delta.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          );
        })()}
      </div>

      <footer className="mt-3 flex items-center justify-between border-t border-slate-200 pt-1.5 text-[9px] text-slate-500">
        <span>
          {labels.footerBrand} · {labels.longitudinalSheetTitle}
        </span>
        <span className="font-mono tabular-nums">{labels.pageOfTotal(pageNumber, totalPages)}</span>
      </footer>
    </ReportSheetFrame>
  );
};

interface PostRemediationImpactReportSheetProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  impact: PostRemediationImpactSummary;
  pageNumber: number;
  totalPages: number;
}

export const PostRemediationImpactReportSheet: React.FC<
  PostRemediationImpactReportSheetProps
> = ({ template, metadata, impact, pageNumber, totalPages }) => {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const accent = template.styleConfig.accentColor || '#1e3a8a';
  const fontClass = getReportFontClass(template.styleConfig.fontFamily);

  const visibleRows = impact.studentRows.slice(0, 52);
  const hiddenRowsCount = Math.max(0, impact.studentRows.length - visibleRows.length);
  const useTwoCols = visibleRows.length > 20;
  const mid = Math.ceil(visibleRows.length / 2);
  const chunks = useTwoCols
    ? [visibleRows.slice(0, mid), visibleRows.slice(mid)]
    : [visibleRows];

  const getStatusLabel = (status: string) => {
    if (status === 'mastered') return labels.cardPostMastered;
    if (status === 'in_progress') return labels.cardPostInProgress;
    if (status === 'needs_followup') return labels.cardPostNeedsFollowup;
    return labels.postImpactPending;
  };

  const getStatusColor = (status: string) => {
    if (status === 'mastered') return '#15803d';
    if (status === 'in_progress') return '#b45309';
    if (status === 'needs_followup') return '#b91c1c';
    return '#64748b';
  };

  return (
    <ReportSheetFrame
      styleConfig={template.styleConfig}
      dir={labels.dir}
      className={`mt-8 print:mt-0 ${fontClass}`}
      innerPaddingClass="p-[5mm]"
    >
      <div className="space-y-4">
        <header
          className="flex items-center justify-between border-b-2 pb-2 text-[10.5px]"
          style={{ borderColor: accent }}
        >
          <div>
            <div className="font-extrabold" style={{ color: accent }}>
              {labels.postImpactTitle}
            </div>
            <div className="text-slate-600">{labels.postImpactSub}</div>
          </div>
          <div className="text-end font-semibold text-slate-700">
            <div>
              {metadata.subject || '—'} · {labels.classLabel} {metadata.className || '—'}
            </div>
            <div>{metadata.examNumber}</div>
          </div>
        </header>

        {/* Impact KPI Summary Strip */}
        <div className="grid grid-cols-5 gap-2 rounded-lg border border-slate-300 bg-slate-50/70 p-2.5 text-center font-mono tabular-nums">
          <div>
            <div className="font-sans text-[9.5px] font-semibold text-slate-500">
              {labels.postImpactEvaluated}
            </div>
            <div className="mt-0.5 text-xs font-extrabold text-slate-900">
              {impact.evaluatedCount} / {impact.targetedCount}
            </div>
          </div>
          <div>
            <div className="font-sans text-[9.5px] font-semibold text-slate-500">
              {labels.postImpactPreAvg}
            </div>
            <div className="mt-0.5 text-xs font-extrabold text-slate-800">
              {impact.preAverage !== null ? `${impact.preAverage.toFixed(2)}/20` : '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[9.5px] font-semibold text-slate-500">
              {labels.postImpactPostAvg}
            </div>
            <div className="mt-0.5 text-xs font-extrabold" style={{ color: accent }}>
              {impact.postAverage !== null ? `${impact.postAverage.toFixed(2)}/20` : '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[9.5px] font-semibold text-slate-500">
              {labels.postImpactAvgGain}
            </div>
            <div className="mt-0.5 text-xs font-extrabold text-emerald-700" dir="ltr">
              {impact.averageGain !== null
                ? `${impact.averageGain >= 0 ? '+' : ''}${impact.averageGain.toFixed(2)}`
                : '—'}
            </div>
          </div>
          <div>
            <div className="font-sans text-[9.5px] font-semibold text-slate-500">
              {labels.postImpactRecoveryRate}
            </div>
            <div className="mt-0.5 text-xs font-extrabold text-emerald-700">
              {impact.recoveryRate.toFixed(1)}%
              {impact.gapClosurePct !== null ? ` · Δ${impact.gapClosurePct.toFixed(0)}%` : ''}
            </div>
          </div>
        </div>

        {/* Per-student Pre / Post Comparison Table */}
        <div className={useTwoCols ? 'grid grid-cols-2 gap-2.5' : ''}>
          {chunks.map((chunk, chunkIdx) => (
            <table
              key={chunkIdx}
              className={`w-full border-collapse ${useTwoCols ? 'text-[8.5px]' : 'text-[10.5px]'}`}
            >
              <thead>
                <tr className="font-bold text-white" style={{ backgroundColor: accent }}>
                  <th className="border border-slate-300 px-2 py-1.5 text-start">
                    {labels.colStudentName}
                  </th>
                  <th className="border border-slate-300 px-1.5 py-1.5 text-center">
                    {labels.postImpactColPre}
                  </th>
                  <th className="border border-slate-300 px-1.5 py-1.5 text-center">
                    {labels.postImpactColPost}
                  </th>
                  <th className="border border-slate-300 px-1.5 py-1.5 text-center">
                    {labels.postImpactColDelta}
                  </th>
                  <th className="border border-slate-300 px-1.5 py-1.5 text-center">
                    {labels.postImpactColStatus}
                  </th>
                </tr>
              </thead>
              <tbody>
                {chunk.map((row) => (
                  <tr key={row.student.id} className="even:bg-slate-50/60">
                    <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-900 truncate max-w-[125px]">
                      {row.student.fullName}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono tabular-nums">
                      {row.preScore !== null ? row.preScore.toFixed(2) : labels.absentLabel}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold tabular-nums">
                      {row.postScore !== null ? row.postScore.toFixed(2) : '—'}
                    </td>
                    <td
                      className={`border border-slate-300 px-1.5 py-1 text-center font-mono font-bold tabular-nums ${
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
                    <td
                      className="border border-slate-300 px-1.5 py-1 text-center font-bold"
                      style={{ color: getStatusColor(row.status) }}
                    >
                      {getStatusLabel(row.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        {hiddenRowsCount > 0 && (
          <p className="text-center text-[10px] font-semibold text-slate-500">
            + {hiddenRowsCount} {labels.studentShort} — تظهر تفاصيلهم كاملة في بطاقات الدعم الفردية المرفقة
          </p>
        )}
      </div>

      <footer className="mt-3 flex items-center justify-between border-t border-slate-200 pt-1.5 text-[9px] text-slate-500">
        <span>
          {labels.footerBrand} · {labels.postImpactTitle}
        </span>
        <span className="font-mono tabular-nums">{labels.pageOfTotal(pageNumber, totalPages)}</span>
      </footer>
    </ReportSheetFrame>
  );
};

