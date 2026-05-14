export interface TimerEntry {
  id: string;
  startTime: number;
  pausedAt: number | null;
  elapsedMs: number;
  targetSeconds?: number; // Added: The goal duration (e.g., 90 for a rest timer)
  label?: string;
}

export interface TimerState {
  activeTimers: Record<string, TimerEntry>;
  activeRestTimerId: string | null;
}
