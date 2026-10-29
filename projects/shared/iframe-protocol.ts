/**
 * Contract between the parent (host) and the child (iframe) app.
 *
 * In a real setup both apps live in different repositories; a small shared file like this
 * (or an npm package) keeps the postMessage protocol of both sides in sync.
 */

/**
 * Parent -> child (Fix A2): where the iframe currently is in the parent viewport.
 * All values are in parent viewport pixels.
 */
export interface ParentViewportMessage {
  type: 'parent-viewport';
  /** Top edge of the iframe, negative once the parent has scrolled past it. */
  iframeTop: number;
  /** First pixel row not covered by fixed parent UI, e.g. the bottom edge of a fixed header. */
  viewportTop: number;
  /** Bottom edge of the parent viewport. */
  viewportBottom: number;
}

/** Child -> parent (Fix A2): asks for a ParentViewportMessage right away, e.g. once the child has booted. */
export interface ParentViewportRequest {
  type: 'parent-viewport-request';
}

/** Child -> parent (Fix B): show this notification in the parent app. */
export interface ShowNotificationMessage {
  type: 'show-notification';
  id: string;
  message: string;
  action?: string;
  duration: number;
}

/** Parent -> child (Fix B): a notification shown on behalf of the child was closed. */
export interface NotificationClosedMessage {
  type: 'notification-closed';
  id: string;
  dismissedByAction: boolean;
}

export type ChildMessage = ParentViewportRequest | ShowNotificationMessage;
export type ParentMessage = ParentViewportMessage | NotificationClosedMessage;

/** Narrows `MessageEvent.data` to a message of this protocol (iframe-resizer posts plain strings on the same channel). */
export function isProtocolMessage<T extends ChildMessage | ParentMessage>(
  data: unknown,
  type: T['type'],
): data is T {
  return typeof data === 'object' && data !== null && (data as { type?: unknown }).type === type;
}
