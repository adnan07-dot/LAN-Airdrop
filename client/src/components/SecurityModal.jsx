import React from 'react';
import { ShieldCheck, X, Server, Radio, Lock, Zap, CheckCircle2 } from 'lucide-react';

export default function SecurityModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">End-to-End Encrypted</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Direct Browser-to-Browser Transport</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Native DTLS 1.2 / 1.3 Encryption</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All binary file data is encrypted using WebRTC's cryptographic DTLS handshake before leaving your device. No third party or ISP can intercept file contents.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Server className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Zero Server Storage (Stateless Signaling)</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  The signaling server only passes connection requests (SDP & ICE). File bytes <strong>never</strong> pass through, touch, or get stored on any cloud server or database.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100">Direct Local Wi-Fi Speeds</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  When devices are on the same Wi-Fi network, WebRTC routes directly across your LAN at full router speed without consuming internet upload bandwidth.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified Direct WebRTC DataChannel</span>
            </div>
            <button
              onClick={onClose}
              className="btn-primary py-2 px-4 text-xs font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
