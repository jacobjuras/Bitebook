import type { KeyValueStorageInterface } from 'aws-amplify/utils';
import * as SecureStore from 'expo-secure-store';

const knownKeys = new Set<string>();

function secureKey(key: string) {
  const encoded = Array.from(
    key,
    (character) => character.codePointAt(0)!.toString(16),
  ).join('-');
  return `amplify-${encoded}`;
}

/** Stores Amplify tokens in device-only platform-backed storage. */
export const secureTokenStorage: KeyValueStorageInterface = {
  async clear() {
    await Promise.all(Array.from(knownKeys, (key) => (
      SecureStore.deleteItemAsync(secureKey(key))
    )));
    knownKeys.clear();
  },
  async getItem(key) {
    knownKeys.add(key);
    return SecureStore.getItemAsync(secureKey(key));
  },
  async removeItem(key) {
    knownKeys.delete(key);
    await SecureStore.deleteItemAsync(secureKey(key));
  },
  async setItem(key, value) {
    knownKeys.add(key);
    await SecureStore.setItemAsync(secureKey(key), value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
};
