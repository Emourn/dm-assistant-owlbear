/**
 * State Manager
 * 
 * Persists game state to JSON files on disk, one file per state slice per room.
 * Directory structure: server/data/{roomCode}/{slice}.json
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, renameSync, unlinkSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_ROOT = join(__dirname, 'data');

export type StateSlice = 'characters' | 'combat' | 'campaign' | 'navigator' | 'chat' | 'session';

/**
 * Ensure the data directory for a room exists.
 */
function ensureRoomDir(roomCode: string): string {
    const dir = join(DATA_ROOT, roomCode);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Get the file path for a state slice in a room.
 */
function slicePath(roomCode: string, slice: StateSlice): string {
    return join(DATA_ROOT, roomCode, `${slice}.json`);
}

/**
 * Save state to disk atomically (write to temp, then rename).
 * This prevents data corruption if the process crashes mid-write.
 */
export function saveState(roomCode: string, slice: StateSlice, data: unknown): void {
    ensureRoomDir(roomCode);
    const target = slicePath(roomCode, slice);
    const temp = `${target}.tmp`;

    try {
        const serialized = JSON.stringify(data, null, 2);
        writeFileSync(temp, serialized, 'utf-8');
        
        // Atomic rename
        try {
            renameSync(temp, target);
        } catch {
            // On Windows, rename can fail if target exists; delete and retry
            try { unlinkSync(target); } catch { /* doesn't exist yet, fine */ }
            renameSync(temp, target);
        }
    } catch (err) {
        // Clean up temp file on error
        try { unlinkSync(temp); } catch { /* best effort */ }
        console.error(`[StateManager] Failed to save ${slice} for room ${roomCode}:`, err);
        throw err;
    }
}

/**
 * Load state from disk. Returns null if the file doesn't exist.
 */
export function loadState<T = unknown>(roomCode: string, slice: StateSlice): T | null {
    const target = slicePath(roomCode, slice);

    if (!existsSync(target)) {
        return null;
    }

    try {
        const raw = readFileSync(target, 'utf-8');
        return JSON.parse(raw) as T;
    } catch (err) {
        console.error(`[StateManager] Failed to load ${slice} for room ${roomCode}:`, err);
        return null;
    }
}

/**
 * Check if a room has any persisted data.
 */
export function hasPersistedRoom(roomCode: string): boolean {
    const dir = join(DATA_ROOT, roomCode);
    return existsSync(dir);
}

/**
 * Delete all persisted data for a room.
 */
export function deleteRoomData(roomCode: string): void {
    const dir = join(DATA_ROOT, roomCode);
    if (!existsSync(dir)) return;

    try {
        rmSync(dir, { recursive: true, force: true });
    } catch (err) {
        console.error(`[StateManager] Failed to delete data for room ${roomCode}:`, err);
    }
}

/**
 * Ensure the root data directory exists.
 */
export function initDataDir(): void {
    if (!existsSync(DATA_ROOT)) {
        mkdirSync(DATA_ROOT, { recursive: true });
    }
}
