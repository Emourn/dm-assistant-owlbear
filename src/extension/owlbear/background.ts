import OBR from '@owlbear-rodeo/sdk';
import { CONTEXT_MENU_ID, LEGACY_CONTEXT_MENU_ID } from './ids';
import { openAssistantPopover } from './popoverHost';

function getIconUrl(): string {
    return new URL('./owlbear/icon.svg', window.location.href).toString();
}

OBR.onReady(() => {
    void OBR.contextMenu.remove(LEGACY_CONTEXT_MENU_ID).catch(() => undefined);
    void OBR.contextMenu.remove(CONTEXT_MENU_ID).catch(() => undefined);

    void OBR.contextMenu.create({
        id: CONTEXT_MENU_ID,
        icons: [
            {
                icon: getIconUrl(),
                label: 'Open D&D Assistant',
                filter: {
                    min: 0,
                    roles: ['GM', 'PLAYER'],
                },
            },
        ],
        onClick: async (_context, elementId) => {
            await openAssistantPopover(elementId);
        },
    });
});
