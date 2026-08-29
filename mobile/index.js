// ========================================================================
// CRITICAL: This file MUST be the entry point for the app.
// TaskManager.defineTask() calls MUST execute at the top level of the
// entry file BEFORE registerRootComponent() is called.
// When Android restarts the app headlessly for a geofence/location event,
// it runs ONLY this entry file — if tasks aren't defined here, the
// background service silently fails and auto-punch doesn't work.
// ========================================================================

// 1. Register all background tasks & shift alarm managers FIRST (before React loads)
import './src/utils/shiftAlarmManager';
import './src/utils/geofence';

// 2. Now register the React root component
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
