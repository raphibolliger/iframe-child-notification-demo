// Child part of iframe-resizer v5: reports the content size to the parent.
import '@iframe-resizer/child';
import type { iframeResizer } from '@iframe-resizer/child';

export type ParentIFrame = iframeResizer.IFramePage;

/** Resolves once the parent has set up iframe-resizer, i.e. never when the app runs standalone. */
export const parentIFrameReady = new Promise<ParentIFrame>((resolve) => {
  // Read by iframe-resizer when the parent's init message arrives, which is always after this module ran.
  // The shipped typings use this spelling; v5 also accepts window.iframeResizer / window.parentIframe.
  window.iFrameResizer = { onReady: () => resolve(window.parentIFrame) };
});
