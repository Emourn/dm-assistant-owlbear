import { useState } from 'react';
import { Character } from '../../../types/character';
import { Action } from '../../../types/actions';
import { ActionPanel } from '../../actions/ActionPanel';
import { ActionLog } from '../../actions/ActionLog';
import { TurnState, executeAction, undoAction, ActionLogEntry } from '../../../engine/actionEngine';
import { RotateCcw } from 'lucide-react';

interface ActionsTabProps {
    data: Character;
    onChange: (field: keyof Character, value: unknown) => void;
}

export function ActionsTab({ data, onChange }: ActionsTabProps) {
    // Generate initial economy limits incorporating DM overrides
    const getMaxEconomy = (char: Character) => ({
        actionsMax: char.customOverrides?.maxAction ?? 1,
        bonusActionsMax: char.customOverrides?.maxBonusAction ?? 1,
        reactionsMax: char.customOverrides?.maxReaction ?? 1,
        movementRemaining: (parseInt(char.speed) || 30) + (char.customOverrides?.extraMovement ?? 0)
    });

    // Local state for economy during this viewing session
    const [turnState, setTurnState] = useState<TurnState>(() => ({
        actionsUsed: 0,
        bonusActionsUsed: 0,
        reactionsUsed: 0,
        ...getMaxEconomy(data)
    }));

    const [logs, setLogs] = useState<ActionLogEntry[]>([]);

    const handleActionSelected = (action: Action) => {
        const { updatedCharacter, newTurnState, logEntry } = executeAction(data, action, turnState);

        // Update economy
        setTurnState(newTurnState);

        // Add log
        setLogs(prev => [...prev, logEntry]);

        // Push char data changes (like HP or feature uses) up to the form
        if (updatedCharacter.currentHp !== data.currentHp) {
            onChange('currentHp', updatedCharacter.currentHp);
        }
        // Need to push features if they changed
        onChange('features', updatedCharacter.features);
    };

    const handleUndo = (logId: string) => {
        const logEntry = logs.find(l => l.id === logId);
        if (!logEntry) return;

        const { updatedCharacter, newTurnState } = undoAction(data, turnState, logEntry);

        setTurnState(newTurnState);
        setLogs(prev => prev.filter(l => l.id !== logId));

        if (updatedCharacter.currentHp !== data.currentHp) {
            onChange('currentHp', updatedCharacter.currentHp);
        }
        onChange('features', updatedCharacter.features);
    };

    const resetTurn = () => {
        setTurnState({
            actionsUsed: 0,
            bonusActionsUsed: 0,
            reactionsUsed: 0,
            ...getMaxEconomy(data)
        });
        // We don't clear logs on reset turn usually, but we could add a "Turn Reset" log entry
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Left side: Action Panel (Takes 2 columns) */}
            <div className="lg:col-span-2 flex flex-col h-full space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-xl font-cinzel font-bold text-parchment">Action Economy</h2>
                        <p className="text-sm text-parchment-muted">Select actions to use them. Illegal actions are disabled.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer hover:text-parchment">
                            <input
                                type="checkbox"
                                className="accent-blood cursor-pointer w-4 h-4 rounded border-stone-600 bg-stone-800"
                                checked={!!data.customOverrides?.ignoreEconomy}
                                onChange={(e) => {
                                    onChange('customOverrides', {
                                        ...data.customOverrides,
                                        ignoreEconomy: e.target.checked
                                    });
                                }}
                            />
                            DM Override
                        </label>
                        <button
                            onClick={resetTurn}
                            className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600 rounded text-sm transition-colors"
                        >
                            <RotateCcw size={14} /> Reset Turn
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 bg-stone-900 border border-stone-800 rounded-lg overflow-hidden flex flex-col">
                    <ActionPanel
                        character={data}
                        turnState={turnState}
                        onActionSelected={handleActionSelected}
                    />
                </div>
            </div>

            {/* Right side: Combat Log */}
            <div className="h-full">
                <ActionLog logs={logs} onUndo={handleUndo} />
            </div>
        </div>
    );
}
