import AgoraRTC from "agora-rtc-sdk-ng";
import type {
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
    await this.leave();

    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    this.client.on("user-published", async (user, mediaType) => {
      if (!this.client) return;
      try {
        await this.client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
        onUserJoined(user);
      } catch (err) {
        console.error("Subscribe error:", err);
      }
    });

    this.client.on("user-unpublished", (user) => {
      onUserLeft(user);
    });

    await this.client.join(appId, channel, token, uid);
  }

  async publishMicrophone() {
    if (!this.client) return;
    if (this.localAudioTrack) return;
    try {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await this.client.publish([this.localAudioTrack]);
    } catch (err) {
      console.error("Publish error:", err);
      throw err;
    }
  }

  async unpublishMicrophone() {
    if (this.localAudioTrack) {
      try {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        if (this.client) await this.client.unpublish([this.localAudioTrack]);
      } catch (err) {
        console.error("Unpublish error:", err);
      }
      this.localAudioTrack = null;
    }
  }

  muteMicrophone(muted: boolean) {
    if (this.localAudioTrack) this.localAudioTrack.setMuted(muted);
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
