/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminPanel from "../adminPanel.js";
import type * as agencies from "../agencies.js";
import type * as agents from "../agents.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as banners from "../banners.js";
import type * as bind_dragon from "../bind_dragon.js";
import type * as blocks from "../blocks.js";
import type * as bubbles from "../bubbles.js";
import type * as cleanup_junk from "../cleanup_junk.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as dailyLogin from "../dailyLogin.js";
import type * as debug_equip from "../debug_equip.js";
import type * as directMessages from "../directMessages.js";
import type * as discover from "../discover.js";
import type * as fix from "../fix.js";
import type * as fix_social from "../fix_social.js";
import type * as follows from "../follows.js";
import type * as friends from "../friends.js";
import type * as giftHistory from "../giftHistory.js";
import type * as gifts from "../gifts.js";
import type * as http from "../http.js";
import type * as import_web_svga from "../import_web_svga.js";
import type * as lib_agents from "../lib/agents.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_levels from "../lib/levels.js";
import type * as lib_vip from "../lib/vip.js";
import type * as lib_week from "../lib/week.js";
import type * as lifePhotos from "../lifePhotos.js";
import type * as likes from "../likes.js";
import type * as live from "../live.js";
import type * as medals from "../medals.js";
import type * as messages from "../messages.js";
import type * as mics from "../mics.js";
import type * as migrations from "../migrations.js";
import type * as missions from "../missions.js";
import type * as moments from "../moments.js";
import type * as music from "../music.js";
import type * as notifications from "../notifications.js";
import type * as presence from "../presence.js";
import type * as profileFull from "../profileFull.js";
import type * as profiles from "../profiles.js";
import type * as relationships from "../relationships.js";
import type * as reports from "../reports.js";
import type * as resetStats from "../resetStats.js";
import type * as rewards from "../rewards.js";
import type * as rockets from "../rockets.js";
import type * as roomEmojis from "../roomEmojis.js";
import type * as rooms from "../rooms.js";
import type * as seedMedals from "../seedMedals.js";
import type * as seedShop from "../seedShop.js";
import type * as seed_all_animations from "../seed_all_animations.js";
import type * as seed_all_assets from "../seed_all_assets.js";
import type * as seed_apk_svga from "../seed_apk_svga.js";
import type * as seed_cache_webp from "../seed_cache_webp.js";
import type * as seed_custom_svga from "../seed_custom_svga.js";
import type * as seed_extracted_svga from "../seed_extracted_svga.js";
import type * as seed_ezo_bindings from "../seed_ezo_bindings.js";
import type * as seed_pag from "../seed_pag.js";
import type * as seed_rest_webp from "../seed_rest_webp.js";
import type * as seed_svga from "../seed_svga.js";
import type * as seed_vip_animations from "../seed_vip_animations.js";
import type * as seed_webp from "../seed_webp.js";
import type * as shop from "../shop.js";
import type * as splash from "../splash.js";
import type * as users from "../users.js";
import type * as verification from "../verification.js";
import type * as vip from "../vip.js";
import type * as visits from "../visits.js";
import type * as voice from "../voice.js";
import type * as voiceAccess from "../voiceAccess.js";
import type * as wallet from "../wallet.js";
import type * as wheelGame from "../wheelGame.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminPanel: typeof adminPanel;
  agencies: typeof agencies;
  agents: typeof agents;
  assets: typeof assets;
  auth: typeof auth;
  banners: typeof banners;
  bind_dragon: typeof bind_dragon;
  blocks: typeof blocks;
  bubbles: typeof bubbles;
  cleanup_junk: typeof cleanup_junk;
  config: typeof config;
  crons: typeof crons;
  dailyLogin: typeof dailyLogin;
  debug_equip: typeof debug_equip;
  directMessages: typeof directMessages;
  discover: typeof discover;
  fix: typeof fix;
  fix_social: typeof fix_social;
  follows: typeof follows;
  friends: typeof friends;
  giftHistory: typeof giftHistory;
  gifts: typeof gifts;
  http: typeof http;
  import_web_svga: typeof import_web_svga;
  "lib/agents": typeof lib_agents;
  "lib/auth": typeof lib_auth;
  "lib/levels": typeof lib_levels;
  "lib/vip": typeof lib_vip;
  "lib/week": typeof lib_week;
  lifePhotos: typeof lifePhotos;
  likes: typeof likes;
  live: typeof live;
  medals: typeof medals;
  messages: typeof messages;
  mics: typeof mics;
  migrations: typeof migrations;
  missions: typeof missions;
  moments: typeof moments;
  music: typeof music;
  notifications: typeof notifications;
  presence: typeof presence;
  profileFull: typeof profileFull;
  profiles: typeof profiles;
  relationships: typeof relationships;
  reports: typeof reports;
  resetStats: typeof resetStats;
  rewards: typeof rewards;
  rockets: typeof rockets;
  roomEmojis: typeof roomEmojis;
  rooms: typeof rooms;
  seedMedals: typeof seedMedals;
  seedShop: typeof seedShop;
  seed_all_animations: typeof seed_all_animations;
  seed_all_assets: typeof seed_all_assets;
  seed_apk_svga: typeof seed_apk_svga;
  seed_cache_webp: typeof seed_cache_webp;
  seed_custom_svga: typeof seed_custom_svga;
  seed_extracted_svga: typeof seed_extracted_svga;
  seed_ezo_bindings: typeof seed_ezo_bindings;
  seed_pag: typeof seed_pag;
  seed_rest_webp: typeof seed_rest_webp;
  seed_svga: typeof seed_svga;
  seed_vip_animations: typeof seed_vip_animations;
  seed_webp: typeof seed_webp;
  shop: typeof shop;
  splash: typeof splash;
  users: typeof users;
  verification: typeof verification;
  vip: typeof vip;
  visits: typeof visits;
  voice: typeof voice;
  voiceAccess: typeof voiceAccess;
  wallet: typeof wallet;
  wheelGame: typeof wheelGame;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
