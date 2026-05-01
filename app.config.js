export default {
  expo: {
    name: 'SpendWise',
    slug: 'SpendWise',
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
      bundleIdentifier: 'com.anonymous.SpendWise',
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              'com.googleusercontent.apps.919301720713-jf1vlmhqj9oq3ngct1rmd8sbs6lk457d',
            ],
          },
        ],
      },
    },
    android: {
      package: 'com.anonymous.SpendWise',
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
            '919301720713-jf1vlmhqj9oq3ngct1rmd8sbs6lk457d.apps.googleusercontent.com',
          iosUrlScheme:
            'com.googleusercontent.apps.919301720713-jf1vlmhqj9oq3ngct1rmd8sbs6lk457d',
        },
      ],
    ],
  },
};
