import JanusVideoRoomPublisher from "./JanusVideoRoomPublisher";
import JanusPlugin from "./../../utils/JanusPlugin";
import Janus from "./../../Janus";

export default class JanusVideoRoomPlugin extends JanusPlugin {
  /**
   * Array of video room publishers
   * @type {JanusVideoRoomPublisher[]}
   */
  publishers = null;

  /**
   *
   * @type {Janus.MediaStream}
   */
  stream = null;

  /**
   *
   * @callback onPublishersListener
   * @param {JanusVideoRoomPublisher[]} publishers
   */
  /**
   *
   * @type {onPublishersListener}
   */
  onPublishersListener = null;
  /**
   *
   * @callback onPublisherJoinedListener
   * @param {JanusVideoRoomPublisher} publisher
   */
  /**
   *
   * @type {onPublisherJoinedListener}
   */
  onPublisherJoinedListener = null;
  /**
   *
   * @callback onPublisherLeftListener
   * @param {number} publisherID
   */
  /**
   *
   * @type {onPublisherLeftListener}
   */
  onPublisherLeftListener = null;
  /**
   *
   * @callback onPublisherUpdatedListener
   * @param {JanusVideoRoomPublisher} publisher
   */
  /**
   *
   * @type {onPublisherUpdatedListener}
   */
  onPublisherUpdatedListener = null;
  /**
   *
   * @callback onStreamAddedListener
   * @param {Janus.MediaStream} stream
   */
  /**
   *
   * @type {onStreamAddedListener}
   */
  onStreamAddedListener = null;
  /**
   *
   * @callback onStreamRemovedListener
   * @param {Janus.MediaStream} stream
   */
  /**
   *
   * @type {onStreamRemovedListener}
   */
  onStreamRemovedListener = null;

  /**
   *
   * @param {Janus} janus
   */
  constructor(janus) {
    super("janus.plugin.videoroom", janus);

    this.userID = null;
    this.userPrivateID = null;
    this.publishers = null;

    this.roomID = null;
    this.displayName = null;
    this.stream = null;

    this.isRemoteDescriptionSet = false;
  }

  getUserID = () => this.userID;
  getUserPrivateID = () => this.userPrivateID;

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
   * @returns {JanusVideoRoomPublisher[]}
   */
  getPublishers = () => {
    return this.publishers;
  };

  /**
   *
   * @param listener {onPublishersListener}
   */
  setOnPublishersListener = (listener) => {
    this.onPublishersListener = listener;
  };

  /**
   *
   * @param listener {onPublisherJoinedListener}
   */
  setOnPublisherJoinedListener = (listener) => {
    this.onPublisherJoinedListener = listener;
  };

  /**
   *
   * @param listener {onPublisherLeftListener}
   */
  setOnPublisherLeftListener = (listener) => {
    this.onPublisherLeftListener = listener;
  };

  /**
   *
   * @param listener {setOnPublisherUpdatedListener}
   */
  setOnPublisherUpdatedListener = (listener) => {
    this.onPublisherUpdatedListener = listener;
  };

  /**
   *
   * @param listener {onStreamAddedListener}
   */
  setOnStreamAddedListener = (listener) => {
    this.onStreamAddedListener = listener;
  };

  /**
   *
   * @param listener {onStreamRemovedListener}
   */
  setOnStreamRemovedListener = (listener) => {
    this.onStreamRemovedListener = listener;
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
        if (this.isRemoteDescriptionSet) {
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

        if (data.videoroom === "event") {
          if (data.room === this.roomID) {
            if (typeof data["unpublished"] !== "undefined") {
              // let unpublishedPublisherID = data['unpublished'];
              // let leavingPublisherID = data['leaving'];
              // if (this.onPublisherLeftListener != null && typeof this.onPublisherLeftListener === 'function') {
              //     this.onPublisherLeftListener(leavingPublisherID);
              // }
              return;
            } else if (typeof data["leaving"] !== "undefined") {
              let leavingPublisherID = data["leaving"];
              if (
                this.onPublisherLeftListener != null &&
                typeof this.onPublisherLeftListener === "function"
              ) {
                this.onPublisherLeftListener(leavingPublisherID);
              }
              return;
            } else if (typeof data["publishers"] !== "undefined") {
              let newPublishers = data["publishers"].map(
                (publisherData) => new JanusVideoRoomPublisher(publisherData)
              );
              for (let i = 0; i < newPublishers.length; i++) {
                if (
                  this.onPublisherJoinedListener != null &&
                  typeof this.onPublisherJoinedListener === "function"
                ) {
                  this.onPublisherJoinedListener(newPublishers[i]);
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

  forward = async ({
    host,
    audioPort,
    audioPt,
    videoPort,
    videoPt,
    secret,
  }) => {
    try {
      let additionalConfig = {};

      if (secret) {
        additionalConfig.secret = secret;
      }

      const rtpForwardResponse = await this.sendAsync({
        request: "rtp_forward",
        publisher_id: this.userID,
        room: this.roomID,
        audio_port: audioPort,
        audio_pt: audioPt,
        video_port: videoPort,
        video_pt: videoPt,
        host: host,
        ...additionalConfig,
      });

      if (
        rtpForwardResponse &&
        rtpForwardResponse.plugindata &&
        rtpForwardResponse.plugindata.data &&
        rtpForwardResponse.plugindata.data.rtp_stream
      ) {
        return true;
      }

      console.error("rtpForwardResponse", "success!", rtpForwardResponse);
    } catch (e) {
      console.error("streaming", e);
    }
  };

  muteAudio() {}

  unmuteAudio() {}

  closeVideo() {}

  openVideo() {}

  /**
   *
   * @returns {Promise<void>}
   */
  join = async () => {
    try {
      let joinResponse = await this.sendAsync({
        request: "join",
        room: this.roomID,
        display: this.displayName,
        ptype: "publisher",
      });

      if (
        joinResponse.janus === "event" &&
        joinResponse.plugindata &&
        joinResponse.plugindata.data
      ) {
        let data = joinResponse.plugindata.data;
        if (data.videoroom === "joined") {
          this.userID = data.id;
          this.userPrivateID = data.private_id;
          this.publishers = data.publishers.map(
            (publisherData) => new JanusVideoRoomPublisher(publisherData)
          );

          if (
            this.onPublishersListener != null &&
            typeof this.onPublishersListener === "function"
          ) {
            this.onPublishersListener(this.publishers);
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
   * @returns {Promise<void>}
   */
  leave = async () => {};

  /**
   *
   * @param {Janus.MediaStream} stream
   * @returns {Promise<void>}
   */
  publish = async (stream, audio = true, video = true) => {
    try {
      console.log("joined to room.");

      this.pc.addStream(stream);

      let offer = await this.pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await this.pc.setLocalDescription(offer);

      // offer.sdp = offer.sdp.replace(/a=extmap:(\d+) urn:3gpp:video-orientation\n?/, '');

      let response = await this.sendAsyncWithJsep(
        {
          request: "configure",
          audio: audio,
          video: video,
          bitrate: 128 * 1000,
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

  /**
   * @returns {Promise<void>}
   */
  unpublish = async () => {
    try {
      const unpublishResponse = await this.sendAsync({
        request: "unpublish",
      });

      if (
        unpublishResponse &&
        unpublishResponse.plugindata &&
        unpublishResponse.plugindata.data &&
        unpublishResponse.plugindata.data.unpublished === "ok"
      ) {
        return;
      }

      console.error("unpublishResponse", unpublishResponse);
    } catch (e) {
      console.error("unpublish", e);
    }
  };

  /**
   *
   * @param privateID
   * @param {JanusVideoRoomPublisher} publisher
   * @returns {Promise<void>}
   */
  receive = async (privateID, publisher, audio = true, video = true) => {
    try {
      let joinResponse = await this.sendAsync({
        request: "join",
        room: this.roomID,
        ptype: "subscriber",
        feed: publisher.id,
        private_id: privateID,
      });

      if (
        joinResponse &&
        joinResponse.plugindata &&
        joinResponse.plugindata.data &&
        joinResponse.plugindata.data.videoroom === "attached"
      ) {
        // OK
      }

      await this.pc.setRemoteDescription(
        new Janus.RTCSessionDescription({
          sdp: joinResponse.jsep.sdp,
          type: joinResponse.jsep.type,
        })
      );
      this.isRemoteDescriptionSet = true;

      for (const candidate of this.cachedCandidates) {
        await this.pc.addIceCandidate(candidate);
      }
      this.cachedCandidates = [];

      let answer = await this.pc.createAnswer({
        offerToReceiveAudio: audio,
        offerToReceiveVideo: video,
      });

      await this.pc.setLocalDescription(answer);

      const startResponse = await this.sendAsyncWithJsep(
        {
          request: "start",
          room: this.roomID,
        },
        {
          type: answer.type,
          sdp: answer.sdp,
        }
      );

      if (
        startResponse &&
        startResponse.plugindata &&
        startResponse.plugindata.data &&
        startResponse.plugindata.data.started === "ok"
      ) {
        // OK
      }
    } catch (e) {
      console.error("receive", e);
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

  create = ({}) => {};

  exists = () => {};

  destroy = () => {};

  listAll = () => {};

  listParticipants = () => {};

  update = () => {};
}
