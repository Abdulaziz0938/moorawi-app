// [ezo-presence] مجدول تنظيف الأعضاء الميتين
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "presence-sweep",
  { seconds: 60 },
  internal.presence.sweepInactive,
  {}
);

export default crons;
