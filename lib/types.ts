export type UserRole = "customer" | "waiter";

export type Profile = {
  id: string;
  role: UserRole;
  created_at: string;
};
