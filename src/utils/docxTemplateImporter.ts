import { TEMPLATE_PRESETS } from '../data/presets';
import { getReportLabels } from '../data/reportI18n';
import {
  MassarMetadata,
  ReportLanguage,
  ReportSection,
  ReportTemplateSchema,
} from '../types/report';

export interface DocxTemplateImportResult {
  templatePatch: Partial<ReportTemplateSchema>;
  metadataPatch: Partial<MassarMetadata>;
  extractedTitle: string;
  language: ReportLanguage;
  detectedSectionsCount: number;
  usedAiEnhancement: boolean;
  summaryNotes: string[];
  rawTextPreview: string;
}

function detectDocxLanguage(text: string): ReportLanguage {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-zÀ-ÿ]/g) || []).length;

  if (arabicChars >= Math.max(25, latinChars * 0.45)) {
    return 'ar';
  }
  if (
    /\b(devoir|rapport|étudiant|élève|compétence|remédiation|enseignement|royaume|ministère|moyenne|classe)\b/i.test(
      text
    )
  ) {
    return 'fr';
  }
  if (/\b(assessment|report|student|competency|remediation|average|ministry|kingdom)\b/i.test(text)) {
    return 'en';
  }
  return arabicChars >= 10 ? 'ar' : 'fr';
}

function extractLineMatch(lines: string[], patterns: RegExp[]): string | undefined {
  for (const line of lines) {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m && m[1]) {
        const cleaned = m[1].replace(/^[:：\s-]+/, '').trim();
        if (cleaned.length >= 2 && cleaned.length <= 120) {
          return cleaned;
        }
      }
    }
  }
  return undefined;
}

function extractNumberMatch(text: string, patterns: RegExp[]): number | undefined {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m && m[1]) {
      const n = Number.parseFloat(m[1].replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

export function parseDocxTemplateLocally(
  rawText: string,
  _html: string,
  fileName: string,
  baseTemplate: ReportTemplateSchema
): DocxTemplateImportResult {
  const cleanText = (rawText || '').replace(/\r/g, '\n');
  const lines = cleanText
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const language = detectDocxLanguage(cleanText);
  const labels = getReportLabels(language);

  const ministryLine =
    extractLineMatch(lines, [
      /(وزارة التربية الوطنية[^\n]{0,80})/,
      /(Minist[èe]re de l['’]Éducation[^\n]{0,90})/i,
      /(Ministry of National Education[^\n]{0,90})/i,
    ]) || labels.ministryLine;

  const academy = extractLineMatch(lines, [
    /(?:الأكاديمية الجهوية[^:：\n]*[:：]?\s*)(.+)/,
    /(?:AREF|Académie Régionale[^:：\n]*[:：]?\s*)(.+)/i,
  ]);
  const directorate = extractLineMatch(lines, [
    /(?:المديرية الإقليمية[^:：\n]*[:：]?\s*)(.+)/,
    /(?:Direction Provinciale[^:：\n]*[:：]?\s*)(.+)/i,
  ]);
  const school = extractLineMatch(lines, [
    /(?:المؤسسة|الثانوية|الإعدادية|المدرسة)\s*[:：]\s*(.+)/,
    /(?:Établissement|Lycée|Collège|School)\s*[:：]\s*(.+)/i,
  ]);
  const subject = extractLineMatch(lines, [
    /(?:المادة)\s*[:：]\s*(.+)/,
    /(?:Discipline|Matière|Subject)\s*[:：]\s*(.+)/i,
  ]);
  const teacherName = extractLineMatch(lines, [
    /(?:الأستاذ(?:\(ة\))?)\s*[:：]\s*(.+)/,
    /(?:Enseignant(?:\(e\))?|Professeur|Teacher)\s*[:：]\s*(.+)/i,
  ]);
  const schoolYear = extractLineMatch(lines, [
    /(?:الموسم الدراسي|السنة الدراسية|Année scolaire|Academic Year)\s*[:：]?\s*(\d{4}\s*[-/]\s*\d{4})/i,
  ]);

  const titleCandidate =
    extractLineMatch(lines, [
      /(بطاقة\s+تقرير[^\n]{3,80})/,
      /(تقرير\s+(?:تقويم|نتائج|تتبع)?[^\n]{3,80})/,
      /(Rapport\s+d['’]?(?:évaluation|analyse|suivi)[^\n]{3,90})/i,
      /(Assessment\s+Report[^\n]{3,90})/i,
    ]) || labels.defaultReportTitle;

  const passNum = extractNumberMatch(cleanText, [
    /(?:عتبة التحكم|عتبة النجاح|Seuil de maîtrise|Pass(?:ing)?\s*(?:mark|threshold))\s*[:：≥>=]*\s*(\d+(?:[.,]\d+)?)/i,
  ]);
  const excNum = extractNumberMatch(cleanText, [
    /(?:عتبة التميز|Seuil d['’]excellence|Excellence threshold)\s*[:：≥>=]*\s*(\d+(?:[.,]\d+)?)/i,
  ]);

  // Detect active structural sections mentioned in the Word document
  const lower = cleanText.toLowerCase();
  const hasExamBox =
    /محتوى الفرض|الأهداف|الكفايات المستهدفة|compétences|objectifs|syllabus/i.test(lower);
  const hasKpi =
    /معدل القسم|المتوسط|الوسيط|الانحراف|moyenne|médiane|écart-type|average|median/i.test(lower);
  const hasBrackets =
    /فئات|الشرائح|توزيع النقط|tranches|répartition|brackets/i.test(lower);
  const hasChart = /مبيان|تمثيل|graphique|chart/i.test(lower);
  const hasTopStruggling =
    /المتفوقون|المتعثرون|المحتاجون للدعم|excellence|en difficulté|struggling/i.test(lower);
  const hasDiagnosis =
    /مواطن القوة|نقط القوة|التعثرات|التشخيص|points forts|lacunes|diagnostic|strengths|weaknesses/i.test(
      lower
    );
  const hasRemediation =
    /خطة الدعم|المعالجة|مجموعات الحاجة|plan de remédiation|soutien|remediation/i.test(lower);
  const hasRoster =
    /كشف النقط|الترتيب الاستحقاقي|relevé|classement|merit/i.test(lower);

  const detectedFlags = [
    hasExamBox,
    hasKpi,
    hasBrackets,
    hasChart,
    hasTopStruggling,
    hasDiagnosis,
    hasRemediation,
    hasRoster,
  ].filter(Boolean).length;

  const sectionEnabledMap: Record<string, boolean> =
    detectedFlags >= 3
      ? {
          metadata_grid: true,
          exam_content_box: hasExamBox,
          kpi_summary: hasKpi,
          brackets_table: hasBrackets,
          brackets_and_donut_split: hasBrackets || hasChart,
          chart_distribution: hasChart,
          top_and_struggling: hasTopStruggling,
          pedagogical_diagnosis: hasDiagnosis,
          remediation_plan: hasRemediation,
          dual_roster_merit: hasRoster,
          signatures: true,
        }
      : {
          metadata_grid: true,
          signatures: true,
        };

  const baseSections =
    baseTemplate.sections.length > 0 ? baseTemplate.sections : TEMPLATE_PRESETS[0].sections;
  const updatedSections: ReportSection[] = baseSections.map((sec) => ({
    ...sec,
    enabled:
      sec.type in sectionEnabledMap ? Boolean(sectionEnabledMap[sec.type]) : sec.enabled,
  }));

  const enabledCount = updatedSections.filter((s) => s.enabled).length;
  const summaryNotes: string[] = [
    `تم استخراج النص البنيوي من ملف Word (${lines.length} سطراً)`,
    `اللغة المكتشفة للقالب: ${
      language === 'fr' ? 'الفرنسية (BIOF)' : language === 'en' ? 'الإنجليزية' : 'العربية'
    }`,
    `الأقسام المطابقة والمهيأة في القالب: ${enabledCount} أقسام`,
  ];
  if (school) summaryNotes.push(`المؤسسة المستخلصة: ${school}`);
  if (subject) summaryNotes.push(`المادة المستخلصة: ${subject}`);

  const metadataPatch: Partial<MassarMetadata> = {};
  if (academy) metadataPatch.academy = academy;
  if (directorate) metadataPatch.directorate = directorate;
  if (school) metadataPatch.school = school;
  if (subject) metadataPatch.subject = subject;
  if (teacherName) metadataPatch.teacherName = teacherName;
  if (schoolYear) metadataPatch.schoolYear = schoolYear;

  const templatePatch: Partial<ReportTemplateSchema> = {
    id: `docx-${Date.now()}`,
    name: `قالب مستورد: ${fileName.replace(/\.docx?$/i, '')}`,
    sourceType: 'analyzed-docx',
    sourceFileName: fileName,
    analysisSummary: `تم استيراد وتكييف قالب Word الرسمي (${fileName}) بنجاح عبر محرك mammoth.`,
    detectedNotes: summaryNotes,
    headerConfig: {
      ...baseTemplate.headerConfig,
      reportLanguage: language,
      includeFrenchHeader:
        language === 'ar'
          ? /royaume du maroc|ministère/i.test(cleanText) ||
            baseTemplate.headerConfig.includeFrenchHeader
          : false,
      countryLine: labels.countryLine,
      ministryLine,
      reportTitle: titleCandidate,
      reportSubtitle: labels.defaultReportSubtitle,
      appendixTitle: labels.defaultAppendixTitle,
    },
    passThreshold:
      passNum !== undefined && passNum >= 5 && passNum <= 16
        ? passNum
        : baseTemplate.passThreshold,
    excellenceThreshold:
      excNum !== undefined && excNum >= 12 && excNum <= 19
        ? excNum
        : baseTemplate.excellenceThreshold,
    sections: updatedSections,
  };

  return {
    templatePatch,
    metadataPatch,
    extractedTitle: titleCandidate,
    language,
    detectedSectionsCount: enabledCount,
    usedAiEnhancement: false,
    summaryNotes,
    rawTextPreview: cleanText.slice(0, 600),
  };
}

export async function importDocxReportTemplate(
  file: File,
  baseTemplate: ReportTemplateSchema
): Promise<DocxTemplateImportResult> {
  if (!/\.docx$/i.test(file.name)) {
    throw new Error('يرجى اختيار ملف Word بصيغة .docx حديثة لاستيراد القالب.');
  }

  const mammothMod = await import('mammoth');
  const mammoth =
    (mammothMod as unknown as { default?: typeof import('mammoth') }).default ||
    (mammothMod as unknown as typeof import('mammoth'));

  const arrayBuffer = await file.arrayBuffer();
  const [rawRes, htmlRes] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ]);

  const rawText = rawRes.value || '';
  if (rawText.trim().length < 15) {
    throw new Error(
      'ملف Word المحدد فارغ أو يحتوي على صور ممسوحة فقط دون نص قابل للاستخراج.'
    );
  }

  const localResult = parseDocxTemplateLocally(
    rawText,
    htmlRes.value || '',
    file.name,
    baseTemplate
  );

  // Best-effort AI refinement if backend & Gemini API key are configured
  try {
    const response = await fetch('/api/analyze-docx-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        rawText: rawText.slice(0, 8000),
      }),
    });
    if (response.ok) {
      const data = (await response.json()) as {
        analysis?: {
          language?: ReportLanguage;
          reportTitle?: string;
          reportSubtitle?: string;
          ministryLine?: string;
          school?: string;
          subject?: string;
          teacherName?: string;
          passThreshold?: number;
          excellenceThreshold?: number;
          enabledSectionTypes?: string[];
          detectedNotes?: string[];
        };
      };

      const a = data.analysis;
      if (a) {
        const refinedLang: ReportLanguage =
          a.language === 'fr' || a.language === 'en' || a.language === 'ar'
            ? a.language
            : localResult.language;
        const labels = getReportLabels(refinedLang);

        const enabledSet = Array.isArray(a.enabledSectionTypes)
          ? new Set(a.enabledSectionTypes)
          : null;

        const baseSections =
          localResult.templatePatch.sections || baseTemplate.sections;
        const refinedSections = enabledSet
          ? baseSections.map((sec) => ({
              ...sec,
              enabled:
                sec.type === 'signatures' || sec.type === 'metadata_grid'
                  ? true
                  : enabledSet.has(sec.type) || sec.enabled,
            }))
          : baseSections;

        const mergedMetadata: Partial<MassarMetadata> = {
          ...localResult.metadataPatch,
          ...(a.school ? { school: a.school } : {}),
          ...(a.subject ? { subject: a.subject } : {}),
          ...(a.teacherName ? { teacherName: a.teacherName } : {}),
        };

        const notes = Array.isArray(a.detectedNotes) && a.detectedNotes.length > 0
          ? a.detectedNotes
          : localResult.summaryNotes;

        return {
          ...localResult,
          language: refinedLang,
          extractedTitle: a.reportTitle || localResult.extractedTitle,
          detectedSectionsCount: refinedSections.filter((s) => s.enabled).length,
          usedAiEnhancement: true,
          summaryNotes: notes,
          metadataPatch: mergedMetadata,
          templatePatch: {
            ...localResult.templatePatch,
            analysisSummary: `تم استيراد وتحليل بنية قالب Word (${file.name}) بنجاح.`,
            detectedNotes: notes,
            passThreshold:
              typeof a.passThreshold === 'number' && a.passThreshold >= 5 && a.passThreshold <= 16
                ? a.passThreshold
                : localResult.templatePatch.passThreshold,
            excellenceThreshold:
              typeof a.excellenceThreshold === 'number' &&
              a.excellenceThreshold >= 12 &&
              a.excellenceThreshold <= 19
                ? a.excellenceThreshold
                : localResult.templatePatch.excellenceThreshold,
            headerConfig: {
              ...(localResult.templatePatch.headerConfig || baseTemplate.headerConfig),
              reportLanguage: refinedLang,
              countryLine: labels.countryLine,
              ministryLine: a.ministryLine || labels.ministryLine,
              reportTitle: a.reportTitle || localResult.extractedTitle,
              reportSubtitle: a.reportSubtitle || labels.defaultReportSubtitle,
              appendixTitle: labels.defaultAppendixTitle,
            },
            sections: refinedSections,
          },
        };
      }
    }
  } catch {
    // Offline or API unconfigured: deterministic local parse already succeeded cleanly
  }

  return localResult;
}
