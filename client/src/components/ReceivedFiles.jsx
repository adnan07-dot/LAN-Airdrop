import React, { useState } from 'react';
import { Download, CheckCircle2, Image as ImageIcon, FileText, Film, Music, Archive, File, ExternalLink, Eye, X, Zap, Clock } from 'lucide-react';
import { formatBytes, formatSpeed, formatETA } from '../services/utils';

export default function ReceivedFiles({
  receivedFiles = [],
  incomingTransfers = [],
  onClearReceivedFiles
}) {
  const [lightboxImage, setLightboxImage] = useState(null);

  const getFileIcon = (mimeType = '') => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Film;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('document')) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z')) return Archive;
    return File;
  };

  const handleDownloadFile = (file) => {
    const a = document.createElement('a');
    a.href = file.blobUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    receivedFiles.forEach((file, idx) => {
      setTimeout(() => {
        handleDownloadFile(file);
      }, idx * 250);
    });
  };

  if (receivedFiles.length === 0 && incomingTransfers.length === 0) return null;

  return (
    <div className="glass-panel p-5 rounded-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Received Files</h3>
            <p className="text-[11px] text-slate-500">
              {receivedFiles.length} file{receivedFiles.length !== 1 ? 's' : ''} ready to download
            </p>
          </div>
        </div>

        {receivedFiles.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="btn-primary py-1.5 px-3 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All</span>
            </button>
            <button
              onClick={onClearReceivedFiles}
              className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Active Incoming Transfers */}
      {incomingTransfers.map((item) => (
        <div
          key={item.transferId}
          className="p-3.5 rounded-2xl glass-card border border-emerald-500/30 bg-emerald-500/5 space-y-2.5 animate-in fade-in"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                Receiving: {item.name}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                <span>{formatBytes(item.transferredBytes || 0)} of {formatBytes(item.size)}</span>
                <span>•</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{item.percent}%</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Streaming P2P</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-200"
              style={{ width: `${item.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-500" />
              <span>{formatSpeed(item.speed)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>ETA: {formatETA(item.eta)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* List of Completed Received Files */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {receivedFiles.map((file) => {
          const Icon = getFileIcon(file.mimeType);

          return (
            <div
              key={file.fileId}
              className="p-3 rounded-2xl glass-card border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-3 group hover:border-emerald-500/40 transition-all shadow-sm"
            >
              {/* Thumbnail / Icon */}
              <div className="flex items-center gap-3 overflow-hidden">
                {file.isImage ? (
                  <div
                    onClick={() => setLightboxImage(file)}
                    className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer group/img"
                  >
                    <img
                      src={file.blobUrl}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover/img:scale-110 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6" />
                  </div>
                )}

                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {file.name}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-medium">Ready</span>
                  </div>
                </div>
              </div>

              {/* Download Action */}
              <button
                onClick={() => handleDownloadFile(file)}
                className="btn-primary py-2 px-3 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shrink-0"
                title="Download File to Device"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Full-Screen Image Preview Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage.blobUrl}
              alt={lightboxImage.name}
              className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-2xl"
            />
            <div className="mt-4 flex items-center justify-between w-full text-white text-xs px-2">
              <span className="truncate">{lightboxImage.name} ({formatBytes(lightboxImage.size)})</span>
              <button
                onClick={() => handleDownloadFile(lightboxImage)}
                className="btn-primary py-1.5 px-3 text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Save Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
