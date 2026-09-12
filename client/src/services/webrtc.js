/**
 * LAN AIRDROP — Native WebRTC P2P DataChannel Manager
 * 
 * ============================================================================
 * THE WEBRTC P2P HANDSHAKE FLOW (Step-by-Step Inline Walkthrough):
 * ----------------------------------------------------------------------------
 * 1. [INITIATOR]: Creates RTCPeerConnection with STUN/TURN ICE servers.
 * 2. [INITIATOR]: Creates RTCDataChannel (ordered, reliable, binaryType='arraybuffer').
 * 3. [INITIATOR]: Generates SDP Offer via peerConnection.createOffer().
 * 4. [INITIATOR]: Sets peerConnection.setLocalDescription(offer) and relays 
 *                 the SDP offer to Target Peer via Signaling Server.
 * 5. [RECEIVER]:  Receives SDP Offer from Signaling Server. Sets 
 *                 peerConnection.setRemoteDescription(offer).
 * 6. [RECEIVER]:  Generates SDP Answer via peerConnection.createAnswer(),
 *                 sets peerConnection.setLocalDescription(answer), and relays
 *                 the SDP answer back to Initiator via Signaling Server.
 * 7. [INITIATOR]: Receives SDP Answer and sets peerConnection.setRemoteDescription(answer).
 * 8. [BOTH]:      As ICE candidates are gathered locally (onicecandidate), they are
 *                 relayed via signaling and added to the remote peer via addIceCandidate().
 * 9. [BOTH]:      DataChannel opens (onopen / ondatachannel)!
 *                 File bytes now stream directly browser-to-browser with DTLS encryption.
 * ============================================================================
 */

import { signalingService } from './socket';

// Chunk size for binary file streaming over WebRTC DataChannel
// 16KB (16384 bytes) is the universal cross-platform standard supported across 100% of mobile iOS Safari, Android, and Desktop SCTP buffers.
const CHUNK_SIZE = 16 * 1024; // 16KB
// High-water mark for backpressure buffer
const BUFFER_HIGH_WATER_MARK = 64 * 1024; // 64KB

export class WebRTCManager {
  constructor({ onPeerStatusChange, onTransferProgress, onFileReceived, onError }) {
    this.peers = new Map(); // targetPeerId -> { pc, dataChannel, peerInfo, status, iceCandidatesQueue }
    this.pendingIceCandidates = new Map(); // targetPeerId -> [candidates]
    this.activeTransfers = new Map(); // fileId -> transferState
    this.incomingFiles = new Map(); // fileId -> { metadata, chunks: [], receivedBytes, startTime }

    this.onPeerStatusChange = onPeerStatusChange || (() => {});
    this.onTransferProgress = onTransferProgress || (() => {});
    this.onFileReceived = onFileReceived || (() => {});
    this.onError = onError || (() => {});

    this.iceServers = this.getIceServers();
    this.unsubscribers = [];
    this.setupSignalingListeners();
  }

  /**
   * Configure ICE STUN and optional TURN servers
   */
  getIceServers() {
    const servers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' }
    ];

    const turnUrl = import.meta.env.VITE_TURN_SERVER_URL;
    const turnUsername = import.meta.env.VITE_TURN_USERNAME;
    const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

    if (turnUrl && turnUsername && turnCredential) {
      servers.push({
        urls: turnUrl,
        username: turnUsername,
        credential: turnCredential
      });
    }

    return servers;
  }

  /**
   * Bind signaling socket events to WebRTC handshake handlers
   */
  setupSignalingListeners() {
    const unsubOffer = signalingService.on('signal-offer', async ({ senderId, sdp, senderInfo }) => {
      console.log(`%c[WebRTC Step 5]%c Received SDP Offer from: ${senderId}`, 'color: #06b6d4; font-weight: bold;', 'color: inherit;');
      await this.handleReceiveOffer(senderId, sdp, senderInfo);
    });

    const unsubAnswer = signalingService.on('signal-answer', async ({ senderId, sdp }) => {
      console.log(`%c[WebRTC Step 7]%c Received SDP Answer from: ${senderId}`, 'color: #06b6d4; font-weight: bold;', 'color: inherit;');
      await this.handleReceiveAnswer(senderId, sdp);
    });

    const unsubIce = signalingService.on('signal-ice-candidate', async ({ senderId, candidate }) => {
      await this.handleReceiveIceCandidate(senderId, candidate);
    });

    const unsubLeft = signalingService.on('peer-left', ({ socketId }) => {
      this.closePeerConnection(socketId);
    });

    this.unsubscribers.push(unsubOffer, unsubAnswer, unsubIce, unsubLeft);
  }

  /**
   * STEP 1-4: INITIATOR FLOW
   * Create Peer Connection, create DataChannel, create & send Offer.
   */
  async connectToPeer(targetPeerId, targetPeerInfo) {
    if (this.peers.has(targetPeerId)) {
      const existing = this.peers.get(targetPeerId);
      if (existing.pc && (existing.pc.connectionState === 'connected' || existing.pc.iceConnectionState === 'connected')) {
        return;
      }
      this.closePeerConnection(targetPeerId);
    }

    console.log(`%c[WebRTC Step 1]%c Creating RTCPeerConnection for: ${targetPeerId}`, 'color: #6366f1; font-weight: bold;', 'color: inherit;');
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    
    // STEP 2: Initiator creates the DataChannel
    console.log(`%c[WebRTC Step 2]%c Creating RTCDataChannel for: ${targetPeerId}`, 'color: #6366f1; font-weight: bold;', 'color: inherit;');
    const dataChannel = pc.createDataChannel('lan-airdrop-channel', {
      ordered: true
    });
    dataChannel.binaryType = 'arraybuffer';

    const peerObj = {
      pc,
      dataChannel,
      peerInfo: targetPeerInfo || { peerName: 'Peer' },
      status: 'connecting',
      iceCandidatesQueue: []
    };
    this.peers.set(targetPeerId, peerObj);

    // Consume any early ICE candidates received for this peer
    if (this.pendingIceCandidates.has(targetPeerId)) {
      peerObj.iceCandidatesQueue.push(...this.pendingIceCandidates.get(targetPeerId));
      this.pendingIceCandidates.delete(targetPeerId);
    }

    this.setupDataChannelEvents(targetPeerId, dataChannel);
    this.setupPeerConnectionEvents(targetPeerId, pc);

    try {
      // STEP 3: Create SDP Offer
      console.log(`%c[WebRTC Step 3]%c Generating SDP Offer for: ${targetPeerId}`, 'color: #6366f1; font-weight: bold;', 'color: inherit;');
      const offer = await pc.createOffer();

      // STEP 4: Set Local Description & Send Offer via Signaling
      console.log(`%c[WebRTC Step 4]%c Setting LocalDescription & sending Offer`, 'color: #6366f1; font-weight: bold;', 'color: inherit;');
      await pc.setLocalDescription(offer);
      signalingService.sendOffer(targetPeerId, offer, {
        peerId: signalingService.getSocket()?.id
      });
    } catch (err) {
      console.error(`[WebRTC Error in connectToPeer]:`, err);
      this.onError(`Failed to connect to ${targetPeerInfo?.peerName || targetPeerId}: ${err.message}`);
    }
  }

  /**
   * STEP 5-6: RECEIVER FLOW
   * Receive Offer, create PeerConnection, set RemoteDescription, create & send Answer.
   */
  async handleReceiveOffer(senderId, sdp, senderInfo) {
    let peerObj = this.peers.get(senderId);
    
    // If existing PC is in an unstable state, close it cleanly to accept the new offer
    if (peerObj && peerObj.pc && peerObj.pc.signalingState !== 'stable') {
      console.warn(`[WebRTC] Closing existing unstable PC for ${senderId} to accept fresh Offer.`);
      try {
        if (peerObj.dataChannel) peerObj.dataChannel.close();
        peerObj.pc.close();
      } catch (e) {}
      peerObj = null;
    }

    if (!peerObj) {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      peerObj = {
        pc,
        dataChannel: null, // Will be assigned in pc.ondatachannel
        peerInfo: senderInfo || { peerName: 'Peer' },
        status: 'connecting',
        iceCandidatesQueue: []
      };
      this.peers.set(senderId, peerObj);
      this.setupPeerConnectionEvents(senderId, pc);
    }

    // Pull any early ICE candidates
    if (this.pendingIceCandidates.has(senderId)) {
      peerObj.iceCandidatesQueue.push(...this.pendingIceCandidates.get(senderId));
      this.pendingIceCandidates.delete(senderId);
    }

    const { pc } = peerObj;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      // Process queued ICE candidates
      if (peerObj.iceCandidatesQueue && peerObj.iceCandidatesQueue.length > 0) {
        for (const candidate of peerObj.iceCandidatesQueue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Early ICE candidate add warning:', e);
          }
        }
        peerObj.iceCandidatesQueue = [];
      }

      // STEP 6: Create and send SDP Answer
      console.log(`%c[WebRTC Step 6]%c Creating SDP Answer for: ${senderId}`, 'color: #06b6d4; font-weight: bold;', 'color: inherit;');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      signalingService.sendAnswer(senderId, answer);
    } catch (err) {
      console.error(`[WebRTC Error in handleReceiveOffer]:`, err);
      this.onError(`Failed to process connection from ${senderId}: ${err.message}`);
    }
  }

  /**
   * STEP 7: INITIATOR RECEIVES ANSWER
   */
  async handleReceiveAnswer(senderId, sdp) {
    const peerObj = this.peers.get(senderId);
    if (!peerObj) return;

    try {
      await peerObj.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      // Process queued ICE candidates
      if (peerObj.iceCandidatesQueue && peerObj.iceCandidatesQueue.length > 0) {
        for (const candidate of peerObj.iceCandidatesQueue) {
          try {
            await peerObj.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] ICE candidate add warning:', e);
          }
        }
        peerObj.iceCandidatesQueue = [];
      }
    } catch (err) {
      console.error(`[WebRTC Error in handleReceiveAnswer]:`, err);
    }
  }

  /**
   * STEP 8: ICE CANDIDATE EXCHANGE
   */
  async handleReceiveIceCandidate(senderId, candidate) {
    let peerObj = this.peers.get(senderId);
    if (!peerObj) {
      if (!this.pendingIceCandidates.has(senderId)) {
        this.pendingIceCandidates.set(senderId, []);
      }
      this.pendingIceCandidates.get(senderId).push(candidate);
      return;
    }

    try {
      if (peerObj.pc && peerObj.pc.remoteDescription && peerObj.pc.remoteDescription.type) {
        await peerObj.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        peerObj.iceCandidatesQueue.push(candidate);
      }
    } catch (err) {
      console.warn(`[WebRTC Warning adding ICE candidate]:`, err);
    }
  }

  /**
   * Setup PeerConnection lifecycle and ICE gathering
   */
  setupPeerConnectionEvents(peerId, pc) {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalingService.sendIceCandidate(peerId, event.candidate);
      }
    };

    const handleConnectionUpdate = () => {
      const state = pc.connectionState || pc.iceConnectionState;
      console.log(`[WebRTC Connection State] [${peerId}]: pcState=${pc.connectionState}, iceState=${pc.iceConnectionState}`);
      const peerObj = this.peers.get(peerId);
      if (!peerObj) return;

      if (state === 'connected' || pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        peerObj.status = 'connected';
        this.onPeerStatusChange(peerId, 'connected', peerObj.peerInfo);
      } else if (state === 'disconnected' || pc.iceConnectionState === 'disconnected') {
        peerObj.status = 'disconnected';
        this.onPeerStatusChange(peerId, 'disconnected', peerObj.peerInfo);
      } else if (state === 'failed' || pc.iceConnectionState === 'failed') {
        peerObj.status = 'failed';
        this.onPeerStatusChange(peerId, 'failed', peerObj.peerInfo);
      }
    };

    pc.onconnectionstatechange = handleConnectionUpdate;
    pc.oniceconnectionstatechange = handleConnectionUpdate;

    pc.ondatachannel = (event) => {
      console.log(`%c[WebRTC Receiver]%c DataChannel received from ${peerId}`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
      const channel = event.channel;
      channel.binaryType = 'arraybuffer';
      const peerObj = this.peers.get(peerId);
      if (peerObj) {
        peerObj.dataChannel = channel;
      }
      this.setupDataChannelEvents(peerId, channel);
    };
  }

  /**
   * Setup DataChannel events: open, close, message handling
   */
  setupDataChannelEvents(peerId, dataChannel) {
    const handleOpen = () => {
      console.log(`%c[WebRTC Step 9] DataChannel OPENED with peer: ${peerId}%c (Ready for bidirectional file streaming)`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
      const peerObj = this.peers.get(peerId);
      if (peerObj) {
        peerObj.status = 'connected';
        this.onPeerStatusChange(peerId, 'connected', peerObj.peerInfo);
      }
    };

    if (dataChannel.readyState === 'open') {
      handleOpen();
    } else {
      dataChannel.onopen = handleOpen;
      dataChannel.addEventListener('open', handleOpen);
    }

    dataChannel.onclose = () => {
      console.log(`[WebRTC] DataChannel closed with peer: ${peerId}`);
      const peerObj = this.peers.get(peerId);
      if (peerObj) {
        peerObj.status = 'closed';
        this.onPeerStatusChange(peerId, 'closed', peerObj.peerInfo);
      }
    };

    dataChannel.onerror = (err) => {
      console.error(`[WebRTC DataChannel Error] with peer ${peerId}:`, err);
    };

    dataChannel.onmessage = (event) => {
      this.handleIncomingDataChannelMessage(peerId, event.data);
    };
  }

  /**
   * Handle DataChannel incoming messages (control JSON vs binary file chunks)
   */
  handleIncomingDataChannelMessage(senderId, data) {
    // 1. Text / JSON Control Messages
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        this.handleControlMessage(senderId, msg);
      } catch (err) {
        console.error('[WebRTC] Error parsing JSON control message:', err);
      }
      return;
    }

    // 2. Binary File Chunk as Blob (some mobile browsers)
    if (data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        this.handleBinaryChunk(senderId, reader.result);
      };
      reader.readAsArrayBuffer(data);
      return;
    }

    // 3. Binary File Chunk as ArrayBuffer
    if (data instanceof ArrayBuffer) {
      this.handleBinaryChunk(senderId, data);
    }
  }

  /**
   * Process incoming control messages (FILE_START, FILE_PAUSE, FILE_CANCEL, etc.)
   */
  handleControlMessage(senderId, msg) {
    switch (msg.type) {
      case 'FILE_METADATA': {
        const { fileId, name, size, mimeType, totalChunks, chunkSize } = msg;
        console.log(`[WebRTC Incoming File] Metadata: "${name}" (${size} bytes, ${totalChunks} chunks) from ${senderId}`);
        
        this.incomingFiles.set(fileId, {
          fileId,
          name,
          size,
          mimeType: mimeType || 'application/octet-stream',
          totalChunks,
          chunkSize,
          senderId,
          chunks: [],
          receivedBytes: 0,
          startTime: Date.now(),
          lastUpdateTime: Date.now(),
          lastBytes: 0,
          speed: 0,
          status: 'transferring'
        });

        this.onTransferProgress({
          transferId: fileId,
          direction: 'incoming',
          fileId,
          name,
          size,
          mimeType,
          senderId,
          transferredBytes: 0,
          percent: 0,
          speed: 0,
          eta: Math.ceil(size / (500 * 1024)),
          status: 'transferring'
        });
        break;
      }

      case 'FILE_PAUSE': {
        const file = this.incomingFiles.get(msg.fileId);
        if (file) {
          file.status = 'paused';
          this.onTransferProgress({
            transferId: msg.fileId,
            direction: 'incoming',
            status: 'paused'
          });
        }
        break;
      }

      case 'FILE_RESUME': {
        const file = this.incomingFiles.get(msg.fileId);
        if (file) {
          file.status = 'transferring';
          this.onTransferProgress({
            transferId: msg.fileId,
            direction: 'incoming',
            status: 'transferring'
          });
        }
        break;
      }

      case 'FILE_CANCEL': {
        const file = this.incomingFiles.get(msg.fileId);
        if (file) {
          file.status = 'cancelled';
          this.incomingFiles.delete(msg.fileId);
          this.onTransferProgress({
            transferId: msg.fileId,
            direction: 'incoming',
            status: 'cancelled'
          });
        }
        break;
      }

      case 'FILE_COMPLETE': {
        this.finalizeIncomingFile(msg.fileId);
        break;
      }

      default:
        console.log(`[WebRTC Unknown Control Msg]:`, msg);
    }
  }

  /**
   * Process binary chunk reception and update progress/speed metrics
   */
  handleBinaryChunk(senderId, arrayBuffer) {
    let activeFile = null;

    // Match by sender and transferring status
    for (const file of this.incomingFiles.values()) {
      if (file.senderId === senderId && file.status === 'transferring') {
        activeFile = file;
        break;
      }
    }

    // Fallback: If only one active file exists
    if (!activeFile && this.incomingFiles.size === 1) {
      const single = Array.from(this.incomingFiles.values())[0];
      if (single.status === 'transferring') {
        activeFile = single;
      }
    }

    if (!activeFile) {
      console.warn(`[WebRTC] Received binary chunk (${arrayBuffer.byteLength} bytes) but no active incoming file matched sender ${senderId}`);
      return;
    }

    activeFile.chunks.push(arrayBuffer);
    activeFile.receivedBytes += arrayBuffer.byteLength;

    const now = Date.now();
    const timeDiff = (now - activeFile.lastUpdateTime) / 1000;

    // Recalculate speed & ETA every 200ms
    if (timeDiff >= 0.2) {
      const bytesDiff = activeFile.receivedBytes - activeFile.lastBytes;
      activeFile.speed = bytesDiff / Math.max(0.01, timeDiff);
      activeFile.lastBytes = activeFile.receivedBytes;
      activeFile.lastUpdateTime = now;
    }

    const percent = Math.min(100, Math.round((activeFile.receivedBytes / activeFile.size) * 100));
    const remainingBytes = Math.max(0, activeFile.size - activeFile.receivedBytes);
    const eta = activeFile.speed > 0 ? Math.ceil(remainingBytes / activeFile.speed) : 0;

    this.onTransferProgress({
      transferId: activeFile.fileId,
      direction: 'incoming',
      fileId: activeFile.fileId,
      name: activeFile.name,
      size: activeFile.size,
      mimeType: activeFile.mimeType,
      senderId,
      transferredBytes: activeFile.receivedBytes,
      percent,
      speed: activeFile.speed,
      eta,
      status: 'transferring'
    });

    // If all bytes received, assemble final file
    if (activeFile.receivedBytes >= activeFile.size) {
      this.finalizeIncomingFile(activeFile.fileId);
    }
  }

  /**
   * Reassemble incoming chunks into a Blob and trigger callback with URL preview
   */
  finalizeIncomingFile(fileId) {
    const file = this.incomingFiles.get(fileId);
    if (!file || file.status === 'completed') return;

    file.status = 'completed';
    console.log(`%c[WebRTC File Transfer Complete]%c "${file.name}" received successfully (${file.receivedBytes} bytes).`, 'color: #10b981; font-weight: bold;', 'color: inherit;');

    const blob = new Blob(file.chunks, { type: file.mimeType });
    const blobUrl = URL.createObjectURL(blob);

    const receivedFile = {
      fileId: file.fileId,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      blob,
      blobUrl,
      senderId: file.senderId,
      receivedAt: Date.now(),
      isImage: file.mimeType.startsWith('image/')
    };

    this.onTransferProgress({
      transferId: file.fileId,
      direction: 'incoming',
      fileId: file.fileId,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      transferredBytes: file.size,
      percent: 100,
      speed: 0,
      eta: 0,
      status: 'completed'
    });

    this.onFileReceived(receivedFile);
    this.incomingFiles.delete(fileId);
  }

  /**
   * SENDER FLOW: Send a file or multi-file queue to one or more recipient peers
   * Includes backpressure management via bufferedAmount / bufferedamountlow
   */
  async sendFile(file, recipientPeerIds, fileId) {
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    
    // Determine active target channels
    const activeTargets = [];
    for (const peerId of recipientPeerIds) {
      let peerObj = this.peers.get(peerId);
      
      // If dataChannel is still connecting, await open event for up to 3 seconds
      if (peerObj && peerObj.dataChannel && peerObj.dataChannel.readyState === 'connecting') {
        console.log(`[WebRTC] Channel for peer ${peerId} is connecting, awaiting open...`);
        await new Promise((resolve) => {
          const checkReady = () => {
            if (peerObj.dataChannel.readyState === 'open') resolve();
          };
          peerObj.dataChannel.addEventListener('open', checkReady, { once: true });
          setTimeout(resolve, 3000);
        });
      }

      if (peerObj && peerObj.dataChannel && peerObj.dataChannel.readyState === 'open') {
        activeTargets.push({ peerId, channel: peerObj.dataChannel });
      }
    }

    if (activeTargets.length === 0) {
      throw new Error('No connected peers with an open data channel. Please check connection status.');
    }

    const transferState = {
      fileId,
      file,
      totalSize,
      totalChunks,
      sentBytes: 0,
      isPaused: false,
      isCancelled: false,
      speed: 0,
      lastBytes: 0,
      lastUpdateTime: Date.now()
    };
    this.activeTransfers.set(fileId, transferState);

    // 1. Send Metadata Header to all recipients
    const metadataMsg = JSON.stringify({
      type: 'FILE_METADATA',
      fileId,
      name: file.name,
      size: totalSize,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
      chunkSize: CHUNK_SIZE
    });

    for (const target of activeTargets) {
      target.channel.send(metadataMsg);
    }

    // 2. Stream Binary Chunks with Backpressure Control
    let offset = 0;
    let chunkIndex = 0;

    const readNextChunk = (startOffset) => {
      const slice = file.slice(startOffset, startOffset + CHUNK_SIZE);
      return slice.arrayBuffer();
    };

    while (offset < totalSize) {
      // Check cancellation
      if (transferState.isCancelled) {
        for (const target of activeTargets) {
          try {
            target.channel.send(JSON.stringify({ type: 'FILE_CANCEL', fileId }));
          } catch (e) {}
        }
        this.activeTransfers.delete(fileId);
        this.onTransferProgress({
          transferId: fileId,
          direction: 'outgoing',
          status: 'cancelled'
        });
        return;
      }

      // Check pause
      while (transferState.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        if (transferState.isCancelled) break;
      }

      // Read chunk
      const chunk = await readNextChunk(offset);

      // Backpressure Check: wait if any channel's bufferedAmount exceeds high-water mark
      for (const target of activeTargets) {
        if (target.channel.bufferedAmount > BUFFER_HIGH_WATER_MARK) {
          await new Promise((resolve) => {
            const lowHandler = () => {
              target.channel.removeEventListener('bufferedamountlow', lowHandler);
              resolve();
            };
            target.channel.addEventListener('bufferedamountlow', lowHandler);
            setTimeout(resolve, 50);
          });
        }
        target.channel.send(chunk);
      }

      offset += chunk.byteLength;
      chunkIndex++;
      transferState.sentBytes = offset;

      // Calculate speed and ETA
      const now = Date.now();
      const timeDiff = (now - transferState.lastUpdateTime) / 1000;
      if (timeDiff >= 0.2 || offset >= totalSize) {
        const bytesDiff = transferState.sentBytes - transferState.lastBytes;
        transferState.speed = bytesDiff / Math.max(0.01, timeDiff);
        transferState.lastBytes = transferState.sentBytes;
        transferState.lastUpdateTime = now;
      }

      const percent = Math.min(100, Math.round((offset / totalSize) * 100));
      const remainingBytes = Math.max(0, totalSize - offset);
      const eta = transferState.speed > 0 ? Math.ceil(remainingBytes / transferState.speed) : 0;

      this.onTransferProgress({
        transferId: fileId,
        direction: 'outgoing',
        fileId,
        name: file.name,
        size: totalSize,
        mimeType: file.type,
        recipients: recipientPeerIds,
        transferredBytes: offset,
        percent,
        speed: transferState.speed,
        eta,
        status: offset >= totalSize ? 'completed' : 'transferring'
      });
    }

    // Send complete control packet
    for (const target of activeTargets) {
      try {
        target.channel.send(JSON.stringify({ type: 'FILE_COMPLETE', fileId }));
      } catch (e) {}
    }

    // Transfer completed
    this.activeTransfers.delete(fileId);
    console.log(`%c[WebRTC Sender]%c File "${file.name}" sent completely.`, 'color: #10b981; font-weight: bold;', 'color: inherit;');
  }

  /**
   * Pause an in-progress transfer
   */
  pauseTransfer(fileId) {
    const transfer = this.activeTransfers.get(fileId);
    if (transfer) {
      transfer.isPaused = true;
      for (const peer of this.peers.values()) {
        if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
          peer.dataChannel.send(JSON.stringify({ type: 'FILE_PAUSE', fileId }));
        }
      }
      this.onTransferProgress({
        transferId: fileId,
        direction: 'outgoing',
        status: 'paused'
      });
    }
  }

  /**
   * Resume a paused transfer
   */
  resumeTransfer(fileId) {
    const transfer = this.activeTransfers.get(fileId);
    if (transfer) {
      transfer.isPaused = false;
      for (const peer of this.peers.values()) {
        if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
          peer.dataChannel.send(JSON.stringify({ type: 'FILE_RESUME', fileId }));
        }
      }
      this.onTransferProgress({
        transferId: fileId,
        direction: 'outgoing',
        status: 'transferring'
      });
    }
  }

  /**
   * Cancel an in-progress transfer
   */
  cancelTransfer(fileId) {
    const transfer = this.activeTransfers.get(fileId);
    if (transfer) {
      transfer.isCancelled = true;
    }
  }

  /**
   * Clean up and close a single peer connection
   */
  closePeerConnection(peerId) {
    const peerObj = this.peers.get(peerId);
    if (peerObj) {
      try {
        if (peerObj.dataChannel) peerObj.dataChannel.close();
        if (peerObj.pc) peerObj.pc.close();
      } catch (e) {
        // Ignore close errors
      }
      this.peers.delete(peerId);
      this.onPeerStatusChange(peerId, 'closed', peerObj.peerInfo);
    }
  }

  /**
   * Reset all WebRTC connections (when leaving room)
   */
  destroy() {
    if (this.unsubscribers) {
      this.unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      this.unsubscribers = [];
    }
    for (const peerId of this.peers.keys()) {
      this.closePeerConnection(peerId);
    }
    this.peers.clear();
    this.pendingIceCandidates.clear();
    this.activeTransfers.clear();
    this.incomingFiles.clear();
  }
}
