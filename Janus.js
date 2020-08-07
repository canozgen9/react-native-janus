import JanusSocket from './utils/JanusSocket';

export default class Janus {
    /**
     * @type {RTCSessionDescription}
     */
    static RTCSessionDescription;
    /**
     * @type {RTCPeerConnection}
     */
    static RTCPeerConnection;
    /**
     * @type {RTCIceCandidate}
     */
    static RTCIceCandidate;

    apiSecret = null;
    iceServers = [];

    constructor(address) {
        this.socket = new JanusSocket(address);
    }

    /**
     *
     * @param RTCSessionDescription
     * @param RTCPeerConnection
     * @param RTCIceCandidate
     * @param MediaStream
     */
    static setDependencies = ({RTCSessionDescription, RTCPeerConnection, RTCIceCandidate, MediaStream}) => {
        Janus.RTCSessionDescription = RTCSessionDescription;
        Janus.RTCPeerConnection = RTCPeerConnection;
        Janus.RTCIceCandidate = RTCIceCandidate;
        Janus.MediaStream = MediaStream;
    };

    init = async () => {
        await this.socket.connect();
    };

    destroy = async () => {
        try {
            const destroySessionResponse = await this.socket.sendAsync({
                'janus': 'destroy',
                'session_id': this.socket.sessionID,
            });
        } catch (e) {
            console.error('destroy janus', e);
        }

        try {
            await this.socket.disconnect();
        } catch (e) {
            console.error('destroy socket', e);
        }
    };

    /**
     *
     * @param secret
     */
    setApiSecret = (secret) => {
        this.apiSecret = secret;
    };

    /**
     *
     * @param {Object[]} iceServers
     */
    setIceServers = (iceServers) => {
        this.iceServers = iceServers;
    };
}
