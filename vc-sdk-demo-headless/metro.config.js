const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the vc-sdk-headless folder
const vcSdkPath = path.resolve(__dirname, '../vc-sdk-headless');

config.watchFolders = [vcSdkPath];

// Add node_modules from vc-sdk-headless
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(vcSdkPath, 'node_modules'),
];

// One copy of React Native and of every native-module package. The SDK has its
// own node_modules (its dev install, e.g. react-native 0.82 against the app's
// 0.81); bundling both gives two module registries, and the app crashes at
// start with "Module has not been registered as callable (n = 0)". Block the
// SDK's copies of the runtime singletons (and of the native modules the app
// itself links) so these resolve to the app's.
const escape = (p) => p.replace(/[\\^$.*+?()[\]{}|/-]/g, '\\$&');
const sdkModules = escape(path.join(vcSdkPath, 'node_modules') + path.sep);
config.resolver.blockList = [
  new RegExp(
    `^${sdkModules}(react|react-native|@react-native/[^/]+|expo|expo-modules-core|expo-crypto|expo-secure-store|@react-native-async-storage/async-storage)/.*$`,
  ),
];

module.exports = config;
