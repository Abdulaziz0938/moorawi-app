import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// إعدادات الأمان للسماح للعبة بالاتصال
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ============ كود المحفظة الجديد (Wallet API) ============

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
      const body = await request.json();
      const { action, userId, amount } = body;

      if (!userId || amount === undefined) {
        return new Response(JSON.stringify({ success: false, error: "بيانات ناقصة" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // جلب المستخدم (سواء بالـ ID أو برقم الحساب)
      let user = null;
      try {
        user = await ctx.db.get(userId as any);
      } catch (e) {
        const num = parseInt(userId, 10);
        if (!isNaN(num)) {
          user = await ctx.db.query("users").withIndex("by_userNumber", (q) => q.eq("userNumber", num)).first();
        }
      }

      if (!user) {
        return new Response(JSON.stringify({ success: false, error: "المستخدم غير موجود" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const currentCoins = (user as any).coins ?? 0;

      // الخصم أو الإضافة
      if (action === "debit") {
        if (currentCoins < amount) {
          return new Response(JSON.stringify({ success: false, error: "رصيدك غير كافٍ" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        await ctx.db.patch(user._id, { coins: currentCoins - amount });
      } else if (action === "credit") {
        await ctx.db.patch(user._id, { coins: currentCoins + amount });
      } else {
         return new Response(JSON.stringify({ success: false, error: "العملية غير معروفة" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, newBalance: action === "debit" ? currentCoins - amount : currentCoins + amount }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }),
});

// ============ كودك القديم (Leave API) ============
http.route({
  path: "/api/leave",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body: any = await request.json();
      if (body && body.roomId && body.tokenOverride) {
        await ctx.runMutation(api.presence.leave, {
          roomId: body.roomId,
          tokenOverride: body.tokenOverride,
        });
      }
      return new Response("ok", { status: 200 });
    } catch (e) {
      return new Response("bad request", { status: 400 });
    }
  }),
});

export default http;
