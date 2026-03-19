const MULTIPLAYER_PORT = '3001';

function getWindowLocation(): Location | null {
    if (typeof window === 'undefined') return null;
    return window.location;
}

export function getMultiplayerServerBaseUrl(): string {
    const location = getWindowLocation();
    if (!location) return `http://localhost:${MULTIPLAYER_PORT}`;

    if (import.meta.env.DEV) {
        return `${location.protocol}//${location.hostname}:${MULTIPLAYER_PORT}`;
    }

    return location.origin;
}

export async function fetchMultiplayerJson<T>(path: string): Promise<T> {
    const baseUrl = getMultiplayerServerBaseUrl();
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json() as Promise<T>;
}
