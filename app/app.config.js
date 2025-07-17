import 'dotenv/config';
import Constants from 'expo-constants';


export default {
    expo: {
        name: "nexo vecinal",
        slug: "nexo-vecinal",
        version: "1.3.0",
        orientation: "portrait",
        icon: "./assets/images/logo-nexovecinal.png",
        scheme: "com.nexovecinal.app",
        userInterfaceStyle: "automatic",
        newArchEnabled: true,
        owner: "brunopereyra",

        // iOS
        ios: {
            supportsTablet: true
        },

        // Notifications (global)
        notification: {
            icon: "./assets/images/logo-nexovecinal-transparente.png",
            color: "#eaf6f5",
            iosDisplayInForeground: true
        },

        // Android
        android: {
            package: "com.nexovecinal.app",
            versionCode: 40,
            googleServicesFile: "./google-services.json",
            permissions: [
                "CAMERA",
                "READ_EXTERNAL_STORAGE",
                "WRITE_EXTERNAL_STORAGE",
                "ACCESS_FINE_LOCATION",
                "RECEIVE_BOOT_COMPLETED",
                "VIBRATE",
                "INTERNET",
                "POST_NOTIFICATIONS",
                "com.google.android.gms.permission.AD_ID",
                "ACCESS_COARSE_LOCATION",
                "com.android.vending.BILLING"
            ],
            adaptiveIcon: {
                foregroundImage: "./assets/images/logo-nexovecinal-transparente.png",
                backgroundColor: "#eaf6f5"
            },
            config: {
                googleMaps: {
                    apiKey: process.env.GOOGLE_MAPS_API_KEY
                }
            }
        },

        web: {
            bundler: "metro",
            output: "static",
            favicon: "./assets/images/logo-nexovecinal-transparente.png"
        },

        plugins: [
            // [
            // "@reactnative-google-signin/google-signin",
            // ],
            "expo-router",
            [
                "expo-splash-screen",
                {
                    image: "./assets/images/logo-nexovecinal-transparente.png",
                    backgroundColor: "#eaf6f5",
                    imageWidth: 200,
                    resizeMode: "cover"
                }
            ],
            [
                "expo-build-properties",
                {
                    android: {
                        permissions: [
                            "android.permission.ACCESS_FINE_LOCATION",
                            "android.permission.POST_NOTIFICATIONS",
                            "android.permission.CAMERA"
                        ]
                    }
                }
            ],
            "expo-font",
            "expo-web-browser"
        ],

        experiments: {
            typedRoutes: true
        },

        extra: {
            eas: {
                projectId: "2e04fce3-d5b1-4292-ade0-021a4e6f8eb6"
            },
            GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
            EXPO_URL_API: process.env.EXPO_URL_API,
            EXPO_URL_APIWS: process.env.EXPO_URL_APIWS,
            router: {
                origin: false
            },
            REVENUECAT_PUBLIC_API_KEY: process.env.REVENUECAT_PUBLIC_API_KEY
        },

        // Campos extendidos que requieren app.config.js
        hooks: {
            postPublish: []
        },

        // Los siguientes campos son válidos solo en app.config.js y serán ignorados en app.json
        androidIntentFilters: [
            {
                action: "VIEW",
                data: [
                    {
                        scheme: "https",
                        host: "*.instagram.com"
                    }
                ],
                category: ["BROWSABLE", "DEFAULT"]
            }
        ],

        androidStatusBar: {
            backgroundColor: "#eaf6f5"
        },

        // No es oficial, pero puedes documentar tu política aquí:
        extraPrivacyPolicy: "https://nexo-vecinal.blogspot.com/2025/03/terminos-y-condiciones-y-politica-de.html",

        androidGoogleSignIn: {
            apiKey: process.env.GOOGLE_SIGNIN_API_KEY
        }
    }
};
