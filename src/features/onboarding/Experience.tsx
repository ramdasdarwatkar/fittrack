import React from "react";
import { LEVEL_OPTIONS } from "@/features/onboarding/constants";
import { type OnboardingFormData } from "@/features/onboarding/OnboardingFormData";

interface Props {
  data: OnboardingFormData;
  setData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
}

export const Experience: React.FC<Props> = ({ data, setData }) => (
  <div className="ob-step">
    <div className="ob-head">
      <p className="ob-eyebrow">Step 4 of 5</p>
      <h1 className="ob-title">⚡ Experience</h1>
    </div>
    <div className="ob-stack-list">
      {LEVEL_OPTIONS.map((lvl) => (
        <button
          key={lvl.value}
          type="button"
          className={`ob-lvl-card ${data.xp_level === lvl.value ? "sel" : ""}`}
          onClick={() =>
            setData((prev) => ({
              ...prev,
              xp_level: lvl.value as
                | "beginner"
                | "intermediate"
                | "advanced"
                | "elite",
              starting_xp: lvl.xp,
            }))
          }
        >
          <span className="emoji">{lvl.icon}</span>
          <div className="txt">
            <div className="name">{lvl.label}</div>
            <div className="desc">{lvl.desc}</div>
          </div>
          <div className={`xp-badge ${lvl.xpColor}`}>{lvl.xp} XP</div>
        </button>
      ))}
    </div>
  </div>
);
