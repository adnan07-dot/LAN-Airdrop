import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, X, Smartphone, Globe, Share2, Info } from 'lucide-react';

export default function RoomModal({
  isOpen,
  onClose,
  roomCode,
  lanAddresses = [],
  onCopy
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedHost, setSelectedHost] = useState('');

  const isPublicDomain = typeof window !== 'undefined' && 
    !['localhost', '127.0.0.1'].includes(window.location.hostname) &&
    !/^192\.168\./.test(window.location.hostname) &&
    !/^10\./.test(window.location.hostname);

  // In production (e.g. onrender.com), use window.location.host
  // In local development, allow switching between detected LAN Wi-Fi IPs
  useEffect(() => {
    if (isPublicDomain) {
      setSelectedHost(window.location.host);
    } else if (lanAddresses.length > 0) {
      setSelectedHost(`${lanAddresses[0].ip}:5173`);
    } else {
      setSelectedHost(window.location.host || 'localhost:5173');
    }
  }, [lanAddresses, isPublicDomain]);

  if (!isOpen || !roomCode) return null;

  const protocol = window.location.protocol || 'http:';
  const joinUrl = `${protocol}//${selectedHost || window.location.host}/?room=${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    if (onCopy) onCopy('Join link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    if (onCopy) onCopy(`Room code ${roomCode} copied!`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Pair With Mobile Device</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scan or share to connect instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner my-2">
          <div className="p-2 bg-white rounded-xl">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              level="M"
              includeMargin={false}
              className="w-44 h-44"
            />
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-500 text-center">
            Scan using your phone's camera app
          </p>
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center justify-between p-3 mt-4 rounded-xl bg-slate-100/90 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Room Code</span>
            <div className="text-xl font-mono font-extrabold tracking-widest text-brand-600 dark:text-brand-400">
              {roomCode}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className="btn-secondary py-1.5 px-3 text-xs"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy PIN'}</span>
          </button>
        </div>

        {/* LAN IP Network Selector (shown ONLY when developing locally on LAN) */}
        {!isPublicDomain && lanAddresses.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-500" />
              <span>Wi-Fi Network Address for Mobile:</span>
            </label>
            <select
              value={selectedHost}
              onChange={(e) => setSelectedHost(e.target.value)}
              className="w-full text-xs font-mono py-2 px-3 rounded-xl glass-input cursor-pointer"
            >
              {lanAddresses.map((net, idx) => (
                <option key={idx} value={`${net.ip}:5173`}>
                  {net.ip}:5173 ({net.interface})
                </option>
              ))}
              <option value={window.location.host || 'localhost:5173'}>
                {window.location.host || 'localhost:5173'} (Localhost)
              </option>
            </select>
          </div>
        )}

        {/* Share Link Action */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="flex-1 text-xs font-mono py-2 px-3 rounded-xl glass-input text-slate-500 truncate"
          />
          <button
            onClick={handleCopyLink}
            className="btn-primary py-2 px-3.5 text-xs whitespace-nowrap"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Info Tip */}
        <div className="mt-4 p-2.5 rounded-xl bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <span>
            {isPublicDomain 
              ? 'Works globally across any network, Wi-Fi, or cellular connection!' 
              : 'Make sure your phone and laptop are connected to the same Wi-Fi router.'}
          </span>
        </div>
      </div>
    </div>
  );
}
