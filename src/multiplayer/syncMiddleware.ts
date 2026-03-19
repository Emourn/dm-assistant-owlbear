/**
 * Sync Middleware — Bridges Zustand stores with the multiplayer server
 * 
 * For the DM:
 *   - After each Zustand state mutation, pushes the updated state to the server
 *   - The server then filters and broadcasts to connected players
 * 
 * For Players:
 *   - Receives filtered state from the server and applies it to local Zustand stores
 *   - The existing store actions still work locally, but server state takes priority
 * 
 * The key insight: we don't modify the existing stores. Instead, we set up
 * listeners that sync state AFTER the stores update.
 */

import { useSessionStore, setStateSyncCallback, setDMStoreSetters } from './sessionStore';
import { socketClient } from './socketClient';
import type { FilteredStateBundle } from './types';

/** Debounce timer for DM state pushes */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
const PUSH_DEBOUNCE_MS = 50; // Batch rapid changes into one push, quick enough for live sync

/** Whether sync is currently active */
let syncActive = false;

/** Flag to prevent feedback loops when applying server state */
let isApplyingServerState = false;

/**
 * Store references — set these to enable sync.
 * These are the actual Zustand store set/get functions.
 */
interface StoreRefs {
    getCharacters: () => any[];
    getCombat: () => any;
    getNavigator: () => any;
    setCharacters: (chars: any[]) => void;
    setCombat: (combat: any) => void;
    setNavigator: (navigator: any) => void;
}

let storeRefs: StoreRefs | null = null;

/**
 * Register the Zustand stores so the sync layer can read from and write to them.
 * Call this once during app initialization.
 */
export function registerStoresForSync(refs: StoreRefs): void {
    storeRefs = refs;
    // Also wire the setters into the session store so the DM's _onStateSync
    // can apply server-pushed state changes (e.g., player token moves) back
    // into the DM's local Zustand stores.
    setDMStoreSetters({
        setCharacters: refs.setCharacters,
        setCombat: refs.setCombat,
        setNavigator: refs.setNavigator,
    });
}

/**
 * Start the DM sync loop.
 * 
 * Subscribes to Zustand store changes and pushes them to the server.
 * This should only be called when the DM creates/joins a multiplayer session.
 */
export function startDMSync(
    characterStore: { subscribe: (listener: (state: any) => void) => () => void },
    combatStore: { subscribe: (listener: (state: any) => void) => () => void },
    navigatorStore: { subscribe: (listener: (state: any) => void) => () => void },
): () => void {
    if (syncActive) {
        console.warn('[SyncMiddleware] DM sync already active. Stopping previous sync.');
        stopSync();
    }

    syncActive = true;

    const debouncedPush = () => {
        if (pushTimer) clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
            if (!syncActive || isApplyingServerState || !storeRefs) return;

            const session = useSessionStore.getState();
            if (session.role !== 'dm' || !session.isMultiplayer) return;

            const characters = storeRefs.getCharacters();
            const combat = storeRefs.getCombat();
            const navigator = storeRefs.getNavigator();

            socketClient.emit('state:push', { characters, combat, navigator });
        }, PUSH_DEBOUNCE_MS);
    };

    // Subscribe to character store changes
    const unsubCharacters = characterStore.subscribe(() => {
        if (!isApplyingServerState) debouncedPush();
    });

    // Subscribe to combat store changes
    const unsubCombat = combatStore.subscribe(() => {
        if (!isApplyingServerState) debouncedPush();
    });

    const unsubNavigator = navigatorStore.subscribe(() => {
        if (!isApplyingServerState) debouncedPush();
    });

    // Do an initial push of current state
    debouncedPush();

    console.log('[SyncMiddleware] DM sync started.');

    // Return cleanup function
    return () => {
        unsubCharacters();
        unsubCombat();
        unsubNavigator();
        if (pushTimer) clearTimeout(pushTimer);
        syncActive = false;
        console.log('[SyncMiddleware] DM sync stopped.');
    };
}

/**
 * Start the Player sync loop.
 * 
 * Listens for state pushes from the server and applies them to local Zustand stores.
 * This should only be called when a player joins a multiplayer session.
 */
export function startPlayerSync(): () => void {
    if (syncActive) {
        console.warn('[SyncMiddleware] Player sync already active. Stopping previous sync.');
        stopSync();
    }

    syncActive = true;

    // Set the callback that the session store uses when it receives state
    setStateSyncCallback((filteredState: FilteredStateBundle) => {
        if (!syncActive || !storeRefs) return;

        isApplyingServerState = true;
        try {
            if (filteredState.characters) {
                storeRefs.setCharacters(filteredState.characters);
            }
            if (filteredState.combat !== undefined) {
                storeRefs.setCombat(filteredState.combat);
            }
            if (filteredState.navigator !== undefined) {
                storeRefs.setNavigator(filteredState.navigator);
            }
        } finally {
            isApplyingServerState = false;
        }
    });

    console.log('[SyncMiddleware] Player sync started.');

    return () => {
        setStateSyncCallback(null);
        syncActive = false;
        console.log('[SyncMiddleware] Player sync stopped.');
    };
}

/**
 * Stop all sync activity.
 */
export function stopSync(): void {
    if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
    }
    setStateSyncCallback(null);
    setDMStoreSetters(null);
    syncActive = false;
}

/**
 * Check if sync is currently active.
 */
export function isSyncActive(): boolean {
    return syncActive;
}

/**
 * Temporarily suppress DM state pushes.
 * Call setApplyingServerState(true) before applying server-origin state to
 * the DM's Zustand stores, then setApplyingServerState(false) afterward.
 * This prevents the DM sync subscription from pushing those changes back
 * to the server as if they originated locally.
 */
export function setApplyingServerState(value: boolean): void {
    isApplyingServerState = value;
}

/**
 * Perform a one-time initial state push from the DM.
 * Use this when the DM first creates a session to push existing localStorage data.
 */
export function pushInitialState(): void {
    if (!storeRefs) {
        console.warn('[SyncMiddleware] Cannot push initial state — stores not registered.');
        return;
    }

    const session = useSessionStore.getState();
    if (session.role !== 'dm' || !session.isMultiplayer) return;

    const characters = storeRefs.getCharacters();
    const combat = storeRefs.getCombat();
    const navigator = storeRefs.getNavigator();

    socketClient.emit('state:push', { characters, combat, navigator });
    console.log('[SyncMiddleware] Initial state pushed to server.');
}
