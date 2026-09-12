import React from 'react';
import { Send, Sun, Moon, ShieldCheck, LogOut, QrCode, Wifi } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function Navbar({
  theme,
  toggleTheme,
  roomCode,
  peerCount,
  connectionStatus,
  onOpenSecurityModal,
  onOpenRoomModal,
  onLeaveRoom
}) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-brand-500/30">
            <Send className="w-5 h-5 -rotate-12 translate-x-0.5 -translate-y-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-brand-600 via-indigo-500 to-cyan-500 dark:from-brand-400 dark:via-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
                LAN AIRDROP
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                P2P
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Direct Browser-to-Browser Transfer
            </p>
          </div>
        </div>

        {/* Center: Live WebRTC Status */}
        <div className="hidden sm:flex items-center gap-3">
          <StatusBadge status={connectionStatus} peerCount={peerCount} />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* DTLS Badge */}
          <button
            onClick={onOpenSecurityModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
            title="End-to-End DTLS Encrypted"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden md:inline">DTLS Encrypted</span>
          </button>

          {/* Active Room Badge */}
          {roomCode && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenRoomModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-all cursor-pointer"
                title="View Room QR & Info"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{roomCode}</span>
              </button>

              <button
                onClick={onLeaveRoom}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                title="Leave Room"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
