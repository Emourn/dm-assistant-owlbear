/**
 * Map Broadcast — DM control for setting the live map
 *
 * Instead of manually pushing snapshots, the DM sets a specific map as "Live".
 * Once live, the sync middleware automatically broadcasts all changes.
 */

import { socketClient } from './socketClient';
import type { BattleMapState } from '../types/battleMap';

/**
 * Set a specific map as the live map for players.
 * Legacy escape hatch for forcing a specific map live.
 * In normal play, Navigator/Combat state now auto-broadcasts without needing this.
 */
export function setMapLive(mapData: BattleMapState): void {
    if (socketClient.status !== 'connected') {
        console.warn('[MapBroadcast] Cannot set map live — not connected to server.');
        return;
    }
    // We send the initial state to get it on their screen immediately
    socketClient.emit('map:set-live', mapData);
    console.log('[MapBroadcast] Map set as live.');
}

/**
 * Take the map offline (players see empty grid/waiting screen).
 */
export function setMapOffline(): void {
    if (socketClient.status !== 'connected') {
        console.warn('[MapBroadcast] Cannot clear map — not connected to server.');
        return;
    }
    socketClient.emit('map:set-offline');
    console.log('[MapBroadcast] Map taken offline.');
}

export function setBroadcastBlackout(blackout: boolean): void {
    if (socketClient.status !== 'connected') {
        console.warn('[MapBroadcast] Cannot update blackout mode — not connected to server.');
        return;
    }
    socketClient.emit('presentation:set-blackout', { blackout });
}
