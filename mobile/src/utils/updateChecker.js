/**
 * updateChecker.js — In-App OTA Update Checker for Sideloaded APK
 * 
 * Lightweight, 100% crash-proof version checker:
 * - Checks GitHub Releases API /latest endpoint for the newest release
 * - Compares against the installed version
 * - Uses React Native Linking to trigger direct APK download via Android's Download Manager
 */
import { Linking, Alert } from 'react-native';

export const APP_VERSION = '1.0.8';

const GITHUB_LATEST_RELEASE_API = 'https://api.github.com/repos/dinil2000/ems/releases/latest';
export const DEFAULT_APK_URL = 'https://github.com/dinil2000/ems/releases/latest/download/Keltron-MPP-EMS.apk';

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

let cachedDownloadUrl = DEFAULT_APK_URL;

/**
 * Check GitHub Releases for newer version
 */
export async function checkForUpdate() {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_API, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return null;

    const release = await response.json();
    const body = release.body || '';

    // Extract APP_VERSION:x.y.z from release body or release tag
    let latestVersion = null;
    const versionMatch = body.match(/APP_VERSION[:\s]+(\d+\.\d+\.\d+)/i);
    if (versionMatch) {
      latestVersion = versionMatch[1];
    } else if (release.tag_name) {
      const tagMatch = release.tag_name.match(/(\d+\.\d+\.\d+)/);
      if (tagMatch) latestVersion = tagMatch[1];
    }

    if (!latestVersion) return null;

    const isUpdateAvailable = compareVersions(APP_VERSION, latestVersion) > 0;

    // Find direct APK asset download URL if present
    const apkAsset = release.assets?.find(a => a.name && a.name.endsWith('.apk'));
    if (apkAsset && apkAsset.browser_download_url) {
      cachedDownloadUrl = apkAsset.browser_download_url;
    } else {
      cachedDownloadUrl = DEFAULT_APK_URL;
    }

    return {
      isUpdateAvailable,
      latestVersion,
      installedVersion: APP_VERSION,
      downloadUrl: cachedDownloadUrl,
      releaseName: release.name || `Keltron MPP EMS v${latestVersion}`,
    };
  } catch (error) {
    console.log('[UpdateChecker] Check failed silently:', error.message);
    return null;
  }
}

/**
 * Open direct APK download in device's browser / download manager
 */
export function openUpdateDownload(customUrl = null) {
  const url = customUrl || cachedDownloadUrl || DEFAULT_APK_URL;
  Linking.openURL(url).catch(() => {
    Alert.alert(
      'Download Error',
      `Could not open browser to download the update.\n\nPlease download directly from:\n${url}`
    );
  });
}
