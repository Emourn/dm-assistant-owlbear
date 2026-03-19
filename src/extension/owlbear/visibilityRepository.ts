import OBR, { type Metadata } from '@owlbear-rodeo/sdk';
import {
    createDefaultVisibilitySettings,
    parseStoredVisibilitySettings,
    type StoredVisibilitySettings,
} from '../domain/visibilitySettings';
import { EXTENSION_NAMESPACE } from './ids';

export const ROOM_VISIBILITY_SETTINGS_KEY = `${EXTENSION_NAMESPACE}/visibility-settings`;

export function getVisibilitySettingsFromMetadata(metadata: Metadata): StoredVisibilitySettings {
    return parseStoredVisibilitySettings(metadata[ROOM_VISIBILITY_SETTINGS_KEY]) ?? createDefaultVisibilitySettings();
}

async function writeVisibilitySettings(settings: StoredVisibilitySettings): Promise<void> {
    await OBR.room.setMetadata({
        [ROOM_VISIBILITY_SETTINGS_KEY]: settings,
    });
}

export async function readVisibilitySettings(): Promise<StoredVisibilitySettings> {
    const metadata = await OBR.room.getMetadata();
    return getVisibilitySettingsFromMetadata(metadata);
}

export async function updateVisibilitySettings(
    settings: StoredVisibilitySettings,
): Promise<StoredVisibilitySettings> {
    await writeVisibilitySettings(settings);
    return settings;
}
