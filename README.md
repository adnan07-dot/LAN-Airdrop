# ⚡ LAN AIRDROP — High-Speed WebRTC P2P File Transfer

> Direct, browser-to-browser file, photo, and document sharing over local Wi-Fi with QR mobile pairing and zero server storage.

---

## 🌟 Overview & Highlights

**LAN AIRDROP** enables direct, encrypted peer-to-peer file transfers between smartphones, tablets, and computers on the same local network without requiring cloud accounts, file size limitations, or third-party storage.

```
                  Handshake ONLY (SDP + ICE) — Zero File Bytes
   Laptop A  ─────────────────────────────────►  Signaling Server
       ▲            (Node.js + Socket.io,                 │
       │             in-memory rooms)                     │
       └───────────────────◄────────────────────────────────┘

   Laptop A  ◄══════════════════════════════════════════►  Mobile / Peer B
                Actual File Bytes — Direct P2P via
             RTCDataChannel, Encrypted End-to-End (DTLS)
```

### 🔑 Key Features
- 🚀 **Zero Server Storage**: The Node.js signaling server only exchanges handshake tokens (SDP offer/answers, ICE candidates). File bytes **never** touch or get stored on the server.
- 📱 **QR Code Mobile Pairing**: Host displays a QR code with the local LAN address; phones scan with their camera to join instantly.
- 🛡️ **End-to-End Encrypted**: All data channels use native WebRTC DTLS 1.2/1.3 cryptographic encryption.
- ⚡ **Full Local LAN Throughput**: Leverages raw router speeds (often 30MB/s - 100MB/s+ on 5GHz Wi-Fi) without consuming internet bandwidth.
- 📁 **Multi-File & Folder Support**: Drag & drop multiple files or entire folder trees with automatic recursive extraction.
- ⏳ **Hardware Backpressure**: Real backpressure management via `bufferedAmount` & `bufferedamountlow` so multi-gigabyte transfers run smoothly without tab crashes.
- ⏯️ **Transfer Controls & Metrics**: Real-time speed (MB/s), ETA countdown timer, progress percentage, pause/resume, and cancellation.
- 🖼️ **Inline Media Previews**: Instant thumbnail previews for photos before sending and immediately upon arrival with a full-screen lightbox.
- 👥 **Multi-Device Star Topology**: Connect 3+ devices per room and selectively send to specific peers or broadcast to all.
- 🌓 **Dynamic Light/Dark Mode**: Tailored glassmorphism UI with smooth theme transitions persisted in `localStorage`.

---

## 🛠️ WebRTC Handshake Sequence (Under the Hood)

1. **Initiator (`RTCPeerConnection`)**: Creates peer connection configured with STUN/TURN servers.
2. **Initiator (`createDataChannel`)**: Opens an ordered, reliable binary `RTCDataChannel`.
3. **Initiator (`createOffer`)**: Generates local Session Description Protocol (SDP) offer.
4. **Initiator (`setLocalDescription`)**: Sets its local description and relays the offer via Socket.io signaling.
5. **Receiver (`setRemoteDescription`)**: Callee sets the incoming SDP offer as remote description.
6. **Receiver (`createAnswer`)**: Callee generates SDP answer, sets its local description, and relays it back.
7. **Initiator (`setRemoteDescription`)**: Caller sets incoming answer.
8. **Both (`onicecandidate` → `addIceCandidate`)**: Peers exchange gathered ICE candidates.
9. **DataChannel Opens (`onopen`)**: P2P data tunnel is live! Chunks stream directly browser-to-browser.

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Node.js**: v18 or higher (v20+ recommended)
- **npm**: v9 or higher

### 1. Install Dependencies

Open a terminal in the root directory:

```bash
# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client
```

*(On Windows PowerShell, use `npm.cmd install --prefix server` and `npm.cmd install --prefix client`)*

---

### 2. Run Locally (Development Mode)

Start both the signaling server and Vite frontend:

#### Terminal 1 — Signaling Server:
```bash
cd server
npm start
```
*The server will start on port `3001` and output your active Wi-Fi LAN IP (e.g. `http://192.168.1.15:3001`).*

#### Terminal 2 — Vite Client:
```bash
cd client
npm run dev
```
*The client will start on `http://localhost:5173` and listen on all LAN interfaces (`0.0.0.0:5173`).*

---

## 📱 Testing Across Real Devices on Same Wi-Fi (Laptop + Phone)

1. **Connect both devices** (laptop and phone) to the same Wi-Fi network (or laptop connected to phone's mobile hotspot).
2. Start the server and client as shown above.
3. Open `http://localhost:5173` on your laptop and click **"Create Room Now"**.
4. Click the **Room Code** or **"Show QR"** button in the top bar to open the pairing modal.
5. On your phone, open the native camera app and scan the QR code.
6. Your phone will open `http://<YOUR-LAPTOP-LAN-IP>:5173/?room=ABCDEF` and instantly connect!
7. Both devices will show as **Connected** with friendly names (e.g. *Swift Falcon* and *Neon Otter*).
8. Drag a photo or file on either device and watch it transfer directly at full Wi-Fi speed.

---

## 🔧 Environment Variables (`.env`)

Create a `.env` in the root or `/client` directory based on `.env.example`:

```env
# Signaling Server Port
PORT=3001

# Vite Client Port
CLIENT_PORT=5173

# Signaling server URL (defaults to window.location.hostname:3001)
VITE_SIGNALING_SERVER_URL=http://localhost:3001

# Optional TURN configuration (for strict symmetric NAT or client-isolated venue Wi-Fi)
VITE_TURN_SERVER_URL=
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=
```

---

## 📁 Repository Structure

```
LAN-AIRDROP/
├── package.json              # Root scripts
├── .env.example              # Environment variables template
├── README.md                 # Documentation
├── server/                   # Node.js + Socket.io Signaling Server
│   ├── package.json
│   └── index.js              # In-memory rooms & SDP/ICE relay
└── client/                   # React + Vite + Tailwind CSS Frontend
    ├── package.json
    ├── vite.config.js        # Configured with host: 0.0.0.0
    ├── tailwind.config.js    # Dark mode & glassmorphism theme
    ├── index.html
    └── src/
        ├── index.css         # Glassmorphic utilities & animations
        ├── main.jsx
        ├── App.jsx           # Main coordinator & reactive state
        ├── services/
        │   ├── socket.js     # Socket.io signaling client
        │   ├── webrtc.js     # Native RTCPeerConnection & chunked streamer
        │   └── utils.js      # Formatters, speed, device detection & confetti
        └── components/
            ├── Navbar.jsx
            ├── RoomHero.jsx
            ├── RoomModal.jsx
            ├── QRScannerModal.jsx
            ├── PeerList.jsx
            ├── DropZone.jsx
            ├── TransferQueue.jsx
            ├── ReceivedFiles.jsx
            ├── SecurityModal.jsx
            ├── StatusBadge.jsx
            └── Toast.jsx
```

---

## 🛡️ License
MIT License. Built for high-speed, private, zero-footprint peer-to-peer file sharing.
