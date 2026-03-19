import { NarrativeChoice } from '../../types/campaignNavigator';
import { DoorOpen, Swords, MessageCircle, Search, ArrowUpRight, GitBranch, Lock, Tent } from 'lucide-react';

interface Props {
    choice: NarrativeChoice;
    index: number;
    onChoose: (choice: NarrativeChoice) => void;
}

const CHOICE_ICONS: Record<NonNullable<NarrativeChoice['icon']>, typeof DoorOpen> = {
    'door': DoorOpen,
    'combat': Swords,
    'dialog': MessageCircle,
    'search': Search,
    'stairs': ArrowUpRight,
    'path': GitBranch,
    'secret': Lock,
    'rest': Tent,
};

export function ChoiceCard({ choice, index, onChoose }: Props) {
    const Icon = choice.icon ? CHOICE_ICONS[choice.icon] : GitBranch;
    const delay = index * 150; // Stagger animation

    return (
        <button
            type="button"
            onClick={() => onChoose(choice)}
            className="group w-full text-left"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className={`
                relative p-5 rounded-lg
                bg-gradient-to-br from-stone-800/60 to-stone-900/80
                border border-stone-700/40
                hover:border-amber-600/50
                hover:bg-gradient-to-br hover:from-stone-800/80 hover:to-amber-950/30
                transition-all duration-300 ease-out
                hover:shadow-[0_0_25px_rgba(217,119,6,0.1)]
                hover:scale-[1.02]
                active:scale-[0.98]
                cursor-pointer
                animate-[fadeSlideUp_0.5s_ease-out_both]
            `}>
                {/* Choice number badge */}
                <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-stone-800 border border-amber-700/50 flex items-center justify-center text-amber-500 text-xs font-cinzel font-bold shadow-lg group-hover:bg-amber-900/60 group-hover:border-amber-500/70 transition-colors">
                    {index + 1}
                </div>

                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="p-2.5 rounded-md bg-stone-900/60 border border-stone-700/30 group-hover:border-amber-700/40 group-hover:bg-amber-950/30 transition-colors shrink-0 mt-0.5">
                        <Icon size={18} className="text-stone-400 group-hover:text-amber-400 transition-colors" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Choice text */}
                        <p className="text-stone-200 font-medium leading-snug group-hover:text-amber-100 transition-colors">
                            {choice.text}
                        </p>

                        {/* Condition */}
                        {choice.condition && (
                            <p className="text-blue-400/60 text-xs mt-2 flex items-center gap-1.5">
                                <Lock size={10} />
                                {choice.condition}
                            </p>
                        )}

                        {/* Consequence hint */}
                        {choice.consequence && (
                            <p className="text-stone-500 text-xs mt-1.5 italic">
                                → {choice.consequence}
                            </p>
                        )}
                    </div>

                    {/* Arrow indicator */}
                    <div className="text-stone-600 group-hover:text-amber-500 transition-all group-hover:translate-x-1 mt-1">
                        <ArrowUpRight size={16} />
                    </div>
                </div>

                {/* Source reference */}
                {choice.sourceRef && (
                    <div className="mt-3 pt-2 border-t border-stone-700/20">
                        <p className="text-stone-600 text-[10px] tracking-wide">
                            📖 {choice.sourceRef}
                        </p>
                    </div>
                )}
            </div>
        </button>
    );
}
