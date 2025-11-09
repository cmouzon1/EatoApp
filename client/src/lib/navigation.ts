export type UserRole = "truck_owner" | "event_organizer" | "user";

/**
 * Get the appropriate dashboard/landing path based on user role
 */
export function getDashboardPath(
  role: UserRole | undefined | null,
  opts?: { fallback?: string }
): string {
  const fallback = opts?.fallback || "/";
  
  if (!role) {
    return fallback;
  }
  
  switch (role) {
    case "truck_owner":
      return "/dashboard/truck";
    case "event_organizer":
      return "/dashboard/organizer";
    case "user":
      return "/trucks";
    default:
      return fallback;
  }
}

/**
 * Get a friendly role display name
 */
export function getRoleDisplayName(role: UserRole | undefined | null): string {
  if (!role) return "User";
  
  switch (role) {
    case "truck_owner":
      return "Food Truck Owner";
    case "event_organizer":
      return "Event Organizer";
    case "user":
      return "Foodie";
    default:
      return "User";
  }
}
