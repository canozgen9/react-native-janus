import JanusPlugin from "calldemo/node_modules/react-native-janus/utils/JanusPlugin.js";
import { Janus } from "../../node_modules/react-native-janus";
import JanusAudioBridgeParticipant from "./AudioBridgeParticipant";

export default class JanusAudioBridgePulgin extends JanusPlugin {
  /**
   * Array of audio bridge participants
   * @type {JanusAudioBridgeParticipant[]}
   */
  participants = null;

  /**
   *
   * @callback onParticipantsListener
   * @param {JanusAudioBridgeParticipant[]} participants
   */
  /**
   *
   * @type {onPublishersListener}
   */
  onPublishersListener = null;
  /**
   *
   * @callback onParticipantLeftListener
   * @param {number} participantID
   */
  /**
   *
   * @type {onParticipantLeftListener}
   */
  onParticipantLeftListener = null;
  /**
   *
   * @param {Janus} janus
   */
  /**
   *
   * @callback onParticipantJoinedListener
   * @param {onParticipantJoinedListener} participant
   */
  /**
   *
   * @type {onParticipantJoinedListener}
   */
  onParticipantJoinedListener = null;
  constructor(janus) {
    super("janus.plugin.audiobridge", janus);

    this.userID = null;
    this.participants = null;

    this.roomID = null;
    this.displayName = null;
    this.stream = null;

    this.isRemoteDescriptionSet = false;
  }

  getUserID = () => this.userID;

  /**
   *
   * @param {Number} roomID
   */
  setRoomID = (roomID) => {
    this.roomID = roomID;
  };

  /**
   *
   * @param {String} displayName
   */
  setDisplayName = (displayName) => {
    this.displayName = displayName;
  };

  /**
   *
   * @param listener {onParticipantsListener}
   */
  setOnParticipantsListener = (listener) => {
    this.onParticipantsListener = listener;
  };
  /**
   *
   * @param listener {onParticipantJoinedListener}
   */
  setOnParticipantJoinedListener = (listener) => {
    this.onParticipantJoinedListener = listener;
  };

  /**
   *
   * @param listener {onParticipantLeftListener}
   */
  setOnParticipantLeftListener = (listener) => {
    this.onParticipantLeftListener = listener;
  };

  onMessage = async (message) => {
    switch (message.janus) {
      case "webrtcup": {
        this.isWebRtcUp = true;
        if (
          this.onWebRTCUpListener &&
          typeof this.onWebRTCUpListener === "function"
        ) {
          this.onWebRTCUpListener();
        }
        return;
      }

      case "media": {
        if (message.type === "audio") {
          this.isReceivingAudio = message.receiving;
          console.log(
            "plugin",
            (message.receiving ? "" : "not ") + "receiving audio now..."
          );
        } else if (message.type === "video") {
          this.isReceivingVideo = message.receiving;
          console.log(
            "plugin",
            (message.receiving ? "" : "not ") + "receiving video now..."
          );
        }
        return;
      }

      case "trickle": {
        console.log("got trickle");
        if (this.isRemoteDescriptionSet) {
          console.log("adding ice to pc");
          await this.pc.addIceCandidate(
            new Janus.RTCIceCandidate({
              candidate: message.candidate.candidate,
              sdpMid: message.candidate.sdpMid,
              sdpMLineIndex: message.candidate.sdpMLineIndex,
            })
          );
        }

        this.cachedCandidates.push(
          new Janus.RTCIceCandidate({
            candidate: message.candidate.candidate,
            sdpMid: message.candidate.sdpMid,
            sdpMLineIndex: message.candidate.sdpMLineIndex,
          })
        );

        return;
      }

      case "hangup": {
        message.reason;
        console.log("plugin", "hangup", message.reason);
        return;
      }

      case "detached": {
        console.log("plugin", "detached");
        return;
      }

      case "slowlink": {
        console.log("plugin", "slowlink", message);
        return;
      }

      case "event": {
        const data = message.plugindata.data;

        if (data.audiobridge === "event") {
          if (data.room === this.roomID) {
            if (typeof data["leaving"] !== "undefined") {
              let leavingParticipantID = data["leaving"];
              if (
                this.onParticipantLeftListener != null &&
                typeof this.onParticipantLeftListener === "function"
              ) {
                this.onParticipantLeftListener(leavingParticipantID);
              }
              return;
            } else if (typeof data["publishers"] !== "undefined") {
              let newParticipants = data["participants"].map(
                (participantsrData) =>
                  new JanusAudioBridgeParticipant(participantsrData)
              );
              for (let i = 0; i < newParticipants.length; i++) {
                if (
                  this.onParticipantJoinedListener != null &&
                  typeof this.onParticipantJoinedListener === "function"
                ) {
                  this.onParticipantJoinedListener(newParticipants[i]);
                }
              }
              return;
            }
          }
        }

        console.log("plugin", "event", data);
        return;
      }
    }
  };

  /**
   *
   * @returns {Promise<void>}
   */
  join = async (roomid) => {
    try {
      let joinResponse = await this.sendAsync({
        request: "join",
        room: roomid,
        display: this.displayName,
        muted: false,
      });

      if (
        joinResponse.janus === "event" &&
        joinResponse.plugindata &&
        joinResponse.plugindata.data
      ) {
        let data = joinResponse.plugindata.data;
        if (data.audiobridge === "joined") {
          this.userID = data.id;
          this.participants = data.participants.map(
            (participantsrData) =>
              new JanusAudioBridgeParticipant(participantsrData)
          );

          if (
            this.onParticipantsListener != null &&
            typeof this.onParticipantsListener === "function"
          ) {
            this.onParticipantsListener(this.participants);
          }

          return;
        } else {
          console.error("join", joinResponse);
        }
      } else {
        console.error("join", joinResponse);
      }
    } catch (e) {
      console.error("join", e);
    }
  };

  /**
   *
   * @param {Janus.MediaStream} stream
   * @returns {Promise<void>}
   */
  configure = async (stream) => {
    try {
      console.log("joined to room.");

      this.pc.addStream(stream);

      let offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.pc.setLocalDescription(offer);

      // offer.sdp = offer.sdp.replace(/a=extmap:(\d+) urn:3gpp:video-orientation\n?/, '');

      let response = await this.sendAsyncWithJsep(
        {
          request: "configure",
          muted: false,
          // recording preferences
          record: true,
          filename: "recording.wav",
        },
        {
          type: offer.type,
          sdp: offer.sdp,
        }
      );

      await this.pc.setRemoteDescription(
        new Janus.RTCSessionDescription({
          sdp: response.jsep.sdp,
          type: response.jsep.type,
        })
      );
      this.isRemoteDescriptionSet = true;

      for (const candidate of this.cachedCandidates) {
        await this.pc.addIceCandidate(candidate);
      }
      this.cachedCandidates = [];
    } catch (e) {
      console.log(e);
    }
  };

  detach = async () => {
    try {
      let additionalConfig = {};

      if (this.janus.apiSecret) {
        additionalConfig["apisecret"] = this.janus.apiSecret;
      }

      const hangupResponse = await this.janus.socket.sendAsync({
        janus: "hangup",
        session_id: this.janus.socket.sessionID,
        handle_id: this.handleID,
        ...additionalConfig,
      });

      if (hangupResponse.janus === "success") {
      }

      const detachResponse = await this.detach();

      if (detachResponse.janus === "success") {
      }

      this.pc.close();
      this.janus.socket.detachPlugin(this);

      console.error("detach", "hangupResponse", hangupResponse);
      console.error("detach", "detachResponse", detachResponse);
    } catch (e) {
      console.error("detach", e);
    }
  };

  create = async (room) => {
    try {
      let createResponse = await this.sendAsync({
        request: "create",
        room: room,
        description: "demo",
        record: true,
      });
      this.setRoomID(room);

      // todo finish response handling
      console.log("create respone", createResponse);
    } catch (e) {
      console.log("create", e);
    }
  };
}
