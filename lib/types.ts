export type UserRole = "customer" | "waiter";

export type Profile = {
  id: string;
  role: UserRole;
  created_at: string;
  updated_at?: string | null;
  email_verified_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  last_initial?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  profile_completed?: boolean;
  stripe_account_id?: string | null;
  serving_airports?: string[] | null;
  preferred_airport?: string | null;
  traveler_notes?: string | null;
  contact_preference?: string | null;
  home_airport?: string | null;
  airports_served?: string[] | null;
  is_available?: boolean;
  onboarding_completed?: boolean;
  jobs_completed?: number;
  average_rating?: number | null;
};
