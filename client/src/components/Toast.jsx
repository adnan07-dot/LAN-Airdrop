import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export default function Toast({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const getStyles = () => {
          switch (toast.type) {
            case 'success':
              return {
                icon: CheckCircle2,
                colors: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              };
            case 'error':
              return {
                icon: XCircle,
                colors: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
              };
            case 'warning':
              return {
                icon: AlertTriangle,
                colors: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30'
              };
            case 'info':
            default:
              return {
                icon: Info,
                colors: 'bg-brand-500/10 text-brand-800 dark:text-brand-300 border-brand-500/30'
              };
          }
        };

        const config = getStyles();
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${config.colors} backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 shadow-xl shadow-slate-950/10 animate-in slide-in-from-bottom-5 duration-300`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              {toast.title && <div className="font-semibold text-slate-900 dark:text-slate-100">{toast.title}</div>}
              <div className="text-slate-600 dark:text-slate-300">{toast.message}</div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
