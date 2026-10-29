import { effect, Injectable, signal } from '@angular/core';

export type NotificationMode = 'none' | 'resizer' | 'bridge' | 'parent';

export interface NotificationModeOption {
  value: NotificationMode;
  label: string;
  description: string;
}

export const NOTIFICATION_MODES: NotificationModeOption[] = [
  {
    value: 'none',
    label: 'Ohne Fix (Problem)',
    description:
      'Normale Snackbar oben rechts. Eingebettet heisst «oben» aber Oberkante des iframes, ' +
      'und die ist nach dem Scrollen im Parent nicht mehr sichtbar.',
  },
  {
    value: 'resizer',
    label: 'Fix A1: iframe-resizer getParentProps()',
    description:
      'Das Child holt die Lage des iframes im Parent über iframe-resizer und verschiebt seine ' +
      'Overlays in den sichtbaren Bereich. Keine Änderung im Parent nötig, aber nur Window-Scrolling ' +
      'und die Höhe des fixen Parent-Headers muss das Child selber kennen.',
  },
  {
    value: 'bridge',
    label: 'Fix A2: Viewport-Bridge',
    description:
      'Der Parent meldet per postMessage, welcher Teil des iframes sichtbar ist (inkl. fixem Header ' +
      'und beliebigem Scroll-Container). Das Child verschiebt seine Overlays in diesen Bereich.',
  },
  {
    value: 'parent',
    label: 'Fix B: Parent zeigt die Notification',
    description:
      'Das Child schickt die Notification per postMessage an den Parent, der sie mit seiner eigenen ' +
      'Snackbar anzeigt. Klick auf die Aktion wird zurück ans Child gemeldet.',
  },
];

const STORAGE_KEY = 'notification-mode';

/** Selected mode, preselectable via `?mode=...` and remembered across reloads. */
@Injectable({ providedIn: 'root' })
export class NotificationModeStore {
  readonly mode = signal<NotificationMode>(initialMode());

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, this.mode());
      } catch {
        // Storage can be blocked for third-party iframes; the mode is then just not remembered.
      }
    });
  }
}

function initialMode(): NotificationMode {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    // See above.
  }
  const requested = new URLSearchParams(location.search).get('mode') ?? stored;
  return NOTIFICATION_MODES.find((mode) => mode.value === requested)?.value ?? 'none';
}
