// This is a deterrent, not real security: the app and its data are static
// files served publicly by GitHub Pages, so anyone who inspects the page
// source (or the network tab) can see the recipe content regardless of the
// lock screen. It just keeps the URL from being casually browsable.
//
// To set a new password:
//   node webapp/scripts/generate-password-hash.mjs "your new password"
// then paste the printed hash below.
export const PASSWORD_HASH =
  'c3f76378da0e118d72a8b0b0075347bc0b31186c3460bc0b8aed26440debad74';
