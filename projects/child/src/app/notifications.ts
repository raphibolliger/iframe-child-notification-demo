import { DestroyRef, inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  isProtocolMessage,
  NotificationClosedMessage,
  ShowNotificationMessage,
} from '@shared/iframe-protocol';
import { filter, map, Observable, Subject, take } from 'rxjs';
import { isEmbedded, PARENT_ORIGIN } from './embedding';
import { NotificationModeStore } from './notification-mode';

const DURATION = 5000;

/**
 * The one place the child shows notifications. Depending on the mode it uses its own MatSnackBar
 * (Fix A moves it into the visible area, see ParentViewport) or hands it to the parent (Fix B).
 */
@Injectable({ providedIn: 'root' })
export class Notifications {
  private readonly snackBar = inject(MatSnackBar);
  private readonly mode = inject(NotificationModeStore).mode;
  private readonly closedInParent = new Subject<NotificationClosedMessage>();
  private nextId = 0;

  constructor() {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === window.parent &&
        event.origin === PARENT_ORIGIN &&
        isProtocolMessage<NotificationClosedMessage>(event.data, 'notification-closed')
      ) {
        this.closedInParent.next(event.data);
      }
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('message', onMessage));
  }

  /** Shows a notification top right. Emits if the user clicks the action. */
  show(message: string, action?: string): Observable<void> {
    if (isEmbedded && this.mode() === 'parent') {
      return this.showInParent(message, action);
    }
    return this.snackBar
      .open(message, action, {
        duration: DURATION,
        horizontalPosition: 'end',
        verticalPosition: 'top',
      })
      .onAction();
  }

  private showInParent(message: string, action?: string): Observable<void> {
    const id = String(++this.nextId);
    const request: ShowNotificationMessage = {
      type: 'show-notification',
      id,
      message,
      action,
      duration: DURATION,
    };
    window.parent.postMessage(request, PARENT_ORIGIN);

    return this.closedInParent.pipe(
      filter((closed) => closed.id === id),
      take(1),
      filter((closed) => closed.dismissedByAction),
      map(() => undefined),
    );
  }
}
