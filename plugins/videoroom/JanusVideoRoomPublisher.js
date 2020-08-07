export default class JanusVideoRoomPublisher {
    constructor({audio_codec, display, id, talking, video_codec}) {
        this.id = id;
        this.displayName = display;
        this.isTalking = talking;
        this.codecs = {
            audio: audio_codec,
            video: video_codec,
        };
    }
}
