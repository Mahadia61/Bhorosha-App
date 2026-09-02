const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// NativeWind converts the Tailwind classes used throughout the Expo screens
// into React Native styles for Android, iOS, and the web build.
module.exports = withNativeWind(config, { input: './global.css' })
