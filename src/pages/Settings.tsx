import { useSettingsStore } from "@/stores/settingsStore";
import type { AccentColor, ThemeMode } from "@/types/settings";

export function Settings() {
    const {
        theme, setTheme,
        accentColor, setAccentColor,
        weightUnit, setWeightUnit,
        defaultRestTimer, setDefaultRestTimer
    } = useSettingsStore();

    const themes: { label: string; value: ThemeMode }[] = [
        { label: 'Light', value: 'light' },
        { label: 'Dark', value: 'dark' },
        { label: 'System', value: 'system' },
    ];

    const accents: { label: string; value: AccentColor }[] = [
        { label: 'Blue', value: 'blue' },
        { label: 'Orange', value: 'orange' },
        { label: 'Green', value: 'green' },
        { label: 'Purple', value: 'purple' },
        { label: 'Pink', value: 'pink' },
        { label: 'Yellow', value: 'yellow' },
    ];

    return (
        <div className="p-6 space-y-8 pb-24">
            <h1 className="text-xl font-black uppercase tracking-widest">Settings</h1>

            {/* Theme Selection */}
            <section className="space-y-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Theme</h2>
                <div className="grid grid-cols-3 gap-2">
                    {themes.map((t) => (
                        <button
                            key={t.value}
                            onClick={() => setTheme(t.value)}
                            className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${theme === t.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary text-muted-foreground border-border"
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Accent Color Selection */}
            <section className="space-y-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Accent Color</h2>
                <div className="grid grid-cols-3 gap-2">
                    {accents.map((a) => (
                        <button
                            key={a.value}
                            onClick={() => setAccentColor(a.value)}
                            className={`p-3 rounded-xl flex items-center justify-center border transition-all ${accentColor === a.value
                                ? "border-primary bg-primary/10"
                                : "border-border bg-secondary"
                                }`}
                        >
                            <div className={`w-4 h-4 rounded-full accent-${a.value}`} style={{ backgroundColor: 'var(--primary)' }} />
                            <span className="ml-2 text-[10px] font-black uppercase tracking-wider">{a.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Units Section */}
            <section className="space-y-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Units</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setWeightUnit(weightUnit === 'kg' ? 'lbs' : 'kg')}
                        className="flex-1 p-3 rounded-xl text-xs font-black uppercase tracking-wider bg-secondary border border-border"
                    >
                        Weight: {weightUnit.toUpperCase()}
                    </button>
                </div>
            </section>

            {/* Rest Timer Section */}
            <section className="space-y-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Default Rest Timer</h2>
                <div className="flex items-center gap-4 bg-secondary p-3 rounded-xl border border-border">
                    <input
                        type="number"
                        value={defaultRestTimer}
                        onChange={(e) => setDefaultRestTimer(Number(e.target.value))}
                        className="w-full bg-transparent font-black text-sm outline-none"
                    />
                    <span className="text-xs font-black uppercase text-muted-foreground">Secs</span>
                </div>
            </section>
        </div>
    );
}