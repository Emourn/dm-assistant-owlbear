import OBR, { type Item } from '@owlbear-rodeo/sdk';
import {
    PENDING_IMPORT_KEY,
    PANEL_POPOVER_ID,
    type PendingTokenImport,
} from './shared';

function storageAvailable() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getWorkbenchUrl(hash = '#/'): string {
    const url = new URL('./owlbear.html', window.location.href);
    return `${url.toString()}${hash}`;
}

export async function openWorkbench(hash = '#/', anchorElementId?: string): Promise<void> {
    const basePopover = {
        id: PANEL_POPOVER_ID,
        url: getWorkbenchUrl(hash),
        width: 560,
        height: 760,
        disableClickAway: true,
    } as const;

    if (anchorElementId) {
        await OBR.popover.open({
            ...basePopover,
            anchorElementId,
            anchorOrigin: {
                horizontal: 'RIGHT',
                vertical: 'TOP',
            },
            transformOrigin: {
                horizontal: 'RIGHT',
                vertical: 'TOP',
            },
        });
        return;
    }

    await OBR.popover.open({
        ...basePopover,
        anchorReference: 'POSITION',
        anchorPosition: {
            left: Math.max(24, window.innerWidth - 32),
            top: 72,
        },
        anchorOrigin: {
            horizontal: 'RIGHT',
            vertical: 'TOP',
        },
        transformOrigin: {
            horizontal: 'RIGHT',
            vertical: 'TOP',
        },
    });
}

export function stashPendingTokenImport(items: Item[], source: PendingTokenImport['source']): void {
    if (!storageAvailable()) {
        return;
    }

    const payload: PendingTokenImport = {
        capturedAt: Date.now(),
        source,
        itemIds: items.map((item) => item.id),
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
        const parsed = JSON.parse(raw) as PendingTokenImport & { items?: Item[] };
        if (Array.isArray(parsed.itemIds)) {
            return parsed;
        }
        if (Array.isArray(parsed.items)) {
            return {
                capturedAt: parsed.capturedAt,
                source: parsed.source,
                itemIds: parsed.items.map((item) => item.id),
            };
        }
        return null;
    } catch {
        return null;
    }
}
