export interface UserProfile {
  id: string;
  email: string;
  // We can expand this later with metadata like name or avatar
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
