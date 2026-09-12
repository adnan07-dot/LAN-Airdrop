import React, { useRef, useState, useEffect } from 'react';
import { Upload, FolderUp, File, Image as ImageIcon, FileText, Film, Music, Archive, X, Send, AlertCircle } from 'lucide-react';
import { formatBytes } from '../services/utils';

export default function DropZone({
  stagedFiles = [],
  onFilesAdded,
  onRemoveFile,
  onClearFiles,
  onSendFiles,
  selectedPeerCount = 0,
  hasConnectedPeers = false
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Support clipboard paste (e.g. Ctrl+V pasted screenshots or files)
  useEffect(() => {
    const handlePaste = (e) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const filesArray = Array.from(e.clipboardData.files);
        onFilesAdded(filesArray);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesAdded]);

  // Handle Drag Over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // Traverse dropped items (supporting folders recursively)
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const extractedFiles = [];

      const readEntry = async (entry) => {
        if (entry.isFile) {
          return new Promise((resolve) => {
            entry.file((file) => {
              extractedFiles.push(file);
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          return new Promise((resolve) => {
            dirReader.readEntries(async (entries) => {
              for (const childEntry of entries) {
                await readEntry(childEntry);
              }
              resolve();
            });
          });
        }
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            await readEntry(entry);
          }
        } else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) extractedFiles.push(file);
        }
      }

      if (extractedFiles.length > 0) {
        onFilesAdded(extractedFiles);
      }
    } else if (e.dataTransfer.files.length > 0) {
      onFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const getFileIcon = (file) => {
    const type = file.type || '';
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return Film;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf') || type.includes('text') || type.includes('document')) return FileText;
    if (type.includes('zip') || type.includes('rar') || type.includes('tar') || type.includes('7z')) return Archive;
    return File;
  };

  const totalStagedSize = stagedFiles.reduce((acc, f) => acc + f.size, 0);
  const targetCount = selectedPeerCount > 0 ? selectedPeerCount : 1;

  return (
    <div className="glass-panel p-5 rounded-3xl space-y-4">
      {/* Drop Target Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer group ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700/80 hover:border-brand-400 dark:hover:border-brand-500 bg-slate-50/50 dark:bg-slate-950/30'
        }`}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-brand-500/20 transition-all shadow-sm">
          <Upload className="w-7 h-7" />
        </div>

        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
          Drag and drop files or folders here
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          No file size limit. Photos, high-definition videos, raw documents or zip archives.
        </p>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3 mt-4" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="btn-secondary py-1.5 px-3 text-xs"
          >
            <File className="w-3.5 h-3.5 text-brand-500" />
            <span>Select Files</span>
          </button>

          <button
            type="button"
            onClick={() => folderInputRef.current && folderInputRef.current.click()}
            className="btn-secondary py-1.5 px-3 text-xs"
          >
            <FolderUp className="w-3.5 h-3.5 text-indigo-500" />
            <span>Select Folder</span>
          </button>
        </div>
      </div>

      {/* Staged Files Preview Tray */}
      {stagedFiles.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Ready to Send ({stagedFiles.length} item{stagedFiles.length > 1 ? 's' : ''}, {formatBytes(totalStagedSize)})
            </span>
            <button
              onClick={onClearFiles}
              className="text-slate-400 hover:text-rose-500 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {stagedFiles.map((file, idx) => {
              const Icon = getFileIcon(file);
              const isImage = file.type.startsWith('image/');
              const previewUrl = isImage ? URL.createObjectURL(file) : null;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl glass-card border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        onLoad={() => URL.revokeObjectURL(previewUrl)}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatBytes(file.size)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveFile(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Send CTA */}
          <div className="pt-2">
            {!hasConnectedPeers ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs border border-amber-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Waiting for a peer to join before sending. Scan the room QR code on your second device!</span>
              </div>
            ) : (
              <button
                onClick={onSendFiles}
                className="w-full btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 glow-brand cursor-pointer"
              >
                <Send className="w-4 h-4 -rotate-12" />
                <span>
                  Send {stagedFiles.length} File{stagedFiles.length > 1 ? 's' : ''} ({formatBytes(totalStagedSize)}) to {targetCount} Peer{targetCount > 1 ? 's' : ''}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
