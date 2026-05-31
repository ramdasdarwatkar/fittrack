import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { supabase } from "@/lib/supabase";
import {
    Activity,
    Zap,
    Palette,
    RefreshCw,
    LogOut,
    ChevronRight,
} from "lucide-react";
import { ProfileService } from "@/services/ProfileService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string | null): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

function getInitials(name?: string | null): string {
    if (!name) return "?";
    return name.trim().split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Menu items ───────────────────────────────────────────────────────────────

const MENU_ITEMS = [
    {
        id: "body-metrics",
        label: "Body Metrics",
        description: "Weight, height & measurements",
        icon: Activity,
        path: "/settings/body-metrics",
        accent: "var(--success)",
    },
    {
        id: "xp-levels",
        label: "XP & Levels",
        description: "Progress this month and lifetime",
        icon: Zap,
        path: "/settings/xp-levels",
        accent: "var(--warning)",
    },
    {
        id: "appearance",
        label: "Appearance",
        description: "Theme, accent colour & display",
        icon: Palette,
        path: "/settings/appearance",
        accent: "var(--primary)",
    },
    {
        id: "sync",
        label: "Sync Status",
        description: "Records, pending changes & last sync",
        icon: RefreshCw,
        path: "/settings/sync",
        accent: "#06b6d4",
    },
];

// ─── Settings ─────────────────────────────────────────────────────────────────

export default function Settings() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState<string | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.id) setUserId(user.id);
        });
    }, []);

    const profile = useLiveQuery(
        async () => (userId ? ProfileService.getLocal(userId) : null),
        [userId],
    );

    const age = useMemo(() => calcAge((profile as any)?.dob), [profile]);
    const initials = useMemo(() => getInitials(profile?.name), [profile?.name]);

    // Show full name as heading; no sub-name duplication
    const displayName = profile?.name?.trim() || "Athlete";

    const handleLogout = async () => {
        setLoggingOut(true);
        await supabase.auth.signOut();
        navigate("/auth");
    };

    return (
        <div
            className="w-full pb-32 select-none"
            style={{ minHeight: "100dvh", background: "var(--background)", color: "var(--foreground)", fontFamily: "var(--font-inter)" }}
        >
            {/* ── Profile header ── */}
            <div
                className="relative w-full overflow-hidden px-5 pb-7"
                style={{
                    borderBottom: "1px solid var(--border)",
                    paddingTop: "calc(env(safe-area-inset-top) + 24px)",
                    background: "var(--background)",
                }}
            >

                <div className="flex items-center gap-4 relative z-10">
                    {/* Avatar */}
                    <div
                        className="flex items-center justify-center rounded-2xl font-black shrink-0"
                        style={{
                            width: 68, height: 68, fontSize: 22,
                            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                            border: "1.5px solid color-mix(in srgb, var(--primary) 28%, transparent)",
                            color: "var(--primary)",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {initials}
                    </div>

                    {/* Info — full name once, then badges */}
                    <div className="flex-1 min-w-0">
                        <h1
                            className="font-black leading-tight truncate"
                            style={{ fontSize: 26, letterSpacing: "-0.03em", color: "var(--foreground)" }}
                        >
                            {displayName}
                        </h1>

                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {age !== null && (
                                <span
                                    className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                    style={{
                                        background: "var(--secondary)",
                                        color: "var(--muted-foreground)",
                                        border: "1px solid var(--border)",
                                    }}
                                >
                                    {age} yrs
                                </span>
                            )}
                            {profile?.role && (
                                <span
                                    className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                    style={{
                                        background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                                        color: "var(--primary)",
                                        border: "1px solid color-mix(in srgb, var(--primary) 24%, transparent)",
                                    }}
                                >
                                    {profile.role}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Menu ── */}
            <div className="w-full px-4 pt-6 space-y-2">
                <p
                    className="text-[10px] font-black uppercase tracking-[0.18em] px-1 pb-2"
                    style={{ color: "var(--muted-foreground)" }}
                >
                    Settings
                </p>

                {MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] active:opacity-75 text-left"
                            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                        >
                            <div
                                className="flex items-center justify-center rounded-xl shrink-0"
                                style={{
                                    width: 42, height: 42,
                                    background: `color-mix(in srgb, ${item.accent} 13%, transparent)`,
                                    border: `1px solid color-mix(in srgb, ${item.accent} 25%, transparent)`,
                                }}
                            >
                                <Icon size={18} strokeWidth={2} style={{ color: item.accent }} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm leading-none mb-1" style={{ color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                                    {item.label}
                                </p>
                                <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                                    {item.description}
                                </p>
                            </div>

                            <ChevronRight size={15} strokeWidth={2} style={{ color: "var(--muted-foreground)", opacity: 0.4, flexShrink: 0 }} />
                        </button>
                    );
                })}
            </div>

            {/* ── Sign out ── */}
            <div className="w-full px-4 pt-5">
                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] active:opacity-80 disabled:opacity-40"
                    style={{
                        background: "color-mix(in srgb, var(--destructive) 9%, transparent)",
                        color: "var(--destructive)",
                        border: "1px solid color-mix(in srgb, var(--destructive) 20%, transparent)",
                    }}
                >
                    <LogOut size={14} strokeWidth={2.5} />
                    {loggingOut ? "Signing out…" : "Sign Out"}
                </button>
            </div>

            {/* ── Version ── */}
            <p
                className="text-center mt-8 text-[10px] font-medium"
                style={{ color: "var(--muted-foreground)", opacity: 0.35 }}
            >
                v1.0.0
            </p>
        </div>
    );
}