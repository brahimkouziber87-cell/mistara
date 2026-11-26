import { ComputedStats, MassarMetadata, ReportTemplateSchema } from '../types/report';

export type MathTrackId =
  | 'tcs'
  | 'tclsh'
  | 'tco'
  | '1bac-sm'
  | '1bac-se'
  | '1bac-eco'
  | '1bac-aa'
  | '1bac-lsh'
  | '1bac-ori'
  | '2bac-sm'
  | '2bac-pc-svt'
  | '2bac-eco'
  | '2bac-aa'
  | '2bac-lsh'
  | '2bac-ori'
  | 'bac-pro';

export type MathLevelGroup =
  | 'الجذع المشترك'
  | 'الأولى بكالوريا'
  | 'الثانية بكالوريا'
  | 'البكالوريا المهنية';

export interface Memo142MathTrackSpec {
  id: MathTrackId;
  levelGroup: MathLevelGroup;
  shortCode: string;
  label: string;
  levelLabel: string;
  examsPerSemester: number;
  annualExamsTotal: number;
  homeworksPerSemester: number;
  officialDuration: string;
  durationMinutes: number;
  annualExamHours: number;
  supervisedWeightPct: number;
  singleExamWeightLabel: string;
  subjectCoefficient: number | string;
  weeklyHours: string;
  assessmentNature: string;
  taxonomyBreakdown: {
    directApplicationPct: number;
    familiarSituationsPct: number;
    complexProblemsPct: number;
  };
  examCriteriaTemplate: string;
  gradingScaleTemplate: string;
  keySyllabusHighlights: string;
}

export const MEMO_142_CORE_RULES: { id: string; title: string; detail: string }[] = [
  {
    id: 'rule-cc-100',
    title: 'المراقبة المستمرة (100% فروض محروسة)',
    detail:
      'يُحتسب معدل المراقبة المستمرة حصرياً بناءً على نقط الفروض المحروسة داخل القسم (لا توجد أنشطة مندمجة محتسبة في المعدل).',
  },
  {
    id: 'rule-notice-7d',
    title: 'الإخبار المسبق للتلاميذ',
    detail:
      'يُخبر التلاميذ بموعد الفرض المحروس ومحتواه المعرفي قبل إجرائه بأسبوع على الأقل.',
  },
  {
    id: 'rule-return-14d',
    title: 'التصحيح وإرجاع أوراق التحرير',
    detail:
      'تُرجع أوراق التحرير وتُصحح في القسم في أجل لا يتعدى أسبوعين (≤ 14 يوماً) من تاريخ إجراء الفرض.',
  },
  {
    id: 'rule-bac-pro',
    title: 'مسالك البكالوريا المهنية',
    detail:
      'يتراوح المعامل بين 2 و 4 والغلاف الزمني الأسبوعي بين 2 و 4 ساعات حسب البطاقة التقنية لكل مسلك.',
  },
];

/**
 * المرجعية التربوية الرسمية لمادة الرياضيات بسلك التعليم الثانوي التأهيلي
 * وفق المذكرة الوزارية رقم 142-08 (بتاريخ 16 نونبر 2007) والتوجيهات التربوية والبرامج
 */
export const MEMO_142_MATH_TRACKS: Memo142MathTrackSpec[] = [
  {
    id: 'tcs',
    levelGroup: 'الجذع المشترك',
    shortCode: 'TCS / TCT',
    label: 'الجذع المشترك العلمي (TCS) والتكنولوجي (TCT)',
    levelLabel: 'الجذع المشترك العلمي',
    examsPerSemester: 3,
    annualExamsTotal: 6,
    homeworksPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 12,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 4,
    weeklyHours: '5 ساعات (2س + 2س + 1س)',
    assessmentNature: 'مراقبة مستمرة طيلة السنة',
    taxonomyBreakdown: {
      directApplicationPct: 40,
      familiarSituationsPct: 40,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '40% تطبيق مباشر للمعارف والخاصيات · 40% استحضار وتوظيف مهارات في وضعيات مألوفة · 20% وضعيات مركبة وحل مسائل (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الحسابيات في IN · الحساب المتجهي والإسقاط · المجموعات والترتيب في IR · الحدوديات والمعادلات · الحساب المثلثي · الدوال العددية · الهندسة الفضائية.',
  },
  {
    id: 'tclsh',
    levelGroup: 'الجذع المشترك',
    shortCode: 'TCLSH',
    label: 'الجذع المشترك للآداب والعلوم الإنسانية (TCLSH)',
    levelLabel: 'الجذع المشترك للآداب والعلوم الإنسانية',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 2,
    weeklyHours: 'ساعتان (2س أو 1س + 1س)',
    assessmentNature: 'مراقبة مستمرة طيلة السنة',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر لقواعد الحساب والمعادلات · 40% توظيف في وضعيات مألوفة · 15% ترييض مسألة بسيطة (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الحساب العددي والتناسبية والنسب المئوية · المعادلات والمتراجحات والنظمات · الإحصاء الوصفي · المستقيم في المستوى · عموميات حول الدوال.',
  },
  {
    id: 'tco',
    levelGroup: 'الجذع المشترك',
    shortCode: 'TCO',
    label: 'الجذع المشترك للتعليم الأصيل (TCO)',
    levelLabel: 'الجذع المشترك للتعليم الأصيل',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 2,
    weeklyHours: 'ساعتان (2س أو 1س + 1س)',
    assessmentNature: 'مراقبة مستمرة طيلة السنة',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر لقواعد الحساب والمعادلات · 40% توظيف في وضعيات مألوفة · 15% ترييض مسألة بسيطة (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الحساب العددي والتناسبية والنسب المئوية · المعادلات والمتراجحات والنظمات · الإحصاء الوصفي · المستقيم في المستوى · عموميات حول الدوال.',
  },
  {
    id: '1bac-sm',
    levelGroup: 'الأولى بكالوريا',
    shortCode: '1BAC SM',
    label: 'الأولى بكالوريا علوم رياضية (خيار فرنسية / عربية)',
    levelLabel: 'الأولى بكالوريا علوم رياضية',
    examsPerSemester: 4,
    annualExamsTotal: 8,
    homeworksPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 16,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '25%',
    subjectCoefficient: 9,
    weeklyHours: '7 ساعات',
    assessmentNature: 'مراقبة مستمرة فقط (تُمتحن وطنياً في الثانية باك)',
    taxonomyBreakdown: {
      directApplicationPct: 30,
      familiarSituationsPct: 50,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '30% تطبيق مباشر للتعاريف والخاصيات · 50% استدلال رياضي وتوظيف مبرهنات في وضعيات مألوفة · 20% وضعيات غير مألوفة ومسائل توليفية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: 4 فروض محروسة في الدورة بوزن متساوٍ (25% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'مبادئ في المنطق · المجموعات والتطبيقات · عموميات حول الدوال · المرجح والجداء السلمي · المتتاليات · الحسابيات في Z · النهايات والاشتقاق · الدوران والتعداد.',
  },
  {
    id: '1bac-se',
    levelGroup: 'الأولى بكالوريا',
    shortCode: '1BAC SE / STE / STM',
    label: 'الأولى بكالوريا علوم تجريبية / علوم وتكنولوجيات (ميكانيكية وكهربائية)',
    levelLabel: 'الأولى بكالوريا علوم تجريبية',
    examsPerSemester: 3,
    annualExamsTotal: 6,
    homeworksPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 12,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 7,
    weeklyHours: '5 ساعات (ع.ت) / 4 ساعات (تكنولوجيات)',
    assessmentNature: 'مراقبة مستمرة فقط (تُمتحن وطنياً في الثانية باك)',
    taxonomyBreakdown: {
      directApplicationPct: 35,
      familiarSituationsPct: 45,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '35% تطبيق مباشر للمعارف والتقنيات · 45% توظيف في وضعيات مألوفة · 20% مسائل توليفية وتأويل مبياني (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'مبادئ في المنطق · عموميات حول الدوال · المتتاليات العددية · المرجح والجداء السلمي · الحساب المثلثي · النهايات والاشتقاق ودراسة الدوال · الهندسة الفضائية.',
  },
  {
    id: '1bac-eco',
    levelGroup: 'الأولى بكالوريا',
    shortCode: '1BAC ECO',
    label: 'الأولى بكالوريا علوم اقتصادية وتدبير',
    levelLabel: 'الأولى بكالوريا علوم اقتصادية وتدبير',
    examsPerSemester: 3,
    annualExamsTotal: 6,
    homeworksPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 12,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 4,
    weeklyHours: '4 ساعات',
    assessmentNature: 'مراقبة مستمرة فقط (تُمتحن وطنياً في الثانية باك)',
    taxonomyBreakdown: {
      directApplicationPct: 40,
      familiarSituationsPct: 45,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '40% تطبيق مباشر للتقنيات الجبرية والتحليلية · 45% توظيف في وضعيات اقتصادية ومألوفة · 15% مسائل تركيبية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'مبادئ في المنطق · المعادلات والمتراجحات والنظمات · عموميات حول الدوال · المتتاليات · التعداد · النهايات والاشتقاق · الدالة اللوغاريتمية العشرية.',
  },
  {
    id: '1bac-aa',
    levelGroup: 'الأولى بكالوريا',
    shortCode: '1BAC AA',
    label: 'الأولى بكالوريا الفنون التطبيقية',
    levelLabel: 'الأولى بكالوريا الفنون التطبيقية',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 2,
    weeklyHours: 'ساعتان',
    assessmentNature: 'مراقبة مستمرة فقط',
    taxonomyBreakdown: {
      directApplicationPct: 40,
      familiarSituationsPct: 45,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '40% تطبيق مباشر للمعارف والتقنيات · 45% توظيف في وضعيات هندسية وتحليلية مألوفة · 15% مسائل تطبيقية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بمدة ساعة واحدة وبوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'مبادئ في المنطق · الحساب المثلثي · الهندسة التحليلية والتحويلات الهندسية · المتتاليات العددية · النهايات والاشتقاق ودراسة الدوال.',
  },
  {
    id: '1bac-lsh',
    levelGroup: 'الأولى بكالوريا',
    shortCode: '1BAC LSH',
    label: 'الأولى بكالوريا آداب وعلوم إنسانية',
    levelLabel: 'الأولى بكالوريا آداب وعلوم إنسانية',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 1,
    weeklyHours: 'ساعتان',
    assessmentNature: 'امتحان جهوي موحد + مراقبة مستمرة',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر وفق الإطار المرجعي للامتحان الجهوي · 40% توظيف في وضعيات مألوفة · 15% ترييض مسألة (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة) مع تحضير للجهوي.',
    keySyllabusHighlights:
      'مبادئ في المنطق · الحساب العددي والنسب المئوية · المعادلات والنظمات · المتتاليات الحسابية والهندسية · التعداد · النهايات والاشتقاق.',
  },
  {
    id: '1bac-ori',
    levelGroup: 'الأولى بكالوريا',
    shortCode: '1BAC ORI',
    label: 'الأولى بكالوريا التعليم الأصيل (اللغة العربية / العلوم الشرعية)',
    levelLabel: 'الأولى بكالوريا التعليم الأصيل',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 1,
    weeklyHours: 'ساعتان',
    assessmentNature: 'امتحان جهوي موحد + مراقبة مستمرة',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر وفق الإطار المرجعي للامتحان الجهوي · 40% توظيف في وضعيات مألوفة · 15% ترييض مسألة (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة) مع تحضير للجهوي.',
    keySyllabusHighlights:
      'مبادئ في المنطق · الحساب العددي والنسب المئوية · المعادلات والنظمات · المتتاليات الحسابية والهندسية · التعداد · النهايات والاشتقاق.',
  },
  {
    id: '2bac-sm',
    levelGroup: 'الثانية بكالوريا',
    shortCode: '2BAC SM',
    label: 'الثانية بكالوريا علوم رياضية (أ) و (ب)',
    levelLabel: 'الثانية بكالوريا علوم رياضية',
    examsPerSemester: 4,
    annualExamsTotal: 8,
    homeworksPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 16,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '25%',
    subjectCoefficient: 9,
    weeklyHours: '7 ساعات',
    assessmentNature: 'امتحان وطني موحد + مراقبة مستمرة',
    taxonomyBreakdown: {
      directApplicationPct: 25,
      familiarSituationsPct: 50,
      complexProblemsPct: 25,
    },
    examCriteriaTemplate:
      '25% تطبيق مباشر للقواعد والخاصيات · 50% استدلال وبراهين مألوفة وفق الإطار المرجعي للوطني · 25% مسائل مركبة وتوليفية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: 4 فروض محروسة في الدورة بوزن متساوٍ (25% لكل فرض · 100% فروض محروسة) — مع إمكانية فرض تأليفي بـ 3h إلى 4h.',
    keySyllabusHighlights:
      'الاتصال ومبرهنة القيم الوسيطية · الاشتقاق ومبرهنة التزايدات المنتهية · المتتاليات · الدوال ln و exp · المعادلات التفاضلية · الأعداد العقدية · الحسابيات في Z · البنيات الجبرية · التكامل · الاحتمالات.',
  },
  {
    id: '2bac-pc-svt',
    levelGroup: 'الثانية بكالوريا',
    shortCode: '2BAC PC / SVT / STM / STE',
    label: 'الثانية بكالوريا علوم تجريبية (PC / SVT / الزراعية) وعلوم وتكنولوجيات (STM / STE)',
    levelLabel: 'الثانية بكالوريا علوم فيزيائية وعلوم الحياة والأرض',
    examsPerSemester: 3,
    annualExamsTotal: 6,
    homeworksPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 12,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 7,
    weeklyHours: '5 ساعات (ع.ت) / 4 ساعات (تكنولوجيات)',
    assessmentNature: 'امتحان وطني موحد + مراقبة مستمرة',
    taxonomyBreakdown: {
      directApplicationPct: 30,
      familiarSituationsPct: 50,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '30% تطبيق مباشر للقواعد والنهايات والمشتقات · 50% دراسة دوال ومتتاليات وعقدية وفق الإطار المرجعي للوطني · 20% مسائل تركيبية واستنتاجات مبيانية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الاتصال والاشتقاق ودراسة الدوال · المتتاليات العددية · الدوال اللوغاريتمية والأسية · المعادلات التفاضلية · الأعداد العقدية · الهندسة الفضائية · التكامل · الاحتمالات.',
  },
  {
    id: '2bac-eco',
    levelGroup: 'الثانية بكالوريا',
    shortCode: '2BAC ECO / SGC',
    label: 'الثانية بكالوريا علوم اقتصادية / علوم التدبير المحاسباتي',
    levelLabel: 'الثانية بكالوريا علوم اقتصادية وتدبير',
    examsPerSemester: 3,
    annualExamsTotal: 6,
    homeworksPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 12,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 4,
    weeklyHours: '4 ساعات',
    assessmentNature: 'امتحان وطني موحد + مراقبة مستمرة',
    taxonomyBreakdown: {
      directApplicationPct: 35,
      familiarSituationsPct: 45,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '35% تطبيق مباشر للمعارف · 45% دراسة دوال ومتتاليات واحتمالات وفق الإطار المرجعي للوطني · 20% مسائل تطبيقية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الاتصال والاشتقاق · المتتاليات العددية · الدالة اللوغاريتمية والأسية · الدوال الأصلية والحساب التكاملي · حساب الاحتمالات والمتغير العشوائي.',
  },
  {
    id: '2bac-aa',
    levelGroup: 'الثانية بكالوريا',
    shortCode: '2BAC AA',
    label: 'الثانية بكالوريا الفنون التطبيقية',
    levelLabel: 'الثانية بكالوريا الفنون التطبيقية',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 2,
    weeklyHours: 'ساعتان',
    assessmentNature: 'مراقبة مستمرة فقط (لا تُمتحن وطنياً في الفنون التطبيقية)',
    taxonomyBreakdown: {
      directApplicationPct: 40,
      familiarSituationsPct: 45,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '40% تطبيق مباشر للقواعد · 45% دراسة دوال ومتتاليات واحتمالات في وضعيات مألوفة · 15% مسائل تطبيقية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بمدة ساعة واحدة وبوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الاشتقاق ودراسة الدوال الحدودية والجذرية والمتخاطة · المتتاليات العددية · الدالة اللوغاريتمية النبيرية والأسية · الحساب التكاملي · التعداد وحساب الاحتمالات.',
  },
  {
    id: '2bac-lsh',
    levelGroup: 'الثانية بكالوريا',
    shortCode: '2BAC LSH',
    label: 'الثانية بكالوريا آداب وعلوم إنسانية (مسلك الآداب / العلوم الإنسانية)',
    levelLabel: 'الثانية بكالوريا آداب وعلوم إنسانية',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 1,
    weeklyHours: 'ساعتان',
    assessmentNature: 'مراقبة مستمرة فقط (اجتيزت جهوياً في الأولى باك)',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر · 40% توظيف في وضعيات مألوفة · 15% تأويل واستنتاج (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'المتتاليات العددية · النهايات والاتصال · الاشتقاق ودراسة دوال حدودية ومتخاطة · الدالة اللوغاريتمية والأسية المبسطة · حساب الاحتمالات.',
  },
  {
    id: '2bac-ori',
    levelGroup: 'الثانية بكالوريا',
    shortCode: '2BAC ORI',
    label: 'الثانية بكالوريا التعليم الأصيل (مسلك اللغة العربية / العلوم الشرعية)',
    levelLabel: 'الثانية بكالوريا التعليم الأصيل',
    examsPerSemester: 2,
    annualExamsTotal: 4,
    homeworksPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    annualExamHours: 4,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 1,
    weeklyHours: 'ساعتان',
    assessmentNature: 'مراقبة مستمرة فقط (اجتيزت جهوياً في الأولى باك)',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر · 40% توظيف في وضعيات مألوفة · 15% تأويل واستنتاج (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'المتتاليات العددية · النهايات والاتصال · الاشتقاق ودراسة الدوال · الدالة اللوغاريتمية والأسية المبسطة · حساب الاحتمالات.',
  },
  {
    id: 'bac-pro',
    levelGroup: 'البكالوريا المهنية',
    shortCode: 'BAC PRO',
    label: 'البكالوريا المهنية (حسب البطاقة التقنية لكل مسلك)',
    levelLabel: 'البكالوريا المهنية',
    examsPerSemester: 3,
    annualExamsTotal: 6,
    homeworksPerSemester: 2,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    annualExamHours: 12,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: '2 إلى 4',
    weeklyHours: '2 إلى 4 ساعات (حسب المسلك)',
    assessmentNature: 'امتحان وطني + مراقبة مستمرة (حسب البطاقة التقنية للمسلك)',
    taxonomyBreakdown: {
      directApplicationPct: 40,
      familiarSituationsPct: 45,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '40% تطبيق مباشر للتقنيات · 45% توظيف في وضعيات مألوفة ومهنية · 15% مسائل تركيبية (المذكرة 142-08).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق المذكرة 142-08 والبطاقة التقنية للمسلك المهني (100% فروض محروسة داخل القسم).',
    keySyllabusHighlights:
      'الدوال العددية والاشتقاق · المتتاليات · اللوغاريتم والأسية · الإحصاء والاحتمالات التطبيقية (حسب البطاقة التقنية للمسلك).',
  },
];

export interface OfficialMathDocItem {
  id: string;
  title: string;
  reference: string;
  purpose: string;
}

export const MATH_TEACHER_OFFICIAL_DOCS: OfficialMathDocItem[] = [
  {
    id: 'memo-142-08',
    title: 'المذكرة الوزارية رقم 142-08 (16 نونبر 2007)',
    reference: 'التقويم التربوي للرياضيات بالتأهيلي',
    purpose:
      'تنظيم فروض المراقبة المستمرة (100% فروض محروسة + فروض منزلية تكوينية)، المدد الزمنية، آجال إرجاع الأوراق، وتدبير الغياب والاستدراك.',
  },
  {
    id: 'orientations-2007',
    title: 'التوجيهات التربوية والبرامج الخاصة بالرياضيات',
    reference: 'السلك الثانوي التأهيلي (2007)',
    purpose: 'الكفايات النوعية، الغلاف الزمني، التوزيع الدوري، والقدرات المنتظرة لكل مسلك وشعبة.',
  },
  {
    id: 'cadres-ref',
    title: 'الأطر المرجعية للامتحانين الجهوي والوطني',
    reference: 'المركز الوطني للتقويم والامتحانات',
    purpose: 'ضبط مجالات المضامين وجدول التخصيص ومستويات المهارات المعرفية.',
  },
  {
    id: 'distribution-periodique',
    title: 'التوزيع الدوري والسنوي للمقرر الدراسي',
    reference: 'تخطيط الأسدس الأول والثاني',
    purpose: 'برمجة المجزوءات والدروس وتواريخ الفروض المحروسة والمنزلية وحصص الدعم المندمج.',
  },
  {
    id: 'cahier-textes',
    title: 'دفتر النصوص (الورقي / الرقمي)',
    reference: 'وثيقة تتبع يومية إلزامية',
    purpose: 'تدوين الأنشطة، الحصص، مواضيع الفروض المحروسة والمنزلية، سلالم التنقيط، وحصص التصحيح.',
  },
  {
    id: 'fiche-pedagogique',
    title: 'الجذاذات البيداغوجية وتخطيط التعلمات',
    reference: 'التحضير القبلي للدرس والفرض',
    purpose: 'بناء الوضعيات الديداكتيكية، التدرج الصفي، وتحديد التعثرات المتوقعة.',
  },
  {
    id: 'bareme-correction',
    title: 'مواضيع الفروض المنزلية وعناصر الإجابة وسلم التنقيط',
    reference: 'ضمان الشفافية وتكافؤ الفرص',
    purpose: 'توثيق الأجوبة المعيارية وسلم التنقيط المفصل وتوزيعه على المتعلمين خلال حصة التصحيح.',
  },
  {
    id: 'cahier-notes',
    title: 'سجل المراقبة المستمرة وشبكة التحليل',
    reference: 'مطابق لمنظومة مسار',
    purpose: 'توثيق نقط الفروض المحروسة، تتبع الغياب (مبرر/غير مبرر)، وشبكة تحليل الكفايات والتمارين.',
  },
  {
    id: 'remediation-cards',
    title: 'تقرير الفرض وبطاقات الدعم الفردي ومحاضر المجالس',
    reference: 'ملف التفتيش ومجالس الأقسام',
    purpose: 'تفييء مجموعات الحاجة وتتبع أثر المعالجة البعدي بين الفروض المتعاقبة.',
  },
];

export function isMathematicsSubject(subject: string | undefined): boolean {
  const s = (subject || '').trim().toLowerCase();
  return /رياضيات|math/.test(s);
}

export function isHighSchoolCycle(metadata: MassarMetadata): boolean {
  const combined = `${metadata.cycle} ${metadata.level} ${metadata.className}`
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .toLowerCase();
  if (/ابتدائي|primaire|اعدادي|1ac|2ac|3ac|apic|college/.test(combined)) {
    return false;
  }
  return true;
}

export function detectMathTrackFromMetadata(metadata: MassarMetadata): Memo142MathTrackSpec {
  const raw = `${metadata.level} ${metadata.className}`
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();

  const is2Bac = /2\s*bac|ثانيه\s*بكالوريا|ثانيه\s*باك|\b2b(?:ac|[a-z]|$|\d|-|_)/.test(raw);
  const is1Bac = /1\s*bac|اولي\s*بكالوريا|اولي\s*باك|\b1b(?:ac|[a-z]|$|\d|-|_)/.test(raw);
  const isTC = /جذع|\btc(?:s|sf|t|lsh|o|f)?(?:[-_\d\s]|$)/.test(raw);

  const isPro = /مهنيه|\bpro\b|bac\s*pro|\b(?:1|2)?b(?:ac)?pro(?:[-_\d\s]|$)/.test(raw);
  const isAA = /فنون\s*تطبيقيه|الفنون|arts?\s*appl|\baa(?:[-_\d\s]|$)|\b(?:1|2)b(?:ac)?aa(?:f)?(?:[-_\d\s]|$)/.test(raw);
  const isOri = /اصيل|شرعيه|لغه\s*عربيه|\btco(?:[-_\d\s]|$)|\bori(?:[-_\d\s]|$)|\b(?:1|2)b(?:ac)?ori(?:[-_\d\s]|$)/.test(raw);
  const isSM = /علوم\s*رياضيه|رياضيه|\bsm(?:[abf]|[-_\d\s]|$)|\b(?:1|2)b(?:ac)?sm(?:[abf]|[-_\d\s]|$)/.test(raw);
  const isEco = /اقتصاد|تدبير|محاسب|\bs?eco(?:f)?(?:[-_\d\s]|$)|\bsgc(?:f)?(?:[-_\d\s]|$)|\b(?:1|2)b(?:ac)?s?(?:eco|sgc)(?:f)?(?:[-_\d\s]|$)/.test(raw);
  const isLSH = /اداب|انسانيه|lettre|\blsh(?:[-_\d\s]|$)|\btclsh(?:[-_\d\s]|$)|\b(?:1|2)b(?:ac)?(?:lsh|sh|l)(?:[-_\d\s]|$)/.test(raw);
  const isPCSVT = /فيزيائيه|حياه|ارض|زراعيه|ميكانيك|كهربائ|\b(?:pc|svt|sp|stm|ste)(?:f)?(?:[-_\d\s]|$)|\b(?:1|2)b(?:ac)?(?:pc|svt|sp|se|stm|ste)(?:f)?(?:[-_\d\s]|$)/.test(raw);

  if (isPro) return MEMO_142_MATH_TRACKS.find((t) => t.id === 'bac-pro')!;

  if (is2Bac) {
    if (isSM) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-sm')!;
    if (isEco) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-eco')!;
    if (isAA) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-aa')!;
    if (isOri) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-ori')!;
    if (isLSH) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-lsh')!;
    return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-pc-svt')!;
  }

  if (is1Bac) {
    if (isSM) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-sm')!;
    if (isEco) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-eco')!;
    if (isAA) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-aa')!;
    if (isOri) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-ori')!;
    if (isLSH) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-lsh')!;
    return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-se')!;
  }

  if (isTC) {
    if (isOri) return MEMO_142_MATH_TRACKS.find((t) => t.id === 'tco')!;
    if (isLSH) return MEMO_142_MATH_TRACKS.find((t) => t.id === 'tclsh')!;
    return MEMO_142_MATH_TRACKS.find((t) => t.id === 'tcs')!;
  }

  if (isPCSVT) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-pc-svt')!;
  if (isSM) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-sm')!;
  if (isEco) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-eco')!;
  if (isAA) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-aa')!;
  if (isOri) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-ori')!;
  if (isLSH) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-lsh')!;

  return MEMO_142_MATH_TRACKS[0];
}

export interface Memo142ComplianceCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'info';
  detail: string;
}

export interface Memo142AuditReport {
  scorePct: number;
  passedCount: number;
  totalChecks: number;
  turnaroundDays: number | null;
  checks: Memo142ComplianceCheck[];
}

function parseFlexibleDate(value: string): Date | null {
  const v = (value || '').trim();
  if (!v) return null;
  // Supports YYYY-MM-DD or DD/MM/YYYY
  const isoMatch = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const dmyMatch = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = new Date(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1])
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseDurationMinutes(durationStr: string): number | null {
  const s = (durationStr || '')
    .replace(/[أإآ]/g, 'ا')
    .toLowerCase()
    .trim();
  if (!s) return null;
  if (/ساعت(?:ان|ين)\s*و\s*(?:نصف|30)|2\.5\s*h|2\s*h\s*30|150\s*(?:د|min)/.test(s)) return 150;
  if (/ساع[ةه]\s*و\s*(?:نصف|30)|1\.5\s*h|1\s*h\s*30|90\s*(?:د|min)/.test(s)) return 90;
  if (/4\s*h|4\s*ساع|اربع\s*ساعات|240\s*(?:د|min)?/.test(s)) return 240;
  if (/3\s*h|3\s*ساع|ثلاث\s*ساعات|180\s*(?:د|min)?/.test(s)) return 180;
  if (/ساعتان|ساعتين|2\s*h|2\s*ساع|120\s*(?:د|min)?/.test(s)) return 120;
  if (/ساع[ةه]|1\s*h|60\s*(?:د|min)?/.test(s)) return 60;
  return null;
}

export function auditMemo142Compliance(
  metadata: MassarMetadata,
  stats: ComputedStats,
  template: ReportTemplateSchema,
  track: Memo142MathTrackSpec
): Memo142AuditReport {
  const checks: Memo142ComplianceCheck[] = [];

  // 1. Duration Check
  const detectedMinutes = parseDurationMinutes(metadata.duration);
  const isAcceptedPrepDuration =
    detectedMinutes !== null &&
    ((track.id === '2bac-sm' && detectedMinutes >= 120 && detectedMinutes <= 240) ||
      ((track.id === '2bac-pc-svt' || track.id === '2bac-eco') && detectedMinutes === 180) ||
      ((track.id === '1bac-lsh' || track.id === '1bac-ori') && detectedMinutes === 90));

  if (detectedMinutes === null) {
    checks.push({
      id: 'duration',
      label: 'المدة الزمنية للفرض',
      status: 'warn',
      detail: `لم تُضبط المدة بوضوح. المدة القانونية لمسلك ${track.shortCode} هي ${track.officialDuration}.`,
    });
  } else if (detectedMinutes === track.durationMinutes) {
    checks.push({
      id: 'duration',
      label: 'المدة الزمنية للفرض',
      status: 'pass',
      detail: `مطابقة للمذكرة 142-08 (${metadata.duration} لمسلك ${track.shortCode}).`,
    });
  } else if (isAcceptedPrepDuration) {
    checks.push({
      id: 'duration',
      label: 'المدة الزمنية للفرض',
      status: 'pass',
      detail: `فرض تأليفي مقبول (${metadata.duration}) يطابق مدة الامتحان الإشهادي لمسلك ${track.shortCode} (المدة العادية: ${track.officialDuration}).`,
    });
  } else {
    checks.push({
      id: 'duration',
      label: 'المدة الزمنية للفرض',
      status: 'warn',
      detail: `المدة المدخلة (${metadata.duration}) تختلف عن المدة القانونية المحددة في المذكرة 142-08 (${track.officialDuration}).`,
    });
  }

  // 2. Exam-to-Correction Turnaround Time (<= 7 days ideal, <= 14 days max per Memo 142-08)
  const examDt = parseFlexibleDate(metadata.examDate);
  const corrDt = parseFlexibleDate(metadata.correctionDate);
  let turnaroundDays: number | null = null;
  if (examDt && corrDt) {
    turnaroundDays = Math.round(
      (corrDt.getTime() - examDt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (turnaroundDays < 0) {
      checks.push({
        id: 'turnaround',
        label: 'أجل التصحيح وإرجاع الأوراق',
        status: 'warn',
        detail: 'تاريخ التصحيح يسبق تاريخ إنجاز الفرض — يرجى مراجعة التواريخ.',
      });
    } else if (turnaroundDays <= 7) {
      checks.push({
        id: 'turnaround',
        label: 'أجل التصحيح وإرجاع الأوراق',
        status: 'pass',
        detail: `أجل مثالي وفق المذكرة 142-08 (تم التصحيح ورد الأوراق خلال ${turnaroundDays} أيام ≤ أسبوع واحد).`,
      });
    } else if (turnaroundDays <= 14) {
      checks.push({
        id: 'turnaround',
        label: 'أجل التصحيح وإرجاع الأوراق',
        status: 'pass',
        detail: `تم التصحيح داخل الحد المقبول (${turnaroundDays} يوماً ≤ 14 يوماً؛ وتوصي المذكرة 142-08 بالأسبوع الموالي).`,
      });
    } else {
      checks.push({
        id: 'turnaround',
        label: 'أجل التصحيح وإرجاع الأوراق',
        status: 'warn',
        detail: `المدة الفاصلة (${turnaroundDays} يوماً) تتجاوز أسبوعين؛ توصي المذكرة 142-08 بإرجاع الأوراق في الأسبوع الموالي لضمان أثر التغذية الراجعة.`,
      });
    }
  } else {
    checks.push({
      id: 'turnaround',
      label: 'أجل التصحيح وإرجاع الأوراق',
      status: 'info',
      detail:
        'أدخل تاريخ الإنجاز وتاريخ التصحيح للتحقق الآلي من احترام أجل إرجاع أوراق التحرير (الأسبوع الموالي ≤ 7 أيام، والحد الأقصى 14 يوماً).',
    });
  }

  // 3. Exam Content & Cognitive Taxonomy Criteria
  const hasContent = (metadata.examContent || '').trim().length >= 15;
  const hasCriteria = (metadata.examCriteria || '').trim().length >= 15;
  if (hasContent && hasCriteria) {
    checks.push({
      id: 'criteria',
      label: 'مضمون الفرض وجدول التخصيص',
      status: 'pass',
      detail: 'مضمون الفرض ومستويات المهارات المعرفية موثقة ومطابقة للأطر المرجعية.',
    });
  } else {
    checks.push({
      id: 'criteria',
      label: 'مضمون الفرض وجدول التخصيص',
      status: 'warn',
      detail: !hasContent
        ? 'يرجى تحديد محاور/دروس الفرض (يمكن إدراجها بنقرة من بنك الكفايات).'
        : 'يرجى توثيق جدول التخصيص (نسب التطبيق المباشر، الوضعيات المألوفة، والمسائل).',
    });
  }

  // 4. Weighting, Exam Number & Official Ministry Header
  const rawWeight = (metadata.coefficient || '').trim();
  const hasWeight = rawWeight.length > 0;
  const parsedWeightNum = parseFloat(rawWeight.replace(',', '.').replace(/[^\d.]/g, ''));
  const expectedWeightNum = parseFloat(track.singleExamWeightLabel.replace(/[^\d.]/g, ''));
  const weightMatchesTrack =
    track.id === 'bac-pro' ||
    (Number.isFinite(parsedWeightNum) &&
      Number.isFinite(expectedWeightNum) &&
      Math.abs(parsedWeightNum - expectedWeightNum) <= 0.6);

  const rawExamNumber = (metadata.examNumber || '').trim();
  const isIntegratedActivities = /الأنشطة\s*المندمجة|الانشطة\s*المندمجة|activit[ée]s?\s*int[ée]gr[ée]es?/i.test(
    rawExamNumber
  );
  const examNumMatch = rawExamNumber.match(/(\d+)/);
  const parsedExamIndex = examNumMatch
    ? Number(examNumMatch[1])
    : /الرابع|رابع/i.test(rawExamNumber)
    ? 4
    : /الثالث|الثالت|ثالث/i.test(rawExamNumber)
    ? 3
    : /الثاني|ثاني/i.test(rawExamNumber)
    ? 2
    : /الأول|الاول|أول|اول/i.test(rawExamNumber)
    ? 1
    : null;
  const examNumberMatchesTrack =
    !isIntegratedActivities &&
    (parsedExamIndex === null || parsedExamIndex <= track.examsPerSemester);

  const trimmedMinistry = (template.headerConfig.ministryLine || '').trim();
  const officialMinistryOk =
    trimmedMinistry.length > 0 &&
    !trimmedMinistry.includes('والرياضة') &&
    !trimmedMinistry.includes('البحث العلمي');
  if (hasWeight && weightMatchesTrack && examNumberMatchesTrack && officialMinistryOk) {
    checks.push({
      id: 'admin',
      label: 'عدد ووزن الفرض والترويسة الوزارية',
      status: 'pass',
      detail: `وزن الفرض (${rawWeight}) ورقمه (${rawExamNumber || 'فرض 1'}) مطابقان لمسلك ${track.shortCode} (${track.examsPerSemester} فروض/دورة) والترويسة مطابقة للتسمية الرسمية للوزارة.`,
    });
  } else {
    checks.push({
      id: 'admin',
      label: 'عدد ووزن الفرض والترويسة الوزارية',
      status: 'warn',
      detail: !officialMinistryOk
        ? 'الترويسة تحتوي على تسمية قديمة للوزارة — حدّثها إلى «وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل».'
        : isIntegratedActivities
        ? 'وفق المذكرة 142-08 للرياضيات بالتأهيلي، يُحتسب معدل المراقبة المستمرة حصرياً من الفروض المحروسة (100%) ولا توجد أنشطة مندمجة محتسبة.'
        : !examNumberMatchesTrack
        ? `رقم الفرض المختار (${rawExamNumber}) يتجاوز العدد القانوني لمسلك ${track.shortCode} المحدد في المذكرة 142-08 (${track.examsPerSemester} فروض محروسة في الدورة).`
        : !hasWeight
        ? `يرجى ضبط وزن الفرض (${track.singleExamWeightLabel} ضمن 100% فروض محروسة وفق المذكرة 142-08).`
        : `وزن الفرض المدخل (${rawWeight}) لا يطابق الوزن القانوني لمسلك ${track.shortCode} (${track.singleExamWeightLabel} لـ ${track.examsPerSemester} فروض/دورة).`,
    });
  }

  // 5. Remediation Plan & Need Groups Activation
  const hasRemediation =
    template.pedagogicalContent.programmedRemediationBullets.some((b) => b.trim().length > 4) ||
    template.pedagogicalContent.remediationActions.length > 0;
  if (stats.present === 0) {
    checks.push({
      id: 'remediation',
      label: 'خطة الدعم وتفييء مجموعات الحاجة',
      status: 'info',
      detail: 'بانتظار استيراد نقط التلاميذ لتشخيص المتعثرين وتفييء مجموعات الحاجة وفق المذكرة 142-08.',
    });
  } else if (stats.failed > 0) {
    if (hasRemediation) {
      checks.push({
        id: 'remediation',
        label: 'خطة الدعم وتفييء مجموعات الحاجة',
        status: 'pass',
        detail: `تم رصد ${stats.failed} متعثراً وتفعيل خطة المعالجة والدعم المبرمجة وفق المذكرة 142-08.`,
      });
    } else {
      checks.push({
        id: 'remediation',
        label: 'خطة الدعم وتفييء مجموعات الحاجة',
        status: 'warn',
        detail: `يوجد ${stats.failed} متعثراً دون عتبة التحكم — يلزم تفعيل خطة الدعم الفردي/الجماعي.`,
      });
    }
  } else {
    checks.push({
      id: 'remediation',
      label: 'خطة الدعم وتفييء مجموعات الحاجة',
      status: 'pass',
      detail: 'نسبة التحكم مستوفاة مع جاهزية أنشطة التعزيز والتميّز (الارتقاء إلى التميز الرياضي).',
    });
  }

  // 6. Absence & Make-up Exam Governance (Memo 142-08)
  if (stats.total === 0) {
    checks.push({
      id: 'absences',
      label: 'تدبير الغياب والاستدراك (المذكرة 142-08)',
      status: 'info',
      detail: 'بانتظار استيراد لائحة القسم للتحقق من حالات الغياب وبرمجة الفرض الاستدراكي.',
    });
  } else if (stats.absent > 0) {
    const documentedAbsences = stats.absentStudents.filter(
      (s) => (s.observation || '').trim().length >= 3
    ).length;
    if (documentedAbsences === stats.absent) {
      checks.push({
        id: 'absences',
        label: 'تدبير الغياب والاستدراك (المذكرة 142-08)',
        status: 'pass',
        detail: `تم توثيق وضعية جميع المتغيبين (${stats.absent}) لبرمجة الفرض الاستدراكي للمبرّرين وتطبيق المسطرة الإدارية لغير المبرّرين.`,
      });
    } else {
      checks.push({
        id: 'absences',
        label: 'تدبير الغياب والاستدراك (المذكرة 142-08)',
        status: 'warn',
        detail: `يوجد ${stats.absent} متغيبين (${documentedAbsences} موثّقاً) — تنص المذكرة 142-08 على تحديد طبيعة الغياب (مبرّر للاستدراك / غير مبرّر).`,
      });
    }
  } else {
    checks.push({
      id: 'absences',
      label: 'تدبير الغياب والاستدراك (المذكرة 142-08)',
      status: 'pass',
      detail: 'حضور كامل للتلاميذ في الفرض المحروس (0 غياب مسجل).',
    });
  }

  const passedCount = checks.filter((c) => c.status === 'pass').length;
  const scorePct = Math.round((passedCount / checks.length) * 100);

  return {
    scorePct,
    passedCount,
    totalChecks: checks.length,
    turnaroundDays,
    checks,
  };
}
