import { Character } from '../types/character';
import { Action } from '../types/actions';
import { rollDice } from './diceEngine';

// Import our JSON data
import basicActions from '../data/dnd5e/actions.json';
import classFeatures from '../data/dnd5e/class-features.json';
import racialTraits from '../data/dnd5e/racial-traits.json';

// Cast the JSONs to our Action type
const allBasicActions = basicActions as Action[];
const allClassFeatures = classFeatures as Action[];
const allRacialTraits = racialTraits as Action[];

export const generateActions = (character: Character): Action[] => {
    const actions: Action[] = [];

    // 1. Everyone gets the basic actions
    actions.push(...allBasicActions);

    // 2. Add class features based on level
    const charClassLowercase = character.className.toLowerCase().trim();

    if (charClassLowercase) {
        allClassFeatures.forEach(feature => {
            const sourceLower = feature.source.toLowerCase();
            if (sourceLower.includes(charClassLowercase)) {
                // Extract the level requirement from the source string (e.g., "Fighter 2" -> 2)
                const levelMatch = sourceLower.match(/\d+/);
                const levelReq = levelMatch ? parseInt(levelMatch[0], 10) : 1;

                if (character.level >= levelReq) {
                    actions.push(feature);
                }
            }
        });
    }

    // 3. Add racial traits based on race
    const charRaceLowercase = character.race.toLowerCase().trim();
    if (charRaceLowercase) {
        allRacialTraits.forEach(trait => {
            if (trait.source.toLowerCase().includes(charRaceLowercase)) {
                actions.push(trait);
            }
        });
    }

    // 4. Add custom actions from the character sheet (items, specific spells, etc)
    if (character.actions && character.actions.length > 0) {
        actions.push(...character.actions);
    }

    // Sort actions by type for consistent UI grouping later
    const order = { 'action': 1, 'bonus': 2, 'reaction': 3, 'movement': 4, 'free': 5 };
    actions.sort((a, b) => order[a.type] - order[b.type]);

    return actions;
};

// Represents the state of economy for checking validity
export interface TurnState {
    actionsUsed: number;
    actionsMax: number;
    bonusActionsUsed: number;
    bonusActionsMax: number;
    reactionsUsed: number;
    reactionsMax: number;
    movementRemaining: number;
}

export const validateAction = (character: Character, action: Action, turnState: TurnState): { valid: boolean; reason?: string } => {
    // DM Override: bypass all economy and restriction checks
    if (character.customOverrides?.ignoreEconomy) {
        return { valid: true };
    }

    // 1. FIRST check incapacitating conditions — a Stunned character sees "You are Stunned",
    //    not "You have no Actions remaining" (which would be confusing)
    const incapacitatingConditions = ['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious'];
    for (const cond of character.conditions) {
        if (incapacitatingConditions.includes(cond.name.toLowerCase())) {
            // Reaction-only actions (like Shield) are blocked by different conditions
            return { valid: false, reason: `You are ${cond.name} and cannot take actions.` };
        }
    }

    // 2. Check prerequisite conditions
    if (action.prerequisites) {
        for (const prereq of action.prerequisites) {
            if (prereq.type === 'notCondition') {
                const hasCondition = character.conditions.some(c => c.name.toLowerCase() === prereq.condition?.toLowerCase());
                if (hasCondition) {
                    return { valid: false, reason: `Cannot use while ${prereq.condition}.` };
                }
            }
            if (prereq.type === 'level' && prereq.min && character.level < prereq.min) {
                return { valid: false, reason: `Requires level ${prereq.min}.` };
            }
        }
    }

    // 3. Check economy (action, bonus, reaction)
    const costs = action.costs || [];
    for (const cost of costs) {
        if (cost.resource === 'action' && turnState.actionsUsed >= turnState.actionsMax) {
            return { valid: false, reason: "You have no Actions remaining this turn." };
        }
        if (cost.resource === 'bonus' && turnState.bonusActionsUsed >= turnState.bonusActionsMax) {
            return { valid: false, reason: "You have no Bonus Actions remaining this turn." };
        }
        if (cost.resource === 'reaction' && turnState.reactionsUsed >= turnState.reactionsMax) {
            return { valid: false, reason: "You have no Reactions remaining this round." };
        }

        // 4. Check feature uses (e.g. Action Surge uses, Second Wind uses)
        if (cost.resource === 'featureUse' && cost.featureId) {
            const feature = character.features.find(f => f.id === cost.featureId);
            if (feature && feature.hasUses && feature.usesCurrent !== undefined && feature.usesCurrent < cost.amount) {
                return { valid: false, reason: `Not enough uses of ${feature.name} remaining (${feature.usesCurrent}/${feature.usesMax}).` };
            }
        }

        // 5. Check spell slots
        if (cost.resource === 'spellSlot' && cost.level !== undefined) {
            const slot = character.spellSlots[cost.level];
            if (!slot || slot.current < cost.amount) {
                return { valid: false, reason: `No level ${cost.level} spell slots remaining.` };
            }
        }
    }

    return { valid: true };
};

export interface ActionLogEntry {
    id: string;
    actionId: string;
    actionName: string;
    timestamp: number;
    costsDeducted: { resource: string; amount: number; featureId?: string }[];
}

export const executeAction = (
    character: Character,
    action: Action,
    turnState: TurnState
): { updatedCharacter: Character; newTurnState: TurnState; logEntry: ActionLogEntry } => {

    // Create copies for immutability
    const updatedCharacter = {
        ...character,
        features: character.features.map(f => ({ ...f }))
    };
    const newTurnState = { ...turnState };
    const costsDeducted: ActionLogEntry['costsDeducted'] = [];

    const costs = action.costs || [];
    for (const cost of costs) {
        if (cost.resource === 'action') {
            newTurnState.actionsUsed += cost.amount;
            costsDeducted.push({ resource: 'action', amount: cost.amount });
        } else if (cost.resource === 'bonus') {
            newTurnState.bonusActionsUsed += cost.amount;
            costsDeducted.push({ resource: 'bonus', amount: cost.amount });
        } else if (cost.resource === 'reaction') {
            newTurnState.reactionsUsed += cost.amount;
            costsDeducted.push({ resource: 'reaction', amount: cost.amount });
        } else if (cost.resource === 'featureUse' && cost.featureId) {
            const featureIndex = updatedCharacter.features.findIndex(f => f.id === cost.featureId);
            if (featureIndex !== -1) {
                const feat = updatedCharacter.features[featureIndex];
                if (feat.hasUses && feat.usesCurrent !== undefined) {
                    feat.usesCurrent -= cost.amount;
                    costsDeducted.push({ resource: 'featureUse', amount: cost.amount, featureId: cost.featureId });
                }
            }
        } else if (cost.resource === 'spellSlot' && cost.level !== undefined) {
            // Deep-copy spell slots to avoid mutating original
            updatedCharacter.spellSlots = updatedCharacter.spellSlots.map(s => ({ ...s }));
            updatedCharacter.spellSlots[cost.level].current -= cost.amount;
            costsDeducted.push({ resource: 'spellSlot', amount: cost.amount, featureId: `level-${cost.level}` });
        } else if (cost.resource === 'hp' && typeof updatedCharacter.currentHp === 'number') {
            updatedCharacter.currentHp -= cost.amount;
            costsDeducted.push({ resource: 'hp', amount: cost.amount });
        }
    }

    // Special: Action Surge grants an extra Action this turn
    if (action.id === 'fighter-action-surge') {
        newTurnState.actionsMax += 1;
    }

    // Process effects
    if (action.effects) {
        for (const effect of action.effects) {
            if (effect.type === 'heal' && effect.dice) {
                // Parse the dice notation, replacing @level with character level
                const resolvedNotation = effect.dice.replace('@level', String(updatedCharacter.level));
                const result = rollDice(resolvedNotation);
                const healAmount = Math.max(1, result.total); // Minimum 1 HP healed
                updatedCharacter.currentHp = Math.min(updatedCharacter.maxHp, updatedCharacter.currentHp + healAmount);
            }
        }
    }

    const logEntry: ActionLogEntry = {
        id: crypto.randomUUID(),
        actionId: action.id,
        actionName: action.name,
        timestamp: Date.now(),
        costsDeducted
    };

    return { updatedCharacter, newTurnState, logEntry };
};

export const undoAction = (
    character: Character,
    turnState: TurnState,
    logEntry: ActionLogEntry
): { updatedCharacter: Character; newTurnState: TurnState } => {
    const updatedCharacter = {
        ...character,
        features: character.features.map(f => ({ ...f }))
    };
    const newTurnState = { ...turnState };

    for (const cost of logEntry.costsDeducted) {
        if (cost.resource === 'action') newTurnState.actionsUsed = Math.max(0, newTurnState.actionsUsed - cost.amount);
        else if (cost.resource === 'bonus') newTurnState.bonusActionsUsed = Math.max(0, newTurnState.bonusActionsUsed - cost.amount);
        else if (cost.resource === 'reaction') newTurnState.reactionsUsed = Math.max(0, newTurnState.reactionsUsed - cost.amount);
        else if (cost.resource === 'featureUse' && cost.featureId) {
            const featureIndex = updatedCharacter.features.findIndex(f => f.id === cost.featureId);
            if (featureIndex !== -1 && updatedCharacter.features[featureIndex].usesCurrent !== undefined) {
                updatedCharacter.features[featureIndex].usesCurrent! += cost.amount;
            }
        } else if (cost.resource === 'hp') {
            updatedCharacter.currentHp += cost.amount;
        }
    }

    // Note: undoing 'heal' or specific dice effects is complex. 
    // Usually, real VTTs don't perfectly undo HP changes without a deep history state.
    // For Phase 3, economy reverting is the main priority.

    return { updatedCharacter, newTurnState };
};
