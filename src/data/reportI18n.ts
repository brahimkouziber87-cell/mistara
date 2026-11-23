import { ReportLanguage } from '../types/report';

export interface LocalizedReportLabels {
  lang: ReportLanguage;
  dir: 'rtl' | 'ltr';
  countryLine: string;
  ministryLine: string;
  defaultReportTitle: string;
  defaultReportSubtitle: string;
  defaultAppendixTitle: string;
  schoolLabel: string;
  subjectPrefix: string;
  levelLabel: string;
  schoolYearLabel: string;
  classLabel: string;
  teacherLabel: string;
  memoRefLabel: string;
  // Metadata 8 cells
  metaClassLevel: string;
  metaTeacher: string;
  metaExamDate: string;
  metaCorrectionDate: string;
  metaDuration: string;
  metaCoefficient: string;
  metaClassStructure: string;
  metaPassAvg: string;
  studentShort: string;
  presentShort: string;
  absentShort: string;
  // Exam content box
  examContentSectionTitle: string;
  targetedCompetenciesLabel: string;
  examCriteriaLabel: string;
  gradingScaleLabel: string;
  defaultExamTopic: string;
  // KPI Summary
  kpiSectionTitle: string;
  kpiEnrolled: string;
  kpiPresent: string;
  kpiAbsent: string;
  kpiMaxScore: string;
  kpiMinScore: string;
  kpiAverage: string;
  kpiMedian: string;
  kpiStdDev: string;
  kpiMastered: string;
  kpiBelowPass: string;
  // Brackets & Charts
  bracketsSectionTitle: string;
  chartSectionTitle: string;
  bracketColRange: string;
  bracketColAppreciation: string;
  bracketColCount: string;
  bracketColPct: string;
  // Top and Struggling
  topStrugglingTitle: string;
  topStudentsTitle: string;
  strugglingStudentsTitle: string;
  noTopStudents: string;
  noStrugglingStudents: string;
  // Pedagogical diagnosis
  diagnosisSectionTitle: string;
  generalObsLabel: string;
  strengthsTitle: string;
  weaknessesTitle: string;
  remediationBulletsTitle: string;
  remediationNotesLabel: string;
  remediationFormatLabel: string;
  // Remediation table
  remediationPlanTitle: string;
  targetGroupCol: string;
  competenciesCol: string;
  activityCol: string;
  timeframeCol: string;
  // Page 2 Dual Roster
  appendixPrefix: string;
  seqRosterTitle: string;
  meritRosterTitle: string;
  colOrder: string;
  colStudentName: string;
  colScore20: string;
  colRank: string;
  colScoreShort: string;
  colAppreciation: string;
  absentLabel: string;
  thresholdCutLine: (threshold: number) => string;
  // Need groups
  needGroupExcellence: string;
  needGroupExcellenceSub: string;
  needGroupConsolidation: string;
  needGroupConsolidationSub: string;
  needGroupRemediation: string;
  needGroupRemediationSub: string;
  attendancePerfect: string;
  attendanceAbsentPrefix: string;
  // Signatures
  sigTeacherLabel: string;
  sigTeacherSub: string;
  sigTeacherPage2Sub: string;
  sigInspectorLabel: string;
  sigInspectorSub: string;
  sigInspectorPage2Sub: string;
  sigInspectorFooter: string;
  sigPrincipalLabel: string;
  sigPrincipalSub: string;
  sigPrincipalPage2Sub: string;
  dateLabel: string;
  // Footer
  footerBrand: string;
  footerCompliance: string;
  footerReportPrefix: string;
  footerAppendixPrefix: string;
  pageOfTotal: (page: number, total: number) => string;
  // Remediation Cards
  cardsHeaderTitle: string;
  cardBadgePrefix: string;
  cardTitle: string;
  cardStudentMeta: string;
  cardMassarCode: string;
  cardClassRank: string;
  cardObtainedScore: string;
  cardClassAvg: string;
  cardPassThreshold: string;
  cardSupportDate: string;
  cardDiagTitle: string;
  cardTargetCompetency: string;
  cardWeakItemsLabel: string;
  cardActionPlanTitle: string;
  cardActivityPrefix: string;
  cardPostSupportTitle: string;
  cardPostMastered: string;
  cardPostInProgress: string;
  cardPostNeedsFollowup: string;
  cardSigTeacher: string;
  cardSigStudent: string;
  cardSigParent: string;
  cardCutGuide: string;
  cardBoardCounter: (idx: number, total: number) => string;
  cardsEmptyTitle: string;
  cardsEmptyDesc: string;
  // Item Matrix & Longitudinal & Inspection
  itemMatrixTitle: string;
  itemMatrixSub: string;
  itemColExercise: string;
  itemColCompetency: string;
  itemColMaxScore: string;
  itemColAvgScore: string;
  itemColMasteryRate: string;
  itemColStatus: string;
  itemStatusMastered: string;
  itemStatusPartial: string;
  itemStatusCritical: string;
  inspectionCoverTitle: string;
  inspectionCoverSubtitle: string;
  inspectionTocTitle: string;
  inspectionChecklistTitle: string;
  longitudinalSheetTitle: string;
  postImpactTitle: string;
  postImpactSub: string;
  postImpactEvaluated: string;
  postImpactPreAvg: string;
  postImpactPostAvg: string;
  postImpactAvgGain: string;
  postImpactRecoveryRate: string;
  postImpactGapClosure: string;
  postImpactColPre: string;
  postImpactColPost: string;
  postImpactColDelta: string;
  postImpactColStatus: string;
  postImpactPending: string;
}

const AR_LABELS: LocalizedReportLabels = {
  lang: 'ar',
  dir: 'rtl',
  countryLine: 'المملكة المغربية',
  ministryLine: 'وزارة التربية الوطنية والتعليم الأولي والتكوين المهني والتأهيل',
  defaultReportTitle: 'بطاقة تقرير وتتبع الفرض المحروس',
  defaultReportSubtitle: 'وثيقة بيداغوجية رسمية - مطابقة لمقتضيات مذكرة التقويم والتوجيهات التربوية الرسمية',
  defaultAppendixTitle: 'كشف النقط الرسمي والترتيب الاستحقاقي وتفييء مجموعات الحاجة',
  schoolLabel: 'المؤسسة',
  subjectPrefix: 'مادة',
  levelLabel: 'المستوى',
  schoolYearLabel: 'الموسم الدراسي',
  classLabel: 'القسم',
  teacherLabel: 'الأستاذ(ة)',
  memoRefLabel: 'المرجع: مذكرة التقويم',
  metaClassLevel: 'القسم والمستوى:',
  metaTeacher: 'الأستاذ(ة):',
  metaExamDate: 'تاريخ التمرير:',
  metaCorrectionDate: 'تاريخ التصحيح:',
  metaDuration: 'مدة الإنجاز:',
  metaCoefficient: 'معامل الفرض:',
  metaClassStructure: 'البنية العددية للقسم:',
  metaPassAvg: 'نسبة التحكم والمعدل:',
  studentShort: 'ت',
  presentShort: 'ح',
  absentShort: 'غ',
  examContentSectionTitle: '1. محتوى الفرض والأهداف والكفايات المقومة (مذكرة التقويم)',
  targetedCompetenciesLabel: 'المضامين والكفايات المستهدفة:',
  examCriteriaLabel: 'معايير البناء (مذكرة التقويم):',
  gradingScaleLabel: 'سلم التنقيط وتوزيع التمارين:',
  defaultExamTopic: 'موضوع الفرض المحروس والمحاور المقومة وفق التوجيهات التربوية',
  kpiSectionTitle: '2. النتائج والمؤشرات الإحصائية العامة وتوزيع النقط (مذكرة التقويم)',
  kpiEnrolled: 'المسجلون',
  kpiPresent: 'الحاضرون',
  kpiAbsent: 'الغائبون',
  kpiMaxScore: 'أعلى نقطة',
  kpiMinScore: 'أدنى نقطة',
  kpiAverage: 'معدل القسم',
  kpiMedian: 'القيمة الوسطية',
  kpiStdDev: 'الانحراف (σ)',
  kpiMastered: 'المتحكمون',
  kpiBelowPass: 'دون المعدل',
  bracketsSectionTitle: 'توزيع النقط حسب فئات التحكم (مذكرة التقويم)',
  chartSectionTitle: 'التمثيل المبياني للنسب المئوية (مذكرة التقويم)',
  bracketColRange: 'فئة النقط',
  bracketColAppreciation: 'التقدير التربوي',
  bracketColCount: 'عدد التلاميذ',
  bracketColPct: 'النسبة المئوية',
  topStrugglingTitle: 'تفييء المتعلمين (المتفوقون والمحتاجون للدعم)',
  topStudentsTitle: 'المتفوقون',
  strugglingStudentsTitle: 'المحتاجون للدعم',
  noTopStudents: 'لا يوجد تلاميذ ضمن هذه العتبة.',
  noStrugglingStudents: 'لا يوجد تلاميذ دون المعدل.',
  diagnosisSectionTitle: '3. تشخيص المكتسبات والتعثرات وخطة المعالجة والدعم البيداغوجي المبرمجة',
  generalObsLabel: 'قراءة تركيبية وتأويلية للنتائج:',
  strengthsTitle: 'المكتسبات ومواطن القوة المرصودة:',
  weaknessesTitle: 'التعثرات والصعوبات المشخصة أثناء التصحيح:',
  remediationBulletsTitle: 'خطة المعالجة وقرارات الدعم المبرمجة:',
  remediationNotesLabel: 'توصيات التتبع والمعالجة الفردية:',
  remediationFormatLabel: 'صيغة الدعم:',
  remediationPlanTitle: 'خطة الدعم والمعالجة التربوية',
  targetGroupCol: 'الفئة المستهدفة',
  competenciesCol: 'الكفايات المستهدفة',
  activityCol: 'الأنشطة والإجراءات',
  timeframeCol: 'الجدولة',
  appendixPrefix: 'ملحق تقرير',
  seqRosterTitle: 'كشف نقط القسم حسب الترتيب التسلسلي',
  meritRosterTitle: 'الترتيب الاستحقاقي وتفييء مجموعات الحاجة (من أعلى نقطة إلى أدنى نقطة)',
  colOrder: 'ر.ت',
  colStudentName: 'اسم التلميذ(ة)',
  colScore20: 'النقطة / 20',
  colRank: 'الرتبة',
  colScoreShort: 'النقطة',
  colAppreciation: 'التقدير',
  absentLabel: 'غائب',
  thresholdCutLine: (t) =>
    `─── خط عتبة التحكم التربوي (${t.toFixed(2)}/20) · بداية فئة الدعم الاستدراكي ───`,
  needGroupExcellence: 'مجموعة التميز والإغناء',
  needGroupExcellenceSub: 'وضعيات مركبة وتنشيط التعلم بالقرين',
  needGroupConsolidation: 'مجموعة التثبيت والتجويد',
  needGroupConsolidationSub: 'تجويد منهجية التحرير والبرهنة والتعليل',
  needGroupRemediation: 'مجموعة الدعم الاستدراكي',
  needGroupRemediationSub: 'أولوية المعالجة الفورية للتعثرات الأساس',
  attendancePerfect: 'لا يوجد تلاميذ غائبون عن هذا الفرض المحروس (نسبة الحضور بالقسم 100%).',
  attendanceAbsentPrefix: 'عدد التلاميذ الغائبين:',
  sigTeacherLabel: 'توقيع أستاذ(ة) المادة:',
  sigTeacherSub: 'المنجز(ة) للتقويم وخطة المعالجة',
  sigTeacherPage2Sub: 'يشهد بصحة النقط ومطابقتها لأوراق التحرير المسلمة',
  sigInspectorLabel: 'تأشيرة وملاحظات المفتش(ة) التربوي(ة):',
  sigInspectorSub: 'التأطير والمراقبة التربوية',
  sigInspectorPage2Sub: 'ملاحظات حول سلم التنقيط وتوزيع النقط وأثر الدعم',
  sigInspectorFooter: 'التأشيرة والخاتم: .......................',
  sigPrincipalLabel: 'تأشيرة السيد(ة) رئيس(ة) المؤسسة:',
  sigPrincipalSub: 'الإدارة التربوية / الحراسة العامة',
  sigPrincipalPage2Sub: 'اطلع عليه وأدرج بسجل المراقبة المستمرة للمؤسسة',
  dateLabel: 'بتاريخ:',
  footerBrand: 'منظومة التدبير التربوي - ذ إبراهيم قزيبر -',
  footerCompliance: 'وثيقة مطابقة لمذكرة التقويم',
  footerReportPrefix: 'تقرير',
  footerAppendixPrefix: 'كشف نقط',
  pageOfTotal: (p, total) => `الصفحة ${p} من ${total}`,
  cardsHeaderTitle: 'بطاقات فردية للتقويم والدعم التربوي (Fiches Individuelles de Remédiation)',
  cardBadgePrefix: 'بطاقة #',
  cardTitle: 'بطاقة فردية للتقويم والدعم التربوي',
  cardStudentMeta: 'المتعلم(ة)',
  cardMassarCode: 'رمز مسار:',
  cardClassRank: 'الرتبة بالقسم:',
  cardObtainedScore: 'النقطة المحصل عليها',
  cardClassAvg: 'معدل القسم:',
  cardPassThreshold: 'عتبة التحكم:',
  cardSupportDate: 'تاريخ الدعم:',
  cardDiagTitle: '1. تشخيص المكتسبات والتعثرات المرصودة:',
  cardTargetCompetency: 'الكفاية المستهدفة:',
  cardWeakItemsLabel: 'التمارين المتعثرة:',
  cardActionPlanTitle: '2. برنامج العمل والأنشطة العلاجية الموجهة للمتعلم(ة):',
  cardActivityPrefix: '• النشاط الموجه:',
  cardPostSupportTitle: 'تتبع أثر الدعم البعدي:',
  cardPostMastered: 'متحكم بعد الدعم',
  cardPostInProgress: 'في طور التحكم',
  cardPostNeedsFollowup: 'يحتاج مواكبة إضافية',
  cardSigTeacher: 'توقيع الأستاذ(ة)',
  cardSigStudent: 'التزام وتوقيع المتعلم(ة)',
  cardSigParent: 'اطلاع وتوقيع ولي الأمر',
  cardCutGuide: 'خط القص (بطاقة فردية)',
  cardBoardCounter: (idx, total) => `لوحة ${idx} / ${total}`,
  cardsEmptyTitle: 'لا توجد بطاقات فردية مطابقة للفلتر المحدد حالياً',
  cardsEmptyDesc: 'جميع التلاميذ حاصلون على المعدل أو لم يتم تحديد تلاميذ للطباعة.',
  itemMatrixTitle: 'شبكة تحليل النتائج حسب التمارين والكفايات المقومة',
  itemMatrixSub: 'توزيع نسب التحكم ومعدلات الإنجاز حسب عناصر موضوع الفرض المحروس',
  itemColExercise: 'التمرين / السؤال',
  itemColCompetency: 'الكفاية والهدف التربوي المستهدف',
  itemColMaxScore: 'السلم',
  itemColAvgScore: 'متوسط القسم',
  itemColMasteryRate: 'نسبة التحكم',
  itemColStatus: 'التقييم التربوي',
  itemStatusMastered: 'تحكم جيد (≥ 70%)',
  itemStatusPartial: 'تحكم نسبي (50–69%)',
  itemStatusCritical: 'تعثر يستدعي الدعم (< 50%)',
  inspectionCoverTitle: 'ملف التسليم التربوي الموحّد للتفتيش والمراقبة',
  inspectionCoverSubtitle: 'ملف إداري وبيداغوجي شامل يتضمن تقارير التقويم، تحليل الكفايات، التتبع التطوري، وبطاقات الدعم',
  inspectionTocTitle: 'فهرس ومحتويات الملف التربوي (Index du Dossier)',
  inspectionChecklistTitle: 'تأشيرة المطابقة التربوية والإدارية',
  longitudinalSheetTitle: 'تتبع الأداء التطوري للمتعلمين وأثر حصص الدعم والمعالجة (F1 ← F4)',
  postImpactTitle: 'حصيلة تقويم أثر الدعم البيداغوجي (Pre / Post Remediation)',
  postImpactSub: 'قياس نسبة تدارك التعثرات وتقليص الفوارق بعد تفعيل البطاقات الفردية وحصص الدعم',
  postImpactEvaluated: 'المستفيدون المقوَّمون',
  postImpactPreAvg: 'المعدل قبل الدعم',
  postImpactPostAvg: 'المعدل بعد الدعم',
  postImpactAvgGain: 'متوسط التحسن (Δ)',
  postImpactRecoveryRate: 'نسبة التدارك الفعلي',
  postImpactGapClosure: 'نسبة تقليص التعثر',
  postImpactColPre: 'قبل الدعم (/20)',
  postImpactColPost: 'بعد الدعم (/20)',
  postImpactColDelta: 'الفارق (Δ)',
  postImpactColStatus: 'الوضعية البعدية',
  postImpactPending: 'قيد المتابعة',
};

const FR_LABELS: LocalizedReportLabels = {
  lang: 'fr',
  dir: 'ltr',
  countryLine: 'Royaume du Maroc',
  ministryLine:
    "Ministère de l'Éducation Nationale, du Préscolaire, de la Formation Professionnelle et de la Qualification",
  defaultReportTitle: 'Rapport d’Évaluation et de Suivi du Devoir Surveillé',
  defaultReportSubtitle:
    'Document pédagogique officiel (Sections Internationales BIOF / APIC) — Conforme aux orientations ministérielles',
  defaultAppendixTitle:
    'Relevé de Notes Officiel, Classement par Mérite et Groupes de Besoin',
  schoolLabel: 'Établissement',
  subjectPrefix: 'Discipline :',
  levelLabel: 'Niveau',
  schoolYearLabel: 'Année scolaire',
  classLabel: 'Classe',
  teacherLabel: 'Enseignant(e)',
  memoRefLabel: 'Réf. : Note Ministérielle d’Évaluation',
  metaClassLevel: 'Classe & Niveau :',
  metaTeacher: 'Enseignant(e) :',
  metaExamDate: 'Date de passation :',
  metaCorrectionDate: 'Date de correction :',
  metaDuration: 'Durée :',
  metaCoefficient: 'Coefficient :',
  metaClassStructure: 'Effectif de la classe :',
  metaPassAvg: 'Taux de réussite & Moy. :',
  studentShort: 'él.',
  presentShort: 'P',
  absentShort: 'Abs',
  examContentSectionTitle: '1. Contenus, Objectifs et Compétences Évaluées',
  targetedCompetenciesLabel: 'Contenus et compétences visées :',
  examCriteriaLabel: 'Critères d’élaboration du sujet :',
  gradingScaleLabel: 'Barème et répartition des exercices :',
  defaultExamTopic:
    'Sujet du devoir surveillé conforme au cadre référentiel de la discipline',
  kpiSectionTitle: '2. Résultats Statistiques et Indicateurs Docimologiques',
  kpiEnrolled: 'Inscrits',
  kpiPresent: 'Présents',
  kpiAbsent: 'Absents',
  kpiMaxScore: 'Note Max',
  kpiMinScore: 'Note Min',
  kpiAverage: 'Moyenne',
  kpiMedian: 'Médiane',
  kpiStdDev: 'Écart-type (σ)',
  kpiMastered: 'Admis',
  kpiBelowPass: 'En difficulté',
  bracketsSectionTitle: 'Répartition par tranches de notes',
  chartSectionTitle: 'Représentation graphique des pourcentages de maîtrise',
  bracketColRange: 'Tranche',
  bracketColAppreciation: 'Appréciation pédagogique',
  bracketColCount: 'Effectif',
  bracketColPct: 'Pourcentage',
  topStrugglingTitle: 'Catégorisation des élèves (Excellence & Remédiation)',
  topStudentsTitle: 'Pôle d’excellence',
  strugglingStudentsTitle: 'Besoin de remédiation',
  noTopStudents: 'Aucun élève dans ce seuil.',
  noStrugglingStudents: 'Aucun élève en dessous du seuil de maîtrise.',
  diagnosisSectionTitle: '3. Diagnostic Pédagogique et Plan de Remédiation',
  generalObsLabel: 'Analyse docimologique synthétique :',
  strengthsTitle: 'Acquis et points forts observés :',
  weaknessesTitle: 'Lacunes et difficultés diagnostiquées :',
  remediationBulletsTitle: 'Décisions et actions de remédiation programmées :',
  remediationNotesLabel: 'Recommandations de suivi individuel :',
  remediationFormatLabel: 'Modalité de soutien :',
  remediationPlanTitle: 'Planification des Groupes de Besoin',
  targetGroupCol: 'Groupe cible',
  competenciesCol: 'Compétences ciblées',
  activityCol: 'Activités de soutien',
  timeframeCol: 'Échéancier',
  appendixPrefix: 'Annexe —',
  seqRosterTitle: 'Relevé séquentiel des notes de la classe',
  meritRosterTitle: 'Classement par ordre de mérite et groupes de besoin',
  colOrder: 'N°',
  colStudentName: 'Nom et Prénom',
  colScore20: 'Note / 20',
  colRank: 'Rang',
  colScoreShort: 'Note',
  colAppreciation: 'Appréciation',
  absentLabel: 'Absent(e)',
  thresholdCutLine: (t) =>
    `─── Seuil de maîtrise (${t.toFixed(2)}/20) · Début du groupe de remédiation ───`,
  needGroupExcellence: 'Groupe d’Excellence',
  needGroupExcellenceSub: 'Situations complexes & tutorat par les pairs',
  needGroupConsolidation: 'Groupe de Consolidation',
  needGroupConsolidationSub: 'Perfectionnement méthodologique & rédaction',
  needGroupRemediation: 'Groupe de Remédiation',
  needGroupRemediationSub: 'Intervention prioritaire sur les prérequis',
  attendancePerfect: 'Aucune absence enregistrée (Taux de présence : 100%).',
  attendanceAbsentPrefix: 'Élèves absents :',
  sigTeacherLabel: 'Signature de l’enseignant(e) :',
  sigTeacherSub: 'Auteur(e) de l’évaluation et du suivi',
  sigTeacherPage2Sub: 'Certifie l’exactitude des notes reportées',
  sigInspectorLabel: 'Visa de M./Mme l’Inspecteur(trice) :',
  sigInspectorSub: 'Encadrement et contrôle pédagogique',
  sigInspectorPage2Sub: 'Observations sur le barème et l’impact du soutien',
  sigInspectorFooter: 'Visa & Cachet : .......................',
  sigPrincipalLabel: 'Visa de M./Mme le Chef d’Établissement :',
  sigPrincipalSub: 'Administration pédagogique',
  sigPrincipalPage2Sub: 'Vu et consigné au registre de contrôle continu',
  dateLabel: 'Le :',
  footerBrand: 'Système de Gestion Pédagogique',
  footerCompliance: 'Document conforme aux orientations d’évaluation',
  footerReportPrefix: 'Rapport',
  footerAppendixPrefix: 'Relevé',
  pageOfTotal: (p, total) => `Page ${p} / ${total}`,
  cardsHeaderTitle: 'Fiches Individuelles de Remédiation et de Soutien Pédagogique',
  cardBadgePrefix: 'Fiche #',
  cardTitle: 'Fiche Individuelle de Remédiation',
  cardStudentMeta: 'Apprenant(e)',
  cardMassarCode: 'Code Massar :',
  cardClassRank: 'Rang :',
  cardObtainedScore: 'Note obtenue',
  cardClassAvg: 'Moy. classe :',
  cardPassThreshold: 'Seuil :',
  cardSupportDate: 'Séance :',
  cardDiagTitle: '1. Diagnostic des acquis et difficultés ciblées :',
  cardTargetCompetency: 'Compétence prioritaire :',
  cardWeakItemsLabel: 'Exercices à retravailler :',
  cardActionPlanTitle: '2. Programme d’activités de remédiation :',
  cardActivityPrefix: '• Travail demandé :',
  cardPostSupportTitle: 'Suivi post-remédiation :',
  cardPostMastered: 'Maîtrisé',
  cardPostInProgress: 'En cours',
  cardPostNeedsFollowup: 'Suivi renforcé',
  cardSigTeacher: 'Enseignant(e)',
  cardSigStudent: 'Engagement de l’élève',
  cardSigParent: 'Visa du tuteur / parent',
  cardCutGuide: 'Ligne de découpe',
  cardBoardCounter: (idx, total) => `Planche ${idx} / ${total}`,
  cardsEmptyTitle: 'Aucune fiche individuelle ne correspond au filtre actif',
  cardsEmptyDesc: 'Modifiez les critères de sélection pour afficher les fiches élèves.',
  itemMatrixTitle: 'Matrice d’Analyse par Exercices et Compétences',
  itemMatrixSub: 'Taux de réussite détaillés par item du devoir surveillé',
  itemColExercise: 'Exercice / Item',
  itemColCompetency: 'Compétence et objectif évalué',
  itemColMaxScore: 'Barème',
  itemColAvgScore: 'Moyenne',
  itemColMasteryRate: 'Taux de maîtrise',
  itemColStatus: 'Statut pédagogique',
  itemStatusMastered: 'Maîtrisée (≥ 70%)',
  itemStatusPartial: 'Partielle (50–69%)',
  itemStatusCritical: 'Critique (< 50%)',
  inspectionCoverTitle: 'Dossier Pédagogique Unifié d’Inspection',
  inspectionCoverSubtitle:
    'Dossier complet de contrôle continu : rapport statistique, analyse par compétences, suivi longitudinal et fiches de remédiation',
  inspectionTocTitle: 'Sommaire du Dossier Pédagogique',
  inspectionChecklistTitle: 'Validation Administrative et Pédagogique',
  longitudinalSheetTitle: 'Suivi Longitudinal des Performances et Impact de la Remédiation (F1 → F4)',
  postImpactTitle: 'Évaluation de l’Impact de la Remédiation (Pré / Post-Soutien)',
  postImpactSub: 'Mesure quantitative de la réduction des écarts après les séances de soutien ciblé',
  postImpactEvaluated: 'Élèves réévalués',
  postImpactPreAvg: 'Moyenne pré-soutien',
  postImpactPostAvg: 'Moyenne post-soutien',
  postImpactAvgGain: 'Progression moy. (Δ)',
  postImpactRecoveryRate: 'Taux de rattrapage',
  postImpactGapClosure: 'Réduction du déficit',
  postImpactColPre: 'Pré-soutien (/20)',
  postImpactColPost: 'Post-soutien (/20)',
  postImpactColDelta: 'Écart (Δ)',
  postImpactColStatus: 'Statut post-soutien',
  postImpactPending: 'En attente',
};

const EN_LABELS: LocalizedReportLabels = {
  lang: 'en',
  dir: 'ltr',
  countryLine: 'Kingdom of Morocco',
  ministryLine:
    'Ministry of National Education, Preschool, Vocational Training and Qualification',
  defaultReportTitle: 'Supervised Exam Assessment & Follow-Up Report',
  defaultReportSubtitle:
    'Official Pedagogical Document (International Section) — Aligned with Assessment Guidelines',
  defaultAppendixTitle: 'Official Grade Roster, Merit Ranking & Need Groups',
  schoolLabel: 'School',
  subjectPrefix: 'Subject:',
  levelLabel: 'Level',
  schoolYearLabel: 'Academic Year',
  classLabel: 'Class',
  teacherLabel: 'Teacher',
  memoRefLabel: 'Ref.: Ministerial Assessment Framework',
  metaClassLevel: 'Class & Level:',
  metaTeacher: 'Teacher:',
  metaExamDate: 'Exam Date:',
  metaCorrectionDate: 'Grading Date:',
  metaDuration: 'Duration:',
  metaCoefficient: 'Weight:',
  metaClassStructure: 'Class Roster:',
  metaPassAvg: 'Pass Rate & Avg:',
  studentShort: 'st.',
  presentShort: 'P',
  absentShort: 'Abs',
  examContentSectionTitle: '1. Assessed Syllabus, Learning Objectives & Competencies',
  targetedCompetenciesLabel: 'Assessed topics & competencies:',
  examCriteriaLabel: 'Assessment construction criteria:',
  gradingScaleLabel: 'Marking scheme & breakdown:',
  defaultExamTopic: 'Supervised exam topics aligned with official syllabus framework',
  kpiSectionTitle: '2. Statistical Results & Docimological Indicators',
  kpiEnrolled: 'Enrolled',
  kpiPresent: 'Present',
  kpiAbsent: 'Absent',
  kpiMaxScore: 'Highest',
  kpiMinScore: 'Lowest',
  kpiAverage: 'Class Avg',
  kpiMedian: 'Median',
  kpiStdDev: 'Std Dev (σ)',
  kpiMastered: 'Mastered',
  kpiBelowPass: 'Below Pass',
  bracketsSectionTitle: 'Score Distribution by Mastery Brackets',
  chartSectionTitle: 'Graphical Distribution of Student Performance',
  bracketColRange: 'Score Range',
  bracketColAppreciation: 'Pedagogical Appreciation',
  bracketColCount: 'Count',
  bracketColPct: 'Share',
  topStrugglingTitle: 'Student Tiering (Excellence & Targeted Support)',
  topStudentsTitle: 'High Achievers',
  strugglingStudentsTitle: 'Targeted Support Needed',
  noTopStudents: 'No students in this tier.',
  noStrugglingStudents: 'No students below passing threshold.',
  diagnosisSectionTitle: '3. Pedagogical Diagnosis & Remediation Action Plan',
  generalObsLabel: 'Synthesis & Docimological Interpretation:',
  strengthsTitle: 'Observed Strengths & Mastered Skills:',
  weaknessesTitle: 'Diagnosed Learning Gaps & Weaknesses:',
  remediationBulletsTitle: 'Programmed Remediation Decisions:',
  remediationNotesLabel: 'Individual Follow-Up Recommendations:',
  remediationFormatLabel: 'Support Format:',
  remediationPlanTitle: 'Differentiated Remediation Plan',
  targetGroupCol: 'Target Tier',
  competenciesCol: 'Target Competencies',
  activityCol: 'Remediation Activities',
  timeframeCol: 'Timeline',
  appendixPrefix: 'Appendix —',
  seqRosterTitle: 'Sequential Class Grade Roster',
  meritRosterTitle: 'Merit Ranking & Differentiated Need Groups',
  colOrder: '#',
  colStudentName: 'Student Full Name',
  colScore20: 'Score / 20',
  colRank: 'Rank',
  colScoreShort: 'Score',
  colAppreciation: 'Appreciation',
  absentLabel: 'Absent',
  thresholdCutLine: (t) =>
    `─── Mastery Threshold (${t.toFixed(2)}/20) · Remediation Priority Tier Below ───`,
  needGroupExcellence: 'Excellence & Enrichment Tier',
  needGroupExcellenceSub: 'Complex problem solving & peer tutoring',
  needGroupConsolidation: 'Consolidation Tier',
  needGroupConsolidationSub: 'Methodology refinement & structured justification',
  needGroupRemediation: 'Intensive Remediation Tier',
  needGroupRemediationSub: 'Immediate foundational gap recovery',
  attendancePerfect: 'Full attendance recorded for this assessment (100%).',
  attendanceAbsentPrefix: 'Absent students:',
  sigTeacherLabel: 'Subject Teacher Signature:',
  sigTeacherSub: 'Assessment & remediation lead',
  sigTeacherPage2Sub: 'Certifies accuracy of recorded grades',
  sigInspectorLabel: 'Pedagogical Inspector Visa:',
  sigInspectorSub: 'Academic supervision & quality assurance',
  sigInspectorPage2Sub: 'Notes on rubric, score spread & support impact',
  sigInspectorFooter: 'Visa & Stamp: .......................',
  sigPrincipalLabel: 'School Principal Visa:',
  sigPrincipalSub: 'School Administration',
  sigPrincipalPage2Sub: 'Reviewed and logged in continuous assessment records',
  dateLabel: 'Date:',
  footerBrand: 'Pedagogical Assessment System',
  footerCompliance: 'Compliant with National Assessment Framework',
  footerReportPrefix: 'Report',
  footerAppendixPrefix: 'Roster',
  pageOfTotal: (p, total) => `Page ${p} of ${total}`,
  cardsHeaderTitle: 'Individual Pedagogical Remediation & Support Cards',
  cardBadgePrefix: 'Card #',
  cardTitle: 'Individual Remediation Card',
  cardStudentMeta: 'Student',
  cardMassarCode: 'Massar ID:',
  cardClassRank: 'Class Rank:',
  cardObtainedScore: 'Achieved Score',
  cardClassAvg: 'Class Avg:',
  cardPassThreshold: 'Pass Mark:',
  cardSupportDate: 'Support Date:',
  cardDiagTitle: '1. Competency Diagnosis & Observed Gaps:',
  cardTargetCompetency: 'Priority Competency:',
  cardWeakItemsLabel: 'Weak Exercises:',
  cardActionPlanTitle: '2. Targeted Action Plan & Practice Tasks:',
  cardActivityPrefix: '• Assigned Task:',
  cardPostSupportTitle: 'Post-Remediation Check:',
  cardPostMastered: 'Mastered',
  cardPostInProgress: 'In Progress',
  cardPostNeedsFollowup: 'Further Support',
  cardSigTeacher: 'Teacher',
  cardSigStudent: 'Student Commitment',
  cardSigParent: 'Parent / Guardian Visa',
  cardCutGuide: 'Cut Line',
  cardBoardCounter: (idx, total) => `Sheet ${idx} / ${total}`,
  cardsEmptyTitle: 'No individual remediation cards match the active filter',
  cardsEmptyDesc: 'Adjust target filters to select students for printing.',
  itemMatrixTitle: 'Exercise & Competency Mastery Analysis Matrix',
  itemMatrixSub: 'Class performance breakdown by exam exercise and learning objective',
  itemColExercise: 'Exercise / Item',
  itemColCompetency: 'Targeted Competency',
  itemColMaxScore: 'Max',
  itemColAvgScore: 'Class Avg',
  itemColMasteryRate: 'Mastery Rate',
  itemColStatus: 'Status',
  itemStatusMastered: 'Mastered (≥ 70%)',
  itemStatusPartial: 'Partial (50–69%)',
  itemStatusCritical: 'Critical (< 50%)',
  inspectionCoverTitle: 'Unified Pedagogical Inspection Portfolio',
  inspectionCoverSubtitle:
    'Complete assessment dossier: statistical report, competency matrix, longitudinal evolution & remediation cards',
  inspectionTocTitle: 'Portfolio Table of Contents',
  inspectionChecklistTitle: 'Compliance & Administrative Sign-Off',
  longitudinalSheetTitle: 'Longitudinal Student Progression & Remediation Impact (F1 → F4)',
  postImpactTitle: 'Post-Remediation Impact Assessment (Pre / Post)',
  postImpactSub: 'Quantitative measurement of gap closure following individualized support sessions',
  postImpactEvaluated: 'Re-assessed',
  postImpactPreAvg: 'Pre-Support Avg',
  postImpactPostAvg: 'Post-Support Avg',
  postImpactAvgGain: 'Mean Gain (Δ)',
  postImpactRecoveryRate: 'Recovery Rate',
  postImpactGapClosure: 'Gap Closure',
  postImpactColPre: 'Pre (/20)',
  postImpactColPost: 'Post (/20)',
  postImpactColDelta: 'Delta (Δ)',
  postImpactColStatus: 'Post Status',
  postImpactPending: 'Pending',
};

export function getReportLabels(lang?: ReportLanguage): LocalizedReportLabels {
  if (lang === 'fr') return FR_LABELS;
  if (lang === 'en') return EN_LABELS;
  return AR_LABELS;
}

export function getLocalizedAppreciation(
  score: number | null,
  isAbsent: boolean,
  passThreshold: number,
  excellenceThreshold: number,
  lang: ReportLanguage = 'ar'
): string {
  if (isAbsent || score === null) {
    return lang === 'fr' ? 'Absent(e)' : lang === 'en' ? 'Absent' : 'غائب';
  }
  if (lang === 'fr') {
    if (score >= Math.max(excellenceThreshold + 2, 18)) return 'Excellent';
    if (score >= excellenceThreshold) return 'Très Bien';
    if (score >= Math.max(passThreshold + 2, 12)) return 'Bien';
    if (score >= passThreshold) return 'Passable';
    if (score >= passThreshold * 0.5) return 'Insuffisant';
    return 'Très faible';
  }
  if (lang === 'en') {
    if (score >= Math.max(excellenceThreshold + 2, 18)) return 'Excellent';
    if (score >= excellenceThreshold) return 'Very Good';
    if (score >= Math.max(passThreshold + 2, 12)) return 'Good';
    if (score >= passThreshold) return 'Satisfactory';
    if (score >= passThreshold * 0.5) return 'Needs Support';
    return 'Critical Gap';
  }
  if (score >= Math.max(excellenceThreshold + 2, 18)) return 'ممتاز';
  if (score >= excellenceThreshold) return 'حسن جداً';
  if (score >= Math.max(passThreshold + 2, 12)) return 'مستحسن';
  if (score >= passThreshold) return 'مقبول';
  if (score >= passThreshold * 0.5) return 'دون المعدل';
  return 'تعثر حاد';
}

export function translateBracketAppreciation(
  arAppreciation: string,
  lang: ReportLanguage = 'ar'
): string {
  if (lang === 'ar') return arAppreciation;
  const normalized = arAppreciation.trim();
  const mapFr: Array<[RegExp, string]> = [
    [/تعثر حاد|غير متحكم/i, 'Difficultés majeures (Remédiation intensive)'],
    [/تحكم أدنى|تحكم محدود/i, 'Maîtrise minimale'],
    [/دون المتوسط|دون المعدل/i, 'En dessous de la moyenne (Soutien préventif)'],
    [/متوسط\s*-\s*حسن/i, 'Moyen à Bien (Consolidation)'],
    [/تحكم جزئي/i, 'Maîtrise partielle'],
    [/تحكم أقصى/i, 'Maîtrise maximale'],
    [/تحكم مقبول/i, 'Maîtrise acceptable'],
    [/مقبول/i, 'Passable'],
    [/مستحسن/i, 'Assez Bien'],
    [/حسن جداً|جيد|\bحسن\b|^حسن$/i, 'Bien'],
    [/ممتاز|متفوق/i, 'Excellent / Très Bien'],
  ];
  const mapEn: Array<[RegExp, string]> = [
    [/تعثر حاد|غير متحكم/i, 'Critical Gap (Intensive Support)'],
    [/تحكم أدنى|تحكم محدود/i, 'Minimal Mastery'],
    [/دون المتوسط|دون المعدل/i, 'Below Average (Preventive Support)'],
    [/متوسط\s*-\s*حسن/i, 'Fair to Good (Consolidation)'],
    [/تحكم جزئي/i, 'Partial Mastery'],
    [/تحكم أقصى/i, 'Full Mastery'],
    [/تحكم مقبول/i, 'Acceptable Mastery'],
    [/مقبول/i, 'Passable'],
    [/مستحسن/i, 'Fairly Good'],
    [/حسن جداً|جيد|\bحسن\b|^حسن$/i, 'Good'],
    [/ممتاز|متفوق/i, 'Excellent'],
  ];
  const table = lang === 'fr' ? mapFr : mapEn;
  for (const [regex, replacement] of table) {
    if (regex.test(normalized)) return replacement;
  }
  return arAppreciation;
}
