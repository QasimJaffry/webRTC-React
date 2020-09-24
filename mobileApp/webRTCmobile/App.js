/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
} from 'react-native-webrtc';

import io from 'socket.io-client';

const dimensions = Dimensions.get('window');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      localStream: null,
      remoteStream: null,
    };

    this.sdp;
    (this.socket = null), (this.candidates = []);
  }

  componentDidMount() {
    this.socket = io.connect('https://06dbe24462bf.ngrok.io/webrtcPeer', {
      path: '/io/webrtc',
      query: {},
    });

    this.socket.on('connection-success', (success) => {
      console.log(success);
    });

    this.socket.on('offerOrAnswer', (sdp) => {
      this.sdp = JSON.stringify(sdp);

      // set sdp as remote description
      this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.socket.on('candidate', (candidate) => {
      // this.candidates = [...this.candidates, candidate];
      this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    //  const pcConfig = null;

    const pcConfig = {
      iceServers: [
        {urls: 'stun:stun.services.mozilla.com'},
        {urls: 'stun:stun.l.google.com:19302'},
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'beaver',
          username: 'webrtc.websitebeaver@gmail.com',
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
        this.sendToPeer('candidate', e.candidate);
      }
    };

    // triggered when there is a change in connection state
    this.pc.oniceconnectionstatechange = (e) => {
      console.log(e); //if new peer is there
    };

    // triggered when a stream is added to pc, see below - this.pc.ontrack(stream)
    this.pc.onaddstream = (e) => {
      debugger;
      // this.remoteVideoref.current.srcObject = e.streams[0]
      setTimeout(() => {
        this.setState({
          remoteStream: e.stream,
        });
      }, 3000);
    };

    // called when getUserMedia() successfully returns - see below
    const success = (stream) => {
      this.setState({
        localStream: stream,
      }); //local stream
      this.pc.addStream(stream); //remote
    };

    // called when getUserMedia() fails
    const failure = (e) => {
      console.log('Error', e);
    };

    let isFront = true;
    mediaDevices.enumerateDevices().then((sourceInfos) => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'front' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }

      const constraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 500, // Provide your own width, height and frame rate here
            minHeight: 300,
            minFrameRate: 30,
          },
          facingMode: isFront ? 'user' : 'environment',
          optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
        },
      };

      mediaDevices.getUserMedia(constraints).then(success).catch(failure);
    });
  }

  createOffer = () => {
    console.log('offer');
    // initiates the creation of SDP
    this.pc.createOffer({offerToReceiveVideo: 1}).then((sdp) => {
      //offer is made and if it is success then we send the sdp to localdesciotion
      console.log(JSON.stringify(sdp));

      // set offer sdp as local description
      this.pc.setLocalDescription(sdp);

      this.sendToPeer('offerOrAnswer', sdp);
    });
  };

  // creates an SDP answer to an offer received from remote peer
  createAnswer = () => {
    console.log('Answer');
    this.pc.createAnswer({offerToReceiveVideo: 1}).then((sdp) => {
      //offer is made and if it is success then we send the sdp to localdesciotion for answering the call
      console.log(JSON.stringify(sdp));

      // set answer sdp as local description
      this.pc.setLocalDescription(sdp);

      this.sendToPeer('offerOrAnswer', sdp);
    });
  };

  setRemoteDescription = () => {
    // retrieve and parse the SDP copied from the remote peer
    const desc = JSON.parse(this.sdp);

    // set sdp as remote description
    this.pc.setRemoteDescription(new RTCSessionDescription(desc));
  };

  addCandidate = () => {
    // retrieve and parse the Candidate copied from the remote peer

    this.candidates.forEach((candidate) => {
      console.log(JSON.stringify(candidate));

      // add the candidate to the peer connection
      this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  };

  sendToPeer = (messageType, payload) => {
    this.socket.emit(messageType, {
      socketID: this.socket.id,
      payload,
    });
  };

  render() {
    const {localStream, remoteStream} = this.state;

    const remoteVideo = remoteStream ? (
      <RTCView
        key={2}
        mirror={true}
        style={styles.rtcRemote}
        objectFit="contain"
        streamURL={remoteStream && remoteStream.toURL()}
      />
    ) : (
      <View style={{padding: 15}}>
        <Text style={{fontSize: 22, textAlign: 'center', color: 'white'}}>
          Waiting for Peer connection...
        </Text>
      </View>
    );
    return (
      <SafeAreaView style={{flex: 1}}>
        <View style={styles.buttonContainer}>
          <View style={{flex: 1}}>
            <TouchableOpacity onPress={this.createOffer}>
              <View style={styles.button}>
                <Text style={styles.text}>Call</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={{flex: 1}}>
            <TouchableOpacity onPress={this.createAnswer}>
              <View style={styles.button}>
                <Text style={styles.text}>Answer</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.videoContainer}>
          <View
            style={{
              position: 'absolute',
              backgroundColor: 'black',
              width: 100,
              height: 200,
              bottom: 10,
              right: 10,
              zIndex: 1,
            }}>
            <View style={{flex: 1}}>
              <TouchableOpacity>
                <View>
                  <RTCView
                    key={1}
                    zOrder={0}
                    objectFit="cover"
                    style={{...styles.rctView}}
                    streamURL={localStream && localStream.toURL()}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.scrollView}>
            <View
              style={{
                flex: 1,
                width: '100%',
                backgroundColor: 'black',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              {remoteVideo}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    margin: 5,
    paddingVertical: 10,
    backgroundColor: '#ccc',
    borderRadius: 20,
    // paddingLeft: 20,
  },
  text: {
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'Avenir',
  },
  videoContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  rctView: {
    width: 100,
    height: 200,
    backgroundColor: 'black',
  },
  scrollView: {
    flex: 1,
    // backgroundColor: 'teal',
    padding: 15,
  },
  rtcRemote: {
    width: dimensions.width - 30,
    height: 200,
    backgroundColor: 'black',
  },
});

export default App;
