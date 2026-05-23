import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Trophy, ArrowRight } from "lucide-react";
import { useWorkoutUIStore } from "@/stores/useWorkoutUIStore";

function fireCelebration(isBrandNew: boolean) {
  const colors = {
    primary: "#6f6fee",
    warning: "#f59e0b",
    success: "#22c55e",
    white: "#ffffff",
    soft: "#fde68a",
    cool: "#a5f3fc",
  };

  if (isBrandNew) {
    // Single celebratory pop from center
    confetti({
      particleCount: 130,
      spread: 88,
      startVelocity: 36,
      origin: { x: 0.5, y: 0.55 },
      colors: [colors.primary, colors.success, colors.white, colors.cool],
      ticks: 230,
      gravity: 0.88,
      scalar: 1.1,
      shapes: ["circle", "square"],
    });

    return;
  }

  // PR: dual side cannons
  const cannon = (origin: { x: number; y: number }, angle: number) =>
    confetti({
      particleCount: 75,
      angle,
      spread: 52,
      startVelocity: 55,
      origin,
      colors: [
        colors.warning,
        colors.primary,
        colors.white,
        colors.soft,
        colors.success,
      ],
      ticks: 270,
      gravity: 0.82,
      scalar: 1.06,
      shapes: ["circle", "square"],
    });

  cannon({ x: 0.12, y: 0.62 }, 62);

  setTimeout(() => {
    cannon({ x: 0.88, y: 0.62 }, 118);
  }, 110);

  // Top shower
  setTimeout(() => {
    confetti({
      particleCount: 55,
      spread: 130,
      startVelocity: 20,
      origin: { x: 0.5, y: 0.08 },
      colors: [colors.warning, colors.soft, colors.white],
      ticks: 210,
      gravity: 1.12,
      scalar: 0.88,
      drift: 0.25,
    });
  }, 340);
}

export default function PRCelebrationModal() {
  const { activePRCelebration, clearPRCelebration } = useWorkoutUIStore();

  const firedRef = useRef(false);

  useEffect(() => {
    if (activePRCelebration && !firedRef.current) {
      firedRef.current = true;

      setTimeout(() => {
        fireCelebration(activePRCelebration.oldValue === null);
      }, 230);
    }

    if (!activePRCelebration) {
      firedRef.current = false;
    }
  }, [activePRCelebration]);

  if (!activePRCelebration) return null;

  const isBrandNew = activePRCelebration.oldValue === null;

  const improvement =
    !isBrandNew && activePRCelebration.oldValue
      ? (
          ((activePRCelebration.newValue - activePRCelebration.oldValue) /
            activePRCelebration.oldValue) *
          100
        ).toFixed(1)
      : null;

  return (
    <>
      <style>{`
        @keyframes pr-card-in {
          from {
            opacity: 0;
            transform: scale(0.82) translateY(22px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes pr-trophy-float {
          0%,100% {
            transform: translateY(0) scale(1);
          }
          40% {
            transform: translateY(-10px) scale(1.10);
          }
          70% {
            transform: translateY(-4px) scale(1.04);
          }
        }

        @keyframes pr-shine {
          from {
            transform: translateX(-115%) skewX(-18deg);
            opacity: .65;
          }
          to {
            transform: translateX(240%) skewX(-18deg);
            opacity: 0;
          }
        }

        @keyframes pr-glow-pulse {
          0%,100% {
            box-shadow: 0 0 0 0
              color-mix(in srgb,var(--warning) 0%, transparent);
          }
          50% {
            box-shadow: 0 0 30px 6px
              color-mix(in srgb,var(--warning) 26%, transparent);
          }
        }

        @keyframes pr-value-pop {
          0% {
            transform: scale(0.65);
            opacity: 0;
          }
          65% {
            transform: scale(1.12);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pr-badge-in {
          from {
            transform: scale(0) rotate(-15deg);
            opacity: 0;
          }
          to {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes pr-label-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-5"
        style={{
          background: "rgba(0,0,0,0.80)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div
          className="relative w-full max-w-sm overflow-hidden"
          style={{
            background: "var(--card)",
            border:
              "1px solid color-mix(in srgb,var(--warning) 38%,var(--border))",
            borderRadius: "1.875rem",
            padding: "2rem 1.5rem 1.5rem",
            animation:
              "pr-card-in 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards, pr-glow-pulse 2.6s 0.7s ease-in-out infinite",
            boxShadow: "0 40px 100px rgba(0,0,0,0.35)",
          }}
        >
          {/* Shine sweep */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "1.875rem",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "40%",
                height: "100%",
                background:
                  "linear-gradient(90deg,transparent,rgba(255,255,255,0.075),transparent)",
                animation: "pr-shine 1.25s 0.38s ease-out forwards",
              }}
            />
          </div>

          {/* Label */}
          <p
            className="text-center text-[9px] font-black uppercase tracking-[0.22em] mb-4"
            style={{
              color: "var(--warning)",
              animation: "pr-label-in 0.4s 0.1s ease-out both",
            }}
          >
            {isBrandNew ? "🏁 First Record" : "🏆 Personal Record"}
          </p>

          {/* Trophy */}
          <div className="flex justify-center mb-5">
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: "1.375rem",
                background: "color-mix(in srgb,var(--warning) 12%,transparent)",
                border:
                  "1.5px solid color-mix(in srgb,var(--warning) 32%,transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "pr-trophy-float 1.7s 0.55s ease-in-out infinite",
              }}
            >
              <Trophy
                size={38}
                strokeWidth={1.75}
                style={{ color: "var(--warning)" }}
              />
            </div>
          </div>

          {/* Exercise name */}
          <h2
            className="text-center font-black text-xl uppercase tracking-tight leading-tight truncate px-3 mb-5"
            style={{
              color: "var(--foreground)",
              animation: "pr-label-in 0.4s 0.18s ease-out both",
            }}
          >
            {activePRCelebration.exerciseName}
          </h2>

          {/* Metric panel */}
          <div
            className="rounded-2xl p-4 mb-5"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {isBrandNew ? (
              <div className="text-center space-y-1">
                <p
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "var(--success)" }}
                >
                  First Entry
                </p>

                <p
                  className="font-mono font-black tabular-nums leading-none"
                  style={{
                    fontSize: 46,
                    color: "var(--success)",
                    animation:
                      "pr-value-pop 0.52s 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
                  }}
                >
                  {activePRCelebration.newValue}
                  <span
                    className="text-xl font-black ml-1"
                    style={{
                      color: "var(--muted-foreground)",
                    }}
                  >
                    kg
                  </span>
                </p>

                <p
                  className="text-[10px] font-semibold"
                  style={{
                    color: "var(--muted-foreground)",
                  }}
                >
                  Beat this next time
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                {/* Was */}
                <div className="flex-1 text-center">
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mb-1.5"
                    style={{
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Was
                  </p>

                  <p
                    className="font-mono font-black text-2xl tabular-nums line-through"
                    style={{
                      color: "var(--muted-foreground)",
                      opacity: 0.42,
                    }}
                  >
                    {activePRCelebration.oldValue}kg
                  </p>
                </div>

                {/* Arrow + delta */}
                <div className="flex flex-col items-center gap-1.5 px-1">
                  <ArrowRight
                    size={17}
                    strokeWidth={2.5}
                    style={{
                      color: "var(--warning)",
                    }}
                  />

                  {improvement && (
                    <span
                      className="text-[9px] font-black tabular-nums px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          "color-mix(in srgb,var(--success) 15%,transparent)",
                        color: "var(--success)",
                        border:
                          "1px solid color-mix(in srgb,var(--success) 28%,transparent)",
                        animation:
                          "pr-badge-in 0.48s 0.72s cubic-bezier(0.34,1.56,0.64,1) both",
                        display: "inline-block",
                      }}
                    >
                      +{improvement}%
                    </span>
                  )}
                </div>

                {/* Now */}
                <div className="flex-1 text-center">
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mb-1.5"
                    style={{ color: "var(--warning)" }}
                  >
                    Now
                  </p>

                  <p
                    className="font-mono font-black text-2xl tabular-nums"
                    style={{
                      color: "var(--warning)",
                      animation:
                        "pr-value-pop 0.52s 0.52s cubic-bezier(0.34,1.56,0.64,1) both",
                    }}
                  >
                    {activePRCelebration.newValue}kg
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={clearPRCelebration}
            className="h-12 w-full rounded-xl text-xs font-black uppercase tracking-widest transition-transform active:scale-[0.97] active:opacity-80"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              boxShadow:
                "0 4px 22px color-mix(in srgb,var(--primary) 42%,transparent)",
            }}
          >
            Keep Going
          </button>
        </div>
      </div>
    </>
  );
}
