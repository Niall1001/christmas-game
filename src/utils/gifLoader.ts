import { parseGIF, decompressFrames } from 'gifuct-js';

export interface GifFrame {
  imageData: ImageData;
  delay: number; // Frame delay in ms
}

export interface DecodedGif {
  frames: HTMLCanvasElement[];
  delays: number[];
  width: number;
  height: number;
}

/**
 * Load and decode a GIF file into individual frames
 * Returns canvas elements for each frame that can be drawn with drawImage
 */
export async function loadGif(url: string): Promise<DecodedGif> {
  // Fetch the GIF file
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  // Parse and decompress the GIF
  const gif = parseGIF(arrayBuffer);
  const frames = decompressFrames(gif, true);

  if (frames.length === 0) {
    throw new Error('No frames found in GIF');
  }

  const width = gif.lsd.width;
  const height = gif.lsd.height;

  // Create a canvas for compositing frames (GIFs can have partial frames)
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = width;
  compositeCanvas.height = height;
  const compositeCtx = compositeCanvas.getContext('2d')!;

  const frameCanvases: HTMLCanvasElement[] = [];
  const delays: number[] = [];

  for (const frame of frames) {
    // Handle disposal method from previous frame
    // For simplicity, we'll just draw each frame on top

    // Create ImageData from frame pixels
    const imageData = new ImageData(
      new Uint8ClampedArray(frame.patch),
      frame.dims.width,
      frame.dims.height
    );

    // Create a temporary canvas for this frame's patch
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = frame.dims.width;
    patchCanvas.height = frame.dims.height;
    const patchCtx = patchCanvas.getContext('2d')!;
    patchCtx.putImageData(imageData, 0, 0);

    // Draw the patch onto the composite canvas at the correct position
    compositeCtx.drawImage(
      patchCanvas,
      frame.dims.left,
      frame.dims.top
    );

    // Create a snapshot of the current composite state
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = width;
    frameCanvas.height = height;
    const frameCtx = frameCanvas.getContext('2d')!;
    frameCtx.drawImage(compositeCanvas, 0, 0);

    frameCanvases.push(frameCanvas);
    delays.push(frame.delay || 100); // Default 100ms if no delay specified

    // Handle disposal
    if (frame.disposalType === 2) {
      // Restore to background - clear the frame area
      compositeCtx.clearRect(
        frame.dims.left,
        frame.dims.top,
        frame.dims.width,
        frame.dims.height
      );
    }
    // disposalType 1 = keep, disposalType 3 = restore to previous (not commonly used)
  }

  return {
    frames: frameCanvases,
    delays,
    width,
    height
  };
}

/**
 * Animated GIF controller - manages frame cycling
 */
export class AnimatedGif {
  private frames: HTMLCanvasElement[];
  private delays: number[];
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  public width: number;
  public height: number;
  public complete: boolean = true; // Compatibility with Image interface

  constructor(decodedGif: DecodedGif) {
    this.frames = decodedGif.frames;
    this.delays = decodedGif.delays;
    this.width = decodedGif.width;
    this.height = decodedGif.height;
  }

  /**
   * Get the current frame to draw
   * Call this every render frame - it automatically advances based on time
   */
  getCurrentFrame(): HTMLCanvasElement {
    const now = performance.now();

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
    }

    // Check if it's time to advance to the next frame
    const elapsed = now - this.lastFrameTime;
    if (elapsed >= this.delays[this.currentFrame]) {
      this.lastFrameTime = now;
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }

    return this.frames[this.currentFrame];
  }

  /**
   * Get total frame count
   */
  getFrameCount(): number {
    return this.frames.length;
  }
}
