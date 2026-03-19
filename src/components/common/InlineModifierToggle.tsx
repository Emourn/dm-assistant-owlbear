import { useState } from 'react';
import { Settings2, X } from 'lucide-react';

interface Props {
    field: string;
    modifiers: Record<string, number> | undefined;
    onChange: (newModifiers: Record<string, number>) => void;
    label?: string;
}

export function InlineModifierToggle({ field, modifiers, onChange, label }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const val = modifiers?.[field] || 0;
    const isModified = val !== 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = parseInt(e.target.value);
        const finalVal = isNaN(newVal) ? 0 : newVal;
        onChange({ ...modifiers, [field]: finalVal });
    };

    return (
        <div className="relative inline-flex items-center">
            <button
                onClick={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className={`p-1 rounded transition-colors ${isModified
                        ? 'text-gold hover:bg-gold/20'
                        : 'text-stone-600 hover:text-stone-400 hover:bg-stone-800'
                    }`}
                title={label ? `DM Modifier: ${label}` : 'DM Modifier'}
            >
                <Settings2 size={12} />
            </button>
            {isModified && !isOpen && (
                <span className="text-[9px] text-gold absolute -top-1.5 -right-1.5 font-bold pointer-events-none bg-stone-950 px-0.5 rounded border border-gold/30">
                    {val > 0 ? `+${val}` : val}
                </span>
            )}

            {isOpen && (
                <div className="absolute left-full ml-2 z-50 flex items-center bg-stone-900 border border-gold/30 rounded shadow-lg p-1 min-w-[120px]">
                    <span className="text-[10px] text-gold font-bold px-1 whitespace-nowrap hidden sm:inline">DM Mod:</span>
                    <input
                        type="number"
                        className="w-12 bg-stone-950 text-parchment text-xs text-center border-none focus:outline-none focus:ring-1 focus:ring-gold rounded px-1 py-0.5 ml-1"
                        value={val || 0}
                        onChange={handleChange}
                        autoFocus
                    />
                    <button
                        onClick={(e) => { e.preventDefault(); setIsOpen(false); }}
                        className="text-stone-500 hover:text-red-400 ml-1 p-0.5"
                        title="Close"
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}
