/** One tick of player intent. Produced by client input devices or the AI; consumed by systems. */
export interface InputState {
  /** -1 reverse … 1 forward */
  throttle: number;
  /** -1 right … 1 left (counter-clockwise positive, matching heading) */
  steer: number;
}

export const IDLE_INPUT: InputState = { throttle: 0, steer: 0 };
