export type ActionType = 'action' | 'bonus' | 'reaction' | 'free' | 'movement';

export interface ActionCost {
    resource: 'action' | 'bonus' | 'reaction' | 'movement' | 'spellSlot' | 'gold' | 'featureUse' | 'hp' | 'hitDice';
    amount: number;
    level?: number; // For spell slots
    featureId?: string; // For feature uses
}

export interface ActionPrerequisite {
    type: 'hasResource' | 'level' | 'notCondition' | 'hasCondition' | 'equipped';
    resource?: string;
    min?: number;
    condition?: string;
    itemId?: string;
}

export interface ActionEffect {
    type: 'deductResource' | 'addCondition' | 'promptRoll' | 'heal' | 'damage';
    resource?: string;
    amount?: number;
    condition?: string;
    dice?: string;
    damageType?: string;
}

export interface Action {
    id: string;
    name: string;
    type: ActionType;
    source: string;
    description: string;
    costs?: ActionCost[];
    prerequisites?: ActionPrerequisite[];
    effects?: ActionEffect[];
    rulesText?: string;
    icon?: string;
    isCustom?: boolean;
    isHomebrew?: boolean;
    homebrewSource?: string;
    featureId?: string;
}
