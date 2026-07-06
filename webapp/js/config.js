// Default password is "recipes" — CHANGE THIS before publishing.
//
// This is a deterrent, not real security: the app and its data are static
// files served publicly by GitHub Pages, so anyone who inspects the page
// source (or the network tab) can see the recipe content regardless of the
// lock screen. It just keeps the URL from being casually browsable.
//
// To set your own password:
//   node webapp/scripts/generate-password-hash.mjs "your new password"
// then paste the printed hash below.
export const PASSWORD_HASH =
  '63b8bd59a482879ad0634d60f0a6e4998c84523f0a3b8927d7786f23cafa4cec';
