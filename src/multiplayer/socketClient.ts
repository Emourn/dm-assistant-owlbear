/**
 * Socket Client — Singleton wrapper around Socket.io client
 * 
 * Provides a single, reusable connection to the multiplayer server.
 * Handles auto-reconnection with exponential backoff.
 */

import { io, Socket } from 'socket.io-client';
import type { ConnectionStatus } from './types';
import { getMultiplayerServerBaseUrl } from './serverConfig';

type StatusListener = (status: ConnectionStatus) => void;

class SocketClient {
    private socket: Socket | null = null;
    private statusListeners: Set<StatusListener> = new Set();
    private _status: ConnectionStatus = 'disconnected';

    /** Current connection status */
    get status(): ConnectionStatus {
        return this._status;
    }

    /** The underlying socket instance (null if not connected) */
    get instance(): Socket | null {
        return this.socket;
    }

    /** The socket ID (null if not connected) */
    get socketId(): string | null {
        return this.socket?.id ?? null;
    }

    /**
     * Connect to the multiplayer server.
     * In dev mode, this proxies through Vite (/socket.io → localhost:3001).
     * In production, the Express server serves both the app and WebSocket.
     */
    connect(url?: string): Socket {
        if (this.socket?.connected) {
            return this.socket;
        }

        // If there's an old disconnected socket, clean it up
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
        }

        this.setStatus('connecting');

        // In development, connect directly to the multiplayer relay on port 3001.
        // In production, the Express server serves both the app and WebSocket.
        const serverUrl = url || getMultiplayerServerBaseUrl();

        this.socket = io(serverUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
        });

        this.socket.on('connect', () => {
            console.log('[SocketClient] Connected:', this.socket?.id);
            this.setStatus('connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[SocketClient] Disconnected:', reason);
            this.setStatus('disconnected');
        });

        this.socket.on('connect_error', (err) => {
            console.error('[SocketClient] Connection error:', err.message);
            this.setStatus('error');
        });

        this.socket.on('reconnect_attempt', (attempt: number) => {
            console.log(`[SocketClient] Reconnection attempt ${attempt}...`);
            this.setStatus('connecting');
        });

        this.socket.on('reconnect', () => {
            console.log('[SocketClient] Reconnected');
            this.setStatus('connected');
        });

        return this.socket;
    }

    /**
     * Disconnect from the server.
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.setStatus('disconnected');
    }

    /**
     * Emit an event to the server.
     */
    emit(event: string, ...args: any[]): void {
        if (!this.socket?.connected) {
            console.warn(`[SocketClient] Cannot emit "${event}" — not connected.`);
            return;
        }
        this.socket.emit(event, ...args);
    }

    /**
     * Listen for an event from the server.
     * Returns an unsubscribe function.
     */
    on(event: string, callback: (...args: any[]) => void): () => void {
        this.socket?.on(event, callback);
        return () => {
            this.socket?.off(event, callback);
        };
    }

    /**
     * Listen for an event from the server (one-time).
     */
    once(event: string, callback: (...args: any[]) => void): void {
        this.socket?.once(event, callback);
    }

    /**
     * Subscribe to connection status changes.
     * Returns an unsubscribe function.
     */
    onStatusChange(listener: StatusListener): () => void {
        this.statusListeners.add(listener);
        // Immediately invoke with current status
        listener(this._status);
        return () => {
            this.statusListeners.delete(listener);
        };
    }

    /**
     * Emit an event and wait for a callback response (promise-based).
     */
    emitAsync<T = any>(event: string, data?: any): Promise<T> {
        if (!this.socket?.connected) {
            return Promise.reject(new Error(`Not connected — cannot emit "${event}".`));
        }

        if (data !== undefined) {
            return this.socket.timeout(10000).emitWithAck(event, data);
        } else {
            return this.socket.timeout(10000).emitWithAck(event);
        }
    }

    private setStatus(status: ConnectionStatus): void {
        this._status = status;
        for (const listener of this.statusListeners) {
            try {
                listener(status);
            } catch (err) {
                console.error('[SocketClient] Status listener error:', err);
            }
        }
    }
}

/** Singleton socket client instance */
export const socketClient = new SocketClient();
