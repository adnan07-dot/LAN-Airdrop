import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldCheck, ArrowRightLeft } from 'lucide-react';

export default function StatusBadge({ status, peerCount = 0 }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'transferring':
        return {
          icon: ArrowRightLeft,
          label: 'Transferring Data',
          colors: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
          dot: 'bg-cyan-500 animate-pulse'
        };
      case 'connected':
        return {
          icon: CheckCircle2,
          label: peerCount > 0 ? `${peerCount} Peer${peerCount > 1 ? 's' : ''} Connected` : 'Ready for Peers',
          colors: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500'
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          label: 'Handshaking...',
          colors: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500 animate-spin'
        };
      case 'waiting':
        return {
          icon: Wifi,
          label: 'Waiting for Peer to Join',
          colors: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-500 animate-ping'
        };
      case 'error':
        return {
          icon: WifiOff,
          label: 'Connection Error',
          colors: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500'
        };
      case 'idle':
      default:
        return {
          icon: WifiOff,
          label: 'Not in Room',
          colors: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
          dot: 'bg-slate-400'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${config.colors} backdrop-blur-md transition-all shadow-sm`}>
      <span className="relative flex h-2 w-2">
        <span className={`inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </div>
  );
}
