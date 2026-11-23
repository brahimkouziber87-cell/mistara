import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ComputedStats, MassarMetadata, StudentRecord } from '../types/report';

interface ScoreHistogramCardProps {
  students: StudentRecord[];
  stats: ComputedStats;
  metadata: MassarMetadata;
  passThreshold: number;
  excellenceThreshold: number;
}

type BinStep = 2 | 1;

interface HistogramBin {
  id: string;
  label: string;
  min: number;
  max: number;
  inclusiveMax: boolean;
  count: number;
  percentage: number;
  color: string;
  zoneLabel: string;
  studentNames: string[];
  isPassZone: boolean;
}

interface HistogramTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: HistogramBin;
  }>;
}

const HistogramTooltip: React.FC<HistogramTooltipProps> = ({ active, payload }) => {
  const bin = payload?.[0]?.payload;
  if (!active || !bin) return null;

  const previewNames = bin.studentNames.slice(0, 6);
  const remainingCount = bin.studentNames.length - previewNames.length;

  return (
    <div
      dir="rtl"
      className="max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-right text-xs shadow-lg"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: bin.color }}
          />
          <span>المجال:</span>
          <span className="font-mono text-[11px]" dir="ltr">
            {bin.label}
          </span>
        </div>
        <span className="text-[10.5px] font-semibold text-slate-500">{bin.zoneLabel}</span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-4 font-mono text-[11px] tabular-nums text-slate-700">
        <span>
          العدد: <strong className="text-slate-900">{bin.count}</strong> تلميذ
        </span>
        <span>
          النسبة: <strong className="text-slate-900">{bin.percentage.toFixed(1)}%</strong>
        </span>
      </div>

      {previewNames.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-1.5 text-[10.5px] leading-relaxed text-slate-600">
          <div className="font-semibold text-slate-700">التلاميذ ضمن هذا المجال:</div>
          <div>
            {previewNames.join(' · ')}
            {remainingCount > 0 ? ` (+${remainingCount} آخرون)` : ''}
          </div>
        </div>
      )}
    </div>
  );
};

export const ScoreHistogramCard: React.FC<ScoreHistogramCardProps> = ({
  students,
  stats,
  metadata,
  passThreshold,
  excellenceThreshold,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [binStep, setBinStep] = useState<BinStep>(2);

  const presentStudents = useMemo(
    () => students.filter((s) => !s.isAbsent && s.score !== null),
    [students]
  );

  const bins = useMemo<HistogramBin[]>(() => {
    const step = binStep;
    const totalBins = 20 / step;
    const totalPresent = presentStudents.length;
    const result: HistogramBin[] = [];

    for (let i = 0; i < totalBins; i++) {
      const min = i * step;
      const max = (i + 1) * step;
      const inclusiveMax = i === totalBins - 1;
      const label = inclusiveMax ? `[${min}-${max}]` : `[${min}-${max}[`;

      const matched = presentStudents.filter((s) => {
        const sc = s.score as number;
        return sc >= min && (inclusiveMax ? sc <= max : sc < max);
      });

      let color = '#d97706';
      let zoneLabel = 'فئة الدعم الاستدراكي';
      let isPassZone = false;

      if (min >= excellenceThreshold) {
        color = '#059669';
        zoneLabel = 'فئة التميز والإغناء';
        isPassZone = true;
      } else if (min >= passThreshold) {
        color = '#0f766e';
        zoneLabel = 'فئة التحكم والتثبيت';
        isPassZone = true;
      } else if (max <= Math.max(4, Math.floor(passThreshold / 2))) {
        color = '#dc2626';
        zoneLabel = 'تعثر حاد';
      }

      result.push({
        id: `bin-${min}-${max}`,
        label,
        min,
        max,
        inclusiveMax,
        count: matched.length,
        percentage: totalPresent > 0 ? (matched.length / totalPresent) * 100 : 0,
        color,
        zoneLabel,
        studentNames: matched.map((m) => m.fullName),
        isPassZone,
      });
    }

    return result;
  }, [binStep, presentStudents, passThreshold, excellenceThreshold]);

  const modalBin = useMemo(() => {
    return bins.reduce<HistogramBin | null>((best, curr) => {
      if (!best || curr.count > best.count) return curr;
      return best;
    }, null);
  }, [bins]);

  const thresholdBinLabel = useMemo(() => {
    const match = bins.find((b) =>
      b.inclusiveMax
        ? passThreshold >= b.min && passThreshold <= b.max
        : passThreshold >= b.min && passThreshold < b.max
    );
    return match?.label;
  }, [bins, passThreshold]);

  const averageBinLabel = useMemo(() => {
    if (presentStudents.length === 0) return undefined;
    const avg = stats.average;
    const match = bins.find((b) =>
      b.inclusiveMax ? avg >= b.min && avg <= b.max : avg >= b.min && avg < b.max
    );
    return match?.label;
  }, [bins, presentStudents.length, stats.average]);

  const sameReferenceBin =
    Boolean(thresholdBinLabel) && thresholdBinLabel === averageBinLabel;

  return (
    <section
      aria-label="توزيع المعدلات والنقط (Histogram)"
      className="no-print rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              توزيع المعدلات والنقط بالقسم (مدرج تكراري · Histogram)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>{metadata.className ? `القسم ${metadata.className}` : 'القسم النشط'}</span>
              <span aria-hidden="true"> · </span>
              <span>{presentStudents.length} نقطة فعلية</span>
              {modalBin && modalBin.count > 0 && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>
                    الفئة المنوالية الأكثر تكراراً:{' '}
                    <strong className="font-mono text-slate-800" dir="ltr">
                      {modalBin.label}
                    </strong>{' '}
                    ({modalBin.count} ت)
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isExpanded && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setBinStep(2)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  binStep === 2
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فئات بنقطتين (2/20)
              </button>
              <button
                type="button"
                onClick={() => setBinStep(1)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  binStep === 1
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تفصيل بنقطة (1/20)
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                طي المدرج التكراري
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                عرض المدرج التكراري
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 space-y-4">
          {/* Quick Statistical Summary Row */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-500">المعدل العام للقسم</div>
              <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-teal-800">
                {stats.average.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ 20</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-500">القيمة الوسطية (Médiane)</div>
              <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-indigo-700">
                {stats.median.toFixed(2)} <span className="text-xs font-normal text-slate-500">/ 20</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-500">الانحراف المعياري (σ)</div>
              <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-slate-900">
                {stats.stdDev.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
              <div className="text-[11px] font-semibold text-slate-500">أعلى نقطة وأدنى نقطة</div>
              <div className="mt-0.5 font-mono text-base font-extrabold tabular-nums text-slate-900" dir="ltr">
                {stats.present > 0
                  ? `${stats.minScore.toFixed(2)} — ${stats.maxScore.toFixed(2)}`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Interactive Recharts Histogram */}
          <div className="h-[265px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bins}
                margin={{ top: 24, right: 16, left: 4, bottom: binStep === 1 ? 12 : 4 }}
                barCategoryGap={binStep === 2 ? '12%' : '8%'}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: binStep === 2 ? 11 : 9.5,
                    fill: '#475569',
                    fontFamily: 'IBM Plex Mono',
                  }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                  angle={binStep === 1 ? -35 : 0}
                  textAnchor={binStep === 1 ? 'end' : 'middle'}
                  height={binStep === 1 ? 42 : 28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'IBM Plex Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9', opacity: 0.7 }}
                  content={<HistogramTooltip />}
                />
                {thresholdBinLabel && (
                  <ReferenceLine
                    x={thresholdBinLabel}
                    stroke="#0f766e"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: sameReferenceBin
                        ? `العتبة ${passThreshold} · المعدل ${stats.average.toFixed(2)}`
                        : `عتبة ${passThreshold}`,
                      position: 'top',
                      fill: '#0f766e',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
                {averageBinLabel && !sameReferenceBin && (
                  <ReferenceLine
                    x={averageBinLabel}
                    stroke="#1e3a8a"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    label={{
                      value: `المعدل ${stats.average.toFixed(2)}`,
                      position: 'top',
                      fill: '#1e3a8a',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}
                <Bar
                  dataKey="count"
                  name="عدد التلاميذ"
                  radius={[5, 5, 0, 0]}
                  isAnimationActive={false}
                >
                  {bins.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#dc2626]" />
                <span>تعثر حاد</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#d97706]" />
                <span>دون عتبة التحكم (&lt; {passThreshold})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#0f766e]" />
                <span>تحكم وتثبيت ({passThreshold} - {(excellenceThreshold - 0.01).toFixed(2)})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#059669]" />
                <span>تميز وتفوق (≥ {excellenceThreshold})</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              مرّر المؤشر فوق أي عمود لعرض أسماء التلاميذ ونسبتهم
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
