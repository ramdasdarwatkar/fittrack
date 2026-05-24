import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { supabase } from "@/lib/supabase";
import { BodyMetricsService } from "@/services/BodyMetricsService";
import type { LocalBodyMetric } from "@/db";
import { Edit3, Check, Save, X } from "lucide-react";

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible }: { visible: boolean }) {
    return (
        <div
            style={{
                position: "fixed",
                bottom: 100,
                left: "50%",
                transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
                opacity: visible ? 1 : 0,
                transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                zIndex: 9999,
                background: "var(--foreground)",
                color: "var(--background)",
                borderRadius: 14,
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                pointerEvents: "none",
                whiteSpace: "nowrap",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
        >
            <Check size={14} strokeWidth={3} />
            Metrics saved
        </div>
    );
}

// ─── Field config ─────────────────────────────────────────────────────────────

type FieldDef = {
    key: keyof LocalBodyMetric;
    label: string;
    unit: string;
    required?: boolean;
};

const FIELDS: FieldDef[] = [
    { key: "weight", label: "Weight", unit: "kg", required: true },
    { key: "height", label: "Height", unit: "cm", required: true },
    { key: "waist", label: "Waist", unit: "cm" },
    { key: "chest", label: "Chest", unit: "cm" },
    { key: "hip", label: "Hip", unit: "cm" },
    { key: "shoulder", label: "Shoulder", unit: "cm" },
    { key: "belly", label: "Belly", unit: "cm" },
    { key: "bicep", label: "Bicep", unit: "cm" },
    { key: "thigh", label: "Thigh", unit: "cm" },
    { key: "forearm", label: "Forearm", unit: "cm" },
];

function getTodayStr() {
    return new Date().toISOString().split("T")[0];
}

function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
}

// Convert latest record to a plain string map for form state
function toFormValues(m: LocalBodyMetric): Record<string, string> {
    const out: Record<string, string> = {};
    FIELDS.forEach((f) => {
        const v = m[f.key];
        out[f.key] = v != null ? String(v) : "";
    });
    return out;
}

const EMPTY_FORM: Record<string, string> = Object.fromEntries(
    FIELDS.map((f) => [f.key, ""])
);

// ─── BodyMetricsSettings ──────────────────────────────────────────────────────

export default function BodyMetricsSettings() {
    const [userId, setUserId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(false);

    // Separate edit-draft state from read state
    const [draft, setDraft] = useState<Record<string, string>>(EMPTY_FORM);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.id) setUserId(user.id);
        });
    }, []);

    // Read latest from db directly — sorted date desc
    const latest = useLiveQuery(async () => {
        if (!userId) return null;
        const rows = await db.bodyMetrics
            .where("user_id")
            .equals(userId)
            .filter((m) => m.is_deleted === 0)
            .toArray();
        rows.sort((a, b) => b.date.localeCompare(a.date));
        return rows[0] ?? null;
    }, [userId]);

    // When latest arrives/changes AND we are NOT mid-edit, keep draft in sync
    useEffect(() => {
        if (!editing && latest) {
            setDraft(toFormValues(latest));
        }
    }, [latest, editing]);

    const bmi = useMemo(() => {
        if (!latest?.weight || !latest?.height) return null;
        const hm = latest.height / 100;
        return (latest.weight / (hm * hm)).toFixed(1);
    }, [latest]);

    const handleEdit = () => {
        // Seed draft from latest before opening edit mode
        setDraft(latest ? toFormValues(latest) : { ...EMPTY_FORM });
        setEditing(true);
    };

    const handleCancel = () => {
        // Restore draft back to latest
        setDraft(latest ? toFormValues(latest) : { ...EMPTY_FORM });
        setEditing(false);
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);

        const entry = {
            user_id: userId,
            date: getTodayStr(),
            weight: parseFloat(draft.weight) || 0,
            height: parseFloat(draft.height) || 0,
            waist: draft.waist ? parseFloat(draft.waist) : null,
            chest: draft.chest ? parseFloat(draft.chest) : null,
            hip: draft.hip ? parseFloat(draft.hip) : null,
            shoulder: draft.shoulder ? parseFloat(draft.shoulder) : null,
            belly: draft.belly ? parseFloat(draft.belly) : null,
            bicep: draft.bicep ? parseFloat(draft.bicep) : null,
            thigh: draft.thigh ? parseFloat(draft.thigh) : null,
            forearm: draft.forearm ? parseFloat(draft.forearm) : null,
            updated_at: new Date().toISOString(),
        } as Parameters<typeof BodyMetricsService.addEntry>[0];

        await BodyMetricsService.addEntry(entry);
        setSaving(false);
        setEditing(false);

        setToast(true);
        setTimeout(() => setToast(false), 2400);
    };

    const canSave = !!draft.weight && !!draft.height && !saving;

    // Loading state — latest is undefined until query resolves
    const isLoading = latest === undefined;

    return (
        <div
            className="w-full pb-32"
            style={{
                minHeight: "100dvh",
                background: "var(--background)",
                color: "var(--foreground)",
                fontFamily: "var(--font-inter)",
            }}
        >
            <Toast visible={toast} />

            <div className="px-4 pt-5 space-y-4">

                {/* ── Sub-header: last updated + BMI + action buttons ── */}
                <div className="flex items-center justify-between">
                    <div>
                        {isLoading ? (
                            <div className="h-3 w-32 rounded animate-pulse" style={{ background: "var(--secondary)" }} />
                        ) : latest ? (
                            <>
                                <p className="text-[11px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                                    Last updated · {formatDate(latest.date)}
                                </p>
                                {bmi && (
                                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                                        BMI{" "}
                                        <span style={{ color: "var(--primary)", fontWeight: 900 }}>{bmi}</span>
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-[11px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                                No entries yet — tap Edit to log
                            </p>
                        )}
                    </div>

                    {/* Action buttons */}
                    {!editing ? (
                        <button
                            type="button"
                            onClick={handleEdit}
                            className="flex items-center gap-1.5 h-9 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                            style={{
                                background: "var(--secondary)",
                                color: "var(--foreground)",
                                border: "1px solid var(--border)",
                            }}
                        >
                            <Edit3 size={12} strokeWidth={2.5} />
                            Edit
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex items-center gap-1 h-9 px-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
                                style={{
                                    background: "var(--secondary)",
                                    color: "var(--muted-foreground)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <X size={12} strokeWidth={2.5} />
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!canSave}
                                className="flex items-center gap-1.5 h-9 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
                                style={{
                                    background: "var(--primary)",
                                    color: "var(--primary-foreground)",
                                    boxShadow: "0 3px 12px color-mix(in srgb, var(--primary) 30%, transparent)",
                                }}
                            >
                                <Save size={12} strokeWidth={2.5} />
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Fields card ── */}
                <div
                    className="rounded-2xl overflow-hidden"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                    {isLoading ? (
                        // Skeleton
                        Array.from({ length: 10 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-4"
                                style={{ height: 54, borderBottom: i < 9 ? "1px solid var(--border)" : "none" }}
                            >
                                <div className="h-3 w-20 rounded animate-pulse" style={{ background: "var(--secondary)" }} />
                                <div className="h-3 w-12 rounded animate-pulse" style={{ background: "var(--secondary)" }} />
                            </div>
                        ))
                    ) : (
                        FIELDS.map((f, i) => {
                            const isLast = i === FIELDS.length - 1;
                            const displayValue = draft[f.key];
                            const isEmpty = !displayValue;

                            return (
                                <div
                                    key={f.key}
                                    className="flex items-center px-4 transition-colors"
                                    style={{
                                        height: 54,
                                        borderBottom: !isLast ? "1px solid var(--border)" : "none",
                                        background: editing
                                            ? "transparent"
                                            : "transparent",
                                    }}
                                >
                                    {/* Label */}
                                    <span
                                        className="text-sm font-semibold shrink-0"
                                        style={{
                                            width: 100,
                                            color: "var(--foreground)",
                                            letterSpacing: "-0.01em",
                                        }}
                                    >
                                        {f.label}
                                        {f.required && editing && (
                                            <span className="ml-0.5" style={{ color: "var(--destructive)", fontSize: 11 }}>*</span>
                                        )}
                                    </span>

                                    {/* Value — read mode: plain text; edit mode: input */}
                                    <div className="flex-1 flex items-center justify-end gap-2">
                                        {!editing ? (
                                            /* READ MODE — plain value, no input, no box */
                                            <span
                                                className="font-black text-base tabular-nums text-right"
                                                style={{
                                                    color: isEmpty ? "var(--muted-foreground)" : "var(--foreground)",
                                                    opacity: isEmpty ? 0.35 : 1,
                                                    letterSpacing: "-0.02em",
                                                }}
                                            >
                                                {isEmpty ? "—" : displayValue}
                                            </span>
                                        ) : (
                                            /* EDIT MODE — active input with underline */
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                value={displayValue}
                                                onChange={(e) =>
                                                    setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))
                                                }
                                                placeholder="0"
                                                className="font-black text-base tabular-nums text-right outline-none bg-transparent w-24"
                                                style={{
                                                    color: "var(--foreground)",
                                                    borderBottom: `2px solid ${isEmpty && f.required ? "var(--destructive)" : "var(--primary)"}`,
                                                    paddingBottom: 2,
                                                    letterSpacing: "-0.02em",
                                                }}
                                            />
                                        )}

                                        {/* Unit */}
                                        <span
                                            className="text-xs font-black uppercase shrink-0"
                                            style={{ color: "var(--muted-foreground)", width: 20, textAlign: "right" }}
                                        >
                                            {f.unit}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    );
}