/**
 * Deployed demo (GitHub Pages): the child is published to the child/ subfolder of the parent,
 * i.e. both apps share one origin. Local development uses environment.development.ts instead.
 */
export const environment = {
  /** Child app the parent embeds, relative to the parent's base URL. */
  childUrl: 'child/',
  /** The only origin the child sends messages to and accepts messages from. */
  parentOrigin: location.origin,
};
