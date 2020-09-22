import React from "react";
//ngork for https link
import io from "socket.io-client";

class App extends React.Component {
  constructor(props) {
    super();
    this.localVideoRef = React.createRef();
    this.remoteVideoRef = React.createRef();

    this.socket = null;
    this.candidates = [];
  }

  componentDidMount() {
    this.socket = io("/webrtcPeer", {
      path: "/webrtc-practice",
      query: {},
    });

    this.socket.on("connection-success", (success) => {
      console.log(success);
    });

    this.socket.on("offerOrAnswer", (sdp) => {
      this.textRef.value = JSON.stringify(sdp);

      this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket.on("candidate", (candidate) => {
      // this.candidates = [...this.candidates, candidate];
      this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    //  const pcConfig = null;

    const pcConfig = {
      iceServers: [
        { urls: "stun:stun.services.mozilla.com" },
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "beaver",
          username: "webrtc.websitebeaver@gmail.com",
        },
      ],
    };

    this.pc = new RTCPeerConnection(pcConfig); // instantiate connection between two peers

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.sendToPeer("candidate", e.candidate);
      }
    };

    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e); //if new peer is there
    };

    this.pc.onaddstream = (e) => {
      this.remoteVideoRef.current.srcObject = e.stream; //remote stream
    };

    const constraints = { video: true };

    const success = (stream) => {
      this.localVideoRef.current.srcObject = stream; //local stream
      this.pc.addStream(stream); //remote
    };

    const failure = (e) => {
      console.log("Error", e);
    };

    navigator.mediaDevices
      .getUserMedia(constraints) //to get permission for vid or aud
      .then(success)
      .catch(failure);

    // navigator.getUserMedia(constraints, success, failure);

    // (async () => {
    //   const stream = await navigator.mediaDevices.getUserMedia(constraints);
    //   success(stream);
    // })().catch(failure);
  }

  createOffer = () => {
    console.log("offer");
    this.pc.createOffer({ offerToReceiveVideo: 1 }).then((sdp) => {
      //offer is made and if it is success then we send the sdp to localdesciotion
      console.log(JSON.stringify(sdp));
      this.pc.setLocalDescription(sdp);

      this.sendToPeer("offerOrAnswer", sdp);
    });
  };

  setRemoteDescription = () => {
    const desc = JSON.parse(this.textRef.value);

    this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  };

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload,
    });
  };

  createAnswer = () => {
    console.log("Answer");
    this.pc.createAnswer({ offerToReceiveVideo: 1 }).then((sdp) => {
      //offer is made and if it is success then we send the sdp to localdesciotion for answering the call
      console.log(JSON.stringify(sdp));
      this.pc.setLocalDescription(sdp);

      this.sendToPeer("offerOrAnswer", sdp);
    });
  };

  addCandidate = () => {
    // const candidate = JSON.parse(this.textRef.value);
    // console.log("Add Candidate", candidate);
    // this.pc.addIceCandidate(new RTCIceCandidate(candidate));

    this.candidates.forEach((candidate) => {
      console.log(JSON.stringify(candidate));
      this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  };

  render() {
    return (
      <div>
        <video
          style={{
            width: 250,
            height: 250,
            margin: 5,
            backgroundColor: "black",
          }}
          ref={this.localVideoRef}
          autoPlay
        ></video>

        <video
          style={{
            width: 250,
            height: 250,
            margin: 5,
            backgroundColor: "black",
          }}
          ref={this.remoteVideoRef}
          autoPlay
        ></video>

        <button onClick={this.createOffer}>Offer</button>
        <button onClick={this.createAnswer}>Answer</button>

        <br />
        <textarea
          ref={(ref) => {
            this.textRef = ref;
          }}
        />
      </div>
    );
  }
}

export default App;
