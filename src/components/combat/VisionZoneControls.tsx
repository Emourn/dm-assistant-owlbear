import React from 'react';
import { Square, Circle, Trash2 } from 'lucide-react';
import { DrawingMode } from './ShapeControls';
import { LightLevel, WeatherEffect } from '../../types/battleMap';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface VisionZoneControlsProps {
    currentMode: DrawingMode;
    onModeChange: (mode: DrawingMode) => void;
    activeLightLevel: LightLevel;
    onLightLevelChange: (level: LightLevel) => void;
    activeWeather: WeatherEffect;
    onWeatherChange: (weather: WeatherEffect) => void;
    onClearAllZones: () => void;
    className?: string;
}

export const VisionZoneControls: React.FC<VisionZoneControlsProps> = ({
    currentMode,
    onModeChange,
    activeLightLevel,
    onLightLevelChange,
    activeWeather,
    onWeatherChange,
    onClearAllZones,
    className = ""
}) => {
    const [showClearConfirm, setShowClearConfirm] = React.useState(false);

    const isZoneMode = currentMode === 'zone-rect' || currentMode === 'zone-circle';

    return (
        <div className={`flex flex-col gap-2 bg-stone-900/40 backdrop-blur-xl p-2 rounded-2xl border border-white/5 shadow-2xl ${className}`}>
            <div className="px-3 py-2 border-b border-white/5 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-500">Vision Zones</span>
            </div>
            
            <div className="flex gap-1">
                <button
                    onClick={() => onModeChange('zone-rect')}
                    className={`p-2 flex-1 rounded-xl transition-all flex justify-center items-center ${currentMode === 'zone-rect'
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                        : 'text-stone-500 hover:bg-white/5 hover:text-stone-300'
                    }`}
                    title="Rectangle Zone"
                >
                    <Square size={16} />
                </button>
                <button
                    onClick={() => onModeChange('zone-circle')}
                    className={`p-2 flex-1 rounded-xl transition-all flex justify-center items-center ${currentMode === 'zone-circle'
                        ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'
                        : 'text-stone-500 hover:bg-white/5 hover:text-stone-300'
                    }`}
                    title="Circle Zone"
                >
                    <Circle size={16} />
                </button>
            </div>

            {isZoneMode && (
                <div className="mt-2 space-y-3">
                    {/* Light Level Selection */}
                    <div className="space-y-1">
                        <div className="text-[9px] uppercase tracking-wider text-stone-500 font-bold px-1">Light Level</div>
                        <div className="grid grid-cols-2 gap-1">
                            {(['bright', 'dim', 'darkness', 'magical-darkness'] as LightLevel[]).map(level => (
                                <button
                                    key={level}
                                    onClick={() => onLightLevelChange(level)}
                                    className={`text-[10px] py-1 px-2 rounded-lg truncate transition-all ${
                                        activeLightLevel === level 
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' 
                                            : 'bg-black/20 text-stone-400 hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    {level.replace('-', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Weather Effect Selection */}
                    <div className="space-y-1">
                        <div className="text-[9px] uppercase tracking-wider text-stone-500 font-bold px-1">Weather</div>
                        <select
                            value={activeWeather}
                            onChange={(e) => onWeatherChange(e.target.value as WeatherEffect)}
                            className="w-full bg-black/40 border border-white/10 text-stone-300 text-xs rounded-lg p-1.5 focus:outline-none focus:border-amber-500/50"
                        >
                            <option value="none">Clear</option>
                            <option value="fog">Fog (Heavy Obscurement)</option>
                            <option value="mist">Mist (Light Obscurement)</option>
                            <option value="rain">Rain (Light Obscurement)</option>
                            <option value="heavy-rain">Heavy Rain (Heavy Obscurement)</option>
                            <option value="blizzard">Blizzard</option>
                            <option value="sandstorm">Sandstorm</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="h-px bg-white/5 my-1 mx-2" />

            <button
                onClick={() => setShowClearConfirm(true)}
                className="p-3 rounded-xl text-red-500/60 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center gap-3 group border border-transparent hover:border-red-500/20"
                title="Clear All Vision Zones"
            >
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest pr-2 hidden lg:block whitespace-nowrap">Clear Zones</span>
            </button>

            <ConfirmationModal
                isOpen={showClearConfirm}
                title="Purge Vision Zones?"
                message="Are you sure you want to delete all vision zones from this map?"
                confirmText="Clear All"
                isDangerous={true}
                onConfirm={() => {
                    onClearAllZones();
                    setShowClearConfirm(false);
                }}
                onCancel={() => setShowClearConfirm(false)}
            />
        </div>
    );
};
