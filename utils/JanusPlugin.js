import JanusUtils from './JanusUtils';
import Janus from './../Janus';
import iceServers from './iceServers';

class JanusPlugin {
    /**
     *
     * @callback onWebRTCUpListener
     */
    /**
     *
     * @type {onWebRTCUpListener}
     */
    onWebRTCUpListener = null;

    /**
     *
     * @callback onStreamListener
     */
    /**
     *
     * @type {onStreamListener}
     */
    onStreamListener = null;

    /**
     *
     * @type {boolean}
     */
    isWebRtcUp = false;

    /**
     * @type {Janus.RTCPeerConnection}
     */
    pc = null;

    /**
     * @type {Janus.RTCIceCandidate[]}
     */
    cachedCandidates = [];

    /**
     *
     * @type {Janus}
     */
    janus = null;

    /**
     *
     * @type {boolean}
     */
    isReceivingAudio = false;


    /**
     *
     * @type {boolean}
     */
    isReceivingVideo = false;

    /**
     *
     * @param id
     * @param {Janus} janus
     */
    constructor(id, janus) {
        this.id = id;
        this.janus = janus;
        this.handleID = null;
    }

    connect = async () => {
        return new Promise(((resolve, reject) => {
            this.janus.socket.send({
                'janus': 'attach',
                'plugin': this.id,
                'opaque_id': `janus-${JanusUtils.randomString(12)}`,
                'session_id': this.janus.socket.sessionID,
            }, (response) => {
                if (response.janus === 'success') {
                    this.handleID = response.data.id;
                    this.janus.socket.attachPlugin(this);
                    resolve();
                    return;
                }
                reject();
            });
        }));
    };

    createPeer = async () => {
        this.pc = new Janus.RTCPeerConnection({
            'iceServers': [
                ...iceServers['iceServers'],
                ...this.janus.iceServers,
            ]
        });

        this.pc.onicecandidate = async (event) => {
            if (!event.candidate || event.candidate.candidate.indexOf('endOfCandidates') > 0) {

            } else {
                await this.sendCandidateAsync(event.candidate);
            }
        };

        this.pc.onaddstream = (event) => {
            if (event && event.stream) {
                if (this.onStreamListener && typeof this.onStreamListener === 'function') {
                    this.onStreamListener(event.stream);
                }
            }
        };

        this.pc.onremovestream = (event) => {
            //fixme: what to do on remove stream?
            console.error('onremovestream', event);
            if (this.onStreamListener && typeof this.onStreamListener === 'function') {
                this.onStreamListener(null);
            }
        };

        this.pc.onnegotiationneeded = (e) => {
            console.log('onnegotiationneeded', e.target);
        };

        this.pc.onconnectionstatechange = (e) => {
            e.target.connectionState; // new, connected, connecting
            e.target.signalingState; // stable, have-local-offer, have-remote-offer, have-local-pranswer, have-remote-pranswer, closed
            e.target.iceConnectionState; // new, checking, connected,  completed, failed, disconnected, closed
            e.target.iceGatheringState; // new, complete, gathering
            console.log('connectionState', e.target.connectionState);
        };

        this.pc.onsignalingstatechange = (e) => {
            console.log('signalingState', e.target.signalingState);
        };

        this.pc.onicecandidateerror = (e) => {
            console.log('onicecandidateerror', e);
        };

        this.pc.onicegatheringstatechange = (e) => {
            console.log('iceConnectionState', e.target.iceConnectionState);
        };

        this.pc.oniceconnectionstatechange = (e) => {
            console.log('iceGatheringState', e.target.iceGatheringState);
        };
    };

    /**
     *
     * @param listener {onWebRTCUpListener}
     */
    setOnWebRTCUpListener = (listener) => {
        this.onWebRTCUpListener = listener;
    };

    /**
     *
     * @param listener {onStreamListener}
     */
    setOnStreamListener = (listener) => {
        this.onStreamListener = listener;
    };

    send = (request, callback) => {
        return this.janus.socket.send({
            'janus': 'message',
            'session_id': this.janus.socket.sessionID,
            'handle_id': this.handleID,
            'body': request,
        }, callback);
    };

    sendAsyncWithJsep = (request, jsep) => {
        return this.janus.socket.sendAsync({
            'janus': 'message',
            'session_id': this.janus.socket.sessionID,
            'handle_id': this.handleID,
            'body': request,
            'jsep': jsep,
        });
    };

    sendCandidateAsync = (candidate) => {
        return this.janus.socket.sendAsync({
            'janus': 'trickle',
            'session_id': this.janus.socket.sessionID,
            'handle_id': this.handleID,
            'candidate': candidate,
        });
    };

    sendAsync = (request) => {
        let additionalConfig = {};
        if (this.janus.apiSecret) {
            additionalConfig['apisecret'] = this.janus.apiSecret;
        }
        return this.janus.socket.sendAsync({
            'janus': 'message',
            'session_id': this.janus.socket.sessionID,
            'handle_id': this.handleID,
            'body': request,
            ...additionalConfig,
        });
    };

    detach = () => {
        let additionalConfig = {};

        if (this.janus.apiSecret) {
            additionalConfig['apisecret'] = this.janus.apiSecret;
        }

        return this.janus.socket.sendAsync({
            'janus': 'detach',
            'session_id': this.janus.socket.sessionID,
            'handle_id': this.handleID,
            ...additionalConfig,
        });
    };
}

export default JanusPlugin;
