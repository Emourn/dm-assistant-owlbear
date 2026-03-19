import { useCallback, useEffect, useState } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { ExtensionShell } from '../ui/ExtensionShell';
import { readRuntimeSnapshot, type OwlbearRuntimeSnapshot } from './runtime';

export function PopoverApp({ surface = 'popover' }: { surface?: 'popover' | 'panel' }) {
    const [runtime, setRuntime] = useState<OwlbearRuntimeSnapshot | null>(null);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const snapshot = await readRuntimeSnapshot();
            setRuntime(snapshot);
            setLoadState('ready');
            setError(null);
        } catch (cause) {
            setLoadState('error');
            setError(cause instanceof Error ? cause.message : 'Unknown Owlbear startup error.');
        }
    }, []);

    useEffect(() => {
        if (!OBR.isAvailable) {
            return;
        }

        let cleanups: Array<() => void> = [];
        OBR.onReady(async () => {
            await refresh();
            cleanups = [
                OBR.player.onChange(() => {
                    void refresh();
                }),
                OBR.party.onChange(() => {
                    void refresh();
                }),
            ];
        });

        return () => {
            cleanups.forEach((cleanup) => cleanup());
        };
    }, [refresh]);

    return <ExtensionShell runtime={runtime} loadState={loadState} error={error} surface={surface} />;
}
