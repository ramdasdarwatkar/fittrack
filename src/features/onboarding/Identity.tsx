import React from "react";
import { GENDER_OPTIONS } from "@/features/onboarding/constants";
import { type OnboardingFormData } from "@/features/onboarding/OnboardingFormData";

interface Props {
  data: OnboardingFormData;
  setData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: Record<string, string>;
}

export const Identity: React.FC<Props> = ({ data, setData, errors }) => (
  <div className="ob-step">
    <div className="ob-head">
      <p className="ob-eyebrow">Step 1 of 5</p>
      <h1 className="ob-title">👋 Who are you?</h1>
      <p className="ob-sub">
        Let's set up your profile with a few basic details.
      </p>
    </div>

    <div className="ob-field">
      <label className="ob-label">Full Name</label>
      <div className={`ob-input-box ${errors.name ? "err" : ""}`}>
        <input
          type="text"
          placeholder="Enter your name"
          value={data.name}
          onChange={(e) =>
            setData((prev) => ({ ...prev, name: e.target.value }))
          }
        />
      </div>
      {errors.name && <span className="ob-error-label">{errors.name}</span>}
    </div>

    <div className="ob-field">
      <label className="ob-label">Gender</label>
      <div className="ob-grid-2">
        {GENDER_OPTIONS.map((g) => (
          <button
            key={g.value}
            type="button"
            className={`ob-choice-btn ${data.gender === g.value ? "sel" : ""}`}
            onClick={() => setData((prev) => ({ ...prev, gender: g.value }))}
          >
            <span className="icon">{g.icon}</span> {g.label}
          </button>
        ))}
      </div>
      {errors.gender && <span className="ob-error-label">{errors.gender}</span>}
    </div>

    <div className="ob-field">
      <label className="ob-label">Date of Birth</label>
      <div className="ob-input-box">
        <input
          type="date"
          value={data.dob}
          onChange={(e) =>
            setData((prev) => ({ ...prev, dob: e.target.value }))
          }
        />
      </div>
    </div>
  </div>
);
