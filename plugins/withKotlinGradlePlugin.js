// Menyematkan versi Kotlin Gradle Plugin (kompiler) di android/build.gradle.
// Baris classpath bawaan tidak berversi, jadi kompilernya ikut Gradle plugin React Native
// (Kotlin 2.1.20 di SDK 57) dan gagal membaca pustaka Firebase yang berformat Kotlin 2.3.
const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withKotlinGradlePlugin(config, { version }) {
  return withProjectBuildGradle(config, (config) => {
    const pattern = /classpath\((['"])org\.jetbrains\.kotlin:kotlin-gradle-plugin\1\)/;
    if (!pattern.test(config.modResults.contents)) {
      throw new Error(
        'withKotlinGradlePlugin: baris classpath kotlin-gradle-plugin tidak ditemukan di android/build.gradle',
      );
    }
    config.modResults.contents = config.modResults.contents.replace(
      pattern,
      `classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:${version}')`,
    );
    return config;
  });
};
