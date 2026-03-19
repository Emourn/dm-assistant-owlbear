import { Swords } from 'lucide-react';
import { useCombatStore } from '../store/combatStore';
import { CombatSetup } from '../components/combat/CombatSetup';
import { CombatBoard } from '../components/combat/CombatBoard';
import { MapSetup } from '../components/combat/MapSetup';

export function Combat() {
    const activeEncounter = useCombatStore((state) => state.activeEncounter);
    const setBattleMap = useCombatStore((state) => state.setBattleMap);
    const completeMapSetup = useCombatStore((state) => state.completeMapSetup);
    const skipMapSetup = useCombatStore((state) => state.skipMapSetup);

    // When combat is fully active, use a full-height layout (no max-width, no header padding)
    const isFullScreenCombat = activeEncounter?.isSetupComplete && activeEncounter?.mapSetupComplete;
    const isMapSetup = activeEncounter?.isSetupComplete && !activeEncounter?.mapSetupComplete;

    if (isFullScreenCombat || isMapSetup) {
        return (
            <div className="w-full h-full">
                {isFullScreenCombat ? <CombatBoard /> : (
                    <MapSetup
                        initialState={activeEncounter.battleMap}
                        combatants={activeEncounter.combatants}
                        onComplete={(state) => {
                            setBattleMap(state);
                            completeMapSetup();
                        }}
                        onCancel={skipMapSetup}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-6 animate-in fade-in duration-300">
            <header className="flex-shrink-0 flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-stone-900 rounded-md shadow-inner border border-stone-800">
                        <Swords size={24} className="text-blood" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-cinzel font-bold text-parchment">Combat Tracker</h1>
                        <p className="text-sm text-stone-500">Manage initiative and action economy</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 h-full">
                <CombatSetup />
            </div>
        </div>
    );
}
