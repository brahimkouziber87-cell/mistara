import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Share,
  SlidersHorizontal,
  WifiOff,
  X,
} from 'lucide-react';
import { AppStep } from '../types/report';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface MobilePWABarProps {
  activeStep: AppStep;
  onSelectStep: (step: AppStep) => void;
  hasStudents: boolean;
}

const DISMISS_STORAGE_KEY = 'mistara_pwa_banner_dismissed_v1';

export const MobilePWABar: React.FC<MobilePWABarProps> = ({
  activeStep,
  onSelectStep,
  hasStudents,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    if (!showInstallModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInstallModal(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showInstallModal]);

  const showInstallControl = !isInstalled && !bannerDismissed;

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <>
      {/* Offline mode indicator */}
      {!isOnline && (
        <div
          role="status"
          className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900"
        >
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2">
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-700" />
              وضع العمل بدون إنترنت — التطبيق يعمل محلياً وجميع بياناتك محفوظة على جهازك.
            </span>
          </div>
        </div>
      )}

      {/* Non-intrusive, dismissible PWA install banner */}
      {showInstallControl && (
        <div className="no-print border-b border-slate-200 bg-slate-100/80 px-4 py-1.5">
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-700 min-w-0">
              <img
                src="/assets/aistudio/Sans_titre2_564d6d53.png"
                alt="أيقونة التطبيق"
                referrerPolicy="no-referrer"
                className="h-5 w-5 shrink-0 rounded-full object-contain"
              />
              <span className="truncate font-semibold text-slate-800">
                ثبّت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-300 px-2.5 py-1 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-50 hover:border-teal-600 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="h-3 w-3" />
                {isInstallable ? 'تثبيت الآن' : 'طريقة التثبيت'}
              </button>
              <button
                type="button"
                aria-label="إغلاق شريط التثبيت"
                onClick={handleDismissBanner}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install instructions modal for iOS Safari & mobile browsers */}
      {showInstallModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInstallModal(false);
          }}
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-xs sm:items-center"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/Sans_titre2_564d6d53.png"
                  alt="أيقونة التطبيق"
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 shrink-0 rounded-full object-contain shadow-xs"
                />
                <div>
                  <h3 id="pwa-install-title" className="text-base font-bold text-slate-900">
                    تثبيت التطبيق على الهاتف
                  </h3>
                  <p className="text-xs text-slate-500">
                    يعمل كتطبيق مستقل بشاشة كاملة ويدعم العمل بدون إنترنت
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                onClick={() => setShowInstallModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
              {isIOS ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                  <div className="font-bold text-slate-900">على أجهزة iPhone و iPad (متصفح Safari):</div>
                  <ol className="list-decimal space-y-1.5 pr-4">
                    <li>
                      اضغط على زر المشاركة{' '}
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-800">
                        <Share className="h-3.5 w-3.5 inline" /> (مشاركة / Share)
                      </span>{' '}
                      في الشريط السفلي للمتصفح.
                    </li>
                    <li>
                      مرّر للأسفل واختر{' '}
                      <strong className="text-slate-900">«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      اضغط على <strong className="text-slate-900">«إضافة» (Add)</strong> ليظهر التطبيق مع تطبيقاتك.
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                    <div className="font-bold text-slate-900">على هواتف Android (متصفح Chrome):</div>
                    <ol className="list-decimal space-y-1 pr-4">
                      <li>افتح رابط التطبيق في متصفح Chrome على هاتفك.</li>
                      <li>
                        اضغط على قائمة المتصفح <strong className="text-slate-900">(⋮)</strong> أعلى الشاشة.
                      </li>
                      <li>
                        اختر <strong className="text-slate-900">«تثبيت التطبيق» (Install app)</strong> أو{' '}
                        <strong className="text-slate-900">«الإضافة إلى الشاشة الرئيسية»</strong>.
                      </li>
                    </ol>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                    <div className="font-bold text-slate-900">على أجهزة iPhone (متصفح Safari):</div>
                    <p>
                      اضغط على زر المشاركة <strong className="text-slate-900">Share</strong> ثم اختر{' '}
                      <strong className="text-slate-900">Add to Home Screen (إضافة إلى الشاشة الرئيسية)</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Thumb-Zone Navigation Bar on Mobile (< md) */}
      <nav
        aria-label="التنقل السفلي للهاتف"
        className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid h-14 grid-cols-4 items-center">
          <button
            type="button"
            onClick={() => onSelectStep('massar')}
            className={`relative flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeStep === 'massar'
                ? 'text-teal-800 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            {activeStep === 'massar' && (
              <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 bg-teal-700" />
            )}
            <FileSpreadsheet className="h-4.5 w-4.5" strokeWidth={activeStep === 'massar' ? 2.2 : 1.8} />
            <span className="text-[10.5px] tracking-tight whitespace-nowrap">1. مسار</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStep('customize')}
            className={`relative flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeStep === 'customize'
                ? 'text-teal-800 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            {activeStep === 'customize' && (
              <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 bg-teal-700" />
            )}
            <SlidersHorizontal
              className="h-4.5 w-4.5"
              strokeWidth={activeStep === 'customize' ? 2.2 : 1.8}
            />
            <span className="text-[10.5px] tracking-tight whitespace-nowrap">2. التشخيص</span>
          </button>

          <button
            type="button"
            disabled={!hasStudents}
            onClick={() => onSelectStep('preview')}
            className={`relative flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors ${
              !hasStudents
                ? 'cursor-not-allowed text-slate-300 font-medium'
                : activeStep === 'preview'
                ? 'cursor-pointer text-teal-800 font-bold'
                : 'cursor-pointer text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            {activeStep === 'preview' && (
              <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 bg-teal-700" />
            )}
            <FileText className="h-4.5 w-4.5" strokeWidth={activeStep === 'preview' ? 2.2 : 1.8} />
            <span className="text-[10.5px] tracking-tight whitespace-nowrap">3. التقرير</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStep('analytics')}
            className={`relative flex h-full min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
              activeStep === 'analytics'
                ? 'text-teal-800 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            {activeStep === 'analytics' && (
              <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 bg-teal-700" />
            )}
            <BarChart3 className="h-4.5 w-4.5" strokeWidth={activeStep === 'analytics' ? 2.2 : 1.8} />
            <span className="text-[10.5px] tracking-tight whitespace-nowrap">4. التتبع</span>
          </button>
        </div>
      </nav>
    </>
  );
};
