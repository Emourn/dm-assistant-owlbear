import OBR, { type Item } from '@owlbear-rodeo/sdk';
import {
    PENDING_IMPORT_KEY,
    WORKBENCH_MODAL_ID,
    type PendingTokenImport,
} from './shared';

function storageAvailable() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getWorkbenchUrl(hash = '#/'): string {
    const url = new URL('./owlbear-workbench.html', window.location.href);
    return `${url.toString()}${hash}`;
}

export async function openWorkbench(hash = '#/'): Promise<void> {
    await OBR.modal.open({
        id: WORKBENCH_MODAL_ID,
        url: getWorkbenchUrl(hash),
        fullScreen: true,
    });
}

export function stashPendingTokenImport(items: Item[], source: PendingTokenImport['source']): void {
    if (!storageAvailable()) {
        return;
    }

    const payload: PendingTokenImport = {
        capturedAt: Date.now(),
        source,
        items,
    };
    window.localStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify(payload));
}

export function consumePendingTokenImport(): PendingTokenImport | null {
    if (!storageAvailable()) {
        return null;
    }

    const raw = window.localStorage.getItem(PENDING_IMPORT_KEY);
    if (!raw) {
        return null;
    }

    window.localStorage.removeItem(PENDING_IMPORT_KEY);

    try {
        return JSON.parse(raw) as PendingTokenImport;
    } catch {
        return null;
    }
}
