import React from 'react';
import { ReportFrameStyle, TemplateStyleConfig } from '../types/report';

export function resolveReportFrameStyle(styleConfig: TemplateStyleConfig): ReportFrameStyle {
  if (styleConfig.frameStyle) {
    return styleConfig.frameStyle;
  }
  if (!styleConfig.showOuterFrame) {
    return 'none';
  }
  return styleConfig.borderStyle === 'official-double' ? 'classic-double' : 'double-inset';
}

interface ReportSheetFrameProps {
  styleConfig: TemplateStyleConfig;
  dir?: 'rtl' | 'ltr';
  className?: string;
  innerPaddingClass?: string;
  sheetRef?: React.Ref<HTMLElement>;
  children: React.ReactNode;
}

/**
 * Architectural A4 paper frame wrapper.
 * Renders the chosen institutional border cleanly inside a 4.5mm print-safe paper margin
 * so printer bleed margins never clip the frame while keeping exact 210mm x 296mm geometry.
 */
export const ReportSheetFrame: React.FC<ReportSheetFrameProps> = ({
  styleConfig,
  dir = 'rtl',
  className = '',
  innerPaddingClass = 'p-[4.5mm]',
  sheetRef,
  children,
}) => {
  const accent = styleConfig.accentColor || '#1e3a8a';
  const secondary = styleConfig.secondaryAccent || '#0f766e';
  const frameStyle = resolveReportFrameStyle(styleConfig);

  if (frameStyle === 'none') {
    return (
      <article
        ref={sheetRef}
        dir={dir}
        className={`report-sheet mx-auto flex w-[210mm] flex-col justify-between overflow-hidden bg-white p-[8mm] text-slate-900 shadow-sm print:shadow-none ${className}`}
      >
        {children}
      </article>
    );
  }

  if (frameStyle === 'top-bottom-bands') {
    return (
      <article
        ref={sheetRef}
        dir={dir}
        className={`report-sheet mx-auto flex w-[210mm] flex-col justify-between overflow-hidden bg-white text-slate-900 shadow-sm print:shadow-none ${className}`}
      >
        <div
          className="h-[3.5px] w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, ${accent} 0%, ${secondary} 100%)`,
          }}
        />
        <div className="flex flex-1 min-h-0 flex-col justify-between px-[8mm] py-[6mm]">
          {children}
        </div>
        <div
          className="h-[2.5px] w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, ${secondary} 0%, ${accent} 100%)`,
          }}
        />
      </article>
    );
  }

  if (frameStyle === 'classic-double') {
    return (
      <article
        ref={sheetRef}
        dir={dir}
        className={`report-sheet mx-auto flex w-[210mm] flex-col overflow-hidden bg-white p-[4.5mm] text-slate-900 shadow-sm print:shadow-none ${className}`}
      >
        <div
          className={`flex flex-1 min-h-0 flex-col justify-between ${innerPaddingClass}`}
          style={{
            border: `4px double ${accent}`,
          }}
        >
          {children}
        </div>
      </article>
    );
  }

  if (frameStyle === 'royal-corners') {
    return (
      <article
        ref={sheetRef}
        dir={dir}
        className={`report-sheet mx-auto flex w-[210mm] flex-col overflow-hidden bg-white p-[4.5mm] text-slate-900 shadow-sm print:shadow-none ${className}`}
      >
        <div
          className="relative flex flex-1 min-h-0 flex-col p-[2.5px]"
          style={{
            border: `1.25px solid ${accent}66`,
          }}
        >
          {/* Architectural Corner Brackets */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[1.5px] -right-[1.5px] h-4 w-4"
            style={{
              borderTop: `2.5px solid ${accent}`,
              borderRight: `2.5px solid ${accent}`,
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-[1.5px] -left-[1.5px] h-4 w-4"
            style={{
              borderTop: `2.5px solid ${accent}`,
              borderLeft: `2.5px solid ${accent}`,
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[1.5px] -right-[1.5px] h-4 w-4"
            style={{
              borderBottom: `2.5px solid ${accent}`,
              borderRight: `2.5px solid ${accent}`,
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[1.5px] -left-[1.5px] h-4 w-4"
            style={{
              borderBottom: `2.5px solid ${accent}`,
              borderLeft: `2.5px solid ${accent}`,
            }}
          />

          <div
            className={`flex flex-1 min-h-0 flex-col justify-between ${innerPaddingClass}`}
            style={{
              border: `0.75px solid ${secondary}45`,
            }}
          >
            {children}
          </div>
        </div>
      </article>
    );
  }

  // Default: 'double-inset' — refined ministerial double-hairline frame with top dual-tone accent bar
  return (
    <article
      ref={sheetRef}
      dir={dir}
      className={`report-sheet mx-auto flex w-[210mm] flex-col overflow-hidden bg-white p-[4.5mm] text-slate-900 shadow-sm print:shadow-none ${className}`}
    >
      <div
        className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-[2px] p-[2.5px]"
        style={{
          border: `1.5px solid ${accent}`,
        }}
      >
        <div
          className="h-[2.5px] w-full shrink-0 mb-[2px]"
          style={{
            background: `linear-gradient(90deg, ${accent} 0%, ${secondary} 100%)`,
          }}
        />
        <div
          className={`flex flex-1 min-h-0 flex-col justify-between ${innerPaddingClass}`}
          style={{
            border: `0.75px solid ${accent}4d`,
          }}
        >
          {children}
        </div>
      </div>
    </article>
  );
};
