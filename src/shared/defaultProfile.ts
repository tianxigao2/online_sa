import type { UserInputProfile } from "./types"

export const DEFAULT_PROFILE: UserInputProfile = {
  styleGoals: [],
  explicitPreferences: {
    likedFits: [],
    dislikedFits: [],
    likedLengths: [],
    dislikedLengths: [],
    likedNecklines: [],
    dislikedNecklines: [],
    likedRise: [],
    dislikedRise: [],
    likedSupportLevels: [],
    dislikedSupportLevels: []
  },
  useCases: [],
  avoidRules: [],
  riskPreference: "balanced"
}
