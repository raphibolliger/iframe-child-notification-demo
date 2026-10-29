import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';
import iframeResize from 'iframe-resizer/js/iframeResizer';

/**
 * The basic setup: iframe-resizer (v4) keeps the iframe as tall as its content,
 * so the iframe never scrolls itself and only the parent page scrolls.
 */
@Directive({ selector: 'iframe[hostIframeResizer]' })
export class IframeResizerDirective {
  /** New iframe height in px. */
  readonly resized = output<number>();

  constructor() {
    const iframe = inject<ElementRef<HTMLIFrameElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      iframeResize(
        {
          checkOrigin: true,
          onResized: ({ height }) => this.resized.emit(Number(height)),
        },
        iframe,
      );
      destroyRef.onDestroy(() => iframe.iFrameResizer?.removeListeners());
    });
  }
}
