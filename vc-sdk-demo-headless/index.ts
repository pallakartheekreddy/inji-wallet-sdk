import { registerRootComponent } from 'expo';

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
