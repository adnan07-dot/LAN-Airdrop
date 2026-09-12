import React, { useState, useEffect } from 'react';
import { Send, Plus, ArrowRight, Camera, Shield, Zap, FolderUp, Globe, Sparkles } from 'lucide-react';

export default function RoomHero({
  onCreateRoom,
  onJoinRoom,
  onOpenQRScanner,
  initialRoomCode = '',
  lanAddresses = []
}) {
  const [roomInput, setRoomInput] = useState(initialRoomCode);
  const [peerNameInput, setPeerNameInput] = useState('');

  useEffect(() => {
    if (initialRoomCode) {
      setRoomInput(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    onJoinRoom(roomInput.trim().toUpperCase(), peerNameInput.trim());
  };

  const handleCreateSubmit = () => {
    onCreateRoom(peerNameInput.trim());
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-6 shadow-sm">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Direct Local Network WebRTC Sharing</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-center text-slate-900 dark:text-slate-100 max-w-2xl leading-tight">
        Share Files Instantly Between Devices{' '}
        <span className="bg-gradient-to-r from-brand-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
          Without the Cloud
        </span>
      </h1>

      <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 text-center max-w-xl">
        Send photos, videos, and large folders directly browser-to-browser via WebRTC data channels. 
        Zero server storage, no file size caps, and encrypted end-to-end.
      </p>

      {/* Interactive Cards: Create or Join */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-10">
        {/* Card 1: Create Room */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-brand-500/40 transition-all shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-500/20 transition-all" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-lg">
                Host
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create a New Room</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Generates a shareable room PIN and mobile pairing QR code.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Your Nickname (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Swift Falcon"
                value={peerNameInput}
                onChange={(e) => setPeerNameInput(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl glass-input"
              />
            </div>

            <button
              onClick={handleCreateSubmit}
              className="w-full btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Room Now</span>
            </button>
          </div>
        </div>

        {/* Card 2: Join Room */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-cyan-500/40 transition-all shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Send className="w-6 h-6 -rotate-12" />
              </div>
              <button
                onClick={onOpenQRScanner}
                className="flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-xl border border-cyan-500/20 transition-all cursor-pointer"
                title="Scan QR with Camera"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan QR</span>
              </button>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Join Existing Room</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Enter the 6-character room PIN or scan a peer's QR code.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="mt-6 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Enter 6-Digit Room Code:
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. ABC789"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
                  className="w-full text-sm font-mono font-bold tracking-widest uppercase py-2.5 px-3.5 rounded-xl glass-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!roomInput.trim()}
              className="w-full btn-primary bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-cyan-500/25"
            >
              <span>Join Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Feature Value Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mt-10">
        <div className="glass-card p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Full Wi-Fi Speed</div>
            <div className="text-[10px] text-slate-500">Direct LAN routing</div>
          </div>
        </div>

        <div className="glass-card p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">DTLS Encrypted</div>
            <div className="text-[10px] text-slate-500">E2E secure tunnel</div>
          </div>
        </div>

        <div className="glass-card p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
            <FolderUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Folder & Multi-File</div>
            <div className="text-[10px] text-slate-500">Drag & drop queue</div>
          </div>
        </div>

        <div className="glass-card p-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Zero Cloud Data</div>
            <div className="text-[10px] text-slate-500">Pure P2P channels</div>
          </div>
        </div>
      </div>
    </div>
  );
}
