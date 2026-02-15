import { Capacitor } from '@capacitor/core';

/**
 * Platform utilities for conditional features
 */

// Check if running on Android
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

// Check if running on iOS
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

// Check if running on native platform (Android or iOS)
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Check if running on web
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

// Features that should be disabled on mobile
export const MOBILE_DISABLED_FEATURES = {
  adminPanel: true,  // Admin panel only on web
  devTools: true,    // Dev tools only on web
};

// Check if admin features should be available
export const isAdminAvailable = (): boolean => {
  return isWeb(); // Admin only available on web
};
