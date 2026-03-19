import { useState, useCallback } from 'react';
import { CombatAction, Combatant, Encounter } from '../types/combat';
import { TargetingMode } from '../types/battleMap';
import { parseActionRange } from '../engine/targetingEngine';

interface UseCombatTargetingProps {
    activeEncounter: Encounter | null;
    activeCombatant: Combatant | null;
    setWizardAction: (data: { action: CombatAction; actor: Combatant; initialTargets?: Combatant[] }) => void;
}

export function useCombatTargeting({
    activeEncounter,
    activeCombatant,
    setWizardAction
}: UseCombatTargetingProps) {
    const [targetingMode, setTargetingMode] = useState<TargetingMode | null>(null);

    const handleActionSelect = useCallback((action: CombatAction, actorOverride?: Combatant) => {
        if (!activeEncounter) return;
        const actor = actorOverride || activeCombatant;
        if (!actor) return;

        const info = parseActionRange(action);
        const requiresMapTargeting = activeEncounter.battleMap && (info.rangeFt > 0 || info.aoeType);

        if (requiresMapTargeting && action.range !== 'Self') {
            setTargetingMode({
                action,
                rangeFt: info.rangeFt,
                aoeType: info.aoeType,
                aoeRadiusFt: info.aoeRadiusFt
            });
        } else if (requiresMapTargeting && info.aoeType) {
            setTargetingMode({
                action,
                rangeFt: info.rangeFt,
                aoeType: info.aoeType,
                aoeRadiusFt: info.aoeRadiusFt
            });
        } else {
            setWizardAction({
                action,
                actor: actor,
                initialTargets: action.range === 'Self' ? [actor] : []
            });
        }
    }, [activeEncounter, activeCombatant, setWizardAction]);

    const handleTargetSelect = useCallback((targetIds: string[] | null) => {
        if (!targetingMode || !activeCombatant || !activeEncounter) return;

        if (!targetIds || targetIds.length === 0) {
            setTargetingMode(null);
            return;
        }

        const selectedTargets = activeEncounter.combatants.filter((c: Combatant) => targetIds.includes(c.id));
        setWizardAction({
            action: targetingMode.action,
            actor: activeCombatant,
            initialTargets: selectedTargets
        });

        setTargetingMode(null);
    }, [targetingMode, activeCombatant, activeEncounter, setWizardAction]);

    const clearTargeting = useCallback(() => {
        setTargetingMode(null);
    }, []);

    return {
        targetingMode,
        handleActionSelect,
        handleTargetSelect,
        clearTargeting
    };
}
