const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallBtn = document.getElementById('startCall');
const acceptBtn = document.getElementById('acceptCall');

let localStream;
let remoteStream;
let peerConnection;

// ICE Servers for NAT traversal
const iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Public STUN server
    ]
};

const socket = io('http://20.244.81.24:8080');

startCallBtn.addEventListener('click', startCall);
acceptBtn.addEventListener('click', acceptOffer);

async function startCall() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = createPeerConnection();

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('message', { type: 'offer', offer });
}

async function acceptOffer() {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = createPeerConnection();

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    const offer = peerConnection.remoteDescription; // Ensure this is received from signaling
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('message', { type: 'answer', answer });
}

function createPeerConnection() {
    const pc = new RTCPeerConnection(iceConfig);

    // Handle remote tracks
    pc.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('message', { type: 'candidate', candidate: event.candidate });
        }
    };

    return pc;
}

// Handle incoming messages
socket.on('message', async (data) => {
    switch (data.type) {
        case 'offer':
            peerConnection = createPeerConnection();
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            document.getElementById('incomingCall').style.visibility = 'visible';
            break;
        case 'answer':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            break;
        case 'candidate':
            if (peerConnection) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;
        default:
            console.error('Unknown message type:', data.type);
    }
});
