export default {
  expo: {
    name: 'Wize',
    slug: 'Wize',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#f0fdf4',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.jefferson.wize',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.googleusercontent.apps.919301720713-9pve3c7n8f88rhg6ne9pa2c9507iac3c',
            ],
          },
        ],
      },
    },
    android: {
      package: 'com.jefferson.wize',
      adaptiveIcon: {
        backgroundColor: '#f0fdf4',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-sharing',
      'expo-font',
      'expo-quick-actions',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#ffffff',
        },
      ],
      '@react-native-community/datetimepicker',
      [
        '@react-native-google-signin/google-signin',
        {
          iosClientId:
            '919301720713-9pve3c7n8f88rhg6ne9pa2c9507iac3c.apps.googleusercontent.com',
          iosUrlScheme:
            'com.googleusercontent.apps.919301720713-9pve3c7n8f88rhg6ne9pa2c9507iac3c',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '3b857e37-ddbc-4dce-87e4-65618ec806c2',
      },
    },
  },
};
