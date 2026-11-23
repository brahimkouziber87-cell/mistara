import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  FileUp,
  ImagePlus,
  Loader2,
  Paperclip,
  PenTool,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_BRACKETS,
  EXAM_NUMBER_OPTIONS,
  MEMO_142_BRACKETS,
  REPORT_COLOR_THEMES,
  REPORT_FONT_OPTIONS,
  TEMPLATE_PRESETS,
} from '../data/presets';
import { getReportLabels } from '../data/reportI18n';
import {
  ComputedStats,
  ExamItemDefinition,
  ExamPdfAttachment,
  MassarMetadata,
  ReportFontFamily,
  ReportFontScale,
  ReportLanguage,
  ReportTemplateSchema,
  ScoreBracket,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import { extractExamNumberFromHeader } from '../utils/massarParser';
import {
  DocxTemplateImportResult,
  importDocxReportTemplate,
} from '../utils/docxTemplateImporter';
import { renderExamPdfAttachment } from '../utils/pdfAttachment';
import {
  buildSmartLocalPedagogicalDiagnosis,
  computeItemMatrixStats,
} from '../utils/pedagogicalAnalytics';
import { CompetencyBankPanel } from './CompetencyBankPanel';
import { ItemAnalysisMatrixPanel } from './ItemAnalysisMatrixPanel';
import { Memo142MathPanel } from './Memo142MathPanel';
import { RemediationCardsConfigPanel } from './RemediationCardsConfigPanel';

interface CustomizeAndPedagogyStepProps {
  metadata: MassarMetadata;
  template: ReportTemplateSchema;
  stats: ComputedStats;
  students: StudentRecord[];
  examAttachment: ExamPdfAttachment | null;
  itemDefinitions?: ExamItemDefinition[];
  studentItemScores?: StudentItemScores;
  onUpdateItemDefinitions?: (items: ExamItemDefinition[]) => void;
  onUpdateStudentItemScores?: (scores: StudentItemScores) => void;
  onSyncTotalScores?: (updatedStudents: StudentRecord[]) => void;
  onUpdateExamAttachment: (attachment: ExamPdfAttachment | null) => void;
  onUpdateMetadata: (patch: Partial<MassarMetadata>) => void;
  onUpdateTemplate: (updater: (prev: ReportTemplateSchema) => ReportTemplateSchema) => void;
  onResetInstitutionSettings: () => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onOpenCardsPreview?: () => void;
}

type CustomizeTab = 'all' | 'metadata' | 'pedagogy' | 'layout';

export const CustomizeAndPedagogyStep: React.FC<CustomizeAndPedagogyStepProps> = ({
  metadata,
  template,
  stats,
  students,
  examAttachment,
  itemDefinitions = [],
  studentItemScores = {},
  onUpdateItemDefinitions,
  onUpdateStudentItemScores,
  onSyncTotalScores,
  onUpdateExamAttachment,
  onUpdateMetadata,
  onUpdateTemplate,
  onResetInstitutionSettings,
  onBackStep,
  onNextStep,
  onOpenCardsPreview,
}) => {
  const [activeTab, setActiveTab] = useState<CustomizeTab>('all');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftSuccessMsg, setDraftSuccessMsg] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const docxInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const [signatureUploadError, setSignatureUploadError] = useState<string | null>(null);
  const [isAttachingPdf, setIsAttachingPdf] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isImportingDocx, setIsImportingDocx] = useState(false);
  const [docxImportError, setDocxImportError] = useState<string | null>(null);
  const [docxImportResult, setDocxImportResult] =
    useState<DocxTemplateImportResult | null>(null);

  const handleUploadSignatureImage = (file: File) => {
    setSignatureUploadError(null);
    if (!file.type.startsWith('image/')) {
      setSignatureUploadError('يرجى اختيار ملف صورة صالح (PNG أو JPG أو WebP).');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setSignatureUploadError('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 4 ميغابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        try {
          const maxW = 360;
          const maxH = 140;
          let targetW = img.width || maxW;
          let targetH = img.height || maxH;
          if (targetW > maxW || targetH > maxH) {
            const ratio = Math.min(maxW / targetW, maxH / targetH);
            targetW = Math.max(1, Math.round(targetW * ratio));
            targetH = Math.max(1, Math.round(targetH * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, targetW, targetH);
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const optimized = canvas.toDataURL('image/png');
            onUpdateTemplate((prev) => ({
              ...prev,
              headerConfig: {
                ...prev.headerConfig,
                teacherSignatureMode: 'image',
                teacherSignatureImage: optimized,
              },
            }));
            return;
          }
        } catch {
          // Fallback to raw data URL
        }
        if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(dataUrl)) {
          setSignatureUploadError('يرجى اختيار صورة بصيغة PNG أو JPG أو WebP.');
          return;
        }
        onUpdateTemplate((prev) => ({
          ...prev,
          headerConfig: {
            ...prev.headerConfig,
            teacherSignatureMode: 'image',
            teacherSignatureImage: dataUrl,
          },
        }));
      };
      img.onerror = () => {
        setSignatureUploadError('تعذر قراءة ملف صورة التوقيع.');
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setSignatureUploadError('تعذر قراءة ملف صورة التوقيع.');
    };
    reader.readAsDataURL(file);
  };

  const handleAttachPdfFile = async (file: File) => {
    setAttachmentError(null);
    setIsAttachingPdf(true);
    try {
      const rendered = await renderExamPdfAttachment(file);
      onUpdateExamAttachment(rendered);
    } catch (err) {
      setAttachmentError(
        err instanceof Error ? err.message : 'تعذر قراءة ملف PDF المرفق.'
      );
    } finally {
      setIsAttachingPdf(false);
    }
  };

  const handleImportDocxTemplate = async (file: File) => {
    setDocxImportError(null);
    setIsImportingDocx(true);
    try {
      const result = await importDocxReportTemplate(file, template);
      onUpdateTemplate((prev) => ({
        ...prev,
        ...result.templatePatch,
        headerConfig: {
          ...prev.headerConfig,
          ...(result.templatePatch.headerConfig || {}),
        },
        pedagogicalContent: prev.pedagogicalContent,
        remediationCardsConfig: prev.remediationCardsConfig,
      }));
      if (Object.keys(result.metadataPatch).length > 0) {
        onUpdateMetadata(result.metadataPatch);
      }
      setDocxImportResult(result);
    } catch (err) {
      setDocxImportError(
        err instanceof Error
          ? err.message
          : 'تعذر استيراد وتحليل قالب Word (.docx).'
      );
    } finally {
      setIsImportingDocx(false);
    }
  };

  const handleGeneratePedagogy = async () => {
    setDraftError(null);
    setDraftSuccessMsg(null);
    setIsDrafting(true);
    try {
      const res = await fetch('/api/generate-pedagogy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata,
          language: template.headerConfig.reportLanguage || 'ar',
          reportTitle: template.headerConfig.reportTitle,
          passThreshold: template.passThreshold,
          excellenceThreshold: template.excellenceThreshold,
          itemAnalysisSummary:
            itemDefinitions.length > 0
              ? computeItemMatrixStats(students, itemDefinitions, studentItemScores, 50).map(
                  (s) => ({
                    label: s.item.label,
                    competency: s.item.competency,
                    maxScore: s.item.maxScore,
                    averageScore: s.averageScore,
                    masteryRate: s.masteryRate,
                  })
                )
              : [],
          stats: {
            total: stats.total,
            present: stats.present,
            absent: stats.absent,
            passed: stats.passed,
            failed: stats.failed,
            passRate: stats.passRate,
            average: stats.average,
            median: stats.median,
            minScore: stats.minScore,
            maxScore: stats.maxScore,
            stdDev: stats.stdDev,
            bracketsSummary: stats.bracketsBreakdown.map((b) => ({
              label: b.bracket.label,
              count: b.count,
              percentage: b.percentage,
            })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'تعذر التوليد عبر الخادم.');

      const ped = data.pedagogicalContent;
      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: {
          generalObservation: ped.generalObservation || prev.pedagogicalContent.generalObservation,
          strengths: Array.isArray(ped.strengths) ? ped.strengths : prev.pedagogicalContent.strengths,
          weaknesses: Array.isArray(ped.weaknesses)
            ? ped.weaknesses
            : prev.pedagogicalContent.weaknesses,
          programmedRemediationBullets:
            Array.isArray(ped.programmedRemediationBullets) &&
            ped.programmedRemediationBullets.length > 0
              ? ped.programmedRemediationBullets
              : Array.isArray(ped.remediationActions)
              ? ped.remediationActions.map(
                  (r: { targetGroup: string; activity: string }) =>
                    `${r.targetGroup}: ${r.activity}`
                )
              : prev.pedagogicalContent.programmedRemediationBullets,
          remediationNotes:
            typeof ped.remediationNotes === 'string' && ped.remediationNotes.trim()
              ? ped.remediationNotes.trim()
              : prev.pedagogicalContent.remediationNotes,
          remediationActions: Array.isArray(ped.remediationActions)
            ? ped.remediationActions
            : prev.pedagogicalContent.remediationActions,
        },
      }));
      setDraftSuccessMsg('تم توليد التشخيص الديداكتيكي وخطة المعالجة بنجاح عبر الذكاء الاصطناعي.');
    } catch {
      // Seamless fallback to Smart Local Didactic Diagnosis Engine (offline or missing API key)
      const localPed = buildSmartLocalPedagogicalDiagnosis({
        metadata,
        stats,
        students,
        passThreshold: template.passThreshold,
        excellenceThreshold: template.excellenceThreshold,
        language: template.headerConfig.reportLanguage || 'ar',
        itemDefinitions,
        studentItemScores,
      });
      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: localPed,
      }));
      setDraftSuccessMsg(
        'تم توليد التشخيص الديداكتيكي المعمق وخطة الدعم محلياً انطلاقاً من إحصائيات القسم وبنك الكفايات.'
      );
    } finally {
      setIsDrafting(false);
    }
  };

  const handleApplyPedagogyScenario = (scenarioId: 'auto' | 'high' | 'mixed' | 'support') => {
    setDraftError(null);
    setDraftSuccessMsg(null);
    const lang = template.headerConfig.reportLanguage || 'ar';
    if (scenarioId === 'auto') {
      const localPed = buildSmartLocalPedagogicalDiagnosis({
        metadata,
        stats,
        students,
        passThreshold: template.passThreshold,
        excellenceThreshold: template.excellenceThreshold,
        language: lang,
        itemDefinitions,
        studentItemScores,
      });
      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: localPed,
      }));
      setDraftSuccessMsg(
        'تمت صياغة التشخيص الديداكتيكي وخطة الدعم تلقائياً من إحصائيات القسم الحالية.'
      );
      return;
    }
    const avgStr = stats.present > 0 ? stats.average.toFixed(2) : '10.00';
    const passRateStr = stats.present > 0 ? stats.passRate.toFixed(1) : '50.0';
    const excCount = stats.topStudents.length;
    const failCount = stats.failed;

    if (lang === 'fr') {
      const isGood = scenarioId === 'high';
      const isMixed = scenarioId === 'mixed';

      const contentFr = isGood
        ? {
            generalObservation: `Les résultats traduisent une maîtrise globale satisfaisante des compétences évaluées (moyenne de classe : ${avgStr}/20 ; taux de réussite : ${passRateStr}%), avec ${excCount} élève(s) en pôle d’excellence contre ${failCount} à accompagner.`,
            strengths: [
              `Taux de réussite encourageant (${passRateStr}%) et maîtrise des applications directes du cours.`,
              'Rédaction structurée et respect des consignes méthodologiques chez la majorité des élèves.',
            ],
            weaknesses: [
              'Quelques imprécisions de justification sur les questions de synthèse complexes.',
              'Gestion perfectible du temps en fin d’épreuve pour une minorité de copies.',
            ],
            programmedRemediationBullets: [
              'Correction collective ciblée sur la rigueur de justification des questions de synthèse.',
              'Activités d’approfondissement et tutorat par les pairs pour le groupe d’excellence.',
              'Suivi individuel ponctuel des élèves restés en deçà du seuil de maîtrise.',
            ],
            remediationNotes: `Séance de correction interactive suivie d’ateliers différenciés pour consolider les acquis (moyenne : ${avgStr}/20).`,
          }
        : isMixed
        ? {
            generalObservation: `Résultats contrastés mettant en évidence un écart entre un groupe performant et des élèves nécessitant une consolidation (moyenne : ${avgStr}/20 ; réussite : ${passRateStr}%).`,
            strengths: [
              'Assimilation correcte des notions fondamentales par le groupe médian et supérieur.',
              'Engagement positif dans la résolution des exercices d’application directe.',
            ],
            weaknesses: [
              'Confusion récurrente entre plusieurs règles lors du passage à l’application.',
              'Argumentation incomplète et insuffisance de justification des réponses.',
              'Difficultés de gestion du rythme de travail durant l’épreuve.',
            ],
            programmedRemediationBullets: [
              'Organisation de groupes de besoin homogènes durant la séance de soutien.',
              'Distribution de fiches méthodologiques résumant les étapes clés de résolution.',
              'Entraînement guidé sur des situations progressives et vérification des cahiers.',
            ],
            remediationNotes:
              'Exploitation pédagogique des erreurs fréquentes en classe puis différenciation des exercices selon les 3 groupes de besoin.',
          }
        : {
            generalObservation: `L’évaluation révèle des lacunes notables sur les prérequis essentiels (${failCount} élève(s) sous le seuil ; moyenne : ${avgStr}/20), appelant un plan de remédiation prioritaire.`,
            strengths: [
              'Repérage précis des prérequis déficitaires facilitant une intervention ciblée.',
              'Premiers efforts d’appropriation des consignes simples chez une partie de la classe.',
            ],
            weaknesses: [
              'Déficit marqué sur les bases antérieures indispensables aux nouveaux apprentissages.',
              'Difficulté à traduire les énoncés en démarches méthodologiques structurées.',
              'Manque de régularité dans la révision et les travaux personnels.',
            ],
            programmedRemediationBullets: [
              'Programmation d’une séance de remise à niveau intensive avant d’aborder le chapitre suivant.',
              'Mise en place d’exercices graduels guidés (Niveau 1) pour restaurer la confiance.',
              'Suivi hebdomadaire des cahiers d’exercices et liaison avec l’administration/familles.',
            ],
            remediationNotes:
              'Évaluation formative de contrôle prévue à l’issue du cycle de remédiation pour mesurer la réduction des écarts.',
          };

      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          ...contentFr,
        },
      }));
      return;
    }

    if (lang === 'en') {
      const isGood = scenarioId === 'high';
      const isMixed = scenarioId === 'mixed';

      const contentEn = isGood
        ? {
            generalObservation: `Assessment outcomes show solid overall mastery (class average: ${avgStr}/20; pass rate: ${passRateStr}%), with ${excCount} high achiever(s) and ${failCount} student(s) requiring targeted support.`,
            strengths: [
              `Strong pass rate (${passRateStr}%) and confident execution of core direct-application items.`,
              'Clear script organization and adherence to formal problem-solving conventions.',
            ],
            weaknesses: [
              'Minor justification gaps in higher-order multi-step synthesis questions.',
              'Time management constraints on final challenging tasks for a small subgroup.',
            ],
            programmedRemediationBullets: [
              'Targeted whole-class review focusing on complete step-by-step justification.',
              'Extension challenge tasks and peer-mentoring roles for high achievers.',
              'Focused individual check-ins for students below the mastery threshold.',
            ],
            remediationNotes: `Interactive feedback session followed by differentiated enrichment and consolidation activities (class avg: ${avgStr}/20).`,
          }
        : isMixed
        ? {
            generalObservation: `Performance distribution is heterogeneous between proficient learners and a subgroup needing structured consolidation (average: ${avgStr}/20; pass rate: ${passRateStr}%).`,
            strengths: [
              'Sound understanding of foundational concepts among middle and upper tiers.',
              'Positive engagement on familiar direct-application exercises.',
            ],
            weaknesses: [
              'Occasional confusion between related rules when switching task contexts.',
              'Incomplete reasoning steps and brief unsubstantiated answers.',
              'Uneven pacing across multi-part questions.',
            ],
            programmedRemediationBullets: [
              'Divide the class into targeted need groups for differentiated support.',
              'Provide structured summary sheets outlining key rules and worked examples.',
              'Guided practice with progressive difficulty and workbook verification.',
            ],
            remediationNotes:
              'Use formative error analysis during script review and assign tier-specific follow-up tasks.',
          }
        : {
            generalObservation: `Results reveal substantial gaps in foundational prerequisites (${failCount} student(s) below pass mark; class average: ${avgStr}/20), requiring immediate intensive remediation.`,
            strengths: [
              'Clear identification of specific foundational bottlenecks for targeted intervention.',
              'Initial attempts to engage with straightforward prompt instructions.',
            ],
            weaknesses: [
              'Significant gaps in prerequisite knowledge required for current syllabus units.',
              'Difficulty translating problem statements into structured solution steps.',
              'Inconsistent independent practice and homework completion.',
            ],
            programmedRemediationBullets: [
              'Schedule an intensive foundational recovery workshop prior to new syllabus units.',
              'Scaffold learning through graded Level-1 practice sheets.',
              'Weekly workbook monitoring and proactive follow-up with administration/guardians.',
            ],
            remediationNotes:
              'Administer a short post-remediation formative check to measure gap closure.',
          };

      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          ...contentEn,
        },
      }));
      return;
    }

    const domainTerms = {
      directApp: 'التطبيقات العددية والحسابية المباشرة',
      reasoning: 'خطوات التعليل والبرهنة الرياضية',
      representation: 'الانتقال من الفهم اللغوي لنص التمرين إلى الصياغة والترميز الرياضي',
      prerequisites:
        'المكتسبات القبلية الضرورية لبناء المفاهيم الجديدة (الحساب، الإشارات، النشر والتعميل)',
      enrichment: 'وضعيات إدماجية وتحديات رياضية لتعميق مكتسبات الفئة المتفوقة',
    };

    if (scenarioId === 'high') {
      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          generalObservation: `نسق عام متميز يعكس استيعاباً سليماً للمفاهيم والمهارات المدرسة خلال الفترة (${avgStr}/20 كمعدل عام ونسبة تحكم ${passRateStr}%)، مع انخراط جدي لأغلب المتعلمين.`,
          strengths: [
            'تملك متقدم للمفاهيم الأساس وقدرة واضحة على التحليل والاستدلال المنطقي.',
            'جودة تنظيم أوراق التحرير ودقة الصياغة والنتائج النهائية لدى الأغلبية.',
          ],
          weaknesses: [
            `بعض الهفوات الشكلية في ${domainTerms.reasoning} لدى فئة محدودة من المتعلمين.`,
            'التسرع في الإنجاز أو إغفال بعض شروط وضوابط الإجابة الكاملة.',
          ],
          programmedRemediationBullets: [
            'معالجة فورية للهفوات المنهجية المسجلة أثناء حصة التصحيح التفاعلي على السبورة.',
            domainTerms.enrichment,
            'مواكبة فردية مركزة للتلاميذ غير المتحكمين لتدارك النقص المسجل.',
          ],
          remediationNotes:
            'استثمار تفوق الفئة المتحكمة عبر نظام المواكبة بالقرين، مع تخصيص أنشطة تثبيت قصيرة في بداية الحصص المقبلة.',
        },
      }));
    } else if (scenarioId === 'mixed') {
      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          generalObservation: `تتوزع نتائج القسم بشكل غير متجانس بين فئة متحكمة استوعبت المضامين وفئة متوسطة/متعثرة تحتاج إلى تثبيت القواعد الإجرائية (المعدل العام ${avgStr}/20).`,
          strengths: [
            'قدرة الفئة المتحكمة على إنجاز الوضعيات التوليفية وتوظيف المعارف بكفاءة.',
            `استيعاب ${domainTerms.directApp} لدى شريحة مهمة من القسم.`,
          ],
          weaknesses: [
            'خلط بين بعض المفاهيم والقواعد المتشابهة عند الانتقال إلى التطبيق.',
            `ضعف الدقة في ${domainTerms.reasoning} والاكتفاء بإعطاء أحكام أو نتائج مختصرة دون تعليل.`,
            'بطء في إنجاز الأنشطة مما أثر على استكمال كافة أسئلة الموضوع.',
          ],
          programmedRemediationBullets: [
            'تقسيم القسم إلى مجموعات حاجة متجانسة خلال حصة الدعم والمعالجة.',
            'إنجاز بطاقات منهجية ملخصة للمفاهيم الأساسية وتطبيقاتها المباشرة.',
            'تدريب المتعلمين على تدبير زمن الفرض وتدرج صعوبة الأسئلة.',
          ],
          remediationNotes:
            'اعتماد بيداغوجيا الخطأ لتحليل الأجوبة المتعثرة جماعياً، ثم تكليف كل فئة بسلسلة أنشطة ملائمة لمستوى تحكمها.',
        },
      }));
    } else {
      onUpdateTemplate((prev) => ({
        ...prev,
        pedagogicalContent: {
          ...prev.pedagogicalContent,
          generalObservation: `كشفت نتائج الفرض عن تعثرات ملحوظة في التحكم في المكتسبات القبلية والمفاهيم الأساسية (${failCount} متعلماً دون المعدل)، مما يستوجب خطة دعم استدراكي مستعجلة.`,
          strengths: [
            'رصد محاولات أولية لفهم سياق الوضعيات التقويمية لدى بعض المتعلمين.',
            'تحديد دقيق لمكامن الخلل الأساس مما ييسر برمجة تدخل علاجي موجه.',
          ],
          weaknesses: [
            `نقص حاد في ${domainTerms.prerequisites}.`,
            `صعوبة في ${domainTerms.representation}.`,
            'غياب المراجعة المنتظمة وإنجاز الأنشطة المنزلية لدى فئة من المتعلمين.',
          ],
          programmedRemediationBullets: [
            'تخصيص حصة دعم استدراكي مكثف لإرساء التعلمات الأساس قبل الشروع في المحور الموالي.',
            'اعتماد وضعيات مبسطة ومتدرجة الصعوبة لاسترجاع الثقة وبناء المفهوم خطوة بخطوة.',
            'تتبع فردي صارم لدفاتر التمارين والواجبات المنزلية مع إشعار الإدارة التربوية بالحالات الحرجة.',
          ],
          remediationNotes:
            'برمجة تقويم تكويني قصير بعد حصة المعالجة لقياس أثر الدعم والتأكد من تقليص الفوارق المسجلة.',
        },
      }));
    }
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    onUpdateTemplate((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.sections.length) return prev;
      const copy = [...prev.sections];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return { ...prev, sections: copy };
    });
  };

  const updateBracket = (id: string, patch: Partial<ScoreBracket>) => {
    onUpdateTemplate((prev) => ({
      ...prev,
      brackets: prev.brackets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const showMetadata = activeTab === 'all' || activeTab === 'metadata';
  const showPedagogy = activeTab === 'all' || activeTab === 'pedagogy';
  const showLayout = activeTab === 'all' || activeTab === 'layout';

  return (
    <div className="step-transition space-y-6">
      {/* Top Contextual Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            تخصيص المعطيات والتحليل التربوي
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            <span>{metadata.className ? `القسم ${metadata.className}` : 'لم يُحدد القسم بعد'}</span>
            <span aria-hidden="true"> · </span>
            <span>
              {stats.present > 0 ? `المعدل ${stats.average.toFixed(2)}/20` : 'بانتظار النقط'}
            </span>
            <span aria-hidden="true"> · </span>
            <span>عتبة المعدل {template.passThreshold}/20</span>
            <span aria-hidden="true"> · </span>
            <span className="text-teal-800">حفظ تلقائي في المتصفح</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
            {(
              [
                { id: 'all', label: 'عرض شامل' },
                { id: 'metadata', label: 'المعطيات' },
                { id: 'pedagogy', label: 'التحليل والدعم' },
                { id: 'layout', label: 'البنية والفئات' },
              ] as { id: CustomizeTab; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === tab.id
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
            disabled={stats.total === 0}
            onClick={onNextStep}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>معاينة التقرير النهائي (A4)</span>
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {(showMetadata || showPedagogy) && (
        <div className="space-y-4">
          <Memo142MathPanel
            metadata={metadata}
            stats={stats}
            template={template}
            onUpdateMetadata={onUpdateMetadata}
            onUpdateTemplate={onUpdateTemplate}
          />
          <CompetencyBankPanel
            metadata={metadata}
            template={template}
            onUpdateMetadata={onUpdateMetadata}
            onUpdateTemplate={onUpdateTemplate}
          />
        </div>
      )}

      <div
        className={`grid grid-cols-1 gap-6 ${
          activeTab === 'all' || activeTab === 'layout' ? 'lg:grid-cols-12' : ''
        }`}
      >
        {/* Right Column: Metadata and/or Layout */}
        {(showMetadata || showLayout) && (
          <div
            className={`space-y-6 ${
              activeTab === 'all' || activeTab === 'layout' ? 'lg:col-span-6' : ''
            }`}
          >
            {showMetadata && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      01. المعطيات الإدارية والتربوية
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      تُحفظ بيانات المؤسسة والأستاذ تلقائياً لاستعادتها في الزيارات القادمة
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onResetInstitutionSettings}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    استعادة الافتراضي
                  </button>
                </div>

                {/* Group A: Persistent Institution & Teacher Details */}
                <div className="mb-3 text-xs font-bold text-teal-800">
                  أ. بيانات المؤسسة والأستاذ (تُحفظ تلقائياً)
                </div>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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
                        placeholder: 'اسم الثانوية أو الإعدادية...',
                      },
                      {
                        key: 'schoolYear',
                        label: 'الموسم الدراسي',
                        placeholder: '2025/2026',
                      },
                      {
                        key: 'cycle',
                        label: 'السلك الدراسي',
                        placeholder: 'السلك الثانوي التأهيلي / الإعدادي',
                      },
                      {
                        key: 'subject',
                        label: 'المادة الدراسية',
                        placeholder: 'مثال: الرياضيات',
                      },
                      {
                        key: 'teacherName',
                        label: 'اسم الأستاذ(ة)',
                        placeholder: 'الاسم الكامل للأستاذ(ة)',
                      },
                    ] as { key: keyof MassarMetadata; label: string; placeholder: string }[]
                  ).map((field) => (
                    <div
                      key={field.key}
                      className={field.key === 'teacherName' ? 'sm:col-span-2' : ''}
                    >
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={metadata[field.key]}
                        placeholder={field.placeholder}
                        onChange={(e) => onUpdateMetadata({ [field.key]: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Teacher Signature Field (Manual Text or Uploaded Image) — placed right below teacherName */}
                <div className="mt-4 rounded-xl border border-teal-200/80 bg-teal-50/25 p-3.5">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        توقيع الأستاذ(ة) (يظهر في أسفل التقرير المطبوع)
                      </h3>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        اختر بين كتابة التوقيع يدوياً أو رفع صورة لتوقيعك الشخصي لطباعته في خانة توقيع الأستاذ
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            headerConfig: {
                              ...prev.headerConfig,
                              teacherSignatureMode: 'manual',
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          (template.headerConfig.teacherSignatureMode || 'manual') === 'manual'
                            ? 'bg-white text-teal-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <PenTool className="h-3 w-3" />
                        كتابة التوقيع يدوياً
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            headerConfig: {
                              ...prev.headerConfig,
                              teacherSignatureMode: 'image',
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          template.headerConfig.teacherSignatureMode === 'image'
                            ? 'bg-white text-teal-800 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ImagePlus className="h-3 w-3" />
                        رفع صورة التوقيع
                      </button>
                    </div>
                  </div>

                  {(template.headerConfig.teacherSignatureMode || 'manual') === 'manual' ? (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        نص توقيع الأستاذ (اختياري)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={template.headerConfig.teacherSignatureText || ''}
                          onChange={(e) =>
                            onUpdateTemplate((prev) => ({
                              ...prev,
                              headerConfig: {
                                ...prev.headerConfig,
                                teacherSignatureText: e.target.value,
                              },
                            }))
                          }
                          placeholder={
                            metadata.teacherName
                              ? `إمضاء: ذ. ${metadata.teacherName}`
                              : 'اكتب صيغة التوقيع اليدوي هنا...'
                          }
                          className="flex-1 min-w-[200px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                        />
                        {metadata.teacherName &&
                          template.headerConfig.teacherSignatureText !==
                            `إمضاء: ذ. ${metadata.teacherName}` && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateTemplate((prev) => ({
                                  ...prev,
                                  headerConfig: {
                                    ...prev.headerConfig,
                                    teacherSignatureText: `إمضاء: ذ. ${metadata.teacherName}`,
                                  },
                                }))
                              }
                              className="rounded-lg border border-teal-700/30 bg-teal-50 px-2.5 py-1.5 text-[11px] font-semibold text-teal-900 hover:bg-teal-100 cursor-pointer"
                            >
                              إدراج اسم الأستاذ تلقائياً
                            </button>
                          )}
                        {template.headerConfig.teacherSignatureText && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateTemplate((prev) => ({
                                ...prev,
                                headerConfig: {
                                  ...prev.headerConfig,
                                  teacherSignatureText: '',
                                },
                              }))
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          >
                            مسح
                          </button>
                        )}
                      </div>
                      {template.headerConfig.teacherSignatureText?.trim() && (
                        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2">
                          <span className="text-[11px] text-slate-500">معاينة التوقيع اليدوي:</span>
                          <span
                            className="font-serif text-sm font-bold italic"
                            style={{ color: template.styleConfig.accentColor || '#1e3a8a' }}
                          >
                            {template.headerConfig.teacherSignatureText}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <input
                        ref={signatureInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadSignatureImage(file);
                          }
                          e.target.value = '';
                        }}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => signatureInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 transition-colors hover:bg-teal-100 cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {template.headerConfig.teacherSignatureImage
                              ? 'تغيير صورة التوقيع'
                              : 'اختيار صورة التوقيع (PNG / JPG)'}
                          </button>
                          {template.headerConfig.teacherSignatureImage && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateTemplate((prev) => ({
                                  ...prev,
                                  headerConfig: {
                                    ...prev.headerConfig,
                                    teacherSignatureImage: '',
                                  },
                                }))
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              حذف الصورة
                            </button>
                          )}
                        </div>
                        <span className="text-[10.5px] text-slate-500">
                          يُفضل استخدام صورة توقيع بخلفية شفافة (PNG) أو بيضاء
                        </span>
                      </div>

                      {signatureUploadError && (
                        <p className="mt-2 text-xs font-semibold text-red-600">
                          {signatureUploadError}
                        </p>
                      )}

                      {template.headerConfig.teacherSignatureImage && (
                        <div className="mt-2.5 flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2">
                          <span className="text-[11px] text-slate-500">معاينة صورة التوقيع:</span>
                          <img
                            src={template.headerConfig.teacherSignatureImage}
                            alt="توقيع الأستاذ"
                            className="max-h-11 max-w-[150px] object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Group B: Class & Exam Details */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-3 text-xs font-bold text-teal-800">
                    ب. بيانات القسم والفرض المحروس
                  </div>
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        المستوى الدراسي
                      </label>
                      <input
                        type="text"
                        value={metadata.level}
                        placeholder="مثال: الجذع المشترك العلمي"
                        onChange={(e) => onUpdateMetadata({ level: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        القسم
                      </label>
                      <input
                        type="text"
                        value={metadata.className}
                        placeholder="مثال: TCSF-1"
                        onChange={(e) => onUpdateMetadata({ className: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>

                    {/* Exam Number with Quick Select */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        رقم الفرض
                      </label>
                      <input
                        type="text"
                        value={metadata.examNumber}
                        placeholder="الفرض المحروس رقم 1"
                        onChange={(e) => onUpdateMetadata({ examNumber: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {EXAM_NUMBER_OPTIONS.map((opt) => {
                          const isSelected =
                            metadata.examNumber.trim() === opt.value ||
                            extractExamNumberFromHeader(metadata.examNumber) === opt.value;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => onUpdateMetadata({ examNumber: opt.value })}
                              className={`rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                                isSelected
                                  ? 'border-teal-700 bg-teal-50 text-teal-800'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Semester with Quick Select */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        الدورة / الأسدوس
                      </label>
                      <input
                        type="text"
                        value={metadata.semester}
                        placeholder="الدورة الأولى"
                        onChange={(e) => onUpdateMetadata({ semester: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                      <div className="mt-1.5 flex items-center gap-1">
                        {['الدورة الأولى', 'الدورة الثانية'].map((sem) => (
                          <button
                            key={sem}
                            type="button"
                            onClick={() => onUpdateMetadata({ semester: sem })}
                            className={`rounded border px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                              metadata.semester.trim() === sem
                                ? 'border-teal-700 bg-teal-50 text-teal-800'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {sem}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        تاريخ التمرير
                      </label>
                      <input
                        type="date"
                        value={metadata.examDate}
                        onChange={(e) => onUpdateMetadata({ examDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        تاريخ التصحيح
                      </label>
                      <input
                        type="date"
                        value={metadata.correctionDate}
                        onChange={(e) => onUpdateMetadata({ correctionDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        مدة الإنجاز
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={metadata.duration}
                          placeholder="2h"
                          onChange={(e) => onUpdateMetadata({ duration: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                        />
                        {['1h', '2h'].map((dur) => (
                          <button
                            key={dur}
                            type="button"
                            onClick={() => onUpdateMetadata({ duration: dur })}
                            className={`rounded-md border px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                              metadata.duration.trim() === dur
                                ? 'border-teal-700 bg-teal-50 text-teal-800'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {dur}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        معامل الفرض (النسبة المئوية)
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[95px]">
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            value={metadata.coefficient.replace(/%/g, '').trim()}
                            placeholder="33.33"
                            onChange={(e) => {
                              const normalized = e.target.value
                                .replace(/,/g, '.')
                                .replace(/[^\d.]/g, '');
                              const parts = normalized.split('.');
                              const singleDot =
                                parts.length > 1
                                  ? `${parts[0]}.${parts.slice(1).join('')}`
                                  : normalized;
                              const num = Number.parseFloat(singleDot);
                              const capped =
                                singleDot !== '' && Number.isFinite(num) && num > 100
                                  ? '100'
                                  : singleDot;
                              onUpdateMetadata({
                                coefficient: capped ? `${capped}%` : '',
                              });
                            }}
                            onBlur={() => {
                              const raw = metadata.coefficient.replace(/%/g, '').trim();
                              if (!raw) return;
                              const num = Number.parseFloat(raw);
                              if (Number.isFinite(num)) {
                                const clamped = Math.max(0, Math.min(100, num));
                                const clean = Number.isInteger(clamped)
                                  ? String(clamped)
                                  : String(Math.round(clamped * 100) / 100);
                                onUpdateMetadata({ coefficient: `${clean}%` });
                              }
                            }}
                            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-7 pr-3 text-left font-mono text-sm font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                          />
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-500">
                            %
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {[
                            { pct: '20%', hint: 'معامل 20%' },
                            { pct: '25%', hint: '4 فروض محروسة في الدورة (25% لكل فرض)' },
                            { pct: '30%', hint: 'معامل 30%' },
                            { pct: '33.33%', hint: '3 فروض محروسة في الدورة (33.33% لكل فرض)' },
                            { pct: '50%', hint: 'فرضان محروسان في الدورة (50% لكل فرض)' },
                          ].map(({ pct, hint }) => {
                            const isSelected = metadata.coefficient.trim() === pct;
                            return (
                              <button
                                key={pct}
                                type="button"
                                title={hint}
                                onClick={() => onUpdateMetadata({ coefficient: pct })}
                                className={`rounded-md border px-2 py-1 font-mono text-[11px] font-semibold tabular-nums transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'border-teal-700 bg-teal-50 text-teal-800'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                {pct}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        محتوى الفرض والدروس المقومة
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById('competency-framework-bank')
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                        className="text-[11px] font-semibold text-teal-800 hover:underline cursor-pointer"
                      >
                        اختيار سريع من بنك الكفايات ↑
                      </button>
                    </div>
                    <input
                      type="text"
                      value={metadata.examContent}
                      placeholder="اذكر المحاور والدروس المشمولة في الفرض..."
                      onChange={(e) => onUpdateMetadata({ examContent: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      معايير بناء موضوع الفرض (مذكرة التقويم)
                    </label>
                    <textarea
                      rows={2}
                      value={metadata.examCriteria}
                      onChange={(e) => onUpdateMetadata({ examCriteria: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        سلم التنقيط وتوزيع التمارين
                      </label>
                      <input
                        type="text"
                        value={metadata.gradingScaleNote}
                        placeholder="مثال: التمرين 1 (6ن) · التمرين 2 (8ن)..."
                        onChange={(e) => onUpdateMetadata({ gradingScaleNote: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        صيغة المعالجة المبرمجة
                      </label>
                      <input
                        type="text"
                        value={metadata.remediationFormat}
                        onChange={(e) => onUpdateMetadata({ remediationFormat: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {showMetadata && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAttachPdfFile(file);
                    e.target.value = '';
                  }}
                />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                      <Paperclip className="h-4 w-4 text-teal-700" />
                      <span>إرفاق نسخة PDF من الفرض المحروس الأصلي (ملحق الأرشفة)</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      تُعرض صفحات الفرض المرفق تلقائياً كملحق في نهاية التقرير النهائي (المعاينة، الطباعة A4، وتصدير PDF)
                    </p>
                  </div>
                  {examAttachment && (
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentError(null);
                        onUpdateExamAttachment(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50/70 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      إزالة المرفق
                    </button>
                  )}
                </div>

                {attachmentError && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {attachmentError}
                  </p>
                )}

                {!examAttachment ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handleAttachPdfFile(file);
                    }}
                    className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition-colors hover:border-teal-600/60"
                  >
                    {isAttachingPdf ? (
                      <div className="flex flex-col items-center gap-2 text-xs font-semibold text-teal-800">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
                        <span>جاري معالجة وتحويل صفحات ملف PDF للأرشفة...</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="mb-2 h-8 w-8 text-teal-700" strokeWidth={1.6} />
                        <p className="text-xs font-bold text-slate-800">
                          اسحب ملف الفرض المحروس الأصلي (.pdf) هنا أو اختره من جهازك
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          اختياري · يدعم ملفات PDF حتى 10 صفحات · يُحفظ تلقائياً في المتصفح
                        </p>
                        <button
                          type="button"
                          onClick={() => pdfInputRef.current?.click()}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5 text-teal-700" />
                          <span>اختيار ملف PDF للفرض الأصلي</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="h-5 w-5 shrink-0 text-teal-700" />
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-900">
                            {examAttachment.fileName}
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono tabular-nums">
                            {examAttachment.pageCount}{' '}
                            {examAttachment.pageCount === 1 ? 'صفحة' : 'صفحات'} ·{' '}
                            {(examAttachment.fileSize / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                      >
                        تغيير الملف
                      </button>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {examAttachment.pageImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xs"
                        >
                          <img
                            src={img}
                            alt={`صفحة الفرض ${idx + 1}`}
                            className="h-24 w-auto object-contain"
                          />
                          <div className="mt-1 text-center font-mono text-[10px] font-semibold text-slate-500">
                            ص {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {showLayout && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      02. خطوط الكتابة والألوان وتنسيق التقرير
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      اختر الخط العربي المناسب وهوية الألوان المؤسساتية وتخطيط الجداول والأطر
                    </p>
                  </div>
                </div>

                {/* Ready Template Presets Selector */}
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-2 text-xs font-bold text-slate-800">
                    نماذج التقارير الجاهزة المعتمدة (تبديل فوري مع الحفاظ على صياغتك التربوية)
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {TEMPLATE_PRESETS.map((preset) => {
                      const isPresetActive = template.id === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setDocxImportResult(null);
                            setDocxImportError(null);
                            onUpdateTemplate((prev) => {
                              const prevLang = prev.headerConfig.reportLanguage || 'ar';
                              const prevIncludeFr = Boolean(
                                prev.headerConfig.includeFrenchHeader
                              );
                              const preservedSignature = {
                                teacherSignatureMode: prev.headerConfig.teacherSignatureMode,
                                teacherSignatureText: prev.headerConfig.teacherSignatureText,
                                teacherSignatureImage: prev.headerConfig.teacherSignatureImage,
                              };
                              if (prevLang === 'ar') {
                                return {
                                  ...preset,
                                  headerConfig: {
                                    ...preset.headerConfig,
                                    ...preservedSignature,
                                    reportLanguage: prevLang,
                                    includeFrenchHeader: prevIncludeFr,
                                  },
                                  pedagogicalContent: prev.pedagogicalContent,
                                  remediationCardsConfig: prev.remediationCardsConfig,
                                };
                              }
                              const localized = getReportLabels(prevLang);
                              return {
                                ...preset,
                                headerConfig: {
                                  ...preset.headerConfig,
                                  ...preservedSignature,
                                  reportLanguage: prevLang,
                                  includeFrenchHeader: prevIncludeFr,
                                  countryLine: localized.countryLine,
                                  ministryLine: localized.ministryLine,
                                  reportTitle: localized.defaultReportTitle,
                                  reportSubtitle: localized.defaultReportSubtitle,
                                  appendixTitle: localized.defaultAppendixTitle,
                                },
                                pedagogicalContent: prev.pedagogicalContent,
                                remediationCardsConfig: prev.remediationCardsConfig,
                              };
                            });
                          }}
                          className={`rounded-lg border p-2.5 text-right transition-all cursor-pointer ${
                            isPresetActive
                              ? 'border-teal-700 bg-teal-50/70 ring-1 ring-teal-700/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900">{preset.name}</div>
                          <div className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-slate-500">
                            {preset.analysisSummary || preset.headerConfig.reportTitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Institutional Word (.docx) Template Importer */}
                  <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <FileUp className="h-3.5 w-3.5 text-teal-700" />
                          <span>استيراد وتكييف قالب تقرير Word رسمي (.docx)</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          ارفع نموذج Word المعتمد بمؤسستك لاستخلاص الترويسة، لغة التقرير، العتبات، والأقسام وتطبيقها فوراً على التصميم.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={docxInputRef}
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleImportDocxTemplate(file);
                            }
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          disabled={isImportingDocx}
                          onClick={() => docxInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-900 transition-colors hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        >
                          {isImportingDocx ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {isImportingDocx
                            ? 'جاري استخراج وتحليل القالب...'
                            : 'اختيار ملف Word (.docx)'}
                        </button>
                      </div>
                    </div>

                    {docxImportError && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-800">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                        <span>{docxImportError}</span>
                      </div>
                    )}

                    {template.sourceType === 'analyzed-docx' && (
                      <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-[11.5px] text-emerald-950">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                            <span>
                              القالب المستورد النشط:{' '}
                              {template.sourceFileName ||
                                docxImportResult?.extractedTitle ||
                                'ملف Word'}
                            </span>
                          </div>
                          {docxImportResult && (
                            <span className="font-mono text-[10.5px] font-semibold text-emerald-800 tabular-nums">
                              {docxImportResult.detectedSectionsCount} أقسام مفعّلة •{' '}
                              {docxImportResult.usedAiEnhancement
                                ? 'تحليل ذكي معزّز'
                                : 'تحليل بنيوي فوري'}
                            </span>
                          )}
                        </div>
                        {(docxImportResult?.summaryNotes || template.detectedNotes) && (
                          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[11px] text-emerald-900">
                            {(
                              docxImportResult?.summaryNotes ||
                              template.detectedNotes ||
                              []
                            )
                              .slice(0, 4)
                              .map((note, idx) => (
                                <li key={idx}>{note}</li>
                              ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <label className="block text-xs font-semibold text-slate-700">
                        التسمية الرسمية للوزارة في الترويسة
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          {
                            label: 'التسمية الرسمية للوزارة',
                            value: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
                          },
                          {
                            label: 'الصيغة المختصرة',
                            value: 'وزارة التربية الوطنية',
                          },
                        ].map((minOpt) => (
                          <button
                            key={minOpt.label}
                            type="button"
                            onClick={() =>
                              onUpdateTemplate((prev) => ({
                                ...prev,
                                headerConfig: {
                                  ...prev.headerConfig,
                                  ministryLine: minOpt.value,
                                },
                              }))
                            }
                            className={`rounded border px-2 py-0.5 text-[10.5px] font-semibold transition-colors cursor-pointer ${
                              template.headerConfig.ministryLine === minOpt.value
                                ? 'border-teal-700 bg-teal-50 text-teal-900'
                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {minOpt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={template.headerConfig.ministryLine}
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          headerConfig: { ...prev.headerConfig, ministryLine: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      عنوان التقرير الرئيسي
                    </label>
                    <input
                      type="text"
                      value={template.headerConfig.reportTitle}
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          headerConfig: { ...prev.headerConfig, reportTitle: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bilingual BIOF / APIC & International Report Language */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">
                        لغة التقرير والبطاقات (المسالك العامة والدولية BIOF / APIC)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        تبديل اتجاه الوثيقة (RTL/LTR) ومصطلحات التقرير وتصدير Word والتوليد التربوي
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lang = template.headerConfig.reportLanguage || 'ar';
                        const localized = getReportLabels(lang);
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          headerConfig: {
                            ...prev.headerConfig,
                            countryLine: localized.countryLine,
                            ministryLine: localized.ministryLine,
                            reportTitle: localized.defaultReportTitle,
                            reportSubtitle: localized.defaultReportSubtitle,
                            appendixTitle: localized.defaultAppendixTitle,
                          },
                        }));
                      }}
                      className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 cursor-pointer"
                    >
                      تطبيق العناوين الافتراضية لهذه اللغة
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(
                      [
                        {
                          id: 'ar' as ReportLanguage,
                          title: 'العربية (المسلك العام)',
                          sub: 'اتجاه RTL · وثيقة وزارية عربية',
                        },
                        {
                          id: 'fr' as ReportLanguage,
                          title: 'Français (BIOF / APIC)',
                          sub: 'Direction LTR · Fiche officielle MEN',
                        },
                        {
                          id: 'en' as ReportLanguage,
                          title: 'English (International)',
                          sub: 'Direction LTR · Exam Analysis',
                        },
                      ]
                    ).map((langOpt) => {
                      const currentLang = template.headerConfig.reportLanguage || 'ar';
                      const active = currentLang === langOpt.id;
                      return (
                        <button
                          key={langOpt.id}
                          type="button"
                          onClick={() => {
                            const localized = getReportLabels(langOpt.id);
                            const prevLang = template.headerConfig.reportLanguage || 'ar';
                            const prevDefaults = getReportLabels(prevLang);
                            onUpdateTemplate((prev) => {
                              const hc = prev.headerConfig;
                              const isDefaultTitle =
                                !hc.reportTitle || hc.reportTitle === prevDefaults.defaultReportTitle || hc.reportTitle === 'تقرير تحليل نتائج الفرض المحروس' || hc.reportTitle === 'بطاقة تقرير وتتبع الفرض المحروس';
                              const isDefaultMinistry =
                                !hc.ministryLine || hc.ministryLine === prevDefaults.ministryLine;
                              const isDefaultCountry =
                                !hc.countryLine || hc.countryLine === prevDefaults.countryLine;
                              const isDefaultSub =
                                !hc.reportSubtitle || hc.reportSubtitle === prevDefaults.defaultReportSubtitle;
                              const isDefaultApp =
                                !hc.appendixTitle || hc.appendixTitle === prevDefaults.defaultAppendixTitle;
                              return {
                                ...prev,
                                headerConfig: {
                                  ...hc,
                                  reportLanguage: langOpt.id,
                                  includeFrenchHeader:
                                    langOpt.id === 'fr' ? true : hc.includeFrenchHeader,
                                  countryLine: isDefaultCountry
                                    ? localized.countryLine
                                    : hc.countryLine,
                                  ministryLine: isDefaultMinistry
                                    ? localized.ministryLine
                                    : hc.ministryLine,
                                  reportTitle: isDefaultTitle
                                    ? localized.defaultReportTitle
                                    : hc.reportTitle,
                                  reportSubtitle: isDefaultSub
                                    ? localized.defaultReportSubtitle
                                    : hc.reportSubtitle,
                                  appendixTitle: isDefaultApp
                                    ? localized.defaultAppendixTitle
                                    : hc.appendixTitle,
                                },
                              };
                            });
                          }}
                          className={`rounded-lg border p-2.5 text-right transition-all cursor-pointer ${
                            active
                              ? 'border-teal-700 bg-teal-50/80 ring-1 ring-teal-700/20'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900">{langOpt.title}</div>
                          <div className="mt-0.5 text-[10.5px] text-slate-500">{langOpt.sub}</div>
                        </button>
                      );
                    })}
                  </div>

                  <label className="mt-2.5 inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(template.headerConfig.includeFrenchHeader)}
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          headerConfig: {
                            ...prev.headerConfig,
                            includeFrenchHeader: e.target.checked,
                          },
                        }))
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                    />
                    <span>إظهار التسمية الفرنسية الموازية في الترويسة (Royaume du Maroc / MEN)</span>
                  </label>
                </div>

                {/* Curated Arabic Font Gallery */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-800">
                      مكتبة خطوط الكتابة العربية المعتمدة
                    </h3>
                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                      {(
                        [
                          { id: 'compact', label: 'مضغوط' },
                          { id: 'standard', label: 'متوازن' },
                          { id: 'comfortable', label: 'مريح' },
                        ] as { id: ReportFontScale; label: string }[]
                      ).map((sc) => {
                        const activeScale = (template.styleConfig.fontScale || 'standard') === sc.id;
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
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                              activeScale
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {REPORT_FONT_OPTIONS.map((fontOpt) => {
                      const isSelected = template.styleConfig.fontFamily === fontOpt.id;
                      return (
                        <button
                          key={fontOpt.id}
                          type="button"
                          onClick={() =>
                            onUpdateTemplate((prev) => ({
                              ...prev,
                              styleConfig: {
                                ...prev.styleConfig,
                                fontFamily: fontOpt.id as ReportFontFamily,
                              },
                            }))
                          }
                          className={`flex flex-col justify-between rounded-xl border p-3 text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'border-teal-700 bg-teal-50/45 ring-2 ring-teal-700/15'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-bold text-slate-900 ${fontOpt.cssClass}`}
                            >
                              {fontOpt.name}
                            </span>
                            <span className="text-[10.5px] font-semibold text-teal-800">
                              {fontOpt.tag}
                            </span>
                          </div>
                          <div
                            className={`mt-1.5 flex items-baseline justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-1.5 text-xs text-slate-800 ${fontOpt.cssClass}`}
                          >
                            <span className="truncate">بطاقة تقرير وتتبع الفرض</span>
                            <span className="font-mono text-[11px] font-bold tabular-nums text-slate-700 shrink-0">
                              18.75/20
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                            {fontOpt.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Curated Color Palettes + Custom Pickers */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-800">
                      الألوان والهوية البصرية للتقرير
                    </h3>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span>الرئيسي</span>
                        <input
                          type="color"
                          aria-label="تخصيص اللون الرئيسي"
                          value={template.styleConfig.accentColor}
                          onChange={(e) =>
                            onUpdateTemplate((prev) => ({
                              ...prev,
                              styleConfig: { ...prev.styleConfig, accentColor: e.target.value },
                            }))
                          }
                          className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span>الثانوي</span>
                        <input
                          type="color"
                          aria-label="تخصيص اللون الثانوي"
                          value={template.styleConfig.secondaryAccent || '#1e293b'}
                          onChange={(e) =>
                            onUpdateTemplate((prev) => ({
                              ...prev,
                              styleConfig: {
                                ...prev.styleConfig,
                                secondaryAccent: e.target.value,
                              },
                            }))
                          }
                          className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                          className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-right transition-all cursor-pointer ${
                            isActive
                              ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200">
                            <span
                              className="h-8 w-4"
                              style={{ backgroundColor: theme.accentColor }}
                            />
                            <span
                              className="h-8 w-3"
                              style={{ backgroundColor: theme.secondaryAccent }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-900">
                              {theme.name}
                            </div>
                            <div className="truncate text-[10.5px] text-slate-500">
                              {theme.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Compact Typography & Color Specimen */}
                  {(() => {
                    const activeFont =
                      REPORT_FONT_OPTIONS.find((f) => f.id === template.styleConfig.fontFamily) ||
                      REPORT_FONT_OPTIONS[0];
                    const primary = template.styleConfig.accentColor || '#1e3a8a';
                    const secondary = template.styleConfig.secondaryAccent || '#0f766e';
                    return (
                      <div
                        className={`mt-3 overflow-hidden rounded-xl border bg-white ${activeFont.cssClass}`}
                        style={{ borderColor: `${primary}40` }}
                      >
                        <div
                          className="flex items-center justify-between px-3 py-1.5 text-xs font-bold text-white"
                          style={{ backgroundColor: primary }}
                        >
                          <span>معاينة حية للخط واللون: {template.headerConfig.reportTitle}</span>
                          <span className="font-mono text-[11px] tabular-nums opacity-90">
                            {activeFont.name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-slate-800">
                          <span>
                            المملكة المغربية ·{' '}
                            <strong style={{ color: primary }}>
                              {template.headerConfig.ministryLine}
                            </strong>
                          </span>
                          <span
                            className="font-mono text-[11px] font-bold tabular-nums"
                            style={{ color: secondary }}
                          >
                            معدل القسم: {stats.present > 0 ? stats.average.toFixed(2) : '13.45'}/20
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Layout Style, Table Headers & Chart Type */}
                <div className="mt-5 grid grid-cols-1 gap-3.5 border-t border-slate-100 pt-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      أسلوب التاطير والأقسام
                    </label>
                    <select
                      value={template.styleConfig.borderStyle}
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          styleConfig: {
                            ...prev.styleConfig,
                            borderStyle: e.target
                              .value as ReportTemplateSchema['styleConfig']['borderStyle'],
                            showOuterFrame: e.target.value === 'official-double',
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    >
                      <option value="section-banners">أشرطة ملونة حديثة</option>
                      <option value="official-double">إطار رسمي مزدوج</option>
                      <option value="classic-grid">خطوط فصل كلاسيكية</option>
                      <option value="modern-minimal">تصميم بسيط هادئ</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      تلوين رؤوس الجداول
                    </label>
                    <select
                      value={template.styleConfig.tableHeaderBg}
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          styleConfig: {
                            ...prev.styleConfig,
                            tableHeaderBg: e.target
                              .value as ReportTemplateSchema['styleConfig']['tableHeaderBg'],
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    >
                      <option value="neutral">رمادي مؤسساتي محايد</option>
                      <option value="tinted">تظليل متناغم مع اللون</option>
                      <option value="solid-accent">تعبئة كاملة باللون الرئيسي</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      نمط المبيان الإحصائي
                    </label>
                    <select
                      value={template.styleConfig.chartType}
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          styleConfig: {
                            ...prev.styleConfig,
                            chartType: e.target
                              .value as ReportTemplateSchema['styleConfig']['chartType'],
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    >
                      <option value="donut">مبيان دائري (Donut)</option>
                      <option value="bar">أعمدة عمودية</option>
                      <option value="horizontal-bar">أشرطة أفقية</option>
                      <option value="none">بدون مبيان</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  <h3 className="mb-2.5 text-xs font-bold text-slate-800">
                    ترتيب وتفعيل أقسام النموذج
                  </h3>
                  <div className="space-y-2">
                    {template.sections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTemplate((prev) => ({
                              ...prev,
                              sections: prev.sections.map((s) =>
                                s.id === sec.id ? { ...s, enabled: !s.enabled } : s
                              ),
                            }))
                          }
                          aria-label={sec.enabled ? 'إخفاء القسم' : 'إظهار القسم'}
                          className="text-slate-600 hover:text-teal-700 cursor-pointer"
                        >
                          {sec.enabled ? (
                            <Eye className="h-4 w-4 text-teal-700" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          )}
                        </button>

                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) =>
                            onUpdateTemplate((prev) => ({
                              ...prev,
                              sections: prev.sections.map((s) =>
                                s.id === sec.id ? { ...s, title: e.target.value } : s
                              ),
                            }))
                          }
                          className={`flex-1 bg-transparent text-xs font-semibold focus:outline-none ${
                            sec.enabled ? 'text-slate-900' : 'text-slate-400 line-through'
                          }`}
                        />

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveSection(idx, -1)}
                            aria-label="تحريك للأعلى"
                            className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === template.sections.length - 1}
                            onClick={() => moveSection(idx, 1)}
                            aria-label="تحريك للأسفل"
                            className="rounded p-1 text-slate-500 hover:bg-white disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Left Column: Pedagogical Diagnosis and/or Brackets */}
        {(showPedagogy || showLayout) && (
          <div
            className={`space-y-6 ${
              activeTab === 'all' || activeTab === 'layout' ? 'lg:col-span-6' : ''
            }`}
          >
            {showPedagogy && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      03. تشخيص التعثرات وخطة المعالجة والدعم
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      صياغة قابلة للتعديل الكامل أو التوليد الذكي انطلاقا من نتائج القسم الحقيقية
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPedagogyScenario('auto')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-teal-600 hover:bg-teal-50/60 hover:text-teal-900 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>صياغة فورية من إحصائيات القسم</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDrafting || stats.present === 0}
                      onClick={handleGeneratePedagogy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {isDrafting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      توليد ذكي معمق
                    </button>
                  </div>
                </div>

                {/* Live Diagnostic Reference Strip */}
                {stats.present > 0 && (
                  <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 sm:grid-cols-4">
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-slate-500">المعدل العام</div>
                      <div className="font-mono text-xs font-extrabold tabular-nums text-slate-900">
                        {stats.average.toFixed(2)}/20
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-slate-500">نسبة التحكم</div>
                      <div className="font-mono text-xs font-extrabold tabular-nums text-teal-800">
                        {stats.passRate.toFixed(1)}% ({stats.passed})
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-slate-500">فئة التميز</div>
                      <div className="font-mono text-xs font-extrabold tabular-nums text-emerald-700">
                        {stats.topStudents.length} تلميذاً
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-semibold text-slate-500">الدعم الاستدراكي</div>
                      <div className="font-mono text-xs font-extrabold tabular-nums text-amber-800">
                        {stats.failed} تلميذاً
                      </div>
                    </div>
                  </div>
                )}

                {/* Ready Memo 142 Pedagogical Scenarios */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/40 px-3 py-2">
                  <span className="text-[11px] font-bold text-slate-700">
                    سيناريوهات جاهزة (مذكرة التقويم):
                  </span>
                  {[
                    { id: 'high', label: 'تحكم جيد وأداء متميز' },
                    { id: 'mixed', label: 'تحكم متوسط وتفاوت المكتسبات' },
                    { id: 'support', label: 'تعثر ملحوظ ودعم مكثف' },
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() =>
                        handleApplyPedagogyScenario(sc.id as 'high' | 'mixed' | 'support')
                      }
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition-colors hover:border-teal-600 hover:bg-teal-50/50 hover:text-teal-900 cursor-pointer"
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>

                {draftError && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    {draftError}
                  </p>
                )}

                {draftSuccessMsg && (
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/85 px-3 py-2 text-xs font-semibold text-emerald-900">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      {draftSuccessMsg}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDraftSuccessMsg(null)}
                      className="text-emerald-700 hover:underline cursor-pointer"
                    >
                      إخفاء
                    </button>
                  </div>
                )}

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-emerald-800">
                      المكتسبات ومواطن القوة المرصودة
                    </label>
                    <div className="space-y-2">
                      {template.pedagogicalContent.strengths.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={s}
                            onChange={(e) =>
                              onUpdateTemplate((prev) => {
                                const next = [...prev.pedagogicalContent.strengths];
                                next[i] = e.target.value;
                                return {
                                  ...prev,
                                  pedagogicalContent: {
                                    ...prev.pedagogicalContent,
                                    strengths: next,
                                  },
                                };
                              })
                            }
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="حذف السطر"
                            onClick={() =>
                              onUpdateTemplate((prev) => ({
                                ...prev,
                                pedagogicalContent: {
                                  ...prev.pedagogicalContent,
                                  strengths: prev.pedagogicalContent.strengths.filter(
                                    (_, idx) => idx !== i
                                  ),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            pedagogicalContent: {
                              ...prev.pedagogicalContent,
                              strengths: [...prev.pedagogicalContent.strengths, ''],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        إضافة موطن قوة مرصود
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="mb-1.5 block text-xs font-bold text-slate-800">
                      التعثرات والصعوبات المرصودة أثناء التصحيح
                    </label>
                    <div className="space-y-2">
                      {template.pedagogicalContent.weaknesses.map((w, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={w}
                            onChange={(e) =>
                              onUpdateTemplate((prev) => {
                                const next = [...prev.pedagogicalContent.weaknesses];
                                next[i] = e.target.value;
                                return {
                                  ...prev,
                                  pedagogicalContent: {
                                    ...prev.pedagogicalContent,
                                    weaknesses: next,
                                  },
                                };
                              })
                            }
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="حذف السطر"
                            onClick={() =>
                              onUpdateTemplate((prev) => ({
                                ...prev,
                                pedagogicalContent: {
                                  ...prev.pedagogicalContent,
                                  weaknesses: prev.pedagogicalContent.weaknesses.filter(
                                    (_, idx) => idx !== i
                                  ),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            pedagogicalContent: {
                              ...prev.pedagogicalContent,
                              weaknesses: [...prev.pedagogicalContent.weaknesses, ''],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        إضافة تعثر مرصود
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="mb-1.5 block text-xs font-bold text-slate-800">
                      خطة المعالجة وقرارات الدعم البيداغوجي المبرمجة
                    </label>
                    <div className="space-y-2">
                      {template.pedagogicalContent.programmedRemediationBullets.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) =>
                              onUpdateTemplate((prev) => {
                                const next = [
                                  ...prev.pedagogicalContent.programmedRemediationBullets,
                                ];
                                next[i] = e.target.value;
                                return {
                                  ...prev,
                                  pedagogicalContent: {
                                    ...prev.pedagogicalContent,
                                    programmedRemediationBullets: next,
                                  },
                                };
                              })
                            }
                            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                          />
                          <button
                            type="button"
                            aria-label="حذف الإجراء"
                            onClick={() =>
                              onUpdateTemplate((prev) => ({
                                ...prev,
                                pedagogicalContent: {
                                  ...prev.pedagogicalContent,
                                  programmedRemediationBullets:
                                    prev.pedagogicalContent.programmedRemediationBullets.filter(
                                      (_, idx) => idx !== i
                                    ),
                                },
                              }))
                            }
                            className="text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            pedagogicalContent: {
                              ...prev.pedagogicalContent,
                              programmedRemediationBullets: [
                                ...prev.pedagogicalContent.programmedRemediationBullets,
                                '',
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        إضافة إجراء دعم مبرمج
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <label className="mb-1.5 block text-xs font-bold text-slate-800">
                      مواطن القوة والملاحظة التركيبية العامة
                    </label>
                    <textarea
                      rows={2}
                      value={template.pedagogicalContent.generalObservation}
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          pedagogicalContent: {
                            ...prev.pedagogicalContent,
                            generalObservation: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />
                  </div>

                  {/* Dedicated Pedagogical Remediation Notes Section */}
                  <div className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label
                          htmlFor="remediation-notes-input"
                          className="block text-xs font-bold text-teal-950"
                        >
                          ملاحظات المعالجة التربوية
                        </label>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          تُدرج وتُصدّر تلقائياً ضمن التقرير النهائي (PDF / Word / طباعة A4)
                        </p>
                      </div>
                      {template.pedagogicalContent.remediationNotes?.trim() && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateTemplate((prev) => ({
                              ...prev,
                              pedagogicalContent: {
                                ...prev.pedagogicalContent,
                                remediationNotes: '',
                              },
                            }))
                          }
                          className="text-[11px] font-semibold text-slate-500 transition-colors hover:text-red-600 cursor-pointer"
                        >
                          مسح الملاحظة
                        </button>
                      )}
                    </div>

                    <textarea
                      id="remediation-notes-input"
                      rows={3}
                      value={template.pedagogicalContent.remediationNotes ?? ''}
                      placeholder="اكتب ملاحظاتك التربوية حول سيرورة المعالجة والدعم، تتبع المتعثرين، أو التوصيات البيداغوجية الخاصة بالقسم..."
                      onChange={(e) =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          pedagogicalContent: {
                            ...prev.pedagogicalContent,
                            remediationNotes: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">
                        إدراج سريع:
                      </span>
                      {[
                        'تخصيص حصة دعم استدراكي فوري للتلاميذ غير المتحكمين قبل الفرض الموالي.',
                        'اعتماد التعلم بالقرين والمجموعات الصغرى لتجاوز الصعوبات المنهجية المرصودة.',
                        'تكليف الفئة المتعثرة بسلسلة تمارين علاجية موجهة مع تتبع فردي لدفاتر البحث.',
                      ].map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            onUpdateTemplate((prev) => {
                              const current = (prev.pedagogicalContent.remediationNotes || '').trim();
                              const nextVal = current
                                ? current.includes(suggestion)
                                  ? current
                                  : `${current} ${suggestion}`
                                : suggestion;
                              return {
                                ...prev,
                                pedagogicalContent: {
                                  ...prev.pedagogicalContent,
                                  remediationNotes: nextVal,
                                },
                              };
                            })
                          }
                          className="rounded-md border border-teal-200 bg-white px-2 py-1 text-[11px] font-medium text-teal-900 transition-colors hover:border-teal-600 hover:bg-teal-50 cursor-pointer"
                        >
                          + مقترح {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Differentiated Need Groups Action Table Editor (remediationActions) */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800">
                          جدول تخطيط مجموعات الحاجة المبرمجة (الفئات المستهدفة والغلاف الزمني)
                        </label>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          يُطبع في قسم «خطة الدعم والمعالجة» ويحدّد الأنشطة الخاصة بكل فئة تحصيلية
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            pedagogicalContent: {
                              ...prev.pedagogicalContent,
                              remediationActions: [
                                ...prev.pedagogicalContent.remediationActions,
                                {
                                  targetGroup: 'مجموعة جديدة',
                                  competencies: '',
                                  activity: '',
                                  timeframe: 'أسبوعان',
                                },
                              ],
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-teal-700/30 bg-teal-50/70 px-2.5 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-100 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        إضافة مجموعة حاجة
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {template.pedagogicalContent.remediationActions.map((row, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-teal-800">
                              المجموعة #{idx + 1}
                            </span>
                            <button
                              type="button"
                              aria-label="حذف المجموعة"
                              onClick={() =>
                                onUpdateTemplate((prev) => ({
                                  ...prev,
                                  pedagogicalContent: {
                                    ...prev.pedagogicalContent,
                                    remediationActions:
                                      prev.pedagogicalContent.remediationActions.filter(
                                        (_, i) => i !== idx
                                      ),
                                  },
                                }))
                              }
                              className="text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                            <div className="sm:col-span-4">
                              <label className="mb-0.5 block text-[10.5px] font-semibold text-slate-600">
                                الفئة المستهدفة
                              </label>
                              <input
                                type="text"
                                value={row.targetGroup}
                                onChange={(e) =>
                                  onUpdateTemplate((prev) => {
                                    const next = [...prev.pedagogicalContent.remediationActions];
                                    next[idx] = { ...next[idx], targetGroup: e.target.value };
                                    return {
                                      ...prev,
                                      pedagogicalContent: {
                                        ...prev.pedagogicalContent,
                                        remediationActions: next,
                                      },
                                    };
                                  })
                                }
                                placeholder="الفئة المتعثرة (< 10/20)"
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <label className="mb-0.5 block text-[10.5px] font-semibold text-slate-600">
                                الكفايات والأهداف المستهدفة
                              </label>
                              <input
                                type="text"
                                value={row.competencies}
                                onChange={(e) =>
                                  onUpdateTemplate((prev) => {
                                    const next = [...prev.pedagogicalContent.remediationActions];
                                    next[idx] = { ...next[idx], competencies: e.target.value };
                                    return {
                                      ...prev,
                                      pedagogicalContent: {
                                        ...prev.pedagogicalContent,
                                        remediationActions: next,
                                      },
                                    };
                                  })
                                }
                                placeholder="الكفاية المراد تثبيتها..."
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <label className="mb-0.5 block text-[10.5px] font-semibold text-slate-600">
                                الجدولة / الحيز الزمني
                              </label>
                              <input
                                type="text"
                                value={row.timeframe}
                                onChange={(e) =>
                                  onUpdateTemplate((prev) => {
                                    const next = [...prev.pedagogicalContent.remediationActions];
                                    next[idx] = { ...next[idx], timeframe: e.target.value };
                                    return {
                                      ...prev,
                                      pedagogicalContent: {
                                        ...prev.pedagogicalContent,
                                        remediationActions: next,
                                      },
                                    };
                                  })
                                }
                                placeholder="حصة التصحيح..."
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                              />
                            </div>
                            <div className="sm:col-span-12">
                              <label className="mb-0.5 block text-[10.5px] font-semibold text-slate-600">
                                الأنشطة والإجراءات الديداكتيكية المبرمجة
                              </label>
                              <input
                                type="text"
                                value={row.activity}
                                onChange={(e) =>
                                  onUpdateTemplate((prev) => {
                                    const next = [...prev.pedagogicalContent.remediationActions];
                                    next[idx] = { ...next[idx], activity: e.target.value };
                                    return {
                                      ...prev,
                                      pedagogicalContent: {
                                        ...prev.pedagogicalContent,
                                        remediationActions: next,
                                      },
                                    };
                                  })
                                }
                                placeholder="حصص الدعم والتقوية مع بطاقات تمارين علاجية متدرجة..."
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {showPedagogy && onUpdateItemDefinitions && onUpdateStudentItemScores && (
              <ItemAnalysisMatrixPanel
                students={students}
                metadata={metadata}
                itemDefinitions={itemDefinitions}
                studentItemScores={studentItemScores}
                onUpdateItemDefinitions={onUpdateItemDefinitions}
                onUpdateStudentItemScores={onUpdateStudentItemScores}
                onSyncTotalScores={onSyncTotalScores}
                onUpdateTemplate={onUpdateTemplate}
              />
            )}

            {showPedagogy && (
              <RemediationCardsConfigPanel
                template={template}
                metadata={metadata}
                stats={stats}
                students={students}
                itemDefinitions={itemDefinitions}
                studentItemScores={studentItemScores}
                onUpdateTemplate={onUpdateTemplate}
                onOpenCardsPreview={onOpenCardsPreview || onNextStep}
              />
            )}

            {showLayout && (
              <section className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    04. فئات التحكم وعتبات التفييء
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          brackets: MEMO_142_BRACKETS.map((b) => ({ ...b })),
                        }))
                      }
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        template.brackets.length === 5
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      سلم مذكرة التقويم (5 فئات)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTemplate((prev) => ({
                          ...prev,
                          brackets: DEFAULT_BRACKETS.map((b) => ({ ...b })),
                        }))
                      }
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        template.brackets.length === 6
                          ? 'border-teal-700 bg-teal-50 text-teal-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      السلم السداسي (6 فئات)
                    </button>
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      عتبة المعدل (الحاصلون على المعدل)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={19}
                      step={0.5}
                      value={template.passThreshold}
                      onChange={(e) => {
                        const num = Number.parseFloat(e.target.value);
                        if (!Number.isNaN(num)) {
                          const clampedPass = Math.max(0, Math.min(19, num));
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            passThreshold: clampedPass,
                            excellenceThreshold: Math.max(
                              clampedPass + 1,
                              prev.excellenceThreshold
                            ),
                          }));
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm tabular-nums text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                      عتبة التفوق
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      step={0.5}
                      value={template.excellenceThreshold}
                      onChange={(e) => {
                        const num = Number.parseFloat(e.target.value);
                        if (!Number.isNaN(num)) {
                          const clampedExc = Math.max(1, Math.min(20, num));
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            excellenceThreshold: Math.max(
                              prev.passThreshold + 1,
                              clampedExc
                            ),
                          }));
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm tabular-nums text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mb-1.5 grid grid-cols-12 gap-2 px-2 text-[11px] font-semibold text-slate-500">
                  <span className="col-span-3">المجال</span>
                  <span className="col-span-2 text-center">من</span>
                  <span className="col-span-2 text-center">إلى</span>
                  <span className="col-span-4">التقدير التربوي</span>
                  <span className="col-span-1 text-center">اللون</span>
                </div>
                <div className="space-y-2">
                  {template.brackets.map((br) => (
                    <div
                      key={br.id}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-2"
                    >
                      <input
                        type="text"
                        value={br.label}
                        onChange={(e) => updateBracket(br.id, { label: e.target.value })}
                        className="col-span-3 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                        dir="ltr"
                      />
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        value={br.min}
                        onChange={(e) => {
                          const num = Number.parseFloat(e.target.value);
                          if (Number.isFinite(num)) {
                            updateBracket(br.id, { min: Math.max(0, Math.min(20, num)) });
                          }
                        }}
                        className="col-span-2 rounded border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs tabular-nums transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        value={br.max}
                        onChange={(e) => {
                          const num = Number.parseFloat(e.target.value);
                          if (Number.isFinite(num)) {
                            updateBracket(br.id, { max: Math.max(0, Math.min(20, num)) });
                          }
                        }}
                        className="col-span-2 rounded border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs tabular-nums transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={br.appreciation}
                        onChange={(e) => updateBracket(br.id, { appreciation: e.target.value })}
                        className="col-span-4 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 transition-colors focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                      />
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="color"
                          aria-label={`لون فئة ${br.appreciation}`}
                          value={br.colorHex || '#2563eb'}
                          onChange={(e) => updateBracket(br.id, { colorHex: e.target.value })}
                          className="h-6 w-7 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Bottom Workflow Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          onClick={onBackStep}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>العودة إلى لائحة النقط (1/3)</span>
        </button>

        <button
          type="button"
          disabled={stats.total === 0}
          onClick={onNextStep}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>معاينة التقرير النهائي والطباعة (3/3)</span>
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
