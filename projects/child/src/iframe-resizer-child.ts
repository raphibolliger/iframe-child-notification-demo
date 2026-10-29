// Child part of iframe-resizer v4: reports the content size to the parent.
import 'iframe-resizer/js/iframeResizer.contentWindow';

/** Subset of what iframe-resizer's `getPageInfo()` reports about the parent, in parent pixels. */
export interface ParentPageInfo {
  /** Top of the iframe relative to the parent document. */
  offsetTop: number;
  /** Vertical scroll position of the parent window. */
  scrollTop: number;
  /** Height of the parent viewport. */
  clientHeight: number;
}

export interface ParentIFrame {
  /** Calls `callback` now and on every scroll/resize of the parent window; `false` stops it. */
  getPageInfo(callback: ((info: ParentPageInfo) => void) | false): void;
}

declare global {
  interface Window {
    iFrameResizer?: { onReady?: () => void };
    parentIFrame?: ParentIFrame;
  }
}

/** Resolves once the parent has set up iframe-resizer, i.e. never when the app runs standalone. */
export const parentIFrameReady = new Promise<ParentIFrame>((resolve) => {
  // Read by iframe-resizer when the parent's init message arrives, which is always after this module ran.
  window.iFrameResizer = { onReady: () => resolve(window.parentIFrame!) };
});
