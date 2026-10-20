/**
 * Browser glue for the save on this device (ADR 0012). Reads and writes only the
 * `SAVE_STORAGE_KEYS` in `localStorage`, and never clears storage. Every storage access, reading
 * `window.localStorage` itself included, can throw (storage turned off, blocked or full); each is
 * caught and reported as unavailable or false, so play goes on in memory.
 */
import { SAVE_BACKUP_STORAGE_KEY, SAVE_STORAGE_KEY, SAVE_STORAGE_KEYS, type StoredSave } from '../logic/save';

/** The save text in storage (null when there is none), or unavailable when storage cannot be read. */
export function readStoredSave(): StoredSave {
  try {
    return { available: true, raw: window.localStorage.getItem(SAVE_STORAGE_KEY) };
  } catch {
    return { available: false };
  }
}

/** Writes `text` as the save. False when storage cannot be written. */
export function writeStoredSave(text: string): boolean {
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Keeps the text of an unreadable save under the backup key. The first backup is kept: when the
 * backup key already holds text it is left as it is. False when storage cannot be read or written.
 */
export function backupUnreadableSave(raw: string): boolean {
  try {
    const storage = window.localStorage;
    if (storage.getItem(SAVE_BACKUP_STORAGE_KEY) !== null) return true;
    storage.setItem(SAVE_BACKUP_STORAGE_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/** Removes the save and its backup. True only when every save key was removed. */
export function eraseStoredSave(): boolean {
  return SAVE_STORAGE_KEYS.map(removeStoredKey).every((removed) => removed);
}

function removeStoredKey(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
