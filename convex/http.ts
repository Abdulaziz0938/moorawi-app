import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

http.route({
  path: "/api/wallet",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/api/wallet",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { action, userId, amount } = await request.json();

      if (!userId || amount === undefined) {
        return new Response(JSON.stringify({ success: false, error: "بيانات ناقصة" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const user = await ctx.runQuery(internal.wallet.getUser, { userId });

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "المستخدم غير موجود" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const currentCoins = (user as any).coins ?? 0;
      let newCoins = currentCoins;

      if (action === "debit") {
        if (currentCoins < amount) {
          return new Response(JSON.stringify({ success: false, error: "رصيدك غير كافٍ" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        newCoins = currentCoins - amount;
      } else if (action === "credit") {
        newCoins = currentCoins + amount;
      } else {
        return new Response(JSON.stringify({ success: false, error: "العملية غير معروفة" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await ctx.runMutation(internal.wallet.updateCoins, { userId, newCoins });

      return new Response(JSON.stringify({ success: true, newBalance: newCoins }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/api/leave",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body: any = await request.json();
      if (body && body.roomId && body.tokenOverride) {
        await ctx.runMutation(api.presence.leave, { roomId: body.roomId, tokenOverride: body.tokenOverride });
      }
      return new Response("ok", { status: 200 });
    } catch (e) {
      return new Response("bad request", { status: 400 });
    }
  }),
});

export default http;
