// Memaksa versi Firebase BoM Android agar cocok dengan versi Kotlin bawaan Expo SDK 57.
// Jika build gagal dengan pesan "incompatible version of Kotlin", turunkan `bom` di app.json.
const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withFirebaseBom(config, { bom }) {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents += `
project.ext {
  set('react-native', [versions: [firebase: [bom: '${bom}']]])
}
`;
    return config;
  });
};
