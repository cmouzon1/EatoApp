import { useQuery } from "@tanstack/react-query";
import { type User } from "@shared/schema";

type AuthUser = User & {
  hasCompletedProfile?: boolean;
  subscription?: {
    tier: string;
    status: string;
    currentPeriodEnd?: string;
  } | null;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasCompletedProfile: user?.hasCompletedProfile ?? false,
    isTruckOwner: user?.userRole === "truck_owner",
    isEventOrganizer: user?.userRole === "event_organizer",
    isFoodie: user?.userRole === "user",
    userRole: user?.userRole,
    subscription: user?.subscription,
  };
}
