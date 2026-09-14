import os
import sys

def configure_android():
    print("==========================================================")
    print("⚙️ CONFIGURING PRODUCTION ANDROID GRADLE & MANIFEST")
    print("==========================================================")
    
    # 1. Patch app/build.gradle
    gradle_path = 'app/build.gradle'
    if os.path.exists(gradle_path):
        with open(gradle_path, 'r', encoding='utf-8') as f:
            content = f.read()

        signing_block = """
        release {
            storeFile file('keltron-release.keystore')
            storePassword 'keltron2026'
            keyAlias 'keltron'
            keyPassword 'keltron2026'
            v1SigningEnabled true
            v2SigningEnabled true
        }
        """
        if 'signingConfig signingConfigs.release' not in content:
            content = content.replace('signingConfigs {', 'signingConfigs {' + signing_block)
            content = content.replace('signingConfig signingConfigs.debug', 'signingConfig signingConfigs.release')
            if 'signingConfig signingConfigs.release' not in content:
                content = content.replace('buildTypes {', 'buildTypes {\n        release {\n            signingConfig signingConfigs.release\n        }')
            with open(gradle_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print("✅ Production signing injected into app/build.gradle")
        else:
            print("ℹ️ Production signing already configured in app/build.gradle")

    # 2. Patch app/src/main/AndroidManifest.xml for Boot & Restart Persistence
    manifest_path = 'app/src/main/AndroidManifest.xml'
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = f.read()

        # Add tools namespace
        if 'xmlns:tools="http://schemas.android.com/tools"' not in manifest:
            manifest = manifest.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ')

        # Ensure TaskBroadcastReceiver has android:exported="true"
        if 'expo.modules.taskManager.TaskBroadcastReceiver' not in manifest:
            receiver_task = """
        <receiver
            android:name="expo.modules.taskManager.TaskBroadcastReceiver"
            android:exported="true"
            tools:replace="android:exported">
            <intent-filter>
                <action android:name="expo.modules.taskManager.TaskBroadcastReceiver.INTENT_ACTION" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>
            """
            manifest = manifest.replace('</application>', receiver_task + '\n    </application>')
            print("✅ TaskBroadcastReceiver (exported=true) added to AndroidManifest.xml")

        # Ensure NotificationsService has android:exported="true"
        if 'expo.modules.notifications.service.NotificationsService' not in manifest:
            receiver_notif = """
        <receiver
            android:name="expo.modules.notifications.service.NotificationsService"
            android:exported="true"
            tools:replace="android:exported">
            <intent-filter android:priority="-1">
                <action android:name="expo.modules.notifications.NOTIFICATION_EVENT" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.REBOOT" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
            """
            manifest = manifest.replace('</application>', receiver_notif + '\n    </application>')
            print("✅ NotificationsService (exported=true) added to AndroidManifest.xml")

        with open(manifest_path, 'w', encoding='utf-8') as f:
            f.write(manifest)
        print("✅ AndroidManifest.xml successfully patched and saved.")

if __name__ == '__main__':
    configure_android()
