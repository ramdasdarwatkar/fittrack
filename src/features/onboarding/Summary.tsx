import React from "react";
import { motion } from "framer-motion";
import {
  LEVEL_OPTIONS,
  LEVEL_MESSAGES,
  LEVEL_TIPS,
} from "@/features/onboarding/constants";
import { type OnboardingFormData } from "@/features/onboarding/OnboardingFormData";

interface Props {
  data: OnboardingFormData;
}

export const Summary: React.FC<Props> = ({ data }) => {
  const levelInfo = LEVEL_OPTIONS.find((l) => l.value === data.xp_level);

  return (
    <div className="ob-step">
      <div className="ob-head">
        <p className="ob-eyebrow">Step 5 of 5</p>
        <h1 className="ob-title">🚀 Ready!</h1>
      </div>
      <div className="ob-summary-hero">
        <motion.div
          className="hero-emoji"
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {levelInfo?.icon}
        </motion.div>
        <h2 className="hero-name">Let's go, {data.name.split(" ")[0]}!</h2>
        <p className="ob-sub">{LEVEL_MESSAGES[data.xp_level]}</p>

        <div className="hero-stats-row">
          <div className="h-stat">
            <b>{data.initXp}</b>
            <small>XP</small>
          </div>
          <div className="h-stat">
            <b>{data.weeklyTarget}x</b>
            <small>Weekly</small>
          </div>
          <div className="h-stat">
            <b>{data.monthlyTarget}</b>
            <small>Monthly</small>
          </div>
          <div className="h-stat">
            <b>{data.xp_level}</b>
            <small>Tier</small>
          </div>
        </div>
      </div>
      <div className="ob-tip-card">{LEVEL_TIPS[data.xp_level]}</div>
    </div>
  );
};
