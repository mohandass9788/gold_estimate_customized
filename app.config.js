export default {
  expo: {
    name: "Gold Estimation",
    slug: "gold-estimation",
    version: "1.0.0",
    scheme: "goldestimation",
    orientation: "portrait",
    icon: "./assets/logo.png",
    userInterfaceStyle: "light",

    splash: {
      image: "./assets/logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nexooai.goldestimate",
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        },
        NSBluetoothAlwaysUsageDescription:
          "This app needs Bluetooth access to connect to thermal printers for receipt printing."
      }
    },

    android: {
      package: "com.nexooai.goldestimate",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "BLUETOOTH",
        "BLUETOOTH_ADMIN",
        "BLUETOOTH_CONNECT",
        "BLUETOOTH_SCAN",
        "ACCESS_FINE_LOCATION",
        "WAKE_LOCK"
      ]
    },

    plugins: [
      "expo-secure-store",
      "expo-router",
      "expo-web-browser",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            newArchEnabled: true
          }
        }
      ]
    ],

    updates: {
      url: "https://u.expo.dev/9271dd18-5040-470b-b0da-4df9705bbc78"
    },

    runtimeVersion: {
      policy: "appVersion"
    },

    extra: {
      eas: {
        projectId: "9271dd18-5040-470b-b0da-4df9705bbc78"
      }
    }
  }
};