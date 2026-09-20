import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Monitor, Sparkles, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../utils/imageUtils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(display-mode: standalone)').matches;
    }
    return false;
  });

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    triggerHaptic('light');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        onClose();
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-slate-900 light:bg-white border border-slate-700 light:border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <Download className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white light:text-slate-900">Install StockAudit App</h3>
              <p className="text-xs text-slate-400 light:text-slate-500">Run fullscreen on Laptop, Tablet & Mobile</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white light:hover:text-slate-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-click Native install if browser supports prompt */}
        {deferredPrompt && (
          <div className="bg-emerald-500/15 light:bg-emerald-50 border border-emerald-500/30 rounded-2xl p-4 space-y-2 text-center">
            <Sparkles className="w-6 h-6 text-emerald-400 mx-auto" />
            <h4 className="text-xs font-bold text-emerald-400 light:text-emerald-700">Ready to Install in 1-Click</h4>
            <p className="text-[11px] text-slate-300 light:text-slate-600">
              Install directly to your device desktop/home screen with offline warehouse support!
            </p>
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition"
            >
              Install StockAudit Application Now
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="bg-emerald-500/10 light:bg-emerald-50 border border-emerald-500/30 text-emerald-400 light:text-emerald-700 p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Application is already installed on this device!</span>
          </div>
        )}

        {/* Instructions for Desktop and Mobile */}
        <div className="space-y-3 pt-1">
          <div className="bg-slate-800/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white light:text-slate-900">
              <Monitor className="w-4 h-4 text-blue-400" />
              <span>On Laptop / Desktop (Chrome, Edge, Brave)</span>
            </div>
            <p className="text-[11px] text-slate-300 light:text-slate-600 leading-relaxed">
              Click the <strong>Install icon</strong> in your browser address bar (top right corner 🖥️) or open the browser menu <strong className="text-emerald-400">⋮</strong> &rarr; select <strong className="text-emerald-400">&quot;Install StockAudit&quot;</strong>.
            </p>
          </div>

          <div className="bg-slate-800/80 light:bg-slate-50 border border-slate-700/80 light:border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white light:text-slate-900">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>On Mobile (Android & iOS)</span>
            </div>
            <ul className="text-[11px] text-slate-300 light:text-slate-600 space-y-1 list-disc pl-4">
              <li><strong>Android (Chrome):</strong> Tap menu <strong className="text-emerald-400">⋮</strong> &rarr; <strong className="text-emerald-400">&quot;Install app&quot;</strong> or &quot;Add to Home screen&quot;.</li>
              <li><strong>iPhone (Safari):</strong> Tap Share <strong className="text-blue-400">⬆</strong> &rarr; <strong className="text-blue-400">&quot;Add to Home Screen&quot;</strong>.</li>
            </ul>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 light:bg-slate-200 hover:bg-slate-700 light:hover:bg-slate-300 text-slate-200 light:text-slate-800 font-semibold text-xs transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

