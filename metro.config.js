const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql'); // Required for Drizzle ORM migrations

module.exports = withNativeWind(config, { input: "./global.css" });
