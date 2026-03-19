import { Character } from '../../types/character';
import { Shield, Heart, Zap, User, FileUp } from 'lucide-react';
import { getArmorClass, getInitiative } from '../../engine/statCalculations';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

interface CharacterCardProps {
    character: Character;
    onClick: (id: string) => void;
    onUpdateClick?: (id: string) => void;
}

export function CharacterCard({ character, onClick, onUpdateClick }: CharacterCardProps) {
    return (
        <div
            onClick={() => onClick(character.id)}
            role="button"
            tabIndex={0}
            className="group w-full flex flex-col items-start text-left bg-stone-800/80 hover:bg-stone-800 border border-stone-700/50 hover:border-gold/50 rounded-lg overflow-hidden transition-all shadow-md hover:shadow-lg hover:shadow-gold/5 cursor-pointer relative"
        >
            <div className="w-full bg-obsidian-dark h-32 relative flex items-center justify-center overflow-hidden border-b border-stone-700/50">
                {character.portraitUrl ? (
                    <img src={character.portraitUrl} alt={character.name} className="w-full h-full object-cover scale-[1.1] opacity-80 group-hover:opacity-100 transition-all duration-500" />
                ) : (
                    <User size={64} className="text-stone-700 opacity-50 absolute" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900 to-transparent" />

                <div className="absolute top-3 left-3 flex gap-2">
                    {onUpdateClick && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdateClick(character.id);
                            }}
                            className="bg-stone-800/80 hover:bg-arcane border border-stone-600/50 hover:border-gold/50 text-stone-400 hover:text-white rounded-md p-1.5 transition-colors shadow-sm"
                            title="Update Character via PDF"
                        >
                            <FileUp size={16} />
                        </button>
                    )}
                </div>

                <div className="absolute top-3 right-3 bg-obsidian border border-gold/50 text-gold font-bold font-cinzel rounded-full w-10 h-10 flex items-center justify-center shadow-sm text-sm">
                    {character.level}
                </div>
            </div>

            <div className="p-5 w-full space-y-4">
                <div>
                    <h3 className="font-cinzel font-bold text-xl text-parchment group-hover:text-gold transition-colors line-clamp-2">
                        {character.name || 'Unnamed Hero'}
                    </h3>
                    <p className="text-sm text-parchment-muted flex items-center justify-between gap-1">
                        <span className="truncate">{character.race || 'Unknown Species'} {character.className || 'Adventurer'}</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <ProvenanceBadge
                            compact={true}
                            origin={character.provenance?.origin}
                            edition={character.provenance?.edition}
                        />
                        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-500 text-right">
                            {character.provenance?.sourceSummary || 'Manual Entry'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between items-center bg-obsidian-dark px-2 py-1.5 rounded border border-stone-700/50">
                        <span className="flex items-center gap-1.5 text-parchment-muted"><Heart size={14} className="text-blood" /> HP</span>
                        <span className="font-medium text-parchment">{character.currentHp}/{character.maxHp}</span>
                    </div>
                    <div className="flex justify-between items-center bg-obsidian-dark px-2 py-1.5 rounded border border-stone-700/50">
                        <span className="flex items-center gap-1.5 text-parchment-muted"><Shield size={14} className="text-stone-400" /> AC</span>
                        <span className="font-medium text-parchment">{getArmorClass(character)}</span>
                    </div>
                    <div className="col-span-2 flex justify-between items-center bg-obsidian-dark px-2 py-1.5 rounded border border-stone-700/50">
                        <span className="flex items-center gap-1.5 text-parchment-muted"><Zap size={14} className="text-gold-light" /> Init</span>
                        <span className="font-medium text-parchment">{getInitiative(character) >= 0 ? `+${getInitiative(character)}` : getInitiative(character)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
