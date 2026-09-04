/**
 * updateChecker.js — In-App OTA Update Checker for Sideloaded APK
 * 
 * Checks GitHub Releases API for the latest version, compares against
 * the installed app version, and provides download + install functionality.
 */
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert } from 'react-native';

const GITHUB_RELEASE_URL = 'https://api.github.com/repos/dinil2000/ems/releases/tags/v1.0.0-latest';
const APK_DOWNLOAD_URL = 'https://github.com/dinil2000/ems/releases/download/v1.0.0-latest/Keltron-MPP-EMS.apk';
const APK_FILENAME = 'Keltron-MPP-EMS-update.apk';

/**
 * Get the currently installed app version from app.json via expo-constants
 */
export function getInstalledVersion() {
  try {
    return Constants.expoConfig?.version || Constants.manifest?.version || '0.0.0';
  } catch (e) {
    console.warn('Could not read installed version:', e);
    return '0.0.0';
  }
}

/**
 * Compare two semver version strings (e.g., "1.0.4" vs "1.0.5")
 * Returns: positive if b > a, negative if a > b, 0 if equal
 */
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numB > numA) return 1;
    if (numA > numB) return -1;
  }
  return 0;
}

/**
 * Check GitHub Releases for a newer version
 * Returns: { isUpdateAvailable, latestVersion, downloadUrl, releaseNotes } or null on error
 */
export async function checkForUpdate() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(GITHUB_RELEASE_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Keltron-MPP-EMS-App',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('Update check: GitHub API returned', response.status);
      return null;
    }

    const release = await response.json();
    const body = release.body || '';

    // Extract APP_VERSION:x.y.z from release body
    const versionMatch = body.match(/APP_VERSION[:\s]+(\d+\.\d+\.\d+)/i);
    if (!versionMatch) {
      console.log('Update check: No APP_VERSION marker found in release body');
      return null;
    }

    const latestVersion = versionMatch[1];
    const installedVersion = getInstalledVersion();
    const isUpdateAvailable = compareVersions(installedVersion, latestVersion) > 0;

    console.log(`Update check: installed=${installedVersion} latest=${latestVersion} updateAvailable=${isUpdateAvailable}`);

    return {
      isUpdateAvailable,
      latestVersion,
      installedVersion,
      downloadUrl: APK_DOWNLOAD_URL,
      releaseName: release.name || 'Keltron MPP EMS Update',
      releaseNotes: body,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Update check: Request timed out');
    } else {
      console.log('Update check: Error -', error.message);
    }
    return null;
  }
}

/**
 * Download the latest APK and open Android's package installer
 * @param {Function} onProgress - Callback with { totalBytesWritten, totalBytesExpectedToWrite } 
 * @returns {Promise<boolean>} true if install was triggered
 */
export async function downloadAndInstallUpdate(onProgress) {
  if (Platform.OS !== 'android') {
    Alert.alert('Update Error', 'Auto-update is only supported on Android devices.');
    return false;
  }

  try {
    const localUri = FileSystem.cacheDirectory + APK_FILENAME;

    // Delete any previously downloaded APK
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }

    console.log('Update: Starting APK download to', localUri);

    // Download with progress tracking
    const downloadResumable = FileSystem.createDownloadResumable(
      APK_DOWNLOAD_URL,
      localUri,
      {
        headers: {
          'User-Agent': 'Keltron-MPP-EMS-App',
        },
      },
      (downloadProgress) => {
        if (onProgress) {
          onProgress(downloadProgress);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || !result.uri) {
      throw new Error('Download failed - no result URI');
    }

    console.log('Update: APK downloaded successfully to', result.uri);

    // Get the content URI for the downloaded file
    const contentUri = await FileSystem.getContentUriAsync(result.uri);

    // Open Android's package installer using Intent
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: 'application/vnd.android.package-archive',
    });

    return true;
  } catch (error) {
    console.error('Update: Download/install error:', error);
    Alert.alert(
      'Update Failed',
      `Could not download or install the update.\n\nError: ${error.message}\n\nYou can manually download from:\nhttps://github.com/dinil2000/ems/releases`,
      [{ text: 'OK' }]
    );
    return false;
  }
}
