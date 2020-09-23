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
    this.socket = io.connect("https://6601f291beab.ngrok.io/webrtcPeer", {
      path: "/io/website",
      query: {},
    });

    this.socket.on("connection-success", (success) => {
      console.log(success);
    });

    this.socket.on("offerOrAnswer", (sdp) => {
      this.textRef.value = JSON.stringify(sdp);

      // set sdp as remote description
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

    // create an instance of RTCPeerConnection
    this.pc = new RTCPeerConnection(pcConfig); // instantiate connection between two peers

    // triggered when a new candidate is returned
    this.pc.onicecandidate = (e) => {
      // send the candidates to the remote peer
      // see addCandidate below to be triggered on the remote peer
      if (e.candidate) {
        this.sendToPeer("candidate", e.candidate);
      }
    };

    // triggered when there is a change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e); //if new peer is there
    };

    // triggered when a stream is added to pc, see below - this.pc.ontrack(stream)
    this.pc.ontrack = (e) => {
      this.remoteVideoRef.current.srcObject = e.streams[0]; //remote stream
    };

    // called when getUserMedia() successfully returns - see below
    const success = (stream) => {
      this.localVideoRef.current.srcObject = stream; //local stream
      this.pc.addStream(stream); //remote
    };

    // called when getUserMedia() fails
    const failure = (e) => {
      console.log("Error", e);
    };

    const constraints = {
      audio: false,
      video: true,
      // video: {
      //   width: 1280,
      //   height: 720
      // },
      // video: {
      //   width: { min: 1280 },
      // }
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
    // initiates the creation of SDP
    this.pc.createOffer({ offerToReceiveVideo: 1 }).then((sdp) => {
      //offer is made and if it is success then we send the sdp to localdesciotion
      console.log(JSON.stringify(sdp));

      // set offer sdp as local description
      this.pc.setLocalDescription(sdp);

      this.sendToPeer("offerOrAnswer", sdp);
    });
  };

  setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.textRef.value);

    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  };

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload,
    });
  };

  // creates an SDP answer to an offer received from remote peer
  createAnswer = () => {
    console.log("Answer");
    this.pc.createAnswer({ offerToReceiveVideo: 1 }).then((sdp) => {
      //offer is made and if it is success then we send the sdp to localdesciotion for answering the call
      console.log(JSON.stringify(sdp));

      // set answer sdp as local description
      this.pc.setLocalDescription(sdp);

      this.sendToPeer("offerOrAnswer", sdp);
    });
  };

  addCandidate = () => {
    // retrieve and parse the Candidate copied from the remote peer

    // const candidate = JSON.parse(this.textRef.value);
    // console.log("Add Candidate", candidate);
    // this.pc.addIceCandidate(new RTCIceCandidate(candidate));

    this.candidates.forEach((candidate) => {
      console.log(JSON.stringify(candidate));

      // add the candidate to the peer connection
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
