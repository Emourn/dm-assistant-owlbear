import type { StoredVisibilitySettings } from '../domain/visibilitySettings';

interface VisibilityPolicyPanelProps {
    role: 'GM' | 'PLAYER' | null;
    settings: StoredVisibilitySettings;
    isSaving: boolean;
    onSave: (settings: StoredVisibilitySettings) => Promise<void>;
}

function SelectField({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
}) {
    return (
        <label className="block">
            <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{label}</div>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none transition focus:border-amber-400/50"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function VisibilityPolicyPanel({
    role,
    settings,
    isSaving,
    onSave,
}: VisibilityPolicyPanelProps) {
    if (role !== 'GM') {
        return null;
    }

    return (
        <section className="rounded-[1.4rem] border border-stone-800 bg-stone-950/75 p-5">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">Visibility policy</div>
            <div className="mt-2 text-lg font-semibold text-parchment">Room defaults for links and shared rolls</div>
            <div className="mt-1 text-sm text-stone-400">
                Keep the public surface intentional. These defaults stay under the extension metadata namespace and control future links, roll publication, and initiative prompts.
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <SelectField
                    label="Default token link visibility"
                    value={settings.defaultTokenLinkVisibility}
                    onChange={(value) => void onSave({ ...settings, defaultTokenLinkVisibility: value as StoredVisibilitySettings['defaultTokenLinkVisibility'] })}
                    options={[
                        { value: 'room', label: 'Room visible' },
                        { value: 'assigned-only', label: 'Assigned player only' },
                        { value: 'gm-only', label: 'GM only' },
                    ]}
                />
                <SelectField
                    label="Default published roll visibility"
                    value={settings.defaultRollVisibility}
                    onChange={(value) => void onSave({ ...settings, defaultRollVisibility: value as StoredVisibilitySettings['defaultRollVisibility'] })}
                    options={[
                        { value: 'room', label: 'Room visible' },
                        { value: 'assigned-only', label: 'Assigned player only' },
                        { value: 'gm-only', label: 'GM only' },
                    ]}
                />
                <SelectField
                    label="Initiative prompt audience"
                    value={settings.initiativePromptAudience}
                    onChange={(value) => void onSave({ ...settings, initiativePromptAudience: value as StoredVisibilitySettings['initiativePromptAudience'] })}
                    options={[
                        { value: 'room', label: 'Room visible' },
                        { value: 'assigned-only', label: 'Assigned players only' },
                    ]}
                />
                <label className="flex items-center gap-3 rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3">
                    <input
                        type="checkbox"
                        checked={settings.allowPlayerManualRollPublication}
                        onChange={(event) => void onSave({ ...settings, allowPlayerManualRollPublication: event.target.checked })}
                        disabled={isSaving}
                        className="h-4 w-4 rounded border-stone-600 bg-stone-950 text-amber-400"
                    />
                    <div>
                        <div className="text-sm font-medium text-parchment">Allow player manual room publication</div>
                        <div className="text-xs text-stone-500">Players can still answer prompts even if manual publication is disabled.</div>
                    </div>
                </label>
            </div>
        </section>
    );
}
