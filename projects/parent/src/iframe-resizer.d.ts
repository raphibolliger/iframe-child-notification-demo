// Minimal typings for the parent part of iframe-resizer v4 (the package ships none).
declare module 'iframe-resizer/js/iframeResizer' {
  interface ResizedEvent {
    iframe: HTMLIFrameElement;
    height: number | string;
    width: number | string;
    type: string;
  }

  interface IFrameResizerOptions {
    /** `true` only accepts messages from the origin of the iframe's `src`. */
    checkOrigin?: boolean | string[];
    log?: boolean;
    onResized?: (event: ResizedEvent) => void;
  }

  function iframeResize(
    options: IFrameResizerOptions,
    target: HTMLIFrameElement,
  ): HTMLIFrameElement[];

  export default iframeResize;
}

interface HTMLIFrameElement {
  /** Added by iframe-resizer once the iframe is set up. */
  iFrameResizer?: { removeListeners(): void };
}
