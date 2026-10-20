// [ezo-bg] AI background removal — runs fully in browser (WASM)
// Model (~40MB) downloaded once on first use, then cached.

export interface RemoveBgProgress {
  stage: "loading" | "fetch" | "compute" | "done";
  progress: number; // 0..1
}

export async function removeImageBackground(
  file: File | Blob,
  onProgress?: (p: RemoveBgProgress) => void
): Promise<File> {
  onProgress?.({ stage: "loading", progress: 0 });

  const mod = await import("@imgly/background-removal");
  const removeBackground = (mod as any).removeBackground ?? (mod as any).default;

  const blob: Blob = await removeBackground(file, {
    progress: (key: string, current: number, total: number) => {
      const p = total > 0 ? current / total : 0;
      const stage: RemoveBgProgress["stage"] =
        key?.includes("fetch") ? "fetch" : "compute";
      onProgress?.({ stage, progress: p });
    },
    output: {
      format: "image/png",
      quality: 1,
    },
  });

  onProgress?.({ stage: "done", progress: 1 });

  const originalName = (file as File).name ?? "image.png";
  const base = originalName.replace(/\.[^.]+$/, "");
  const newName = `${base}-nobg.png`;
  return new File([blob], newName, { type: "image/png" });
}

export function isSvgaUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.toLowerCase().split("?")[0].endsWith(".svga");
}
