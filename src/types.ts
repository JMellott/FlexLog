export type UnitSystem = 'metric' | 'imperial';

export interface UserSettings {
  units: UnitSystem;
}

export type ExerciseType = 'weightlifting' | 'bodyweight' | 'duration';

export interface WorkoutSet {
  reps?: number;
  weight?: number;
  duration?: number; // in seconds
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  sets: WorkoutSet[];
  supersetId?: string; // Exercises with same supersetId are linked
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: Exercise[];
  createdAt: number;
}

export interface WorkoutLog {
  id: string;
  planId: string;
  planName: string;
  startTime: number;
  endTime: number;
  exercises: Exercise[];
}
