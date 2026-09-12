import React from 'react';
import { ArrowUpRight, Pause, Play, X, CheckCircle2, AlertTriangle, Clock, Zap } from 'lucide-react';
import { formatBytes, formatSpeed, formatETA } from '../services/utils';

export default function TransferQueue({
  transfers = [],
  onPauseTransfer,
  onResumeTransfer,
  onCancelTransfer
}) {
  const outgoingTransfers = transfers.filter(t => t.direction === 'outgoing');
  if (outgoingTransfers.length === 0) return null;

  return (
    <div className="glass-panel p-5 rounded-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Outgoing Transfers</h3>
            <p className="text-[11px] text-slate-500">
              {outgoingTransfers.filter(t => t.status === 'transferring').length} active
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Cards */}
      <div className="space-y-3">
        {outgoingTransfers.map((item) => {
          const isTransferring = item.status === 'transferring';
          const isPaused = item.status === 'paused';
          const isCompleted = item.status === 'completed';
          const isCancelled = item.status === 'cancelled';

          return (
            <div
              key={item.transferId}
              className="p-3.5 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80 space-y-2.5"
            >
              {/* Top Row: Name and Action Controls */}
              <div className="flex items-start justify-between gap-3">
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span>{formatBytes(item.transferredBytes || 0)} of {formatBytes(item.size)}</span>
                    <span>•</span>
                    <span className="font-mono font-medium">{item.percent}%</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isTransferring && (
                    <button
                      onClick={() => onPauseTransfer(item.transferId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                      title="Pause Transfer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isPaused && (
                    <button
                      onClick={() => onResumeTransfer(item.transferId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                      title="Resume Transfer"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(isTransferring || isPaused) && (
                    <button
                      onClick={() => onCancelTransfer(item.transferId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                      title="Cancel Transfer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isCompleted && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sent</span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Cancelled</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : isPaused
                      ? 'bg-amber-500'
                      : isCancelled
                      ? 'bg-rose-500'
                      : 'bg-gradient-to-r from-brand-600 via-indigo-500 to-cyan-400'
                  }`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>

              {/* Stats Footer: Speed & ETA */}
              {(isTransferring || isPaused) && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-brand-500" />
                    <span>{isPaused ? 'Paused' : formatSpeed(item.speed)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>ETA: {formatETA(item.eta)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
