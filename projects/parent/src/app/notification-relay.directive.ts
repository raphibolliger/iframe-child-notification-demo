import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  isProtocolMessage,
  NotificationClosedMessage,
  ShowNotificationMessage,
} from '@shared/iframe-protocol';

/**
 * Fix B: shows notifications requested by the child with the parent's own MatSnackBar,
 * so they are positioned in the parent viewport like any other parent notification.
 */
@Directive({ selector: 'iframe[hostNotificationRelay]' })
export class NotificationRelayDirective {
  constructor() {
    const iframe = inject<ElementRef<HTMLIFrameElement>>(ElementRef).nativeElement;
    const snackBar = inject(MatSnackBar);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const childOrigin = new URL(iframe.src).origin;

      const onMessage = (event: MessageEvent) => {
        // Any page can post messages to this window, only trust our own iframe.
        if (event.source !== iframe.contentWindow || event.origin !== childOrigin) {
          return;
        }
        if (!isProtocolMessage<ShowNotificationMessage>(event.data, 'show-notification')) {
          return;
        }

        const { id, message, action, duration } = event.data;
        snackBar
          .open(message, action, { duration, horizontalPosition: 'end', verticalPosition: 'top' })
          .afterDismissed()
          .subscribe(({ dismissedByAction }) => {
            const closed: NotificationClosedMessage = {
              type: 'notification-closed',
              id,
              dismissedByAction,
            };
            iframe.contentWindow?.postMessage(closed, childOrigin);
          });
      };

      window.addEventListener('message', onMessage);
      destroyRef.onDestroy(() => window.removeEventListener('message', onMessage));
    });
  }
}
