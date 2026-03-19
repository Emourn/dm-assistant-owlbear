import { Character, Feature, Resource } from '../../../types/character';
import { Sparkles, Plus, Trash2, Battery, Search, Dna, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { FiveEToolsModal } from '../../common/FiveEToolsModal';
import { InfoTooltip } from '../../common/InfoTooltip';
import { RulesTooltip } from '../../common/RulesTooltip';
import { extractActionsFromFeature, extractItemsFromFeature } from '../../../engine/fiveEToolsParser';

interface Props {
    data: Character;
    onChange: (field: keyof Character, value: any) => void;
    onTriggerChoice?: (featureId: string) => void;
    onTriggerReplace?: (featureId: string, slotName: string) => void;
}

export function FeaturesTab({ data, onChange, onTriggerChoice, onTriggerReplace }: Props) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const addFeature = () => {
        const newFeature: Feature = {
            id: crypto.randomUUID(),
            name: 'New Feature',
            source: 'Class',
            description: '',
            hasUses: false,
        };
        onChange('features', [...data.features, newFeature]);
    };

    const addRacialTrait = () => {
        const newTrait: Feature = {
            id: crypto.randomUUID(),
            name: 'New Racial Trait',
            source: `Race: ${data.race || 'Unknown'}`,
            description: '',
            hasUses: false,
        };
        onChange('racialTraits', [...(data.racialTraits || []), newTrait]);
    };

    const updateFeature = (id: string, updates: Partial<Feature>) => {
        onChange('features', data.features.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeFeature = (id: string) => {
        onChange('features', data.features.filter(f => f.id !== id));
    };

    const updateRacialTrait = (id: string, updates: Partial<Feature>) => {
        onChange('racialTraits', (data.racialTraits || []).map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeRacialTrait = (id: string) => {
        onChange('racialTraits', (data.racialTraits || []).filter(f => f.id !== id));
    };

    const updateFeat = (id: string, updates: Partial<Feature>) => {
        onChange('feats', (data.feats || []).map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeFeat = (id: string) => {
        onChange('feats', (data.feats || []).filter(f => f.id !== id));
    };

    const addResource = () => {
        const newRes: Resource = {
            id: crypto.randomUUID(),
            name: 'New Resource',
            current: 1,
            max: 1,
            resetOn: 'long'
        };
        onChange('resources', [...data.resources, newRes]);
    };

    const updateResource = (id: string, updates: Partial<Resource>) => {
        onChange('resources', data.resources.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const removeResource = (id: string) => {
        onChange('resources', data.resources.filter(r => r.id !== id));
    };

    const racialTraits = data.racialTraits || [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">

            {/* Resources Tracker (Left) */}
            <div className="lg:col-span-1 space-y-6">
                {/* Resources */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-700 pb-2">
                        <div className="flex items-center gap-2">
                            <Battery size={18} className="text-blue-400" />
                            <h3 className="font-cinzel text-blue-400 text-lg">Resources</h3>
                        </div>
                        <button
                            onClick={addResource}
                            className="flex items-center gap-1 text-xs bg-stone-800 hover:bg-stone-700 text-parchment px-2 py-1 rounded border border-stone-600 transition-colors"
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>

                    <p className="text-xs text-stone-500 mb-2">Track Ki points, Sorcery Points, Rages, Bardic Inspiration, etc.</p>

                    <div className="space-y-3">
                        {data.resources.length === 0 ? (
                            <div className="text-center py-6 opacity-50 bg-stone-800/30 rounded-lg border border-stone-700 border-dashed">
                                <span className="text-sm text-stone-400">No resources tracked.</span>
                            </div>
                        ) : (
                            data.resources.map(res => (
                                <div key={res.id} className="bg-transparent border-b border-stone-800/40 py-2 pl-2 pr-1 relative group hover:bg-stone-900/40 focus-within:bg-stone-900/40 transition-colors">
                                    <input
                                        type="text" value={res.name}
                                        onChange={e => updateResource(res.id, { name: e.target.value })}
                                        className="w-[calc(100%-24px)] bg-transparent font-bold text-parchment text-sm border-none focus:text-blue-400 outline-none mb-1 truncate transition-colors"
                                        placeholder="Resource Name"
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
                                        <div className="flex items-center gap-1.5 bg-stone-950/50 border border-stone-800/50 rounded px-1.5 py-0.5">
                                            <input
                                                type="number" min="0" value={res.current}
                                                onChange={e => updateResource(res.id, { current: parseInt(e.target.value) || 0 })}
                                                className="w-10 bg-transparent text-blue-400 text-center font-bold text-sm outline-none"
                                            />
                                            <span className="text-stone-600 text-[10px] font-bold">/</span>
                                            <input
                                                type="number" min="1" value={res.max}
                                                onChange={e => updateResource(res.id, { max: parseInt(e.target.value) || 1 })}
                                                className="w-10 bg-transparent text-stone-400 focus:text-parchment text-center font-bold text-xs outline-none transition-colors"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-stone-500 uppercase tracking-widest font-bold">
                                            <span>Resets:</span>
                                            <select
                                                value={res.resetOn}
                                                onChange={e => updateResource(res.id, { resetOn: e.target.value as any })}
                                                className="bg-transparent border-none text-stone-400 outline-none cursor-pointer hover:text-stone-300 transition-colors"
                                            >
                                                <option value="short">Short</option>
                                                <option value="long">Long</option>
                                                <option value="never">Manual</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeResource(res.id)}
                                        className="absolute top-2 right-1 p-1 text-stone-600 hover:text-blood opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Origin & Identity — Racial Traits */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-green-800/50 pb-2">
                        <div className="flex items-center gap-2">
                            <Dna size={18} className="text-green-400" />
                            <RulesTooltip term="Race">
                                <h3 className="font-cinzel text-green-400 text-lg cursor-help">Racial Traits</h3>
                            </RulesTooltip>
                        </div>
                        <button
                            onClick={addRacialTrait}
                            className="flex items-center gap-1 text-xs bg-stone-800 hover:bg-stone-700 text-parchment px-2 py-1 rounded border border-stone-600 transition-colors"
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>

                    <p className="text-xs text-stone-500 mb-2">
                        {data.race ? `Traits from ${data.race}` : 'Species/race traits'} — auto-imported on PDF upload.
                    </p>

                    <div className="space-y-3">
                        {racialTraits.length === 0 ? (
                            <div className="text-center py-6 opacity-50 bg-stone-800/30 rounded-lg border border-green-900/30 border-dashed">
                                <Dna size={24} className="mx-auto text-stone-500 mb-1" />
                                <span className="text-sm text-stone-400">No racial traits. Import a PDF or add manually.</span>
                            </div>
                        ) : (
                            racialTraits.map(trait => (
                                <div key={trait.id} className="bg-transparent border-b border-green-900/20 py-2 pl-2 pr-1 relative group hover:bg-stone-900/40 focus-within:bg-stone-900/40 transition-colors">
                                    <div className="flex gap-2 mb-1 pr-6 items-center">
                                        <RulesTooltip term={trait.name}>
                                            <input
                                                type="text" value={trait.name}
                                                onChange={e => updateRacialTrait(trait.id, { name: e.target.value })}
                                                className="w-full bg-transparent text-parchment font-bold text-sm focus:text-green-400 border-none outline-none transition-colors truncate"
                                                placeholder="Trait Name"
                                            />
                                        </RulesTooltip>
                                        {trait.is2024 && (
                                            <span className="flex items-center gap-0.5 text-[9px] font-bold bg-gold/10 text-gold px-1 py-0.5 rounded border border-gold/20 shadow-[0_0_5px_rgba(217,119,6,0.2)]">
                                                <Sparkles size={8} className="animate-pulse" /> 2024
                                            </span>
                                        )}
                                    </div>
                                    <textarea
                                        value={trait.description}
                                        onChange={e => updateRacialTrait(trait.id, { description: e.target.value })}
                                        className="w-full h-12 bg-transparent text-[11px] text-stone-400 resize-none hover:text-stone-300 focus:text-parchment outline-none transition-colors"
                                        placeholder="Trait description..."
                                    />
                                    <button
                                        onClick={() => removeRacialTrait(trait.id)}
                                        className="absolute top-2 right-1 p-1 text-stone-600 hover:text-blood opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Features & Traits (Right) */}
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-700 pb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-gold" />
                        <h3 className="font-cinzel text-gold text-lg">Features & Traits</h3>
                        <InfoTooltip query="Feature" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center gap-1 text-sm bg-arcane/20 hover:bg-arcane/30 text-arcane-light px-3 py-1.5 rounded border border-arcane/30 transition-colors"
                        >
                            <Search size={16} /> Search 5e.tools
                        </button>
                        <button
                            onClick={addFeature}
                            className="flex items-center gap-1 text-sm bg-stone-800 hover:bg-stone-700 text-parchment px-3 py-1.5 rounded border border-stone-600 transition-colors"
                        >
                            <Plus size={16} /> Add Feature
                        </button>
                    </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.features.length === 0 && (!data.feats || data.feats.length === 0) ? (
                        <div className="text-center py-10 opacity-50 border border-stone-700 border-dashed rounded-lg bg-stone-800/30">
                            <Sparkles size={32} className="mx-auto text-stone-400 mb-2" />
                            <p className="text-sm text-stone-400">No class features or feats added.</p>
                        </div>
                    ) : (
                        <>
                            {/* Feats (gold border) */}
                            {(data.feats || []).map(feat => (
                                <div key={feat.id} className="bg-transparent border-b border-gold/20 py-2 pl-2 pr-1 relative group hover:bg-stone-900/40 focus-within:bg-stone-900/40 transition-colors">
                                    <div className="flex gap-2 pr-6 items-center">
                                        <RulesTooltip term={feat.name}>
                                            <input
                                                type="text" value={feat.name}
                                                onChange={e => updateFeat(feat.id, { name: e.target.value })}
                                                className="w-1/2 bg-transparent border-none text-parchment font-bold text-sm focus:text-gold outline-none transition-colors truncate"
                                                placeholder="Feat Name"
                                            />
                                        </RulesTooltip>
                                        {feat.is2024 && (
                                            <span className="flex items-center gap-0.5 text-[9px] font-bold bg-gold/10 text-gold px-1 py-0.5 rounded border border-gold/20 shadow-[0_0_5px_rgba(217,119,6,0.2)]">
                                                <Sparkles size={8} className="animate-pulse" /> 2024
                                            </span>
                                        )}
                                        <div className="w-1/2 flex items-center gap-2 justify-end">
                                            {feat.isHomebrew && (
                                                <span className="text-[8px] bg-teal-900/30 text-teal-400 px-1 py-0.5 rounded border border-teal-800 flex-shrink-0" title={`Source: ${feat.homebrewSource}`}>
                                                    HB
                                                </span>
                                            )}
                                            <span className="text-gold text-[10px] font-bold uppercase tracking-widest truncate">{feat.source}</span>
                                        </div>
                                    </div>

                                    {feat.abilityScoreBonuses && (
                                        <div className="flex flex-wrap gap-1 mt-1 mb-1">
                                            {Object.entries(feat.abilityScoreBonuses).map(([stat, bonus]) => (
                                                <span key={stat} className="bg-gold/10 border border-gold/20 text-gold text-[9px] px-1 py-0.5 rounded-sm font-bold uppercase tracking-widest">
                                                    +{bonus} {stat}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <textarea
                                        value={feat.description}
                                        onChange={e => updateFeat(feat.id, { description: e.target.value })}
                                        className="w-full h-12 bg-transparent text-[11px] text-stone-400 resize-none hover:text-stone-300 focus:text-parchment outline-none transition-colors mt-1"
                                        placeholder="Feat description..."
                                    />

                                    <button
                                        onClick={() => removeFeat(feat.id)}
                                        className="absolute top-2 right-1 p-1 text-stone-600 hover:text-blood opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            {/* Class Features */}
                            {data.features.map(feat => (
                                <div key={feat.id} className="bg-transparent border-b border-stone-800/40 py-2 pl-2 pr-1 relative group hover:bg-stone-900/40 focus-within:bg-stone-900/40 transition-colors">
                                    <div className="flex gap-2 pr-6 items-center">
                                        <div className="w-1/2 flex items-center gap-2">
                                            <RulesTooltip term={feat.name}>
                                                <input
                                                    type="text" value={feat.name}
                                                    onChange={e => updateFeature(feat.id, { name: e.target.value })}
                                                    className="w-full bg-transparent border-none text-parchment font-bold text-sm focus:text-gold outline-none transition-colors truncate"
                                                    placeholder="Feature Name"
                                                />
                                            </RulesTooltip>
                                            {feat.is2024 && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-bold bg-gold/10 text-gold px-1 py-0.5 rounded border border-gold/20 shadow-[0_0_5px_rgba(217,119,6,0.2)]">
                                                    <Sparkles size={8} className="animate-pulse" /> 2024
                                                </span>
                                            )}
                                            {feat.requiresChoice && onTriggerChoice && (
                                                <button
                                                    onClick={() => onTriggerChoice(feat.id)}
                                                    className="px-2 py-0.5 bg-arcane hover:bg-arcane-light text-white text-[10px] font-bold rounded shadow-[0_0_8px_rgba(147,51,234,0.4)] transition-colors whitespace-nowrap animate-pulse"
                                                >
                                                    CHOOSE OPTION
                                                </button>
                                            )}
                                            {!feat.requiresChoice && feat.source && data.features.some(f => f.name === feat.source && f.choiceType) && onTriggerReplace && (
                                                <button
                                                    onClick={() => onTriggerReplace(feat.id, feat.source)}
                                                    className="px-2 py-0.5 bg-stone-700 hover:bg-stone-600 text-stone-300 text-[10px] font-bold rounded border border-stone-600 transition-colors flex items-center gap-1 shrink-0"
                                                >
                                                    <RotateCcw size={10} /> REPLACE
                                                </button>
                                            )}
                                            {feat.isHomebrew && (
                                                <span className="text-[8px] bg-teal-900/30 text-teal-400 px-1 py-0.5 rounded border border-teal-800 flex-shrink-0" title={`Source: ${feat.homebrewSource}`}>
                                                    HB
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text" value={feat.source}
                                            onChange={e => updateFeature(feat.id, { source: e.target.value })}
                                            className="w-1/2 bg-transparent border-none text-stone-500 text-[10px] uppercase font-bold tracking-widest text-right focus:text-stone-300 outline-none transition-colors truncate"
                                            placeholder="Source (e.g. Fighter 2, Feat)"
                                        />
                                    </div>

                                    <div className="mt-1 flex items-center gap-2">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest flex items-center gap-1.5 cursor-pointer hover:text-stone-300 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={feat.hasUses}
                                                onChange={e => updateFeature(feat.id, { hasUses: e.target.checked })}
                                                className="rounded-sm border-stone-700 text-gold focus:ring-gold bg-stone-900 w-3 h-3 appearance-none checked:bg-gold checked:border-transparent transition-colors"
                                                style={{ backgroundImage: feat.hasUses ? `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='black' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")` : 'none' }}
                                            />
                                            Has Uses
                                        </label>

                                        {feat.hasUses && (
                                            <div className="flex items-center gap-1.5 ml-2 bg-stone-950/50 border border-stone-800/50 rounded px-1.5 py-0.5">
                                                <input
                                                    type="number" min="0" value={feat.usesCurrent || 0}
                                                    onChange={e => updateFeature(feat.id, { usesCurrent: parseInt(e.target.value) || 0 })}
                                                    className="w-8 bg-transparent text-center text-sm font-bold text-gold outline-none"
                                                    placeholder="0"
                                                />
                                                <span className="text-stone-600 text-[10px] font-bold">/</span>
                                                <input
                                                    type="number" min="1" value={feat.usesMax || 1}
                                                    onChange={e => updateFeature(feat.id, { usesMax: parseInt(e.target.value) || 1 })}
                                                    className="w-8 bg-transparent text-center text-xs font-bold text-stone-400 focus:text-parchment outline-none transition-colors"
                                                    placeholder="1"
                                                />
                                                <div className="h-3 w-px bg-stone-800 mx-1" />
                                                <select
                                                    value={feat.resetOn || 'short'}
                                                    onChange={e => updateFeature(feat.id, { resetOn: e.target.value as any })}
                                                    className="text-[9px] uppercase font-bold tracking-widest bg-transparent text-stone-500 hover:text-stone-300 outline-none border-none cursor-pointer transition-colors"
                                                >
                                                    <option value="short">Short</option>
                                                    <option value="long">Long</option>
                                                    <option value="never">Manual</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <textarea
                                        value={feat.description}
                                        onChange={e => updateFeature(feat.id, { description: e.target.value })}
                                        className="w-full h-12 bg-transparent text-[11px] text-stone-400 resize-none hover:text-stone-300 focus:text-parchment outline-none transition-colors mt-1"
                                        placeholder="Describe how the feature works..."
                                    />

                                    <button
                                        onClick={() => removeFeature(feat.id)}
                                        className="absolute top-2 right-1 p-1 text-stone-600 hover:text-blood opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            <FiveEToolsModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                initialCategory="Feats"
                fixedCategory={true}
                onImport={(item, cat) => {
                    if (cat === 'Feats') {
                        onChange('feats', [...(data.feats || []), item]);

                        const action = extractActionsFromFeature(item);
                        if (action) {
                            onChange('actions', [...(data.actions || []), action]);
                        }
                        const items = extractItemsFromFeature(item);
                        if (items.length > 0) {
                            onChange('inventory', [...(data.inventory || []), ...items]);
                        }
                    }
                }}
            />
        </div>
    );
}
