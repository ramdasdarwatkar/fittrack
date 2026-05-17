export const MDAY_HINT = (v: number | "") => {
  if (!v || v <= 0)
    return "Set your monthly target to visualize your commitment.";
  if (v <= 8) return "A solid foundation. Great for busy schedules.";
  if (v <= 15) return "You're finding your rhythm. Results are inevitable!";
  if (v <= 22) return "High-volume training. You are transforming.";
  return "Elite level. You are in the top 1% of achievers! 🚀";
};

export const BMI_MOTIVATION = (bmi: number) => {
  if (bmi < 18.5)
    return "Focus on nutrient-dense meals and progressive strength training to build lean mass safely.";
  if (bmi < 25)
    return "Great baseline! Aim for body recomposition by balancing high-protein intake with consistent lifting.";
  if (bmi < 30)
    return "Time to ignite the furnace. Prioritize a slight calorie deficit and 3+ days of high-intensity training.";
  return "Let's focus on sustainable lifestyle shifts. Consistent walking and low-impact lifting will jumpstart your metabolism.";
};

export function getBMIInfo(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight 🥗", cat: "info", pct: 20 };
  if (bmi < 25) return { label: "Normal ✅", cat: "success", pct: 45 };
  if (bmi < 30) return { label: "Overweight ⚠️", cat: "warning", pct: 75 };
  return { label: "Obese 🔴", cat: "danger", pct: 95 };
}
