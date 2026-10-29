/**
 * Local development: `npm start` serves parent and child on two ports (see angular.json), i.e. on
 * two origins, which is closest to a real setup where the apps live on different hosts.
 */
export const environment = {
  /** Child app the parent embeds. */
  childUrl: `${location.protocol}//${location.hostname}:4300/`,
  /** The only origin the child sends messages to and accepts messages from. */
  parentOrigin: `${location.protocol}//${location.hostname}:4200`,
};
