import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

class AgoraManager {
  client: IAgoraRTCClient | null = null;
  localAudioTrack: IMicrophoneAudioTrack | null = null;

  async join(
    appId: string,
    channel: string,
    token: string,
    uid: string,
    onUserJoined: (user: IAgoraRTCRemoteUser) => void,
    onUserLeft: (user: IAgoraRTCRemoteUser) => void,
  ) {
    // Cleanup any previous session
    await this.leave();

    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.client.on("user-published", async (user, mediaType) => {
      await this.client!.subscribe(user, mediaType);
      onUserJoined(user);
    });
    this.client.on("user-unpublished", (user) => {
      onUserLeft(user);
    });

    await this.client.join(appId, channel, token, uid);
  }

  async publishMicrophone() {
    if (!this.client) return;
    if (this.localAudioTrack) return;
    this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await this.client.publish([this.localAudioTrack]);
  }

  async unpublishMicrophone() {
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack.close();
      if (this.client) {
        await this.client.unpublish([this.localAudioTrack]);
      }
      this.localAudioTrack = null;
    }
  }

  muteMicrophone(muted: boolean) {
    if (this.localAudioTrack) {
      this.localAudioTrack.setMuted(muted);
    }
  }

  async leave() {
    await this.unpublishMicrophone();
    if (this.client) {
      await this.client.leave();
      this.client = null;
    }
  }
}

export const agoraManager = new AgoraManager();
