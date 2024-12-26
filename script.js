const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallBtn = document.getElementById('startCallBtn');
const endCallBtn = document.getElementById('endCallBtn');

let localStream;
let remoteStream;
let peerConnection;

const signalingServer = new WebSocket('ws://106.201.9.98:8080');

// ICE Servers for NAT traversal
const iceConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' } // Public STUN server
    ]
};

// Event listeners for buttons
startCallBtn.addEventListener('click', startCall);
endCallBtn.addEventListener('click', endCall);

signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);

    switch (data.type) {
        case 'offer':
            await handleOffer(data.offer);
            break;
        case 'answer':
            await handleAnswer(data.answer);
            break;
        case 'candidate':
            await handleCandidate(data.candidate);
            break;
        default:
            console.error('Unknown message type:', data.type);
    }
};

async function startCall() {
    // Get local media
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(iceConfig);

    // Add tracks to peer connection
    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    // Handle incoming remote tracks
    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            signalingServer.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalingServer.send(JSON.stringify({ type: 'offer', offer }));

    // Update UI
    startCallBtn.disabled = true;
    endCallBtn.disabled = false;
}

async function handleOffer(offer) {
    peerConnection = new RTCPeerConnection(iceConfig);

    // Handle incoming remote tracks
    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    // Add local stream tracks
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            signalingServer.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
        }
    };

    // Set remote description and create answer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signalingServer.send(JSON.stringify({ type: 'answer', answer }));

    // Update UI
    startCallBtn.disabled = true;
    endCallBtn.disabled = false;
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function endCall() {
    // Close peer connection and stop streams
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        localStream = null;
        localVideo.srcObject = null;
    }

    if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
        remoteStream = null;
        remoteVideo.srcObject = null;
    }

    // Notify the other peer (optional)
    signalingServer.send(JSON.stringify({ type: 'end' }));

    // Update UI
    startCallBtn.disabled = false;
    endCallBtn.disabled = true;
}
