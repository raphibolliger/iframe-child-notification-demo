import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import {
  isProtocolMessage,
  ParentViewportMessage,
  ParentViewportRequest,
} from '@shared/iframe-protocol';
import { parentIFrameReady } from '../iframe-resizer-child';
import { isEmbedded, PARENT_ORIGIN } from './embedding';
import { NotificationModeStore } from './notification-mode';

/** getPageInfo() knows nothing about fixed UI in the parent, so the child has to know the header height itself. */
const PARENT_HEADER_HEIGHT = 64;

/** Part of this document that is visible in the parent viewport, in child pixels. */
export interface VisibleArea {
  top: number;
  height: number;
}

/**
 * Fix A: while embedded, the iframe is as tall as its content. `position: fixed`, which the CDK overlay
 * container relies on, is then relative to the whole iframe instead of to what the user actually sees.
 *
 * This service tracks the visible part of the iframe and moves the CDK's global overlays
 * (snack bar, dialog) into it, see `.cdk-global-overlay-wrapper` in styles.scss.
 */
@Injectable({ providedIn: 'root' })
export class ParentViewport {
  readonly visibleArea = signal<VisibleArea | undefined>(undefined);

  constructor() {
    const mode = inject(NotificationModeStore).mode;

    effect((onCleanup) => {
      if (!isEmbedded) {
        return;
      }
      switch (mode()) {
        case 'resizer':
          onCleanup(this.trackViaIframeResizer());
          break;
        case 'bridge':
          onCleanup(this.trackViaBridge());
          break;
      }
    });
    inject(DestroyRef).onDestroy(() => this.reset());
  }

  /** Fix A1: the parent part of iframe-resizer already reports the parent's scroll position. */
  private trackViaIframeResizer(): () => void {
    let active = true;
    parentIFrameReady.then((parentIFrame) => {
      if (active) {
        parentIFrame.getPageInfo(({ offsetTop, scrollTop, clientHeight }) =>
          this.update({
            iframeTop: offsetTop - scrollTop,
            viewportTop: PARENT_HEADER_HEIGHT,
            viewportBottom: clientHeight,
          }),
        );
      }
    });
    return () => {
      active = false;
      window.parentIFrame?.getPageInfo(false);
      this.reset();
    };
  }

  /** Fix A2: the parent reports the position itself, see ViewportBridgeDirective in the parent app. */
  private trackViaBridge(): () => void {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === window.parent &&
        event.origin === PARENT_ORIGIN &&
        isProtocolMessage<ParentViewportMessage>(event.data, 'parent-viewport')
      ) {
        this.update(event.data);
      }
    };
    window.addEventListener('message', onMessage);
    const request: ParentViewportRequest = { type: 'parent-viewport-request' };
    window.parent.postMessage(request, PARENT_ORIGIN);

    return () => {
      window.removeEventListener('message', onMessage);
      this.reset();
    };
  }

  private update({
    iframeTop,
    viewportTop,
    viewportBottom,
  }: Omit<ParentViewportMessage, 'type'>): void {
    // The iframe is exactly as tall as this document.
    const documentHeight = window.innerHeight;
    const top = Math.round(clamp(viewportTop - iframeTop, 0, documentHeight));
    const bottom = Math.round(clamp(viewportBottom - iframeTop, top, documentHeight));

    // Set directly instead of via change detection to keep the overlay in step with scrolling.
    const root = document.documentElement;
    root.style.setProperty('--parent-viewport-top', `${top}px`);
    root.style.setProperty('--parent-viewport-height', `${bottom - top}px`);
    root.classList.add('parent-viewport-sync');
    this.visibleArea.set({ top, height: bottom - top });
  }

  private reset(): void {
    document.documentElement.classList.remove('parent-viewport-sync');
    this.visibleArea.set(undefined);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
