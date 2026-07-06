/**
 * Dynamische Expo-Konfiguration: erweitert app.json.
 *
 * EXPO_BASE_URL setzt den Basis-Pfad des Web-Builds, z. B. "/Alien-Perimeter"
 * für GitHub Pages (Project Page). Ohne die Variable wird unter "/" gebaut.
 */
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || undefined,
  },
});
