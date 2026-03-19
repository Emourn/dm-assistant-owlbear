/**
 * Multiplayer module barrel export
 */

export { socketClient } from './socketClient';
export { useSessionStore, setStateSyncCallback } from './sessionStore';
export {
    registerStoresForSync,
    startDMSync,
    startPlayerSync,
    stopSync,
    isSyncActive,
    pushInitialState,
} from './syncMiddleware';
export type {
    SessionRole,
    PlayerInfo,
    RoomInfo,
    FilteredStateBundle,
    ChatMessage,
    ConnectionStatus,
    SessionState,
} from './types';
