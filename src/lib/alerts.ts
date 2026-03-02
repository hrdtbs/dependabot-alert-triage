import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { ActiveScope } from "../store/useStore";

export interface Alert {
  number: number;
  state: string;
  dependency: {
    package: {
      ecosystem: string;
      name: string;
    };
  };
  security_advisory: {
    ghsa_id: string;
    cve_id?: string;
    summary: string;
    description: string;
    severity: string;
  };
  created_at: string;
  repository?: {
    name: string;
    full_name: string;
  };
}

export type AlertTuple = [string, Alert];

export function useAlerts(scope: ActiveScope | null) {
  const queryClient = useQueryClient();

  // Query to get cached alerts from backend
  const { data, isLoading, error } = useQuery<AlertTuple[]>({
    queryKey: ["alerts", scope?.type, scope?.name],
    queryFn: async () => {
      if (!scope) return [];
      try {
        const cached = await invoke<AlertTuple[]>("get_cached_alerts", {
          scopeName: scope.name,
        });
        return cached;
      } catch (err) {
        console.error("Failed to fetch cached alerts:", err);
        throw err;
      }
    },
    enabled: !!scope,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to sync alerts from GitHub to DB
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!scope) return;
      await invoke("sync_alerts", {
        scopeType: scope.type,
        scopeName: scope.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["alerts", scope?.type, scope?.name],
      });
    },
    onError: (err) => {
      console.error("Failed to sync alerts:", err);
    },
  });

  return {
    data: data || [],
    isLoading,
    error,
    isSyncing: syncMutation.isPending,
    syncAlerts: syncMutation.mutate,
  };
}
