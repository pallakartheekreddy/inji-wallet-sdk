import { registerRootComponent } from 'expo';
import * as ExpoCrypto from 'expo-crypto';

// A secure random source for libraries that expect WebCrypto's
// crypto.getRandomValues (the SDK's storage encryption among them). React
// Native has none; expo-crypto's is backed by the platform CSPRNG.
const g: any = globalThis as any;
g.crypto = g.crypto || {};
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = (array: any) => ExpoCrypto.getRandomValues(array);
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
