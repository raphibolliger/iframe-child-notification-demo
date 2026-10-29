import { environment } from '@shared/environment';

/** True when the app runs inside an iframe (comparing window.top is allowed cross-origin). */
export const isEmbedded = window.self !== window.top;

/** The only parent the child talks to via postMessage. */
export const PARENT_ORIGIN = environment.parentOrigin;
