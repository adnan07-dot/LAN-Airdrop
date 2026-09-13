import { io } from 'socket.io-client';

/**
 * Determine the optimal signaling server URL.
 * - In local dev (port 5173): Connects to http://<hostname>:3001
 * - In production (e.g. Render, Railway, Vercel): Uses current domain origin (port 443/80)
 */
function getSignalingUrl() {
  if (import.meta.env.VITE_SIGNALING_SERVER_URL) {
    return import.meta.env.VITE_SIGNALING_SERVER_URL;
  }
  
  if (typeof window !== 'undefined') {
    const isDev = window.location.port === '5173' || 
                  (window.location.hostname === 'localhost' && window.location.port !== '3001' && window.location.port !== '');
    if (isDev) {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const hostname = window.location.hostname || 'localhost';
      return `${protocol}//${hostname}:3001`;
    }
    // In production (Render, Railway, etc.), use the same origin
    return window.location.origin;
  }
  
  return 'http://localhost:3001';
}

class SignalingService {
  constructor() {
    this.socket = null;
    this.serverUrl = getSignalingUrl();
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (!this.socket) {
      this.serverUrl = getSignalingUrl();
      console.log(`[Signaling Client] Connecting to: ${this.serverUrl}`);

      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 25,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log(`%c[Signaling Connected]%c Socket ID: ${this.socket.id} to ${this.serverUrl}`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
        this.emitLocal('connected', { socketId: this.socket.id });
      });

      this.socket.on('disconnect', (reason) => {
        console.warn(`[Signaling Client] Disconnected from signaling server: ${reason}`);
        this.emitLocal('disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Signaling Client] Connection error:', error.message);
        this.emitLocal('connect_error', { error: error.message });
      });

      // Bind all existing registered listeners to the newly created socket instance
      for (const [event, callbacks] of this.listeners.entries()) {
        callbacks.forEach(cb => {
          this.socket.on(event, cb);
        });
      }
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  joinRoom(roomCode, peerName, deviceType) {
    const s = this.getSocket();
    s.emit('join-room', { roomCode, peerName, deviceType });
  }

  leaveRoom() {
    if (this.socket) {
      this.socket.emit('leave-room');
    }
  }

  sendOffer(targetPeerId, sdp, senderInfo) {
    const s = this.getSocket();
    s.emit('signal-offer', { targetPeerId, sdp, senderInfo });
  }

  sendAnswer(targetPeerId, sdp) {
    const s = this.getSocket();
    s.emit('signal-answer', { targetPeerId, sdp });
  }

  sendIceCandidate(targetPeerId, candidate) {
    const s = this.getSocket();
    s.emit('signal-ice-candidate', { targetPeerId, candidate });
  }

  // --- Resilient Relay Fallback Socket Methods ---
  sendRelayMetadata(targetPeerId, metadata) {
    const s = this.getSocket();
    s.emit('relay-file-metadata', { targetPeerId, metadata });
  }

  sendRelayChunk(targetPeerId, chunk, fileId, chunkIndex) {
    const s = this.getSocket();
    s.emit('relay-file-chunk', { targetPeerId, chunk, fileId, chunkIndex });
  }

  sendRelayComplete(targetPeerId, fileId) {
    const s = this.getSocket();
    s.emit('relay-file-complete', { targetPeerId, fileId });
  }

  sendRelayCancel(targetPeerId, fileId) {
    const s = this.getSocket();
    s.emit('relay-file-cancel', { targetPeerId, fileId });
  }

  sendRelayPause(targetPeerId, fileId) {
    const s = this.getSocket();
    s.emit('relay-file-pause', { targetPeerId, fileId });
  }

  sendRelayResume(targetPeerId, fileId) {
    const s = this.getSocket();
    s.emit('relay-file-resume', { targetPeerId, fileId });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    // Return unregister callback for clean component unmounts
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emitLocal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in local listener for ${event}:`, e);
        }
      });
    }
  }
}

export const signalingService = new SignalingService();
