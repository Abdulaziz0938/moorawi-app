import { mutation } from "./_generated/server";

const SVGA_DATA: Record<string, string> = {
  // إطارات VIP متحركة (فقط 5/6/7 — لا نلمس 1-4 لأنها JPG من رفعك السابق)
  "vip.frame.5": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678699/unlvauvcepki3rfapcoa.svga",
  "vip.frame.6": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678703/wgrrpzlnaki8ssrjb3er.svga",
  "vip.frame.7": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678591/emjyekg98rjckxuzljju.svga",
  // دخوليات SVGA (مفاتيح جديدة)
  "vip.entry.svga.1": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678580/kjysbv5qxuaeqif1szyv.svga",
  "vip.entry.svga.2": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678585/ujrejwdhas71u6zmpxdc.svga",
  "vip.entry.svga.3": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678587/mj3nys20w7afbqoeh2hf.svga",
  "vip.entry.svga.4": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678588/iercby15tiqbloab1w2w.svga",
  // مركبة SVGA
  "shop.vehicle.svga.posche": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678604/ejvpqzptxdvkzzkkyhwt.svga",
  // بانر SVGA
  "ui.banner.svga.1": "https://res.cloudinary.com/wdicx984/raw/upload/v1792678578/fmifnk3sklgjdp2dgx7s.svga",
};

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("assets").collect();
    const byKey = new Map(all.map((a: any) => [a.key, a]));
    let updated = 0;
    let inserted = 0;

    for (const [key, imageUrl] of Object.entries(SVGA_DATA)) {
      const existing = byKey.get(key);
      if (existing) {
        // تحديث URL فقط — يحافظ على frameScale وغيرها
        await ctx.db.patch("assets", existing._id, { imageUrl });
        updated++;
      } else {
        await ctx.db.insert("assets", { key, imageUrl, updatedAt: Date.now() });
        inserted++;
      }
    }

    return { ok: true, updated, inserted, total: Object.keys(SVGA_DATA).length };
  },
});
