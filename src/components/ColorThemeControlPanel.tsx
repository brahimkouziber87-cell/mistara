import React, { useMemo } from 'react';
import { Check, Palette, RotateCcw } from 'lucide-react';
import {
  applyColorThemeToTemplate,
  buildHarmonizedChartPalette,
  getReportFontClass,
  REPORT_COLOR_THEMES,
  resolveBracketDisplayColor,
  resolveThemeChartPalette,
  SEMANTIC_CHART_PALETTE,
} from '../data/presets';
import {
  ChartColorMode,
  ComputedStats,
  MassarMetadata,
  ReportTemplateSchema,
  StudentRecord,
} from '../types/report';

interface ColorThemeControlPanelProps {
  template: ReportTemplateSchema;
  metadata: MassarMetadata;
  stats: ComputedStats;
  students: StudentRecord[];
  onUpdateTemplate: (updater: (prev: ReportTemplateSchema) => ReportTemplateSchema) => void;
}

const FALLBACK_PREVIEW_ROWS = [
  { order: 1, fullName: 'آية العمراني', score: 18.5, appreciation: 'ممتاز' },
  { order: 2, fullName: 'خديجة المرابط', score: 14.25, appreciation: 'جيد' },
  { order: 3, fullName: 'أمين التازي', score: 11.75, appreciation: 'متوسط' },
  { order: 4, fullName: 'بدر الدين السليماني', score: 8.5, appreciation: 'دون المتوسط' },
];

const FALLBACK_BAR_COUNTS = [2, 4, 8, 5, 3];

export const ColorThemeControlPanel: React.FC<ColorThemeControlPanelProps> = ({
  template,
  metadata,
  stats,
  students,
  onUpdateTemplate,
}) => {
  const accent = template.styleConfig.accentColor || '#1e3a8a';
  const secondary = template.styleConfig.secondaryAccent || '#0f766e';
  const chartMode: ChartColorMode = template.styleConfig.chartColorMode || 'theme-harmonized';
  const tableHeaderBg = template.styleConfig.tableHeaderBg || 'tinted';
  const tableStripeTint = template.styleConfig.tableStripeTint !== false;
  const fontClass = getReportFontClass(template.styleConfig.fontFamily);

  const activePalette = useMemo(
    () => resolveThemeChartPalette(template.styleConfig),
    [template.styleConfig]
  );

  const activeTheme = useMemo(
    () =>
      REPORT_COLOR_THEMES.find(
        (t) =>
          t.accentColor.toLowerCase() === accent.toLowerCase() &&
          t.secondaryAccent.toLowerCase() === secondary.toLowerCase()
      ) || null,
    [accent, secondary]
  );

  const previewRows = useMemo(() => {
    const scored = students.filter(
      (s) => !s.isAbsent && typeof s.score === 'number' && Number.isFinite(s.score)
    );
    if (scored.length === 0) return FALLBACK_PREVIEW_ROWS;
    const sorted = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const picks: StudentRecord[] = [];
    const indices =
      sorted.length <= 4
        ? sorted.map((_, idx) => idx)
        : [
            0,
            Math.floor(sorted.length * 0.35),
            Math.floor(sorted.length * 0.7),
            sorted.length - 1,
          ];
    for (const idx of indices) {
      const candidate = sorted[idx];
      if (candidate && !picks.some((p) => p.id === candidate.id)) {
        picks.push(candidate);
      }
    }
    return picks.slice(0, 4).map((st, idx) => {
      const sc = st.score ?? 0;
      const app =
        sc >= template.excellenceThreshold
          ? 'متميز'
          : sc >= 14
          ? 'جيد'
          : sc >= template.passThreshold
          ? 'متوسط'
          : 'يحتاج دعماً';
      return {
        order: st.order || idx + 1,
        fullName: st.fullName,
        score: sc,
        appreciation: app,
      };
    });
  }, [students, template.excellenceThreshold, template.passThreshold]);

  const previewBars = useMemo(() => {
    const hasRealData = stats.present > 0 && stats.bracketsBreakdown.length > 0;
    const source = hasRealData
      ? stats.bracketsBreakdown.map((item, idx) => ({
          id: item.bracket.id,
          label: item.bracket.label,
          appreciation: item.bracket.appreciation,
          count: item.count,
          color: resolveBracketDisplayColor(item.bracket, idx, template.styleConfig),
        }))
      : template.brackets.slice(0, 5).map((br, idx) => ({
          id: br.id,
          label: br.label,
          appreciation: br.appreciation,
          count: FALLBACK_BAR_COUNTS[idx % FALLBACK_BAR_COUNTS.length],
          color: resolveBracketDisplayColor(br, idx, template.styleConfig),
        }));

    const maxCount = Math.max(1, ...source.map((b) => b.count));
    return { items: source, maxCount };
  }, [stats.bracketsBreakdown, stats.present, template.brackets, template.styleConfig]);

  const previewTableHeaderStyle: React.CSSProperties =
    tableHeaderBg === 'solid-accent'
      ? { backgroundColor: accent, color: '#ffffff' }
      : tableHeaderBg === 'tinted'
      ? { backgroundColor: `${accent}18`, color: accent }
      : { backgroundColor: '#f1f5f9', color: '#0f172a' };

  const handleSelectCustomPrimary = (hex: string) => {
    onUpdateTemplate((prev) => {
      const nextSecondary = prev.styleConfig.secondaryAccent || '#0f766e';
      const nextMode = prev.styleConfig.chartColorMode || 'theme-harmonized';
      const nextPalette = buildHarmonizedChartPalette(hex, nextSecondary);
      return {
        ...prev,
        styleConfig: {
          ...prev.styleConfig,
          themeId: 'custom',
          accentColor: hex,
          chartPalette: nextMode === 'theme-harmonized' ? nextPalette : prev.styleConfig.chartPalette,
        },
        brackets:
          nextMode === 'theme-harmonized'
            ? prev.brackets.map((b, idx) => ({
                ...b,
                colorHex: nextPalette[idx % nextPalette.length],
              }))
            : prev.brackets,
      };
    });
  };

  const handleSelectCustomSecondary = (hex: string) => {
    onUpdateTemplate((prev) => {
      const nextPrimary = prev.styleConfig.accentColor || '#1e3a8a';
      const nextMode = prev.styleConfig.chartColorMode || 'theme-harmonized';
      const nextPalette = buildHarmonizedChartPalette(nextPrimary, hex);
      return {
        ...prev,
        styleConfig: {
          ...prev.styleConfig,
          themeId: 'custom',
          secondaryAccent: hex,
          chartPalette: nextMode === 'theme-harmonized' ? nextPalette : prev.styleConfig.chartPalette,
        },
        brackets:
          nextMode === 'theme-harmonized'
            ? prev.brackets.map((b, idx) => ({
                ...b,
                colorHex: nextPalette[idx % nextPalette.length],
              }))
            : prev.brackets,
      };
    });
  };

  const handleChartModeChange = (mode: ChartColorMode) => {
    onUpdateTemplate((prev) => {
      const targetColors =
        mode === 'semantic'
          ? SEMANTIC_CHART_PALETTE
          : prev.styleConfig.chartPalette && prev.styleConfig.chartPalette.length >= 5
          ? prev.styleConfig.chartPalette
          : buildHarmonizedChartPalette(
              prev.styleConfig.accentColor || '#1e3a8a',
              prev.styleConfig.secondaryAccent || '#0f766e'
            );
      return {
        ...prev,
        styleConfig: {
          ...prev.styleConfig,
          chartColorMode: mode,
          chartPalette:
            mode === 'theme-harmonized' ? [...targetColors] : prev.styleConfig.chartPalette,
        },
        brackets: prev.brackets.map((b, idx) => ({
          ...b,
          colorHex: targetColors[idx % targetColors.length],
        })),
      };
    });
  };

  const handleSinglePaletteSwatchChange = (index: number, hex: string) => {
    onUpdateTemplate((prev) => {
      const current = [...resolveThemeChartPalette(prev.styleConfig)];
      while (current.length < Math.max(5, prev.brackets.length)) {
        current.push(SEMANTIC_CHART_PALETTE[current.length % SEMANTIC_CHART_PALETTE.length]);
      }
      current[index] = hex;
      return {
        ...prev,
        styleConfig: {
          ...prev.styleConfig,
          themeId: 'custom',
          chartColorMode: 'theme-harmonized',
          chartPalette: current,
        },
        brackets: prev.brackets.map((b, idx) =>
          idx === index ? { ...b, colorHex: hex } : b
        ),
      };
    });
  };

  const handleResetTheme = () => {
    const defaultTheme = REPORT_COLOR_THEMES[0];
    onUpdateTemplate((prev) => ({
      ...applyColorThemeToTemplate(prev, defaultTheme, {
        syncTableHeader: true,
        syncBrackets: true,
      }),
      styleConfig: {
        ...applyColorThemeToTemplate(prev, defaultTheme, {
          syncTableHeader: true,
          syncBrackets: true,
        }).styleConfig,
        chartColorMode: 'theme-harmonized',
        tableStripeTint: true,
      },
    }));
  };

  // Smooth miniature bell curve overlay coordinates for live SVG preview
  const svgW = 300;
  const svgH = 98;
  const padX = 16;
  const padTop = 14;
  const padBottom = 18;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padTop - padBottom;
  const avgScore = stats.present > 0 ? stats.average : 12.6;
  const stdDev = stats.present > 0 ? Math.max(1.6, stats.stdDev) : 2.8;

  const curvePath = useMemo(() => {
    const pts: string[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const score = (i / steps) * 20;
      const z = (score - avgScore) / stdDev;
      const density = Math.exp(-0.5 * z * z);
      const x = padX + (score / 20) * plotW;
      const y = padTop + plotH - density * (plotH * 0.86);
      pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [avgScore, plotH, plotW, stdDev]);

  const meanX = padX + (Math.min(20, Math.max(0, avgScore)) / 20) * plotW;

  return (
    <section
      aria-label="لوحة التحكم في سمة ألوان التقرير"
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
    >
      {/* Top Section Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: accent }}
          >
            <Palette className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              لوحة التحكم في سمة الألوان للتقرير (Color Theme)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>{activeTheme ? `السمة النشطة: ${activeTheme.name}` : 'سمة ألوان مخصصة'}</span>
              <span aria-hidden="true"> · </span>
              <span>تُطبَّق تلقائياً على جداول النقط والرسوم البيانية في المستند المصدّر</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetTheme}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>استعادة السمة الرسمية</span>
        </button>
      </div>

      {/* Main 2-Column Split: Controls (7 cols) + Live Export Mini-Preview (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Right Side: Curated Themes + Fine-Grained Color Controls */}
        <div className="space-y-5 lg:col-span-7">
          {/* 1. Curated Institutional Color Themes */}
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800">
                1. سمات الألوان المؤسساتية الجاهزة
              </h3>
              <span className="text-[11px] text-slate-500">
                اختر سمة لتنسيق الترويسة والجداول والمبيانات دفعة واحدة
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {REPORT_COLOR_THEMES.map((theme) => {
                const isActive = activeTheme?.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() =>
                      onUpdateTemplate((prev) =>
                        applyColorThemeToTemplate(prev, theme, {
                          syncTableHeader: true,
                          syncBrackets: true,
                        })
                      )
                    }
                    className={`group flex flex-col justify-between rounded-xl border p-3 text-right transition-all cursor-pointer ${
                      isActive
                        ? 'border-slate-900 bg-slate-50/90 ring-2 ring-slate-900/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-900">
                          {theme.name}
                        </div>
                        <div className="mt-0.5 truncate text-[10.5px] text-slate-500">
                          {theme.subtitle}
                        </div>
                      </div>
                      {isActive && (
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: theme.accentColor }}
                          aria-label="السمة المفعلة"
                        >
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    {/* Coordinated 5-swatch strip (Primary + Secondary + Chart Palette) */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <div className="flex h-3.5 flex-1 overflow-hidden rounded border border-slate-200/90">
                        <span
                          className="h-full flex-[1.5]"
                          style={{ backgroundColor: theme.accentColor }}
                          title={`اللون الرئيسي: ${theme.accentColor}`}
                        />
                        <span
                          className="h-full flex-[1.2]"
                          style={{ backgroundColor: theme.secondaryAccent }}
                          title={`اللون الثانوي: ${theme.secondaryAccent}`}
                        />
                        {theme.chartPalette.slice(0, 3).map((hex, idx) => (
                          <span
                            key={idx}
                            className="h-full flex-1"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <span
                        className="font-mono text-[10px] font-semibold uppercase text-slate-500 tabular-nums"
                        dir="ltr"
                      >
                        {theme.accentColor}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Custom Primary/Secondary Colors & Table Styling */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-xs font-bold text-slate-800">
              2. تخصيص الألوان وتنسيق جداول النقط
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Primary Color Picker */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">اللون الرئيسي</div>
                  <div className="text-[10.5px] text-slate-500">
                    الترويسة، العناوين، رؤوس الجداول، منحنى غوص
                  </div>
                </div>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <span
                    className="font-mono text-[11px] font-bold uppercase text-slate-700 tabular-nums"
                    dir="ltr"
                  >
                    {accent}
                  </span>
                  <input
                    type="color"
                    aria-label="اختيار اللون الرئيسي للسمة"
                    value={accent}
                    onChange={(e) => handleSelectCustomPrimary(e.target.value)}
                    className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                  />
                </label>
              </div>

              {/* Secondary Color Picker */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">اللون الثانوي</div>
                  <div className="text-[10.5px] text-slate-500">
                    جدول الاستحقاق، الوسيط، خط المعدل، الرادار
                  </div>
                </div>
                <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                  <span
                    className="font-mono text-[11px] font-bold uppercase text-slate-700 tabular-nums"
                    dir="ltr"
                  >
                    {secondary}
                  </span>
                  <input
                    type="color"
                    aria-label="اختيار اللون الثانوي للسمة"
                    value={secondary}
                    onChange={(e) => handleSelectCustomSecondary(e.target.value)}
                    className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
                  />
                </label>
              </div>
            </div>

            {/* Table Header Mode + Alternating Row Tint */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  رؤوس الجداول:
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                  {(
                    [
                      { id: 'solid-accent', label: 'تعبئة بالسمة' },
                      { id: 'tinted', label: 'تظليل متناغم' },
                      { id: 'neutral', label: 'محايد' },
                    ] as const
                  ).map((opt) => {
                    const isSelected = tableHeaderBg === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateTemplate((prev) => ({
                            ...prev,
                            styleConfig: {
                              ...prev.styleConfig,
                              tableHeaderBg: opt.id,
                            },
                          }))
                        }
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tableStripeTint}
                  onChange={(e) =>
                    onUpdateTemplate((prev) => ({
                      ...prev,
                      styleConfig: {
                        ...prev.styleConfig,
                        tableStripeTint: e.target.checked,
                      },
                    }))
                  }
                  className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                />
                <span>تظليل متناوب لصفوف الجداول بلون السمة</span>
              </label>
            </div>
          </div>

          {/* 3. Chart & Score Bracket Palette Controls */}
          <div className="border-t border-slate-100 pt-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800">
                3. ألوان الرسوم البيانية وفئات النقط في المستند المصدّر
              </h3>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => handleChartModeChange('theme-harmonized')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartMode === 'theme-harmonized'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  متناغمة مع السمة
                </button>
                <button
                  type="button"
                  onClick={() => handleChartModeChange('semantic')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    chartMode === 'semantic'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ألوان دلالية قياسية
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {template.brackets.slice(0, 5).map((br, idx) => {
                const swatchHex =
                  chartMode === 'semantic'
                    ? SEMANTIC_CHART_PALETTE[idx % SEMANTIC_CHART_PALETTE.length]
                    : activePalette[idx % activePalette.length] ||
                      br.colorHex ||
                      SEMANTIC_CHART_PALETTE[idx % 5];
                return (
                  <label
                    key={br.id}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center transition-colors hover:border-slate-300 cursor-pointer"
                  >
                    <input
                      type="color"
                      aria-label={`تخصيص لون فئة ${br.label}`}
                      value={swatchHex}
                      onChange={(e) => handleSinglePaletteSwatchChange(idx, e.target.value)}
                      className="h-6 w-full cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                    />
                    <span
                      className="font-mono text-[10px] font-bold text-slate-800 tabular-nums"
                      dir="ltr"
                    >
                      {br.label}
                    </span>
                    <span className="truncate w-full text-[10px] text-slate-500">
                      {br.appreciation}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Left Side: Live Miniature Document Preview (Grade Table + Exported Chart) */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/75 p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-slate-800">معاينة حية للتقرير المصدّر</span>
              <span className="text-slate-500">
                {metadata.className || 'القسم'} · {metadata.examNumber || 'الفرض المحروس'}
              </span>
            </div>

            {/* Miniature A4 Document Card */}
            <div
              className={`overflow-hidden rounded-lg border bg-white p-3 text-slate-900 ${fontClass}`}
              style={{ borderColor: `${accent}45` }}
            >
              {/* Mini Report Header */}
              <div
                className="flex items-center justify-between rounded-[4px] px-2.5 py-1.5 text-[11px] font-bold text-white"
                style={{
                  background: `linear-gradient(to left, ${accent} 0%, ${secondary} 100%)`,
                }}
              >
                <span className="truncate">
                  {template.headerConfig.reportTitle || 'بطاقة تقرير وتتبع الفرض المحروس'}
                </span>
                <span className="font-mono text-[10px] tabular-nums shrink-0 opacity-95">
                  {avgScore.toFixed(2)}/20
                </span>
              </div>

              {/* Mini Grade Table Preview */}
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                  <span style={{ color: accent }}>معاينة جدول النقط والترتيب</span>
                  <span className="text-slate-500">
                    {tableHeaderBg === 'solid-accent'
                      ? 'رأس معبأ'
                      : tableHeaderBg === 'tinted'
                      ? 'رأس مظلل'
                      : 'رأس محايد'}
                  </span>
                </div>
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="font-bold" style={previewTableHeaderStyle}>
                      <th className="border border-slate-300/80 px-1.5 py-1 text-center w-8">ر.ت</th>
                      <th className="border border-slate-300/80 px-2 py-1 text-right">اسم التلميذ(ة)</th>
                      <th className="border border-slate-300/80 px-1.5 py-1 text-center w-14">النقطة</th>
                      <th className="border border-slate-300/80 px-1.5 py-1 text-center w-16">التقدير</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => {
                      const isPass = row.score >= template.passThreshold;
                      const isEven = idx % 2 === 1;
                      return (
                        <tr
                          key={`${row.fullName}-${idx}`}
                          style={
                            isEven
                              ? {
                                  backgroundColor: tableStripeTint ? `${accent}0a` : '#f8fafc',
                                }
                              : undefined
                          }
                        >
                          <td className="border border-slate-200 px-1.5 py-1 text-center font-mono tabular-nums text-slate-600">
                            {row.order}
                          </td>
                          <td className="border border-slate-200 px-2 py-1 font-semibold text-slate-900 truncate max-w-[110px]">
                            {row.fullName}
                          </td>
                          <td
                            className="border border-slate-200 px-1.5 py-1 text-center font-mono font-bold tabular-nums"
                            style={{ color: isPass ? secondary : '#b91c1c' }}
                          >
                            {row.score.toFixed(2)}
                          </td>
                          <td className="border border-slate-200 px-1.5 py-1 text-center text-[9.5px] font-semibold text-slate-700">
                            {row.appreciation}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mini Exported Chart Preview (Bars + Gauss Curve) */}
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold">
                  <span style={{ color: accent }}>معاينة المبيان ومنحنى غوص</span>
                  <span
                    className="font-mono text-[9.5px] tabular-nums"
                    style={{ color: secondary }}
                    dir="ltr"
                  >
                    μ={avgScore.toFixed(2)} · σ={stdDev.toFixed(2)}
                  </span>
                </div>
                <div
                  className="rounded border bg-slate-50/50 p-1.5"
                  style={{ borderColor: `${accent}26` }}
                  dir="ltr"
                >
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-[92px] w-full overflow-visible">
                    {/* Horizontal grid lines */}
                    {[0.25, 0.5, 0.75, 1].map((r) => {
                      const y = padTop + plotH * (1 - r);
                      return (
                        <line
                          key={r}
                          x1={padX}
                          y1={y}
                          x2={padX + plotW}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeWidth={0.8}
                          strokeDasharray="2 2"
                        />
                      );
                    })}

                    {/* Bracket Bars */}
                    {previewBars.items.map((bar, idx) => {
                      const slotW = plotW / Math.max(1, previewBars.items.length);
                      const barW = Math.min(34, slotW * 0.58);
                      const cx = padX + slotW * idx + slotW / 2;
                      const bh = Math.max(4, (bar.count / previewBars.maxCount) * (plotH * 0.85));
                      const y = padTop + plotH - bh;
                      return (
                        <g key={bar.id}>
                          <rect
                            x={cx - barW / 2}
                            y={y}
                            width={barW}
                            height={bh}
                            rx={2.5}
                            fill={bar.color}
                            fillOpacity={0.78}
                          />
                          <text
                            x={cx}
                            y={Math.max(10, y - 3)}
                            textAnchor="middle"
                            fontSize="7.5"
                            fontWeight="700"
                            fill="#334155"
                            fontFamily="monospace"
                          >
                            {bar.count}
                          </text>
                          <text
                            x={cx}
                            y={padTop + plotH + 12}
                            textAnchor="middle"
                            fontSize="7"
                            fontWeight="600"
                            fill="#475569"
                            fontFamily="monospace"
                          >
                            {bar.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Gaussian Curve Overlay */}
                    <path
                      d={curvePath}
                      fill="none"
                      stroke={accent}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />

                    {/* Mean Vertical Line */}
                    <line
                      x1={meanX}
                      y1={padTop}
                      x2={meanX}
                      y2={padTop + plotH}
                      stroke={secondary}
                      strokeWidth={1.4}
                      strokeDasharray="3 2"
                    />

                    {/* Baseline */}
                    <line
                      x1={padX}
                      y1={padTop + plotH}
                      x2={padX + plotW}
                      y2={padTop + plotH}
                      stroke="#94a3b8"
                      strokeWidth={1}
                    />
                  </svg>
                </div>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] leading-relaxed text-slate-600">
              تُطبَّق تلقائياً على: تقارير PDF · ملف Word · جداول النقط · الرسوم البيانية · ملخص المجلس التعليمي
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
