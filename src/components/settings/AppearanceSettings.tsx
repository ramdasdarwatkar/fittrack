import React from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { AccentColor, ThemeMode } from "@/types/settings";
import { Check, Moon, Sun, Monitor } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const THEMES: { label: string; value: ThemeMode; icon: typeof Sun }[] = [
    { label: "Light", value: "light", icon: Sun },
    { label: "Dark", value: "dark", icon: Moon },
    { label: "System", value: "system", icon: Monitor },
];

const ACCENTS: { label: string; value: AccentColor; hex: string }[] = [
    { label: "Indigo", value: "blue", hex: "#6f6fee" },
    { label: "Orange", value: "orange", hex: "#f97316" },
    { label: "Green", value: "green", hex: "#10b981" },
    { label: "Purple", value: "purple", hex: "#8b5cf6" },
    { label: "Pink", value: "pink", hex: "#ec4899" },
    { label: "Yellow", value: "yellow", hex: "#eab308" },
];

const WEIGHT_UNITS: { label: string; value: "kg" | "lbs" }[] = [
    { label: "Kilograms", value: "kg" },
    { label: "Pounds", value: "lbs" },
];

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p
            className="text-[10px] font-black uppercase tracking-[0.18em] px-1 mb-3"
            style={{ color: "var(--muted-foreground)" }}
        >
            {children}
        </p>
    );
}

// ─── AppearanceSettings ───────────────────────────────────────────────────────

export default function AppearanceSettings() {
    const {
        theme, setTheme,
        accentColor, setAccentColor,
        weightUnit, setWeightUnit,
        defaultRestTimer, setDefaultRestTimer,
    } = useSettingsStore();

    return (
        <div
            className="w-full pb-16 select-none"
            style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--foreground)", fontFamily: "var(--font-inter)" }}
        >
            <div className="px-4 pt-2 space-y-8">

                {/* ── Theme ── */}
                <section>
                    <SectionLabel>Theme</SectionLabel>
                    <div className="grid grid-cols-3 gap-2">
                        {THEMES.map((t) => {
                            const Icon = t.icon;
                            const active = theme === t.value;
                            return (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setTheme(t.value)}
                                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all active:scale-95"
                                    style={{
                                        background: active
                                            ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                                            : "var(--card)",
                                        border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                    }}
                                >
                                    <Icon
                                        size={20}
                                        strokeWidth={2}
                                        style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}
                                    />
                                    <span
                                        className="text-[10px] font-black uppercase tracking-widest"
                                        style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}
                                    >
                                        {t.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Accent colour ── */}
                <section>
                    <SectionLabel>Accent Colour</SectionLabel>
                    <div className="grid grid-cols-3 gap-2">
                        {ACCENTS.map((a) => {
                            const active = accentColor === a.value;
                            return (
                                <button
                                    key={a.value}
                                    type="button"
                                    onClick={() => setAccentColor(a.value)}
                                    className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl transition-all active:scale-95"
                                    style={{
                                        background: active
                                            ? `color-mix(in srgb, ${a.hex} 12%, transparent)`
                                            : "var(--card)",
                                        border: `1.5px solid ${active ? a.hex : "var(--border)"}`,
                                    }}
                                >
                                    {/* Colour swatch */}
                                    <div
                                        className="relative flex items-center justify-center shrink-0"
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: "50%",
                                            background: a.hex,
                                        }}
                                    >
                                        {active && (
                                            <Check size={11} strokeWidth={3} style={{ color: "#fff" }} />
                                        )}
                                    </div>
                                    <span
                                        className="text-[11px] font-black uppercase tracking-wide"
                                        style={{ color: active ? a.hex : "var(--foreground)" }}
                                    >
                                        {a.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Weight unit ── */}
                <section>
                    <SectionLabel>Weight Unit</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                        {WEIGHT_UNITS.map((u) => {
                            const active = weightUnit === u.value;
                            return (
                                <button
                                    key={u.value}
                                    type="button"
                                    onClick={() => setWeightUnit(u.value)}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                                    style={{
                                        background: active
                                            ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                                            : "var(--card)",
                                        border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                    }}
                                >
                                    {active && (
                                        <Check size={12} strokeWidth={3} style={{ color: "var(--primary)" }} />
                                    )}
                                    <span
                                        className="text-xs font-black uppercase tracking-widest"
                                        style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}
                                    >
                                        {u.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Default rest timer ── */}
                <section>
                    <SectionLabel>Default Rest Timer</SectionLabel>
                    <div
                        className="rounded-2xl px-4 overflow-hidden"
                        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                        {[30, 45, 60, 90, 120, 180].map((sec, i, arr) => {
                            const active = defaultRestTimer === sec;
                            return (
                                <button
                                    key={sec}
                                    type="button"
                                    onClick={() => setDefaultRestTimer(sec)}
                                    className="w-full flex items-center justify-between py-3.5 transition-all active:opacity-70"
                                    style={{
                                        borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                                        background: "transparent",
                                        border_bottom: undefined,
                                    }}
                                >
                                    <span
                                        className="text-sm font-semibold"
                                        style={{ color: active ? "var(--primary)" : "var(--foreground)", letterSpacing: "-0.01em" }}
                                    >
                                        {sec >= 60 ? `${sec / 60} min` : `${sec} sec`}
                                        <span className="text-xs ml-1.5" style={{ color: "var(--muted-foreground)" }}>
                                            ({sec}s)
                                        </span>
                                    </span>
                                    {active && (
                                        <Check size={15} strokeWidth={2.5} style={{ color: "var(--primary)" }} />
                                    )}
                                </button>
                            );
                        })}

                        {/* Custom input row */}
                        <div
                            className="flex items-center gap-3 py-3.5"
                            style={{ borderTop: "1px solid var(--border)" }}
                        >
                            <span className="text-sm font-semibold flex-1" style={{ color: "var(--muted-foreground)", letterSpacing: "-0.01em" }}>
                                Custom
                            </span>
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="number"
                                    value={defaultRestTimer}
                                    onChange={(e) => setDefaultRestTimer(Number(e.target.value))}
                                    className="w-16 text-right font-black text-sm outline-none rounded-lg px-2 py-1"
                                    style={{
                                        background: "var(--secondary)",
                                        border: "1px solid var(--border)",
                                        color: "var(--foreground)",
                                    }}
                                />
                                <span
                                    className="text-[10px] font-black uppercase tracking-widest"
                                    style={{ color: "var(--muted-foreground)" }}
                                >
                                    sec
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}