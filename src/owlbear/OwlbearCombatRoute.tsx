import { useEffect } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { Link } from 'react-router-dom';
import { Crosshair, Link2, Swords } from 'lucide-react';
import { CombatBoard } from '../components/combat/CombatBoard';
import { CombatSetup } from '../components/combat/CombatSetup';
import { useCombatStore } from '../store/combatStore';
import { importCurrentSelectionIntoCombat, importItemsIntoCombat } from './bridge';
import { consumePendingTokenImport } from './host';

export function OwlbearCombatRoute() {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const skipMapSetup = useCombatStore((state) => state.skipMapSetup);

    useEffect(() => {
        if (activeEncounter?.isSetupComplete && !activeEncounter.mapSetupComplete) {
            skipMapSetup();
        }
    }, [activeEncounter?.id, activeEncounter?.isSetupComplete, activeEncounter?.mapSetupComplete, skipMapSetup]);

    useEffect(() => {
        const pending = consumePendingTokenImport();
        if (!pending?.itemIds.length) {
            return;
        }

        void OBR.scene.items.getItems(pending.itemIds).then((items) => importItemsIntoCombat(items, pending.source)).then((count) => {
            if (count > 0) {
                void OBR.notification.show(`Imported ${count} Owlbear token${count === 1 ? '' : 's'} into combat.`, 'SUCCESS');
            }
        });
    }, []);

    const handleImportSelection = async () => {
        const count = await importCurrentSelectionIntoCombat('workbench');
        if (count === 0) {
            await OBR.notification.show('Select one or more Owlbear tokens first.', 'WARNING');
            return;
        }

        await OBR.notification.show(`Imported ${count} token${count === 1 ? '' : 's'} into combat.`, 'SUCCESS');
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="rounded-2xl border border-gold/20 bg-stone-950/80 p-4 shadow-[0_30px_70px_-40px_rgba(217,119,6,0.65)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-gold">
                            <Swords size={18} />
                            <span className="text-xs font-black uppercase tracking-[0.28em]">Owlbear Combat Bridge</span>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm text-stone-400">
                            Use Owlbear for maps and effects, then pull selected tokens into the DM Assistant combat engine.
                            Smoke & Specter!, Embers, and similar extensions remain untouched because this bridge only reads selection
                            and writes to DM Assistant&apos;s own metadata namespace. Spell actions with an Embers button can now dispatch
                            mapped visual effects straight from the combat panel.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleImportSelection}
                            className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-stone-950 transition-colors hover:bg-yellow-400"
                        >
                            <Crosshair size={16} />
                            Import Selected Tokens
                        </button>
                        <Link
                            to="/room"
                            className="inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-200 transition-colors hover:border-gold/40 hover:text-gold"
                        >
                            <Link2 size={16} />
                            Link Tokens & Players
                        </Link>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-800/80 bg-stone-950/70">
                {activeEncounter?.isSetupComplete ? <CombatBoard /> : <CombatSetup />}
            </div>
        </div>
    );
}
