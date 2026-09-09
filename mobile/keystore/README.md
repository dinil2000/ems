# Android Production Release Keystore

This directory holds the official signing credentials for the **Keltron MPP EMS** Android application.

## Keystore Details
- **Keystore File**: `keltron-release.keystore`
- **Key Alias**: `keltron`
- **Store Password**: `keltron2026`
- **Key Password**: `keltron2026`
- **Key Algorithm**: RSA 2048-bit
- **Validity**: 10000 days
- **Certificate Subject**: `CN=Keltron MPP EMS, OU=EMS Enterprise, O=Keltron Component Complex Ltd, L=Kannur, ST=Kerala, C=IN`

## Purpose
- Ensures all releases share the exact same cryptographic developer signature.
- Allows Android devices to install app updates smoothly without signature mismatch errors.
- Builds Google Play Protect developer reputation across versions.
