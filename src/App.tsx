import { Archive, CheckCircle2, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AnalyticsAndCouncilView } from './components/AnalyticsAndCouncilView';
import { ClassArchiveDrawer } from './components/ClassArchiveDrawer';
import { CustomizeAndPedagogyStep } from './components/CustomizeAndPedagogyStep';
import { HeaderNav } from './components/HeaderNav';
import { MassarImportStep } from './components/MassarImportStep';
import { MobilePWABar } from './components/MobilePWABar';
import { PreviewDocumentMode } from './components/ReportDocument';
import { ReportPreviewStep } from './components/ReportPreviewStep';
import { SavedInstitutionToast } from './components/SavedInstitutionToast';
import {
  DEFAULT_METADATA,
  SAMPLE_CLASS_METADATA,
  SAMPLE_CLASS_STUDENTS,
  TEMPLATE_PRESETS,
} from './data/presets';
import {
  AppStep,
  ArchivedClassProject,
  ExamItemDefinition,
  ExamPdfAttachment,
  MassarMetadata,
  ParsedMassarWorkbook,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from './types/report';
import {
  buildProjectFromWorkspace,
  createDemoLongitudinalCohort,
  deleteArchivedProject,
  duplicateArchivedProject,
  getActiveArchiveId,
  listArchivedProjects,
  renameArchivedProject,
  saveArchivedProject,
  setActiveArchiveId,
} from './utils/classArchiveDb';
import {
  clearSavedInstitutionSettings,
  clearWorkspaceDraft,
  getInitialMetadata,
  getInitialTemplate,
  hasSavedInstitutionSettings,
  loadSavedInstitutionSettings,
  loadWorkspaceDraft,
  SavedInstitutionSettings,
  saveInstitutionSettings,
  saveWorkspaceDraft,
} from './utils/institutionStorage';
import { computeExamStats, sanitizeMetadataField } from './utils/massarParser';
import {
  loadExamAttachmentFromDb,
  loadWorkbookFromDb,
  saveExamAttachmentToDb,
  saveWorkbookToDb,
} from './utils/pdfAttachment';

export default function App() {
  const [initialDraft] = useState(() => loadWorkspaceDraft());
  const [activeStep, setActiveStep] = useState<AppStep>(
    () => initialDraft?.activeStep ?? 'massar'
  );
  const [lastWorkflowStep, setLastWorkflowStep] = useState<Exclude<AppStep, 'analytics'>>(() =>
    initialDraft?.activeStep && initialDraft.activeStep !== 'analytics'
      ? initialDraft.activeStep
      : 'massar'
  );
  const [students, setStudents] = useState<StudentRecord[]>(
    () => initialDraft?.students ?? []
  );
  const [metadata, setMetadata] = useState<MassarMetadata>(
    () => initialDraft?.metadata ?? getInitialMetadata()
  );
  const [rawWorkbook, setRawWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [workbookInfo, setWorkbookInfo] = useState<ParsedMassarWorkbook | null>(
    () => initialDraft?.workbookInfo ?? null
  );
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplateSchema>(
    () => initialDraft?.template ?? getInitialTemplate()
  );
  const [itemDefinitions, setItemDefinitions] = useState<ExamItemDefinition[]>(
    () => initialDraft?.itemDefinitions ?? []
  );
  const [studentItemScores, setStudentItemScores] = useState<StudentItemScores>(
    () => initialDraft?.studentItemScores ?? {}
  );
  const [examAttachment, setExamAttachment] = useState<ExamPdfAttachment | null>(null);
  const [attachmentHydrated, setAttachmentHydrated] = useState(false);
  const [pdfExportTrigger, setPdfExportTrigger] = useState(0);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState<boolean>(
    () => Boolean(initialDraft?.isSampleMode)
  );
  const [previewDocMode, setPreviewDocMode] = useState<PreviewDocumentMode>('report');

  const [archivedProjects, setArchivedProjects] = useState<ArchivedClassProject[]>([]);
  const [activeArchiveId, setActiveArchiveIdState] = useState<string | null>(() =>
    getActiveArchiveId()
  );
  const [isArchiveDrawerOpen, setIsArchiveDrawerOpen] = useState(false);
  const [archiveBanner, setArchiveBanner] = useState<string | null>(null);

  const [savedSnapshot] = useState<Partial<SavedInstitutionSettings> | null>(() =>
    loadSavedInstitutionSettings()
  );
  const [showSavedToast, setShowSavedToast] = useState<boolean>(
    () => hasSavedInstitutionSettings() && (initialDraft?.students?.length ?? 0) === 0
  );

  useEffect(() => {
    let mounted = true;
    void loadExamAttachmentFromDb().then((loaded) => {
      if (mounted) {
        setExamAttachment(loaded);
        setAttachmentHydrated(true);
      }
    });
    void loadWorkbookFromDb().then((loadedWb) => {
      if (mounted && loadedWb) {
        setRawWorkbook(loadedWb);
      }
    });
    void listArchivedProjects().then((projects) => {
      if (mounted) {
        setArchivedProjects(projects);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!archiveBanner) return;
    const timer = window.setTimeout(() => setArchiveBanner(null), 3600);
    return () => window.clearTimeout(timer);
  }, [archiveBanner]);

  useEffect(() => {
    if (!attachmentHydrated) return;
    void saveExamAttachmentToDb(examAttachment);
  }, [examAttachment, attachmentHydrated]);

  useEffect(() => {
    if (isSampleMode) return;
    saveInstitutionSettings(metadata, activeTemplate);
  }, [metadata, activeTemplate, isSampleMode]);

  useEffect(() => {
    saveWorkspaceDraft({
      activeStep,
      students,
      metadata,
      template: activeTemplate,
      workbookInfo,
      isSampleMode,
      itemDefinitions,
      studentItemScores,
    });
  }, [
    activeStep,
    students,
    metadata,
    activeTemplate,
    workbookInfo,
    isSampleMode,
    itemDefinitions,
    studentItemScores,
  ]);

  const stats = useMemo(
    () =>
      computeExamStats(
        students,
        activeTemplate.brackets,
        activeTemplate.passThreshold,
        activeTemplate.excellenceThreshold
      ),
    [
      students,
      activeTemplate.brackets,
      activeTemplate.passThreshold,
      activeTemplate.excellenceThreshold,
    ]
  );

  const navigateToStep = (step: AppStep) => {
    if (step !== 'preview') {
      setPdfExportTrigger(0);
      setIsExportingPdf(false);
    }
    if (step !== 'analytics') {
      setLastWorkflowStep(step);
    }
    setActiveStep(step);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoadSavedInstitution = () => {
    setIsSampleMode(false);
    const savedMeta = getInitialMetadata();
    const savedTpl = getInitialTemplate();
    setMetadata((prev) => ({
      ...prev,
      academy: savedMeta.academy || prev.academy,
      directorate: savedMeta.directorate || prev.directorate,
      school: savedMeta.school || prev.school,
      schoolYear: savedMeta.schoolYear || prev.schoolYear,
      cycle: savedMeta.cycle || prev.cycle,
      level: savedMeta.level || prev.level,
      subject: savedMeta.subject || prev.subject,
      teacherName: savedMeta.teacherName || prev.teacherName,
      duration: savedMeta.duration || prev.duration,
      coefficient: savedMeta.coefficient || prev.coefficient,
      remediationFormat: savedMeta.remediationFormat || prev.remediationFormat,
    }));
    setActiveTemplate((prev) => ({
      ...prev,
      passThreshold: savedTpl.passThreshold,
      excellenceThreshold: savedTpl.excellenceThreshold,
      brackets: savedTpl.brackets,
      styleConfig: savedTpl.styleConfig,
      headerConfig: {
        ...prev.headerConfig,
        reportTitle: savedTpl.headerConfig.reportTitle,
        ministryLine:
          savedTpl.headerConfig.ministryLine || prev.headerConfig.ministryLine,
        reportLanguage:
          savedTpl.headerConfig.reportLanguage ?? prev.headerConfig.reportLanguage,
        includeFrenchHeader:
          savedTpl.headerConfig.includeFrenchHeader ??
          prev.headerConfig.includeFrenchHeader,
      },
      pedagogicalContent: {
        ...prev.pedagogicalContent,
        remediationNotes:
          savedTpl.pedagogicalContent.remediationNotes ||
          prev.pedagogicalContent.remediationNotes,
      },
      remediationCardsConfig:
        savedTpl.remediationCardsConfig ?? prev.remediationCardsConfig,
    }));
  };

  const handleStartFreshInstitution = () => {
    setIsSampleMode(false);
    setMetadata((prev) => ({
      ...DEFAULT_METADATA,
      className: prev.className,
      examDate: prev.examDate,
      correctionDate: prev.correctionDate,
      examContent: prev.examContent,
      gradingScaleNote: prev.gradingScaleNote,
    }));
    setShowSavedToast(false);
  };

  const resetClassSpecificCardOverrides = () => {
    setActiveTemplate((prev) => {
      if (!prev.remediationCardsConfig) return prev;
      return {
        ...prev,
        remediationCardsConfig: {
          ...prev.remediationCardsConfig,
          targetFilter:
            prev.remediationCardsConfig.targetFilter === 'custom'
              ? 'struggling'
              : prev.remediationCardsConfig.targetFilter,
          customSelectedIds: [],
          studentOverrides: {},
        },
      };
    });
  };

  const handleWorkbookLoaded = (wb: XLSX.WorkBook, parsed: ParsedMassarWorkbook) => {
    const wasSample = isSampleMode;
    const baseFallback = wasSample ? getInitialMetadata() : metadata;
    setIsSampleMode(false);
    setRawWorkbook(wb);
    void saveWorkbookToDb(wb);
    setWorkbookInfo(parsed);
    setStudents(parsed.students);
    setItemDefinitions([]);
    setStudentItemScores({});
    setActiveArchiveIdState(null);
    setActiveArchiveId(null);
    resetClassSpecificCardOverrides();
    setMetadata((prev) => {
      const ref = wasSample ? baseFallback : prev;
      return {
        ...ref,
        academy: parsed.metadata.academy || sanitizeMetadataField('academy', ref.academy),
        directorate:
          parsed.metadata.directorate || sanitizeMetadataField('directorate', ref.directorate),
        school: parsed.metadata.school || sanitizeMetadataField('school', ref.school),
        schoolYear:
          parsed.metadata.schoolYear || sanitizeMetadataField('schoolYear', ref.schoolYear),
        cycle: parsed.metadata.cycle || sanitizeMetadataField('cycle', ref.cycle),
        level: parsed.metadata.level || sanitizeMetadataField('level', ref.level),
        className: parsed.metadata.className || sanitizeMetadataField('className', ref.className),
        subject: parsed.metadata.subject || sanitizeMetadataField('subject', ref.subject),
        teacherName:
          parsed.metadata.teacherName || sanitizeMetadataField('teacherName', ref.teacherName),
        semester: parsed.metadata.semester || sanitizeMetadataField('semester', ref.semester),
        examDate: parsed.metadata.examDate || (wasSample ? '' : ref.examDate),
        correctionDate: wasSample ? '' : ref.correctionDate,
        examContent: wasSample ? '' : ref.examContent,
        gradingScaleNote: wasSample ? '' : ref.gradingScaleNote,
        duration: parsed.metadata.duration || ref.duration,
        coefficient: parsed.metadata.coefficient || ref.coefficient,
        examNumber: parsed.selectedExamNumber || ref.examNumber,
      };
    });
  };

  const handleLoadSampleData = () => {
    setIsSampleMode(true);
    setRawWorkbook(null);
    void saveWorkbookToDb(null);
    setWorkbookInfo(null);
    setStudents(SAMPLE_CLASS_STUDENTS.map((s) => ({ ...s })));
    setItemDefinitions([]);
    setStudentItemScores({});
    setActiveArchiveIdState(null);
    setActiveArchiveId(null);
    resetClassSpecificCardOverrides();
    setMetadata((prev) => ({
      ...prev,
      academy: prev.academy || SAMPLE_CLASS_METADATA.academy || '',
      directorate: prev.directorate || SAMPLE_CLASS_METADATA.directorate || '',
      school: prev.school || SAMPLE_CLASS_METADATA.school || '',
      schoolYear: prev.schoolYear || SAMPLE_CLASS_METADATA.schoolYear || '',
      cycle: prev.cycle || SAMPLE_CLASS_METADATA.cycle || '',
      level: SAMPLE_CLASS_METADATA.level || prev.level,
      className: SAMPLE_CLASS_METADATA.className || prev.className,
      subject: prev.subject || SAMPLE_CLASS_METADATA.subject || '',
      teacherName: prev.teacherName || SAMPLE_CLASS_METADATA.teacherName || '',
      examNumber: SAMPLE_CLASS_METADATA.examNumber || prev.examNumber,
      semester: SAMPLE_CLASS_METADATA.semester || prev.semester,
      examDate: SAMPLE_CLASS_METADATA.examDate || prev.examDate,
      correctionDate: SAMPLE_CLASS_METADATA.correctionDate || prev.correctionDate,
      duration: SAMPLE_CLASS_METADATA.duration || prev.duration,
      coefficient: SAMPLE_CLASS_METADATA.coefficient || prev.coefficient,
      examContent: SAMPLE_CLASS_METADATA.examContent || prev.examContent,
      gradingScaleNote: SAMPLE_CLASS_METADATA.gradingScaleNote || prev.gradingScaleNote,
    }));
  };

  const handleClearData = () => {
    const savedMeta = getInitialMetadata();
    setIsSampleMode(false);
    setRawWorkbook(null);
    void saveWorkbookToDb(null);
    setWorkbookInfo(null);
    setStudents([]);
    setItemDefinitions([]);
    setStudentItemScores({});
    setExamAttachment(null);
    setActiveArchiveIdState(null);
    setActiveArchiveId(null);
    resetClassSpecificCardOverrides();
    setMetadata((prev) => ({
      ...(isSampleMode ? savedMeta : prev),
      className: '',
      examNumber: DEFAULT_METADATA.examNumber,
      semester: DEFAULT_METADATA.semester,
      examDate: '',
      correctionDate: '',
      examContent: '',
      gradingScaleNote: '',
    }));
    clearWorkspaceDraft();
  };

  const handleResetInstitutionSettings = () => {
    setIsSampleMode(false);
    clearSavedInstitutionSettings();
    setShowSavedToast(false);
    setMetadata((prev) => ({
      ...DEFAULT_METADATA,
      className: prev.className,
      examDate: prev.examDate,
      correctionDate: prev.correctionDate,
      examContent: prev.examContent,
      gradingScaleNote: prev.gradingScaleNote,
    }));
    setActiveTemplate((prev) => ({
      ...TEMPLATE_PRESETS[0],
      sections: prev.sections,
      pedagogicalContent: prev.pedagogicalContent,
      remediationCardsConfig: prev.remediationCardsConfig,
    }));
  };

  const handleUpdateStudentScore = (id: string, score: number | null, isAbsent: boolean) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, score, isAbsent } : s))
    );
  };

  const handleAddStudent = (fullName: string, score: number | null, isAbsent: boolean) => {
    setStudents((prev) => {
      const nextOrder = prev.reduce((max, s) => Math.max(max, s.order || 0), 0) + 1;
      return [
        ...prev,
        {
          id: `manual-${Date.now()}-${nextOrder}`,
          order: nextOrder,
          code: `M-${String(nextOrder).padStart(2, '0')}`,
          fullName: fullName.replace(/\s+/g, ' ').trim(),
          score,
          isAbsent,
        },
      ];
    });
  };

  const handleAddAbsentStudents = (
    entries: Array<{ fullName: string; observation?: string }>
  ) => {
    setStudents((prev) => {
      const next = [...prev];
      let maxOrder = next.reduce((max, s) => Math.max(max, s.order || 0), 0);

      entries.forEach((entry, idx) => {
        const rawInput = entry.fullName.replace(/\s+/g, ' ').trim();
        if (!rawInput) return;

        // Support "#12 - الاسم الكامل" or "الاسم الكامل (CODE)" disambiguation for duplicate names
        const orderPrefixMatch = rawInput.match(/^#(\d+)\s*[-–—:]\s*(.+)$/);
        const targetOrder = orderPrefixMatch ? Number.parseInt(orderPrefixMatch[1], 10) : null;
        const cleanName = (orderPrefixMatch ? orderPrefixMatch[2] : rawInput).trim();
        const normalizedTarget = cleanName.toLowerCase();

        const existingIndex = next.findIndex((s) => {
          if (targetOrder !== null && s.order === targetOrder) {
            return true;
          }
          const sName = s.fullName.replace(/\s+/g, ' ').trim().toLowerCase();
          const sCode = s.code.trim().toLowerCase();
          return (
            sName === normalizedTarget ||
            `${sName} (${sCode})` === normalizedTarget ||
            sCode === normalizedTarget
          );
        });

        if (existingIndex !== -1) {
          next[existingIndex] = {
            ...next[existingIndex],
            isAbsent: true,
            score: null,
            observation: entry.observation || next[existingIndex].observation,
          };
        } else {
          maxOrder += 1;
          next.push({
            id: `absent-${Date.now()}-${idx}-${maxOrder}`,
            order: maxOrder,
            code: `ABS-${maxOrder}`,
            fullName: cleanName,
            score: null,
            isAbsent: true,
            observation: entry.observation,
          });
        }
      });

      return next;
    });
  };

  const handleUpdateObservation = (id: string, observation: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, observation: observation || undefined } : s))
    );
  };

  const handleRemoveStudent = (id: string) => {
    setStudents((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, order: idx + 1 }))
    );
    setStudentItemScores((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveTemplate((prev) => {
      const cfg = prev.remediationCardsConfig;
      if (!cfg) return prev;
      const hasOverride = Boolean(cfg.studentOverrides && id in cfg.studentOverrides);
      const hasCustomId = Boolean(cfg.customSelectedIds?.includes(id));
      if (!hasOverride && !hasCustomId) return prev;
      const nextOverrides = { ...(cfg.studentOverrides || {}) };
      delete nextOverrides[id];
      return {
        ...prev,
        remediationCardsConfig: {
          ...cfg,
          customSelectedIds: (cfg.customSelectedIds || []).filter((cid) => cid !== id),
          studentOverrides: nextOverrides,
        },
      };
    });
  };

  // Multi-class Archive & Longitudinal Cohort Handlers
  const handleSaveCurrentToArchive = async (asNewSnapshot = false) => {
    if (students.length === 0) return;
    const existing = !asNewSnapshot && activeArchiveId
      ? archivedProjects.find((p) => p.id === activeArchiveId)
      : undefined;
    const project = buildProjectFromWorkspace({
      id: existing ? existing.id : undefined,
      createdAt: existing ? existing.createdAt : undefined,
      name: existing ? existing.name : undefined,
      isSample: isSampleMode,
      metadata,
      students,
      template: activeTemplate,
      itemDefinitions,
      studentItemScores,
      examAttachment,
    });
    const nextList = await saveArchivedProject(project);
    setArchivedProjects(nextList);
    setActiveArchiveIdState(project.id);
    setActiveArchiveId(project.id);
    setArchiveBanner(`تم حفظ «${project.name}» في أرشيف الأقسام المحلي`);
  };

  const handleLoadArchivedProject = (project: ArchivedClassProject) => {
    setIsSampleMode(Boolean(project.isSample));
    setRawWorkbook(null);
    void saveWorkbookToDb(null);
    setWorkbookInfo(null);
    setStudents(project.students.map((s) => ({ ...s })));
    setMetadata({ ...project.metadata });
    setActiveTemplate(JSON.parse(JSON.stringify(project.template)) as ReportTemplateSchema);
    setItemDefinitions((project.itemDefinitions || []).map((it) => ({ ...it })));
    setStudentItemScores(
      JSON.parse(JSON.stringify(project.studentItemScores || {})) as StudentItemScores
    );
    setExamAttachment(
      project.examAttachment
        ? {
            ...project.examAttachment,
            pageImages: [...project.examAttachment.pageImages],
          }
        : null
    );
    setActiveArchiveIdState(project.id);
    setActiveArchiveId(project.id);
    setIsArchiveDrawerOpen(false);
    if (activeStep === 'analytics') {
      navigateToStep('massar');
    }
    setArchiveBanner(`تم استرجاع معطيات «${project.name}»`);
  };

  const handleRenameArchivedProject = async (id: string, newName: string) => {
    const nextList = await renameArchivedProject(id, newName);
    setArchivedProjects(nextList);
  };

  const handleDuplicateArchivedProject = async (id: string) => {
    const { list } = await duplicateArchivedProject(id);
    setArchivedProjects(list);
  };

  const handleDeleteArchivedProject = async (id: string) => {
    const nextList = await deleteArchivedProject(id);
    setArchivedProjects(nextList);
    if (activeArchiveId === id) {
      setActiveArchiveIdState(null);
    }
  };

  const handleImportArchiveProjects = async (imported: ArchivedClassProject[]) => {
    let nextList = archivedProjects;
    for (const proj of imported) {
      nextList = await saveArchivedProject(proj);
    }
    setArchivedProjects(nextList);
    setArchiveBanner(`تم استيراد ${imported.length} سجل(ات) إلى أرشيف الأقسام`);
  };

  const handleCreateDemoCohort = async () => {
    const nextList = await createDemoLongitudinalCohort(metadata, activeTemplate);
    setArchivedProjects(nextList);
    setArchiveBanner('تم إنشاء مسار تجريبي متكامل (F1 ← F2 ← F3) وبيانات مجالس الأقسام');
  };

  const handleStartNewEmptyWorkspace = () => {
    handleClearData();
    setIsArchiveDrawerOpen(false);
    navigateToStep('massar');
  };

  const handleSelectStep = (step: AppStep) => {
    if (step === 'preview' && students.length === 0) return;
    navigateToStep(step);
  };

  const handlePrimaryAction = () => {
    if (students.length === 0) return;
    if (activeStep === 'massar' || activeStep === 'analytics') {
      navigateToStep('customize');
    } else if (activeStep === 'customize') {
      navigateToStep('preview');
    } else {
      setPdfExportTrigger((n) => n + 1);
    }
  };

  const activeClassSummaryLabel = useMemo(() => {
    if (students.length === 0) return '';
    return [metadata.className || 'قسم نشط', metadata.subject || '', metadata.examNumber || '']
      .filter(Boolean)
      .join(' · ');
  }, [metadata.className, metadata.examNumber, metadata.subject, students.length]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
      <HeaderNav
        activeStep={activeStep}
        onSelectStep={handleSelectStep}
        onPrimaryAction={handlePrimaryAction}
        hasStudents={students.length > 0}
        isExportingPdf={isExportingPdf}
      />

      <MobilePWABar
        activeStep={activeStep}
        onSelectStep={handleSelectStep}
        hasStudents={students.length > 0}
      />

      {showSavedToast && (
        <SavedInstitutionToast
          savedSettings={savedSnapshot}
          onLoadSaved={handleLoadSavedInstitution}
          onStartFresh={handleStartFreshInstitution}
          onDismiss={() => setShowSavedToast(false)}
        />
      )}

      <main className="mx-auto max-w-[1320px] px-4 pt-4 pb-24 md:py-5 sm:px-6 print:max-w-none print:p-0">
        {/* Clean Single-Elevation Workspace Context & Archive Utility Bar */}
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-xs">
            {students.length > 0 ? (
              <>
                <span className="font-bold text-slate-900">
                  {metadata.className || 'قسم نشط'}
                </span>
                {metadata.subject && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-semibold text-teal-800">{metadata.subject}</span>
                  </>
                )}
                {metadata.examNumber && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-slate-600">{metadata.examNumber}</span>
                  </>
                )}
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono font-semibold text-slate-700 tabular-nums">
                  {stats.present}/{stats.total} حاضر
                </span>
                {stats.present > 0 && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="font-mono font-bold text-teal-800 tabular-nums">
                      المعدل {stats.average.toFixed(2)}/20 ({stats.passRate.toFixed(0)}%)
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-slate-500">
                منظومة إعداد تقارير الفروض المحروسة وملفات التفتيش وفق مذكرة التقويم — ارفع ملف مسار للبدء
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {archiveBanner && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{archiveBanner}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsArchiveDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Archive className="h-3.5 w-3.5 text-teal-700" />
              <span>أرشيف الأقسام</span>
              <span className="font-mono text-[11px] font-bold text-teal-800 tabular-nums">
                ({archivedProjects.length})
              </span>
            </button>

            <button
              type="button"
              disabled={students.length === 0}
              onClick={() => void handleSaveCurrentToArchive(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700/25 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-900 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 text-teal-700" />
              <span>{activeArchiveId ? 'تحديث بالأرشيف' : 'حفظ بالأرشيف'}</span>
            </button>
          </div>
        </div>

        {activeStep === 'massar' && (
          <MassarImportStep
            students={students}
            metadata={metadata}
            stats={stats}
            passThreshold={activeTemplate.passThreshold}
            excellenceThreshold={activeTemplate.excellenceThreshold}
            workbookInfo={workbookInfo}
            rawWorkbook={rawWorkbook}
            onWorkbookLoaded={handleWorkbookLoaded}
            onLoadSampleData={handleLoadSampleData}
            onUpdateMetadata={(patch) => setMetadata((prev) => ({ ...prev, ...patch }))}
            onClearData={handleClearData}
            onUpdateStudentScore={handleUpdateStudentScore}
            onAddStudent={handleAddStudent}
            onAddAbsentStudents={handleAddAbsentStudents}
            onUpdateObservation={handleUpdateObservation}
            onRemoveStudent={handleRemoveStudent}
            onNextStep={() => navigateToStep('customize')}
          />
        )}

        {activeStep === 'customize' && (
          <CustomizeAndPedagogyStep
            metadata={metadata}
            template={activeTemplate}
            stats={stats}
            students={students}
            examAttachment={examAttachment}
            itemDefinitions={itemDefinitions}
            studentItemScores={studentItemScores}
            onUpdateItemDefinitions={setItemDefinitions}
            onUpdateStudentItemScores={setStudentItemScores}
            onSyncTotalScores={setStudents}
            onUpdateExamAttachment={setExamAttachment}
            onUpdateMetadata={(patch) => setMetadata((prev) => ({ ...prev, ...patch }))}
            onUpdateTemplate={(updater) => setActiveTemplate((prev) => updater(prev))}
            onResetInstitutionSettings={handleResetInstitutionSettings}
            onBackStep={() => navigateToStep('massar')}
            onNextStep={() => {
              if (students.length > 0) {
                setPreviewDocMode('report');
                navigateToStep('preview');
              }
            }}
            onOpenCardsPreview={() => {
              if (students.length > 0) {
                setPreviewDocMode('cards');
                navigateToStep('preview');
              }
            }}
          />
        )}

        {activeStep === 'preview' && (
          <ReportPreviewStep
            template={activeTemplate}
            metadata={metadata}
            stats={stats}
            students={students}
            examAttachment={examAttachment}
            itemDefinitions={itemDefinitions}
            studentItemScores={studentItemScores}
            archivedProjects={archivedProjects}
            documentMode={previewDocMode}
            onChangeDocumentMode={setPreviewDocMode}
            onUpdateExamAttachment={setExamAttachment}
            onUpdateTemplate={(updater) => setActiveTemplate((prev) => updater(prev))}
            onBackToMassar={() => navigateToStep('massar')}
            onBackToCustomize={() => navigateToStep('customize')}
            externalPdfTrigger={pdfExportTrigger}
            onExportingStateChange={setIsExportingPdf}
          />
        )}

        {activeStep === 'analytics' && (
          <AnalyticsAndCouncilView
            projects={archivedProjects}
            hasActiveStudents={students.length > 0}
            onSaveCurrentToArchive={async () => {
              await handleSaveCurrentToArchive(true);
            }}
            onCreateDemoCohort={handleCreateDemoCohort}
            onLoadProject={handleLoadArchivedProject}
            onOpenArchiveDrawer={() => setIsArchiveDrawerOpen(true)}
            onBackToWorkflow={() => navigateToStep(lastWorkflowStep)}
          />
        )}
      </main>

      <ClassArchiveDrawer
        isOpen={isArchiveDrawerOpen}
        onClose={() => setIsArchiveDrawerOpen(false)}
        projects={archivedProjects}
        activeArchiveId={activeArchiveId}
        hasActiveStudents={students.length > 0}
        activeClassSummaryLabel={activeClassSummaryLabel}
        onSaveCurrentToArchive={handleSaveCurrentToArchive}
        onLoadArchivedProject={handleLoadArchivedProject}
        onRenameArchivedProject={handleRenameArchivedProject}
        onDuplicateArchivedProject={handleDuplicateArchivedProject}
        onDeleteArchivedProject={handleDeleteArchivedProject}
        onImportArchiveProjects={handleImportArchiveProjects}
        onStartNewEmptyWorkspace={handleStartNewEmptyWorkspace}
      />
    </div>
  );
}
