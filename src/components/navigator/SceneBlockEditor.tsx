import { useState } from 'react';
import {
    Plus, Scroll, Lightbulb, MessageCircle, Wind,
    Swords, Gem, ShieldQuestion, ArrowRight, X, Check
} from 'lucide-react';
import { NarrationBlock, NarrationBlockType } from '../../types/campaignNavigator';
import { useNavigatorStore } from '../../store/navigatorStore';

interface Props {
    sceneId: string;
    afterBlockId?: string; // Insert after this block (undefined = at end of scene)
}

interface BlockTypeOption {
    type: NarrationBlockType;
    label: string;
    icon: React.ReactNode;
    color: string;
    border: string;
    placeholder: string;
    hasSpeaker?: boolean;
}

const BLOCK_TYPES: BlockTypeOption[] = [
    {
        type: 'read-aloud',
        label: 'Read Aloud',
        icon: <Scroll size={14} />,
        color: 'text-amber-400',
        border: 'border-amber-700/50 bg-amber-950/20',
        placeholder: 'Text to read verbatim to players...',
    },
    {
        type: 'dm-note',
        label: 'DM Note',
        icon: <Lightbulb size={14} />,
        color: 'text-purple-400',
        border: 'border-purple-700/50 bg-purple-950/20',
        placeholder: 'Behind-the-screen info, tips, or context...',
    },
    {
        type: 'dialog',
        label: 'Dialogue',
        icon: <MessageCircle size={14} />,
        color: 'text-teal-400',
        border: 'border-teal-700/50 bg-teal-950/20',
        placeholder: 'What the NPC says...',
        hasSpeaker: true,
    },
    {
        type: 'atmosphere',
        label: 'Atmosphere',
        icon: <Wind size={14} />,
        color: 'text-stone-400',
        border: 'border-stone-600/50 bg-stone-800/20',
        placeholder: 'Sensory details, mood, ambient sounds...',
    },
    {
        type: 'encounter-ref',
        label: 'Encounter',
        icon: <Swords size={14} />,
        color: 'text-red-400',
        border: 'border-red-700/50 bg-red-950/20',
        placeholder: 'Encounter trigger description...',
    },
    {
        type: 'loot-ref',
        label: 'Loot',
        icon: <Gem size={14} />,
        color: 'text-amber-400',
        border: 'border-amber-600/50 bg-amber-900/10',
        placeholder: 'Item name and description...',
    },
    {
        type: 'skill-check',
        label: 'Skill Check',
        icon: <ShieldQuestion size={14} />,
        color: 'text-blue-400',
        border: 'border-blue-700/50 bg-blue-950/20',
        placeholder: 'DC 12 Perception — ...',
    },
    {
        type: 'transition',
        label: 'Transition',
        icon: <ArrowRight size={14} />,
        color: 'text-stone-500',
        border: 'border-stone-700/30 bg-stone-900/10',
        placeholder: 'Short scene transition text...',
    },
];

export function SceneBlockEditor({ sceneId, afterBlockId }: Props) {
    const addNarrationBlock = useNavigatorStore(s => s.addNarrationBlock);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<BlockTypeOption | null>(null);
    const [text, setText] = useState('');
    const [speaker, setSpeaker] = useState('');
    const [emotion, setEmotion] = useState('');

    const handleSelectType = (opt: BlockTypeOption) => {
        setSelectedType(opt);
        setText('');
        setSpeaker('');
        setEmotion('');
    };

    const handleAdd = () => {
        if (!selectedType || !text.trim()) return;
        const block: NarrationBlock = {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: selectedType.type,
            text: text.trim(),
            ...(selectedType.hasSpeaker && speaker.trim() ? { speaker: speaker.trim() } : {}),
            ...(selectedType.hasSpeaker && emotion.trim() ? { emotion: emotion.trim() } : {}),
        };
        addNarrationBlock(sceneId, block, afterBlockId);
        setIsOpen(false);
        setSelectedType(null);
        setText('');
        setSpeaker('');
        setEmotion('');
    };

    const handleClose = () => {
        setIsOpen(false);
        setSelectedType(null);
        setText('');
        setSpeaker('');
        setEmotion('');
    };

    if (!isOpen) {
        return (
            <div className="group flex items-center gap-2 py-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200">
                <div className="flex-1 h-px bg-stone-700/20 group-hover:bg-stone-600/40 transition-colors" />
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                        bg-stone-900 border border-stone-700/40
                        text-stone-500 hover:text-amber-400 hover:border-amber-700/40
                        text-[10px] font-bold uppercase tracking-widest
                        transition-all duration-200 hover:shadow-[0_0_10px_rgba(217,119,6,0.1)]
                        whitespace-nowrap"
                >
                    <Plus size={10} />
                    Add Block
                </button>
                <div className="flex-1 h-px bg-stone-700/20 group-hover:bg-stone-600/40 transition-colors" />
            </div>
        );
    }

    return (
        <div className="my-3 rounded-lg border border-stone-700/40 bg-stone-900/80 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">Add Block</span>
                <button onClick={handleClose} className="text-stone-600 hover:text-stone-400 transition-colors">
                    <X size={14} />
                </button>
            </div>

            {/* Type Picker */}
            {!selectedType ? (
                <div className="grid grid-cols-4 gap-1.5">
                    {BLOCK_TYPES.map(opt => (
                        <button
                            key={opt.type}
                            onClick={() => handleSelectType(opt)}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-md border text-center
                                ${opt.border} hover:scale-105 transition-all duration-150 cursor-pointer`}
                        >
                            <span className={opt.color}>{opt.icon}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wide ${opt.color}`}>
                                {opt.label}
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="space-y-2 animate-in fade-in duration-200">
                    {/* Selected type pill + back */}
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={() => setSelectedType(null)}
                            className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors"
                        >
                            ← back
                        </button>
                        <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${selectedType.color}`}>
                            {selectedType.icon} {selectedType.label}
                        </span>
                    </div>

                    {/* Speaker/Emotion fields for dialog blocks */}
                    {selectedType.hasSpeaker && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={speaker}
                                onChange={e => setSpeaker(e.target.value)}
                                placeholder="Speaker name..."
                                className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1.5
                                    text-sm text-stone-200 placeholder:text-stone-600
                                    focus:border-teal-600/50 outline-none transition-colors"
                            />
                            <input
                                type="text"
                                value={emotion}
                                onChange={e => setEmotion(e.target.value)}
                                placeholder="Emotion/tone (optional)..."
                                className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1.5
                                    text-sm text-stone-400 placeholder:text-stone-600
                                    focus:border-teal-600/30 outline-none transition-colors"
                            />
                        </div>
                    )}

                    {/* Text area */}
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={selectedType.placeholder}
                        rows={selectedType.type === 'read-aloud' ? 5 : 3}
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd();
                            if (e.key === 'Escape') handleClose();
                        }}
                        className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-2
                            text-sm text-stone-200 placeholder:text-stone-600 leading-relaxed
                            focus:border-stone-500 outline-none transition-colors resize-none font-sans"
                    />

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-stone-600">Ctrl+Enter to save</span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleClose}
                                className="px-2.5 py-1 text-[10px] font-bold uppercase text-stone-500
                                    hover:text-stone-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!text.trim()}
                                className="flex items-center gap-1.5 px-3 py-1.5
                                    bg-amber-900/30 hover:bg-amber-800/50
                                    border border-amber-700/40 hover:border-amber-600/60
                                    text-amber-400 text-[10px] font-bold uppercase tracking-wide rounded
                                    transition-all disabled:opacity-40 disabled:cursor-not-allowed
                                    hover:shadow-[0_0_10px_rgba(217,119,6,0.12)]"
                            >
                                <Check size={11} />
                                Add Block
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
