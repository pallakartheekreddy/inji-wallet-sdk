import { registerRootComponent } from 'expo';
import * as ExpoCrypto from 'expo-crypto';
import { sha1 } from '@noble/hashes/sha1';
import { sha256 } from '@noble/hashes/sha256';
import { sha384, sha512 } from '@noble/hashes/sha512';

// A secure random source for libraries that expect WebCrypto's
// crypto.getRandomValues (the SDK's storage encryption among them). React
// Native has none; expo-crypto's is backed by the platform CSPRNG.
const g: any = globalThis as any;
g.crypto = g.crypto || {};
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = (array: any) => ExpoCrypto.getRandomValues(array);
}

// WebCrypto digest for JSON-LD canonicalisation (rdf-canonize hashes with
// crypto.subtle.digest) when the SDK's native URDNA2015 module is not linked.
// Digest only; nothing else of SubtleCrypto is provided.
if (!g.crypto.subtle) {
  const DIGESTS: Record<string, (b: Uint8Array) => Uint8Array> = {
    'SHA-1': sha1,
    'SHA-256': sha256,
    'SHA-384': sha384,
    'SHA-512': sha512,
  };
  g.crypto.subtle = {
    digest: async (algorithm: any, data: ArrayBuffer | ArrayBufferView) => {
      const name = String(typeof algorithm === 'string' ? algorithm : algorithm?.name).toUpperCase();
      const fn = DIGESTS[name];
      if (!fn) throw new Error(`crypto.subtle.digest: unsupported algorithm ${name}`);
      const bytes = ArrayBuffer.isView(data)
        ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
        : new Uint8Array(data);
      return fn(bytes).slice().buffer;
    },
  };
}

// Diagnostics: surface an exception thrown while App's modules load (before
// React Native's own error reporting exists) instead of a bare
// "no callable modules" crash.
let App: any;
try {
  App = require('./App').default;
} catch (e: any) {
  console.error('[BOOT] module load failed:', e?.message, '\n', e?.stack);
  throw e;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
