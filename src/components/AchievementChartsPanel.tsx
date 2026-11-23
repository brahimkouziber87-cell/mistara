import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, PieChart as PieChartIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ComputedStats, MassarMetadata } from '../types/report';

interface AchievementChartsPanelProps {
  stats: ComputedStats;
  metadata: MassarMetadata;
  passThreshold: number;
}

interface ChartDatum {
  id: string;
  name: string;
  sublabel?: string;
  value: number;
  percentage: number;
  color: string;
  isEmpty?: boolean;
}

const BRACKET_PALETTE = ['#dc2626', '#ea580c', '#2563eb', '#0d9488', '#16a34a', '#7c3aed'];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: ChartDatum;
  }>;
}

const ArabicPieTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  const item = payload?.[0]?.payload;
  if (!active || !item || item.isEmpty) return null;

  return (
    <div
      dir="rtl"
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-xs shadow-md"
    >
      <div className="flex items-center gap-1.5 font-bold text-slate-900">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: item.color }}
        />
        <span>{item.name}</span>
        {item.sublabel && (
          <span className="font-mono text-[11px] font-normal text-slate-500" dir="ltr">
            {item.sublabel}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-3 font-mono text-[11px] tabular-nums text-slate-700">
        <span>
          العدد: <strong className="text-slate-900">{item.value}</strong> تلميذ
        </span>
        <span>
          النسبة: <strong className="text-slate-900">{item.percentage.toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
};

export const AchievementChartsPanel: React.FC<AchievementChartsPanelProps> = ({
  stats,
  metadata,
  passThreshold,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const bracketLegendData = useMemo<ChartDatum[]>(() => {
    return [...stats.bracketsBreakdown].reverse().map((item, idx, arr) => {
      const originalIdx = arr.length - 1 - idx;
      const color =
        item.bracket.colorHex || BRACKET_PALETTE[originalIdx % BRACKET_PALETTE.length];
      return {
        id: item.bracket.id,
        name: item.bracket.appreciation,
        sublabel: item.bracket.label,
        value: item.count,
        percentage: item.percentage,
        color,
      };
    });
  }, [stats.bracketsBreakdown]);

  const bracketPieData = useMemo<ChartDatum[]>(() => {
    const active = bracketLegendData.filter((d) => d.value > 0);
    if (active.length === 0) {
      return [
        {
          id: 'empty-brackets',
          name: 'لا توجد نقط',
          value: 1,
          percentage: 0,
          color: '#e2e8f0',
          isEmpty: true,
        },
      ];
    }
    return active;
  }, [bracketLegendData]);

  const passLegendData = useMemo<ChartDatum[]>(() => {
    const baseTotal = stats.total > 0 ? stats.total : Math.max(1, stats.present);
    const items: ChartDatum[] = [
      {
        id: 'passed',
        name: `الحاصلون على المعدل (≥ ${passThreshold})`,
        value: stats.passed,
        percentage: baseTotal > 0 ? (stats.passed / baseTotal) * 100 : 0,
        color: '#0f766e',
      },
      {
        id: 'below',
        name: `دون المعدل (< ${passThreshold})`,
        value: stats.failed,
        percentage: baseTotal > 0 ? (stats.failed / baseTotal) * 100 : 0,
        color: '#d97706',
      },
    ];
    if (stats.absent > 0) {
      items.push({
        id: 'absent',
        name: 'المتغيبون عن الفرض',
        value: stats.absent,
        percentage: baseTotal > 0 ? (stats.absent / baseTotal) * 100 : 0,
        color: '#94a3b8',
      });
    }
    return items;
  }, [stats.passed, stats.failed, stats.absent, stats.total, stats.present, passThreshold]);

  const passPieData = useMemo<ChartDatum[]>(() => {
    const active = passLegendData.filter((d) => d.value > 0);
    if (active.length === 0) {
      return [
        {
          id: 'empty-pass',
          name: 'لا توجد بيانات',
          value: 1,
          percentage: 0,
          color: '#e2e8f0',
          isEmpty: true,
        },
      ];
    }
    return active;
  }, [passLegendData]);

  return (
    <section className="no-print rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <PieChartIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              التحليل المبياني لتوزيع مستويات التحصيل
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>{metadata.className ? `القسم ${metadata.className}` : 'القسم غير محدد'}</span>
              <span aria-hidden="true"> · </span>
              <span>{stats.present} حاضراً من أصل {stats.total}</span>
              <span aria-hidden="true"> · </span>
              <span>عتبة المعدل {passThreshold}/20</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              طي الرسوم البيانية
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              عرض الرسوم البيانية
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 divide-y divide-slate-200 lg:grid-cols-2 lg:divide-y-0 lg:divide-x lg:divide-x-reverse">
          {/* Chart 1: Pass Threshold & Attendance */}
          <div className="p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                توزيع التلاميذ حسب عتبة المعدل والحضور
              </h3>
              <span className="font-mono text-xs font-semibold tabular-nums text-teal-800">
                {stats.passed} / {stats.present} حاصلاً على المعدل
              </span>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative h-[200px] w-[200px] shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={passPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={passPieData.length > 1 ? 2 : 0}
                      startAngle={90}
                      endAngle={-270}
                      stroke="#ffffff"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {passPieData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ArabicPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  dir="rtl"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
                >
                  <span className="font-mono text-xl font-extrabold tabular-nums text-teal-800">
                    {stats.passRate.toFixed(1)}%
                  </span>
                  <span className="mt-0.5 text-[11px] font-semibold text-slate-600">
                    الحاصلون على المعدل
                  </span>
                </div>
              </div>

              <div className="w-full flex-1 divide-y divide-slate-100 text-xs">
                {passLegendData.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-slate-800">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className="font-bold text-slate-900">{item.value} ت</span>
                      <span className="w-12 text-left text-slate-600">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Score Brackets Distribution */}
          <div className="p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                توزيع النقط حسب مستويات التحصيل (فئات التحكم)
              </h3>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
                المعدل العام: {stats.average.toFixed(2)}/20
              </span>
            </div>

            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div className="relative h-[200px] w-[200px] shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bracketPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={84}
                      paddingAngle={bracketPieData.length > 1 ? 2 : 0}
                      startAngle={90}
                      endAngle={-270}
                      stroke="#ffffff"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {bracketPieData.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ArabicPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  dir="rtl"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
                >
                  <span className="font-mono text-xl font-extrabold tabular-nums text-slate-900">
                    {stats.average.toFixed(2)}
                  </span>
                  <span className="mt-0.5 text-[11px] font-semibold text-slate-500">
                    معدل القسم / 20
                  </span>
                </div>
              </div>

              <div className="w-full flex-1 divide-y divide-slate-100 text-xs">
                {bracketLegendData.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate font-semibold text-slate-800">{item.name}</span>
                      {item.sublabel && (
                        <span
                          className="font-mono text-[11px] text-slate-500 shrink-0"
                          dir="ltr"
                        >
                          {item.sublabel}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
                      <span className="font-bold text-slate-900">{item.value} ت</span>
                      <span className="w-12 text-left text-slate-600">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
