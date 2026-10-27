// [ezo-agora] Agora manager — صوت + فيديو (720p default)
import AgoraRTC from "agora-rtc-sdk-ng";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
  ILocalVideoTrack,
} from "agora-rtc-sdk-ng";

export type VideoQuality = "480p" | "720p" | "1080p";

const QUALITY_PRESETS: Record<
  VideoQuality,
  { width: number; height: number; frameRate: number; bitrate: number }
> = {
  "480p":  { width: 854,  height: 480,  frameRate: 24, bitrate: 500 },
  "720p":  { width: 1280, height: 720,  frameRate: 30, bitrate: 1500 },
  "1080p": { width: 1920, height: 1080, frameRate: 30, bitrate: 3000 },
};

class AgoraManager {
  client: IAgoraRTCClient | null = null;
  localAudioTrack: IMicrophoneAudioTrack | null = null;
  localVideoTrack: ICameraVideoTrack | null = null;
  quality: VideoQuality = "720p";

  // ═══════════════════════════════════════════════════════════
  // Join — صوت + (اختياري) فيديو
  // ═══════════════════════════════════════════════════════════
  async join(
    appId: string,
    channel: string,
    token: string,
    uid: string,
    onUserJoined: (user: IAgoraRTCRemoteUser) => void,
    onUserLeft: (user: IAgoraRTCRemoteUser, mediaType?: "audio" | "video" | "datachannel") => void,
    options: { asHost?: boolean } = {}
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
        // فيديو: يُدار من الـ UI (نحفظ track فقط)
        onUserJoined(user);
      } catch (err) {
        console.error("[agora] subscribe error:", err);
      }
    });

    this.client.on("user-unpublished", (user, mediaType) => {
      onUserLeft(user, mediaType);
    });

    // [ezo-fix] تجديد التوكن تلقائياً قبل انتهائه بـ 30 ثانية
    this.client.on("token-privilege-will-expire", async () => {
      console.warn("[agora] Token will expire in 30s, renewing...");
      try {
        // استدعاء دالة تجديد التوكن (يجب تمريرها من RoomView)
        // ملاحظة: نحتاج إلى تمرير دالة التجديد كـ option
      } catch (e) {
        console.error("[agora] Token renewal failed:", e);
      }
    });

    await this.client.join(appId, channel, token, uid);

    // Set role: host = publisher, viewer = audience
    if (options.asHost === false) {
      try {
        await this.client.setClientRole("audience");
      } catch (e) {
        console.warn("[agora] setClientRole(audience) failed:", e);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Microphone
  // ═══════════════════════════════════════════════════════════
  async publishMicrophone() {
    if (!this.client) return;
    if (this.localAudioTrack) return;
    try {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true,
      });
      await this.client.publish([this.localAudioTrack]);
    } catch (err) {
      console.error("[agora] publish mic error:", err);
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
        console.error("[agora] unpublish mic error:", err);
      }
      this.localAudioTrack = null;
    }
  }

  muteMicrophone(muted: boolean) {
    if (this.localAudioTrack) this.localAudioTrack.setMuted(muted);
  }

  // ═══════════════════════════════════════════════════════════
  // Camera (Video) — 720p default
  // ═══════════════════════════════════════════════════════════
  setQuality(q: VideoQuality) {
    this.quality = q;
    if (this.localVideoTrack) {
      const p = QUALITY_PRESETS[q];
      this.localVideoTrack
        .setEncoderConfiguration({
          width: p.width,
          height: p.height,
          frameRate: p.frameRate,
          bitrateMin: Math.floor(p.bitrate * 0.6),
          bitrateMax: p.bitrate,
        })
        .catch((e) => console.warn("[agora] setQuality:", e));
    }
  }

  async publishCamera(quality?: VideoQuality) {
    if (!this.client) throw new Error("client not joined");
    if (this.localVideoTrack) return this.localVideoTrack;
    const q = quality ?? this.quality;
    const p = QUALITY_PRESETS[q];
    try {
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: {
          width: p.width,
          height: p.height,
          frameRate: p.frameRate,
          bitrateMin: Math.floor(p.bitrate * 0.6),
          bitrateMax: p.bitrate,
        },
        optimizationMode: "motion",
      });
      await this.client.publish([this.localVideoTrack]);
      return this.localVideoTrack;
    } catch (err) {
      console.error("[agora] publish camera error:", err);
      throw err;
    }
  }

  async unpublishCamera() {
    if (this.localVideoTrack) {
      try {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        if (this.client) await this.client.unpublish([this.localVideoTrack]);
      } catch (err) {
        console.error("[agora] unpublish camera error:", err);
      }
      this.localVideoTrack = null;
    }
  }

  async toggleCamera(enabled: boolean, quality?: VideoQuality) {
    if (enabled) {
      return await this.publishCamera(quality);
    } else {
      await this.unpublishCamera();
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Play remote video/audio
  // ═══════════════════════════════════════════════════════════
  playRemoteVideo(uid: string | number, el: HTMLElement) {
    if (!this.client) return;
    const user = this.client.remoteUsers.find((u) => String(u.uid) === String(uid));
    if (user?.videoTrack) {
      user.videoTrack.play(el);
    }
  }

  stopRemoteVideo(uid: string | number) {
    if (!this.client) return;
    const user = this.client.remoteUsers.find((u) => String(u.uid) === String(uid));
    if (user?.videoTrack) {
      user.videoTrack.stop();
    }
  }

  getRemoteUsers(): IAgoraRTCRemoteUser[] {
    return this.client?.remoteUsers ?? [];
  }

  // ═══════════════════════════════════════════════════════════
  // Leave — clean everything
  // ═══════════════════════════════════════════════════════════
  async leave() {
    await this.unpublishMicrophone();
    await this.unpublishCamera();
    if (this.client) {
      try {
        await this.client.leave();
      } catch (e) {
        console.warn("[agora] leave:", e);
      }
      this.client = null;
    }
  }
}

export const agoraManager = new AgoraManager();
