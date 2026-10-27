declare module "svgaplayerweb" {
  export class Parser {
    constructor();
    load(url: string, onComplete: (videoItem: any) => void, onError?: (error: any) => void): void;
  }
  export class Player {
    constructor(canvas: string | HTMLDivElement | HTMLCanvasElement);
    setVideoItem(videoItem: any): void;
    setContentMode(mode: "ScaleToFill" | "AspectFill" | "AspectFit"): void;
    setClipsToBounds(clipsToBounds: boolean): void;
    setLoops(loops: number): void;
    startAnimation(): void;
    pauseAnimation(): void;
    stopAnimation(): void;
    clear(): void;
    onFinished(cb: () => void): void;
    onFrame(cb: (frame: number) => void): void;
    onPercentage(cb: (p: number) => void): void;
  }
  const SVGA: { Parser: typeof Parser; Player: typeof Player };
  export default SVGA;
}
