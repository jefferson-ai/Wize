const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql'); // Required for Drizzle ORM migrations

// Redirect all expo-file-system imports to the legacy path to fix 3rd-party library crashes
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-file-system') {
    return {
      filePath: require.resolve('expo-file-system/legacy'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
