import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

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
