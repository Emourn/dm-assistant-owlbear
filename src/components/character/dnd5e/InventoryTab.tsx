import { Character, Item } from '../../../types/character';
import { decomposePack } from '../../../engine/fiveEToolsParser';
import { Coins, Package, Plus, Trash2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { FiveEToolsModal } from '../../common/FiveEToolsModal';

interface Props {
    data: Character;
    onChange: (field: keyof Character, value: any) => void;
}

export function InventoryTab({ data, onChange }: Props) {
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const handleCurrencyChange = (coin: keyof Character['currencies'], val: number) => {
        onChange('currencies', { ...data.currencies, [coin]: val });
    };

    const addItem = () => {
        const newItem: Item = {
            id: crypto.randomUUID(),
            name: 'New Item',
            quantity: 1,
            weight: 0,
            isEquipped: false,
            isAttuned: false,
            description: '',
            type: 'gear'
        };
        onChange('inventory', [...data.inventory, newItem]);
    };

    const updateItem = (id: string, updates: Partial<Item>) => {
        onChange(
            'inventory',
            data.inventory.map(item => item.id === id ? { ...item, ...updates } : item)
        );
    };

    const removeItem = (id: string) => {
        onChange(
            'inventory',
            data.inventory.filter(item => item.id !== id)
        );
    };

    const totalWeight = data.inventory.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalGoldValue = data.currencies.cp / 100 + data.currencies.sp / 10 + data.currencies.ep / 2 + data.currencies.gp + data.currencies.pp * 10;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">

            {/* Wealth & Encumbrance (Left) */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-stone-900/40 border border-stone-800/80 shadow-inner rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-stone-700/50 pb-2 mb-2">
                        <Coins size={18} className="text-gold" />
                        <h3 className="font-cinzel text-gold text-lg">Wealth</h3>
                    </div>

                    <div className="space-y-1">
                        {[
                            { key: 'cp', label: 'Copper (CP)', color: 'text-orange-700' },
                            { key: 'sp', label: 'Silver (SP)', color: 'text-stone-400' },
                            { key: 'ep', label: 'Electrum (EP)', color: 'text-blue-400' },
                            { key: 'gp', label: 'Gold (GP)', color: 'text-gold' },
                            { key: 'pp', label: 'Platinum (PP)', color: 'text-purple-400' }
                        ].map((coin) => (
                            <div key={coin.key} className="flex justify-between items-center bg-transparent border-b border-stone-800/50 py-1.5 px-1 hover:bg-stone-900/50 transition-colors focus-within:bg-stone-900/50">
                                <span className={`text-[10px] uppercase font-bold tracking-widest ${coin.color}`}>{coin.label}</span>
                                <input
                                    type="number" min="0"
                                    value={data.currencies[coin.key as keyof Character['currencies']]}
                                    onChange={e => handleCurrencyChange(coin.key as keyof Character['currencies'], parseInt(e.target.value) || 0)}
                                    className="w-20 bg-transparent text-right text-parchment font-bold outline-none border-b border-stone-700/50 hover:border-gold/50 focus:border-gold transition-colors py-0.5"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 text-center text-[10px] uppercase tracking-widest text-stone-500 font-bold border-t border-stone-800/60 mt-4">
                        Total Value: <span className="text-gold">{totalGoldValue.toFixed(2)} gp</span>
                    </div>
                </div>

                <div className="bg-stone-900/40 border border-stone-800/80 shadow-inner rounded-xl p-5 space-y-3">
                    <div className="flex items-center flex-col gap-1 border-b border-stone-700/50 pb-2 mb-2 text-center">
                        <Package size={16} className="text-stone-500 mb-1" />
                        <h3 className="font-cinzel text-stone-400 text-sm uppercase tracking-widest font-bold">Encumbrance</h3>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-bold uppercase tracking-widest text-[9px]">Total Wt:</span>
                        <span className="text-parchment font-bold">{totalWeight.toFixed(1)} <span className="text-[9px] text-stone-500">lbs</span></span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500 font-bold uppercase tracking-widest text-[9px]">Capacity:</span>
                        <span className="text-parchment font-bold">{data.abilityScores.str * 15} <span className="text-[9px] text-stone-500">lbs</span></span>
                    </div>
                    <div className="w-full bg-stone-950/80 rounded-full h-1.5 mt-2 overflow-hidden border border-stone-800">
                        <div
                            className={`h-full transition-all duration-500 ${totalWeight > data.abilityScores.str * 15 ? 'bg-blood' : 'bg-gold-light shadow-[0_0_10px_rgba(212,175,55,0.4)]'}`}
                            style={{ width: `${Math.min(100, (totalWeight / (data.abilityScores.str * 15)) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Backpack / Items (Right) */}
            <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-700/50 pb-2">
                    <h3 className="font-cinzel text-gold text-xl drop-shadow-sm flex items-center gap-2">
                        <Package size={18} className="text-stone-500" />
                        Equipment & Backpack
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center justify-center w-7 h-7 bg-stone-800/80 text-arcane-light rounded-md border border-stone-700 hover:border-arcane/50 hover:bg-stone-800 transition-colors shadow-sm" title="Search 5e.tools"
                        >
                            <Search size={14} />
                        </button>
                        <button
                            onClick={addItem}
                            className="flex items-center justify-center w-7 h-7 bg-stone-800/80 text-parchment rounded-md border border-stone-700 hover:border-gold/50 hover:bg-stone-800 transition-colors shadow-sm" title="Add Custom Item"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                <div className="space-y-1 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.inventory.length === 0 ? (
                        <div className="text-center py-12 opacity-40">
                            <Package size={48} className="mx-auto text-stone-600 mb-4" />
                            <p className="text-sm font-cinzel text-stone-500 uppercase tracking-widest">Your backpack is empty</p>
                        </div>
                    ) : (
                        data.inventory.map(item => (
                            <div key={item.id} className="bg-transparent border-b border-stone-800/40 relative group focus-within:bg-stone-900/40 hover:bg-stone-900/40 transition-colors py-2 pl-2 pr-1 flex flex-col">
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-0.5 flex-shrink-0 w-8">
                                        <button
                                            onClick={() => updateItem(item.id, { isEquipped: !item.isEquipped })}
                                            className={`text-[8px] font-bold px-1 py-0.5 rounded-[3px] transition-colors outline-none ${item.isEquipped ? 'bg-gold/20 text-gold border border-gold/40 shadow-[0_0_5px_rgba(217,119,6,0.3)]' : 'bg-transparent text-stone-600 border border-stone-800 hover:border-stone-500 hover:text-stone-400'}`}
                                            title={item.isEquipped ? 'Equipped' : 'Not Equipped'}
                                        >
                                            EQP
                                        </button>
                                        <button
                                            onClick={() => updateItem(item.id, { isAttuned: !item.isAttuned })}
                                            className={`text-[8px] font-bold px-1 py-0.5 rounded-[3px] transition-colors outline-none ${item.isAttuned ? 'bg-arcane-light/20 text-arcane-light border border-arcane-light/40 shadow-[0_0_5px_rgba(96,165,250,0.3)]' : 'bg-transparent text-stone-600 border border-stone-800 hover:border-stone-500 hover:text-stone-400'}`}
                                            title={item.isAttuned ? 'Attuned' : 'Unattuned'}
                                        >
                                            ATT
                                        </button>
                                    </div>

                                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 overflow-hidden">
                                        <div className="flex items-center gap-2 flex-1 w-full min-w-0">
                                            <input
                                                type="text" value={item.name}
                                                onChange={e => updateItem(item.id, { name: e.target.value })}
                                                className="w-full bg-transparent text-sm text-parchment font-bold focus:text-gold border-none outline-none truncate transition-colors"
                                                placeholder="Item Name"
                                            />
                                            {item.is2024 && (
                                                <span className="text-[8px] bg-gold/20 text-gold-light px-1 py-0.5 rounded border border-gold/40 flex items-center gap-0.5 flex-shrink-0">
                                                    <Sparkles size={8} /> 2024
                                                </span>
                                            )}
                                            {item.isHomebrew && (
                                                <span className="text-[8px] bg-teal-900/30 text-teal-400 px-1 py-0.5 rounded border border-teal-800 flex-shrink-0" title={`Source: ${item.homebrewSource}`}>
                                                    HB
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end gap-3 flex-shrink-0 opacity-80 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                            <select
                                                value={item.type}
                                                onChange={e => updateItem(item.id, { type: e.target.value as any })}
                                                className="bg-stone-950/50 text-[10px] uppercase font-bold tracking-wider text-stone-400 border border-stone-800 rounded px-1.5 py-1 outline-none cursor-pointer hover:border-stone-600 transition-colors w-24 focus:border-gold"
                                            >
                                                <option value="weapon">Weapon</option>
                                                <option value="armor">Armor</option>
                                                <option value="potion">Potion</option>
                                                <option value="scroll">Scroll</option>
                                                <option value="magic">Magic Item</option>
                                                <option value="gear">Gear</option>
                                                <option value="other">Other</option>
                                            </select>

                                            <div className="flex flex-col items-center justify-center w-8">
                                                <span className="text-[8px] text-stone-600 uppercase tracking-widest font-bold">Qty</span>
                                                <input
                                                    type="number" min="0" value={item.quantity}
                                                    onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-transparent text-center text-xs font-bold text-parchment outline-none hover:text-stone-300 border-b border-stone-700 focus:border-gold transition-colors"
                                                />
                                            </div>

                                            <div className="flex flex-col items-center justify-center w-8">
                                                <span className="text-[8px] text-stone-600 uppercase tracking-widest font-bold">Lbs</span>
                                                <input
                                                    type="number" min="0" step="0.5" value={item.weight}
                                                    onChange={e => updateItem(item.id, { weight: parseFloat(e.target.value) || 0 })}
                                                    className="w-full bg-transparent text-center text-[10px] text-stone-400 outline-none hover:text-stone-300 border-b border-stone-700/50 focus:border-stone-500 transition-colors"
                                                />
                                            </div>

                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-1.5 text-stone-600 hover:text-blood hover:bg-stone-800 rounded-md transition-all opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1"
                                                title="Remove Item"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <input
                                    type="text" value={item.description}
                                    onChange={e => updateItem(item.id, { description: e.target.value })}
                                    className="w-full bg-transparent text-[11px] text-stone-500 hover:text-stone-400 focus:text-stone-300 outline-none transition-colors mt-0.5 pl-11 py-1"
                                    placeholder="Notes, damage (e.g. 1d8 slashing), qualities..."
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>

            <FiveEToolsModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                initialCategory="Items"
                fixedCategory={true}
                onImport={async (item, cat) => {
                    if (cat === 'Items') {
                        // Check if it's a pack (heuristic: name ends with 'Pack')
                        if (item.name.toLowerCase().endsWith("'s pack") || item.name.toLowerCase().endsWith(" pack")) {
                            const components = await decomposePack(item.name);
                            if (components.length > 0) {
                                onChange('inventory', [...data.inventory, ...components]);
                                return;
                            }
                        }
                        onChange('inventory', [...data.inventory, { ...item, id: crypto.randomUUID() }]);
                    }
                }}
            />
        </div>
    );
}
