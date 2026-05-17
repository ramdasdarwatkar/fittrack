import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { onboardingService } from "@/services/OnboardingService";
import { SyncService } from "@/services/SyncService";
import { supabase } from "@/lib/supabase";
import "@/styles/onboarding.css";

import { Identity } from "@/features/onboarding/Identity";
import { Measurement } from "@/features/onboarding/Measurement";
import { Target } from "@/features/onboarding/Target";
import { Experience } from "@/features/onboarding/Experience";
import { Summary } from "@/features/onboarding/Summary";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [isSubmitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState({
    name: "",
    gender: "",
    dob: "",
    height: "" as number | "",
    weight: "" as number | "",
    goalWeight: "" as number | "",
    weeklyTarget: 0,
    monthlyTarget: 0 as number | "",
    xp_level: "" as "beginner" | "intermediate" | "advanced" | "elite" | "",
    initXp: 0,
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!data.name.trim()) e.name = "Name required";
      if (!data.gender) e.gender = "Select gender";
      if (!data.dob) e.dob = "Select date of birth";
    }
    if (step === 2) {
      if (!data.height) e.height = "Height required";
      if (!data.weight) e.weight = "Weight required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate()) {
      setDir(1);
      setStep((s) => s + 1);
    }
  };

  const back = () => {
    setDir(-1);
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    setSubmitting(true);

    try {
      const payload = {
        name: data.name,
        gender: data.gender,
        dob: data.dob,
        height: Number(data.height),
        weight: Number(data.weight),
        goalWeight: Number(data.goalWeight),
        weeklyTarget: data.weeklyTarget,
        monthlyTarget: Number(data.monthlyTarget),
        initXp: data.initXp,
      };

      // 1. Write everything into IndexedDB local transaction tables instantly
      await onboardingService.completeOnboarding(user.id, payload);

      // 2. Clear Routing Lane: Redirect first to ensure DOM tree is unmounting smoothly
      navigate("/", { replace: true });

      // 3. Defer Notification Link: Fires on the next frame callback thread
      setTimeout(() => {
        window.dispatchEvent(new Event("auth_reevaluate"));
        // Push newly written onboarding dirty rows to Supabase in the background
        SyncService.pushAll().catch((err) =>
          console.error("[Sync] Post-onboarding background push failed:", err),
        );
      }, 0);
    } catch (err) {
      console.error("Submission error:", err);
      setSubmitting(false);
    }
  };

  return (
    <div className="ob-screen-root">
      <div className="ob-main-container">
        <div className="ob-progress-nav">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`ob-dot ${s <= step ? "active" : ""}`} />
          ))}
        </div>

        <div className="ob-viewport">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={step}
              className="ob-slide"
              initial={{ x: dir > 0 ? "50%" : "-50%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir > 0 ? "-50%" : "50%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="ob-scroll-view">
                {step === 1 && (
                  <Identity data={data} setData={setData} errors={errors} />
                )}
                {step === 2 && (
                  <Measurement data={data} setData={setData} errors={errors} />
                )}
                {step === 3 && (
                  <Target data={data} setData={setData} errors={errors} />
                )}
                {step === 4 && <Experience data={data} setData={setData} />}
                {step === 5 && <Summary data={data} />}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="ob-actions-footer">
          {step > 1 && (
            <button
              className="ob-btn-back"
              onClick={back}
              disabled={isSubmitting}
            >
              Back
            </button>
          )}
          <button
            className="ob-btn-next"
            onClick={step < 5 ? next : handleSubmit}
            disabled={isSubmitting}
          >
            {step < 5
              ? "Continue →"
              : isSubmitting
                ? "Syncing..."
                : "Start Journey"}
          </button>
        </div>
      </div>
    </div>
  );
}
