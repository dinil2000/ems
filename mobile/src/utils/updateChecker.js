/**
 * updateChecker.js — In-App OTA Update Checker for Sideloaded APK
 * 
 * Lightweight, 100% crash-proof version checker:
 * - Checks GitHub Releases API for the latest version tag
 * - Compares against the installed version
 * - Uses React Native Linking to trigger direct APK download via Android's Download Manager
 */
import { Linking, Alert } from 'react-native';

export const APP_VERSION = '1.0.7';

const GITHUB_RELEASE_URL = 'https://api.github.com/repos/dinil2000/ems/releases/tags/v1.0.0-latest';
export const APK_DOWNLOAD_URL = 'https://github.com/dinil2000/ems/releases/download/v1.0.0-latest/Keltron-MPP-EMS.apk';

/**
 * Get currently installed version
 */
export function getInstalledVersion() {
  return APP_VERSION;
}

/**
 * Semantic version comparison
 * Returns: 1 if latest > installed, -1 if installed > latest, 0 if equal
 */
export function compareVersions(installed, latest) {
  try {
    const pA = String(installed).split('.').map(n => parseInt(n, 10) || 0);
    const pB = String(latest).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pA.length, pB.length); i++) {
      const a = pA[i] || 0;
      const b = pB[i] || 0;
      if (b > a) return 1;
      if (a > b) return -1;
    }
  } catch (e) {}
  return 0;
}

/**
 * Check GitHub Releases for newer version
 */
export async function checkForUpdate() {
  try {
    const response = await fetch(GITHUB_RELEASE_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return null;

    const release = await response.json();
    const body = release.body || '';

    // Extract APP_VERSION:x.y.z from release body
    const versionMatch = body.match(/APP_VERSION[:\s]+(\d+\.\d+\.\d+)/i);
    if (!versionMatch) return null;

    const latestVersion = versionMatch[1];
    const isUpdateAvailable = compareVersions(APP_VERSION, latestVersion) > 0;

    return {
      isUpdateAvailable,
      latestVersion,
      installedVersion: APP_VERSION,
      downloadUrl: APK_DOWNLOAD_URL,
      releaseName: release.name || 'Keltron MPP EMS Update',
    };
  } catch (error) {
    console.log('[UpdateChecker] Check failed silently:', error.message);
    return null;
  }
}

/**
 * Open direct APK download in device's browser / download manager
 */
export function openUpdateDownload() {
  Linking.openURL(APK_DOWNLOAD_URL).catch(() => {
    Alert.alert(
      'Download Error',
      `Could not open browser to download the update.\n\nPlease download directly from:\n${APK_DOWNLOAD_URL}`
    );
  });
}
