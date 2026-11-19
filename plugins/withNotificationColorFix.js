const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNotificationColorFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.application?.[0];
    if (!application) return config;

    const metaDataList = application['meta-data'] ?? [];
    const targetName = 'com.google.firebase.messaging.default_notification_color';

    const existing = metaDataList.find(
      (item) => item.$?.['android:name'] === targetName
    );

    if (existing) {
      const currentReplace = existing.$['tools:replace'];
      if (!currentReplace) {
        existing.$['tools:replace'] = 'android:resource';
      } else if (!currentReplace.split(',').includes('android:resource')) {
        existing.$['tools:replace'] = `${currentReplace},android:resource`;
      }
    } else {
      metaDataList.push({
        $: {
          'android:name': targetName,
          'android:resource': '@color/notification_icon_color',
          'tools:replace': 'android:resource',
        },
      });
      application['meta-data'] = metaDataList;
    }

    return config;
  });
};