// [moorawi-assets] Frontend: admin-managed asset overrides
//
// Architecture: ONE query at the root, shared via Context.
// Any component calls useAssets() → reads from Context (no extra queries).
//
// - Without Provider: returns {} (safe default)
// - With Provider: returns { key: imageUrl } for all admin overrides
// - resolveAsset(): picks override if present, else bundled fallback

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type AssetsMap = Record<string, string>;

const AssetsContext = createContext<AssetsMap>({});

export type AssetFull = {
  url: string;
  frameScale?: number;
  frameOffsetX?: number;
  frameOffsetY?: number;
};
const AssetsFullContext = createContext<Record<string, AssetFull>>({});

export function AssetsProvider({ children }: { children: ReactNode }) {
  const rows = useQuery(api.assets.list);
  const map: AssetsMap = {};
  const fullMap: Record<string, AssetFull> = {};
  for (const r of rows ?? []) {
    if (r.imageUrl) {
      map[r.key] = r.imageUrl;
      fullMap[r.key] = {
        url: r.imageUrl,
        frameScale: (r as any).frameScale,
        frameOffsetX: (r as any).frameOffsetX,
        frameOffsetY: (r as any).frameOffsetY,
      };
    }
  }
  return (
    <AssetsContext.Provider value={map}>
      <AssetsFullContext.Provider value={fullMap}>
        {children}
      </AssetsFullContext.Provider>
    </AssetsContext.Provider>
  );
}

/** Read full asset data (URL + placement). Safe anywhere (defaults to {}). */
export function useAssetsFull(): Record<string, AssetFull> {
  return useContext(AssetsFullContext);
}

/** Read all overrides. Safe anywhere (defaults to {}). */
export function useAssets(): AssetsMap {
  return useContext(AssetsContext);
}

/** Pick override if present, else fallback path. */
export function resolveAsset(
  assets: AssetsMap,
  key: string,
  fallback: string
): string {
  return assets[key] ?? fallback;
}
