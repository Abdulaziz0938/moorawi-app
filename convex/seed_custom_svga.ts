import { mutation } from "./_generated/server";
export const seedCustom = mutation({
  args: {},
  handler: async (ctx) => {
    let count = 0;
    const items: [string, string][] = [
      ["asset.custom.icon-dice-ludo", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699710/k2bxwnilvxeyqbhsseuk.svga"],
      ["asset.custom.icon-card-game", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699712/nzz3rgzuovtfc0kwmtw8.svga"],
      ["asset.custom.frame-top1-gold", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699714/uviudpgprfahkpbltxcu.svga"],
      ["asset.custom.frame-top1-car", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699715/v9eurhofnd0tfpotr4jx.svga"],
      ["asset.custom.frame-ksa", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699717/pko0mqrmbcn6spr6xdcw.svga"],
      ["asset.custom.echo", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699718/gt4pxsxvieswhbey9f99.svga"],
      ["asset.custom.dragon-halo", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699721/elosfkjb1atsnrx2axpn.svga"],
      ["asset.custom.car", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699723/ufcwcp5sgrg926bae692.svga"],
      ["asset.custom.banner-wekly-top1-cp", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699725/pnfwnu5yhkxnnppjgxov.svga"],
      ["asset.custom.banner-send-gift-burple-gold", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699739/ppomwbzxjiln0cs3u77v.svga"],
      ["asset.custom.banner-send-gift-burple", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699764/wmiblhkamb6wliasxafr.svga"],
      ["asset.custom.banner-send-gift-blue", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699775/dlgxzeiimtqydteudsno.svga"],
      ["asset.custom.banner-send-gift-bag", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699777/uzadesu1ev5fgxu5pyla.svga"],
      ["asset.custom.banner-lucky-gifts", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699782/nufzmqin9ijkvpvd6wya.svga"],
      ["asset.custom.banner-gift-green-s5", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699786/ht5d9ngqti8zfqgdybwe.svga"],
      ["asset.custom.banner-gift-dark-blue-s20", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699791/yeyuvg5m00nplyhrid36.svga"],
      ["asset.custom.banner-cp-gift", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699795/kpp9ku8x24izfcxfvwwy.svga"],
      ["asset.custom.vip7-enter", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699816/kbdknnha5vxekwlgoz8b.svga"],
      ["asset.custom.top1-bag", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699818/eiquug5uxbwcy5rjp9i9.svga"],
      ["asset.custom.red-halo", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699819/g69udhblarb3fazedzin.svga"],
      ["asset.custom.queen-enter", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699822/ayopvrzl31ax8qh3oamk.svga"],
      ["asset.custom.internet-white", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699823/w2mysgkrhydg5ce6ejh4.svga"],
      ["asset.custom.internet-green", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699825/il5nqfxdukhogehackfe.svga"],
      ["asset.custom.banner-send-gift-gold", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699832/rublwopputnuzqre5r3d.svga"],
      ["asset.custom.banner-become-cp", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699838/ok3hliszvwpxecwjsnfu.svga"],
      ["asset.custom.annpktuhtsr387rdghiq", "https://res.cloudinary.com/wdicx984/raw/upload/v1792699840/rcmuyxzkspl3fzcuonq3.svga"],
    ];
    for (const [key, url] of items) {
      const existing = await ctx.db.query("assets").withIndex("by_key", q => q.eq("key", key)).first();
      if (existing) {
        await ctx.db.patch(existing._id, { imageUrl: url, updatedAt: Date.now() });
      } else {
        await ctx.db.insert("assets", { key, imageUrl: url, updatedAt: Date.now() });
      }
      count++;
    }
    return { ok: true, count };
  }
});
