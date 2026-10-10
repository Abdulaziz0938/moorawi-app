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
import type * as auth from "../auth.js";
import type * as follows from "../follows.js";
import type * as gifts from "../gifts.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_levels from "../lib/levels.js";
import type * as lib_vip from "../lib/vip.js";
import type * as lib_week from "../lib/week.js";
import type * as medals from "../medals.js";
import type * as messages from "../messages.js";
import type * as mics from "../mics.js";
import type * as profileFull from "../profileFull.js";
import type * as profiles from "../profiles.js";
import type * as resetStats from "../resetStats.js";
import type * as rewards from "../rewards.js";
import type * as rooms from "../rooms.js";
import type * as seedMedals from "../seedMedals.js";
import type * as seedShop from "../seedShop.js";
import type * as shop from "../shop.js";
import type * as users from "../users.js";
import type * as vip from "../vip.js";
import type * as visits from "../visits.js";
import type * as voice from "../voice.js";
import type * as voiceAccess from "../voiceAccess.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminPanel: typeof adminPanel;
  auth: typeof auth;
  follows: typeof follows;
  gifts: typeof gifts;
  "lib/auth": typeof lib_auth;
  "lib/levels": typeof lib_levels;
  "lib/vip": typeof lib_vip;
  "lib/week": typeof lib_week;
  medals: typeof medals;
  messages: typeof messages;
  mics: typeof mics;
  profileFull: typeof profileFull;
  profiles: typeof profiles;
  resetStats: typeof resetStats;
  rewards: typeof rewards;
  rooms: typeof rooms;
  seedMedals: typeof seedMedals;
  seedShop: typeof seedShop;
  shop: typeof shop;
  users: typeof users;
  vip: typeof vip;
  visits: typeof visits;
  voice: typeof voice;
  voiceAccess: typeof voiceAccess;
  wallet: typeof wallet;
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
