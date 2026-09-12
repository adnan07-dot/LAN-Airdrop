const { io } = require('./client/node_modules/socket.io-client');

async function testSignaling() {
  console.log('Testing Signaling Server between Peer A and Peer B...');
  
  const clientA = io('http://localhost:3001', { transports: ['websocket'] });
  const clientB = io('http://localhost:3001', { transports: ['websocket'] });

  await new Promise((resolve) => clientA.on('connect', resolve));
  await new Promise((resolve) => clientB.on('connect', resolve));
  console.log('✓ Both clients connected to signaling server');

  let roomCode = 'TEST99';

  // Client A joins room
  clientA.emit('join-room', { roomCode, peerName: 'Tester A', deviceType: 'desktop' });
  
  const roomDataA = await new Promise((resolve) => clientA.on('room-joined', resolve));
  console.log(`✓ Peer A joined room "${roomDataA.roomCode}" as "${roomDataA.self.peerName}"`);

  // Client B joins room
  clientB.emit('join-room', { roomCode, peerName: 'Tester B', deviceType: 'mobile' });
  
  const peerJoinedA = await new Promise((resolve) => clientA.on('peer-joined', resolve));
  console.log(`✓ Peer A received event: Peer B ("${peerJoinedA.peerName}") joined`);

  // Client A sends offer to B
  clientA.emit('signal-offer', {
    targetPeerId: clientB.id,
    sdp: { type: 'offer', sdp: 'v=0\r\no=- 1234 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
  });

  const offerReceivedB = await new Promise((resolve) => clientB.on('signal-offer', resolve));
  console.log(`✓ Peer B received SDP offer from Peer A (${offerReceivedB.senderId})`);

  // Client B sends answer to A
  clientB.emit('signal-answer', {
    targetPeerId: clientA.id,
    sdp: { type: 'answer', sdp: 'v=0\r\no=- 5678 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' }
  });

  const answerReceivedA = await new Promise((resolve) => clientA.on('signal-answer', resolve));
  console.log(`✓ Peer A received SDP answer from Peer B (${answerReceivedA.senderId})`);

  // ICE candidate exchange
  clientA.emit('signal-ice-candidate', {
    targetPeerId: clientB.id,
    candidate: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 }
  });

  const iceReceivedB = await new Promise((resolve) => clientB.on('signal-ice-candidate', resolve));
  console.log(`✓ Peer B received ICE candidate from Peer A`);

  clientA.disconnect();
  clientB.disconnect();
  console.log('\n⭐ ALL SIGNALING PROTOCOL TESTS PASSED PERFECTLY!\n');
}

testSignaling().catch(console.error);
