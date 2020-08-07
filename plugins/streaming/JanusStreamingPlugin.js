import JanusPlugin from './../../utils/JanusPlugin';
import Janus from './../../Janus';

export default class JanusStreamingPlugin extends JanusPlugin {
    /**
     *
     * @param {Janus} janus
     */
    constructor(janus) {
        super('janus.plugin.streaming', janus);

        this.isRemoteDescriptionSet = false;
        this.cachedCandidates = [];
    }

    onMessage = async (message) => {
        switch (message.janus) {
            case 'webrtcup': {
                this.isWebRtcUp = true;
                if (this.onWebRTCUpListener && typeof this.onWebRTCUpListener === 'function') {
                    this.onWebRTCUpListener();
                }
                return;
            }

            case 'media': {
                if (message.type === 'audio') {
                    this.isReceivingAudio = message.receiving;
                    console.log('plugin', (message.receiving ? '' : 'not ') + 'receiving audio now...');
                } else if (message.type === 'video') {
                    this.isReceivingVideo = message.receiving;
                    console.log('plugin', (message.receiving ? '' : 'not ') + 'receiving video now...');
                }
                return;
            }

            case 'trickle': {

                if (this.isRemoteDescriptionSet) {
                    await this.pc.addIceCandidate(new Janus.RTCIceCandidate({
                        candidate: message.candidate.candidate,
                        sdpMid: message.candidate.sdpMid,
                        sdpMLineIndex: message.candidate.sdpMLineIndex,
                    }));
                }

                this.cachedCandidates.push(new Janus.RTCIceCandidate({
                    candidate: message.candidate.candidate,
                    sdpMid: message.candidate.sdpMid,
                    sdpMLineIndex: message.candidate.sdpMLineIndex,
                }));
                return;
            }

            case 'hangup': {
                message.reason;
                console.log('plugin', 'hangup', message.reason);
                return;
            }

            case 'detached': {
                console.log('plugin', 'detached');
                return;
            }

            case 'slowlink': {
                console.log('plugin', 'slowlink', message);
                return;
            }

            case 'event': {
                const data = message.plugindata.data;
                console.log('plugin', 'event', data);
                return;
            }
        }
    };

    /**
     *
     * @param id
     * @param pin
     * @returns {Promise<boolean>}
     */
    watch = async (id, {pin}) => {
        try {
            let additionalConfig = {};

            if (pin) {
                additionalConfig.pin = additionalConfig;
            }

            const watchStreamingResponse = await this.sendAsync({
                'request': 'watch',
                'id': id,
                'offer_audio': true,
                'offer_video': true,
                'offer_data': false,
                ...additionalConfig,
            });


            if (watchStreamingResponse.jsep) {
                await this.pc.setRemoteDescription(new Janus.RTCSessionDescription({
                    sdp: watchStreamingResponse.jsep.sdp,
                    type: watchStreamingResponse.jsep.type,
                }));
                this.isRemoteDescriptionSet = true;

                console.error('watch', 'set remote desc');

                for (const candidate of this.cachedCandidates) {
                    await this.pc.addIceCandidate(candidate);
                }
                this.cachedCandidates = [];

                console.error('watch', 'added candidates');

                let answer = await this.pc.createAnswer({
                    'offerToReceiveAudio': true,
                    'offerToReceiveVideo': true,
                    mandatory: {
                        OfferToReceiveAudio: true,
                        OfferToReceiveVideo: true,
                    },
                });

                await this.pc.setLocalDescription(answer);

                const startResponse = await this.sendAsyncWithJsep({
                    'request': 'start',
                }, {
                    type: answer.type,
                    sdp: answer.sdp,
                });

            }

            // if (watchStreamingResponse && watchStreamingResponse.plugindata && watchStreamingResponse.plugindata.data && watchStreamingResponse.plugindata.data.streaming === 'created') {
            //     return true;
            // }
            return false;
        } catch (e) {
            console.error('createStreamingResponse', e);
        }
    };


    create = async (id, {name, description, pin, secret, audioPort, audioPt, videoPort, videoPt}) => {
        try {
            let additionalConfig = {};

            if (name) {
                additionalConfig.name = name;
            }

            if (description) {
                additionalConfig.description = description;
            }

            if (pin) {
                additionalConfig.pin = description;
            }

            if (secret) {
                additionalConfig.secret = description;
            }

            const createStreamingResponse = await this.sendAsync({
                'request': 'create',
                'type': 'rtp',
                'id': id,
                'metadata': '',
                'is_private': true,
                'audio': true,
                'video': true,
                'data': false,
                'permanent': false,

                audioport: audioPort,
                audiopt: audioPt,
                audiortpmap: 'opus/48000/2',
                audiofmtp: `${audioPt}`,

                videoport: videoPort,
                videopt: videoPt,
                videortpmap: 'VP8/90000',
                videofmtp: `${videoPt}`,
                videobufferkf: true,

                ...additionalConfig,
            });


            if (createStreamingResponse && createStreamingResponse.plugindata && createStreamingResponse.plugindata.data && createStreamingResponse.plugindata.data.streaming === 'created') {
                return true;
            }

            console.error('createStreamingResponse', createStreamingResponse);
            return false;
        } catch (e) {
            console.error('createStreamingResponse', e);
        }
    };

    destroy = async (id) => {
        try {
            const destroyStreamingResponse = await this.sendAsync({
                'request': 'destroy',
                'id': id,
                'secret': '1234',
                'permanent': false,
            });

            if (destroyStreamingResponse && destroyStreamingResponse.plugindata && destroyStreamingResponse.plugindata.data && destroyStreamingResponse.plugindata.data.destroyed === id) {
                return true;
            }

            console.error('destroyStreamingResponse', destroyStreamingResponse);
            return false;
        } catch (e) {
            console.error('createStreamingResponse', e);
        }
    };
}
