"use node";
declare const process: any;
import { ConvexError, v } from "convex/values";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const TOKEN_TTL_SECONDS = 3600;

export const getToken = action({
  args: { roomId: v.id("rooms") },
  handler: async (
    ctx,
    args,
  ): Promise<{ appId: string; token: string; account: string }> => {
    const cert = process.env.AGORA_APP_CERTIFICATE;
    const appId = process.env.AGORA_APP_ID;
    if (!appId || !cert) {
      throw new ConvexError({ code: "NOT_IMPLEMENTED", message: "Agora credentials missing" });
    }
    
    const access = await ctx.runQuery(internal.voiceAccess.check, { roomId: args.roomId });
    const canPublish = access.onMic;
    const role = canPublish ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    const token = RtcTokenBuilder.buildTokenWithUserAccount(
      appId,
      cert,
      args.roomId,
      access.account,
      role,
      TOKEN_TTL_SECONDS,
      TOKEN_TTL_SECONDS,
    );
    
    return { appId, token, account: access.account };
  },
});
