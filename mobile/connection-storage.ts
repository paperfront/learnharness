import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import { createConnectionStorage } from '../lib/connection-storage';
const key = 'learngraphharness.server-connection.v1';
// The plugin's web implementation uses localStorage. Never invoke it for credentials.
export const iosConnectionStorage = Capacitor.getPlatform() === 'ios' ? createConnectionStorage({
 get: () => SecureStorage.get(key, false, false),
 set: value => SecureStorage.set(key, value, false, false, KeychainAccess.whenUnlockedThisDeviceOnly),
 remove: async () => { await SecureStorage.remove(key, false); },
}) : undefined;
