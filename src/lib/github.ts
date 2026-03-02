import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

export function useOrganizations() {
  const userQuery = useQuery({
    queryKey: ["github", "user"],
    queryFn: async () => {
      try {
        const user = await invoke<string>("fetch_user");
        return user;
      } catch (error) {
        console.error("Failed to fetch user:", error);
        throw error;
      }
    },
  });

  const orgsQuery = useQuery({
    queryKey: ["github", "orgs"],
    queryFn: async () => {
      try {
        const orgs = await invoke<string[]>("fetch_user_organizations");
        return orgs;
      } catch (error) {
        console.error("Failed to fetch organizations:", error);
        throw error;
      }
    },
  });

  return {
    user: userQuery.data,
    orgs: orgsQuery.data || [],
    isLoading: userQuery.isLoading || orgsQuery.isLoading,
    isError: userQuery.isError || orgsQuery.isError,
    error: userQuery.error || orgsQuery.error,
  };
}
