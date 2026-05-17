export const GENDER_OPTIONS = [
  { value: "male", icon: "♂️", label: "Male" },
  { value: "female", icon: "♀️", label: "Female" },
  { value: "non-binary", icon: "⚧️", label: "Non-binary" },
  { value: "prefer_not_to_say", icon: "🤐", label: "Prefer not" },
];

export const LEVEL_OPTIONS = [
  {
    value: "beginner",
    icon: "🌱",
    label: "Beginner",
    desc: "Just starting out — few or no gym visits",
    xp: 0,
    xpColor: "success",
  },
  {
    value: "intermediate",
    icon: "🔥",
    label: "Intermediate",
    desc: "Consistent training for 6–24 months",
    xp: 500,
    xpColor: "info",
  },
  {
    value: "advanced",
    icon: "💪",
    label: "Advanced",
    desc: "2+ years of serious, structured training",
    xp: 1500,
    xpColor: "warning",
  },
  {
    value: "elite",
    icon: "🏆",
    label: "Elite / Athlete",
    desc: "Competitive or professional level",
    xp: 3000,
    xpColor: "danger",
  },
];

export const WDAY_HINTS = [
  "",
  "A perfect way to start building the habit.",
  "Consistency begins with these two days.",
  "The 'sweet spot' for most fitness journeys.",
  "You're serious about seeing real change.",
  "Dedicated athlete territory. Keep it up!",
  "High-performance mode engaged. 🔥",
  "Legendary dedication. Mind your recovery! 🏆",
];

export const LEVEL_MESSAGES: Record<string, string> = {
  beginner:
    "Every legend started exactly where you are today. Trust the process — your first rep is the hardest, and you've already made it.",
  intermediate:
    "You've built the habit. Now it's time to build the physique. You know what it takes — let's go further.",
  advanced:
    "You've earned this moment. Time to break your own records and show up as the best version you've ever been.",
  elite:
    "Elite mentality, elite results. You already know what it costs — and you keep paying it. Respect.",
};

export const LEVEL_TIPS: Record<string, string> = {
  beginner:
    "💡 Focus on form first. Consistency beats intensity when you're just starting out.",
  intermediate:
    "💡 Progressive overload is your edge — add a little more weight or reps each week.",
  advanced:
    "💡 Recovery is training. Sleep and nutrition will be your competitive advantage now.",
  elite:
    "💡 Mental resilience separates the good from the great. Trust your programming.",
};
