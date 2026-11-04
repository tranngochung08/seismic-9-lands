// config.js — deployment settings. Fill these in before publishing.
export const CONFIG = {
  // Discord OAuth2 application client ID (Developer Portal → Applications → OAuth2). Empty = "Play as yourself" button hidden.
  DISCORD_CLIENT_ID: '',
  // Must match a Redirect URI registered in the Discord application. Defaults to the page's own URL.
  DISCORD_REDIRECT: '',
  // Public URL of the game (used for share links). Empty = current location.
  SITE_URL: ''
};
