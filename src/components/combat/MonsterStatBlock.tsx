import React from 'react';
import { Combatant } from '../../types/combat';
import { DraggablePanel } from '../common/DraggablePanel';
import { X } from 'lucide-react';
import { flattenEntries } from '../../engine/fiveEToolsParser';

// Simple markdown renderer for the stat block
function renderMarkdown(text: string): React.ReactNode[] {
    if (!text) return [];

    // Split on double newlines for paragraphs
    return text.split('\n\n').map((paragraph, pIdx) => {
        // Handle bolding
        const parts = paragraph.split(/(\*\*.*?\*\*)/g);

        return (
            <p key={pIdx} className="mb-2 text-sm leading-snug">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-stone-900">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                })}
            </p>
        );
    });
}

const getModifier = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
};

interface MonsterStatBlockProps {
    combatant: Combatant;
    onClose: () => void;
}

export const MonsterStatBlock: React.FC<MonsterStatBlockProps> = ({ combatant, onClose }) => {
    const m = combatant.monsterData;

    // Fallback if no monster data
    if (!m) {
        return null;
    }

    const name = m.name || combatant.name;
    const typeStr = [
        m.size,
        m.type?.type || m.type || 'unknown',
        m.alignment ? `(${m.alignment.join(', ')})` : ''
    ].filter(Boolean).join(' ');

    const acStr = combatant.ac;
    const hpStr = `${combatant.maxHp} ${m.hp?.formula ? `(${m.hp.formula})` : ''}`;
    const speedStr = combatant.speed;

    const renderActionSection = (title: string, actions: any[]) => {
        if (!actions || actions.length === 0) return null;
        return (
            <div className="mt-4">
                <h3 className="text-xl font-bold font-serif text-[#7a200d] border-b border-[#7a200d] mb-2 uppercase">{title}</h3>
                {actions.map((action, idx) => (
                    <div key={idx} className="mb-2">
                        <p className="text-sm leading-snug text-stone-900">
                            <strong className="font-bold text-stone-900 italic">{action.name}. </strong>
                            {action.entries ? <span className="inline-block">{renderMarkdown(flattenEntries(action.entries))}</span> : null}
                        </p>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <DraggablePanel
            className="fixed top-24 right-24 w-[400px]"
            zIndex={150}
        >
            <div className="bg-[#fdf1dc] p-4 text-stone-900 shadow-inner overflow-y-auto max-h-[70vh] custom-scrollbar border-4 border-[#e69a28] relative">
                {/* Close Button manually added since DraggablePanel doesn't have it natively */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-1 text-[#7a200d] hover:bg-[#7a200d]/10 rounded transition-colors"
                >
                    <X size={20} />
                </button>
                {/* Header Phase */}
                <div className="border-b-4 border-[#7a200d] pb-2 mb-2">
                    <h1 className="text-3xl font-serif font-bold text-[#7a200d] uppercase">{name}</h1>
                    <p className="text-sm italic">{typeStr}</p>
                </div>

                {/* Core Stats */}
                <div className="text-sm leading-snug mb-2">
                    <p><strong className="text-[#7a200d]">Armor Class</strong> {acStr}</p>
                    <p><strong className="text-[#7a200d]">Hit Points</strong> {hpStr}</p>
                    <p><strong className="text-[#7a200d]">Speed</strong> {speedStr}</p>
                </div>

                <div className="border-t-2 border-b-2 border-[#7a200d] py-2 mb-2 flex justify-between text-center">
                    {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(attr => {
                        const score = combatant.abilityScores ? combatant.abilityScores[attr.toLowerCase() as keyof typeof combatant.abilityScores] : 10;
                        return (
                            <div key={attr} className="flex flex-col">
                                <span className="font-bold text-[#7a200d] text-sm">{attr}</span>
                                <span className="text-sm">{score} ({getModifier(score)})</span>
                            </div>
                        );
                    })}
                </div>

                {/* Details */}
                <div className="text-sm leading-snug border-b-4 border-[#7a200d] pb-2 mb-2">
                    {m.save && (
                        <p><strong className="text-[#7a200d]">Saving Throws</strong> {
                            Object.entries(m.save).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')
                        }</p>
                    )}
                    {m.skill && (
                        <p><strong className="text-[#7a200d]">Skills</strong> {
                            Object.entries(m.skill).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`).join(', ')
                        }</p>
                    )}
                    {combatant.vulnerabilities?.length ? <p><strong className="text-[#7a200d]">Damage Vulnerabilities</strong> {combatant.vulnerabilities.join(', ')}</p> : null}
                    {combatant.resistances?.length ? <p><strong className="text-[#7a200d]">Damage Resistances</strong> {combatant.resistances.join(', ')}</p> : null}
                    {combatant.immunities?.length ? <p><strong className="text-[#7a200d]">Damage Immunities</strong> {combatant.immunities.join(', ')}</p> : null}
                    {combatant.conditionImmunities?.length ? <p><strong className="text-[#7a200d]">Condition Immunities</strong> {combatant.conditionImmunities.join(', ')}</p> : null}
                    <p><strong className="text-[#7a200d]">Senses</strong> {m.senses ? m.senses.join(', ') : combatant.senses}</p>
                    <p><strong className="text-[#7a200d]">Languages</strong> {m.languages ? m.languages.join(', ') : '—'}</p>
                    <p><strong className="text-[#7a200d]">Challenge</strong> {combatant.cr || m.cr || '?'}</p>
                </div>

                {/* Traits */}
                {m.trait?.map((trait: any, idx: number) => (
                    <div key={`trait-${idx}`} className="mb-2">
                        <p className="text-sm leading-snug text-stone-900">
                            <strong className="font-bold text-stone-900 italic">{trait.name}. </strong>
                            {trait.entries ? <span className="inline-block">{renderMarkdown(flattenEntries(trait.entries))}</span> : null}
                        </p>
                    </div>
                ))}

                {/* Actions */}
                {renderActionSection('Actions', m.action)}

                {/* Bonus Actions */}
                {renderActionSection('Bonus Actions', m.bonus)}

                {/* Reactions */}
                {renderActionSection('Reactions', m.reaction)}

                {/* Legendary Actions */}
                {m.legendary && m.legendary.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-xl font-bold font-serif text-[#7a200d] border-b border-[#7a200d] mb-2 uppercase">Legendary Actions</h3>
                        <p className="text-sm leading-snug mb-2">The monster can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. The monster regains spent legendary actions at the start of its turn.</p>
                        {m.legendary.map((action: any, idx: number) => (
                            <div key={`leg-${idx}`} className="mb-2">
                                <p className="text-sm leading-snug text-stone-900">
                                    <strong className="font-bold text-stone-900 italic">{action.name}. </strong>
                                    {action.entries ? <span className="inline-block">{renderMarkdown(flattenEntries(action.entries))}</span> : null}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DraggablePanel>
    );
};
