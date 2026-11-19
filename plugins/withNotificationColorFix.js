const { withFinalizedMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchManifest(xml) {
  let updated = xml;

  if (!updated.includes('xmlns:tools=')) {
    updated = updated.replace(
      /<manifest\b/,
      '<manifest xmlns:tools="http://schemas.android.com/tools"'
    );
  }

  updated = updated.replace(
    /(<meta-data\b[^>]*com\.google\.firebase\.messaging\.default_notification_color[^>]*?)(\/?>)/g,
    (match, body, closing) => {
      if (body.includes('tools:replace="')) {
        if (body.includes('android:resource')) return match;
        return `${body.replace(/tools:replace="([^"]*)"/, 'tools:replace="$1,android:resource"')}${closing}`;
      }
      return `${body} tools:replace="android:resource"${closing}`;
    }
  );

  return updated;
}

module.exports = function withNotificationColorFix(config) {
  return withFinalizedMod(config, [
    'android',
    async (cfg) => {
      const manifests = [
        path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/AndroidManifest.xml'),
        path.join(cfg.modRequest.platformProjectRoot, 'app/src/debug/AndroidManifest.xml'),
      ];

      for (const filePath of manifests) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('com.google.firebase.messaging.default_notification_color')) {
            fs.writeFileSync(filePath, patchManifest(content), 'utf8');
          }
        }
      }

      return cfg;
    },
  ]);
};