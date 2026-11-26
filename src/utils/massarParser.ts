import * as XLSX from 'xlsx';
import { getWordFontFamily, resolveBracketDisplayColor } from '../data/presets';
import {
  getLocalizedAppreciation,
  getReportLabels,
  translateBracketAppreciation,
} from '../data/reportI18n';
import {
  ComputedStats,
  ExamItemDefinition,
  ExamPdfAttachment,
  MassarDetectedField,
  MassarMetadata,
  MassarScoreColumnAnalysis,
  MassarSheetSummary,
  ParsedMassarWorkbook,
  RemediationCardsConfig,
  ReportTemplateSchema,
  ScoreBracket,
  StudentItemScores,
  StudentRecord,
} from '../types/report';

const MASSAR_CODE_SEARCH_REGEX = /\b[A-Z]{1,2}\d{4,10}\b/i;
const MASSAR_CODE_EXACT_REGEX = /^[A-Z]{1,2}\d{4,10}$/i;

function normalizeCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\s+/g, ' ').trim();
}

export function formatCoefficientAsPercentage(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = String(raw).replace(/,/g, '.').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!match) return '';
  let num = Number.parseFloat(match[1]);
  if (!Number.isFinite(num) || num < 0) return '';
  // Excel percentage-formatted cells read via raw:true arrive as fractions (e.g. 0.25 for 25%)
  if (!trimmed.includes('%') && num > 0 && num < 1) {
    num = num * 100;
  }
  const clamped = Math.min(100, num);
  const formatted = Number.isInteger(clamped)
    ? String(clamped)
    : String(Math.round(clamped * 100) / 100);
  return `${formatted}%`;
}

export function extractExamNumberFromHeader(rawLabel: string | undefined | null): string {
  if (!rawLabel) return '';
  const cleaned = normalizeDigitsToWestern(String(rawLabel))
    .replace(/\s*\((?:عمود\s+[A-Z]+|\d+)\)\s*$/i, '')
    .replace(/\s*—\s*(?:عمود\s+[A-Z]+|\d+)\s*$/i, '')
    .replace(/\s*[-–—]\s*(?:النقطة|نقطة|note|notes)\s*$/i, '')
    .replace(/^(?:نقطة|نقط|عمود|رقم)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || /^(?:عمود\s+النقط|النقطة|النقط|note|notes)$/i.test(cleaned)) {
    return 'الفرض المحروس رقم 1';
  }

  const norm = cleaned.replace(/[أإآ]/g, 'ا');
  if (
    /^(?:(?:ال)?فرض\s*(?:(?:ال)?محروس\s*)?|المراقبة\s*(?:المستمرة\s*)?)?(?:الاول|1|رقم\s*1|01)$|^(?:ف\s*1|cc\s*1|ds\s*1|devoir(?:\s*surveill[ée])?\s*1|note\s*1|contr[ôo]le(?:\s*continu)?\s*1)$/i.test(
      norm
    )
  ) {
    return 'الفرض المحروس رقم 1';
  }
  if (
    /^(?:(?:ال)?فرض\s*(?:(?:ال)?محروس\s*)?|المراقبة\s*(?:المستمرة\s*)?)?(?:الثاني|2|رقم\s*2|02)$|^(?:ف\s*2|cc\s*2|ds\s*2|devoir(?:\s*surveill[ée])?\s*2|note\s*2|contr[ôo]le(?:\s*continu)?\s*2)$/i.test(
      norm
    )
  ) {
    return 'الفرض المحروس رقم 2';
  }
  if (
    /^(?:(?:ال)?فرض\s*(?:(?:ال)?محروس\s*)?|المراقبة\s*(?:المستمرة\s*)?)?(?:الثالث|الثالت|3|رقم\s*3|03)$|^(?:ف\s*3|cc\s*3|ds\s*3|devoir(?:\s*surveill[ée])?\s*3|note\s*3|contr[ôo]le(?:\s*continu)?\s*3)$/i.test(
      norm
    )
  ) {
    return 'الفرض المحروس رقم 3';
  }
  if (
    /^(?:(?:ال)?فرض\s*(?:(?:ال)?محروس\s*)?|المراقبة\s*(?:المستمرة\s*)?)?(?:الرابع|4|رقم\s*4|04)$|^(?:ف\s*4|cc\s*4|ds\s*4|devoir(?:\s*surveill[ée])?\s*4|note\s*4|contr[ôo]le(?:\s*continu)?\s*4)$/i.test(
      norm
    )
  ) {
    return 'الفرض المحروس رقم 4';
  }
  if (/الانشطة\s*المندمجة|activit[ée]s?\s*int[ée]gr[ée]es?/i.test(norm)) {
    return 'الأنشطة المندمجة';
  }

  return cleaned;
}

function normalizeDigitsToWestern(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function normalizeDateToIso(raw: string): string {
  const str = normalizeDigitsToWestern(raw).trim();
  if (!str) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // YYYY/MM/DD or YYYY-M-D
  const ymdMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Excel serial date number (e.g., 44000..55000)
  if (/^\d{5}$/.test(str)) {
    const serial = Number.parseInt(str, 10);
    if (serial >= 36000 && serial <= 60000) {
      const utcDays = serial - 25569;
      const date = new Date(utcDays * 86400 * 1000);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }
  return str;
}

function parseScoreValue(raw: unknown): { score: number | null; isAbsent: boolean } {
  if (raw === null || raw === undefined || raw === '') {
    return { score: null, isAbsent: true };
  }
  if (typeof raw === 'number') {
    if (Number.isNaN(raw)) return { score: null, isAbsent: true };
    const clamped = Math.max(0, Math.min(20, Math.round(raw * 100) / 100));
    return { score: clamped, isAbsent: false };
  }
  const str = normalizeDigitsToWestern(String(raw)).trim();
  if (
    !str ||
    /^(غ|غائب|غياب|غير\s*منجز|abs|absent|ab|-|—|\/|n\/a|na|ne)$/i.test(str)
  ) {
    return { score: null, isAbsent: true };
  }
  // Strip trailing "/20" or "/ 20" before extracting numeric score so "14/20" is not parsed as 1420
  const withoutDenominator = str.replace(/\s*\/\s*20\b/g, '').trim();
  const normalized = withoutDenominator
    .replace(/[٫,]/g, '.')
    .replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) {
    return { score: null, isAbsent: true };
  }
  const clamped = Math.max(0, Math.min(20, Math.round(parsed * 100) / 100));
  return { score: clamped, isAbsent: false };
}

function normalizeArabicForMatch(text: string): string {
  return text.replace(/[أإآ]/g, 'ا').replace(/ـ+/g, '');
}

const METADATA_LABEL_PATTERN =
  /^(?:الاكاديمية|المديرية|النيابة|المؤسسة|اسم المؤسسة|رمز المؤسسة|رقم المؤسسة|الموسم|السنة الدراسية|المستوى|الشعبة|المسلك|القسم|الفوج|المادة|الاستاذ|اسم الاستاذ|استاذ المادة|المدرس|الدورة|الاسدوس|السلك|تاريخ\s*الفرض|تاريخ\s*الانجاز|تاريخ\s*التمرير|مدة\s*الانجاز|المدة|المعامل|رقم التلميذ|رقم الترتيب|رمز مسار|النسب|الاسم|تاريخ\s*الازدياد|ملاحظات|ملاحظة|تقدير|توقيع|خاتم|النقطة|النقط|الفرض|الانشطة|المراقبة المستمرة|المعدل|الرتبة|المجموع|académie|direction|délégation|etablissement|établissement|code\s+[ée]tablissement|année scolaire|niveau|filière|classe|groupe|matière|discipline|professeur|enseignant|semestre|cycle|date\s+du\s+contr[ôo]le|dur[ée]e|coefficient|observation[s]?|remarque[s]?|appr[ée]ciation|signature|cachet|note[s]?|devoir[s]?|moyenne|nom|pr[ée]nom|date\s+de\s+naissance|code\s+massar)\b/i;

const TABLE_HEADER_OR_NOISE_EXACT_PATTERN =
  /^(?:\(ة\)|ة|الاكاديمية|المديرية|النيابة|المؤسسة|اسم المؤسسة|رمز المؤسسة|رقم المؤسسة|الموسم الدراسي|الموسم|السنة الدراسية|المستوى الدراسي|المستوى|الشعبة|المسلك|القسم|الفوج|المادة الدراسية|مادة التدريس|المادة|الاستاذ(?:\s*\(ة\)|\s*[/\\]\s*ة)?|اسم الاستاذ(?:\s*\(ة\)|\s*[/\\]\s*ة)?|استاذ(?:\s*\(ة\)|\s*[/\\]\s*ة)?(?:\s+المادة)?|المدرس(?:\s*\(ة\)|\s*[/\\]\s*ة)?|الدورة|الاسدوس|السلك|تاريخ\s*الفرض|تاريخ\s*الانجاز|مدة\s*الانجاز|المدة|المعامل|ملاحظات(?:\s+الاستاذ(?:\s*\(ة\))?)?|ملاحظة(?:\s+الاستاذ(?:\s*\(ة\))?)?|تقدير(?:\s+الاستاذ(?:\s*\(ة\))?)?|توقيع(?:\s+الاستاذ(?:\s*\(ة\))?|\s+المدير|\s+المفتش)?|خاتم(?:\s+المؤسسة)?|النتائج|النقطة|النقط|نقط\s+المراقبة\s+المستمرة|معدل(?:\s+المراقبة|\s+القسم|\s+الدورة)?|الفرض(?:\s+(?:الاول|الثاني|الثالث|الثال[تث]|الرابع|\d+))?|الانشطة(?:\s+المندمجة)?|المراقبة المستمرة|الامتحان|الاختبار|النسب(?:\s+و\s*الاسم)?|الاسم(?:\s+الكامل|\s+و\s*النسب)?|تاريخ\s+الازدياد|رمز\s+مسار|رقم\s+(?:التلميذ|الترتيب|مسار)|الرتبة|المجموع|الحضور|الغياب|النوع|الجنس|المملكة المغربية|وزارة التربية الوطنية.*|académie|direction|délégation|etablissement|établissement|année scolaire|niveau|filière|classe|groupe|matière|discipline|professeur|enseignant|semestre|cycle|observation[s]?|remarque[s]?|appr[ée]ciation|signature|cachet|note[s]?|devoir[s]?|moyenne|nom(?:\s+et\s+pr[ée]nom)?|pr[ée]nom|code(?:\s+massar)?|date\s+de\s+naissance|total)$/i;

const NON_VALUE_FRAGMENT_PATTERN =
  /(?:ملاحظات|ملاحظة|تقدير|توقيع|خاتم|راي\s+الاستاذ|قرار\s+المجلس|رمز\s*مسار|تاريخ\s*الازدياد|رقم\s+التلميذ|الانشطة\s+المندمجة|المراقبة\s+المستمرة|الفرض\s+(?:الاول|الثاني|الثالث|الرابع|\d+)|observation[s]?|remarque[s]?|signature|cachet|date\s+de\s+naissance|code\s+massar)/i;

const KNOWN_MOROCCAN_SUBJECTS_PATTERN =
  /^(?:الرياضيات|الفيزياء\s*و\s*الكيمياء|الفيزياء|علوم\s*الحياة\s*و\s*الارض|اللغة\s*العربية|اللغة\s*الفرنسية|اللغة\s*الانجليزية|اللغة\s*الاسبانية|اللغة\s*الالمانية|اللغة\s*الايطالية|اللغة\s*الامازيغية|التاريخ\s*و\s*الجغرافيا|الاجتماعيات|التربية\s*الاسلامية|الفلسفة|المعلوميات|علوم\s*المهندس|التربية\s*البدنية(?:\s*و\s*الرياضية)?|التربية\s*الاسرية|التكنولوجيا\s*الصناعية|التربية\s*الفنية|التربية\s*الموسيقية|التربية\s*التشكيلية|النشاط\s*العلمي|Math[ée]matiques|Physique(?:\s*[-et]+\s*Chimie)?|SVT|Sciences\s+de\s+la\s+Vie\s+et\s+de\s+la\s+Terre|Français|Arabe|Anglais|Histoire(?:\s*[-et]+\s*G[ée]ographie)?|Philosophie|Informatique|Éducation\s+Islamique|Éducation\s+Physique)$/i;

const CLASS_CODE_REGEX =
  /\b(TCS[FL]?\s*[-]?\s*\d+|TCL\s*[-]?\s*\d+|TC[A-Z]{1,4}\s*[-]?\s*\d+|[12]BAC\s*[A-Z]{1,6}\s*[-]?\s*\d+|[123]A(?:C|PIC)\s*[-]?\s*\d+|G\s*[-]?\s*\d+)\b/i;

const METADATA_FIELD_LABELS: Record<keyof MassarMetadata, string> = {
  academy: 'الأكاديمية الجهوية',
  directorate: 'المديرية الإقليمية',
  school: 'المؤسسة التعليمية',
  schoolYear: 'الموسم الدراسي',
  cycle: 'السلك التعليمي',
  level: 'المستوى الدراسي',
  className: 'القسم / الفوج',
  subject: 'المادة الدراسية',
  teacherName: 'الأستاذ(ة)',
  examNumber: 'رقم الفرض المحروس',
  semester: 'الدورة الدراسية',
  examDate: 'تاريخ الإنجاز',
  correctionDate: 'تاريخ التصحيح',
  duration: 'مدة الإنجاز',
  coefficient: 'المعامل',
  examContent: 'مضامين الفرض',
  examCriteria: 'معايير التقويم',
  gradingScaleNote: 'سلم التنقيط',
  remediationFormat: 'صيغة الدعم',
};

function cleanExtractedValue(raw: string): string {
  const cleaned = raw
    .replace(/^[\s:：=\-–—•]+/, '')
    .replace(/[\s:：=\-–—•]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || /^[.\-_…/()]+$/.test(cleaned)) return '';
  return cleaned;
}

function isKnownMetadataLabel(text: string): boolean {
  const trimmed = normalizeArabicForMatch(normalizeCell(text));
  if (!trimmed) return false;
  return (
    METADATA_LABEL_PATTERN.test(trimmed) ||
    TABLE_HEADER_OR_NOISE_EXACT_PATTERN.test(trimmed) ||
    NON_VALUE_FRAGMENT_PATTERN.test(trimmed)
  );
}

export function sanitizeMetadataField(
  key: keyof MassarMetadata,
  rawValue: string | undefined | null
): string {
  if (!rawValue) return '';
  const cleaned = cleanExtractedValue(rawValue);
  if (!cleaned) return '';

  const normalizedForCheck = normalizeArabicForMatch(cleaned);

  if (key === 'examNumber') {
    if (/^(?:رقم\s*الفرض|الفرض\s*المحروس|الفرض|devoir|contr[ôo]le)$/i.test(normalizedForCheck)) {
      return '';
    }
    return extractExamNumberFromHeader(cleaned);
  }

  // Reject bare labels or table headers on any field
  if (TABLE_HEADER_OR_NOISE_EXACT_PATTERN.test(normalizedForCheck)) return '';
  if (NON_VALUE_FRAGMENT_PATTERN.test(normalizedForCheck)) return '';

  if (key === 'teacherName') {
    // Reject scores, digits-only strings, single characters, or standalone table column headers
    if (/^\d+([.,]\d+)?$/.test(cleaned)) return '';
    if (cleaned.length < 2) return '';
    if (
      /(?:^|\s)(?:النسب|الاسم|النقطة|النقط|المعدل|الفرض|الامتحان|الاختبار|المجموع|الحضور|الغياب|الرتبة|moyenne|note|devoir|nom|pr[ée]nom|total)(?:\s|$)/i.test(
        normalizedForCheck
      )
    ) {
      return '';
    }
  }

  if (key === 'schoolYear') {
    const western = normalizeDigitsToWestern(cleaned);
    if (!/\d/.test(western)) return '';
    const yearMatch = western.match(/(20\d{2}\s*[/\-]\s*20\d{2})/);
    if (yearMatch) {
      return yearMatch[1].replace(/\s+/g, '').replace('-', '/');
    }
  }

  if (key === 'examDate' || key === 'correctionDate') {
    return normalizeDateToIso(cleaned);
  }

  if (key === 'semester') {
    if (/^(?:1|الاولى|الأولى|الاسدوس الاول|الدورة الاولى|s1|semestre\s*1)$/i.test(normalizedForCheck)) {
      return 'الدورة الأولى';
    }
    if (/^(?:2|الثانية|الاسدوس الثاني|الدورة الثانية|s2|semestre\s*2)$/i.test(normalizedForCheck)) {
      return 'الدورة الثانية';
    }
  }

  return cleaned;
}

function isLikelyTableHeaderRow(row: unknown[]): boolean {
  const cells = row
    .map(normalizeCell)
    .filter(Boolean)
    .map(normalizeArabicForMatch);
  if (cells.length < 2) return false;

  let hits = 0;
  const isStandaloneHeader = (c: string, pattern: RegExp) =>
    !/[:：=]\s*\S+/.test(c) && pattern.test(c);

  if (cells.some((c) => isStandaloneHeader(c, /^(?:رقم\s*التلميذ|رمز\s*مسار|ر\.?ت|الرقم|code|massar|cne)$/i)))
    hits++;
  if (cells.some((c) => isStandaloneHeader(c, /^(?:الاسم(?:\s+الكامل|\s+و\s*النسب)?|النسب(?:\s+و\s*الاسم)?|اسم\s*التلميذ|nom.*|pr[ée]nom)$/i)))
    hits++;
  if (
    cells.some((c) =>
      isStandaloneHeader(
        c,
        /(?:^|\s)(?:فرض|نقطة|مراقبة|الفرض|الانشطة|ملاحظات|ملاحظة|تقدير|note|devoir|observation|remarque)/i
      )
    )
  ) {
    hits++;
  }
  if (cells.some((c) => isStandaloneHeader(c, /تاريخ\s*الازدياد|date\s+de\s+naissance/i))) hits++;
  return hits >= 2;
}

function inferLevelFromClassName(className: string): string | undefined {
  const c = className.toUpperCase().replace(/\s+/g, '');
  if (/^TCSF/.test(c)) return 'الجذع المشترك العلمي (خيار فرنسية)';
  if (/^TCS/.test(c)) return 'الجذع المشترك العلمي';
  if (/^TCL|^TCSH/.test(c)) return 'الجذع المشترك للآداب والعلوم الإنسانية';
  if (/^TCT/.test(c)) return 'الجذع المشترك التكنولوجي';
  if (/^1BACSEF|^1BACSE/.test(c)) return 'الأولى بكالوريا علوم تجريبية';
  if (/^1BACSM/.test(c)) return 'الأولى بكالوريا علوم رياضية';
  if (/^1BACSEG|^1BACECO/.test(c)) return 'الأولى بكالوريا علوم اقتصادية وتدبير';
  if (/^1BACL|^1BACSH/.test(c)) return 'الأولى بكالوريا آداب وعلوم إنسانية';
  if (/^2BACPC|^2BACSP/.test(c)) return 'الثانية بكالوريا علوم فيزيائية';
  if (/^2BACSVT/.test(c)) return 'الثانية بكالوريا علوم الحياة والأرض';
  if (/^2BACSM/.test(c)) return 'الثانية بكالوريا علوم رياضية';
  if (/^2BACSEG|^2BACECO/.test(c)) return 'الثانية بكالوريا علوم اقتصادية';
  if (/^2BACL|^2BACSH/.test(c)) return 'الثانية بكالوريا آداب وعلوم إنسانية';
  if (/^3A(C|PIC)/.test(c)) return 'الثالثة ثانوي إعدادي';
  if (/^2A(C|PIC)/.test(c)) return 'الثانية ثانوي إعدادي';
  if (/^1A(C|PIC)/.test(c)) return 'الأولى ثانوي إعدادي';
  return undefined;
}

function inferCycleFromText(text: string): string | undefined {
  if (!text) return undefined;
  if (/تأهيلي|تاهيلي|جذع|بكالوريا|باكالوريا|bac|tc|lycée/i.test(text)) {
    return 'السلك الثانوي التأهيلي';
  }
  if (/إعدادي|اعدادي|apic|\bac\b|collège/i.test(text)) {
    return 'السلك الثانوي الإعدادي';
  }
  if (/ابتدائي|مجموعة مدارس|primaire|école/i.test(text)) {
    return 'السلك الابتدائي';
  }
  return undefined;
}

function extractInlineAfterDelimiter(cell: string, normalizedLabelRegex: RegExp): string {
  // Handle "المؤسسة : الثانوية ..." or "المؤسسة - الثانوية ..." or "Classe = TCSF1"
  // Ignore leading RTL colon like ": الأستاذ(ة)"
  const withoutLeadingColon = cell.replace(/^[:：=\s]+/, '').trim();
  const colonMatch = withoutLeadingColon.match(/[:：=]\s*(.+)$/);
  if (colonMatch && colonMatch[1]) {
    return cleanExtractedValue(colonMatch[1]);
  }
  const normalized = normalizeArabicForMatch(withoutLeadingColon);
  const match = normalized.match(normalizedLabelRegex);
  if (match && match.index !== undefined) {
    // Strip the matched prefix length from the original (un-normalized) text when aligned at start
    if (match.index === 0) {
      const remainder = withoutLeadingColon.slice(match[0].length).trim();
      return cleanExtractedValue(remainder);
    }
  }
  return '';
}

function splitMultiKeyCellSegments(line: string): string[] {
  // Split lines that contain multiple "Label : Value   Label2 : Value2" pairs separated by 2+ spaces or tabs
  const parts = line
    .split(/\t+|\s{2,}(?=(?:الأكاديمية|الاكاديمية|المديرية|النيابة|المؤسسة|الموسم|السنة|السلك|المستوى|الشعبة|المسلك|القسم|الفوج|المادة|الأستاذ|الاستاذ|الدورة|الأسدوس|الاسدوس|تاريخ|المعامل|المدة|Académie|Direction|Établissement|Etablissement|Année|Niveau|Classe|Matière|Professeur|Semestre)\b)/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [line];
}

function extractMetadataFromRows(
  rows: unknown[][],
  merges: XLSX.Range[],
  headerIdx: number,
  activeSheet: string,
  fileName: string
): { metadata: Partial<MassarMetadata>; detectedFields: MassarDetectedField[] } {
  const meta: Partial<MassarMetadata> = {};
  const fieldSources = new Map<keyof MassarMetadata, 'cell' | 'inferred'>();
  const topLimit = headerIdx > 0 ? Math.min(rows.length, headerIdx) : Math.min(rows.length, 20);

  // Resolve merged cell values so multi-row/multi-column merged Massar headers align reliably
  const getCellRaw = (r: number, c: number): unknown => {
    const direct = rows[r]?.[c];
    if (normalizeCell(direct) !== '') return direct;
    for (const m of merges) {
      if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
        return rows[m.s.r]?.[m.s.c] ?? '';
      }
    }
    return direct ?? '';
  };

  const getRowWidth = (r: number): number => {
    let w = rows[r]?.length ?? 0;
    for (const m of merges) {
      if (r >= m.s.r && r <= m.e.r) {
        w = Math.max(w, m.e.c + 1);
      }
    }
    return w;
  };

  const assignFieldValue = (
    key: keyof MassarMetadata,
    val: string,
    source: 'cell' | 'inferred' = 'cell',
    overwrite = false
  ) => {
    const sanitized = sanitizeMetadataField(key, val);
    if (!sanitized) return;
    if (overwrite || !meta[key]) {
      meta[key] = sanitized;
      fieldSources.set(key, source);
    }
  };

  const scanRowRange = (startRow: number, endRow: number, restrictToTeacherAndOrg = false) => {
    for (let r = startRow; r < endRow; r++) {
      const row = rows[r] || [];
      if (isLikelyTableHeaderRow(row)) continue;

      const rowWidth = getRowWidth(r);
      if (restrictToTeacherAndOrg) {
        // Skip student records in bottom scan if row contains a Massar student code
        const rowSample = [getCellRaw(r, 0), getCellRaw(r, 1), getCellRaw(r, 2)]
          .map(normalizeCell)
          .join(' ');
        if (/\b[A-Z]\d{7,}\b/i.test(rowSample)) continue;
      }

      for (let c = 0; c < rowWidth; c++) {
        // Avoid re-processing interior columns of the same horizontal merge
        const directRaw = rows[r]?.[c];
        const rawCell = normalizeCell(directRaw) !== '' ? directRaw : getCellRaw(r, c);
        if (rawCell === null || rawCell === undefined || normalizeCell(rawCell) === '') continue;

        // If this cell inherits from a merge to the left on the same row, skip duplicate processing
        if (normalizeCell(directRaw) === '') {
          const sameRowMerge = merges.find(
            (m) => r >= m.s.r && r <= m.e.r && c > m.s.c && c <= m.e.c
          );
          if (sameRowMerge) continue;
        }

        const rawLines = String(rawCell)
          .split(/\r?\n/)
          .map((l) => l.replace(/\s+/g, ' ').trim())
          .filter(Boolean);

        const lines = rawLines.flatMap(splitMultiKeyCellSegments);

        for (const cell of lines) {
          const normCell = normalizeArabicForMatch(cell);

          const findAdjacentValue = (fieldKey: keyof MassarMetadata): string => {
            // 1. Scan forward across merged/empty columns on the same row
            const scanLimit = Math.min(Math.max(rowWidth, c + 15), c + 15);
            for (let k = c + 1; k < scanLimit; k++) {
              const v = normalizeCell(getCellRaw(r, k));
              if (!v || v === ':' || v === '：' || v === '-') continue;
              if (v === cell) continue;
              if (isKnownMetadataLabel(v)) break;
              const sanitized = sanitizeMetadataField(fieldKey, v);
              if (sanitized) return sanitized;
              break;
            }
            // 2. Scan directly below (stacked vertical header layout) if inside top header zone
            if (!restrictToTeacherAndOrg && r + 1 < topLimit) {
              const nextRow = rows[r + 1] || [];
              if (!isLikelyTableHeaderRow(nextRow)) {
                const below = normalizeCell(getCellRaw(r + 1, c));
                if (
                  below &&
                  below !== cell &&
                  below !== ':' &&
                  below !== '：' &&
                  !isKnownMetadataLabel(below)
                ) {
                  const sanitized = sanitizeMetadataField(fieldKey, below);
                  if (sanitized) return sanitized;
                }
              }
            }
            return '';
          };

          if (
            /^(?:[:：]\s*)?(?:الاكاديمية|أكاديمية|اكاديمية|académie)/i.test(normCell) ||
            (/الاكاديمية|أكاديمية|اكاديمية|académie/i.test(normCell) && /[:：]/.test(normCell))
          ) {
            const inline = sanitizeMetadataField(
              'academy',
              extractInlineAfterDelimiter(
                cell,
                /^(?:الاكاديمية الجهوية(?: للتربية والتكوين)?(?: لجهة)?|الاكاديمية|اكاديمية|académie(?:\s+régionale)?)/i
              )
            );
            assignFieldValue('academy', inline || findAdjacentValue('academy') || cell, 'cell');
            continue;
          }

          if (
            /^(?:[:：]\s*)?(?:المديرية|مديرية|م\.?\s*الاقليمية|النيابة|نيابة|délégation|direction)/i.test(normCell) ||
            (/(?:المديرية|م\.?\s*الاقليمية|النيابة|délégation|direction)/i.test(normCell) && /[:：]/.test(normCell))
          ) {
            const inline = sanitizeMetadataField(
              'directorate',
              extractInlineAfterDelimiter(
                cell,
                /^(?:المديرية الاقليمية(?:\s+ب)?|م\.?\s*الاقليمية|المديرية|مديرية|النيابة|نيابة|délégation|direction\s+provinciale)/i
              )
            );
            assignFieldValue(
              'directorate',
              inline || findAdjacentValue('directorate') || (/^المديرية الاقليمية\s+\S+/i.test(normCell) ? cell : ''),
              'cell'
            );
            continue;
          }

          if (
            /^(?:[:：]\s*)?(?:المؤسسة|اسم المؤسسة|مؤسسة|etablissement|établissement)/i.test(
              normCell
            ) ||
            (/المؤسسة|etablissement|établissement/i.test(normCell) &&
              !/رمز\s+المؤسسة|رقم\s+المؤسسة|خاتم\s+المؤسسة/i.test(normCell) &&
              /[:：]/.test(normCell))
          ) {
            const inline = sanitizeMetadataField(
              'school',
              extractInlineAfterDelimiter(
                cell,
                /^(?:اسم المؤسسة|المؤسسة التعليمية|المؤسسة|مؤسسة|établissement|etablissement)/i
              )
            );
            assignFieldValue('school', inline || findAdjacentValue('school'), 'cell');
            continue;
          }

          // Standalone institution name (e.g. "الثانوية التأهيلية ...")
          if (
            !meta.school &&
            /^(?:الثانوية التاهيلية|الثانوية الاعدادية|ثانوية|اعدادية|المدرسة الجماعاتية|مجموعة مدارس|مدرسة|Lycée|Collège|École)\s+\S+/i.test(
              normCell
            ) &&
            !/[:：]$/.test(cell)
          ) {
            assignFieldValue('school', cell, 'cell');
            continue;
          }

          if (
            !/ملاحظ|تقدير|توقيع|خاتم|راي|قرار|استمارة|بطاقة|تقرير|لائحة|observation|remarque|signature|cachet/i.test(
              normCell
            ) &&
            (/^(?:[:：]\s*)?(?:الاستاذ|اسم الاستاذ|استاذ|المدرس|professeur|enseignant)/i.test(
              normCell
            ) ||
              (/(?:الاستاذ|المدرس|professeur|enseignant)/i.test(normCell) && /[:：]/.test(normCell)))
          ) {
            const inline = sanitizeMetadataField(
              'teacherName',
              extractInlineAfterDelimiter(
                cell,
                /^(?:اسم الاستاذ(?:\s*\(ة\)|\s*[/\\]\s*ة)?(?:\s*المكلف(?:\(ة\))?)?|استاذ(?:\s*\(ة\)|\s*[/\\]\s*ة)?(?:\s*المادة)?|الاستاذ(?:\s*\(ة\)|\s*[/\\]\s*ة)?(?:\s*المكلف(?:\(ة\))?(?:\s*بالمادة)?)?|المدرس(?:\s*\(ة\)|\s*[/\\]\s*ة)?|professeur|enseignant(?:\(e\))?)/i
              )
            );
            assignFieldValue('teacherName', inline || findAdjacentValue('teacherName'), 'cell');
            continue;
          }

          if (restrictToTeacherAndOrg) continue;

          if (/الموسم|السنة الدراسية|année scolaire/i.test(normCell)) {
            const inline = sanitizeMetadataField(
              'schoolYear',
              extractInlineAfterDelimiter(
                cell,
                /^(?:الموسم الدراسي|الموسم|السنة الدراسية|année scolaire)/i
              )
            );
            assignFieldValue('schoolYear', inline || findAdjacentValue('schoolYear'), 'cell');
            continue;
          }

          // Standalone school year e.g. "2024/2025" or "2024 - 2025"
          if (!meta.schoolYear && /^(?:20\d{2}\s*[/\-]\s*20\d{2})$/.test(normCell)) {
            assignFieldValue('schoolYear', cell, 'cell');
            continue;
          }

          if (
            /^(?:[:：]\s*)?(?:السلك|cycle)/i.test(normCell) ||
            (/السلك|cycle/i.test(normCell) && /[:：]/.test(normCell))
          ) {
            const inline = sanitizeMetadataField(
              'cycle',
              extractInlineAfterDelimiter(cell, /^(?:السلك التعليمي|السلك الدراسي|السلك|cycle)/i)
            );
            assignFieldValue('cycle', inline || findAdjacentValue('cycle'), 'cell');
            continue;
          }

          if (
            /^(?:[:：]\s*)?(?:المستوى|الشعبة|المسلك|الفئة المستهدفة|niveau|filière|branche)/i.test(normCell) ||
            (/المستوى|الشعبة|المسلك|niveau|filière/i.test(normCell) && /[:：]/.test(normCell))
          ) {
            const inline = sanitizeMetadataField(
              'level',
              extractInlineAfterDelimiter(
                cell,
                /^(?:المستوى الدراسي|المستوى|الشعبة|المسلك|الفئة المستهدفة|niveau|filière|branche)/i
              )
            );
            assignFieldValue('level', inline || findAdjacentValue('level'), 'cell');
            continue;
          }

          if (
            /^(?:[:：]\s*)?(?:القسم|اسم القسم|الفوج|رمز القسم|classe|groupe)/i.test(normCell) ||
            (/القسم|الفوج|classe/i.test(normCell) && /[:：]/.test(normCell))
          ) {
            const inline = sanitizeMetadataField(
              'className',
              extractInlineAfterDelimiter(
                cell,
                /^(?:اسم القسم|رمز القسم|القسم|الفوج|classe|groupe)/i
              )
            );
            assignFieldValue('className', inline || findAdjacentValue('className'), 'cell');
            continue;
          }

          // Standalone class code inside top header zone (e.g. "TCSF-1" or "2BACPC-2")
          if (!meta.className && CLASS_CODE_REGEX.test(normCell) && normCell.length <= 18) {
            const m = normCell.match(CLASS_CODE_REGEX);
            if (m && m[1]) {
              assignFieldValue('className', m[1].replace(/\s+/g, ''), 'cell');
              continue;
            }
          }

          if (
            /^(?:[:：]\s*)?(?:المادة|المادة الدراسية|مادة التدريس|matière|discipline)/i.test(
              normCell
            ) ||
            (/المادة|matière|discipline/i.test(normCell) && /[:：]/.test(normCell))
          ) {
            const inline = sanitizeMetadataField(
              'subject',
              extractInlineAfterDelimiter(
                cell,
                /^(?:المادة الدراسية|مادة التدريس|المادة|matière|discipline)/i
              )
            );
            assignFieldValue('subject', inline || findAdjacentValue('subject'), 'cell');
            continue;
          }

          // Standalone Moroccan subject name in top header zone
          if (!meta.subject && KNOWN_MOROCCAN_SUBJECTS_PATTERN.test(normCell)) {
            assignFieldValue('subject', cell, 'cell');
            continue;
          }

          if (/الدورة|الاسدوس|semestre|période/i.test(normCell)) {
            if (/^(?:الدورة\s*(?:الاولى|الثانية|1|2)|الاسدوس\s*(?:الاول|الثاني|1|2)|semestre\s*[12])$/i.test(normCell)) {
              assignFieldValue('semester', cell, 'cell');
              continue;
            }
            const inline = sanitizeMetadataField(
              'semester',
              extractInlineAfterDelimiter(cell, /^(?:الدورة الدراسية|الدورة|الاسدوس|semestre|période)/i)
            );
            assignFieldValue('semester', inline || findAdjacentValue('semester'), 'cell');
            continue;
          }

          if (/تاريخ\s*(?:الفرض|الانجاز|التمرير|المراقبة)|date\s+du\s+(?:devoir|contr[ôo]le)/i.test(normCell)) {
            const inline = sanitizeMetadataField(
              'examDate',
              extractInlineAfterDelimiter(
                cell,
                /^(?:تاريخ\s*(?:الفرض|الانجاز|التمرير|المراقبة)|date\s+du\s+(?:devoir|contr[ôo]le))/i
              )
            );
            assignFieldValue('examDate', inline || findAdjacentValue('examDate'), 'cell');
            continue;
          }

          if (/^(?:[:：]\s*)?(?:مدة\s*الانجاز|المدة\s*الزمنية|المدة|dur[ée]e)/i.test(normCell)) {
            const inline = sanitizeMetadataField(
              'duration',
              extractInlineAfterDelimiter(cell, /^(?:مدة\s*الانجاز|المدة\s*الزمنية|المدة|dur[ée]e)/i)
            );
            assignFieldValue('duration', inline || findAdjacentValue('duration'), 'cell');
            continue;
          }

          if (/^(?:[:：]\s*)?(?:رقم\s*الفرض|الفرض\s*المحروس|n°?\s*du\s*(?:devoir|contr[ôo]le))/i.test(normCell)) {
            const inline = sanitizeMetadataField(
              'examNumber',
              extractInlineAfterDelimiter(
                cell,
                /^(?:رقم\s*الفرض(?:\s*المحروس)?|الفرض\s*المحروس|n°?\s*du\s*(?:devoir|contr[ôo]le))/i
              )
            );
            assignFieldValue('examNumber', inline || findAdjacentValue('examNumber'), 'cell');
            continue;
          }

          if (/^(?:[:：]\s*)?(?:المعامل|نسبة\s*الاهمية|coefficient)/i.test(normCell)) {
            const inline = sanitizeMetadataField(
              'coefficient',
              extractInlineAfterDelimiter(cell, /^(?:المعامل|نسبة\s*الاهمية|coefficient)/i)
            );
            const rawCoef = inline || findAdjacentValue('coefficient');
            if (rawCoef) {
              assignFieldValue('coefficient', formatCoefficientAsPercentage(rawCoef) || rawCoef, 'cell');
            }
            continue;
          }
        }
      }
    }
  };

  // Scan top header rows above student table
  scanRowRange(0, topLimit, false);

  // Also scan bottom rows (signature/teacher footer) if teacher or school wasn't found at top
  if (!meta.teacherName || !meta.school) {
    const bottomStart = Math.max(headerIdx + 2, rows.length - 12);
    if (bottomStart < rows.length) {
      scanRowRange(bottomStart, rows.length, true);
    }
  }

  // Fallback: infer className from sheet name if it looks like a real class code
  const genericSheetRegex =
    /^(sheet\s*\d*|feuil\s*\d*|feuille\s*\d*|ورقة\s*\d*|notes?|data|export|liste|massar|النقط|النتائج|جدول)$/i;
  if (!meta.className && activeSheet && !genericSheetRegex.test(activeSheet.trim())) {
    assignFieldValue('className', activeSheet.trim(), 'inferred');
  }

  // Fallback: infer className from file name if standard Massar class code appears
  if (!meta.className && fileName) {
    const baseName = fileName.replace(/\.(xlsx|xls|csv)$/i, '');
    const classCodeMatch = baseName.match(CLASS_CODE_REGEX);
    if (classCodeMatch) {
      assignFieldValue('className', classCodeMatch[1].replace(/\s+/g, ''), 'inferred');
    }
  }

  // Fallback: infer schoolYear from file name if present
  if (!meta.schoolYear && fileName) {
    const yearMatch = fileName.match(/(20\d{2}\s*[/\-_]\s*20\d{2})/);
    if (yearMatch) {
      assignFieldValue('schoolYear', yearMatch[1].replace('_', '/'), 'inferred');
    }
  }

  // Fallback: infer level from className if level is still empty
  if (!meta.level && meta.className) {
    const inferredLevel = inferLevelFromClassName(meta.className);
    if (inferredLevel) {
      assignFieldValue('level', inferredLevel, 'inferred');
    }
  }

  // Fallback: infer cycle from level, school, or className
  if (!meta.cycle) {
    const inferredCycle = inferCycleFromText(
      [meta.level, meta.school, meta.className].filter(Boolean).join(' ')
    );
    if (inferredCycle) {
      assignFieldValue('cycle', inferredCycle, 'inferred');
    }
  }

  const orderedKeys: (keyof MassarMetadata)[] = [
    'academy',
    'directorate',
    'school',
    'schoolYear',
    'cycle',
    'level',
    'className',
    'subject',
    'teacherName',
    'semester',
    'examNumber',
    'examDate',
    'duration',
    'coefficient',
  ];

  const detectedFields: MassarDetectedField[] = [];
  for (const key of orderedKeys) {
    const value = meta[key];
    if (value) {
      detectedFields.push({
        key,
        label: METADATA_FIELD_LABELS[key] || key,
        value,
        source: fieldSources.get(key) || 'cell',
      });
    }
  }

  return { metadata: meta, detectedFields };
}

function getMergedCellNormalized(
  rows: unknown[][],
  merges: XLSX.Range[],
  r: number,
  c: number
): string {
  const direct = normalizeCell(rows[r]?.[c]);
  if (direct) return direct;
  for (const m of merges) {
    if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) {
      return normalizeCell(rows[m.s.r]?.[m.s.c]);
    }
  }
  return '';
}

function getMaxRowWidth(rows: unknown[][], merges: XLSX.Range[], r: number): number {
  let w = rows[r]?.length ?? 0;
  for (const m of merges) {
    if (r >= m.s.r && r <= m.e.r) {
      w = Math.max(w, m.e.c + 1);
    }
  }
  return w;
}

function detectHeaderRow(rows: unknown[][], merges: XLSX.Range[] = []): number {
  let bestIndex = 0;
  let bestScore = -1;

  const limit = Math.min(rows.length, 40);
  for (let i = 0; i < limit; i++) {
    const width = getMaxRowWidth(rows, merges, i);
    const cells: string[] = [];
    for (let c = 0; c < width; c++) {
      const val = getMergedCellNormalized(rows, merges, i, c);
      if (val) cells.push(val);
    }
    if (cells.length < 2) continue;

    let score = 0;
    const joined = normalizeArabicForMatch(cells.join(' | '));
    // Ignore rows that look like a student data row (Massar code like R123456789 or G13001)
    if (MASSAR_CODE_SEARCH_REGEX.test(joined)) continue;

    if (/رقم|رمز|code|massar|cne|تلميذ|ر\.ت/i.test(joined)) score += 4;
    if (/الاسم|النسب|nom|prénom|الاسم الكامل/i.test(joined)) score += 5;
    if (/فرض|نقطة|مراقبة|note|devoir|الانشطة|cc/i.test(joined)) score += 3;
    if (/ملاحظات|ملاحظة|تقدير|observation|remarque/i.test(joined)) score += 2;
    if (/تاريخ\s*الازدياد|naissance/i.test(joined)) score += 2;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestScore >= 3 ? bestIndex : 0;
}

function isSubHeaderRow(
  rows: unknown[][],
  merges: XLSX.Range[],
  rowIndex: number
): boolean {
  if (rowIndex <= 0 || rowIndex >= rows.length) return false;
  const headerIdx = rowIndex - 1;
  const width = Math.max(
    getMaxRowWidth(rows, merges, headerIdx),
    getMaxRowWidth(rows, merges, rowIndex)
  );
  const directCells = (rows[rowIndex] || []).map(normalizeCell).filter(Boolean);
  if (directCells.length === 0) return false;

  const joinedDirect = normalizeArabicForMatch(directCells.join(' | '));
  // If row has a student Massar code (e.g., G134567890, R130045123, G13001), it's a student row, not a sub-header
  if (MASSAR_CODE_SEARCH_REGEX.test(joinedDirect)) return false;

  let subHeaderKeywordHits = 0;
  let bareExamNumberCols = 0;

  for (let c = 0; c < width; c++) {
    const rawDirect = normalizeCell(rows[rowIndex]?.[c]);
    if (!rawDirect) continue;
    const directVal = normalizeArabicForMatch(rawDirect);
    const topLabel = normalizeArabicForMatch(
      getMergedCellNormalized(rows, merges, headerIdx, c)
    );

    // If the column is a student Name column in headerIdx and rowIndex has a non-header name value, it's a student row
    if (
      /الاسم|النسب|التلميذ|المتعلم|nom|pr[eé]nom/i.test(topLabel) &&
      !/^(?:الاسم|النسب|الكامل|التلميذ|المتعلم|الاسم\s*الكامل|الاسم\s*والنسب|الاسم\s*و\s*النسب|nom|pr[eé]nom|nom\s*et\s*pr[eé]nom|full\s*name)$/i.test(
        directVal
      )
    ) {
      return false;
    }

    // If the column is a student Code column in headerIdx and rowIndex has an alphanumeric code, it's a student row
    if (
      /رمز|مسار|code|massar|cne/i.test(topLabel) &&
      /[A-Z0-9]{3,}/i.test(rawDirect) &&
      !/رمز|مسار|code|massar|cne/i.test(directVal)
    ) {
      return false;
    }

    if (
      /^(?:الفرض|فرض|ف\s*\d|نقطة|النقطة|الانشطة|مراقبة|ملاحظات|ملاحظة|تقدير|النشاط|note|devoir|cc|contr[ôo]le|activit|observation|remarque)$/i.test(
        directVal
      ) ||
      /(?:الفرض\s*(?:الاول|الثاني|الثالث|الرابع|\d+)|الانشطة\s*المندمجة|ملاحظات\s*الاستاذ)/i.test(
        directVal
      )
    ) {
      subHeaderKeywordHits++;
    } else if (
      /^(?:[1234]|0[1234])$/.test(normalizeDigitsToWestern(rawDirect)) &&
      /فرض|فروض|مراقبة|نقط|note|devoir|contr[ôo]le|cc/i.test(topLabel)
    ) {
      bareExamNumberCols++;
    }
  }

  return subHeaderKeywordHits >= 1 || bareExamNumberCols >= 2;
}

function parseSingleSheetCore(
  sheet: XLSX.WorkSheet,
  sheetName: string,
  fileName: string,
  targetScoreColumn?: string
): {
  headerIdx: number;
  metadata: Partial<MassarMetadata>;
  detectedFields: MassarDetectedField[];
  availableScoreColumns: string[];
  selectedScoreColumn: string;
  selectedExamNumber: string;
  scoreColumnsAnalysis: MassarScoreColumnAnalysis[];
  students: StudentRecord[];
} {
  const merges = sheet['!merges'] || [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  const headerIdx = detectHeaderRow(rows, merges);
  const hasSubHeader = isSubHeaderRow(rows, merges, headerIdx + 1);
  const dataStartRow = hasSubHeader ? headerIdx + 2 : headerIdx + 1;

  const { metadata, detectedFields } = extractMetadataFromRows(
    rows,
    merges,
    headerIdx,
    sheetName,
    fileName
  );

  const maxCols = Math.max(
    getMaxRowWidth(rows, merges, headerIdx),
    hasSubHeader ? getMaxRowWidth(rows, merges, headerIdx + 1) : 0
  );

  // Build effective column headers combining headerIdx and optional sub-header row (headerIdx + 1)
  const headerRow: string[] = [];
  const parentHeaderByCol: string[] = [];

  for (let c = 0; c < maxCols; c++) {
    const topLabel = getMergedCellNormalized(rows, merges, headerIdx, c);
    const subDirect = hasSubHeader ? normalizeCell(rows[headerIdx + 1]?.[c]) : '';
    const subMerged = hasSubHeader
      ? getMergedCellNormalized(rows, merges, headerIdx + 1, c)
      : '';

    const rawSubLabel = subDirect || (subMerged !== topLabel ? subMerged : '');
    const subLabel = /^[-–—_./]+$/.test(rawSubLabel) ? '' : rawSubLabel;
    const aboveTop =
      headerIdx > 0 ? getMergedCellNormalized(rows, merges, headerIdx - 1, c) : '';

    if (subLabel && topLabel && subLabel !== topLabel) {
      // If subLabel is a bare number (1, 2, 3, 4) or generic ("النقطة") under an exam/CC header, combine them
      if (
        /^(?:[1234]|0[1234]|النقطة|نقطة|note)$/i.test(normalizeDigitsToWestern(subLabel)) &&
        /فرض|فروض|مراقبة|نقط|note|devoir|contr[ôo]le/i.test(normalizeArabicForMatch(topLabel))
      ) {
        headerRow[c] = /^[1234]|^0[1234]/.test(normalizeDigitsToWestern(subLabel))
          ? `الفرض ${normalizeDigitsToWestern(subLabel)}`
          : `${topLabel} - ${subLabel}`;
      } else {
        headerRow[c] = subLabel;
      }
      parentHeaderByCol[c] = topLabel;
    } else {
      headerRow[c] = subLabel || topLabel;
      parentHeaderByCol[c] = aboveTop;
    }
  }

  let codeCol = -1;
  let fullNameCol = -1;
  let lastNameCol = -1;
  let firstNameCol = -1;
  let orderCol = -1;
  let obsCol = -1;

  const candidateScoreCols: { index: number; rawLabel: string; label: string }[] = [];

  headerRow.forEach((header, idx) => {
    if (!header) return;
    const h = normalizeArabicForMatch(header.toLowerCase());

    if (
      codeCol === -1 &&
      /massar|code|cne|الرمز|رمز\s*مسار|رقم\s*التلميذ|رقم\s*مسار/i.test(h)
    ) {
      codeCol = idx;
      return;
    }
    if (orderCol === -1 && /^(الرقم|ر\.ت|رت|n°|num|رقم\s*الترتيب)$/i.test(h)) {
      orderCol = idx;
      return;
    }
    if (
      fullNameCol === -1 &&
      /النسب\s*و\s*الاسم|الاسم\s*و\s*النسب|الاسم\s*الكامل|اسم\s*التلميذ|nom.*pr[ée]nom|[ée]l[èe]ves?|التلميذ/i.test(
        h
      )
    ) {
      fullNameCol = idx;
      return;
    }
    if (lastNameCol === -1 && /^(النسب|nom|اللقب)$/i.test(h)) {
      lastNameCol = idx;
      return;
    }
    if (firstNameCol === -1 && /^(الاسم|الاسم\s*الشخصي|pr[ée]nom)$/i.test(h)) {
      firstNameCol = idx;
      return;
    }
    if (obsCol === -1 && /ملاحظة|ملاحظات|تقدير|observation|remarque|appr[ée]ciation/i.test(h)) {
      obsCol = idx;
      return;
    }
    if (/تاريخ|date|naissance|النوع|الجنس|genre|sexe|مكان\s*الازدياد/i.test(h)) {
      return;
    }
    // Skip summary average columns (e.g., "معدل المراقبة المستمرة", "المعدل العام", "Moyenne")
    if (/^(?:معدل|المعدل|moyenne)\b/i.test(h)) {
      return;
    }
    if (
      /فرض|نقطة|النقط|مراقبة|note|devoir|cc|contr[ôo]le|الانشطة|امتحان|اختبار|ف\s*[1234]/i.test(
        h
      )
    ) {
      candidateScoreCols.push({ index: idx, rawLabel: header, label: header });
    }
  });

  // Fallback name/code detection from actual student data rows if headers were non-standard
  if (codeCol === -1 || (fullNameCol === -1 && lastNameCol === -1)) {
    const sampleEnd = Math.min(rows.length, dataStartRow + 15);
    for (let c = 0; c < maxCols; c++) {
      if (c === orderCol || c === obsCol) continue;
      let massarCodeHits = 0;
      let nameHits = 0;
      for (let r = dataStartRow; r < sampleEnd; r++) {
        const cellVal = normalizeCell(rows[r]?.[c]);
        if (!cellVal) continue;
        if (MASSAR_CODE_EXACT_REGEX.test(cellVal)) massarCodeHits++;
        else if (
          cellVal.length >= 5 &&
          !/^\d/.test(cellVal) &&
          !/^(غ|غائب|abs|absent)$/i.test(cellVal) &&
          /[\u0600-\u06FFa-zA-Z]{2,}\s+[\u0600-\u06FFa-zA-Z]{2,}/.test(cellVal)
        ) {
          nameHits++;
        }
      }
      if (codeCol === -1 && massarCodeHits >= 2) {
        codeCol = c;
      } else if (fullNameCol === -1 && lastNameCol === -1 && c !== codeCol && nameHits >= 2) {
        fullNameCol = c;
      }
    }
  }

  // Fallback if no explicit score column header matched: scan numeric columns below header
  if (candidateScoreCols.length === 0) {
    for (let idx = 0; idx < maxCols; idx++) {
      const header = headerRow[idx] || '';
      if (
        idx === codeCol ||
        idx === fullNameCol ||
        idx === lastNameCol ||
        idx === firstNameCol ||
        idx === orderCol ||
        idx === obsCol
      ) {
        continue;
      }
      if (/تاريخ|date|naissance|النوع|الجنس|رقم|رمز/i.test(header)) continue;

      let numericHits = 0;
      for (let r = dataStartRow; r < Math.min(rows.length, dataStartRow + 20); r++) {
        const val = rows[r]?.[idx];
        if (typeof val === 'number' && val >= 0 && val <= 20) numericHits++;
        else if (typeof val === 'string' && /^\d{1,2}([.,]\d{1,2})?$/.test(val.trim())) {
          const n = Number.parseFloat(val.replace(',', '.'));
          if (n >= 0 && n <= 20) numericHits++;
        }
      }
      if (numericHits >= 2) {
        const fallbackLabel = header || `الفرض المحروس رقم ${candidateScoreCols.length + 1}`;
        candidateScoreCols.push({
          index: idx,
          rawLabel: header || fallbackLabel,
          label: fallbackLabel,
        });
      }
    }
  }

  // Fallback name column by loose header match if still missing
  if (fullNameCol === -1 && lastNameCol === -1) {
    headerRow.forEach((h, idx) => {
      if (
        fullNameCol === -1 &&
        idx !== codeCol &&
        !candidateScoreCols.some((c) => c.index === idx) &&
        /اسم|نسب|nom|name/i.test(h)
      ) {
        fullNameCol = idx;
      }
    });
  }

  // Disambiguate duplicate score column labels cleanly without adding Excel column letters
  const labelCounts = new Map<string, number>();
  for (const col of candidateScoreCols) {
    labelCounts.set(col.label, (labelCounts.get(col.label) || 0) + 1);
  }
  const seenLabels = new Set<string>();
  const duplicateIndex = new Map<string, number>();
  for (const col of candidateScoreCols) {
    let finalLabel = col.label;
    if ((labelCounts.get(col.label) || 0) > 1) {
      const parentLabel = parentHeaderByCol[col.index] || '';
      const nth = (duplicateIndex.get(col.label) || 0) + 1;
      duplicateIndex.set(col.label, nth);
      if (
        parentLabel &&
        parentLabel !== col.label &&
        /دورة|اسدوس|semestre|période/i.test(normalizeArabicForMatch(parentLabel))
      ) {
        finalLabel = `${col.label} — ${parentLabel}`;
      } else {
        finalLabel = `${col.label} (${nth})`;
      }
    }
    let counter = 2;
    const baseLabel = finalLabel;
    while (seenLabels.has(finalLabel)) {
      finalLabel = `${baseLabel} (${counter})`;
      counter++;
    }
    seenLabels.add(finalLabel);
    col.label = finalLabel;
  }

  // Collect valid student row indices first so we can analyze all score columns accurately
  const validStudentRows: {
    rowIndex: number;
    order: number;
    code: string;
    fullName: string;
    observation?: string;
  }[] = [];
  let seq = 1;

  for (let r = dataStartRow; r < rows.length; r++) {
    const row = rows[r] || [];
    const nonEmptyCount = row.filter((v) => normalizeCell(v) !== '').length;
    if (nonEmptyCount === 0) continue;

    let fullName = '';
    if (fullNameCol !== -1) {
      fullName = normalizeCell(row[fullNameCol]);
    } else if (lastNameCol !== -1 || firstNameCol !== -1) {
      const ln = lastNameCol !== -1 ? normalizeCell(row[lastNameCol]) : '';
      const fn = firstNameCol !== -1 ? normalizeCell(row[firstNameCol]) : '';
      fullName = `${ln} ${fn}`.trim();
    }

    const code = codeCol !== -1 ? normalizeCell(row[codeCol]) : `ST-${seq}`;
    const rawOrder = orderCol !== -1 ? normalizeCell(row[orderCol]) : '';

    // Skip footer/summary/signature rows
    const normName = normalizeArabicForMatch(fullName);
    if (
      /^(المجموع|المعدل|moyenne|total|عدد|نسبة|اعلى\s*نقطة|ادنى\s*نقطة|توقيع|خاتم|الاستاذ|المدير)/i.test(
        normName
      )
    ) {
      continue;
    }
    if (!fullName && !code) continue;
    if (!fullName) continue;

    const observation = obsCol !== -1 ? normalizeCell(row[obsCol]) : undefined;
    validStudentRows.push({
      rowIndex: r,
      order: Number.parseInt(rawOrder, 10) || seq,
      code: code || `${seq}`,
      fullName,
      observation: observation || undefined,
    });
    seq++;
  }

  // Compute per-column statistics across all valid student rows
  const scoreColumnsAnalysis: MassarScoreColumnAnalysis[] = candidateScoreCols.map((col) => {
    let filledCount = 0;
    let absentCount = 0;
    let sum = 0;

    for (const stRow of validStudentRows) {
      const cellVal = rows[stRow.rowIndex]?.[col.index];
      const parsed = parseScoreValue(cellVal);
      if (!parsed.isAbsent && parsed.score !== null) {
        filledCount++;
        sum += parsed.score;
      } else {
        absentCount++;
      }
    }

    return {
      label: col.label,
      examNumber: extractExamNumberFromHeader(col.rawLabel),
      filledCount,
      absentCount,
      average: filledCount > 0 ? Math.round((sum / filledCount) * 100) / 100 : null,
    };
  });

  const availableScoreColumns = candidateScoreCols.map((c) => c.label);

  // Smart column selection: if user didn't explicitly pick a column, choose the first column that actually has grades (filledCount > 0)
  const firstPopulatedColumn = scoreColumnsAnalysis.find((c) => c.filledCount > 0)?.label;
  const selectedScoreColumn =
    targetScoreColumn && availableScoreColumns.includes(targetScoreColumn)
      ? targetScoreColumn
      : firstPopulatedColumn || availableScoreColumns[0] || '';

  const scoreColObj = candidateScoreCols.find((c) => c.label === selectedScoreColumn);
  const activeScoreIdx = scoreColObj ? scoreColObj.index : -1;
  const colExamNumber = scoreColObj
    ? extractExamNumberFromHeader(scoreColObj.rawLabel)
    : '';
  const selectedExamNumber =
    colExamNumber &&
    (!/^(?:عمود\s+النقط|النقطة|النقط|note|notes)$/i.test(scoreColObj?.rawLabel || '') ||
      !metadata.examNumber)
      ? colExamNumber
      : metadata.examNumber || 'الفرض المحروس رقم 1';

  metadata.examNumber = selectedExamNumber;

  // Ensure examNumber is also listed in detectedFields
  const existingExamFieldIdx = detectedFields.findIndex((f) => f.key === 'examNumber');
  if (selectedExamNumber) {
    if (existingExamFieldIdx !== -1) {
      detectedFields[existingExamFieldIdx].value = selectedExamNumber;
    } else {
      detectedFields.push({
        key: 'examNumber',
        label: METADATA_FIELD_LABELS.examNumber,
        value: selectedExamNumber,
        source: 'cell',
      });
    }
  }

  const students: StudentRecord[] = validStudentRows.map((stRow, idx) => {
    const parsed =
      activeScoreIdx !== -1
        ? parseScoreValue(rows[stRow.rowIndex]?.[activeScoreIdx])
        : { score: null, isAbsent: true };

    return {
      id: `row-${stRow.rowIndex}-${idx + 1}`,
      order: stRow.order,
      code: stRow.code,
      fullName: stRow.fullName,
      score: parsed.score,
      isAbsent: parsed.isAbsent,
      observation: stRow.observation,
    };
  });

  return {
    headerIdx,
    metadata,
    detectedFields,
    availableScoreColumns,
    selectedScoreColumn,
    selectedExamNumber,
    scoreColumnsAnalysis,
    students,
  };
}

export function parseMassarSheet(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName?: string,
  targetScoreColumn?: string
): ParsedMassarWorkbook {
  const sheetNames = workbook.SheetNames;

  // Inspect all sheets in the workbook to build sheetSummaries and auto-select the best sheet when targetSheetName is omitted
  const sheetSummaries: MassarSheetSummary[] = [];
  const cachedSheetResults = new Map<
    string,
    ReturnType<typeof parseSingleSheetCore>
  >();

  for (const name of sheetNames) {
    const sh = workbook.Sheets[name];
    if (!sh) continue;
    const parsedCore = parseSingleSheetCore(
      sh,
      name,
      fileName,
      name === targetSheetName ? targetScoreColumn : undefined
    );
    cachedSheetResults.set(name, parsedCore);
    sheetSummaries.push({
      name,
      studentCount: parsedCore.students.length,
      className: parsedCore.metadata.className,
    });
  }

  const firstPopulatedSheet = sheetSummaries.find((s) => s.studentCount > 0)?.name;
  const activeSheet =
    targetSheetName && sheetNames.includes(targetSheetName)
      ? targetSheetName
      : firstPopulatedSheet || sheetNames[0] || '';

  const activeCore =
    (activeSheet && cachedSheetResults.get(activeSheet)) ||
    parseSingleSheetCore(
      workbook.Sheets[activeSheet] || {},
      activeSheet,
      fileName,
      targetScoreColumn
    );

  // If targetScoreColumn was passed for activeSheet, ensure it was evaluated with targetScoreColumn
  const finalCore =
    targetScoreColumn && activeCore.selectedScoreColumn !== targetScoreColumn
      ? parseSingleSheetCore(
          workbook.Sheets[activeSheet] || {},
          activeSheet,
          fileName,
          targetScoreColumn
        )
      : activeCore;

  return {
    fileName,
    sheetNames,
    activeSheet,
    availableScoreColumns: finalCore.availableScoreColumns,
    selectedScoreColumn: finalCore.selectedScoreColumn,
    selectedExamNumber: finalCore.selectedExamNumber,
    metadata: finalCore.metadata,
    students: finalCore.students,
    headerRowNumber: finalCore.headerIdx + 1,
    detectedFields: finalCore.detectedFields,
    scoreColumnsAnalysis: finalCore.scoreColumnsAnalysis,
    sheetSummaries,
  };
}

export async function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  const isCsvLike = /\.(?:csv|tsv|txt)$/i.test(file.name) || file.type === 'text/csv';
  if (isCsvLike) {
    let text = '';
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      try {
        text = new TextDecoder('windows-1256').decode(buffer);
      } catch {
        text = new TextDecoder('utf-8').decode(buffer);
      }
    }
    return XLSX.read(text, { type: 'string' });
  }
  return XLSX.read(buffer, { type: 'array' });
}

export function computeExamStats(
  students: StudentRecord[],
  brackets: ScoreBracket[],
  passThreshold = 10,
  excellenceThreshold = 16
): ComputedStats {
  const presentStudents = students.filter((s) => !s.isAbsent && s.score !== null);
  const absentStudents = students.filter((s) => s.isAbsent);
  const absentCount = absentStudents.length;

  const scores = presentStudents.map((s) => s.score as number).sort((a, b) => a - b);
  const present = presentStudents.length;

  const passedStudents = presentStudents.filter((s) => (s.score as number) >= passThreshold);
  const failedStudents = presentStudents.filter((s) => (s.score as number) < passThreshold);

  const sum = scores.reduce((acc, v) => acc + v, 0);
  const average = present > 0 ? sum / present : 0;

  let median = 0;
  if (present > 0) {
    const mid = Math.floor(present / 2);
    median = present % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
  }

  const minScore = present > 0 ? scores[0] : 0;
  const maxScore = present > 0 ? scores[present - 1] : 0;

  const variance =
    present > 0
      ? scores.reduce((acc, v) => acc + Math.pow(v - average, 2), 0) / present
      : 0;
  const stdDev = Math.sqrt(variance);

  const bracketsBreakdown = brackets.map((bracket, idx) => {
    const nextBracket = brackets[idx + 1];
    // Prevent dead zones when a user enters e.g. max=4.99 and next min=5.00
    const effectiveMax =
      !bracket.inclusiveMax &&
      nextBracket &&
      nextBracket.min > bracket.max &&
      nextBracket.min - bracket.max <= 0.05
        ? nextBracket.min
        : bracket.max;

    const matched = presentStudents.filter((s) => {
      const sc = s.score as number;
      const lowerOk = sc >= bracket.min;
      const upperOk = bracket.inclusiveMax ? sc <= effectiveMax : sc < effectiveMax;
      return lowerOk && upperOk;
    });
    return {
      bracket,
      count: matched.length,
      percentage: present > 0 ? (matched.length / present) * 100 : 0,
      students: matched,
    };
  });

  const topStudents = [...presentStudents]
    .filter((s) => (s.score as number) >= excellenceThreshold)
    .sort((a, b) => (b.score as number) - (a.score as number));

  const strugglingStudents = [...failedStudents].sort(
    (a, b) => (a.score as number) - (b.score as number)
  );

  const rankedStudents = [...students].sort((a, b) => {
    const aAbsent = a.isAbsent || a.score === null;
    const bAbsent = b.isAbsent || b.score === null;
    const scoreA = aAbsent ? 0 : (a.score as number);
    const scoreB = bAbsent ? 0 : (b.score as number);
    const diff = scoreB - scoreA;
    if (diff !== 0) return diff;
    if (aAbsent !== bAbsent) return aAbsent ? 1 : -1;
    return a.order - b.order;
  });

  return {
    total: students.length,
    present,
    absent: absentCount,
    passed: passedStudents.length,
    failed: failedStudents.length,
    passRate: present > 0 ? (passedStudents.length / present) * 100 : 0,
    average,
    median,
    minScore,
    maxScore,
    stdDev,
    bracketsBreakdown,
    topStudents,
    strugglingStudents,
    absentStudents,
    rankedStudents,
  };
}

export interface DocimologicalSummary {
  range: number;
  homogeneityCode: 'high' | 'moderate' | 'dispersed';
  homogeneityLabel: string;
  homogeneityBadge: string;
  masteryCode: 'strong' | 'moderate' | 'weak';
  masteryLabel: string;
  distributionSkewLabel: string;
  enrichmentCount: number;
  enrichmentPct: number;
  consolidationCount: number;
  consolidationPct: number;
  remediationCount: number;
  remediationPct: number;
}

export function getStudentAppreciation(
  score: number | null,
  isAbsent: boolean,
  passThreshold = 10,
  excellenceThreshold = 16
): { ar: string; fr: string; full: string } {
  if (isAbsent || score === null) {
    return { ar: 'غائب', fr: 'Absent', full: 'غائب (Absent)' };
  }
  const safePass = Math.max(0, Math.min(19, passThreshold));
  const safeExcellence = Math.max(safePass + 1, Math.min(20, excellenceThreshold));
  const spanAbovePass = Math.max(1.5, safeExcellence - safePass);
  const goodCut = Math.round((safePass + (spanAbovePass * 2) / 3) * 100) / 100;
  const fairCut = Math.round((safePass + spanAbovePass / 3) * 100) / 100;
  const severeCut = Math.max(4, Math.floor(safePass / 2));

  if (score >= safeExcellence) return { ar: 'ممتاز', fr: 'Très bien', full: 'ممتاز (Très bien)' };
  if (score >= goodCut) return { ar: 'جيد', fr: 'Bien', full: 'جيد (Bien)' };
  if (score >= fairCut) return { ar: 'مستحسن', fr: 'Assez bien', full: 'مستحسن (Assez bien)' };
  if (score >= safePass) return { ar: 'متوسط', fr: 'Passable', full: 'متوسط (Passable)' };
  if (score >= severeCut) {
    return { ar: 'دون المتوسط', fr: 'Insuffisant', full: 'دون المتوسط (Insuffisant)' };
  }
  return { ar: 'تعثر حاد', fr: 'Faible', full: 'تعثر حاد (Faible)' };
}

export function computeDocimologicalSummary(
  stats: ComputedStats,
  passThreshold = 10,
  _excellenceThreshold = 16
): DocimologicalSummary {
  if (stats.present === 0) {
    return {
      range: 0,
      homogeneityCode: 'moderate',
      homogeneityLabel: 'لا توجد نقط مرصودة بعد',
      homogeneityBadge: 'بانتظار النقط',
      masteryCode: 'moderate',
      masteryLabel: 'في انتظار رصد نقط الحاضرين',
      distributionSkewLabel: 'لا تتوفر بيانات كافية للتحليل الإحصائي',
      enrichmentCount: 0,
      enrichmentPct: 0,
      consolidationCount: 0,
      consolidationPct: 0,
      remediationCount: 0,
      remediationPct: 0,
    };
  }

  const range = Math.max(0, stats.maxScore - stats.minScore);

  let homogeneityCode: 'high' | 'moderate' | 'dispersed' = 'moderate';
  let homogeneityLabel = 'تجانس اعتدالي (توزيع طبيعي للمكتسبات)';
  let homogeneityBadge = 'تجانس اعتدالي';

  if (stats.stdDev < 2.2) {
    homogeneityCode = 'high';
    homogeneityLabel = 'متجانس جداً (تقارب مستويات التملك)';
    homogeneityBadge = 'قسم متجانس';
  } else if (stats.stdDev > 3.5) {
    homogeneityCode = 'dispersed';
    homogeneityLabel = 'تشتت مرتفع (فوارق فردية تستلزم التفريق البيداغوجي)';
    homogeneityBadge = 'تشتت وفوارق فردية';
  }

  let masteryCode: 'strong' | 'moderate' | 'weak' = 'moderate';
  let masteryLabel = `تحكم نسبي (عتبة ${passThreshold}/20 — يستوجب دعماً مواكباً لتثبيت التعلمات)`;
  if (stats.passRate >= 70) {
    masteryCode = 'strong';
    masteryLabel = 'تحكم جماعي إيجابي (إرساء سليم للكفايات المستهدفة)';
  } else if (stats.passRate < 50) {
    masteryCode = 'weak';
    masteryLabel = 'تعثر جماعي (يستوجب دعماً استدراكياً مركزاً)';
  }

  const diffMedAvg = stats.median - stats.average;
  const distributionSkewLabel =
    Math.abs(diffMedAvg) < 0.35
      ? 'توزيع متماثل متوازن حول المعدل'
      : diffMedAvg > 0
      ? 'توزيع مائل نحو الفئات المتحكمة (الوسيط أعلى من المعدل)'
      : 'توزيع متأثر بالنقط الدنيا (المعدل أعلى من الوسيط)';

  const enrichmentCount = stats.topStudents.length;
  const remediationCount = stats.failed;
  const consolidationCount = Math.max(0, stats.passed - enrichmentCount);

  const enrichmentPct = (enrichmentCount / stats.present) * 100;
  const consolidationPct = (consolidationCount / stats.present) * 100;
  const remediationPct = (remediationCount / stats.present) * 100;

  return {
    range,
    homogeneityCode,
    homogeneityLabel,
    homogeneityBadge,
    masteryCode,
    masteryLabel,
    distributionSkewLabel,
    enrichmentCount,
    enrichmentPct,
    consolidationCount,
    consolidationPct,
    remediationCount,
    remediationPct,
  };
}

export function escapeHtml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportReportToWordDoc(
  template: ReportTemplateSchema,
  metadata: MassarMetadata,
  stats: ComputedStats,
  students: StudentRecord[],
  examAttachment?: ExamPdfAttachment | null,
  extraAppendixHtml?: string,
  itemDefinitions: ExamItemDefinition[] = [],
  studentItemScores: StudentItemScores = {}
): void {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const textAlign = labels.dir === 'rtl' ? 'right' : 'left';
  const oppositeAlign = labels.dir === 'rtl' ? 'left' : 'right';
  const paddingSide = labels.dir === 'rtl' ? 'padding-right:16px;' : 'padding-left:16px;';

  const accent = /^#[0-9a-fA-F]{3,8}$/.test(template.styleConfig.accentColor || '')
    ? template.styleConfig.accentColor
    : '#0f766e';
  const secondaryAccent = /^#[0-9a-fA-F]{3,8}$/.test(template.styleConfig.secondaryAccent || '')
    ? template.styleConfig.secondaryAccent || '#1e293b'
    : '#1e293b';
  const font = getWordFontFamily(template.styleConfig.fontFamily);

  const formatNum = (n: number) => n.toFixed(2);
  const formatPct = (n: number) => `${n.toFixed(1)}%`;
  const esc = escapeHtml;
  const docimology = computeDocimologicalSummary(
    stats,
    template.passThreshold,
    template.excellenceThreshold
  );

  const thBgStyle =
    template.styleConfig.tableHeaderBg === 'solid-accent'
      ? `background:${accent}; color:#ffffff;`
      : template.styleConfig.tableHeaderBg === 'tinted'
      ? `background:${accent}18; color:${accent};`
      : 'background:#f1f5f9; color:#0f172a;';
  const secondaryThBgStyle =
    template.styleConfig.tableHeaderBg === 'solid-accent'
      ? `background:${secondaryAccent}; color:#ffffff;`
      : template.styleConfig.tableHeaderBg === 'tinted'
      ? `background:${secondaryAccent}18; color:${secondaryAccent};`
      : 'background:#f1f5f9; color:#0f172a;';
  const useStripeTint = template.styleConfig.tableStripeTint !== false;
  const primaryRowBg = useStripeTint ? `${accent}0a` : '#f8fafc';
  const secondaryRowBg = useStripeTint ? `${secondaryAccent}0a` : '#f8fafc';

  const enabledSections = template.sections.filter((s) => s.enabled);

  const countryLineDisplay =
    lang === 'ar'
      ? template.headerConfig.countryLine || labels.countryLine
      : labels.countryLine;
  const ministryLineDisplay =
    lang === 'ar'
      ? template.headerConfig.ministryLine || labels.ministryLine
      : labels.ministryLine;
  const reportTitleDisplay =
    lang === 'ar'
      ? template.headerConfig.reportTitle || labels.defaultReportTitle
      : template.headerConfig.reportTitle &&
          template.headerConfig.reportTitle !== 'بطاقة تقرير وتتبع الفرض المحروس'
        ? template.headerConfig.reportTitle
        : labels.defaultReportTitle;
  const reportSubtitleDisplay =
    lang === 'ar'
      ? template.headerConfig.reportSubtitle
      : labels.defaultReportSubtitle;

  const getLocalizedSectionTitle = (sec: { type: string; title: string }) => {
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

  const renderHeaderHtml = () => {
    if (template.headerConfig.layout === 'three-column-moroccan') {
      return `
        <table style="width:100%; border-collapse:collapse; border-bottom:2px solid ${accent}; margin-bottom:12px;">
          <tr>
            <td style="width:36%; text-align:${textAlign}; font-size:11.5px; line-height:1.55; vertical-align:top;">
              <strong>${esc(countryLineDisplay)}</strong><br/>
              <strong>${esc(ministryLineDisplay)}</strong><br/>
              ${metadata.academy ? `${esc(metadata.academy)}<br/>` : ''}
              ${metadata.directorate ? `${esc(metadata.directorate)}<br/>` : ''}
              <strong>${esc(labels.schoolLabel)}: ${esc(metadata.school || '—')}</strong>
            </td>
            <td style="width:28%; text-align:center; vertical-align:middle; padding:6px;">
              <div style="border:1.5px solid ${accent}; padding:6px 10px; font-weight:bold; color:${accent}; font-size:14.5px;">
                ${esc(reportTitleDisplay)}<br/>
                <span style="font-size:12px;">${esc(metadata.examNumber)} — ${esc(metadata.semester)}</span>
              </div>
              ${reportSubtitleDisplay ? `<div style="font-size:9.5px; color:#475569; margin-top:3px;">${esc(reportSubtitleDisplay)}</div>` : ''}
              <div style="font-size:10.5px; color:#334155; margin-top:4px; font-weight:bold;">
                ${esc(metadata.subject ? `${labels.subjectPrefix} ${metadata.subject}` : '')}${metadata.cycle ? ` · ${esc(metadata.cycle)}` : ''}
              </div>
              <div style="font-size:10.5px; color:#475569; margin-top:2px;">${esc(labels.schoolYearLabel)}: ${esc(metadata.schoolYear || '—')}</div>
            </td>
            <td style="width:36%; text-align:${oppositeAlign}; font-size:11px; line-height:1.55; vertical-align:top; direction:${template.headerConfig.includeFrenchHeader && lang === 'ar' ? 'ltr' : labels.dir};">
              ${
                template.headerConfig.includeFrenchHeader && lang === 'ar'
                  ? `<strong>Royaume du Maroc</strong><br/>${esc(getReportLabels('fr').ministryLine)}<br/>Année scolaire : ${esc(metadata.schoolYear || '—')}<br/>Matière : ${esc(metadata.subject || '—')}<br/>Classe : ${esc(metadata.className || '—')}${metadata.level ? ` (${esc(metadata.level)})` : ''}`
                  : `<div style="text-align:${oppositeAlign};"><strong>${esc(labels.subjectPrefix)}</strong> ${esc(metadata.subject || '—')}<br/><strong>${esc(labels.levelLabel)}:</strong> ${esc(metadata.level || metadata.cycle || '—')}<br/><strong>${esc(labels.classLabel)}:</strong> ${esc(metadata.className || '—')}<br/><strong>${esc(labels.teacherLabel)}:</strong> ${esc(metadata.teacherName || '—')}<br/><span style="font-size:10px; color:#475569;">${esc(labels.memoRefLabel)}</span></div>`
              }
            </td>
          </tr>
        </table>
      `;
    }
    return `
      <div style="text-align:center; border-bottom:2px solid ${accent}; padding-bottom:10px; margin-bottom:12px;">
        <div style="font-size:12px; color:#334155; font-weight:bold;">${esc(countryLineDisplay)} — ${esc(ministryLineDisplay)}</div>
        <div style="font-size:11.5px; color:#475569;">${[metadata.academy, metadata.directorate, metadata.school].filter(Boolean).map(esc).join(' · ') || '—'}</div>
        <h1 style="margin:6px 0 3px; font-size:18px; color:${accent};">${esc(reportTitleDisplay)} (${esc(metadata.examNumber)} — ${esc(metadata.semester)})</h1>
        <div style="font-size:11px; color:#475569;">${esc(reportSubtitleDisplay)}</div>
      </div>
    `;
  };

  const sectionTitleHtml = (title: string) =>
    `<h2 style="font-size:13px; color:#ffffff; background:${accent}; padding:5px 10px; margin:12px 0 6px; border-radius:3px;">${esc(title)}</h2>`;

  const bodyParts = enabledSections.map((sec) => {
    const secTitle = getLocalizedSectionTitle(sec);
    switch (sec.type) {
      case 'metadata_grid':
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:10px;">
            <tr>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaClassLevel)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${esc(metadata.className || '—')}${metadata.level ? ` (${esc(metadata.level)})` : ''}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaTeacher)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px;">${esc(metadata.teacherName || '—')}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaExamDate)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px;">${esc(metadata.examDate || '—')}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaCorrectionDate)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px;">${esc(metadata.correctionDate || '—')}</td>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaDuration)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px;">${esc(metadata.duration || '—')}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaCoefficient)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; direction:ltr;">${esc(formatCoefficientAsPercentage(metadata.coefficient) || '—')}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaClassStructure)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px;">${stats.total} ${esc(labels.studentShort)} (${stats.present} ${esc(labels.presentShort)} · ${stats.absent} ${esc(labels.absentShort)})</td>
              <td style="border:1px solid #cbd5e1; padding:5px; background:#f8fafc; font-weight:bold;">${esc(labels.metaPassAvg)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; color:#047857;">${formatPct(stats.passRate)} (${formatNum(stats.average)}/20)</td>
            </tr>
          </table>
        `;
      case 'exam_content_box':
        return `
          ${sectionTitleHtml(secTitle)}
          <div style="border:1px solid #cbd5e1; padding:8px; font-size:11.5px; margin-bottom:10px; line-height:1.65;">
            <div><strong>${esc(labels.targetedCompetenciesLabel)}</strong> ${esc(metadata.examContent || labels.defaultExamTopic)}</div>
            <div><strong>${esc(labels.examCriteriaLabel)}</strong> ${esc(metadata.examCriteria || '—')}</div>
            <div><strong>${esc(labels.gradingScaleLabel)}</strong> ${esc(metadata.gradingScaleNote || '—')}</div>
          </div>
        `;
      case 'kpi_summary':
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; text-align:center; margin-bottom:6px;">
            <tr style="${thBgStyle}">
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiEnrolled)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiPresent)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiAbsent)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiMaxScore)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiMinScore)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiAverage)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiMedian)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiStdDev)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiMastered)} (≥${template.passThreshold})</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.kpiBelowPass)} (&lt;${template.passThreshold})</th>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${stats.total}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${stats.present}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; color:#b91c1c;">${stats.absent}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; color:#047857;">${formatNum(stats.maxScore)} / 20</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; color:#b91c1c;">${formatNum(stats.minScore)} / 20</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; color:${accent};">${formatNum(stats.average)} / 20</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; color:#4338ca;">${formatNum(stats.median)} / 20</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${formatNum(stats.stdDev)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; background:#ecfdf5; color:#065f46;">${stats.passed} (${formatPct(stats.passRate)})</td>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; background:#fef2f2; color:#991b1b;">${stats.failed} (${formatPct(stats.present > 0 ? (stats.failed / stats.present) * 100 : 0)})</td>
            </tr>
          </table>
        `;
      case 'brackets_table':
      case 'brackets_and_donut_split':
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; text-align:center; margin-bottom:10px;">
            <tr style="${thBgStyle}">
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.bracketColRange)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.bracketColAppreciation)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.bracketColCount)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.bracketColPct)}</th>
            </tr>
            ${stats.bracketsBreakdown
              .map(
                (b, idx) => {
                  const brColor = resolveBracketDisplayColor(
                    b.bracket,
                    idx,
                    template.styleConfig
                  );
                  return `
              <tr style="${idx % 2 === 1 ? `background:${primaryRowBg};` : ''}">
                <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold; direction:ltr;">${esc(b.bracket.label)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;"><span style="display:inline-block; width:8px; height:8px; background:${brColor}; margin:0 4px;"></span>${esc(translateBracketAppreciation(b.bracket.appreciation, lang))}</td>
                <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${b.count}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">${formatPct(b.percentage)}</td>
              </tr>`;
                }
              )
              .join('')}
          </table>
        `;
      case 'gauss_curve_chart':
      case 'chart_distribution':
        if (sec.type === 'chart_distribution' && template.styleConfig.chartType === 'none') return '';
        return `
          ${sectionTitleHtml(secTitle)}
          <div style="font-size:10.5px; color:#334155; margin-bottom:5px; font-weight:bold;">
            منحنى التوزيع الطبيعي (Courbe de Gauss): N(μ = ${formatNum(stats.average)}, σ = ${formatNum(stats.stdDev)}) · الوسيط Me = ${formatNum(stats.median)}/20
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px;">
            <tr style="${thBgStyle}">
              <th style="border:1px solid #cbd5e1; padding:5px; width:22%;">${esc(labels.bracketColRange)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px; width:24%;">${esc(labels.bracketColAppreciation)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px; width:40%;">${esc(labels.chartSectionTitle)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px; width:14%;">${esc(labels.bracketColCount)}</th>
            </tr>
            ${stats.bracketsBreakdown
              .map((b, idx) => {
                const resolvedColor = resolveBracketDisplayColor(
                  b.bracket,
                  idx,
                  template.styleConfig
                );
                const barColor = /^#[0-9a-fA-F]{3,8}$/.test(resolvedColor || '')
                  ? resolvedColor
                  : accent;
                const widthPct = Math.max(2, Math.round(b.percentage));
                return `
              <tr style="${idx % 2 === 1 ? `background:${primaryRowBg};` : ''}">
                <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:bold; direction:ltr;">${esc(b.bracket.label)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:bold;">${esc(translateBracketAppreciation(b.bracket.appreciation, lang))}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">
                  <div style="background:#f1f5f9; width:100%; height:12px;">
                    <div style="background:${barColor}; width:${widthPct}%; height:12px;"></div>
                  </div>
                </td>
                <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:bold;">${b.count} (${formatPct(b.percentage)})</td>
              </tr>`;
              })
              .join('')}
          </table>
        `;
      case 'top_and_struggling':
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:10px;">
            <tr style="${thBgStyle}">
              <th style="border:1px solid #cbd5e1; padding:5px; width:50%;">${esc(labels.topStudentsTitle)} (≥ ${template.excellenceThreshold}/20) — ${stats.topStudents.length}</th>
              <th style="border:1px solid #cbd5e1; padding:5px; width:50%;">${esc(labels.strugglingStudentsTitle)} (&lt; ${template.passThreshold}/20) — ${stats.strugglingStudents.length}</th>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1; padding:7px; vertical-align:top;">
                ${
                  stats.topStudents.length
                    ? stats.topStudents.map((s) => `${esc(s.fullName)} (${s.score?.toFixed(2)})`).join(' · ')
                    : esc(labels.noTopStudents)
                }
              </td>
              <td style="border:1px solid #cbd5e1; padding:7px; vertical-align:top;">
                ${
                  stats.strugglingStudents.length
                    ? stats.strugglingStudents.map((s) => `${esc(s.fullName)} (${s.score?.toFixed(2)})`).join(' · ')
                    : esc(labels.noStrugglingStudents)
                }
              </td>
            </tr>
          </table>
        `;
      case 'pedagogical_diagnosis': {
        const hasStrengths = template.pedagogicalContent.strengths.length > 0;
        const hasWeaknesses = template.pedagogicalContent.weaknesses.length > 0;
        const hasRemediation = template.pedagogicalContent.programmedRemediationBullets.length > 0;
        const diagColCount = Math.max(
          1,
          (hasStrengths ? 1 : 0) + (hasWeaknesses ? 1 : 0) + (hasRemediation ? 1 : 0)
        );
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:10px;">
            ${
              template.pedagogicalContent.generalObservation?.trim()
                ? `<tr>
                     <td colspan="${diagColCount}" style="border:1px solid #cbd5e1; background:#f8fafc; padding:7px;">
                       <strong>${esc(labels.generalObsLabel)}</strong> ${esc(template.pedagogicalContent.generalObservation.trim())}
                     </td>
                   </tr>`
                : ''
            }
            ${
              hasStrengths || hasWeaknesses || hasRemediation
                ? `<tr style="background:#f1f5f9;">
                     ${hasStrengths ? `<th style="border:1px solid #cbd5e1; padding:5px; color:#065f46;">${esc(labels.strengthsTitle)}</th>` : ''}
                     ${hasWeaknesses ? `<th style="border:1px solid #cbd5e1; padding:5px; color:#991b1b;">${esc(labels.weaknessesTitle)}</th>` : ''}
                     ${hasRemediation ? `<th style="border:1px solid #cbd5e1; padding:5px; color:${accent};">${esc(labels.remediationBulletsTitle)}</th>` : ''}
                   </tr>
                   <tr>
                     ${
                       hasStrengths
                         ? `<td style="border:1px solid #cbd5e1; padding:7px; vertical-align:top;">
                              <ul style="margin:0; ${paddingSide}">${template.pedagogicalContent.strengths.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
                            </td>`
                         : ''
                     }
                     ${
                       hasWeaknesses
                         ? `<td style="border:1px solid #cbd5e1; padding:7px; vertical-align:top;">
                              <ul style="margin:0; ${paddingSide}">${template.pedagogicalContent.weaknesses.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
                            </td>`
                         : ''
                     }
                     ${
                       hasRemediation
                         ? `<td style="border:1px solid #cbd5e1; padding:7px; vertical-align:top;">
                              <ul style="margin:0; ${paddingSide}">${template.pedagogicalContent.programmedRemediationBullets.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
                            </td>`
                         : ''
                     }
                   </tr>`
                : ''
            }
            ${
              template.pedagogicalContent.remediationNotes?.trim() || metadata.remediationFormat?.trim()
                ? `<tr>
                     <td colspan="${diagColCount}" style="border:1px solid #cbd5e1; background:#f0fdfa; padding:7px;">
                       ${metadata.remediationFormat?.trim() ? `<div><strong>${esc(labels.remediationFormatLabel)}</strong> ${esc(metadata.remediationFormat.trim())}</div>` : ''}
                       ${template.pedagogicalContent.remediationNotes?.trim() ? `<div><strong>${esc(labels.remediationNotesLabel)}</strong> ${esc(template.pedagogicalContent.remediationNotes.trim())}</div>` : ''}
                     </td>
                   </tr>`
                : ''
            }
          </table>
        `;
      }
      case 'remediation_plan':
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:11.5px; margin-bottom:10px;">
            <tr style="${thBgStyle}">
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.targetGroupCol)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.competenciesCol)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.activityCol)}</th>
              <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.timeframeCol)}</th>
            </tr>
            ${template.pedagogicalContent.remediationActions
              .map(
                (r, idx) => `
              <tr style="${idx % 2 === 1 ? `background:${primaryRowBg};` : ''}">
                <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${esc(r.targetGroup)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">${esc(r.competencies)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">${esc(r.activity)}</td>
                <td style="border:1px solid #cbd5e1; padding:5px;">${esc(r.timeframe)}</td>
              </tr>`
              )
              .join('')}
          </table>
        `;
      case 'dual_roster_merit': {
        const cellPad = students.length > 32 ? '1.5px 3px' : '2.5px 4px';
        const rowFont = students.length > 32 ? '9.5px' : '10.5px';
        const appendixTitleDisplay =
          lang === 'ar'
            ? template.headerConfig.appendixTitle || labels.defaultAppendixTitle
            : labels.defaultAppendixTitle;
        return `
          <div style="page-break-before:always;"></div>
          <div style="border-bottom:2px solid ${accent}; padding-bottom:6px; margin-bottom:8px;">
            <div style="font-size:10.5px; color:#334155;">
              <strong>${esc(countryLineDisplay)} · ${esc(ministryLineDisplay)}</strong>
              ${metadata.school ? ` · ${esc(metadata.school)}` : ''}
              ${metadata.subject ? ` · ${esc(labels.subjectPrefix)} ${esc(metadata.subject)}` : ''}
              ${metadata.teacherName ? ` · ${esc(labels.teacherLabel)}: ${esc(metadata.teacherName)}` : ''}
            </div>
            <h2 style="margin:4px 0; font-size:14px; color:${accent}; text-align:center;">
              ${esc(labels.appendixPrefix)} ${esc(metadata.examNumber)} (${esc(metadata.semester)}): ${esc(appendixTitleDisplay)}
            </h2>
            <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:4px 8px; font-size:10.5px; text-align:center;">
              <strong>${esc(labels.classLabel)}:</strong> ${esc(metadata.className || '—')} ·
              <strong>${esc(labels.metaExamDate)}</strong> ${esc(metadata.examDate || '—')} ·
              <strong>${esc(labels.kpiEnrolled)}:</strong> ${stats.total} ·
              <strong>${esc(labels.kpiPresent)}:</strong> ${stats.present} ·
              <strong>${esc(labels.kpiAbsent)}:</strong> ${stats.absent} ·
              <strong>${esc(labels.kpiAverage)}:</strong> ${formatNum(stats.average)}/20 ·
              <strong>${esc(labels.kpiMastered)}:</strong> ${formatPct(stats.passRate)}
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; margin-bottom:2mm;">
            <tr>
              <td style="width:43%; vertical-align:top; padding:0 4px;">
                <div style="background:${accent}; color:#ffffff; font-weight:bold; font-size:11px; padding:4px 6px;">
                  ${esc(labels.seqRosterTitle)}
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:${rowFont};">
                  <tr style="${thBgStyle}">
                    <th style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(labels.colOrder)}</th>
                    <th style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(labels.colStudentName)}</th>
                    <th style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(labels.colScore20)}</th>
                  </tr>
                  ${students
                    .map(
                      (st, idx) => `
                    <tr style="${idx % 2 === 1 ? `background:${primaryRowBg};` : ''}">
                      <td style="border:1px solid #cbd5e1; padding:${cellPad}; text-align:center;">${st.order || idx + 1}</td>
                      <td style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(st.fullName)}</td>
                      <td style="border:1px solid #cbd5e1; padding:${cellPad}; text-align:center; font-weight:bold; color:${st.isAbsent || st.score === null ? '#64748b' : st.score >= template.passThreshold ? '#047857' : '#b91c1c'};">${st.isAbsent || st.score === null ? esc(labels.absentLabel) : st.score.toFixed(2)}</td>
                    </tr>`
                    )
                    .join('')}
                </table>
              </td>
              <td style="width:57%; vertical-align:top; padding:0 4px;">
                <div style="background:${secondaryAccent}; color:#ffffff; font-weight:bold; font-size:11px; padding:4px 6px;">
                  ${esc(labels.meritRosterTitle)}
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:${rowFont};">
                  <tr style="${secondaryThBgStyle}">
                    <th style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(labels.colRank)}</th>
                    <th style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(labels.colStudentName)}</th>
                    <th style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(labels.colScoreShort)}</th>
                    <th style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(labels.colAppreciation)}</th>
                  </tr>
                  ${stats.rankedStudents
                    .map((s, idx) => {
                      const isAbsent = s.isAbsent || s.score === null;
                      const effectiveScore = isAbsent ? 0 : (s.score as number);
                      const isPass = !isAbsent && effectiveScore >= template.passThreshold;
                      const prevStudent = idx > 0 ? stats.rankedStudents[idx - 1] : null;
                      const prevIsPass =
                        prevStudent &&
                        !prevStudent.isAbsent &&
                        prevStudent.score !== null &&
                        prevStudent.score >= template.passThreshold;
                      const showThresholdCut = idx > 0 && prevIsPass && !isPass;

                      const status =
                        lang === 'ar'
                          ? getStudentAppreciation(
                              s.score,
                              isAbsent,
                              template.passThreshold,
                              template.excellenceThreshold
                            ).full
                          : getLocalizedAppreciation(
                              s.score,
                              isAbsent,
                              template.passThreshold,
                              template.excellenceThreshold,
                              lang
                            );
                      return `
                        ${
                          showThresholdCut
                            ? `<tr style="background:#fef2f2;">
                                 <td colspan="4" style="border:1px solid #fca5a5; padding:2px 4px; text-align:center; font-size:9px; font-weight:bold; color:#991b1b;">
                                   ${esc(labels.thresholdCutLine(template.passThreshold))}
                                 </td>
                               </tr>`
                            : ''
                        }
                        <tr style="${idx % 2 === 1 ? `background:${secondaryRowBg};` : ''}">
                          <td style="border:1px solid #cbd5e1; padding:${cellPad}; text-align:center; font-weight:bold;${idx < 3 && !isAbsent ? ` background:${secondaryAccent}18; color:${secondaryAccent};` : ''}">${idx + 1}</td>
                          <td style="border:1px solid #cbd5e1; padding:${cellPad};">${esc(s.fullName)}</td>
                          <td style="border:1px solid #cbd5e1; padding:${cellPad}; text-align:center; font-weight:bold; color:${isAbsent ? '#92400e' : isPass ? '#047857' : '#b91c1c'};">${effectiveScore.toFixed(2)}</td>
                          <td style="border:1px solid #cbd5e1; padding:${cellPad}; text-align:center;">${esc(status)}</td>
                        </tr>`;
                    })
                    .join('')}
                </table>
              </td>
            </tr>
          </table>
          <table style="width:100%; border-collapse:collapse; font-size:10px; text-align:center; margin-bottom:8px;">
            <tr style="background:#f8fafc;">
              <td style="border:1px solid #cbd5e1; padding:4px 6px; color:#065f46;">
                <strong>${esc(labels.needGroupExcellence)} (≥${template.excellenceThreshold}/20):</strong> ${docimology.enrichmentCount} (${docimology.enrichmentPct.toFixed(0)}%) — ${esc(labels.needGroupExcellenceSub)}
              </td>
              <td style="border:1px solid #cbd5e1; padding:4px 6px; color:#1e40af;">
                <strong>${esc(labels.needGroupConsolidation)} (${template.passThreshold} - ${(template.excellenceThreshold - 0.01).toFixed(2)}):</strong> ${docimology.consolidationCount} (${docimology.consolidationPct.toFixed(0)}%) — ${esc(labels.needGroupConsolidationSub)}
              </td>
              <td style="border:1px solid #cbd5e1; padding:4px 6px; color:#991b1b;">
                <strong>${esc(labels.needGroupRemediation)} (&lt;${template.passThreshold}/20):</strong> ${docimology.remediationCount} (${docimology.remediationPct.toFixed(0)}%) — ${esc(labels.needGroupRemediationSub)}
              </td>
            </tr>
          </table>
          <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:10.5px; text-align:center;">
            <tr>
              ${template.signatures
                .map((sig, i) => {
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
                      ? sig.page2Sublabel
                      : i === 0
                      ? labels.sigTeacherPage2Sub
                      : i === 1
                      ? labels.sigInspectorPage2Sub
                      : labels.sigPrincipalPage2Sub;
                  const sigMode = template.headerConfig.teacherSignatureMode || 'manual';
                  const rawSigImg = (template.headerConfig.teacherSignatureImage || '').trim();
                  const safeSigImg = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(rawSigImg)
                    ? rawSigImg
                    : '';
                  const teacherSigCellHtml =
                    i === 0
                      ? sigMode === 'image'
                        ? safeSigImg
                          ? `<img src="${safeSigImg}" alt="توقيع الأستاذ" style="max-height:42px; max-width:120px;" />`
                          : '<span style="color:#94a3b8;">.............</span>'
                        : template.headerConfig.teacherSignatureText?.trim()
                        ? `<span style="font-size:10.5px; font-style:italic; font-weight:bold; color:${accent};">${esc(template.headerConfig.teacherSignatureText.trim())}</span>`
                        : '<span style="color:#94a3b8;">.............</span>'
                      : '';
                  return `
                <td style="border:1px solid #cbd5e1; padding:6px 8px 10px; vertical-align:top; background:#f8fafc;">
                  <strong style="color:${accent};">${esc(sigLabel)}</strong>
                  ${sigSub ? `<div style="font-size:9px; color:#475569; margin-top:2px;">${esc(sigSub)}</div>` : ''}
                  ${
                    i === 0
                      ? `<table style="width:100%; border-collapse:collapse; margin-top:6px;"><tr><td style="text-align:${textAlign}; vertical-align:middle;"><div style="font-size:10px; font-weight:bold;">${esc(metadata.teacherName || '—')}</div><div style="font-size:8.5px; color:#64748b;">${esc(metadata.correctionDate || '—')}</div></td><td style="text-align:${oppositeAlign}; vertical-align:middle;">${teacherSigCellHtml}</td></tr></table>`
                      : `<div style="font-size:9px; color:#64748b; margin-top:12px;">${esc(lang === 'ar' ? sig.page2Footer || '' : '')}</div>`
                  }
                </td>`;
                })
                .join('')}
            </tr>
          </table>
        `;
      }
      case 'remediation_roster':
        return '';
      case 'full_students_table':
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:10.5px; margin-bottom:8px;">
            <tr style="${thBgStyle}">
              <th style="border:1px solid #cbd5e1; padding:3px;">${esc(labels.colOrder)}</th>
              <th style="border:1px solid #cbd5e1; padding:3px;">${esc(labels.cardMassarCode.replace(/[:：]/g, ''))}</th>
              <th style="border:1px solid #cbd5e1; padding:3px;">${esc(labels.colStudentName)}</th>
              <th style="border:1px solid #cbd5e1; padding:3px;">${esc(labels.colScore20)}</th>
              <th style="border:1px solid #cbd5e1; padding:3px;">${esc(labels.colAppreciation)}</th>
            </tr>
            ${students
              .map((s, idx) => {
                const status = getLocalizedAppreciation(
                  s.score,
                  s.isAbsent || s.score === null,
                  template.passThreshold,
                  template.excellenceThreshold,
                  lang
                );
                return `
                  <tr style="${idx % 2 === 1 ? `background:${primaryRowBg};` : ''}">
                    <td style="border:1px solid #cbd5e1; padding:3px; text-align:center;">${idx + 1}</td>
                    <td style="border:1px solid #cbd5e1; padding:3px; text-align:center;">${esc(s.code)}</td>
                    <td style="border:1px solid #cbd5e1; padding:3px;">${esc(s.fullName)}</td>
                    <td style="border:1px solid #cbd5e1; padding:3px; text-align:center; font-weight:bold;">${s.isAbsent || s.score === null ? esc(labels.absentLabel) : s.score.toFixed(2)}</td>
                    <td style="border:1px solid #cbd5e1; padding:3px; text-align:center;">${esc(status)}</td>
                  </tr>`;
              })
              .join('')}
          </table>
        `;
      case 'custom_table':
        return `
          ${sectionTitleHtml(secTitle)}
          <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px;">
            <tr style="${thBgStyle}">
              ${(sec.columns || ['البند', 'التفاصيل']).map((col) => `<th style="border:1px solid #cbd5e1; padding:5px;">${esc(col)}</th>`).join('')}
            </tr>
            ${(sec.rows || [['', '']])
              .map(
                (row) => `<tr>${row.map((cell) => `<td style="border:1px solid #cbd5e1; padding:5px;">${esc(cell)}</td>`).join('')}</tr>`
              )
              .join('')}
          </table>
        `;
      case 'custom_text':
        return `
          ${sectionTitleHtml(secTitle)}
          <p style="font-size:11px; line-height:1.5;">${esc(sec.bodyText || sec.description || '')}</p>
        `;
      case 'signatures':
        return `
          <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:11px; text-align:center;">
            <tr>
              ${template.signatures
                .map((sig, i) => {
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
                  const sigMode = template.headerConfig.teacherSignatureMode || 'manual';
                  const rawSigImg = (template.headerConfig.teacherSignatureImage || '').trim();
                  const safeSigImg = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(rawSigImg)
                    ? rawSigImg
                    : '';
                  const teacherSigCellHtml =
                    i === 0
                      ? sigMode === 'image'
                        ? safeSigImg
                          ? `<img src="${safeSigImg}" alt="توقيع الأستاذ" style="max-height:44px; max-width:125px;" />`
                          : '<span style="color:#94a3b8;">.............</span>'
                        : template.headerConfig.teacherSignatureText?.trim()
                        ? `<span style="font-size:11px; font-style:italic; font-weight:bold; color:${accent};">${esc(template.headerConfig.teacherSignatureText.trim())}</span>`
                        : '<span style="color:#94a3b8;">.............</span>'
                      : '';
                  return `
                <td style="border:1px solid #cbd5e1; padding:6px 8px 10px; vertical-align:top; background:#f8fafc;">
                  <strong style="color:${accent};">${esc(sigLabel)}</strong>
                  ${sigSub ? `<div style="font-size:9.5px; color:#64748b; margin-top:2px;">${esc(sigSub)}</div>` : ''}
                  ${
                    i === 0
                      ? `<table style="width:100%; border-collapse:collapse; margin-top:6px;"><tr><td style="text-align:${textAlign}; vertical-align:middle; font-size:10.5px; font-weight:bold;">${esc(metadata.teacherName || '—')}</td><td style="text-align:${oppositeAlign}; vertical-align:middle;">${teacherSigCellHtml}</td></tr></table>`
                      : ''
                  }
                </td>`;
                })
                .join('')}
            </tr>
          </table>
        `;
      default:
        return '';
    }
  });

  // Optional Item & Competency Analysis Matrix Word Section
  const presentStudentsList = students.filter((s) => !s.isAbsent && s.score !== null);
  const itemMatrixHtml =
    itemDefinitions.length > 0
      ? `
      <div style="page-break-before: always; margin-top: 12px;">
        ${sectionTitleHtml(labels.itemMatrixTitle)}
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px;">
          <tr style="${thBgStyle}">
            <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.itemColExercise)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.itemColCompetency)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.itemColMaxScore)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.itemColAvgScore)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.itemColMasteryRate)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.itemColStatus)}</th>
          </tr>
          ${itemDefinitions
            .map((it) => {
              const safeMax = Math.max(0.25, Number(it.maxScore) || 1);
              let cnt = 0;
              let sum = 0;
              let mastered = 0;
              for (const st of presentStudentsList) {
                const v = studentItemScores?.[st.id]?.[it.id];
                if (typeof v === 'number' && Number.isFinite(v)) {
                  const clamped = Math.max(0, Math.min(safeMax, v));
                  cnt += 1;
                  sum += clamped;
                  if ((clamped / safeMax) * 100 >= 50) mastered += 1;
                }
              }
              const avg = cnt > 0 ? sum / cnt : 0;
              const rate = cnt > 0 ? (mastered / cnt) * 100 : 0;
              const stLabel =
                rate >= 70
                  ? labels.itemStatusMastered
                  : rate >= 50
                  ? labels.itemStatusPartial
                  : labels.itemStatusCritical;
              return `
                <tr>
                  <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${esc(it.label)}</td>
                  <td style="border:1px solid #cbd5e1; padding:5px;">${esc(it.competency || '—')}</td>
                  <td style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${it.maxScore}</td>
                  <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:bold;">${avg.toFixed(2)}</td>
                  <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:bold;">${rate.toFixed(1)}%</td>
                  <td style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(stLabel)}</td>
                </tr>`;
            })
            .join('')}
        </table>
      </div>`
      : '';

  const attachmentHtml =
    examAttachment && examAttachment.pageImages.length > 0
      ? examAttachment.pageImages
          .filter((img) => typeof img === 'string' && img.startsWith('data:image/'))
          .map(
            (img, idx, arr) => `
          <div style="page-break-before: always; margin-top: 12px;">
            <div style="border-bottom: 2px solid ${accent}; padding-bottom: 4px; margin-bottom: 8px; font-size: 12px; font-weight: bold; color: ${accent};">
              ${esc(labels.appendixPrefix)} ${esc(examAttachment.fileName)} (${idx + 1} / ${arr.length})
            </div>
            <div style="text-align: center;">
              <img src="${esc(img)}" style="max-width: 100%; height: auto;" />
            </div>
          </div>`
          )
          .join('\n')
      : '';

  // Optional Pre/Post Remediation Impact Word Section when recorded
  const overridesMap = template.remediationCardsConfig?.studentOverrides || {};
  const postEvalRows = students
    .map((st) => {
      const ov = overridesMap[st.id];
      const hasScore =
        typeof ov?.postSupportScore === 'number' && Number.isFinite(ov.postSupportScore);
      const hasStatus = ov?.postSupportStatus && ov.postSupportStatus !== 'pending';
      if (!hasScore && !hasStatus) return null;
      const pre = st.isAbsent ? null : st.score;
      const post = hasScore ? Math.max(0, Math.min(20, ov!.postSupportScore as number)) : null;
      const delta = pre !== null && post !== null ? post - pre : null;
      const stStatus =
        hasStatus
          ? ov!.postSupportStatus!
          : post !== null && post >= template.passThreshold
          ? 'mastered'
          : post !== null && post >= template.passThreshold * 0.75
          ? 'in_progress'
          : 'needs_followup';
      const statusText =
        stStatus === 'mastered'
          ? labels.cardPostMastered
          : stStatus === 'in_progress'
          ? labels.cardPostInProgress
          : labels.cardPostNeedsFollowup;
      return { st, pre, post, delta, statusText };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const postImpactHtml =
    postEvalRows.length > 0
      ? `
      <div style="page-break-before: always; margin-top: 12px;">
        ${sectionTitleHtml(labels.postImpactTitle)}
        <table style="width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px;">
          <tr style="${thBgStyle}">
            <th style="border:1px solid #cbd5e1; padding:5px;">${esc(labels.colStudentName)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.postImpactColPre)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.postImpactColPost)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.postImpactColDelta)}</th>
            <th style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(labels.postImpactColStatus)}</th>
          </tr>
          ${postEvalRows
            .map(
              (r) => `
            <tr>
              <td style="border:1px solid #cbd5e1; padding:5px; font-weight:bold;">${esc(r.st.fullName)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${r.pre !== null ? r.pre.toFixed(2) : esc(labels.absentLabel)}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:bold;">${r.post !== null ? r.post.toFixed(2) : '—'}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; text-align:center; font-weight:bold;" dir="ltr">${r.delta !== null ? `${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(2)}` : '—'}</td>
              <td style="border:1px solid #cbd5e1; padding:5px; text-align:center;">${esc(r.statusText)}</td>
            </tr>`
            )
            .join('')}
        </table>
      </div>`
      : '';

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="${lang}" dir="${labels.dir}">
    <head>
      <meta charset="utf-8" />
      <title>${esc(reportTitleDisplay)}</title>
      <style>
        @page { size: A4 portrait; margin: 1cm; }
        body { font-family: ${font}; direction: ${labels.dir}; text-align: ${textAlign}; color: #0f172a; }
      </style>
    </head>
    <body>
      ${renderHeaderHtml()}
      ${bodyParts.join('\n')}
      ${itemMatrixHtml}
      ${postImpactHtml}
      ${attachmentHtml}
      ${extraAppendixHtml ? `<div style="page-break-before: always; margin-top: 12px;">${extraAppendixHtml}</div>` : ''}
      <div style="margin-top:12px; border-top:1px solid #e2e8f0; padding-top:4px; font-size:9.5px; color:#64748b; text-align:${textAlign};">
        ${esc(labels.footerBrand)} · ${esc(labels.footerCompliance)} · ${esc(labels.footerReportPrefix)} ${esc(metadata.examNumber)}${metadata.className ? ` (${esc(metadata.className)})` : ''}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeClass = (metadata.className || 'Class').replace(/[\\/:*?"<>|]+/g, '_');
  const safeExam = (metadata.examNumber || 'Exam').replace(/[\\/:*?"<>|]+/g, '_');
  const docPrefix = lang === 'fr' ? 'Rapport' : lang === 'en' ? 'Report' : 'تقرير';
  link.href = url;
  link.download = `${docPrefix}_${safeExam}_${safeClass}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
}

export function exportGradebookToExcel(
  metadata: MassarMetadata,
  stats: ComputedStats,
  students: StudentRecord[],
  passThreshold = 10,
  excellenceThreshold = 16,
  itemDefinitions: ExamItemDefinition[] = [],
  studentItemScores: StudentItemScores = {},
  remediationCardsConfig?: RemediationCardsConfig
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Sequential + Merit Gradebook
  const rosterRows: (string | number)[][] = [
    ['المملكة المغربية — وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل'],
    [
      `المؤسسة: ${metadata.school || '—'}`,
      `المادة: ${metadata.subject || '—'}`,
      `القسم: ${metadata.className || '—'}`,
      `الأستاذ(ة): ${metadata.teacherName || '—'}`,
    ],
    [
      `الفرض: ${metadata.examNumber || '—'} (${metadata.semester || '—'})`,
      `تاريخ الإنجاز: ${metadata.examDate || '—'}`,
      `المعدل العام: ${stats.average.toFixed(2)}/20`,
      `نسبة التحكم: ${stats.passRate.toFixed(1)}%`,
    ],
    [],
    [
      'ر.ت',
      'رمز مسار',
      'النسب والاسم',
      'النقطة / 20',
      'الحالة',
      'الرتبة الاستحقاقية',
      'التقدير التربوي',
      'ملاحظات',
    ],
  ];

  const rankByStudentId = new Map<string, number>();
  stats.rankedStudents.forEach((st, idx) => {
    rankByStudentId.set(st.id, idx + 1);
  });

  students.forEach((st, idx) => {
    const scoreVal = st.score;
    const isAbsentOrUnscored = st.isAbsent || scoreVal === null;
    const app = getStudentAppreciation(
      scoreVal,
      isAbsentOrUnscored,
      passThreshold,
      excellenceThreshold
    );
    const appreciationLabel = !st.isAbsent && scoreVal === null ? 'بانتظار النقطة' : app.full;
    const rankCell: string | number = isAbsentOrUnscored
      ? '—'
      : rankByStudentId.get(st.id) ?? '—';
    rosterRows.push([
      st.order || idx + 1,
      st.code,
      st.fullName,
      st.isAbsent ? 'غائب' : scoreVal === null ? 'غير مرصود' : Number(scoreVal.toFixed(2)),
      st.isAbsent ? 'غائب' : scoreVal === null ? 'غير مرصود' : scoreVal >= passThreshold ? 'متحكم' : 'غير متحكم',
      rankCell,
      appreciationLabel,
      st.observation || '',
    ]);
  });

  const wsRoster = XLSX.utils.aoa_to_sheet(rosterRows);
  wsRoster['!cols'] = [
    { wch: 8 },
    { wch: 15 },
    { wch: 28 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRoster, 'كشف النقط والترتيب');

  // Sheet 2: Statistical Summary & Brackets
  const statsRows: (string | number)[][] = [
    ['الحصيلة الإحصائية وتوزيع فئات التحكم — المذكرة الوزارية 142-08'],
    ['المؤشر الإحصائي', 'القيمة'],
    ['عدد التلاميذ المسجلين', stats.total],
    ['عدد الحاضرين', stats.present],
    ['عدد الغائبين', stats.absent],
    ['المعدل العام للقسم (/20)', Number(stats.average.toFixed(2))],
    ['القيمة الوسطية - الوسيط (/20)', Number(stats.median.toFixed(2))],
    ['الانحراف المعياري (σ)', Number(stats.stdDev.toFixed(2))],
    ['أعلى نقطة (/20)', Number(stats.maxScore.toFixed(2))],
    ['أدنى نقطة (/20)', Number(stats.minScore.toFixed(2))],
    [`عدد المتحكمين (≥ ${passThreshold}/20)`, stats.passed],
    [`نسبة التحكم (%)`, `${stats.passRate.toFixed(1)}%`],
    [`عدد المتعثرين (< ${passThreshold}/20)`, stats.failed],
    [],
    ['فئة النقط', 'التقدير التربوي', 'عدد التلاميذ', 'النسبة المئوية (%)'],
    ...stats.bracketsBreakdown.map((b) => [
      b.bracket.label,
      b.bracket.appreciation,
      b.count,
      `${b.percentage.toFixed(1)}%`,
    ]),
  ];

  const wsStats = XLSX.utils.aoa_to_sheet(statsRows);
  wsStats['!cols'] = [{ wch: 28 }, { wch: 26 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsStats, 'الإحصائيات والفئات');

  // Sheet 3: Item/Competency Matrix when exercises exist
  if (itemDefinitions.length > 0) {
    const presentStudents = students.filter((s) => !s.isAbsent && s.score !== null);
    const matrixRows: (string | number)[][] = [
      ['شبكة تحليل النتائج حسب التمارين والكفايات المقومة'],
      ['التمرين', 'الكفاية المستهدفة', 'النقطة القصوى', 'متوسط القسم', 'نسبة التحكم (%)'],
      ...itemDefinitions.map((it) => {
        const safeMax = Math.max(0.25, Number(it.maxScore) || 1);
        let cnt = 0;
        let sum = 0;
        let mastered = 0;
        for (const st of presentStudents) {
          const v = studentItemScores?.[st.id]?.[it.id];
          if (typeof v === 'number' && Number.isFinite(v)) {
            const clamped = Math.max(0, Math.min(safeMax, v));
            cnt += 1;
            sum += clamped;
            if ((clamped / safeMax) * 100 >= 50) mastered += 1;
          }
        }
        return [
          it.label,
          it.competency || '—',
          it.maxScore,
          cnt > 0 ? Number((sum / cnt).toFixed(2)) : 0,
          cnt > 0 ? `${((mastered / cnt) * 100).toFixed(1)}%` : '0%',
        ];
      }),
      [],
      ['رمز مسار', 'الاسم الكامل', ...itemDefinitions.map((it) => `${it.label} (/${it.maxScore})`), 'المجموع / 20'],
      ...students.map((st) => [
        st.code,
        st.fullName,
        ...itemDefinitions.map((it) => {
          if (st.isAbsent) return 'غائب';
          const v = studentItemScores?.[st.id]?.[it.id];
          return typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(2)) : '';
        }),
        st.isAbsent ? 'غائب' : st.score !== null ? Number(st.score.toFixed(2)) : '',
      ]),
    ];

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
    wsMatrix['!cols'] = [
      { wch: 22 },
      { wch: 36 },
      ...itemDefinitions.map(() => ({ wch: 16 })),
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'تحليل التمارين والكفايات');
  }

  // Sheet 4: Pre/Post Remediation Impact when post-support evaluations are recorded
  const overrides = remediationCardsConfig?.studentOverrides || {};
  const postRows: (string | number)[][] = [];
  students.forEach((st) => {
    const ov = overrides[st.id];
    const hasScore =
      typeof ov?.postSupportScore === 'number' && Number.isFinite(ov.postSupportScore);
    const hasStatus = Boolean(ov?.postSupportStatus && ov.postSupportStatus !== 'pending');
    if (!hasScore && !hasStatus) return;
    const pre = st.isAbsent ? null : st.score;
    const post = hasScore ? Math.max(0, Math.min(20, ov!.postSupportScore as number)) : null;
    const delta = pre !== null && post !== null ? Number((post - pre).toFixed(2)) : '';
    const statusKey = hasStatus
      ? ov!.postSupportStatus!
      : post !== null && post >= passThreshold
      ? 'mastered'
      : post !== null && post >= passThreshold * 0.75
      ? 'in_progress'
      : 'needs_followup';
    const statusAr =
      statusKey === 'mastered'
        ? 'متحكم بعد الدعم'
        : statusKey === 'in_progress'
        ? 'في طور التدارك'
        : 'يحتاج تتبعاً إضافياً';
    postRows.push([
      st.code,
      st.fullName,
      pre !== null ? Number(pre.toFixed(2)) : 'غائب',
      post !== null ? Number(post.toFixed(2)) : '—',
      delta,
      statusAr,
      ov?.teacherNote || '',
    ]);
  });

  if (postRows.length > 0) {
    const wsPost = XLSX.utils.aoa_to_sheet([
      ['قياس أثر الدعم البيداغوجي والتقويم البعدي (قبل / بعد الدعم)'],
      [
        'رمز مسار',
        'النسب والاسم',
        'نقطة الفرض القبلي (/20)',
        'نقطة التقويم البعدي (/20)',
        'فارق التقدم (Δ)',
        'قرار التحكم البعدي',
        'ملاحظة التتبع الفردي',
      ],
      ...postRows,
    ]);
    wsPost['!cols'] = [
      { wch: 15 },
      { wch: 28 },
      { wch: 20 },
      { wch: 20 },
      { wch: 16 },
      { wch: 22 },
      { wch: 32 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPost, 'أثر الدعم البعدي');
  }

  const safeClass = (metadata.className || 'القسم').replace(/[\\/:*?"<>|]+/g, '_');
  const safeExam = (metadata.examNumber || 'الفرض').replace(/[\\/:*?"<>|]+/g, '_');
  XLSX.writeFile(wb, `نقط_وإحصائيات_${safeExam}_${safeClass}.xlsx`);
}


