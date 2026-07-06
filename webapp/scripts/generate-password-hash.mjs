#!/usr/bin/env node
// Generates the SHA-256 hex digest to paste into webapp/js/config.js.
// Usage: node webapp/scripts/generate-password-hash.mjs "your new password"

import { createHash } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate-password-hash.mjs "your new password"');
  process.exit(1);
}

const hash = createHash('sha256').update(password, 'utf8').digest('hex');
console.log(hash);
console.log('\nPaste this into webapp/js/config.js as PASSWORD_HASH.');
