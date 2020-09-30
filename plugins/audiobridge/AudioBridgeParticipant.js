export default class JanusAudioBridgeParticipant {
  constructor({display, id, talking, muted, setup}) {
    this.id = id;
    this.displayName = display;
    this.isTalking = talking;
    this.isMuted = muted;
    this.didSetup = setup;
  }
}
