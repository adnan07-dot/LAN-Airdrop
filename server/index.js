/**
 * LAN AIRDROP — Signaling Server
 * 
 * ARCHITECTURE PRINCIPLE:
 * This server exists SOLELY to broker the initial WebRTC connection handshake
 * (SDP Offer / Answer and ICE candidate exchanges) between browsers.
 * 
 * NO FILE BYTES EVER TOUCH, ARE RECEIVED BY, OR ARE STORED ON THIS SERVER.
 * All file transfers occur directly peer-to-peer via RTCDataChannel with DTLS encryption.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  pingTimeout: 30000,
  pingInterval: 15000,
  maxHttpBufferSize: 1e6 // 1MB max for signaling payloads (SDP/ICE only)
});

// ----------------------------------------------------
// IN-MEMORY ROOM STATE (No database used)
// ----------------------------------------------------
const rooms = new Map();
const socketToRoom = new Map();

// Friendly Peer Name Generator
const ADJECTIVES = [
  'Swift', 'Neon', 'Cosmic', 'Emerald', 'Cyber', 'Solar', 'Quantum', 'Shadow',
  'Amber', 'Velvet', 'Nova', 'Electric', 'Sonic', 'Astral', 'Zenith', 'Golden'
];

const ANIMALS = [
  'Falcon', 'Otter', 'Fox', 'Lynx', 'Dolphin', 'Phoenix', 'Panther', 'Tiger',
  'Eagle', 'Wolf', 'Owl', 'Cheetah', 'Raven', 'Panda', 'Hawk', 'Badger'
];

function generateFriendlyName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal}`;
}

function generateRoomCode() {
  // 6-character clean alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Utility: Retrieve local LAN IPv4 addresses
function getLocalNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          ip: iface.address
        });
      }
    }
  }

  return addresses;
}

// ----------------------------------------------------
// HTTP REST ENDPOINTS
// ----------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: Date.now(),
    activeRooms: rooms.size,
    uptime: process.uptime()
  });
});

app.get('/api/lan-info', (req, res) => {
  const lanAddresses = getLocalNetworkAddresses();
  res.json({
    serverPort: PORT,
    lanAddresses,
    defaultClientPort: 5173,
    activeRooms: rooms.size
  });
});

// ----------------------------------------------------
// SOCKET.IO SIGNALING EVENTS
// ----------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id} from ${socket.handshake.address}`);

  /**
   * 1. CREATE / JOIN ROOM
   */
  socket.on('join-room', ({ roomCode, peerName, deviceType }) => {
    try {
      let normalizedCode = (roomCode || generateRoomCode()).toUpperCase().trim();
      const assignedName = (peerName && peerName.trim().length > 0) ? peerName.trim() : generateFriendlyName();
      const detectedDevice = deviceType || 'desktop';

      let room = rooms.get(normalizedCode);
      if (!room) {
        room = {
          code: normalizedCode,
          createdAt: Date.now(),
          peers: new Map()
        };
        rooms.set(normalizedCode, room);
        console.log(`[Room Created] Code: ${normalizedCode} by ${assignedName} (${socket.id})`);
      }

      if (room.peers.size >= 8) {
        socket.emit('error-message', {
          code: 'ROOM_FULL',
          message: `Room ${normalizedCode} is full (maximum 8 devices).`
        });
        return;
      }

      const peerData = {
        socketId: socket.id,
        peerName: assignedName,
        deviceType: detectedDevice,
        joinedAt: Date.now()
      };

      room.peers.set(socket.id, peerData);
      socketToRoom.set(socket.id, normalizedCode);
      socket.join(normalizedCode);

      const existingPeers = [];
      for (const [id, peer] of room.peers.entries()) {
        if (id !== socket.id) {
          existingPeers.push(peer);
        }
      }

      socket.emit('room-joined', {
        roomCode: normalizedCode,
        self: peerData,
        peers: existingPeers
      });

      socket.to(normalizedCode).emit('peer-joined', peerData);
      console.log(`[Peer Joined] "${assignedName}" joined room "${normalizedCode}" (${room.peers.size} members)`);
    } catch (err) {
      console.error('[Error in join-room]:', err);
      socket.emit('error-message', { code: 'JOIN_ERROR', message: 'Failed to join room.' });
    }
  });

  /**
   * 2. SIGNAL: SDP OFFER (Initiator -> Target Peer)
   */
  socket.on('signal-offer', ({ targetPeerId, sdp, senderInfo }) => {
    if (!targetPeerId || !sdp) return;
    io.to(targetPeerId).emit('signal-offer', {
      senderId: socket.id,
      sdp,
      senderInfo
    });
  });

  /**
   * 3. SIGNAL: SDP ANSWER (Target Peer -> Initiator)
   */
  socket.on('signal-answer', ({ targetPeerId, sdp }) => {
    if (!targetPeerId || !sdp) return;
    io.to(targetPeerId).emit('signal-answer', {
      senderId: socket.id,
      sdp
    });
  });

  /**
   * 4. SIGNAL: ICE CANDIDATE EXCHANGE
   */
  socket.on('signal-ice-candidate', ({ targetPeerId, candidate }) => {
    if (!targetPeerId || !candidate) return;
    io.to(targetPeerId).emit('signal-ice-candidate', {
      senderId: socket.id,
      candidate
    });
  });

  /**
   * 5. LEAVE ROOM (Explicit)
   */
  socket.on('leave-room', () => {
    handlePeerDisconnect(socket);
  });

  /**
   * 6. SOCKET DISCONNECT
   */
  socket.on('disconnect', (reason) => {
    handlePeerDisconnect(socket);
  });
});

function handlePeerDisconnect(socket) {
  const roomCode = socketToRoom.get(socket.id);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (room) {
    const peer = room.peers.get(socket.id);
    const peerName = peer ? peer.peerName : 'Unknown Peer';
    
    room.peers.delete(socket.id);
    socket.leave(roomCode);

    socket.to(roomCode).emit('peer-left', {
      socketId: socket.id,
      peerName: peerName
    });

    if (room.peers.size === 0) {
      rooms.delete(roomCode);
      console.log(`[Room Destroyed] "${roomCode}" is now empty.`);
    }
  }

  socketToRoom.delete(socket.id);
}

// ----------------------------------------------------
// STATIC PRODUCTION FRONTEND SERVING
// ----------------------------------------------------
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Production] Serving static client build from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ----------------------------------------------------
// SERVER STARTUP & NETWORK BANNER
// ----------------------------------------------------
server.listen(PORT, '0.0.0.0', () => {
  const lanAddresses = getLocalNetworkAddresses();
  console.log('\n======================================================');
  console.log('⚡ LAN AIRDROP — WebRTC Signaling Server Active');
  console.log('======================================================');
  console.log(`> Local Server:      http://localhost:${PORT}`);
  if (lanAddresses.length > 0) {
    lanAddresses.forEach(net => {
      console.log(`> Network (${net.interface}): http://${net.ip}:${PORT}`);
    });
  } else {
    console.log('> Network:           No active LAN adapter found');
  }
  console.log('------------------------------------------------------');
  console.log('🔒 Security Notice: Zero file payloads stored on server.');
  console.log('🌐 Direct WebRTC DTLS data channel ready for peers.');
  console.log('======================================================\n');
});
