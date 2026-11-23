import React from 'react';
import { Scissors } from 'lucide-react';
import { getReportFontClass, getWordFontFamily } from '../data/presets';
import { getLocalizedAppreciation, getReportLabels } from '../data/reportI18n';
import {
  ComputedStats,
  ExamItemDefinition,
  MassarMetadata,
  PostSupportStatus,
  RemediationCardsConfig,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import { escapeHtml, getStudentAppreciation } from '../utils/massarParser';
import {
  getStudentWeakItems,
  inferPostSupportStatus,
} from '../utils/pedagogicalAnalytics';

export const DEFAULT_REMEDIATION_CARDS_CONFIG: RemediationCardsConfig = {
  enabledInFullReport: false,
  targetFilter: 'struggling',
  includeAbsent: true,
  cardsPerSheet: 4,
  showParentSignature: true,
  showCutGuides: true,
  showPostSupportEval: true,
  defaultExerciseTask:
    'إعادة إنجاز التمارين المتعثرة في دفتر البحث مع مراجعة القواعد الأساسية الملخصة.',
  sessionDate: '',
  customSelectedIds: [],
  studentOverrides: {},
};

export function getRemediationCardsConfig(
  template: ReportTemplateSchema,
  metadata?: MassarMetadata
): RemediationCardsConfig {
  const raw = template.remediationCardsConfig;
  return {
    ...DEFAULT_REMEDIATION_CARDS_CONFIG,
    sessionDate: metadata?.correctionDate || '',
    ...(raw || {}),
    studentOverrides: raw?.studentOverrides || {},
  };
}

export interface StudentRemediationCardData {
  student: StudentRecord;
  rank: number;
  isAbsent: boolean;
  score: number | null;
  groupLabel: string;
  groupBadgeFr: string;
  groupTone: 'critical' | 'warning' | 'consolidation' | 'excellence' | 'absent';
  appreciationAr: string;
  appreciationFr: string;
  appreciationLocalized: string;
  diagnosticText: string;
  competencyFocus: string;
  weakItemsText?: string;
  exerciseTask: string;
  checklistItems: string[];
  teacherNote: string;
  postSupportStatus: PostSupportStatus;
  postSupportScore: number | null;
  postSupportDelta: number | null;
}

export function getFilteredRemediationStudents(
  students: StudentRecord[],
  stats: ComputedStats,
  template: ReportTemplateSchema,
  config: RemediationCardsConfig
): StudentRecord[] {
  const passThreshold = template.passThreshold;
  const excellenceThreshold = template.excellenceThreshold;

  if (config.targetFilter === 'custom' && config.customSelectedIds) {
    const idSet = new Set(config.customSelectedIds);
    return students.filter((s) => idSet.has(s.id));
  }

  if (config.targetFilter === 'all') {
    return students.filter((s) => (s.isAbsent ? config.includeAbsent : s.score !== null));
  }

  if (config.targetFilter === 'below_excellence') {
    const list = students.filter((s) => {
      if (s.isAbsent) return config.includeAbsent;
      if (s.score === null) return false;
      return s.score < excellenceThreshold;
    });
    return list.sort((a, b) => {
      if (a.isAbsent && !b.isAbsent) return 1;
      if (!a.isAbsent && b.isAbsent) return -1;
      return (a.score ?? 0) - (b.score ?? 0);
    });
  }

  // Default: 'struggling' (< passThreshold) sorted ascending by severity, plus optional absent students
  const struggling = [...stats.strugglingStudents].sort(
    (a, b) => (a.score ?? 0) - (b.score ?? 0)
  );
  if (config.includeAbsent && stats.absentStudents.length > 0) {
    return [...struggling, ...stats.absentStudents];
  }
  return struggling;
}

export function buildStudentRemediationPlan(
  student: StudentRecord,
  rank: number,
  stats: ComputedStats,
  metadata: MassarMetadata,
  template: ReportTemplateSchema,
  config: RemediationCardsConfig,
  itemDefinitions: ExamItemDefinition[] = [],
  studentItemScores: StudentItemScores = {}
): StudentRemediationCardData {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const passThreshold = template.passThreshold;
  const excellenceThreshold = template.excellenceThreshold;
  const isAbsent = student.isAbsent;
  const score = student.score;
  const app = getStudentAppreciation(
    score,
    isAbsent || score === null,
    passThreshold,
    excellenceThreshold
  );
  const appreciationLocalized = getLocalizedAppreciation(
    score,
    isAbsent || score === null,
    passThreshold,
    excellenceThreshold,
    lang
  );

  const override = config.studentOverrides?.[student.id];
  const weaknesses = template.pedagogicalContent.weaknesses.filter((w) => w.trim().length > 0);
  const strengths = template.pedagogicalContent.strengths.filter((s) => s.trim().length > 0);
  const remediationBullets = template.pedagogicalContent.programmedRemediationBullets.filter(
    (b) => b.trim().length > 0
  );

  const weakItems = isAbsent
    ? []
    : getStudentWeakItems(student.id, itemDefinitions, studentItemScores, 50);

  const weakItemsText =
    weakItems.length > 0
      ? weakItems
          .slice(0, 3)
          .map(
            (w) =>
              `${w.item.label} (${w.score.toFixed(2).replace(/\.00$/, '')}/${w.item.maxScore})`
          )
          .join(' · ')
      : undefined;

  const topWeakItem = weakItems[0];

  const examTopic =
    metadata.examContent?.trim() ||
    (lang === 'fr'
      ? 'Notions et compétences évaluées dans le devoir surveillé'
      : lang === 'en'
      ? 'Assessed topics and competencies in the exam'
      : 'المحاور والمفاهيم المدرجة في الفرض المحروس');

  let groupLabel =
    lang === 'fr'
      ? 'Groupe de Remédiation'
      : lang === 'en'
      ? 'Remediation Tier'
      : 'مجموعة الدعم الاستدراكي';
  let groupBadgeFr =
    lang === 'fr'
      ? 'Soutien Intensif'
      : lang === 'en'
      ? 'Targeted Support'
      : 'Soutien Intensif';
  let groupTone: StudentRemediationCardData['groupTone'] = 'warning';
  let autoDiagnostic = '';
  let competencyFocus = '';
  let autoExercise = config.defaultExerciseTask;
  let checklistItems: string[] = [];

  if (isAbsent) {
    groupLabel =
      lang === 'fr'
        ? 'Absence à Rattraper'
        : lang === 'en'
        ? 'Absence Make-Up'
        : 'غياب يستوجب الاستدراك';
    groupBadgeFr = 'Absence à Rattraper';
    groupTone = 'absent';
    competencyFocus =
      lang === 'fr'
        ? `Rattrapage de l’évaluation : ${examTopic}`
        : lang === 'en'
        ? `Assessment make-up: ${examTopic}`
        : `تدارك تقويم: ${examTopic}`;
    autoDiagnostic =
      lang === 'fr'
        ? `Élève absent(e) lors du devoir surveillé${student.observation ? ` (${student.observation.trim()})` : ''}. Rattrapage intégral requis.`
        : lang === 'en'
        ? `Student was absent from the exam${student.observation ? ` (${student.observation.trim()})` : ''}. Full make-up assessment required.`
        : student.observation?.trim()
        ? `تغيب المتعلم(ة) عن إجراء الفرض المحروس (${student.observation.trim()}). يتعين تدارك الكفايات المقومة وإنجاز موضوع الفرض كاملاً.`
        : 'تغيب المتعلم(ة) عن إجراء الفرض المحروس؛ يتعين تدارك الكفايات المقومة وإنجاز موضوع الفرض للتشخيص.';
    autoExercise =
      lang === 'fr'
        ? 'Réaliser l’intégralité du sujet du devoir dans le cahier d’exercices et le soumettre à l’enseignant(e).'
        : lang === 'en'
        ? 'Complete the full exam paper in the workbook and submit to the teacher for diagnostic grading.'
        : 'إنجاز موضوع الفرض المحروس كاملاً في دفتر التمارين وعرضه على الأستاذ(ة) للتصحيح والتقويم.';
    checklistItems =
      lang === 'fr'
        ? [
            'Recopier le corrigé officiel détaillé dans le cahier',
            'Traiter le sujet du devoir dans le délai fixé',
            'Justifier l’absence auprès de l’administration',
          ]
        : lang === 'en'
        ? [
            'Copy official marking scheme into workbook',
            'Submit complete make-up exam paper on time',
            'Validate absence justification with administration',
          ]
        : [
            'نسخ وتصحيح عناصر الإجابة الرسمية للفرض في الدفتر',
            'إنجاز موضوع الفرض استدراكياً داخل الأجل المحدد',
            'تبرير الغياب لدى الإدارة التربوية والتواصل مع الأستاذ(ة)',
          ];
  } else if (score !== null && score < passThreshold * 0.5) {
    groupLabel =
      lang === 'fr'
        ? 'Remédiation Prioritaire'
        : lang === 'en'
        ? 'Priority Intensive Support'
        : 'دعم استدراكي مكثف (أولوية قصوى)';
    groupBadgeFr = 'Remédiation Prioritaire';
    groupTone = 'critical';
    competencyFocus =
      topWeakItem?.item.competency?.trim() ||
      weaknesses[0] ||
      (lang === 'fr'
        ? `Consolidation des prérequis essentiels : ${examTopic}`
        : lang === 'en'
        ? `Core foundational recovery: ${examTopic}`
        : `إرساء المكتسبات القبلية والقواعد الأساسية في: ${examTopic}`);
    autoDiagnostic =
      lang === 'fr'
        ? `Difficultés majeures observées (${score.toFixed(2)}/20)${topWeakItem ? ` notamment sur ${topWeakItem.item.label}` : ''}. Une reprise immédiate des bases est nécessaire.`
        : lang === 'en'
        ? `Critical gaps identified (${score.toFixed(2)}/20)${topWeakItem ? ` particularly in ${topWeakItem.item.label}` : ''}. Immediate foundational scaffolding required.`
        : weaknesses.length > 0
        ? `تعثر حاد في التحكم في التعلمات الأساس (${weaknesses.slice(0, 2).join('؛ ')}). يحتاج المتعلم(ة) إلى معالجة فورية للمكتسبات القبلية وتبسيط المفاهيم.`
        : `تعثر حاد في استيعاب القواعد الأساسية والتطبيق المباشر للمفاهيم المدرجة في (${examTopic}).`;
    autoExercise =
      topWeakItem?.item.remediationTask?.trim() ||
      remediationBullets[0] ||
      (lang === 'fr'
        ? 'Fiche de synthèse des règles de base + série d’exercices d’application directe (Niveau 1).'
        : lang === 'en'
        ? 'Review core rule sheet and complete Level-1 direct application exercises.'
        : 'إنجاز بطاقة ملخصة للقواعد الأساسية + سلسلة تمارين التطبيق المباشر (المستوى الأول) في دفتر الدعم.');
    checklistItems =
      lang === 'fr'
        ? [
            'Recopier intégralement la correction du devoir',
            'Réviser les règles de base et faire les exercices Niveau 1',
            'Participer activement à la séance de soutien ciblé',
          ]
        : lang === 'en'
        ? [
            'Transcribe detailed exam corrections',
            'Review fundamental rules and complete Level-1 tasks',
            'Attend scheduled remediation workshop',
          ]
        : [
            'نقل التصحيح المفصل للفرض المحروس كاملاً في الدفتر',
            'مراجعة القواعد والتعاريف الأساسية وإنجاز تمارين التطبيق المباشر',
            'الحضور والمشاركة الفعالة في حصة الدعم الاستدراكي المبرمجة',
          ];
  } else if (score !== null && score < passThreshold) {
    const isNearPass = score >= passThreshold * 0.8;
    groupLabel =
      lang === 'fr'
        ? isNearPass
          ? 'Consolidation Ciblée'
          : 'Soutien & Remédiation'
        : lang === 'en'
        ? isNearPass
          ? 'Targeted Consolidation'
          : 'Remediation Group'
        : isNearPass
        ? 'دعم وتثبيت (قريب من التحكم)'
        : 'مجموعة الدعم الاستدراكي';
    groupBadgeFr = isNearPass ? 'Consolidation Ciblée' : 'Soutien & Remédiation';
    groupTone = 'warning';
    competencyFocus =
      topWeakItem?.item.competency?.trim() ||
      weaknesses[1] ||
      weaknesses[0] ||
      (lang === 'fr'
        ? `Méthodologie d’application et justification : ${examTopic}`
        : lang === 'en'
        ? `Application & structured reasoning: ${examTopic}`
        : `تثبيت منهجية التطبيق والتعليل في: ${examTopic}`);
    autoDiagnostic =
      lang === 'fr'
        ? `Maîtrise partielle (${score.toFixed(2)}/20)${topWeakItem ? ` ; lacune principale sur ${topWeakItem.item.label}` : ''}. Consolidation ciblée requise sur la méthodologie.`
        : lang === 'en'
        ? `Partial mastery (${score.toFixed(2)}/20)${topWeakItem ? `; key gap on ${topWeakItem.item.label}` : ''}. Focused methodological reinforcement recommended.`
        : isNearPass
        ? `المتعلم(ة) قريب من عتبة التحكم (${score.toFixed(2)}/20)؛ تم رصد هفوات منهجية وحسابية قابلة للتجاوز عبر التركيز على (${topWeakItem?.item.competency || weaknesses[0] || 'دقة التعليل واستكمال مراحل الجواب'}).`
        : `تحكم جزئي غير كافٍ؛ يحتاج المتعلم(ة) إلى تجاوز الصعوبات المرصودة في (${topWeakItem?.item.competency || weaknesses.slice(0, 2).join('، ') || examTopic}).`;
    autoExercise =
      topWeakItem?.item.remediationTask?.trim() ||
      remediationBullets[1] ||
      remediationBullets[0] ||
      config.defaultExerciseTask;
    checklistItems =
      lang === 'fr'
        ? [
            'Identifier et corriger chaque erreur de la copie',
            'Réaliser les exercices de remédiation ciblés',
            'Faire valider le cahier par l’enseignant(e)',
          ]
        : lang === 'en'
        ? [
            'Diagnose and correct specific errors from script',
            'Complete targeted remediation exercise set',
            'Present corrected workbook for teacher sign-off',
          ]
        : [
            'تصحيح الأخطاء المرتكبة في ورقة التحرير وفهم سبب كل خطأ',
            'إنجاز التمارين العلاجية المحددة لتثبيت المنهجية والتعليل',
            'عرض دفتر البحث والتمارين على الأستاذ(ة) للمصادقة',
          ];
  } else if (score !== null && score < excellenceThreshold) {
    groupLabel =
      lang === 'fr'
        ? 'Groupe de Consolidation'
        : lang === 'en'
        ? 'Consolidation Tier'
        : 'مجموعة التثبيت والتجويد';
    groupBadgeFr = 'Perfectionnement';
    groupTone = 'consolidation';
    competencyFocus =
      topWeakItem?.item.competency?.trim() ||
      (lang === 'fr'
        ? `Rédaction rigoureuse et situations complexes : ${examTopic}`
        : lang === 'en'
        ? `Precision in complex tasks: ${examTopic}`
        : `تجويد البرهنة والوضعيات المركبة في: ${examTopic}`);
    autoDiagnostic =
      lang === 'fr'
        ? `Compétences essentielles acquises (${score.toFixed(2)}/20). Progression possible vers l’excellence en affinant la rédaction et l’argumentation.`
        : lang === 'en'
        ? `Core competencies mastered (${score.toFixed(2)}/20). Ready to advance toward excellence through rigorous justification.`
        : `متحكم في الكفايات الأساسية (${score.toFixed(2)}/20)؛ يمكن الارتقاء بالأداء نحو التميز عبر تجويد الصياغة والتعليل وتفادي الهفوات الجزئية في الأسئلة التوليفية.`;
    autoExercise =
      topWeakItem?.item.remediationTask?.trim() ||
      remediationBullets[1] ||
      (lang === 'fr'
        ? 'Reprendre l’exercice de synthèse avec rédaction complète et structurée.'
        : lang === 'en'
        ? 'Re-solve the synthesis exercise with complete step-by-step justification.'
        : 'إعادة حل التمرين التوليفي الأخير من الفرض بدقة منهجية كاملة دون اختصار المراحل.');
    checklistItems =
      lang === 'fr'
        ? [
            'Corriger les imprécisions rédactionnelles',
            'S’entraîner sur des situations problèmes complexes',
            'Participer activement à la correction collective',
          ]
        : lang === 'en'
        ? [
            'Refine formal reasoning steps',
            'Practice multi-step synthesis problems',
            'Contribute to collaborative correction',
          ]
        : [
            'استدراك الهفوات الشكلية والمنهجية المسجلة في ورقة الفرض',
            'التدرب على الوضعيات المركبة وتنظيم الوقت أثناء الإنجاز',
            'المساهمة الإيجابية في أنشطة التصحيح الجماعي بالقسم',
          ];
  } else {
    groupLabel =
      lang === 'fr'
        ? 'Excellence & Enrichissement'
        : lang === 'en'
        ? 'Excellence & Enrichment'
        : 'مجموعة التميز والإغناء';
    groupBadgeFr = 'Excellence & Enrichissement';
    groupTone = 'excellence';
    competencyFocus =
      strengths[0] ||
      (lang === 'fr'
        ? `Approfondissement et tutorat par les pairs : ${examTopic}`
        : lang === 'en'
        ? `Enrichment challenges & peer mentoring: ${examTopic}`
        : `تعميق الكفايات والوضعيات الإدماجية المتقدمة في: ${examTopic}`);
    autoDiagnostic =
      lang === 'fr'
        ? `Très bonne maîtrise des compétences visées (${(score ?? 0).toFixed(2)}/20). Encouragé(e) à poursuivre sur des situations d’approfondissement.`
        : lang === 'en'
        ? `High mastery demonstrated (${(score ?? 0).toFixed(2)}/20). Recommended for enrichment tasks and peer mentoring.`
        : `أداء متميز يعكس تحكماً متقدماً في الكفايات المقومة (${(score ?? 0).toFixed(2)}/20). يُشجَّع المتعلم(ة) على مواصلة الاجتهاد والانخراط في أنشطة الإغناء ومواكبة الزملاء (التعلم بالقرين).`;
    autoExercise =
      remediationBullets[2] ||
      (lang === 'fr'
        ? 'Résoudre un problème d’approfondissement (défi) et accompagner un binôme lors du tutorat.'
        : lang === 'en'
        ? 'Complete advanced challenge problem and assist peers during collaborative workshop.'
        : 'إنجاز وضعية إدماجية متقدمة (تحدي) والمشاركة في تأطير مجموعات العمل بالقرين خلال حصة الدعم.');
    checklistItems =
      lang === 'fr'
        ? [
            'Traiter les exercices d’approfondissement proposés',
            'Accompagner les pairs en atelier de soutien',
            'Maintenir la rigueur méthodologique',
          ]
        : lang === 'en'
        ? [
            'Solve extension challenge problems',
            'Support peers in collaborative learning group',
            'Sustain structured presentation quality',
          ]
        : [
            'إنجاز أنشطة الإغناء والمسائل المتقدمة المقترحة',
            'مواكبة الزملاء في مجموعة التعلم بالقرين خلال حصة الدعم',
            'الحفاظ على جودة التنظيم والمنهجية في الفروض المقبلة',
          ];
  }

  const rawPostScore =
    typeof override?.postSupportScore === 'number' &&
    Number.isFinite(override.postSupportScore)
      ? Math.max(0, Math.min(20, override.postSupportScore))
      : null;
  const resolvedPostStatus: PostSupportStatus =
    override?.postSupportStatus && override.postSupportStatus !== 'pending'
      ? override.postSupportStatus
      : rawPostScore !== null
      ? inferPostSupportStatus(rawPostScore, passThreshold)
      : 'pending';
  const postSupportDelta =
    !isAbsent && score !== null && rawPostScore !== null
      ? Math.round((rawPostScore - score) * 100) / 100
      : null;

  return {
    student,
    rank,
    isAbsent,
    score,
    groupLabel,
    groupBadgeFr,
    groupTone,
    appreciationAr: app.ar,
    appreciationFr: app.fr,
    appreciationLocalized,
    diagnosticText: override?.diagnosticText?.trim() || autoDiagnostic,
    competencyFocus,
    weakItemsText,
    exerciseTask: override?.exerciseTask?.trim() || autoExercise,
    checklistItems,
    teacherNote:
      override?.teacherNote?.trim() ||
      student.observation?.trim() ||
      (stats.average > 0
        ? lang === 'fr'
          ? `Moy. classe : ${stats.average.toFixed(2)}/20 · Seuil : ${passThreshold}/20`
          : lang === 'en'
          ? `Class avg: ${stats.average.toFixed(2)}/20 · Pass mark: ${passThreshold}/20`
          : `معدل القسم للمقارنة: ${stats.average.toFixed(2)}/20 · عتبة التحكم: ${passThreshold}/20`
        : ''),
    postSupportStatus: resolvedPostStatus,
    postSupportScore: rawPostScore,
    postSupportDelta,
  };
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

interface IndividualRemediationCardsSheetProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  stats: ComputedStats;
  students: StudentRecord[];
  itemDefinitions?: ExamItemDefinition[];
  studentItemScores?: StudentItemScores;
  startPageNumber?: number;
  totalDocumentPages?: number;
}

export const IndividualRemediationCardsSheet: React.FC<
  IndividualRemediationCardsSheetProps
> = ({
  template,
  metadata,
  stats,
  students,
  itemDefinitions = [],
  studentItemScores = {},
  startPageNumber = 1,
  totalDocumentPages,
}) => {
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const config = getRemediationCardsConfig(template, metadata);
  const accent = template.styleConfig.accentColor || '#0f766e';
  const secondaryAccent = template.styleConfig.secondaryAccent || '#1e3a8a';
  const isDoubleBorder = template.styleConfig.borderStyle === 'official-double';
  const fontClass = getReportFontClass(template.styleConfig.fontFamily);

  const rankMap = React.useMemo(() => {
    const map = new Map<string, number>();
    stats.rankedStudents.forEach((st, idx) => {
      map.set(st.id, idx + 1);
    });
    return map;
  }, [stats.rankedStudents]);

  const targetStudents = React.useMemo(
    () => getFilteredRemediationStudents(students, stats, template, config),
    [students, stats, template, config]
  );

  const cardsData = React.useMemo(
    () =>
      targetStudents.map((st, idx) =>
        buildStudentRemediationPlan(
          st,
          rankMap.get(st.id) || idx + 1,
          stats,
          metadata,
          template,
          config,
          itemDefinitions,
          studentItemScores
        )
      ),
    [
      targetStudents,
      rankMap,
      stats,
      metadata,
      template,
      config,
      itemDefinitions,
      studentItemScores,
    ]
  );

  const cardsPerPage = config.cardsPerSheet === 2 ? 2 : 4;
  const pages = chunkArray(cardsData, cardsPerPage);
  const computedTotalPages = totalDocumentPages ?? pages.length;

  if (pages.length === 0) {
    return (
      <article
        dir={labels.dir}
        className={`report-sheet mx-auto flex w-[210mm] flex-col items-center justify-center bg-white p-[12mm] text-center text-slate-900 shadow-sm print:shadow-none ${fontClass}`}
      >
        <div className="max-w-md rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-base font-bold text-slate-900">
            {labels.cardsEmptyTitle}
          </h2>
          <p className="mt-1.5 text-xs text-slate-600">{labels.cardsEmptyDesc}</p>
        </div>
      </article>
    );
  }

  const getToneColors = (tone: StudentRemediationCardData['groupTone']) => {
    switch (tone) {
      case 'critical':
        return {
          border: '#fca5a5',
          headerBg: '#fef2f2',
          badgeBg: '#dc2626',
          badgeText: '#ffffff',
          scoreColor: '#b91c1c',
          barColor: '#dc2626',
        };
      case 'warning':
        return {
          border: '#fdba74',
          headerBg: '#fff7ed',
          badgeBg: '#ea580c',
          badgeText: '#ffffff',
          scoreColor: '#c2410c',
          barColor: '#ea580c',
        };
      case 'consolidation':
        return {
          border: '#93c5fd',
          headerBg: '#eff6ff',
          badgeBg: '#2563eb',
          badgeText: '#ffffff',
          scoreColor: '#1d4ed8',
          barColor: '#2563eb',
        };
      case 'excellence':
        return {
          border: '#86efac',
          headerBg: '#f0fdf4',
          badgeBg: '#16a34a',
          badgeText: '#ffffff',
          scoreColor: '#15803d',
          barColor: '#16a34a',
        };
      case 'absent':
      default:
        return {
          border: '#cbd5e1',
          headerBg: '#f8fafc',
          badgeBg: '#475569',
          badgeText: '#ffffff',
          scoreColor: '#475569',
          barColor: '#64748b',
        };
    }
  };

  return (
    <>
      {pages.map((pageCards, pageIdx) => {
        const currentPageNumber = startPageNumber + pageIdx;
        const isTwoPerSheet = cardsPerPage === 2;

        return (
          <article
            key={`remediation-cards-sheet-${pageIdx}`}
            dir={labels.dir}
            className={`report-sheet mx-auto ${
              currentPageNumber > 1 ? 'mt-8 print:mt-0' : ''
            } flex w-[210mm] flex-col justify-between overflow-hidden bg-white p-[6.5mm] text-slate-900 shadow-sm print:shadow-none ${fontClass}`}
            style={{
              border: template.styleConfig.showOuterFrame
                ? `${isDoubleBorder ? '4px double' : '1px solid'} ${accent}`
                : undefined,
            }}
          >
            {/* Sheet Top Header */}
            <header
              className="shrink-0 flex items-center justify-between border-b-2 pb-1 text-[9.5px]"
              style={{ borderColor: accent }}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold" style={{ color: accent }}>
                  {labels.cardsHeaderTitle}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-700">
                  {metadata.school || labels.schoolLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <span>
                  {metadata.subject ? `${labels.subjectPrefix} ${metadata.subject}` : ''} ·{' '}
                  {labels.classLabel}:{' '}
                  <strong className="font-mono text-slate-900">
                    {metadata.className || '—'}
                  </strong>
                </span>
                <span className="text-slate-400">·</span>
                <span>{metadata.examNumber}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-slate-700">
                  {labels.cardBoardCounter(pageIdx + 1, pages.length)}
                </span>
              </div>
            </header>

            {/* Cards Grid Area */}
            <div
              className={`relative my-[2mm] flex-1 min-h-0 grid ${
                isTwoPerSheet
                  ? 'grid-cols-1 grid-rows-2 gap-[4mm]'
                  : 'grid-cols-2 grid-rows-2 gap-[3.5mm]'
              }`}
            >
              {/* Dashed Cut Guides */}
              {config.showCutGuides && !isTwoPerSheet && (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-slate-300"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-300"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-0.5 text-slate-400"
                  >
                    <Scissors className="h-3 w-3" />
                  </div>
                </>
              )}

              {config.showCutGuides && isTwoPerSheet && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center border-t border-dashed border-slate-300"
                >
                  <span className="bg-white px-2 text-[8px] font-semibold text-slate-400 inline-flex items-center gap-1">
                    <Scissors className="h-2.5 w-2.5" />
                    {labels.cardCutGuide}
                  </span>
                </div>
              )}

              {pageCards.map((card, cardIdx) => {
                const globalCardIndex = pageIdx * cardsPerPage + cardIdx + 1;
                const colors = getToneColors(card.groupTone);
                const scorePct = card.isAbsent || card.score === null
                  ? 0
                  : Math.max(2, Math.min(100, (card.score / 20) * 100));
                const passMarkerPct = (template.passThreshold / 20) * 100;
                const excMarkerPct = (template.excellenceThreshold / 20) * 100;

                return (
                  <div
                    key={card.student.id}
                    className={`flex h-full flex-col justify-between overflow-hidden rounded-lg border bg-white ${
                      isTwoPerSheet ? 'p-3 text-[10px]' : 'p-2.5 text-[9px]'
                    }`}
                    style={{
                      borderColor: colors.border,
                      borderWidth: '1.5px',
                    }}
                  >
                    {/* Top Section: Card Header + Student Identity + Score Box */}
                    <div className="space-y-1.5">
                      <div
                        className="flex items-center justify-between gap-1 rounded px-2 py-1"
                        style={{
                          backgroundColor: colors.headerBg,
                          borderBottom: `1px solid ${colors.border}`,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold text-white shrink-0"
                              style={{ backgroundColor: accent }}
                            >
                              {labels.cardBadgePrefix}
                              {globalCardIndex}
                            </span>
                            <span className="truncate font-extrabold text-slate-900">
                              {labels.cardTitle}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[8px] font-medium text-slate-600">
                            {metadata.school || labels.schoolLabel} · {metadata.subject || '—'} ·{' '}
                            {metadata.examNumber} ({metadata.semester})
                          </div>
                        </div>

                        <div
                          className="shrink-0 rounded px-1.5 py-0.5 text-center font-bold"
                          style={{
                            backgroundColor: colors.badgeBg,
                            color: colors.badgeText,
                          }}
                        >
                          <div className="text-[8.5px] leading-tight">{card.groupLabel}</div>
                          {lang === 'ar' && (
                            <div className="font-mono text-[7px] opacity-90" dir="ltr">
                              {card.groupBadgeFr}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Student Name, Code, Score, Rank & Visual Gauge */}
                      <div className="grid grid-cols-12 items-center gap-1.5 rounded border border-slate-200 bg-slate-50/70 px-2 py-1">
                        <div className="col-span-7 min-w-0">
                          <div className="text-[8px] font-semibold text-slate-500">
                            {labels.cardStudentMeta} · {labels.classLabel} {metadata.className || '—'} (#
                            {card.student.order || globalCardIndex})
                          </div>
                          <div
                            className={`truncate font-extrabold text-slate-900 ${
                              isTwoPerSheet ? 'text-xs' : 'text-[10.5px]'
                            }`}
                          >
                            {card.student.fullName}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[8px] text-slate-600">
                            {card.student.code && (
                              <span className="font-mono">
                                {labels.cardMassarCode} {card.student.code}
                              </span>
                            )}
                            <span>
                              {labels.cardClassRank}{' '}
                              <strong className="font-mono text-slate-900">
                                {card.rank}/{stats.total}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="col-span-5 flex items-center justify-end gap-1.5 border-s border-slate-200 ps-1.5">
                          <div className="text-end">
                            <div className="text-[7.5px] font-bold text-slate-500">
                              {labels.cardObtainedScore}
                            </div>
                            <div
                              className={`font-mono font-extrabold tabular-nums ${
                                isTwoPerSheet ? 'text-sm' : 'text-xs'
                              }`}
                              style={{ color: colors.scoreColor }}
                              dir="ltr"
                            >
                              {card.isAbsent || card.score === null
                                ? `${labels.absentLabel} (ABS)`
                                : `${card.score.toFixed(2)} / 20`}
                            </div>
                            <div className="text-[7.5px] font-semibold text-slate-700">
                              {lang === 'ar'
                                ? `${card.appreciationAr} (${card.appreciationFr})`
                                : card.appreciationLocalized}
                            </div>
                          </div>
                        </div>

                        {/* Score Position Bar */}
                        <div className="col-span-12 pt-0.5">
                          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200" dir="ltr">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${scorePct}%`,
                                backgroundColor: colors.barColor,
                              }}
                            />
                            <div
                              className="absolute inset-y-0 w-[1.5px] bg-slate-900"
                              style={{ left: `${passMarkerPct}%` }}
                            />
                            <div
                              className="absolute inset-y-0 w-[1.5px] bg-emerald-700"
                              style={{ left: `${excMarkerPct}%` }}
                            />
                          </div>
                          <div className="mt-0.5 flex items-center justify-between text-[7.5px] text-slate-500 font-mono tabular-nums">
                            <span>
                              {labels.cardClassAvg} {stats.average.toFixed(2)}/20
                            </span>
                            <span>
                              {labels.cardPassThreshold} {template.passThreshold}/20
                            </span>
                            <span>
                              {labels.cardSupportDate}{' '}
                              {config.sessionDate || metadata.correctionDate || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic & Competency Focus Box */}
                      <div className="rounded border border-slate-200 bg-white px-2 py-1">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-extrabold" style={{ color: accent }}>
                            {labels.cardDiagTitle}
                          </span>
                          <span className="truncate text-[7.5px] font-semibold text-slate-500">
                            {labels.teacherLabel}: {metadata.teacherName || '—'}
                          </span>
                        </div>
                        <p className="mt-0.5 leading-snug text-slate-800 line-clamp-2">
                          {card.diagnosticText}
                        </p>
                        <div className="mt-0.5 truncate text-[8px] font-semibold text-slate-700">
                          <span style={{ color: secondaryAccent }}>{labels.cardTargetCompetency} </span>
                          {card.competencyFocus}
                        </div>
                        {card.weakItemsText && (
                          <div className="mt-0.5 truncate font-mono text-[7.5px] font-bold text-red-700">
                            {labels.cardWeakItemsLabel} {card.weakItemsText}
                          </div>
                        )}
                      </div>

                      {/* Remediation Action Plan */}
                      <div className="rounded border border-teal-200/80 bg-teal-50/30 px-2 py-1">
                        <div className="font-extrabold text-teal-950">
                          {labels.cardActionPlanTitle}
                        </div>
                        <p className="mt-0.5 font-semibold leading-snug text-slate-900 line-clamp-2">
                          {labels.cardActivityPrefix} {card.exerciseTask}
                        </p>
                        <div
                          className={`mt-1 grid ${
                            isTwoPerSheet ? 'grid-cols-3 gap-1.5' : 'grid-cols-1 gap-0.5'
                          } text-[8px] text-slate-700`}
                        >
                          {card.checklistItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1 truncate">
                              <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs border border-slate-400 bg-white" />
                              <span className="truncate">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: Post-Support Evaluation & Signatures */}
                    <div className="mt-1 space-y-1 pt-1 border-t border-slate-200">
                      {config.showPostSupportEval && (
                        <div className="flex flex-wrap items-center justify-between gap-1 rounded bg-slate-50 px-2 py-0.5 text-[8px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">
                              {labels.cardPostSupportTitle}
                            </span>
                            {card.postSupportScore !== null && (
                              <span
                                className="rounded bg-white px-1 py-0.2 font-mono font-extrabold text-emerald-800 border border-emerald-200"
                                dir="ltr"
                              >
                                {card.postSupportScore.toFixed(2)}/20
                                {card.postSupportDelta !== null
                                  ? ` (${card.postSupportDelta >= 0 ? '+' : ''}${card.postSupportDelta.toFixed(2)})`
                                  : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 font-semibold text-slate-700">
                            <span
                              className={`inline-flex items-center gap-1 ${
                                card.postSupportStatus === 'mastered'
                                  ? 'font-extrabold text-emerald-800'
                                  : ''
                              }`}
                            >
                              <span
                                className={`inline-flex h-2.5 w-2.5 items-center justify-center rounded-xs border text-[7px] leading-none ${
                                  card.postSupportStatus === 'mastered'
                                    ? 'border-emerald-700 bg-emerald-600 text-white'
                                    : 'border-emerald-600 bg-white'
                                }`}
                              >
                                {card.postSupportStatus === 'mastered' ? '✓' : ''}
                              </span>
                              {labels.cardPostMastered}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 ${
                                card.postSupportStatus === 'in_progress'
                                  ? 'font-extrabold text-amber-800'
                                  : ''
                              }`}
                            >
                              <span
                                className={`inline-flex h-2.5 w-2.5 items-center justify-center rounded-xs border text-[7px] leading-none ${
                                  card.postSupportStatus === 'in_progress'
                                    ? 'border-amber-700 bg-amber-500 text-white'
                                    : 'border-amber-600 bg-white'
                                }`}
                              >
                                {card.postSupportStatus === 'in_progress' ? '✓' : ''}
                              </span>
                              {labels.cardPostInProgress}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 ${
                                card.postSupportStatus === 'needs_followup'
                                  ? 'font-extrabold text-red-800'
                                  : ''
                              }`}
                            >
                              <span
                                className={`inline-flex h-2.5 w-2.5 items-center justify-center rounded-xs border text-[7px] leading-none ${
                                  card.postSupportStatus === 'needs_followup'
                                    ? 'border-red-700 bg-red-600 text-white'
                                    : 'border-red-600 bg-white'
                                }`}
                              >
                                {card.postSupportStatus === 'needs_followup' ? '✓' : ''}
                              </span>
                              {labels.cardPostNeedsFollowup}
                            </span>
                          </div>
                        </div>
                      )}

                      <div
                        className={`grid ${
                          config.showParentSignature ? 'grid-cols-3' : 'grid-cols-2'
                        } gap-1.5 text-center text-[7.5px]`}
                      >
                        <div className="rounded border border-slate-200 bg-slate-50/50 px-1.5 py-1 flex flex-col items-center justify-between">
                          <div className="font-bold" style={{ color: accent }}>
                            {labels.cardSigTeacher}
                          </div>
                          <div className="mt-0.5 truncate font-semibold text-slate-800 max-w-full">
                            {metadata.teacherName || '....................'}
                          </div>
                          {(template.headerConfig.teacherSignatureMode || 'manual') === 'image' ? (
                            template.headerConfig.teacherSignatureImage ? (
                              <img
                                src={template.headerConfig.teacherSignatureImage}
                                alt="توقيع الأستاذ"
                                className="mx-auto mt-0.5 max-h-4 max-w-[75px] object-contain"
                              />
                            ) : null
                          ) : template.headerConfig.teacherSignatureText?.trim() ? (
                            <div
                              className="mt-0.5 truncate font-serif text-[8px] font-bold italic max-w-full"
                              style={{ color: accent }}
                            >
                              {template.headerConfig.teacherSignatureText.trim()}
                            </div>
                          ) : null}
                        </div>

                        <div className="rounded border border-slate-200 bg-slate-50/50 px-1.5 py-1">
                          <div className="font-bold text-slate-800">{labels.cardSigStudent}</div>
                          <div className="mt-2 mx-auto w-16 border-b border-dotted border-slate-400" />
                        </div>

                        {config.showParentSignature && (
                          <div className="rounded border border-slate-200 bg-slate-50/50 px-1.5 py-1">
                            <div className="font-bold text-slate-800">{labels.cardSigParent}</div>
                            <div className="mt-2 mx-auto w-16 border-b border-dotted border-slate-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sheet Bottom Footer */}
            <footer className="shrink-0 flex items-center justify-between border-t border-slate-200 pt-1 text-[8.5px] text-slate-500">
              <span>
                {labels.footerBrand} · {labels.cardsHeaderTitle} ({targetStudents.length}) ·{' '}
                {metadata.examNumber} {metadata.className ? `(${metadata.className})` : ''}
              </span>
              <span className="font-mono tabular-nums">
                {labels.pageOfTotal(currentPageNumber, computedTotalPages)}
              </span>
            </footer>
          </article>
        );
      })}
    </>
  );
};

export function buildRemediationCardsWordSectionHtml(
  template: ReportTemplateSchema,
  metadata: MassarMetadata,
  stats: ComputedStats,
  students: StudentRecord[],
  itemDefinitions: ExamItemDefinition[] = [],
  studentItemScores: StudentItemScores = {}
): string {
  const esc = escapeHtml;
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const config = getRemediationCardsConfig(template, metadata);
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(template.styleConfig.accentColor || '')
    ? template.styleConfig.accentColor
    : '#0f766e';
  const wordFont = getWordFontFamily(template.styleConfig.fontFamily);

  const rankMap = new Map<string, number>();
  stats.rankedStudents.forEach((st, idx) => {
    rankMap.set(st.id, idx + 1);
  });

  const targetStudents = getFilteredRemediationStudents(
    students,
    stats,
    template,
    config
  );
  const cardsData = targetStudents.map((st, idx) =>
    buildStudentRemediationPlan(
      st,
      rankMap.get(st.id) || idx + 1,
      stats,
      metadata,
      template,
      config,
      itemDefinitions,
      studentItemScores
    )
  );

  if (cardsData.length === 0) {
    return `<div style="border:1px solid #cbd5e1; padding:12px; text-align:center; font-family:${wordFont};">${esc(labels.cardsEmptyTitle)}</div>`;
  }

  const safeSigImg =
    (template.headerConfig.teacherSignatureMode || 'manual') === 'image' &&
    typeof template.headerConfig.teacherSignatureImage === 'string' &&
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(
      template.headerConfig.teacherSignatureImage.trim()
    )
      ? template.headerConfig.teacherSignatureImage.trim()
      : '';
  const teacherCardSigHtml =
    (template.headerConfig.teacherSignatureMode || 'manual') === 'image'
      ? safeSigImg
        ? `<div style="margin-top:3px;"><img src="${safeSigImg}" alt="توقيع الأستاذ" style="max-height:24px; max-width:90px;" /></div>`
        : ''
      : template.headerConfig.teacherSignatureText?.trim()
      ? `<div style="font-size:8.5pt; font-style:italic; font-weight:bold; color:${accent}; margin-top:2px;">${esc(template.headerConfig.teacherSignatureText.trim())}</div>`
      : '';

  const textAlign = labels.dir === 'rtl' ? 'right' : 'left';
  const cardsHtml = cardsData
    .map(
      (c, i) => `
      <div style="border:1.5px solid ${accent}; border-radius:6px; padding:10px; margin-bottom:12px; page-break-inside:avoid; direction:${labels.dir}; text-align:${textAlign}; font-family:${wordFont};">
        <table style="width:100%; border-collapse:collapse; margin-bottom:6px; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">
          <tr>
            <td style="font-weight:bold; font-size:11pt; color:${accent};">
              ${esc(labels.cardBadgePrefix)}${i + 1} — ${esc(c.groupLabel)}
            </td>
            <td style="text-align:${labels.dir === 'rtl' ? 'left' : 'right'}; font-size:9pt; color:#475569;">
              ${esc(metadata.school || '')} · ${esc(metadata.subject || '')} · ${esc(labels.classLabel)} ${esc(metadata.className || '')} · ${esc(metadata.examNumber || '')}
            </td>
          </tr>
        </table>
        <table style="width:100%; border-collapse:collapse; margin-bottom:6px; background:#f8fafc; font-size:10pt;">
          <tr>
            <td style="padding:4px 8px; border:1px solid #cbd5e1;"><strong>${esc(labels.cardStudentMeta)}:</strong> ${esc(c.student.fullName)}</td>
            <td style="padding:4px 8px; border:1px solid #cbd5e1;"><strong>${esc(labels.cardMassarCode)}</strong> ${esc(c.student.code || '—')}</td>
            <td style="padding:4px 8px; border:1px solid #cbd5e1;"><strong>${esc(labels.colScoreShort)}:</strong> ${
              c.isAbsent || c.score === null ? esc(labels.absentLabel) : `${c.score.toFixed(2)} / 20`
            } (${esc(c.appreciationLocalized)})</td>
            <td style="padding:4px 8px; border:1px solid #cbd5e1;"><strong>${esc(labels.colRank)}:</strong> ${c.rank}/${stats.total}</td>
          </tr>
        </table>
        <p style="margin:4px 0; font-size:9.5pt;"><strong>${esc(labels.cardDiagTitle)}</strong> ${esc(c.diagnosticText)}</p>
        <p style="margin:4px 0; font-size:9.5pt;"><strong>${esc(labels.cardTargetCompetency)}</strong> ${esc(c.competencyFocus)}</p>
        ${c.weakItemsText ? `<p style="margin:4px 0; font-size:9pt; color:#b91c1c;"><strong>${esc(labels.cardWeakItemsLabel)}</strong> ${esc(c.weakItemsText)}</p>` : ''}
        <p style="margin:4px 0; font-size:9.5pt;"><strong>${esc(labels.cardActionPlanTitle)}</strong> ${esc(c.exerciseTask)}</p>
        <p style="margin:4px 0; font-size:9pt; color:#334155;">${c.checklistItems
          .map((item) => `☐ ${esc(item)}`)
          .join(' &nbsp;|&nbsp; ')}</p>
        ${
          config.showPostSupportEval
            ? `<p style="margin:6px 0 4px 0; font-size:9pt; background:#f1f5f9; padding:4px 6px;"><strong>${esc(labels.cardPostSupportTitle)}</strong> ${
                c.postSupportScore !== null
                  ? `<strong style="color:#065f46;" dir="ltr">(${c.postSupportScore.toFixed(2)}/20${
                      c.postSupportDelta !== null
                        ? ` · ${c.postSupportDelta >= 0 ? '+' : ''}${c.postSupportDelta.toFixed(2)}`
                        : ''
                    })</strong> `
                  : ''
              }&nbsp; ${c.postSupportStatus === 'mastered' ? '☑' : '☐'} ${esc(labels.cardPostMastered)} &nbsp;&nbsp; ${c.postSupportStatus === 'in_progress' ? '☑' : '☐'} ${esc(labels.cardPostInProgress)} &nbsp;&nbsp; ${c.postSupportStatus === 'needs_followup' ? '☑' : '☐'} ${esc(labels.cardPostNeedsFollowup)}</p>`
            : ''
        }
        <table style="width:100%; border-collapse:collapse; margin-top:6px; font-size:9pt; text-align:center;">
          <tr>
            <td style="border:1px solid #cbd5e1; padding:6px;"><strong>${esc(labels.cardSigTeacher)}:</strong><br/>${esc(metadata.teacherName || '................')}${teacherCardSigHtml}</td>
            <td style="border:1px solid #cbd5e1; padding:6px;"><strong>${esc(labels.cardSigStudent)}:</strong><br/>................</td>
            ${
              config.showParentSignature
                ? `<td style="border:1px solid #cbd5e1; padding:6px;"><strong>${esc(labels.cardSigParent)}:</strong><br/>................</td>`
                : ''
            }
          </tr>
        </table>
      </div>`
    )
    .join('\n');

  return `
    <h2 style="text-align:center; color:${accent}; font-family:${wordFont};">${esc(labels.cardsHeaderTitle)} — ${esc(metadata.examNumber)} (${esc(metadata.className || '—')})</h2>
    ${cardsHtml}
  `;
}

export function exportRemediationCardsToWordDoc(
  template: ReportTemplateSchema,
  metadata: MassarMetadata,
  stats: ComputedStats,
  students: StudentRecord[],
  itemDefinitions: ExamItemDefinition[] = [],
  studentItemScores: StudentItemScores = {}
): void {
  const esc = escapeHtml;
  const lang = template.headerConfig.reportLanguage || 'ar';
  const labels = getReportLabels(lang);
  const wordFont = getWordFontFamily(template.styleConfig.fontFamily);
  const sectionHtml = buildRemediationCardsWordSectionHtml(
    template,
    metadata,
    stats,
    students,
    itemDefinitions,
    studentItemScores
  );

  const fullHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" dir="${labels.dir}" lang="${lang}">
  <head><meta charset="utf-8"><title>${esc(labels.cardsHeaderTitle)} — ${esc(metadata.examNumber || '')}</title></head>
  <body style="font-family:${wordFont}; direction:${labels.dir};">
    ${sectionHtml}
  </body>
</html>`;

  const blob = new Blob(['\ufeff', fullHtml], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeClass = (metadata.className || 'Class').replace(/[\\/:*?"<>|]+/g, '_');
  const safeExam = (metadata.examNumber || 'Exam').replace(/[\\/:*?"<>|]+/g, '_');
  const cardsPrefix =
    lang === 'fr'
      ? 'Fiches_Remediation'
      : lang === 'en'
      ? 'Remediation_Cards'
      : 'بطاقات_الدعم_الفردية';
  link.href = url;
  link.download = `${cardsPrefix}_${safeExam}_${safeClass}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
