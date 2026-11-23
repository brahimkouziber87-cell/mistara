export interface StudentRecord {
  id: string;
  order: number;
  code: string;
  fullName: string;
  score: number | null;
  isAbsent: boolean;
  observation?: string;
}

export interface MassarMetadata {
  academy: string;
  directorate: string;
  school: string;
  schoolYear: string;
  cycle: string;
  level: string;
  className: string;
  subject: string;
  teacherName: string;
  examNumber: string;
  semester: string;
  examDate: string;
  correctionDate: string;
  duration: string;
  coefficient: string;
  examContent: string;
  examCriteria: string;
  gradingScaleNote: string;
  remediationFormat: string;
}

export interface MassarDetectedField {
  key: keyof MassarMetadata;
  label: string;
  value: string;
  source: 'cell' | 'inferred';
}

export interface MassarScoreColumnAnalysis {
  label: string;
  examNumber: string;
  filledCount: number;
  absentCount: number;
  average: number | null;
}

export interface MassarSheetSummary {
  name: string;
  studentCount: number;
  className?: string;
}

export interface ParsedMassarWorkbook {
  fileName: string;
  sheetNames: string[];
  activeSheet: string;
  availableScoreColumns: string[];
  selectedScoreColumn: string;
  selectedExamNumber: string;
  metadata: Partial<MassarMetadata>;
  students: StudentRecord[];
  headerRowNumber?: number;
  detectedFields?: MassarDetectedField[];
  scoreColumnsAnalysis?: MassarScoreColumnAnalysis[];
  sheetSummaries?: MassarSheetSummary[];
}

export interface ScoreBracket {
  id: string;
  label: string;
  min: number;
  max: number;
  inclusiveMax: boolean;
  appreciation: string;
  colorHex?: string;
}

export interface BracketStat {
  bracket: ScoreBracket;
  count: number;
  percentage: number;
  students: StudentRecord[];
}

export interface ComputedStats {
  total: number;
  present: number;
  absent: number;
  passed: number;
  failed: number;
  passRate: number;
  average: number;
  median: number;
  minScore: number;
  maxScore: number;
  stdDev: number;
  bracketsBreakdown: BracketStat[];
  topStudents: StudentRecord[];
  strugglingStudents: StudentRecord[];
  absentStudents: StudentRecord[];
  rankedStudents: StudentRecord[];
}

export type ReportSectionType =
  | 'metadata_grid'
  | 'exam_content_box'
  | 'kpi_summary'
  | 'brackets_table'
  | 'chart_distribution'
  | 'brackets_and_donut_split'
  | 'top_and_struggling'
  | 'pedagogical_diagnosis'
  | 'remediation_plan'
  | 'dual_roster_merit'
  | 'remediation_roster'
  | 'full_students_table'
  | 'custom_table'
  | 'custom_text'
  | 'signatures';

export interface ReportSection {
  id: string;
  type: ReportSectionType;
  title: string;
  enabled: boolean;
  page?: 1 | 2;
  description?: string;
  columns?: string[];
  rows?: string[][];
  bodyText?: string;
}

export interface SignatureSlot {
  id: string;
  label: string;
  sublabel?: string;
  page2Sublabel?: string;
  page2Footer?: string;
}

export interface RemediationRow {
  targetGroup: string;
  competencies: string;
  activity: string;
  timeframe: string;
}

export interface PedagogicalContent {
  generalObservation: string;
  strengths: string[];
  weaknesses: string[];
  remediationActions: RemediationRow[];
  programmedRemediationBullets: string[];
  remediationNotes?: string;
}

export type ReportLanguage = 'ar' | 'fr' | 'en';

export interface TemplateHeaderConfig {
  layout: 'three-column-moroccan' | 'centered' | 'two-column';
  countryLine: string;
  ministryLine: string;
  includeFrenchHeader: boolean;
  reportLanguage?: ReportLanguage;
  reportTitle: string;
  reportSubtitle: string;
  appendixTitle?: string;
}

export type ReportFontFamily =
  | 'cairo'
  | 'ibm-plex-sans-arabic'
  | 'amiri'
  | 'noto-kufi-arabic'
  | 'tajawal';

export type ReportFontScale = 'compact' | 'standard' | 'comfortable';

export interface TemplateStyleConfig {
  accentColor: string;
  secondaryAccent?: string;
  borderStyle: 'official-double' | 'classic-grid' | 'modern-minimal' | 'section-banners';
  fontFamily: ReportFontFamily;
  fontScale?: ReportFontScale;
  showOuterFrame: boolean;
  tableHeaderBg: 'tinted' | 'solid-accent' | 'neutral';
  chartType: 'bar' | 'horizontal-bar' | 'donut' | 'none';
}

export type RemediationCardTargetFilter =
  | 'struggling'
  | 'below_excellence'
  | 'all'
  | 'custom';

export type RemediationCardsPerSheet = 4 | 2;

export type PostSupportStatus = 'pending' | 'mastered' | 'in_progress' | 'needs_followup';

export interface StudentRemediationOverride {
  diagnosticText?: string;
  exerciseTask?: string;
  teacherNote?: string;
  postSupportStatus?: PostSupportStatus;
  postSupportScore?: number | null;
  postSupportDate?: string;
}

export interface PostRemediationStudentDelta {
  student: StudentRecord;
  preScore: number | null;
  postScore: number | null;
  delta: number | null;
  status: PostSupportStatus;
  postDate?: string;
}

export interface PostRemediationImpactSummary {
  targetedCount: number;
  evaluatedCount: number;
  pendingCount: number;
  masteredCount: number;
  inProgressCount: number;
  needsFollowupCount: number;
  recoveredPassCount: number;
  preAverage: number | null;
  postAverage: number | null;
  averageGain: number | null;
  recoveryRate: number;
  gapClosurePct: number | null;
  studentRows: PostRemediationStudentDelta[];
}

export interface RemediationCardsConfig {
  enabledInFullReport: boolean;
  targetFilter: RemediationCardTargetFilter;
  includeAbsent: boolean;
  cardsPerSheet: RemediationCardsPerSheet;
  showParentSignature: boolean;
  showCutGuides: boolean;
  showPostSupportEval: boolean;
  defaultExerciseTask: string;
  sessionDate: string;
  customSelectedIds?: string[];
  studentOverrides?: Record<string, StudentRemediationOverride>;
}

export interface ExamItemDefinition {
  id: string;
  label: string;
  competency: string;
  maxScore: number;
  remediationTask?: string;
}

// studentId -> itemId -> numeric score or null
export type StudentItemScores = Record<string, Record<string, number | null>>;

export interface ItemCompetencyStat {
  item: ExamItemDefinition;
  evaluatedCount: number;
  averageScore: number;
  masteryRate: number;
  weakStudentIds: string[];
  strongStudentIds: string[];
  status: 'mastered' | 'partial' | 'critical';
}

export interface ReportTemplateSchema {
  id: string;
  name: string;
  sourceType: 'preset' | 'analyzed-image' | 'analyzed-pdf' | 'analyzed-docx' | 'analyzed-text';
  sourceFileName?: string;
  analysisSummary?: string;
  detectedNotes?: string[];
  hasTwoPages?: boolean;
  headerConfig: TemplateHeaderConfig;
  styleConfig: TemplateStyleConfig;
  passThreshold: number;
  excellenceThreshold: number;
  brackets: ScoreBracket[];
  sections: ReportSection[];
  signatures: SignatureSlot[];
  pedagogicalContent: PedagogicalContent;
  remediationCardsConfig?: RemediationCardsConfig;
}

export interface ExamPdfAttachment {
  fileName: string;
  fileSize: number;
  pageCount: number;
  pageImages: string[];
  addedAt: string;
}

export interface ArchivedClassProjectSummary {
  total: number;
  present: number;
  absent: number;
  passed: number;
  failed: number;
  passRate: number;
  average: number;
  median: number;
  stdDev: number;
  minScore: number;
  maxScore: number;
}

export interface ArchivedClassProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isSample?: boolean;
  metadata: MassarMetadata;
  students: StudentRecord[];
  template: ReportTemplateSchema;
  itemDefinitions: ExamItemDefinition[];
  studentItemScores: StudentItemScores;
  examAttachment: ExamPdfAttachment | null;
  summaryStats: ArchivedClassProjectSummary;
}

export type PreviewDocumentMode = 'report' | 'cards' | 'both' | 'inspection';

export type AppStep = 'massar' | 'customize' | 'preview' | 'analytics';


