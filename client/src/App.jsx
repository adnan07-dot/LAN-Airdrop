import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import RoomHero from './components/RoomHero';
import PeerList from './components/PeerList';
import DropZone from './components/DropZone';
import TransferQueue from './components/TransferQueue';
import ReceivedFiles from './components/ReceivedFiles';
import RoomModal from './components/RoomModal';
import QRScannerModal from './components/QRScannerModal';
import SecurityModal from './components/SecurityModal';
import Toast from './components/Toast';

import { signalingService } from './services/socket';
import { WebRTCManager } from './services/webrtc';
import { detectDevice, generateId, triggerSuccessConfetti } from './services/utils';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  // Room & Peer State
  const [roomCode, setRoomCode] = useState('');
  const [self, setSelf] = useState(null);
  const [peers, setPeers] = useState([]);
  const [peerStatuses, setPeerStatuses] = useState({});
  const [selectedPeerIds, setSelectedPeerIds] = useState([]);
  const [lanAddresses, setLanAddresses] = useState([]);

  // File Transfer State
  const [stagedFiles, setStagedFiles] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [receivedFiles, setReceivedFiles] = useState([]);

  // UI Modals & Toasts
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const webrtcManagerRef = useRef(null);

  // Apply Dark/Light theme class to html root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const addToast = (type, title, message) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch host LAN info from server
  useEffect(() => {
    const fetchLanInfo = async () => {
      try {
        const signalingUrl = signalingService.serverUrl;
        const res = await fetch(`${signalingUrl}/api/lan-info`);
        if (res.ok) {
          const data = await res.json();
          if (data.lanAddresses) {
            setLanAddresses(data.lanAddresses);
          }
        }
      } catch (e) {
        // Fallback or offline
      }
    };
    fetchLanInfo();
  }, []);

  // Initialize WebRTC Manager & Socket.io Handshake Handlers
  useEffect(() => {
    const manager = new WebRTCManager({
      onPeerStatusChange: (peerId, status, peerInfo) => {
        setPeerStatuses(prev => ({ ...prev, [peerId]: status }));
        if (status === 'connected') {
          addToast('success', 'Direct P2P Ready', `${peerInfo?.peerName || 'Device'} is connected directly.`);
        } else if (status === 'relay') {
          addToast('info', 'Secure Relay Ready', `${peerInfo?.peerName || 'Device'} is ready for streaming transfer.`);
        } else if (status === 'failed') {
          addToast('warning', 'P2P Notice', `Direct channel encountered network restrictions. Relay active.`);
        }
      },
      onTransferProgress: (progressData) => {
        setTransfers(prev => {
          const index = prev.findIndex(t => t.transferId === progressData.transferId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...progressData };
            return updated;
          } else {
            return [progressData, ...prev];
          }
        });
      },
      onFileReceived: (fileData) => {
        setReceivedFiles(prev => [fileData, ...prev]);
        triggerSuccessConfetti();
        addToast('success', 'File Received!', `"${fileData.name}" transferred directly.`);
      },
      onError: (errorMsg) => {
        addToast('error', 'Connection Error', errorMsg);
      }
    });

    webrtcManagerRef.current = manager;

    // Connect signaling client
    signalingService.connect();

    // Socket: Room Joined
    const unsubRoomJoined = signalingService.on('room-joined', ({ roomCode: joinedCode, self: selfData, peers: existingPeers }) => {
      setRoomCode(joinedCode);
      setSelf(selfData);
      setPeers(existingPeers);
      
      // Auto-select all existing peers
      const peerIds = existingPeers.map(p => p.socketId);
      setSelectedPeerIds(peerIds);

      // Trigger WebRTC connections to all existing peers in the room
      existingPeers.forEach(peer => {
        manager.connectToPeer(peer.socketId, peer);
      });

      addToast('info', 'Joined Room', `Room ${joinedCode} active with ${existingPeers.length} other peer(s).`);
    });

    // Socket: Remote Peer Joined (Fires on Host when Joiner joins)
    const unsubPeerJoined = signalingService.on('peer-joined', (newPeer) => {
      setPeers(prev => {
        if (prev.some(p => p.socketId === newPeer.socketId)) return prev;
        return [...prev, newPeer];
      });
      setSelectedPeerIds(prev => {
        if (prev.includes(newPeer.socketId)) return prev;
        return [...prev, newPeer.socketId];
      });
      addToast('info', 'Device Joined', `"${newPeer.peerName}" joined the room.`);
    });

    // Socket: Remote Peer Left
    const unsubPeerLeft = signalingService.on('peer-left', ({ socketId, peerName }) => {
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
      setSelectedPeerIds(prev => prev.filter(id => id !== socketId));
      setPeerStatuses(prev => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      addToast('warning', 'Device Left', `"${peerName}" left the room.`);
    });

    // Socket: Error message
    const unsubError = signalingService.on('error-message', ({ message }) => {
      addToast('error', 'Room Error', message);
    });

    // Auto-join from URL parameter if present (e.g. ?room=XYZ123)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      const dev = detectDevice();
      signalingService.joinRoom(roomParam.toUpperCase(), '', dev.type);
    }

    return () => {
      if (typeof unsubRoomJoined === 'function') unsubRoomJoined();
      if (typeof unsubPeerJoined === 'function') unsubPeerJoined();
      if (typeof unsubPeerLeft === 'function') unsubPeerLeft();
      if (typeof unsubError === 'function') unsubError();
      manager.destroy();
    };
  }, []);

  // Room Actions
  const handleCreateRoom = (peerName) => {
    const dev = detectDevice();
    signalingService.joinRoom('', peerName, dev.type);
    setIsRoomModalOpen(true);
  };

  const handleJoinRoom = (code, peerName) => {
    const dev = detectDevice();
    signalingService.joinRoom(code, peerName, dev.type);
  };

  const handleLeaveRoom = () => {
    signalingService.leaveRoom();
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.destroy();
    }
    setRoomCode('');
    setSelf(null);
    setPeers([]);
    setPeerStatuses({});
    setSelectedPeerIds([]);
    setStagedFiles([]);
    addToast('info', 'Left Room', 'You have disconnected from the room.');
  };

  // Peer Selection
  const handleTogglePeerSelection = (peerId) => {
    setSelectedPeerIds(prev => 
      prev.includes(peerId) ? prev.filter(id => id !== peerId) : [...prev, peerId]
    );
  };

  const handleSelectAllPeers = (selectAll) => {
    if (selectAll) {
      setSelectedPeerIds(peers.map(p => p.socketId));
    } else {
      setSelectedPeerIds([]);
    }
  };

  // Staging Files
  const handleFilesAdded = (newFiles) => {
    setStagedFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveStagedFile = (index) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearStagedFiles = () => {
    setStagedFiles([]);
  };

  // Send Staged Files
  const handleSendFiles = async () => {
    if (stagedFiles.length === 0) return;

    let targetIds = [...selectedPeerIds];
    if (targetIds.length === 0 && peers.length > 0) {
      targetIds = peers.map(p => p.socketId);
    }

    if (targetIds.length === 0) {
      addToast('warning', 'No Peer Selected', 'Please select at least one recipient device.');
      return;
    }

    const filesToSend = [...stagedFiles];
    setStagedFiles([]); // Clear staging tray

    for (const file of filesToSend) {
      const fileId = generateId();
      try {
        await webrtcManagerRef.current.sendFile(file, targetIds, fileId);
      } catch (err) {
        console.error('Send error:', err);
        addToast('error', 'Transfer Failed', `Failed to send "${file.name}": ${err.message}`);
      }
    }
  };

  // Flow Control
  const handlePauseTransfer = (fileId) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.pauseTransfer(fileId);
    }
  };

  const handleResumeTransfer = (fileId) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.resumeTransfer(fileId);
    }
  };

  const handleCancelTransfer = (fileId) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cancelTransfer(fileId);
    }
  };

  // Calculate Overall Connection Status
  const isAnyTransferring = transfers.some(t => t.status === 'transferring');
  let connectionStatus = 'idle';
  if (roomCode) {
    if (isAnyTransferring) {
      connectionStatus = 'transferring';
    } else if (peers.length > 0) {
      const anyConnected = Object.values(peerStatuses).some(s => s === 'connected' || s === 'relay');
      connectionStatus = anyConnected ? 'connected' : 'connecting';
    } else {
      connectionStatus = 'waiting';
    }
  }

  const incomingTransfers = transfers.filter(t => t.direction === 'incoming' && t.status === 'transferring');

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-brand-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        roomCode={roomCode}
        peerCount={peers.length}
        connectionStatus={connectionStatus}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!roomCode ? (
          /* Hero / Pairing Screen */
          <RoomHero
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            initialRoomCode={new URLSearchParams(window.location.search).get('room') || ''}
            lanAddresses={lanAddresses}
          />
        ) : (
          /* Active Room Dashboard */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top: Connected Peers Matrix */}
            <PeerList
              self={self}
              peers={peers}
              peerStatuses={peerStatuses}
              selectedPeerIds={selectedPeerIds}
              onTogglePeerSelection={handleTogglePeerSelection}
              onSelectAllPeers={handleSelectAllPeers}
              onOpenRoomModal={() => setIsRoomModalOpen(true)}
            />

            {/* Middle: File Upload / Drag & Drop DropZone */}
            <DropZone
              stagedFiles={stagedFiles}
              onFilesAdded={handleFilesAdded}
              onRemoveFile={handleRemoveStagedFile}
              onClearFiles={handleClearStagedFiles}
              onSendFiles={handleSendFiles}
              selectedPeerCount={selectedPeerIds.length}
              hasConnectedPeers={peers.length > 0}
            />

            {/* Transfers Queue (Outgoing) */}
            <TransferQueue
              transfers={transfers}
              onPauseTransfer={handlePauseTransfer}
              onResumeTransfer={handleResumeTransfer}
              onCancelTransfer={handleCancelTransfer}
            />

            {/* Received Files & Incoming Stream */}
            <ReceivedFiles
              receivedFiles={receivedFiles}
              incomingTransfers={incomingTransfers}
              onClearReceivedFiles={() => setReceivedFiles([])}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/60 dark:border-slate-800/60 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">LAN AIRDROP</span>
            <span>—</span>
            <span>Zero Server File Storage • End-to-End Encrypted</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsSecurityModalOpen(true)}
              className="hover:text-brand-500 transition-colors"
            >
              Security Architecture
            </button>
            <span>•</span>
            <span>Native WebRTC DataChannel</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        roomCode={roomCode}
        lanAddresses={lanAddresses}
        onCopy={(msg) => addToast('info', 'Copied', msg)}
      />

      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScanSuccess={(code) => handleJoinRoom(code, '')}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
