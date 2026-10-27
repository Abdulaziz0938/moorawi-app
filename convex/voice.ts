"use node";
declare const process: any;
import { ConvexError, v } from "convex/values";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const TOKEN_TTL_SECONDS = 3600;

export const getToken = action({
  args: {
    roomId: v.id("rooms"),
    tokenOverride: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    forceUid: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ appId: string; token: string; account: string }> => {
    const cert = process.env.AGORA_APP_CERTIFICATE;
    const appId = process.env.AGORA_APP_ID;
    if (!appId || !cert) {
      throw new ConvexError({ code: "NOT_IMPLEMENTED", message: "Agora credentials missing" });
    }
    const access = await ctx.runQuery(internal.voiceAccess.check, {
      roomId: args.roomId,
      tokenOverride: args.tokenOverride,
    });
    const canPublish = access.onMic;
    const role = canPublish ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    // [ezo-agora] UID فريد لكل جلسة — يمنع UID_CONFLICT
    // الترتيب: forceUid (retry) > deviceId (ثابت للجهاز) > user._id (fallback)
    const uid = args.forceUid || args.deviceId || String(access.account);
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId, cert, args.roomId, uid, role, TOKEN_TTL_SECONDS, TOKEN_TTL_SECONDS,
    );
    return { appId, token, account: uid };
  },
});

// ═══════════════════════════════════════════════════════════
// [ezo-live] Token للبث المباشر
// - host: publisher
// - viewer: subscriber
// ═══════════════════════════════════════════════════════════
export const getLiveToken = action({
  args: {
    streamId: v.id("liveStreams"),
    asHost: v.boolean(),
    tokenOverride: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    appId: string;
    token: string;
    account: string;
  }> => {
    const cert = process.env.AGORA_APP_CERTIFICATE;
    const appId = process.env.AGORA_APP_ID;
    if (!appId || !cert) {
      throw new ConvexError({
        code: "NOT_IMPLEMENTED",
        message: "Agora credentials missing",
      });
    }

    // احصل على حساب المستخدم + تحقق من صلاحية البث
    const stream = await ctx.runQuery(
      // نستخدم query جديد من live.ts
      (await import("./_generated/api")).api.live.getStream,
      { streamId: args.streamId }
    );
    if (!stream) {
      throw new ConvexError({ code: "NOT_FOUND", message: "البث غير موجود" });
    }

    // حساب Agora
    const account = args.tokenOverride ?? `viewer_${Date.now()}`;
    const role = args.asHost ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      cert,
      stream.channelName,
      account,
      role,
      TOKEN_TTL_SECONDS,
      TOKEN_TTL_SECONDS
    );

    return { appId, token, account };
  },
});
