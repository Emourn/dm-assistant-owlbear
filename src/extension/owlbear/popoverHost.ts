import OBR from '@owlbear-rodeo/sdk';
import { ACTION_ID } from './ids';

export function getPopoverUrl(): string {
    return new URL('./owlbear.html', window.location.href).toString();
}

export async function openAssistantPopover(anchorElementId?: string): Promise<void> {
    const base = {
        id: ACTION_ID,
        url: getPopoverUrl(),
        width: 460,
        height: 720,
        disableClickAway: false,
    } as const;

    if (anchorElementId) {
        await OBR.popover.open({
            ...base,
            anchorElementId,
            anchorOrigin: { horizontal: 'RIGHT', vertical: 'TOP' },
            transformOrigin: { horizontal: 'RIGHT', vertical: 'TOP' },
        });
        return;
    }

    await OBR.popover.open({
        ...base,
        anchorReference: 'POSITION',
        anchorPosition: {
            left: Math.max(24, window.innerWidth - 24),
            top: 64,
        },
        anchorOrigin: { horizontal: 'RIGHT', vertical: 'TOP' },
        transformOrigin: { horizontal: 'RIGHT', vertical: 'TOP' },
    });
}
