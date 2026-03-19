import OBR from '@owlbear-rodeo/sdk';
import { rollStructuredD20 } from '../../features/dnd2024/domain/rolls';
import { buildInitiativeRoll } from '../../features/dnd2024/domain/sheet';
import { canPublishInitiativeShortcut } from '../domain/contextShortcuts';
import { recordRuntimeAudit } from './auditRepository';
import {
    linkActiveCharacterToSelection,
    readCharacterRepositorySnapshot,
    unlinkSelectionCharacters,
} from './characterRepository';
import {
    LEGACY_CONTEXT_MENU_ID,
    LINK_SELECTION_CONTEXT_MENU_ID,
    OPEN_CONTEXT_MENU_ID,
    PROMPT_INITIATIVE_CONTEXT_MENU_ID,
    PUBLISH_INITIATIVE_CONTEXT_MENU_ID,
    UNLINK_SELECTION_CONTEXT_MENU_ID,
} from './ids';
import { openAssistantPopover } from './popoverHost';
import { openRoomPrompt, publishRoomRoll } from './rollRepository';
import { readVisibilitySettings } from './visibilityRepository';

function getIconUrl(): string {
    return new URL('./owlbear/icon.svg', window.location.href).toString();
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

async function showNotice(message: string, kind: 'SUCCESS' | 'WARNING' = 'SUCCESS'): Promise<void> {
    await OBR.notification.show(message, kind);
}

async function handleLinkSelection(): Promise<void> {
    const role = await OBR.player.getRole().catch(() => null);
    if (role !== 'GM') {
        await showNotice('Only the GM can link the active sheet to tokens.', 'WARNING');
        return;
    }

    const [settings, snapshot, selectedIdsMaybe] = await Promise.all([
        readVisibilitySettings(),
        readCharacterRepositorySnapshot(role),
        OBR.player.getSelection().catch(() => [] as string[]),
    ]);
    const selectedIds = selectedIdsMaybe ?? [];
    const sheet = snapshot.activeCharacter?.sheet ?? null;
    if (!sheet) {
        await showNotice('Choose an active character sheet first.', 'WARNING');
        return;
    }
    if (selectedIds.length === 0) {
        await showNotice('Select one or more Owlbear tokens first.', 'WARNING');
        return;
    }

    const next = await linkActiveCharacterToSelection(sheet, settings.defaultTokenLinkVisibility);
    if (!next) {
        await showNotice('Could not link the current selection.', 'WARNING');
        return;
    }

    await showNotice(`Linked ${pluralize(selectedIds.length, 'token')} to ${sheet.name}.`);
}

async function handleUnlinkSelection(): Promise<void> {
    const role = await OBR.player.getRole().catch(() => null);
    if (role !== 'GM') {
        await showNotice('Only the GM can remove linked sheets from tokens.', 'WARNING');
        return;
    }

    const selectedIds = (await OBR.player.getSelection().catch(() => [] as string[])) ?? [];
    if (selectedIds.length === 0) {
        await showNotice('Select one or more Owlbear tokens first.', 'WARNING');
        return;
    }

    const next = await unlinkSelectionCharacters();
    if (!next) {
        await showNotice('Could not unlink the current selection.', 'WARNING');
        return;
    }

    await showNotice(`Removed D&D sheet links from ${pluralize(selectedIds.length, 'token')}.`);
}

async function handlePublishInitiativeShortcut(): Promise<void> {
    const role = await OBR.player.getRole().catch(() => null);
    const [snapshot, settings] = await Promise.all([
        readCharacterRepositorySnapshot(role),
        readVisibilitySettings(),
    ]);
    const sheet = snapshot.activeCharacter?.sheet ?? null;

    if (!sheet) {
        await showNotice('Resolve a character sheet first by assignment or token selection.', 'WARNING');
        return;
    }

    const canPublish = canPublishInitiativeShortcut(role, {
        assignedCharacterId: snapshot.assignedCharacterId,
        activeCharacterId: sheet.id,
        resolutionSource: snapshot.resolution.source,
        selectionLinks: snapshot.selection.links.map((link) => ({
            characterId: link.characterId,
            visibility: link.visibility,
        })),
    }, settings);

    if (!canPublish) {
        await showNotice('This character cannot publish a manual initiative roll with the current visibility policy.', 'WARNING');
        return;
    }

    const result = rollStructuredD20(buildInitiativeRoll(sheet));
    await publishRoomRoll(result, sheet, settings.defaultRollVisibility, 'manual');
    await recordRuntimeAudit(
        'roll',
        `Published initiative from context menu`,
        [
            `${sheet.name} rolled ${result.total} from ${result.formula}.`,
            `Visibility: ${settings.defaultRollVisibility}.`,
        ],
        sheet,
    );
    await showNotice(`Published initiative for ${sheet.name}.`);
}

async function handlePromptInitiativeShortcut(): Promise<void> {
    const role = await OBR.player.getRole().catch(() => null);
    if (role !== 'GM') {
        await showNotice('Only the GM can prompt initiative.', 'WARNING');
        return;
    }

    const settings = await readVisibilitySettings();
    const next = await openRoomPrompt({ kind: 'initiative' }, settings.initiativePromptAudience);
    await recordRuntimeAudit(
        'prompt',
        `Opened ${next.activePrompt?.label ?? 'initiative prompt'} from context menu`,
        [`Audience: ${settings.initiativePromptAudience}.`],
        null,
    );
    await showNotice(`Prompted initiative for ${settings.initiativePromptAudience === 'room' ? 'the room' : 'assigned players'}.`);
}

async function registerContextMenus(): Promise<void> {
    const ids = [
        LEGACY_CONTEXT_MENU_ID,
        OPEN_CONTEXT_MENU_ID,
        LINK_SELECTION_CONTEXT_MENU_ID,
        UNLINK_SELECTION_CONTEXT_MENU_ID,
        PUBLISH_INITIATIVE_CONTEXT_MENU_ID,
        PROMPT_INITIATIVE_CONTEXT_MENU_ID,
    ];
    ids.forEach((id) => {
        void OBR.contextMenu.remove(id).catch(() => undefined);
    });

    const icon = getIconUrl();

    await OBR.contextMenu.create({
        id: OPEN_CONTEXT_MENU_ID,
        icons: [
            {
                icon,
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

    await OBR.contextMenu.create({
        id: LINK_SELECTION_CONTEXT_MENU_ID,
        icons: [
            {
                icon,
                label: 'Link Active Sheet',
                filter: {
                    min: 1,
                    roles: ['GM'],
                },
            },
        ],
        onClick: async () => {
            await handleLinkSelection();
        },
    });

    await OBR.contextMenu.create({
        id: UNLINK_SELECTION_CONTEXT_MENU_ID,
        icons: [
            {
                icon,
                label: 'Unlink D&D Sheet',
                filter: {
                    min: 1,
                    roles: ['GM'],
                },
            },
        ],
        onClick: async () => {
            await handleUnlinkSelection();
        },
    });

    await OBR.contextMenu.create({
        id: PUBLISH_INITIATIVE_CONTEXT_MENU_ID,
        icons: [
            {
                icon,
                label: 'Publish Initiative',
                filter: {
                    min: 0,
                    roles: ['GM', 'PLAYER'],
                },
            },
        ],
        onClick: async () => {
            await handlePublishInitiativeShortcut();
        },
    });

    await OBR.contextMenu.create({
        id: PROMPT_INITIATIVE_CONTEXT_MENU_ID,
        icons: [
            {
                icon,
                label: 'Prompt Initiative',
                filter: {
                    min: 0,
                    roles: ['GM'],
                },
            },
        ],
        onClick: async () => {
            await handlePromptInitiativeShortcut();
        },
    });
}

OBR.onReady(() => {
    void registerContextMenus();
});
