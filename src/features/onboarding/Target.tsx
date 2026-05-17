import React, { useState } from "react";
import { WDAY_HINTS } from "@/features/onboarding/constants";
import { MDAY_HINT } from "@/features/onboarding/utils";
import { type OnboardingFormData } from "@/features/onboarding/OnboardingFormData";

interface Props {
  data: OnboardingFormData;
  setData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: Record<string, string>;
}

export const Target: React.FC<Props> = ({ data, setData, errors }) => {
  const [showManual, setShowManual] = useState(false);

  return (
    <div className="ob-step">
      <div className="ob-head">
        <p className="ob-eyebrow">Step 3 of 5</p>
        <h1 className="ob-title">🎯 Set Targets</h1>
        <p className="ob-sub">How often do you plan to train?</p>
      </div>

      <div className="ob-field">
        <label className="ob-label">Goal Weight (kg)</label>
        <div className={`ob-input-box ${errors.goalWeight ? "err" : ""}`}>
          <input
            type="number"
            placeholder="Goal weight?"
            value={data.goalWeight}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                goalWeight: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label">Weekly Goal (Days)</label>
        <div className="ob-pill-selector">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
            <button
              key={num}
              type="button"
              className={`pill ${data.weeklyTarget === num ? "sel" : ""}`}
              onClick={() =>
                setData((prev) => ({ ...prev, weeklyTarget: num }))
              }
            >
              {num}
            </button>
          ))}
        </div>
        <p className="ob-active-hint">{WDAY_HINTS[data.weeklyTarget]}</p>
      </div>

      <div className="ob-field">
        <label className="ob-label">Monthly Milestone</label>
        {!showManual ? (
          <div className="ob-milestone-grid">
            {[4, 8, 12, 16, 20].map((val) => (
              <button
                key={val}
                type="button"
                className={`milestone-btn ${data.monthlyTarget === val ? "sel" : ""}`}
                onClick={() =>
                  setData((prev) => ({ ...prev, monthlyTarget: val }))
                }
              >
                {val} <small>Days</small>
              </button>
            ))}
            <button
              type="button"
              className="milestone-btn other"
              onClick={() => setShowManual(true)}
            >
              Other
            </button>
          </div>
        ) : (
          <div className="ob-input-box manual-monthly">
            <input
              autoFocus
              type="number"
              value={data.monthlyTarget}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  monthlyTarget:
                    e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
            />
            <button
              type="button"
              className="manual-close"
              onClick={() => setShowManual(false)}
            >
              ✕
            </button>
          </div>
        )}
        <p className="ob-active-hint">{MDAY_HINT(data.monthlyTarget)}</p>
      </div>
    </div>
  );
};
