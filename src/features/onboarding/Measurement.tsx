import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getBMIInfo, BMI_MOTIVATION } from "@/features/onboarding/utils";
import { type OnboardingFormData } from "@/features/onboarding/OnboardingFormData";

interface Props {
  data: OnboardingFormData;
  setData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  errors: Record<string, string>;
}

export const Measurement: React.FC<Props> = ({ data, setData, errors }) => {
  const h = Number(data.height);
  const w = Number(data.weight);
  const bmi = h > 0 && w > 0 ? w / (h / 100) ** 2 : null;
  const bmiInfo = bmi ? getBMIInfo(bmi) : null;

  return (
    <div className="ob-step">
      <div className="ob-head">
        <p className="ob-eyebrow">Step 2 of 5</p>
        <h1 className="ob-title">📏 Body Stats</h1>
        <p className="ob-sub">We use these to calibrate your difficulty.</p>
      </div>

      <div className="ob-field">
        <label className="ob-label">Height (cm)</label>
        <div className={`ob-input-box ${errors.height ? "err" : ""}`}>
          <input
            type="number"
            placeholder="e.g. 175"
            value={data.height}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                height: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label">Weight (kg)</label>
        <div className={`ob-input-box ${errors.weight ? "err" : ""}`}>
          <input
            type="number"
            placeholder="e.g. 70"
            value={data.weight}
            onChange={(e) =>
              setData((prev) => ({
                ...prev,
                weight: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <AnimatePresence>
        {bmi && bmiInfo && (
          <motion.div
            className="ob-bmi-viz"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bmi-head-row">
              <div className="bmi-val">
                <span>{bmi.toFixed(1)}</span> <small>BMI</small>
              </div>
              <span className={`bmi-status ${bmiInfo.cat}`}>
                {bmiInfo.label}
              </span>
            </div>
            <div className="bmi-track">
              <motion.div
                className={`bmi-fill ${bmiInfo.cat}`}
                initial={{ width: 0 }}
                animate={{ width: `${bmiInfo.pct}%` }}
                transition={{ duration: 1 }}
              />
            </div>
            <div className="bmi-motivation">
              <span className="quote-icon">🎯</span>
              <p>{BMI_MOTIVATION(bmi)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
