const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidBootReceivers(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const { manifest } = androidManifest;

    if (!manifest.$) {
      manifest.$ = {};
    }
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.application[0];
    if (!application.receiver) {
      application.receiver = [];
    }

    // 1. TaskBroadcastReceiver with exported=true
    let taskReceiver = application.receiver.find(
      (r) => r.$ && (r.$['android:name'] === 'expo.modules.taskManager.TaskBroadcastReceiver' || r.$['android:name'] === '.TaskBroadcastReceiver')
    );
    if (!taskReceiver) {
      taskReceiver = {
        $: {
          'android:name': 'expo.modules.taskManager.TaskBroadcastReceiver',
          'android:exported': 'true',
          'tools:replace': 'android:exported',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'expo.modules.taskManager.TaskBroadcastReceiver.INTENT_ACTION' } },
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
              { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
              { $: { 'android:name': 'com.htc.intent.action.QUICKBOOT_POWERON' } },
            ],
          },
        ],
      };
      application.receiver.push(taskReceiver);
    } else {
      taskReceiver.$['android:exported'] = 'true';
      taskReceiver.$['tools:replace'] = 'android:exported';
    }

    // 2. NotificationsService with exported=true
    let notifReceiver = application.receiver.find(
      (r) => r.$ && r.$['android:name'] === 'expo.modules.notifications.service.NotificationsService'
    );
    if (!notifReceiver) {
      notifReceiver = {
        $: {
          'android:name': 'expo.modules.notifications.service.NotificationsService',
          'android:exported': 'true',
          'tools:replace': 'android:exported',
        },
        'intent-filter': [
          {
            $: { 'android:priority': '-1' },
            action: [
              { $: { 'android:name': 'expo.modules.notifications.NOTIFICATION_EVENT' } },
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
              { $: { 'android:name': 'android.intent.action.REBOOT' } },
              { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
              { $: { 'android:name': 'com.htc.intent.action.QUICKBOOT_POWERON' } },
              { $: { 'android:name': 'android.intent.action.MY_PACKAGE_REPLACED' } },
            ],
          },
        ],
      };
      application.receiver.push(notifReceiver);
    } else {
      notifReceiver.$['android:exported'] = 'true';
      notifReceiver.$['tools:replace'] = 'android:exported';
    }

    return config;
  });
};
