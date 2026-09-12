import React from 'react';
import { Users, Smartphone, Monitor, Tablet, CheckCircle, Radio, QrCode, CheckSquare, Square, Wifi } from 'lucide-react';
import { getAvatarGradient } from '../services/utils';

export default function PeerList({
  self,
  peers = [],
  peerStatuses = {},
  selectedPeerIds = [],
  onTogglePeerSelection,
  onSelectAllPeers,
  onOpenRoomModal
}) {
  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      case 'desktop':
      default:
        return Monitor;
    }
  };

  const allConnectedSelected = peers.length > 0 && peers.every(p => selectedPeerIds.includes(p.socketId));

  return (
    <div className="glass-panel p-5 rounded-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Devices in Room</h3>
            <p className="text-[11px] text-slate-500">
              {peers.length === 0 ? 'No peers yet' : `${peers.length} active peer${peers.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {peers.length > 1 && (
          <button
            onClick={() => onSelectAllPeers(!allConnectedSelected)}
            className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium cursor-pointer"
          >
            {allConnectedSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            <span>{allConnectedSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
        )}
      </div>

      {/* Grid of Peers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Self Card */}
        {self && (
          <div className="glass-card p-3 rounded-2xl border-brand-500/30 bg-brand-500/5 relative overflow-hidden flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarGradient(self.peerName)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                {self.peerName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{self.peerName}</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-600 dark:text-brand-400">
                    You
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  <Monitor className="w-3 h-3" />
                  <span className="capitalize">{self.deviceType || 'Device'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ready</span>
            </div>
          </div>
        )}

        {/* Remote Connected Peers */}
        {peers.map((peer) => {
          const isSelected = selectedPeerIds.includes(peer.socketId);
          const status = peerStatuses[peer.socketId] || 'connected';
          const DeviceIcon = getDeviceIcon(peer.deviceType);
          const isChannelReady = status === 'connected';

          return (
            <div
              key={peer.socketId}
              onClick={() => onTogglePeerSelection(peer.socketId)}
              className={`glass-card p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                isSelected
                  ? 'border-brand-500 bg-brand-500/10 shadow-md shadow-brand-500/10'
                  : 'hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarGradient(peer.peerName)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                  {peer.peerName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{peer.peerName}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <DeviceIcon className="w-3 h-3" />
                    <span className="capitalize">{peer.deviceType || 'Device'}</span>
                    <span>•</span>
                    <span className={isChannelReady ? 'text-emerald-500' : 'text-amber-500'}>
                      {isChannelReady ? 'Direct P2P' : status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selection Checkbox */}
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                isSelected
                  ? 'bg-brand-600 border-brand-600 text-white'
                  : 'border-slate-300 dark:border-slate-700'
              }`}>
                {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
              </div>
            </div>
          );
        })}

        {/* Empty State: Waiting for Peers */}
        {peers.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-2 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 animate-pulse">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Waiting for other devices to connect...</div>
                <div className="text-[11px] text-slate-500">Scan QR or enter PIN from another phone/PC</div>
              </div>
            </div>

            <button
              onClick={onOpenRoomModal}
              className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5 mr-1 text-brand-500" />
              Show QR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
