import { internalMutation } from "./_generated/server";
export const seedExtracted = internalMutation({
  args: {},
  handler: async (ctx) => {
    let count = 0;
    const items: [string, string][] = [
      ["asset.custom.extracted_1", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714689/ekcqv22chlwuu2jflhwk.svga"],
      ["asset.custom.extracted_2", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714691/n8cqy9n0bzjulvwicasr.svga"],
      ["asset.custom.extracted_3", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714694/lckiljost3qp19kjqphc.svga"],
      ["asset.custom.extracted_4", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714701/ym9wviou0fhpjunbwinr.svga"],
      ["asset.custom.extracted_5", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714702/inkgzxlufujf7imn8luf.svga"],
      ["asset.custom.extracted_6", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714705/sxe5gfe94gth9d4or4h2.svga"],
      ["asset.custom.extracted_7", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714707/hlt0qrfkgf0ilnm6jkuu.svga"],
      ["asset.custom.extracted_8", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714710/k8qhxlxhbcnegf3biaic.svga"],
      ["asset.custom.extracted_9", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714713/fwodlkllgyos71qdgg7f.svga"],
      ["asset.custom.extracted_10", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714714/ckzgdbp24a1wktwr3gda.svga"],
      ["asset.custom.extracted_11", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714718/mh731ehokkjbvugk9o2k.svga"],
      ["asset.custom.extracted_12", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714719/bqdiue3scjd1dejoe06j.svga"],
      ["asset.custom.extracted_13", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714723/vm3e0gqmcmpgxfape5oi.svga"],
      ["asset.custom.extracted_14", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714725/dfh68ks6ajnvtk5tswxr.svga"],
      ["asset.custom.extracted_15", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714727/fjmdmqtm728sta0ec7ae.svga"],
      ["asset.custom.extracted_16", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714730/nk3rfuafzuijkiwgzywz.svga"],
      ["asset.custom.extracted_17", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714731/eostrnc9uks5wipdi3yb.svga"],
      ["asset.custom.extracted_18", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714733/svupwq79zuiszgzvvr4f.svga"],
      ["asset.custom.extracted_19", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714735/ircj3kjuuoj9wolx7auo.svga"],
      ["asset.custom.extracted_20", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714735/taxoxcymp7zqynnn4wsm.svga"],
      ["asset.custom.extracted_21", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714737/wlzde780ldv8fwl9mkyo.svga"],
      ["asset.custom.extracted_22", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714739/zbzc7l4k3f20rpdxny3g.svga"],
      ["asset.custom.extracted_23", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714740/jdam4iafpfptgcedhq41.svga"],
      ["asset.custom.extracted_24", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714743/zuqkpypspbfkyb0v7vwd.svga"],
      ["asset.custom.extracted_25", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714745/gsmmavcqmdsixgn19khi.svga"],
      ["asset.custom.extracted_26", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714747/yugbzbfn0bbkkjqjvslw.svga"],
      ["asset.custom.extracted_27", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714748/tdftvdlu4yjeieef19ee.svga"],
      ["asset.custom.extracted_28", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714752/n4hcioplx9diz58x7ob8.svga"],
      ["asset.custom.extracted_29", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714754/l0l3r5uom8fkml069vic.svga"],
      ["asset.custom.extracted_30", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714756/jrhroiywoqmlw679wykx.svga"],
      ["asset.custom.extracted_31", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714757/x26gmkooq0recmkdpmrq.svga"],
      ["asset.custom.extracted_32", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714761/zdfomeegs6gvw2k3g10x.svga"],
      ["asset.custom.extracted_33", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714762/vsnajdsuh7bwhoscvbou.svga"],
      ["asset.custom.extracted_34", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714764/w5weys6ikvjenu0awopy.svga"],
      ["asset.custom.extracted_35", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714765/ak469djvnpcohzxo1t4y.svga"],
      ["asset.custom.extracted_36", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714766/s2x1km7n7fzid6lylom6.svga"],
      ["asset.custom.extracted_37", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714768/x38cebfrqmnlyy2dnguo.svga"],
      ["asset.custom.extracted_38", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714771/au5ohwurs7bqpxftbjzf.svga"],
      ["asset.custom.extracted_39", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714774/vmruwas2fvkqwlbhmeuj.svga"],
      ["asset.custom.extracted_40", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714775/aoja0krynnopmycmo44a.svga"],
      ["asset.custom.extracted_41", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714777/t1bygytgrfaqvdgykrpo.svga"],
      ["asset.custom.extracted_42", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714779/v9lqo4bldomexuplbviv.svga"],
      ["asset.custom.extracted_43", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714781/jy9dnlauaborgyw8cqfj.svga"],
      ["asset.custom.extracted_44", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714783/qprxyydwlgcpbzmisbtk.svga"],
      ["asset.custom.extracted_45", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714785/gvdomqdulqf8bioil4jn.svga"],
      ["asset.custom.extracted_46", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714788/t18dassavvnextafh2jf.svga"],
      ["asset.custom.extracted_47", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714789/cof3xilfqzyj1wfgsbmq.svga"],
      ["asset.custom.extracted_48", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714790/qpisvuwoqqwteyrte6ei.svga"],
      ["asset.custom.extracted_49", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714792/ewxlu0rykrkeyybnxqfg.svga"],
      ["asset.custom.extracted_50", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714795/xfqugsqcd9pif7kjb5dq.svga"],
      ["asset.custom.extracted_51", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714796/bjvudmfc1rkhacxtpkx8.svga"],
      ["asset.custom.extracted_52", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714798/vknf4eytpjlzg91ma2g6.svga"],
      ["asset.custom.extracted_53", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714800/su3oy8fdupubblhdv89w.svga"],
      ["asset.custom.extracted_54", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714802/a9lwudahub7lj4537bxk.svga"],
      ["asset.custom.extracted_55", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714803/qtbz1liakv0atp5xbbt9.svga"],
      ["asset.custom.extracted_56", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714804/ax2dv98t05m6z6i9qhsf.svga"],
      ["asset.custom.extracted_57", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714806/qmgmonjdvxabiw60ztsr.svga"],
      ["asset.custom.extracted_58", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714809/ztvoqlnpvf7vuuwct3xa.svga"],
      ["asset.custom.extracted_59", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714811/vudszvrhrjyjdaexjvrr.svga"],
      ["asset.custom.extracted_60", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714813/v9v0wevpmoohfgn3k71b.svga"],
      ["asset.custom.extracted_61", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714815/h8rr4pisiuykcsncipcc.svga"],
      ["asset.custom.extracted_62", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714816/fjdxikc52prmwbb0euir.svga"],
      ["asset.custom.extracted_63", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714818/jenmov77g5abff2r8gaz.svga"],
      ["asset.custom.extracted_64", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714819/zz0abiv7ifjrfz7gznop.svga"],
      ["asset.custom.extracted_65", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714822/ojv6zr6s9rgu7vmahycu.svga"],
      ["asset.custom.extracted_66", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714826/apjiloszbtyjpqdogdyz.svga"],
      ["asset.custom.extracted_67", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714830/ijr6uap4b73l3lyhzsfy.svga"],
      ["asset.custom.extracted_68", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714832/iuhl8mnllmn6jnzg2nwh.svga"],
      ["asset.custom.extracted_69", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714835/wvuptdpwlsk5txftjyog.svga"],
      ["asset.custom.extracted_70", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714839/dbr0vwdouodcd9amrpzh.svga"],
      ["asset.custom.extracted_71", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714840/mk924rhvfvov5hqcw6hd.svga"],
      ["asset.custom.extracted_72", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714842/txe38csxactflbrmv7c7.svga"],
      ["asset.custom.extracted_73", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714844/j2hpasvtmvvifeksv7cz.svga"],
      ["asset.custom.extracted_74", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714846/hglbzth6gmakhe3stbhp.svga"],
      ["asset.custom.extracted_75", "https://res.cloudinary.com/wdicx984/raw/upload/v1792714848/pn2ekemn3v1itpxlguu7.svga"],
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

