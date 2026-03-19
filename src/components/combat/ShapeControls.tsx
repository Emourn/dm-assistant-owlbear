import React from 'react';
import { MousePointer2, Square, Circle, Minus, Pencil, Trash2, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

export type DrawingMode = 'select' | 'rectangle' | 'circle' | 'line' | 'freehand' | 'eraser' | 'fow-hide' | 'fow-reveal' | 'calibrate' | 'zone-rect' | 'zone-circle';

interface ShapeControlsProps {
    currentMode: DrawingMode;
    onModeChange: (mode: DrawingMode) => void;
    onClearAll: () => void;
    onUndo?: () => void;
    canUndo?: boolean;
    className?: string;
}

export const ShapeControls: React.FC<ShapeControlsProps> = ({
    currentMode,
    onModeChange,
    onClearAll,
    onUndo,
    canUndo = false,
    className = ""
}) => {
    const [showClearConfirm, setShowClearConfirm] = React.useState(false);

    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select', kbd: '1' },
        { id: 'rectangle', icon: Square, label: 'Rectangle', kbd: '2' },
        { id: 'circle', icon: Circle, label: 'Circle', kbd: '3' },
        { id: 'line', icon: Minus, label: 'Line', kbd: '4' },
        { id: 'freehand', icon: Pencil, label: 'Freehand', kbd: '5' },
        { id: 'fow-hide', icon: EyeOff, label: 'Hide Area', kbd: 'G' },
        { id: 'fow-reveal', icon: Eye, label: 'Reveal Area', kbd: 'F' },
        { id: 'eraser', icon: Trash2, label: 'Eraser', kbd: 'E' },
        { id: 'calibrate', icon: RotateCcw, label: 'Calibrate', kbd: 'C' }
    ] as const;

    return (
        <div className={`flex flex-col gap-2 bg-stone-900/40 backdrop-blur-xl p-2 rounded-2xl border border-white/5 shadow-2xl ${className}`}>
            <div className="px-3 py-2 border-b border-white/5 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-500">Drawing Tools</span>
            </div>
            {tools.map(tool => (
                <button
                    key={tool.id}
                    onClick={() => onModeChange(tool.id as DrawingMode)}
                    className={`p-3 rounded-xl transition-all flex items-center gap-3 group relative border border-transparent ${currentMode === tool.id
                        ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] border-blue-400/30'
                        : 'text-stone-500 hover:bg-white/5 hover:text-stone-300 hover:border-white/10'
                        }`}
                    title={`${tool.label} (${tool.kbd})`}
                >
                    <tool.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${currentMode === tool.id ? 'animate-pulse' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block whitespace-nowrap">{tool.label}</span>
                    <span className="hidden lg:block ml-auto text-[8px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-white/40 group-hover:text-white/60 group-hover:bg-white/20 transition-all uppercase tracking-tighter">
                        {tool.kbd}
                    </span>

                    {currentMode === tool.id && (
                        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white] animate-pulse lg:hidden" />
                    )}
                </button>
            ))}

            <div className="h-px bg-white/5 my-2 mx-2" />

            {/* Undo Button */}
            <button
                onClick={onUndo}
                disabled={!canUndo}
                className={`p-3 rounded-xl transition-all flex items-center gap-3 group border border-transparent ${canUndo
                    ? 'text-stone-300 hover:bg-white/5 hover:text-white'
                    : 'text-stone-700 cursor-not-allowed opacity-50'
                    }`}
                title="Undo (Ctrl+Z)"
            >
                <RotateCcw className={`w-4 h-4 ${canUndo ? 'group-active:rotate-[-45deg] transition-transform' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block whitespace-nowrap">Undo</span>
            </button>

            <button
                onClick={() => setShowClearConfirm(true)}
                className="p-3 rounded-xl text-red-500/60 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center gap-3 group border border-transparent hover:border-red-500/20"
                title="Clear All"
            >
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest pr-2 hidden lg:block whitespace-nowrap">Clear All</span>
            </button>

            <ConfirmationModal
                isOpen={showClearConfirm}
                title="Purge Map?"
                message="Are you sure you want to purge all drawings and fog of war from this map? This cannot be undone."
                confirmText="Clear All"
                isDangerous={true}
                onConfirm={() => {
                    onClearAll();
                    setShowClearConfirm(false);
                }}
                onCancel={() => setShowClearConfirm(false)}
            />
        </div>
    );
};
