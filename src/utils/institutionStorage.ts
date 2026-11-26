import { DEFAULT_METADATA, TEMPLATE_PRESETS } from '../data/presets';
import {
  AppStep,
  ExamItemDefinition,
  MassarMetadata,
  ParsedMassarWorkbook,
  RemediationCardsConfig,
  ReportFontFamily,
  ReportFontScale,
  ReportFrameStyle,
  ReportLanguage,
  ReportSection,
  ReportTemplateSchema,
  ScoreBracket,
  SignatureSlot,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import {
  formatCoefficientAsPercentage,
  sanitizeMetadataField,
} from './massarParser';

const STORAGE_KEY = 'mistara_institution_settings_v1';
const WORKSPACE_DRAFT_KEY = 'mistara_workspace_draft_v1';

export interface SavedInstitutionSettings {
  templateId?: string;
  sections?: ReportSection[];
  signatures?: SignatureSlot[];
  metadata: {
    academy: string;
    directorate: string;
    school: string;
    schoolYear: string;
    cycle: string;
    level: string;
    subject: string;
    teacherName: string;
    duration: string;
    coefficient: string;
    remediationFormat: string;
  };
  passThreshold: number;
  excellenceThreshold: number;
  brackets: ScoreBracket[];
  styleConfig: {
    accentColor: string;
    secondaryAccent?: string;
    borderStyle?: ReportTemplateSchema['styleConfig']['borderStyle'];
    frameStyle?: ReportFrameStyle;
    fontFamily: ReportFontFamily;
    fontScale?: ReportFontScale;
    showOuterFrame?: boolean;
    tableHeaderBg?: ReportTemplateSchema['styleConfig']['tableHeaderBg'];
    chartType: ReportTemplateSchema['styleConfig']['chartType'];
  };
  headerConfig: {
    reportTitle: string;
    ministryLine?: string;
    reportLanguage?: ReportLanguage;
    includeFrenchHeader?: boolean;
    teacherSignatureMode?: 'manual' | 'image';
    teacherSignatureText?: string;
    teacherSignatureImage?: string;
  };
  remediationNotes?: string;
  remediationCardsConfig?: Partial<RemediationCardsConfig>;
  updatedAt: string;
}

const VALID_FONT_FAMILIES: ReportFontFamily[] = [
  'cairo',
  'ibm-plex-sans-arabic',
  'amiri',
  'noto-naskh-arabic',
  'noto-kufi-arabic',
  'tajawal',
  'almarai',
  'readex-pro',
];

const VALID_FRAME_STYLES: ReportFrameStyle[] = [
  'double-inset',
  'royal-corners',
  'classic-double',
  'top-bottom-bands',
  'none',
];

function isValidFontFamily(val: unknown): val is ReportFontFamily {
  return typeof val === 'string' && VALID_FONT_FAMILIES.includes(val as ReportFontFamily);
}

function isValidFrameStyle(val: unknown): val is ReportFrameStyle {
  return typeof val === 'string' && VALID_FRAME_STYLES.includes(val as ReportFrameStyle);
}

export function migrateLegacyMinistryLine(text: string): string {
  return text
    .replace(
      /وزارة التربية الوطنية والتعليم الأولي والرياضة/g,
      'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل'
    )
    .replace(
      /وزارة التربية الوطنية والتكوين المهني والتعليم العالي والبحث العلمي/g,
      'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل'
    );
}

function isValidNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= 20;
}

function isValidBracket(b: unknown): b is ScoreBracket {
  if (!b || typeof b !== 'object') return false;
  const obj = b as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.label === 'string' &&
    typeof obj.min === 'number' &&
    typeof obj.max === 'number' &&
    typeof obj.inclusiveMax === 'boolean' &&
    typeof obj.appreciation === 'string'
  );
}

export function loadSavedInstitutionSettings(): Partial<SavedInstitutionSettings> | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedInstitutionSettings>;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSavedInstitutionSettings(): boolean {
  const saved = loadSavedInstitutionSettings();
  if (!saved?.metadata) return false;
  const m = saved.metadata;
  return Boolean(
    m.school?.trim() ||
      m.teacherName?.trim() ||
      m.academy?.trim() ||
      m.directorate?.trim() ||
      m.subject?.trim() ||
      m.level?.trim()
  );
}

export function getSavedInstitutionSummary(
  saved: Partial<SavedInstitutionSettings> | null
): {
  chips: string[];
  hasNamedDetails: boolean;
} {
  if (!saved?.metadata) {
    return { chips: [], hasNamedDetails: false };
  }

  const m = saved.metadata;
  const chips: string[] = [];

  if (m.school?.trim()) chips.push(`المؤسسة: ${m.school.trim()}`);
  if (m.directorate?.trim()) chips.push(`المديرية: ${m.directorate.trim()}`);
  if (m.teacherName?.trim()) chips.push(`الأستاذ(ة): ${m.teacherName.trim()}`);
  if (m.subject?.trim()) chips.push(`المادة: ${m.subject.trim()}`);
  if (m.level?.trim()) chips.push(`المستوى: ${m.level.trim()}`);

  const hasNamedDetails = chips.length > 0;

  if (!hasNamedDetails) {
    if (m.cycle?.trim()) chips.push(m.cycle.trim());
    if (m.coefficient?.trim()) chips.push(`المعامل: ${m.coefficient.trim()}`);
    if (typeof saved.passThreshold === 'number') {
      chips.push(`عتبة المعدل: ${saved.passThreshold}/20`);
    }
  }

  return { chips: chips.slice(0, 4), hasNamedDetails };
}

function readSanitizedField(
  key: keyof MassarMetadata,
  savedVal: unknown,
  fallback: string
): string {
  if (typeof savedVal !== 'string') return fallback;
  return sanitizeMetadataField(key, savedVal);
}

export function getInitialMetadata(): MassarMetadata {
  const saved = loadSavedInstitutionSettings();
  if (!saved?.metadata) return DEFAULT_METADATA;

  return {
    ...DEFAULT_METADATA,
    academy: readSanitizedField('academy', saved.metadata.academy, DEFAULT_METADATA.academy),
    directorate: readSanitizedField(
      'directorate',
      saved.metadata.directorate,
      DEFAULT_METADATA.directorate
    ),
    school: readSanitizedField('school', saved.metadata.school, DEFAULT_METADATA.school),
    schoolYear: readSanitizedField(
      'schoolYear',
      saved.metadata.schoolYear,
      DEFAULT_METADATA.schoolYear
    ),
    cycle: readSanitizedField('cycle', saved.metadata.cycle, DEFAULT_METADATA.cycle),
    level: readSanitizedField('level', saved.metadata.level, DEFAULT_METADATA.level),
    subject: readSanitizedField('subject', saved.metadata.subject, DEFAULT_METADATA.subject),
    teacherName: readSanitizedField(
      'teacherName',
      saved.metadata.teacherName,
      DEFAULT_METADATA.teacherName
    ),
    duration:
      typeof saved.metadata.duration === 'string'
        ? saved.metadata.duration
        : DEFAULT_METADATA.duration,
    coefficient:
      typeof saved.metadata.coefficient === 'string'
        ? saved.metadata.coefficient.trim() === '1'
          ? DEFAULT_METADATA.coefficient
          : formatCoefficientAsPercentage(saved.metadata.coefficient) || DEFAULT_METADATA.coefficient
        : DEFAULT_METADATA.coefficient,
    remediationFormat:
      typeof saved.metadata.remediationFormat === 'string'
        ? saved.metadata.remediationFormat
        : DEFAULT_METADATA.remediationFormat,
  };
}

export function getInitialTemplate(): ReportTemplateSchema {
  const saved = loadSavedInstitutionSettings();
  const base =
    (saved?.templateId && TEMPLATE_PRESETS.find((p) => p.id === saved.templateId)) ||
    TEMPLATE_PRESETS[0];
  if (!saved) return base;

  const validBrackets =
    Array.isArray(saved.brackets) &&
    saved.brackets.length > 0 &&
    saved.brackets.every(isValidBracket)
      ? saved.brackets
      : base.brackets;

  const validSections =
    Array.isArray(saved.sections) &&
    saved.sections.length > 0 &&
    saved.sections.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.type === 'string' &&
        typeof s.title === 'string' &&
        typeof s.enabled === 'boolean'
    )
      ? saved.sections
      : base.sections;

  const validSignatures =
    Array.isArray(saved.signatures) &&
    saved.signatures.length >= 2 &&
    saved.signatures.every((sig) => sig && typeof sig.id === 'string' && typeof sig.label === 'string')
      ? saved.signatures
      : base.signatures;

  return {
    ...base,
    sections: validSections,
    signatures: validSignatures,
    hasTwoPages: validSections.some((s) => s.enabled && s.page === 2),
    passThreshold: isValidNumber(saved.passThreshold) ? saved.passThreshold : base.passThreshold,
    excellenceThreshold: isValidNumber(saved.excellenceThreshold)
      ? saved.excellenceThreshold
      : base.excellenceThreshold,
    brackets: validBrackets,
    styleConfig: {
      ...base.styleConfig,
      accentColor:
        typeof saved.styleConfig?.accentColor === 'string' && saved.styleConfig.accentColor
          ? saved.styleConfig.accentColor
          : base.styleConfig.accentColor,
      secondaryAccent:
        typeof saved.styleConfig?.secondaryAccent === 'string' && saved.styleConfig.secondaryAccent
          ? saved.styleConfig.secondaryAccent
          : base.styleConfig.secondaryAccent,
      borderStyle:
        saved.styleConfig?.borderStyle === 'section-banners' ||
        saved.styleConfig?.borderStyle === 'official-double' ||
        saved.styleConfig?.borderStyle === 'classic-grid' ||
        saved.styleConfig?.borderStyle === 'modern-minimal'
          ? saved.styleConfig.borderStyle
          : base.styleConfig.borderStyle,
      frameStyle: isValidFrameStyle(saved.styleConfig?.frameStyle)
        ? saved.styleConfig.frameStyle
        : base.styleConfig.frameStyle,
      fontFamily: isValidFontFamily(saved.styleConfig?.fontFamily)
        ? saved.styleConfig.fontFamily
        : base.styleConfig.fontFamily,
      fontScale:
        saved.styleConfig?.fontScale === 'compact' ||
        saved.styleConfig?.fontScale === 'standard' ||
        saved.styleConfig?.fontScale === 'comfortable'
          ? saved.styleConfig.fontScale
          : base.styleConfig.fontScale ?? 'standard',
      showOuterFrame:
        typeof saved.styleConfig?.showOuterFrame === 'boolean'
          ? saved.styleConfig.showOuterFrame
          : base.styleConfig.showOuterFrame,
      tableHeaderBg:
        saved.styleConfig?.tableHeaderBg === 'solid-accent' ||
        saved.styleConfig?.tableHeaderBg === 'tinted' ||
        saved.styleConfig?.tableHeaderBg === 'neutral'
          ? saved.styleConfig.tableHeaderBg
          : base.styleConfig.tableHeaderBg,
      chartType:
        saved.styleConfig?.chartType === 'bar' ||
        saved.styleConfig?.chartType === 'horizontal-bar' ||
        saved.styleConfig?.chartType === 'donut' ||
        saved.styleConfig?.chartType === 'gauss' ||
        saved.styleConfig?.chartType === 'none'
          ? saved.styleConfig.chartType
          : base.styleConfig.chartType,
    },
    headerConfig: {
      ...base.headerConfig,
      reportTitle:
        typeof saved.headerConfig?.reportTitle === 'string' && saved.headerConfig.reportTitle
          ? saved.headerConfig.reportTitle
          : base.headerConfig.reportTitle,
      ministryLine:
        typeof saved.headerConfig?.ministryLine === 'string' &&
        saved.headerConfig.ministryLine.trim()
          ? migrateLegacyMinistryLine(saved.headerConfig.ministryLine)
          : base.headerConfig.ministryLine,
      reportLanguage:
        saved.headerConfig?.reportLanguage === 'fr' ||
        saved.headerConfig?.reportLanguage === 'en'
          ? saved.headerConfig.reportLanguage
          : 'ar',
      includeFrenchHeader:
        typeof saved.headerConfig?.includeFrenchHeader === 'boolean'
          ? saved.headerConfig.includeFrenchHeader
          : base.headerConfig.includeFrenchHeader,
      teacherSignatureMode:
        saved.headerConfig?.teacherSignatureMode === 'image' ||
        saved.headerConfig?.teacherSignatureMode === 'manual'
          ? saved.headerConfig.teacherSignatureMode
          : base.headerConfig.teacherSignatureMode ?? 'manual',
      teacherSignatureText:
        typeof saved.headerConfig?.teacherSignatureText === 'string'
          ? saved.headerConfig.teacherSignatureText
          : base.headerConfig.teacherSignatureText ?? '',
      teacherSignatureImage:
        typeof saved.headerConfig?.teacherSignatureImage === 'string'
          ? saved.headerConfig.teacherSignatureImage
          : base.headerConfig.teacherSignatureImage ?? '',
    },
    pedagogicalContent: {
      ...base.pedagogicalContent,
      remediationNotes:
        typeof saved.remediationNotes === 'string'
          ? saved.remediationNotes
          : base.pedagogicalContent.remediationNotes,
    },
    remediationCardsConfig: saved.remediationCardsConfig
      ? {
          enabledInFullReport: Boolean(saved.remediationCardsConfig.enabledInFullReport),
          targetFilter:
            saved.remediationCardsConfig.targetFilter === 'below_excellence' ||
            saved.remediationCardsConfig.targetFilter === 'all'
              ? saved.remediationCardsConfig.targetFilter
              : 'struggling',
          includeAbsent:
            typeof saved.remediationCardsConfig.includeAbsent === 'boolean'
              ? saved.remediationCardsConfig.includeAbsent
              : true,
          cardsPerSheet: saved.remediationCardsConfig.cardsPerSheet === 2 ? 2 : 4,
          showParentSignature:
            typeof saved.remediationCardsConfig.showParentSignature === 'boolean'
              ? saved.remediationCardsConfig.showParentSignature
              : true,
          showCutGuides:
            typeof saved.remediationCardsConfig.showCutGuides === 'boolean'
              ? saved.remediationCardsConfig.showCutGuides
              : true,
          showPostSupportEval:
            typeof saved.remediationCardsConfig.showPostSupportEval === 'boolean'
              ? saved.remediationCardsConfig.showPostSupportEval
              : true,
          defaultExerciseTask:
            typeof saved.remediationCardsConfig.defaultExerciseTask === 'string' &&
            saved.remediationCardsConfig.defaultExerciseTask.trim()
              ? saved.remediationCardsConfig.defaultExerciseTask
              : 'إعادة إنجاز التمارين المتعثرة في دفتر البحث مع مراجعة القواعد الأساسية الملخصة.',
          sessionDate: '',
          customSelectedIds: [],
          studentOverrides: {},
        }
      : undefined,
  };
}

export function saveInstitutionSettings(
  metadata: MassarMetadata,
  template: ReportTemplateSchema
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const existing = loadSavedInstitutionSettings();
    const prevMeta = existing?.metadata;

    const pickNonEmpty = (key: keyof MassarMetadata, currentVal: string, prevVal?: string) => {
      const sanitizedCurrent = sanitizeMetadataField(key, currentVal);
      if (sanitizedCurrent) return sanitizedCurrent;
      return prevVal ? sanitizeMetadataField(key, prevVal) : '';
    };

    const payload: SavedInstitutionSettings = {
      templateId: template.id,
      sections: template.sections,
      signatures: template.signatures,
      metadata: {
        academy: pickNonEmpty('academy', metadata.academy, prevMeta?.academy),
        directorate: pickNonEmpty('directorate', metadata.directorate, prevMeta?.directorate),
        school: pickNonEmpty('school', metadata.school, prevMeta?.school),
        schoolYear: pickNonEmpty('schoolYear', metadata.schoolYear, prevMeta?.schoolYear),
        cycle: pickNonEmpty('cycle', metadata.cycle, prevMeta?.cycle),
        level: pickNonEmpty('level', metadata.level, prevMeta?.level),
        subject: pickNonEmpty('subject', metadata.subject, prevMeta?.subject),
        teacherName: pickNonEmpty('teacherName', metadata.teacherName, prevMeta?.teacherName),
        duration: metadata.duration || prevMeta?.duration || DEFAULT_METADATA.duration,
        coefficient:
          formatCoefficientAsPercentage(metadata.coefficient) ||
          prevMeta?.coefficient ||
          DEFAULT_METADATA.coefficient,
        remediationFormat:
          metadata.remediationFormat ||
          prevMeta?.remediationFormat ||
          DEFAULT_METADATA.remediationFormat,
      },
      passThreshold: template.passThreshold,
      excellenceThreshold: template.excellenceThreshold,
      brackets: template.brackets,
      styleConfig: {
        accentColor: template.styleConfig.accentColor,
        secondaryAccent: template.styleConfig.secondaryAccent,
        borderStyle: template.styleConfig.borderStyle,
        frameStyle: template.styleConfig.frameStyle,
        fontFamily: template.styleConfig.fontFamily,
        fontScale: template.styleConfig.fontScale ?? 'standard',
        showOuterFrame: template.styleConfig.showOuterFrame,
        tableHeaderBg: template.styleConfig.tableHeaderBg,
        chartType: template.styleConfig.chartType,
      },
      headerConfig: {
        reportTitle: template.headerConfig.reportTitle,
        ministryLine: template.headerConfig.ministryLine,
        reportLanguage: template.headerConfig.reportLanguage ?? 'ar',
        includeFrenchHeader: Boolean(template.headerConfig.includeFrenchHeader),
        teacherSignatureMode: template.headerConfig.teacherSignatureMode ?? 'manual',
        teacherSignatureText: template.headerConfig.teacherSignatureText ?? '',
        teacherSignatureImage: template.headerConfig.teacherSignatureImage ?? '',
      },
      remediationNotes: template.pedagogicalContent.remediationNotes ?? '',
      remediationCardsConfig: template.remediationCardsConfig
        ? {
            enabledInFullReport: template.remediationCardsConfig.enabledInFullReport,
            targetFilter:
              template.remediationCardsConfig.targetFilter === 'custom'
                ? 'struggling'
                : template.remediationCardsConfig.targetFilter,
            includeAbsent: template.remediationCardsConfig.includeAbsent,
            cardsPerSheet: template.remediationCardsConfig.cardsPerSheet,
            showParentSignature: template.remediationCardsConfig.showParentSignature,
            showCutGuides: template.remediationCardsConfig.showCutGuides,
            showPostSupportEval: template.remediationCardsConfig.showPostSupportEval,
            defaultExerciseTask: template.remediationCardsConfig.defaultExerciseTask,
          }
        : undefined,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedInstitutionSettings(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

export interface WorkspaceDraft {
  activeStep: AppStep;
  students: StudentRecord[];
  metadata: MassarMetadata;
  template: ReportTemplateSchema;
  workbookInfo: ParsedMassarWorkbook | null;
  itemDefinitions?: ExamItemDefinition[];
  studentItemScores?: StudentItemScores;
  isSampleMode?: boolean;
  updatedAt: string;
}

function isValidStudent(s: unknown): s is StudentRecord {
  if (!s || typeof s !== 'object') return false;
  const obj = s as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.order === 'number' &&
    typeof obj.fullName === 'string' &&
    typeof obj.isAbsent === 'boolean' &&
    (obj.score === null || typeof obj.score === 'number')
  );
}

export function loadWorkspaceDraft(): WorkspaceDraft | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WorkspaceDraft>;
    if (!parsed || typeof parsed !== 'object') return null;

    const students = Array.isArray(parsed.students)
      ? parsed.students.filter(isValidStudent)
      : [];

    const validStep: AppStep =
      parsed.activeStep === 'customize' ||
      parsed.activeStep === 'analytics' ||
      (parsed.activeStep === 'preview' && students.length > 0)
        ? parsed.activeStep
        : 'massar';

    const baseMeta = getInitialMetadata();
    const rawMeta = (parsed.metadata || {}) as Partial<MassarMetadata>;
    const metadata: MassarMetadata = {
      ...baseMeta,
      academy: readSanitizedField('academy', rawMeta.academy, baseMeta.academy),
      directorate: readSanitizedField('directorate', rawMeta.directorate, baseMeta.directorate),
      school: readSanitizedField('school', rawMeta.school, baseMeta.school),
      schoolYear: readSanitizedField('schoolYear', rawMeta.schoolYear, baseMeta.schoolYear),
      cycle: readSanitizedField('cycle', rawMeta.cycle, baseMeta.cycle),
      level: readSanitizedField('level', rawMeta.level, baseMeta.level),
      className: readSanitizedField('className', rawMeta.className, baseMeta.className),
      subject: readSanitizedField('subject', rawMeta.subject, baseMeta.subject),
      teacherName: readSanitizedField('teacherName', rawMeta.teacherName, baseMeta.teacherName),
      examNumber:
        typeof rawMeta.examNumber === 'string' ? rawMeta.examNumber : baseMeta.examNumber,
      semester: typeof rawMeta.semester === 'string' ? rawMeta.semester : baseMeta.semester,
      examDate: typeof rawMeta.examDate === 'string' ? rawMeta.examDate : baseMeta.examDate,
      correctionDate:
        typeof rawMeta.correctionDate === 'string'
          ? rawMeta.correctionDate
          : baseMeta.correctionDate,
      duration: typeof rawMeta.duration === 'string' ? rawMeta.duration : baseMeta.duration,
      coefficient:
        typeof rawMeta.coefficient === 'string'
          ? rawMeta.coefficient.trim() === '1'
            ? baseMeta.coefficient
            : formatCoefficientAsPercentage(rawMeta.coefficient) || baseMeta.coefficient
          : baseMeta.coefficient,
      examContent:
        typeof rawMeta.examContent === 'string' ? rawMeta.examContent : baseMeta.examContent,
      examCriteria:
        typeof rawMeta.examCriteria === 'string' ? rawMeta.examCriteria : baseMeta.examCriteria,
      gradingScaleNote:
        typeof rawMeta.gradingScaleNote === 'string'
          ? rawMeta.gradingScaleNote
          : baseMeta.gradingScaleNote,
      remediationFormat:
        typeof rawMeta.remediationFormat === 'string'
          ? rawMeta.remediationFormat
          : baseMeta.remediationFormat,
    };

    const baseTpl = getInitialTemplate();
    const rawTpl = parsed.template;
    let template = baseTpl;
    if (rawTpl && typeof rawTpl === 'object') {
      const migrateLegacyText = (text: string) => migrateLegacyMinistryLine(text);

      const filteredSections = Array.isArray(rawTpl.sections)
        ? rawTpl.sections
            .filter((s) => s && typeof s.type === 'string' && s.type !== 'remediation_roster')
            .map((s) => ({
              ...s,
              title: typeof s.title === 'string' ? migrateLegacyText(s.title) : s.title,
            }))
        : baseTpl.sections;
      const mergedHeader = {
        ...baseTpl.headerConfig,
        ...(rawTpl.headerConfig || {}),
      };
      if (!mergedHeader.ministryLine || !mergedHeader.ministryLine.trim()) {
        mergedHeader.ministryLine = baseTpl.headerConfig.ministryLine;
      } else {
        mergedHeader.ministryLine = migrateLegacyText(mergedHeader.ministryLine);
      }
      if (typeof mergedHeader.reportSubtitle === 'string') {
        mergedHeader.reportSubtitle = migrateLegacyText(mergedHeader.reportSubtitle);
      }

      const rawPed = rawTpl.pedagogicalContent || {};
      const mergedPed = {
        ...baseTpl.pedagogicalContent,
        ...rawPed,
        programmedRemediationBullets: Array.isArray(rawPed.programmedRemediationBullets)
          ? rawPed.programmedRemediationBullets.map((b: unknown) =>
              typeof b === 'string' ? migrateLegacyText(b) : String(b ?? '')
            )
          : baseTpl.pedagogicalContent.programmedRemediationBullets,
      };

      template = {
        ...baseTpl,
        ...rawTpl,
        name: typeof rawTpl.name === 'string' ? migrateLegacyText(rawTpl.name) : baseTpl.name,
        passThreshold: isValidNumber(rawTpl.passThreshold)
          ? rawTpl.passThreshold
          : baseTpl.passThreshold,
        excellenceThreshold: isValidNumber(rawTpl.excellenceThreshold)
          ? rawTpl.excellenceThreshold
          : baseTpl.excellenceThreshold,
        brackets:
          Array.isArray(rawTpl.brackets) &&
          rawTpl.brackets.length > 0 &&
          rawTpl.brackets.every(isValidBracket)
            ? rawTpl.brackets
            : baseTpl.brackets,
        sections: filteredSections.length > 0 ? filteredSections : baseTpl.sections,
        headerConfig: mergedHeader,
        styleConfig: {
          ...baseTpl.styleConfig,
          ...(rawTpl.styleConfig || {}),
        },
        pedagogicalContent: mergedPed,
      };
    }

    const workbookInfo =
      parsed.workbookInfo && typeof parsed.workbookInfo.fileName === 'string'
        ? parsed.workbookInfo
        : null;

    const itemDefinitions: ExamItemDefinition[] = Array.isArray(parsed.itemDefinitions)
      ? parsed.itemDefinitions.filter(
          (it): it is ExamItemDefinition =>
            Boolean(it && typeof it.id === 'string' && typeof it.label === 'string')
        )
      : [];
    const studentItemScores: StudentItemScores =
      parsed.studentItemScores && typeof parsed.studentItemScores === 'object'
        ? parsed.studentItemScores
        : {};

    return {
      activeStep: validStep,
      students,
      metadata,
      template,
      workbookInfo,
      itemDefinitions,
      studentItemScores,
      isSampleMode: Boolean(parsed.isSampleMode),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveWorkspaceDraft(draft: Omit<WorkspaceDraft, 'updatedAt'>): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const compactWorkbookInfo: ParsedMassarWorkbook | null = draft.workbookInfo
      ? {
          ...draft.workbookInfo,
          students: [],
        }
      : null;

    const payload: WorkspaceDraft = {
      activeStep: draft.activeStep,
      students: draft.students,
      metadata: draft.metadata,
      template: draft.template,
      workbookInfo: compactWorkbookInfo,
      itemDefinitions: draft.itemDefinitions ?? [],
      studentItemScores: draft.studentItemScores ?? {},
      isSampleMode: Boolean(draft.isSampleMode),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(WORKSPACE_DRAFT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearWorkspaceDraft(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(WORKSPACE_DRAFT_KEY);
  } catch {
    // Ignore storage errors
  }
}

