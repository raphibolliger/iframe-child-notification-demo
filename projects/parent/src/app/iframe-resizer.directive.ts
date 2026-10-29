import { afterNextRender, DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';
import iframeResize from '@iframe-resizer/parent';

/**
 * The basic setup: iframe-resizer (v5) keeps the iframe as tall as its content,
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
      const [resizedIframe] = iframeResize(
        {
          // Open-source license key, fine for this public demo. Closed-source apps need a commercial key.
          license: 'GPLv3',
          checkOrigin: true,
          onResized: ({ height }) => this.resized.emit(height),
        },
        iframe,
      );
      destroyRef.onDestroy(() => resizedIframe.iFrameResizer.disconnect());
    });
  }
}
