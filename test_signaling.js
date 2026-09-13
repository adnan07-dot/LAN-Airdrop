const { io } = require('./client/node_modules/socket.io-client');

async function testSignaling() {
  console.log('Testing Signaling Server & Resilient Relay Fallback between Peer A and Peer B...');
  
  const clientA = io('http://localhost:3001', { transports: ['websocket'] });
  const clientB = io('http://localhost:3001', { transports: ['websocket'] });

  const waitConnect = (socket) => new Promise((resolve) => {
    if (socket.connected) return resolve();
    socket.once('connect', resolve);
  });

  await Promise.all([waitConnect(clientA), waitConnect(clientB)]);
  console.log('✓ Both clients connected to signaling server');

  let roomCode = 'TEST99';

  // Client A joins room
  const joinA = new Promise((resolve) => clientA.once('room-joined', resolve));
  clientA.emit('join-room', { roomCode, peerName: 'Astral Fox', deviceType: 'mobile' });
  const roomDataA = await joinA;
  console.log(`✓ Peer A joined room "${roomDataA.roomCode}" as "${roomDataA.self.peerName}"`);

  // Client B joins room
  const peerJoinedA = new Promise((resolve) => clientA.once('peer-joined', resolve));
  const joinB = new Promise((resolve) => clientB.once('room-joined', resolve));
  clientB.emit('join-room', { roomCode, peerName: 'Quantum Owl', deviceType: 'desktop' });
  
  const [peerJoinedResult, roomDataB] = await Promise.all([peerJoinedA, joinB]);
  console.log(`✓ Peer A received event: Peer B ("${peerJoinedResult.peerName}") joined`);
  console.log(`✓ Peer B joined room "${roomDataB.roomCode}" as "${roomDataB.self.peerName}"`);

  // 1. WebRTC Signaling: Client A sends offer to B
  const offerPromise = new Promise((resolve) => clientB.once('signal-offer', resolve));
  clientA.emit('signal-offer', {
    targetPeerId: clientB.id,
    sdp: { type: 'offer', sdp: 'v=0\r\no=- 1234 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
  });
  const offerReceivedB = await offerPromise;
  console.log(`✓ Peer B received SDP offer from Peer A (${offerReceivedB.senderId})`);

  // Client B sends answer to A
  const answerPromise = new Promise((resolve) => clientA.once('signal-answer', resolve));
  clientB.emit('signal-answer', {
    targetPeerId: clientA.id,
    sdp: { type: 'answer', sdp: 'v=0\r\no=- 5678 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
  });
  const answerReceivedA = await answerPromise;
  console.log(`✓ Peer A received SDP answer from Peer B (${answerReceivedA.senderId})`);

  // ICE candidate exchange
  const icePromise = new Promise((resolve) => clientB.once('signal-ice-candidate', resolve));
  clientA.emit('signal-ice-candidate', {
    targetPeerId: clientB.id,
    candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 }
  });
  const iceReceivedB = await icePromise;
  console.log(`✓ Peer B received ICE candidate from Peer A`);

  // 2. Resilient Streaming Relay Fallback Test
  console.log('Testing Streaming Relay Fallback...');
  const testFileId = 'test-file-123';
  const metaPromise = new Promise((resolve) => clientB.once('relay-file-metadata', resolve));
  clientA.emit('relay-file-metadata', {
    targetPeerId: clientB.id,
    metadata: { fileId: testFileId, name: 'IMG_20260907_182128_574.jpg', size: 1024, mimeType: 'image/jpeg', totalChunks: 1 }
  });
  const relayMetaB = await metaPromise;
  console.log(`✓ Peer B received relay file metadata: "${relayMetaB.metadata.name}" (${relayMetaB.metadata.size} bytes)`);

  const chunkPromise = new Promise((resolve) => clientB.once('relay-file-chunk', resolve));
  const fakeChunk = Buffer.from('test binary chunk content');
  clientA.emit('relay-file-chunk', {
    targetPeerId: clientB.id,
    chunk: fakeChunk,
    fileId: testFileId,
    chunkIndex: 0
  });
  const relayChunkB = await chunkPromise;
  console.log(`✓ Peer B received relay chunk for file: ${relayChunkB.fileId} (${relayChunkB.chunk.length} bytes)`);

  const compPromise = new Promise((resolve) => clientB.once('relay-file-complete', resolve));
  clientA.emit('relay-file-complete', {
    targetPeerId: clientB.id,
    fileId: testFileId
  });
  const relayCompleteB = await compPromise;
  console.log(`✓ Peer B received relay file completion: ${relayCompleteB.fileId}`);

  clientA.disconnect();
  clientB.disconnect();
  console.log('\n⭐ ALL SIGNALING & RELAY PROTOCOL TESTS PASSED WITH 100% SUCCESS!\n');
}

testSignaling().then(() => process.exit(0)).catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
