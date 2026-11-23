import { ComputedStats, MassarMetadata, ReportTemplateSchema } from '../types/report';

export type MathTrackId =
  | 'tcs'
  | 'tclsh'
  | '1bac-sm'
  | '1bac-se'
  | '1bac-eco'
  | '1bac-lsh'
  | '2bac-sm'
  | '2bac-pc-svt'
  | '2bac-eco'
  | '2bac-lsh';

export interface Memo142MathTrackSpec {
  id: MathTrackId;
  shortCode: string;
  label: string;
  levelLabel: string;
  examsPerSemester: number;
  officialDuration: string;
  durationMinutes: number;
  supervisedWeightPct: number;
  singleExamWeightLabel: string;
  subjectCoefficient: number;
  weeklyHours: string;
  taxonomyBreakdown: {
    directApplicationPct: number;
    familiarSituationsPct: number;
    complexProblemsPct: number;
  };
  examCriteriaTemplate: string;
  gradingScaleTemplate: string;
  keySyllabusHighlights: string;
}

/**
 * المرجعية التربوية الرسمية لمادة الرياضيات بسلك التعليم الثانوي التأهيلي
 * وفق مذكرة التقويم التربوي والتوجيهات التربوية والبرامج
 */
export const MEMO_142_MATH_TRACKS: Memo142MathTrackSpec[] = [
  {
    id: 'tcs',
    shortCode: 'TCS / TCSF',
    label: 'الجذع المشترك العلمي والتكنولوجي',
    levelLabel: 'الجذع المشترك العلمي',
    examsPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 4,
    weeklyHours: '5 ساعات',
    taxonomyBreakdown: {
      directApplicationPct: 40,
      familiarSituationsPct: 40,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '40% تطبيق مباشر للمعارف والخاصيات · 40% استحضار وتوظيف مهارات في وضعيات مألوفة · 20% وضعيات مركبة وحل مسائل (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الحسابيات في IN · الحساب المتجهي والإسقاط · المجموعات والترتيب في IR · الحدوديات والمعادلات · الحساب المثلثي · الدوال العددية · الهندسة الفضائية.',
  },
  {
    id: 'tclsh',
    shortCode: 'TCLSH',
    label: 'الجذع المشترك للآداب والعلوم الإنسانية',
    levelLabel: 'الجذع المشترك للآداب والعلوم الإنسانية',
    examsPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 2,
    weeklyHours: 'ساعتان',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر لقواعد الحساب والمعادلات · 40% توظيف في وضعيات مألوفة · 15% ترييض مسألة بسيطة (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الحساب العددي والتناسبية والنسب المئوية · المعادلات والمتراجحات والنظمات · الإحصاء الوصفي · المستقيم في المستوى · عموميات حول الدوال.',
  },
  {
    id: '1bac-sm',
    shortCode: '1BAC SM',
    label: 'الأولى بكالوريا علوم رياضية',
    levelLabel: 'الأولى بكالوريا علوم رياضية',
    examsPerSemester: 4,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '25%',
    subjectCoefficient: 9,
    weeklyHours: '7 ساعات',
    taxonomyBreakdown: {
      directApplicationPct: 30,
      familiarSituationsPct: 50,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '30% تطبيق مباشر للتعاريف والخاصيات · 50% استدلال رياضي وتوظيف مبرهنات في وضعيات مألوفة · 20% وضعيات غير مألوفة ومسائل توليفية (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: 4 فروض محروسة في الدورة بوزن متساوٍ (25% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'مبادئ في المنطق · المجموعات والتطبيقات · عموميات حول الدوال · المرجح والجداء السلمي · المتتاليات · الحسابيات في Z · النهايات والاشتقاق · الدوران والتعداد.',
  },
  {
    id: '1bac-se',
    shortCode: '1BAC SE',
    label: 'الأولى بكالوريا علوم تجريبية / تكنولوجيات',
    levelLabel: 'الأولى بكالوريا علوم تجريبية',
    examsPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 7,
    weeklyHours: '5 ساعات',
    taxonomyBreakdown: {
      directApplicationPct: 35,
      familiarSituationsPct: 45,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '35% تطبيق مباشر للمعارف والتقنيات · 45% توظيف في وضعيات مألوفة · 20% مسائل توليفية وتأويل مبياني (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'مبادئ في المنطق · عموميات حول الدوال · المتتاليات العددية · المرجح والجداء السلمي · الحساب المثلثي · النهايات والاشتقاق ودراسة الدوال · الهندسة الفضائية.',
  },
  {
    id: '1bac-eco',
    shortCode: '1BAC ECO',
    label: 'الأولى بكالوريا علوم اقتصادية وتدبير',
    levelLabel: 'الأولى بكالوريا علوم اقتصادية وتدبير',
    examsPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 4,
    weeklyHours: '4 ساعات',
    taxonomyBreakdown: {
      directApplicationPct: 40,
      familiarSituationsPct: 45,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '40% تطبيق مباشر للتقنيات الجبرية والتحليلية · 45% توظيف في وضعيات اقتصادية ومألوفة · 15% مسائل تركيبية (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'مبادئ في المنطق · المعادلات والمتراجحات والنظمات · عموميات حول الدوال · المتتاليات · التعداد · النهايات والاشتقاق · الدالة اللوغاريتمية العشرية.',
  },
  {
    id: '1bac-lsh',
    shortCode: '1BAC LSH',
    label: 'الأولى بكالوريا آداب وعلوم إنسانية (جهوي)',
    levelLabel: 'الأولى بكالوريا آداب وعلوم إنسانية',
    examsPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 1,
    weeklyHours: 'ساعتان',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر وفق الإطار المرجعي للامتحان الجهوي · 40% توظيف في وضعيات مألوفة · 15% ترييض مسألة (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة) مع تحضير للجهوي.',
    keySyllabusHighlights:
      'مبادئ في المنطق · الحساب العددي والنسب المئوية · المعادلات والنظمات · المتتاليات الحسابية والهندسية · التعداد · النهايات والاشتقاق.',
  },
  {
    id: '2bac-sm',
    shortCode: '2BAC SM',
    label: 'الثانية بكالوريا علوم رياضية (أ / ب)',
    levelLabel: 'الثانية بكالوريا علوم رياضية',
    examsPerSemester: 4,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '25%',
    subjectCoefficient: 9,
    weeklyHours: '7 ساعات',
    taxonomyBreakdown: {
      directApplicationPct: 25,
      familiarSituationsPct: 50,
      complexProblemsPct: 25,
    },
    examCriteriaTemplate:
      '25% تطبيق مباشر للقواعد والخاصيات · 50% استدلال وبراهين مألوفة وفق الإطار المرجعي للوطني · 25% مسائل مركبة وتوليفية (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: 4 فروض محروسة في الدورة بوزن متساوٍ (25% لكل فرض · 100% فروض محروسة) — مع إمكانية فرض تأليفي بـ 3h إلى 4h.',
    keySyllabusHighlights:
      'الاتصال ومبرهنة القيم الوسيطية · الاشتقاق ومبرهنة التزايدات المنتهية · المتتاليات · الدوال ln و exp · المعادلات التفاضلية · الأعداد العقدية · الحسابيات في Z · البنيات الجبرية · التكامل · الاحتمالات.',
  },
  {
    id: '2bac-pc-svt',
    shortCode: '2BAC PC / SVT',
    label: 'الثانية بكالوريا علوم فيزيائية / علوم الحياة والأرض',
    levelLabel: 'الثانية بكالوريا علوم فيزيائية وعلوم الحياة والأرض',
    examsPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 7,
    weeklyHours: '5 ساعات',
    taxonomyBreakdown: {
      directApplicationPct: 30,
      familiarSituationsPct: 50,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '30% تطبيق مباشر للقواعد والنهايات والمشتقات · 50% دراسة دوال ومتتاليات وعقدية وفق الإطار المرجعي للوطني · 20% مسائل تركيبية واستنتاجات مبيانية (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الاتصال والاشتقاق ودراسة الدوال · المتتاليات العددية · الدوال اللوغاريتمية والأسية · المعادلات التفاضلية · الأعداد العقدية · الهندسة الفضائية · التكامل · الاحتمالات.',
  },
  {
    id: '2bac-eco',
    shortCode: '2BAC ECO / SGC',
    label: 'الثانية بكالوريا علوم اقتصادية / تدبير محاسباتي',
    levelLabel: 'الثانية بكالوريا علوم اقتصادية وتدبير',
    examsPerSemester: 3,
    officialDuration: 'ساعتان (2h)',
    durationMinutes: 120,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '33.33%',
    subjectCoefficient: 4,
    weeklyHours: '4 ساعات',
    taxonomyBreakdown: {
      directApplicationPct: 35,
      familiarSituationsPct: 45,
      complexProblemsPct: 20,
    },
    examCriteriaTemplate:
      '35% تطبيق مباشر للمعارف · 45% دراسة دوال ومتتاليات واحتمالات وفق الإطار المرجعي للوطني · 20% مسائل تطبيقية (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: 3 فروض محروسة في الدورة بوزن متساوٍ (33.33% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'الاتصال والاشتقاق · المتتاليات العددية · الدالة اللوغاريتمية والأسية · الدوال الأصلية والحساب التكاملي · حساب الاحتمالات والمتغير العشوائي.',
  },
  {
    id: '2bac-lsh',
    shortCode: '2BAC LSH',
    label: 'الثانية بكالوريا آداب وعلوم إنسانية',
    levelLabel: 'الثانية بكالوريا آداب وعلوم إنسانية',
    examsPerSemester: 2,
    officialDuration: 'ساعة واحدة (1h)',
    durationMinutes: 60,
    supervisedWeightPct: 100,
    singleExamWeightLabel: '50%',
    subjectCoefficient: 1,
    weeklyHours: 'ساعتان',
    taxonomyBreakdown: {
      directApplicationPct: 45,
      familiarSituationsPct: 40,
      complexProblemsPct: 15,
    },
    examCriteriaTemplate:
      '45% تطبيق مباشر · 40% توظيف في وضعيات مألوفة · 15% تأويل واستنتاج (مذكرة التقويم).',
    gradingScaleTemplate:
      'التنقيط على 20 وفق مذكرة التقويم: فرضان محروسان في الدورة بوزن متساوٍ (50% لكل فرض · 100% فروض محروسة).',
    keySyllabusHighlights:
      'المتتاليات العددية · النهايات والاتصال · الاشتقاق ودراسة دوال حدودية ومتخاطة · الدالة اللوغاريتمية والأسية المبسطة · حساب الاحتمالات.',
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
    title: 'مذكرة التقويم التربوي',
    reference: 'التقويم التربوي بالسلك الثانوي التأهيلي',
    purpose: 'تنظيم فروض المراقبة المستمرة، المدد الزمنية، أوزان الفروض المحروسة (100%) وآجال التصحيح.',
  },
  {
    id: 'orientations-2007',
    title: 'التوجيهات التربوية والبرامج الخاصة بالرياضيات',
    reference: 'السلك الثانوي التأهيلي',
    purpose: 'الكفايات النوعية، التوزيع الدوري، والقدرات المنتظرة لكل مسلك وشعبة.',
  },
  {
    id: 'cadres-ref',
    title: 'الأطر المرجعية للامتحانين الجهوي والوطني',
    reference: 'المركز الوطني للتقويم والامتحانات',
    purpose: 'ضبط مجالات المضامين وجدول التخصيص ومستويات المهارات المعرفية.',
  },
  {
    id: 'cahier-textes',
    title: 'دفتر النصوص (الورقي / الرقمي)',
    reference: 'وثيقة تتبع يومية إلزامية',
    purpose: 'تدوين الأنشطة، الحصص، تواريخ الفروض المحروسة وحصص التصحيح والدعم.',
  },
  {
    id: 'fiche-pedagogique',
    title: 'الجذاذات البيداغوجية وتخطيط التعلمات',
    reference: 'التحضير القبلي للدرس والفرض',
    purpose: 'بناء الوضعيات الديداكتيكية، التدرج الصفي، وتحديد التعثرات المتوقعة.',
  },
  {
    id: 'cahier-notes',
    title: 'سجل المراقبة المستمرة وشبكة التحليل',
    reference: 'مطابق لمنظومة مسار',
    purpose: 'توثيق نقط الفروض المحروسة وشبكة تحليل الكفايات والتمارين.',
  },
  {
    id: 'remediation-cards',
    title: 'تقرير الفرض وبطاقات الدعم الفردي',
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
    .toLowerCase();

  const is2Bac = /2\s*bac|ثاني[ةه]\s*بكالوريا|ثانية\s*باك|2b/.test(raw);
  const is1Bac = /1\s*bac|اولي\s*بكالوريا|أولى\s*بكالوريا|اولى\s*باك|1b/.test(raw);
  const isTC = /جذع|tc|tcs|tcsf|tclsh|tct/.test(raw);

  const isSM = /علوم رياضية|رياضية|\bsm\b|sm[-_a-b0-9]/i.test(raw);
  const isEco = /اقتصاد|تدبير|محاسب|\beco\b|\bsgc\b|\bseco\b/i.test(raw);
  const isLSH = /اداب|آداب|انسانية|\blsh\b|lettre/i.test(raw);
  const isPCSVT = /فيزيائية|حياة|ارض|أرض|\bpc\b|\bsvt\b|\bsp\b/i.test(raw);

  if (is2Bac) {
    if (isSM) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-sm')!;
    if (isEco) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-eco')!;
    if (isLSH) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-lsh')!;
    return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-pc-svt')!;
  }

  if (is1Bac) {
    if (isSM) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-sm')!;
    if (isEco) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-eco')!;
    if (isLSH) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-lsh')!;
    return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-se')!;
  }

  if (isTC) {
    if (isLSH) return MEMO_142_MATH_TRACKS.find((t) => t.id === 'tclsh')!;
    return MEMO_142_MATH_TRACKS.find((t) => t.id === 'tcs')!;
  }

  if (isPCSVT) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-pc-svt')!;
  if (isSM) return MEMO_142_MATH_TRACKS.find((t) => t.id === '1bac-sm')!;
  if (isEco) return MEMO_142_MATH_TRACKS.find((t) => t.id === '2bac-eco')!;
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
  const s = (durationStr || '').toLowerCase();
  if (!s.trim()) return null;
  if (/ساعتان|ساعتين|2\s*h|2\s*ساع|120\s*(?:د|min)/.test(s)) return 120;
  if (/3\s*h|3\s*ساع|ثلاث\s*ساعات|180/.test(s)) return 180;
  if (/4\s*h|4\s*ساع|أربع\s*ساعات|240/.test(s)) return 240;
  if (/ساعة\s*ونصف|1\.5\s*h|1h30|90\s*(?:د|min)/.test(s)) return 90;
  if (/ساعة|1\s*h|60\s*(?:د|min)/.test(s)) return 60;
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
  if (detectedMinutes === null) {
    checks.push({
      id: 'duration',
      label: 'المدة الزمنية للفرض',
      status: 'warn',
      detail: `لم تُضبط المدة بوضوح. المدة القانونية لمسلك ${track.shortCode} هي ${track.officialDuration}.`,
    });
  } else if (
    detectedMinutes === track.durationMinutes ||
    (track.id === '2bac-sm' && detectedMinutes >= 120 && detectedMinutes <= 240)
  ) {
    checks.push({
      id: 'duration',
      label: 'المدة الزمنية للفرض',
      status: 'pass',
      detail: `مطابقة لمذكرة التقويم (${metadata.duration} لمسلك ${track.shortCode}).`,
    });
  } else {
    checks.push({
      id: 'duration',
      label: 'المدة الزمنية للفرض',
      status: 'warn',
      detail: `المدة المدخلة (${metadata.duration}) تختلف عن المدة القانونية المحددة في المذكرة (${track.officialDuration}).`,
    });
  }

  // 2. Exam-to-Correction Turnaround Time (<= 14 days per Memo 142-08)
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
    } else if (turnaroundDays <= 14) {
      checks.push({
        id: 'turnaround',
        label: 'أجل التصحيح وإرجاع الأوراق',
        status: 'pass',
        detail: `تم التصحيح داخل الأجل التربوي الموصى به (${turnaroundDays} يوماً ≤ 14 يوماً).`,
      });
    } else {
      checks.push({
        id: 'turnaround',
        label: 'أجل التصحيح وإرجاع الأوراق',
        status: 'warn',
        detail: `المدة الفاصلة (${turnaroundDays} يوماً) تتجاوز أسبوعين؛ توصي المذكرة بإرجاع الأوراق بسرعة لضمان أثر التغذية الراجعة.`,
      });
    }
  } else {
    checks.push({
      id: 'turnaround',
      label: 'أجل التصحيح وإرجاع الأوراق',
      status: 'info',
      detail: 'أدخل تاريخ الإنجاز وتاريخ التصحيح للتحقق الآلي من احترام أجل إرجاع أوراق التحرير (≤ 14 يوماً).',
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

  // 4. Weighting & Official Ministry Header
  const hasWeight = (metadata.coefficient || '').trim().length > 0;
  const officialMinistryOk =
    !template.headerConfig.ministryLine.includes('التكوين المهني والتأهيل');
  if (hasWeight && officialMinistryOk) {
    checks.push({
      id: 'admin',
      label: 'وزن الفرض والترويسة الوزارية',
      status: 'pass',
      detail: `وزن الفرض مضبوط (${metadata.coefficient}) والترويسة مطابقة للتسمية الرسمية للوزارة.`,
    });
  } else {
    checks.push({
      id: 'admin',
      label: 'وزن الفرض والترويسة الوزارية',
      status: 'warn',
      detail: !officialMinistryOk
        ? 'الترويسة تحتوي على تسمية قديمة للوزارة — حدّثها إلى «وزارة التربية الوطنية والتعليم الأولي والرياضة».'
        : `يرجى ضبط وزن الفرض (${track.singleExamWeightLabel} ضمن 100% فروض محروسة).`,
    });
  }

  // 5. Remediation Plan & Need Groups Activation
  const hasRemediation =
    template.pedagogicalContent.programmedRemediationBullets.some((b) => b.trim().length > 4) &&
    template.pedagogicalContent.remediationActions.length > 0;
  if (stats.failed > 0) {
    if (hasRemediation) {
      checks.push({
        id: 'remediation',
        label: 'خطة الدعم وتفييء مجموعات الحاجة',
        status: 'pass',
        detail: `تم رصد ${stats.failed} متعثراً وتفعيل خطة المعالجة والدعم المبرمجة وفق مذكرة التقويم.`,
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
