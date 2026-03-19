import { useState, useMemo } from 'react';
import { Character } from '../../types/character';
import { Action, ActionType } from '../../types/actions';
import { ActionButton } from './ActionButton';
import { generateActions, validateAction, TurnState } from '../../engine/actionEngine';
import { Plus } from 'lucide-react';

interface ActionPanelProps {
    character: Character;
    turnState: TurnState;
    onActionSelected: (action: Action) => void;
}

export function ActionPanel({ character, turnState, onActionSelected }: ActionPanelProps) {
    const [filter, setFilter] = useState<ActionType | 'all'>('all');

    // Generate full list of actions based on character class, race, features
    const allActions = useMemo(() => generateActions(character), [character]);

    const filteredActions = useMemo(() => {
        if (filter === 'all') return allActions;
        return allActions.filter(a => a.type === filter);
    }, [allActions, filter]);

    const filters: { value: ActionType | 'all'; label: string; color: string }[] = [
        { value: 'all', label: 'All Actions', color: 'text-parchment bg-parchment/10' },
        { value: 'action', label: 'Action', color: 'text-blood bg-blood/10' },
        { value: 'bonus', label: 'Bonus Action', color: 'text-gold bg-gold/10' },
        { value: 'reaction', label: 'Reaction', color: 'text-arcane bg-arcane/10' },
        { value: 'free', label: 'Free Action', color: 'text-stone-300 bg-stone-700/50' }
    ];

    return (
        <div className="flex flex-col h-full bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">

            {/* Header & Filters */}
            <div className="flex items-center justify-between p-3 border-b border-stone-800 bg-stone-900/50">
                <div>
                    <h3 className="text-sm font-cinzel font-bold text-parchment mb-2">Available Actions</h3>
                    <div className="flex flex-wrap gap-2">
                        {filters.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${filter === f.value
                                    ? f.color + ' border border-current shadow-sm'
                                    : 'text-stone-500 bg-stone-800 hover:bg-stone-700 border border-transparent'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={() => {
                        const name = window.prompt("Enter Custom Action Name:");
                        if (!name) return;
                        const typeStr = window.prompt("Enter type (action, bonus, reaction, free):", "action");
                        const type = (['action', 'bonus', 'reaction', 'free'].includes(typeStr || '') ? typeStr : 'action') as ActionType;
                        onActionSelected({
                            id: crypto.randomUUID(),
                            name,
                            type,
                            source: 'DM Custom Override',
                            description: 'A custom action invoked by the DM.',
                            costs: type !== 'free' ? [{ resource: type, amount: 1 }] : [],
                            isCustom: true
                        });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 rounded text-xs transition-colors shadow-sm self-start mt-1"
                >
                    <Plus size={14} /> Custom
                </button>
            </div>

            {/* Economy Tracker (At a glance) */}
            <div className="flex justify-between items-center px-4 py-2 bg-stone-950/50 border-b border-stone-800 text-xs font-mono">
                <div className={`flex items-center gap-1.5 ${turnState.actionsUsed < turnState.actionsMax ? 'text-blood' : 'text-stone-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${turnState.actionsUsed < turnState.actionsMax ? 'bg-blood shadow-[0_0_5px_rgba(220,38,38,0.6)]' : 'bg-stone-700'}`} />
                    Action {turnState.actionsMax > 1 ? `(${turnState.actionsMax - turnState.actionsUsed}/${turnState.actionsMax})` : ''}
                </div>
                <div className={`flex items-center gap-1.5 ${turnState.bonusActionsUsed < turnState.bonusActionsMax ? 'text-gold' : 'text-stone-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${turnState.bonusActionsUsed < turnState.bonusActionsMax ? 'bg-gold shadow-[0_0_5px_rgba(250,204,21,0.6)]' : 'bg-stone-700'}`} />
                    Bonus {turnState.bonusActionsMax > 1 ? `(${turnState.bonusActionsMax - turnState.bonusActionsUsed}/${turnState.bonusActionsMax})` : ''}
                </div>
                <div className={`flex items-center gap-1.5 ${turnState.reactionsUsed < turnState.reactionsMax ? 'text-arcane' : 'text-stone-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${turnState.reactionsUsed < turnState.reactionsMax ? 'bg-arcane shadow-[0_0_5px_rgba(147,51,234,0.6)]' : 'bg-stone-700'}`} />
                    Reaction {turnState.reactionsMax > 1 ? `(${turnState.reactionsMax - turnState.reactionsUsed}/${turnState.reactionsMax})` : ''}
                </div>
            </div>

            {/* Actions Grid */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                    {filteredActions.map(action => {
                        // Check if the character can actually use this right now
                        const validation = validateAction(character, action, turnState);

                        return (
                            <ActionButton
                                key={action.id}
                                action={action}
                                character={character}
                                disabled={!validation.valid}
                                reason={validation.reason}
                                onClick={onActionSelected}
                            />
                        );
                    })}
                </div>
                {filteredActions.length === 0 && (
                    <div className="text-center py-8 text-stone-500 text-sm">
                        No actions found for this filter.
                    </div>
                )}
            </div>

        </div>
    );
}
