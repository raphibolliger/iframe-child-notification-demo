import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import {
  isProtocolMessage,
  ParentViewportMessage,
  ParentViewportRequest,
} from '@shared/iframe-protocol';

/**
 * Fix A2: tells the child where the iframe currently is in the parent viewport,
 * so the child can move its overlays (snack bars, dialogs) into the visible part of the iframe.
 */
@Directive({ selector: 'iframe[hostViewportBridge]' })
export class ViewportBridgeDirective {
  /** Fixed parent UI at the top (e.g. the app header) that covers the iframe while scrolling. */
  readonly fixedHeader = input<HTMLElement>();

  constructor() {
    const iframe = inject<ElementRef<HTMLIFrameElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const childOrigin = new URL(iframe.src).origin;
      let frame = 0;

      const send = () => {
        frame = 0;
        const message: ParentViewportMessage = {
          type: 'parent-viewport',
          iframeTop: iframe.getBoundingClientRect().top,
          viewportTop: this.fixedHeader()?.getBoundingClientRect().bottom ?? 0,
          viewportBottom: document.documentElement.clientHeight,
        };
        iframe.contentWindow?.postMessage(message, childOrigin);
      };
      // At most one message per frame, however many scroll events fire.
      const schedule = () => (frame ||= requestAnimationFrame(send));

      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          isProtocolMessage<ParentViewportRequest>(event.data, 'parent-viewport-request')
        ) {
          schedule();
        }
      };

      // Capturing on document also catches nested scroll containers (e.g. mat-sidenav-content), not only the window.
      document.addEventListener('scroll', schedule, { capture: true, passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('message', onMessage);
      // Layout changes (e.g. the iframe being resized) move the visible area without any scroll event.
      const resizeObserver = new ResizeObserver(schedule);
      resizeObserver.observe(document.body);

      destroyRef.onDestroy(() => {
        cancelAnimationFrame(frame);
        document.removeEventListener('scroll', schedule, { capture: true });
        window.removeEventListener('resize', schedule);
        window.removeEventListener('message', onMessage);
        resizeObserver.disconnect();
      });
    });
  }
}
