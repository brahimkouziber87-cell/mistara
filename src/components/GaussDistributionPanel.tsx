import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArchivedClassProject,
  ComputedStats,
  ExamItemDefinition,
  MassarMetadata,
  ReportTemplateSchema,
  StudentItemScores,
  StudentRecord,
} from '../types/report';
import { computeExamStats } from '../utils/massarParser';

export interface GaussDistributionDataset {
  id: string;
  label: string;
  isLiveWorkspace?: boolean;
  students: StudentRecord[];
  metadata: MassarMetadata;
  template: ReportTemplateSchema;
  stats: ComputedStats;
  itemDefinitions?: ExamItemDefinition[];
  studentItemScores?: StudentItemScores;
}

interface GaussDistributionPanelProps {
  /** Active workspace class if loaded */
  activeDataset?: GaussDistributionDataset | null;
  /** Archived projects available for selection or comparison */
  archivedProjects?: ArchivedClassProject[];
  /** Callback to load sample data or demo cohort when no data exists */
  onLoadSampleOrDemo?: () => void;
  /** Compact header mode when embedded inside another page */
  compact?: boolean;
}

interface GaussBinDatum {
  binIndex: number;
  scoreCenter: number;
  rangeLabel: string;
  minScore: number;
  maxScore: number;
  observedCount: number;
  observedPercentage: number;
  gaussExpectedCount: number;
  gaussExpectedPercentage: number;
  benchmarkExpectedCount: number;
  benchmarkExpectedPercentage: number;
  shiftedGaussCount: number;
  shiftedGaussPercentage: number;
  bracketColor: string;
  bracketTitle: string;
}

interface Memo142ZoneSummary {
  id: string;
  label: string;
  rangeText: string;
  min: number;
  max: number;
  color: string;
  badgeClass: string;
  observedCount: number;
  observedPct: number;
  expectedGaussPct: number;
  pedagogicalAction: string;
}

/** Standard Normal PDF */
function normalPdf(x: number, mean: number, stdDev: number): number {
  const safeSigma = Math.max(stdDev, 0.55);
  const z = (x - mean) / safeSigma;
  return (1 / (safeSigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

/** Error function approximation (Abramowitz & Stegun) for Normal CDF */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-absX * absX);
  return sign * y;
}

function normalCdf(x: number, mean: number, stdDev: number): number {
  const safeSigma = Math.max(stdDev, 0.55);
  return 0.5 * (1 + erf((x - mean) / (safeSigma * Math.sqrt(2))));
}

/** Probability mass inside [a, b] truncated to [0, 20] */
function truncatedNormalIntervalProb(
  a: number,
  b: number,
  mean: number,
  stdDev: number
): number {
  const totalMass = Math.max(
    1e-6,
    normalCdf(20, mean, stdDev) - normalCdf(0, mean, stdDev)
  );
  const intervalMass = Math.max(
    0,
    normalCdf(b, mean, stdDev) - normalCdf(a, mean, stdDev)
  );
  return intervalMass / totalMass;
}

function getZoneColorAndTitle(scoreCenter: number): {
  color: string;
  title: string;
} {
  if (scoreCenter < 5) {
    return { color: '#dc2626', title: 'تعثر حاد [0 - 5[' };
  }
  if (scoreCenter < 10) {
    return { color: '#ea580c', title: 'دون المتوسط [5 - 10[' };
  }
  if (scoreCenter < 14) {
    return { color: '#2563eb', title: 'تحكم متوسط/حسن [10 - 14[' };
  }
  if (scoreCenter < 18) {
    return { color: '#0d9488', title: 'تحكم جيد [14 - 18[' };
  }
  return { color: '#16a34a', title: 'تميز وإتقان [18 - 20]' };
}

interface CustomGaussTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: GaussBinDatum;
  }>;
  yUnitMode: 'count' | 'percentage';
  showBenchmark: boolean;
  supportDelta: number;
}

const GaussChartTooltip: React.FC<CustomGaussTooltipProps> = ({
  active,
  payload,
  yUnitMode,
  showBenchmark,
  supportDelta,
}) => {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;

  return (
    <div
      dir="rtl"
      className="min-w-[240px] rounded-xl border border-slate-200 bg-white/98 p-3 text-right text-xs shadow-lg"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs"
            style={{ backgroundColor: item.bracketColor }}
          />
          <span>فئة النقط:</span>
          <span className="font-mono text-slate-950" dir="ltr">
            {item.rangeLabel}
          </span>
        </div>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
          {item.bracketTitle}
        </span>
      </div>

      <div className="mt-2 space-y-1.5 font-mono text-[11px] tabular-nums">
        <div className="flex items-center justify-between text-slate-800">
          <span className="font-sans font-semibold text-slate-600">
            التكرار الفعلي بالقسم:
          </span>
          <span className="font-bold text-slate-950">
            {item.observedCount} تلميذ ({item.observedPercentage.toFixed(1)}%)
          </span>
        </div>

        <div className="flex items-center justify-between text-teal-800">
          <span className="font-sans font-semibold text-teal-700">
            منحنى غوص الفعلي للقسم:
          </span>
          <span className="font-bold">
            {yUnitMode === 'count'
              ? `${item.gaussExpectedCount.toFixed(2)} تلميذ`
              : `${item.gaussExpectedPercentage.toFixed(1)}%`}
          </span>
        </div>

        {showBenchmark && (
          <div className="flex items-center justify-between text-indigo-800">
            <span className="font-sans font-semibold text-indigo-700">
              المنحنى المرجعي (المذكرة 142-08):
            </span>
            <span className="font-bold">
              {yUnitMode === 'count'
                ? `${item.benchmarkExpectedCount.toFixed(2)} تلميذ`
                : `${item.benchmarkExpectedPercentage.toFixed(1)}%`}
            </span>
          </div>
        )}

        {supportDelta > 0 && (
          <div className="flex items-center justify-between border-t border-emerald-100 pt-1 text-emerald-800">
            <span className="font-sans font-semibold text-emerald-700">
              منحنى غوص بعد الدعم (+{supportDelta.toFixed(1)} ن):
            </span>
            <span className="font-bold">
              {yUnitMode === 'count'
                ? `${item.shiftedGaussCount.toFixed(2)} تلميذ`
                : `${item.shiftedGaussPercentage.toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const GaussDistributionPanel: React.FC<GaussDistributionPanelProps> = ({
  activeDataset,
  archivedProjects = [],
  onLoadSampleOrDemo,
  compact = false,
}) => {
  // Combine active workspace dataset + archived datasets
  const allDatasets = useMemo<GaussDistributionDataset[]>(() => {
    const list: GaussDistributionDataset[] = [];
    if (activeDataset && activeDataset.students.length > 0) {
      list.push(activeDataset);
    }
    for (const proj of archivedProjects) {
      const computed = computeExamStats(
        proj.students,
        proj.template.brackets,
        proj.template.passThreshold,
        proj.template.excellenceThreshold
      );
      list.push({
        id: proj.id,
        label: proj.name,
        isLiveWorkspace: false,
        students: proj.students,
        metadata: proj.metadata,
        template: proj.template,
        stats: computed,
      });
    }
    return list;
  }, [activeDataset, archivedProjects]);

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [yUnitMode, setYUnitMode] = useState<'count' | 'percentage'>('count');
  const [showBenchmarkCurve, setShowBenchmarkCurve] = useState<boolean>(true);
  const [showSigmaBand, setShowSigmaBand] = useState<boolean>(true);
  const [supportDelta, setSupportDelta] = useState<number>(0);

  const currentDataset = useMemo<GaussDistributionDataset | null>(() => {
    if (allDatasets.length === 0) return null;
    if (selectedDatasetId) {
      const found = allDatasets.find((d) => d.id === selectedDatasetId);
      if (found) return found;
    }
    return allDatasets[0];
  }, [allDatasets, selectedDatasetId]);

  // Extract valid numerical scores
  const presentScores = useMemo<number[]>(() => {
    if (!currentDataset) return [];
    return currentDataset.students
      .filter(
        (s) =>
          !s.isAbsent &&
          typeof s.score === 'number' &&
          Number.isFinite(s.score)
      )
      .map((s) => Math.min(20, Math.max(0, s.score as number)));
  }, [currentDataset]);

  // Compute higher-order docimological moments (Mean, StdDev, Skewness, Kurtosis, 1-Sigma coverage, Homogeneity CV)
  const gaussMetrics = useMemo(() => {
    const n = presentScores.length;
    if (n === 0 || !currentDataset) {
      return {
        n: 0,
        mean: 0,
        median: 0,
        stdDev: 0,
        effectiveSigma: 1,
        cvPercent: 0,
        skewness: 0,
        kurtosisExcess: 0,
        withinOneSigmaCount: 0,
        withinOneSigmaPct: 0,
        sigmaLow: 0,
        sigmaHigh: 0,
        projectedPassRateAfterSupport: 0,
        benchmarkMean: 12,
        benchmarkSigma: 2.6,
      };
    }

    const mean = currentDataset.stats.average;
    const median = currentDataset.stats.median;
    const stdDev = currentDataset.stats.stdDev;
    const effectiveSigma = Math.max(stdDev, 0.65);
    const cvPercent = mean > 0 ? (stdDev / mean) * 100 : 0;

    // Skewness & Excess Kurtosis
    let m3 = 0;
    let m4 = 0;
    for (const sc of presentScores) {
      const diff = sc - mean;
      m3 += Math.pow(diff, 3);
      m4 += Math.pow(diff, 4);
    }
    m3 /= n;
    m4 /= n;

    const skewness =
      stdDev > 0.15 ? m3 / Math.pow(stdDev, 3) : 0;
    const kurtosisExcess =
      stdDev > 0.15 ? m4 / Math.pow(stdDev, 4) - 3 : 0;

    const sigmaLow = Math.max(0, mean - stdDev);
    const sigmaHigh = Math.min(20, mean + stdDev);
    const withinOneSigmaCount = presentScores.filter(
      (sc) => sc >= sigmaLow - 1e-6 && sc <= sigmaHigh + 1e-6
    ).length;
    const withinOneSigmaPct = (withinOneSigmaCount / n) * 100;

    const passThreshold = currentDataset.template.passThreshold || 10;
    const projectedPassed = presentScores.filter((sc) => {
      // Remediation lift primarily benefits students below 14/20
      const effectiveScore =
        sc < 14 ? Math.min(20, sc + supportDelta) : Math.min(20, sc + supportDelta * 0.35);
      return effectiveScore >= passThreshold;
    }).length;
    const projectedPassRateAfterSupport = (projectedPassed / n) * 100;

    return {
      n,
      mean,
      median,
      stdDev,
      effectiveSigma,
      cvPercent,
      skewness,
      kurtosisExcess,
      withinOneSigmaCount,
      withinOneSigmaPct,
      sigmaLow,
      sigmaHigh,
      projectedPassRateAfterSupport,
      benchmarkMean: 12.0,
      benchmarkSigma: 2.6,
    };
  }, [presentScores, currentDataset, supportDelta]);

  // Build 20 1-point histogram bins [0-1[, [1-2[, ..., [19-20] with continuous Gaussian curve values
  const chartData = useMemo<GaussBinDatum[]>(() => {
    const n = gaussMetrics.n;
    const binWidth = 1.0;
    const bins: GaussBinDatum[] = [];

    // Compute normalization constant so truncated Gaussian over [0, 20] sums to N
    const classMassIn0To20 = Math.max(
      1e-6,
      normalCdf(20, gaussMetrics.mean, gaussMetrics.effectiveSigma) -
        normalCdf(0, gaussMetrics.mean, gaussMetrics.effectiveSigma)
    );
    const benchmarkMassIn0To20 = Math.max(
      1e-6,
      normalCdf(20, gaussMetrics.benchmarkMean, gaussMetrics.benchmarkSigma) -
        normalCdf(0, gaussMetrics.benchmarkMean, gaussMetrics.benchmarkSigma)
    );
    const shiftedMean = Math.min(20, gaussMetrics.mean + supportDelta * 0.75);
    const shiftedSigma = Math.max(0.65, gaussMetrics.effectiveSigma * (supportDelta > 0 ? 0.9 : 1));
    const shiftedMassIn0To20 = Math.max(
      1e-6,
      normalCdf(20, shiftedMean, shiftedSigma) -
        normalCdf(0, shiftedMean, shiftedSigma)
    );

    for (let i = 0; i < 20; i++) {
      const minScore = i;
      const maxScore = i === 19 ? 20 : i + 1;
      const scoreCenter = i + 0.5;
      const isLast = i === 19;

      const observedCount = presentScores.filter((s) =>
        isLast ? s >= minScore && s <= 20 : s >= minScore && s < maxScore
      ).length;
      const observedPercentage = n > 0 ? (observedCount / n) * 100 : 0;

      const classPdfDensity =
        (normalPdf(scoreCenter, gaussMetrics.mean, gaussMetrics.effectiveSigma) /
          classMassIn0To20) *
        binWidth;
      const gaussExpectedCount = n * classPdfDensity;
      const gaussExpectedPercentage = classPdfDensity * 100;

      const benchmarkPdfDensity =
        (normalPdf(
          scoreCenter,
          gaussMetrics.benchmarkMean,
          gaussMetrics.benchmarkSigma
        ) /
          benchmarkMassIn0To20) *
        binWidth;
      const benchmarkExpectedCount = n * benchmarkPdfDensity;
      const benchmarkExpectedPercentage = benchmarkPdfDensity * 100;

      const shiftedPdfDensity =
        (normalPdf(scoreCenter, shiftedMean, shiftedSigma) /
          shiftedMassIn0To20) *
        binWidth;
      const shiftedGaussCount = n * shiftedPdfDensity;
      const shiftedGaussPercentage = shiftedPdfDensity * 100;

      const zoneInfo = getZoneColorAndTitle(scoreCenter);

      bins.push({
        binIndex: i,
        scoreCenter,
        rangeLabel: isLast ? '[19 - 20]' : `[${minScore} - ${maxScore}[`,
        minScore,
        maxScore,
        observedCount,
        observedPercentage: Number(observedPercentage.toFixed(2)),
        gaussExpectedCount: Number(gaussExpectedCount.toFixed(2)),
        gaussExpectedPercentage: Number(gaussExpectedPercentage.toFixed(2)),
        benchmarkExpectedCount: Number(benchmarkExpectedCount.toFixed(2)),
        benchmarkExpectedPercentage: Number(
          benchmarkExpectedPercentage.toFixed(2)
        ),
        shiftedGaussCount: Number(shiftedGaussCount.toFixed(2)),
        shiftedGaussPercentage: Number(shiftedGaussPercentage.toFixed(2)),
        bracketColor: zoneInfo.color,
        bracketTitle: zoneInfo.title,
      });
    }

    return bins;
  }, [presentScores, gaussMetrics, supportDelta]);

  // Compute the 5 Memo 142-08 regulatory mastery brackets comparing Observed vs Gaussian Expected
  const memo142Zones = useMemo<Memo142ZoneSummary[]>(() => {
    const n = gaussMetrics.n;
    const rawZones = [
      {
        id: 'severe-struggle',
        label: 'تعثر حاد (غير متحكم)',
        rangeText: '[0 - 4.99]',
        min: 0,
        max: 5,
        color: '#dc2626',
        badgeClass: 'bg-red-50 text-red-800 border-red-200',
        pedagogicalAction: 'دعم استدراكي مكثف ومعالجة التعلمات الأساس قبل بناء المفاهيم الجديدة',
      },
      {
        id: 'near-average',
        label: 'في طور التملك (دون المتوسط)',
        rangeText: '[5 - 9.99]',
        min: 5,
        max: 10,
        color: '#ea580c',
        badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
        pedagogicalAction: 'دعم وقائي وتصحيح الأخطاء الإجرائية لتجسير العبور نحو عتبة التحكم 10/20',
      },
      {
        id: 'moderate-mastery',
        label: 'تحكم متوسط إلى حسن',
        rangeText: '[10 - 13.99]',
        min: 10,
        max: 14,
        color: '#2563eb',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        pedagogicalAction: 'تثبيت المكتسبات وتنويع وضعيات التريض والاستدلال الرياضي',
      },
      {
        id: 'good-mastery',
        label: 'تحكم جيد ومستدمج',
        rangeText: '[14 - 17.99]',
        min: 14,
        max: 18,
        color: '#0d9488',
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        pedagogicalAction: 'تعميق القدرات البرهانية وحل المسائل التوليفية المركبة',
      },
      {
        id: 'excellence',
        label: 'تميز وإتقان عالٍ',
        rangeText: '[18 - 20]',
        min: 18,
        max: 20,
        color: '#16a34a',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        pedagogicalAction: 'إغناء وتوجيه نحو مسائل الأولمبياد والتحديات الرياضية والمصاحبة بالأقران',
      },
    ];

    return rawZones.map((z, idx) => {
      const isLast = idx === rawZones.length - 1;
      const observedCount = presentScores.filter((s) =>
        isLast ? s >= z.min && s <= z.max : s >= z.min && s < z.max
      ).length;
      const observedPct = n > 0 ? (observedCount / n) * 100 : 0;
      const expectedGaussPct =
        n > 0
          ? truncatedNormalIntervalProb(
              z.min,
              z.max,
              gaussMetrics.mean,
              gaussMetrics.effectiveSigma
            ) * 100
          : 0;

      return {
        ...z,
        observedCount,
        observedPct,
        expectedGaussPct,
      };
    });
  }, [presentScores, gaussMetrics]);

  // Automated Pedagogical & Docimological Evaluation according to Memo 142-08
  const memo142Diagnosis = useMemo(() => {
    const { mean, median, stdDev, skewness } = gaussMetrics;
    const passRate = currentDataset?.stats.passRate ?? 0;

    // 1. Curve Position & Mastery Level (Memo 142-08)
    let levelBadge = 'مستوى متحكم ومتوازن';
    let levelTone: 'emerald' | 'teal' | 'amber' | 'red' = 'teal';
    let levelInterpretation = '';

    if (mean >= 12.5 && passRate >= 70) {
      levelBadge = 'منحنى غوص متقدم (تحكم جيد للقسم)';
      levelTone = 'emerald';
      levelInterpretation = `يتمركز منحنى غوص للقسم عند معدل مرتفع (μ = ${mean.toFixed(
        2
      )}/20) متجاوزاً عتبة التحكم (10/20) وبنسبة نجاح ${passRate.toFixed(
        1
      )}%. يدل ذلك وفق المذكرة 142-08 على استيعاب سليم للكفايات والمضامين المقررة في الفرض المحروس.`;
    } else if (mean >= 10.0 && passRate >= 50) {
      levelBadge = 'منحنى غوص طبيعي متمركز فوق العتبة';
      levelTone = 'teal';
      levelInterpretation = `يتمركز منحنى غوص في المنطقة المتوسطة الموجبة (μ = ${mean.toFixed(
        2
      )}/20، الوسيط Me = ${median.toFixed(
        2
      )}/20) مع تحقيق ${passRate.toFixed(
        1
      )}% من التلاميذ لعتبة التحكم. التوزيع قريب من المنحنى الطبيعي المتوازن الموصى به في التقويم التربوي.`;
    } else if (mean >= 8.0) {
      levelBadge = 'منحنى غوص مناحٍ نحو منطقة الهشاشة';
      levelTone = 'amber';
      levelInterpretation = `قمة منحنى غوص (μ = ${mean.toFixed(
        2
      )}/20) تقع دون عتبة التحكم (10/20) بقليل، حيث تتمركز شريحة واسعة في الفئة الحدية [5 - 10[. يستوجب ذلك برمجة حصة دعم وقائي جماعي لتثبيت القواعد والمهارات الإجرائية.`;
    } else {
      levelBadge = 'منحنى غوص متمركز في منطقة التعثر';
      levelTone = 'red';
      levelInterpretation = `ينحاز منحنى غوص بشكل واضح نحو النقط الدنيا (μ = ${mean.toFixed(
        2
      )}/20، نسبة التحكم ${passRate.toFixed(
        1
      )}%)، مما يعكس إما تعثراً جماعياً في المكتسبات القبلية أو صعوبة مرتفعة لوضعيات الفرض مقارنة بزمن الإنجاز حسب المذكرة 142-08.`;
    }

    // 2. Dispersion & Homogeneity (Sigma)
    let dispersionTitle = '';
    let dispersionDetail = '';
    if (stdDev < 2.2) {
      dispersionTitle = 'توزيع متجانس وملموم (انحراف معياري منخفض)';
      dispersionDetail = `قيمة الانحراف المعياري (σ = ${stdDev.toFixed(
        2
      )}) ضعيفة، مما يجعل الجرس ضيقاً وعالي القمة؛ أي أن مستويات التلاميذ متقاربة جداً ويمكن تدبير الدعم بمدخل جماعي موحد.`;
    } else if (stdDev <= 3.4) {
      dispersionTitle = 'تشتت طبيعي ومعتدل القدرة التمييزية';
      dispersionDetail = `الانحراف المعياري (σ = ${stdDev.toFixed(
        2
      )}) يعكس قدرة تمييزية متوازنة للفرض المحروس وفق المذكرة 142-08 (يميز بوضوح بين المتعثرين والمتوسطين والمتفوقين دون فجوة حادة).`;
    } else {
      dispersionTitle = 'تشتت مرتفع وانقسام في إيقاعات التعلم (σ > 3.4)';
      dispersionDetail = `اتساع قاعدة منحنى غوص (σ = ${stdDev.toFixed(
        2
      )}) يكشف تبايناً كبيراً داخل القسم بين فئة متفوقة وأخرى متعثرة، مما يفرض اعتماد التفريق البيداغوجي وتفييء القسم إلى مجموعات حاجة.`;
    }

    // 3. Skewness & Symmetry
    let skewnessTitle = '';
    let skewnessDetail = '';
    if (skewness <= -0.35) {
      skewnessTitle = `التواء سالب نحو النقط العليا (Sk = ${skewness.toFixed(2)})`;
      skewnessDetail =
        'ذيل المنحنى يمتد يساراً بينما تتكتل الأغلبية في فئات التحكم الجيد (الوسيط أعلى من المعدل الحسابي).';
    } else if (skewness >= 0.35) {
      skewnessTitle = `التواء موجب نحو النقط الدنيا (Sk = ${skewness.toFixed(2)})`;
      skewnessDetail =
        'كتلة التلاميذ تميل نحو الفئات دون المتوسط مع وجود قلة متفوقة ترفع المعدل الحسابي فوق الوسيط.';
    } else {
      skewnessTitle = `تماثل قريب من التوزيع الطبيعي القياسي (Sk = ${skewness.toFixed(2)})`;
      skewnessDetail =
        'تقارب المعدل الحسابي والوسيط يعكس توازناً في بناء سلم التنقيط وتدرج صعوبة تمارين الفرض.';
    }

    return {
      levelBadge,
      levelTone,
      levelInterpretation,
      dispersionTitle,
      dispersionDetail,
      skewnessTitle,
      skewnessDetail,
    };
  }, [gaussMetrics, currentDataset]);

  if (!currentDataset || gaussMetrics.n === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-teal-700" strokeWidth={1.7} />
        <h2 className="text-base font-bold text-slate-900">
          التوزيع الطبيعي للنقط — منحنى غوص (Courbe de Gauss) وفق المذكرة 142-08
        </h2>
        <p className="mx-auto mt-1.5 max-w-lg text-xs leading-relaxed text-slate-600">
          لا توجد حالياً نقط تلاميذ حاضرة لرسم منحنى التوزيع الطبيعي (Gauss). قم باستيراد ملف مسار أو تحميل بيانات نموذجية لمعاينة التحليل الإحصائي والديداكتيكي الفوري للقسم.
        </p>
        {onLoadSampleOrDemo && (
          <button
            type="button"
            onClick={onLoadSampleOrDemo}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            تحميل بيانات قسم نموذجية لمعاينة منحنى غوص
          </button>
        )}
      </section>
    );
  }

  const passThreshold = currentDataset.template.passThreshold || 10;
  const barDataKey =
    yUnitMode === 'count' ? 'observedCount' : 'observedPercentage';
  const gaussDataKey =
    yUnitMode === 'count' ? 'gaussExpectedCount' : 'gaussExpectedPercentage';
  const benchmarkDataKey =
    yUnitMode === 'count'
      ? 'benchmarkExpectedCount'
      : 'benchmarkExpectedPercentage';
  const shiftedDataKey =
    yUnitMode === 'count' ? 'shiftedGaussCount' : 'shiftedGaussPercentage';

  return (
    <section className="no-print space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      {/* Top Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 border border-teal-200/70">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                توزيع معدلات القسم بمنحنى غوص الطبيعي (Courbe de Gauss)
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-900">
                <BookOpen className="h-3 w-3" />
                تقييم ديداكتيكي وفق المذكرة 142-08
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              مقارنة التوزيع الفعلي لنقط المتعلمين مع المنحنى الطبيعي للقسم{' '}
              <span className="font-mono font-semibold text-slate-700" dir="ltr">
                N(μ={gaussMetrics.mean.toFixed(2)}, σ={gaussMetrics.stdDev.toFixed(2)})
              </span>{' '}
              والمنحنى المرجعي المعياري لتشخيص التجانس والالتواء ومجموعات الحاجة
            </p>
          </div>
        </div>

        {/* Dataset Picker & Display Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {allDatasets.length > 1 && (
            <select
              aria-label="اختيار القسم أو الفرض لرسم منحنى غوص"
              value={currentDataset.id}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-teal-700 focus:bg-white focus:outline-none"
            >
              {allDatasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.isLiveWorkspace ? `[القسم النشط] ${ds.label}` : ds.label} (μ=
                  {ds.stats.average.toFixed(2)})
                </option>
              ))}
            </select>
          )}

          {/* Unit Toggle: Count vs Percentage */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setYUnitMode('count')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                yUnitMode === 'count'
                  ? 'bg-white text-teal-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              عدد التلاميذ
            </button>
            <button
              type="button"
              onClick={() => setYUnitMode('percentage')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                yUnitMode === 'percentage'
                  ? 'bg-white text-teal-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              النسبة المئوية (%)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowBenchmarkCurve((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              showBenchmarkCurve
                ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showBenchmarkCurve ? (
              <Eye className="h-3.5 w-3.5 text-indigo-700" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>المنحنى المرجعي (μ=12)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSigmaBand((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              showSigmaBand
                ? 'border-teal-300 bg-teal-50 text-teal-900'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>نطاق [μ - σ , μ + σ]</span>
          </button>
        </div>
      </div>

      {/* Statistical & Gaussian KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="text-[11px] font-semibold text-slate-500">
            قمة منحنى غوص (المعدل μ)
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-slate-900">
              {gaussMetrics.mean.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ 20</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-600">
            الوسيط <span className="font-mono font-bold">Me = {gaussMetrics.median.toFixed(2)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="text-[11px] font-semibold text-slate-500">
            انفتاح الجرس (الانحراف σ)
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-teal-800">
              {gaussMetrics.stdDev.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              (CV {gaussMetrics.cvPercent.toFixed(0)}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-600">
            {gaussMetrics.stdDev < 2.2
              ? 'توزيع متجانس جداً'
              : gaussMetrics.stdDev <= 3.4
              ? 'تشتت طبيعي متوازن'
              : 'تشتت مرتفع (فوارق فردية)'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="text-[11px] font-semibold text-slate-500">
            التمركز داخل [μ - σ , μ + σ]
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-indigo-900">
              {gaussMetrics.withinOneSigmaPct.toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({gaussMetrics.withinOneSigmaCount}/{gaussMetrics.n})
            </span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-600" dir="ltr">
            [{gaussMetrics.sigmaLow.toFixed(1)} , {gaussMetrics.sigmaHigh.toFixed(1)}] (النظري 68.2%)
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="text-[11px] font-semibold text-slate-500">
            معامل الالتواء (Asymétrie Sk)
          </div>
          <div
            className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums"
            dir="ltr"
          >
            <span
              className={`text-xl font-extrabold ${
                gaussMetrics.skewness <= -0.25
                  ? 'text-emerald-700'
                  : gaussMetrics.skewness >= 0.35
                  ? 'text-amber-700'
                  : 'text-slate-900'
              }`}
            >
              {gaussMetrics.skewness > 0 ? '+' : ''}
              {gaussMetrics.skewness.toFixed(2)}
            </span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-slate-600">
            {gaussMetrics.skewness <= -0.35
              ? 'انحياز إيجابي للنقط العليا'
              : gaussMetrics.skewness >= 0.35
              ? 'انحياز نحو النقط الدنيا'
              : 'منحنى متماثل حول المعدل'}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-teal-200 bg-teal-50/60 p-3.5">
          <div className="text-[11px] font-semibold text-teal-800">
            نسبة التحكم (≥ {passThreshold}/20)
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
            <span className="text-xl font-extrabold text-teal-950">
              {currentDataset.stats.passRate.toFixed(1)}%
            </span>
            <span className="text-xs font-semibold text-teal-700">
              ({currentDataset.stats.passed} متحكم)
            </span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-teal-800">
            غير المتحكمين: {currentDataset.stats.failed} تلميذ(ة)
          </div>
        </div>
      </div>

      {/* Main Gaussian Distribution Chart */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
              <span className="inline-block h-3 w-3 rounded-xs bg-teal-600/85" />
              المدرج التكراري الفعلي لنقط القسم
            </span>
            <span className="inline-flex items-center gap-1.5 font-bold text-teal-900">
              <span className="inline-block h-0.5 w-5 bg-teal-800" />
              منحنى غوص الفعلي للقسم N(μ={gaussMetrics.mean.toFixed(1)}, σ=
              {gaussMetrics.stdDev.toFixed(1)})
            </span>
            {showBenchmarkCurve && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-800">
                <span className="inline-block h-0.5 w-5 border-b-2 border-dashed border-indigo-600" />
                المنحنى المرجعي المعياري (المذكرة 142-08: μ=12, σ=2.6)
              </span>
            )}
            {supportDelta > 0 && (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800">
                <span className="inline-block h-0.5 w-5 border-b-2 border-emerald-600" />
                منحنى غوص المتوقع بعد الدعم (+{supportDelta.toFixed(1)} ن)
              </span>
            )}
          </div>

          <span className="font-mono text-[11px] font-semibold text-slate-500">
            سلم التنقيط: [0 - 20] · العينة الحاضرة: N = {gaussMetrics.n}
          </span>
        </div>

        <div className="h-[340px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 18, right: 18, left: 4, bottom: 12 }}
            >
              <defs>
                <linearGradient id="gaussCurveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="shiftedGaussFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

              <XAxis
                dataKey="scoreCenter"
                type="number"
                domain={[0, 20]}
                ticks={[0, 2, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20]}
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                tickFormatter={(v: number) => `${v}`}
              />

              <YAxis
                tick={{ fontSize: 11, fill: '#475569' }}
                width={38}
                tickFormatter={(val: number) =>
                  yUnitMode === 'percentage' ? `${val.toFixed(0)}%` : `${val}`
                }
              />

              <Tooltip
                content={
                  <GaussChartTooltip
                    yUnitMode={yUnitMode}
                    showBenchmark={showBenchmarkCurve}
                    supportDelta={supportDelta}
                  />
                }
              />

              {/* 1-Sigma Normal Concentration Zone [mean - stdDev, mean + stdDev] */}
              {showSigmaBand && gaussMetrics.stdDev > 0.1 && (
                <ReferenceArea
                  x1={Number(gaussMetrics.sigmaLow.toFixed(2))}
                  x2={Number(gaussMetrics.sigmaHigh.toFixed(2))}
                  fill="#0d9488"
                  fillOpacity={0.08}
                  stroke="#0d9488"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                />
              )}

              {/* Observed Score Histogram Bars colored by Memo 142-08 Mastery Zone */}
              <Bar
                dataKey={barDataKey}
                name="التكرار الفعلي"
                barSize={15}
                radius={[4, 4, 0, 0]}
                fillOpacity={0.78}
                isAnimationActive={false}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.binIndex}`} fill={entry.bracketColor} />
                ))}
              </Bar>

              {/* Ideal Memo 142-08 Reference Benchmark Gaussian Curve */}
              {showBenchmarkCurve && (
                <Line
                  type="monotone"
                  dataKey={benchmarkDataKey}
                  name="المنحنى المرجعي (μ=12)"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Shifted Gaussian Curve (What-If Pedagogical Support Simulation) */}
              {supportDelta > 0 && (
                <Area
                  type="monotone"
                  dataKey={shiftedDataKey}
                  name="منحنى غوص بعد الدعم"
                  stroke="#16a34a"
                  strokeWidth={2.2}
                  fill="url(#shiftedGaussFill)"
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Class Fitted Gaussian Normal Curve */}
              <Area
                type="monotone"
                dataKey={gaussDataKey}
                name="منحنى غوص الفعلي للقسم"
                stroke="#0f766e"
                strokeWidth={3}
                fill="url(#gaussCurveFill)"
                dot={{ r: 2.5, fill: '#0f766e', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Vertical Reference Line: Pass Threshold (10/20) */}
              <ReferenceLine
                x={passThreshold}
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="4 3"
                label={{
                  value: `عتبة التحكم (${passThreshold}/20)`,
                  position: 'top',
                  fill: '#b91c1c',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />

              {/* Vertical Reference Line: Class Mean (μ) */}
              <ReferenceLine
                x={Number(gaussMetrics.mean.toFixed(2))}
                stroke="#0f766e"
                strokeWidth={2.2}
                label={{
                  value: `المعدل μ=${gaussMetrics.mean.toFixed(2)}`,
                  position: 'insideTopRight',
                  fill: '#0f766e',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Color Legend for the 5 Memo 142-08 Mastery Zones along the X-axis */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            {memo142Zones.map((zone) => (
              <span key={zone.id} className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-xs"
                  style={{ backgroundColor: zone.color }}
                />
                <span>{zone.label}</span>
                <span className="font-mono text-slate-500" dir="ltr">
                  {zone.rangeText}
                </span>
              </span>
            ))}
          </div>

          {/* Interactive Pedagogical Support Simulator (What-if Shift) */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-700" />
            <span className="font-bold text-emerald-950">
              محاكاة أثر الدعم التربوي على منحنى غوص:
            </span>
            <input
              type="range"
              aria-label="محاكاة أثر الدعم التربوي بالنقط"
              min={0}
              max={3}
              step={0.5}
              value={supportDelta}
              onChange={(e) => setSupportDelta(Number.parseFloat(e.target.value))}
              className="h-1.5 w-24 accent-emerald-700 cursor-pointer"
            />
            <span className="font-mono text-xs font-extrabold text-emerald-800" dir="ltr">
              +{supportDelta.toFixed(1)} ن
            </span>
            {supportDelta > 0 && (
              <span className="rounded bg-emerald-700 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                تحكم متوقع: {gaussMetrics.projectedPassRateAfterSupport.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Automated Docimological & Memo 142-08 Evaluation Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card 1: Overall Gaussian Position & Mastery Evaluation */}
        <div
          className={`rounded-xl border p-4 ${
            memo142Diagnosis.levelTone === 'emerald'
              ? 'border-emerald-200 bg-emerald-50/50'
              : memo142Diagnosis.levelTone === 'teal'
              ? 'border-teal-200 bg-teal-50/50'
              : memo142Diagnosis.levelTone === 'amber'
              ? 'border-amber-200 bg-amber-50/50'
              : 'border-red-200 bg-red-50/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {memo142Diagnosis.levelTone === 'red' ||
            memo142Diagnosis.levelTone === 'amber' ? (
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-teal-700 shrink-0" />
            )}
            <h3 className="text-xs font-extrabold text-slate-900">
              1. تمركز منحنى غوص ومستوى التحكم (المذكرة 142-08)
            </h3>
          </div>
          <div className="mt-1.5 inline-block rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-900 shadow-2xs">
            {memo142Diagnosis.levelBadge}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            {memo142Diagnosis.levelInterpretation}
          </p>
        </div>

        {/* Card 2: Homogeneity & Differentiated Pedagogy */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-700 shrink-0" />
            <h3 className="text-xs font-extrabold text-slate-900">
              2. التجانس والقدرة التمييزية للفرض (σ = {gaussMetrics.stdDev.toFixed(2)})
            </h3>
          </div>
          <div className="mt-1.5 inline-block rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-teal-900 shadow-2xs">
            {memo142Diagnosis.dispersionTitle}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            {memo142Diagnosis.dispersionDetail}
          </p>
        </div>

        {/* Card 3: Curve Asymmetry & Scoring Scale Balance */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-700 shrink-0" />
            <h3 className="text-xs font-extrabold text-slate-900">
              3. هندسة المنحنى وتدرج سلم التنقيط
            </h3>
          </div>
          <div className="mt-1.5 inline-block rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-indigo-900 shadow-2xs">
            {memo142Diagnosis.skewnessTitle}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            {memo142Diagnosis.skewnessDetail}
          </p>
        </div>
      </div>

      {/* Memo 142-08 Mastery Brackets vs Gaussian Expected Table */}
      {!compact && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-xs font-extrabold text-slate-900">
              مقارنة التوزيع الفعلي لفئات التحكم مع التوزيع النظري لمنحنى غوص وخطة التدخل وفق المذكرة 142-08
            </h3>
            <span className="text-[11px] font-semibold text-slate-500">
              مرجع التفييء: التوجيهات التربوية ومذكرة التقويم 142-08 الخاصة بالرياضيات
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="border-b border-slate-200 bg-white font-bold text-slate-700">
                <tr>
                  <th className="px-3.5 py-2.5">فئة التحصيل</th>
                  <th className="px-3.5 py-2.5 text-center">المجال</th>
                  <th className="px-3.5 py-2.5 text-center">العدد الفعلي</th>
                  <th className="px-3.5 py-2.5 text-center">النسبة الفعلية</th>
                  <th className="px-3.5 py-2.5 text-center">النسبة حسب غوص</th>
                  <th className="px-3.5 py-2.5">قرار التدخل والدعم البيداغوجي (المذكرة 142-08)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {memo142Zones.map((zone) => {
                  const diff = zone.observedPct - zone.expectedGaussPct;
                  return (
                    <tr key={zone.id} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-xs"
                            style={{ backgroundColor: zone.color }}
                          />
                          <span>{zone.label}</span>
                        </span>
                      </td>
                      <td
                        className="px-3.5 py-2.5 text-center font-mono font-semibold text-slate-600"
                        dir="ltr"
                      >
                        {zone.rangeText}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold tabular-nums text-slate-900">
                        {zone.observedCount}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold tabular-nums text-slate-900">
                        {zone.observedPct.toFixed(1)}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono tabular-nums text-slate-600">
                        <span>{zone.expectedGaussPct.toFixed(1)}%</span>
                        <span
                          className={`mr-1.5 text-[10px] font-semibold ${
                            Math.abs(diff) < 3
                              ? 'text-slate-400'
                              : diff > 0
                              ? 'text-teal-700'
                              : 'text-amber-700'
                          }`}
                          dir="ltr"
                        >
                          ({diff >= 0 ? '+' : ''}
                          {diff.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700">
                        {zone.pedagogicalAction}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
