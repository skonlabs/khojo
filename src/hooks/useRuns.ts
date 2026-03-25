import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Run {
  id: string;
  user_id: string;
  project_id: string | null;
  timestamp: string;
  input: string;
  output: string;
  context: string | null;
  prompt: string | null;
  model: string | null;
  session_id: string | null;
  input_tokens: number;
  output_tokens: number;
  context_tokens: number;
  total_tokens: number;
  failure_types: string[];
  primary_failure: string | null;
  explanation: string | null;
  root_cause: string | null;
  fix: string | null;
  confidence: string | null;
  proof: {
    missing_keywords?: string[];
    unsupported_claims?: string[];
    repeated_chunks?: string[];
  } | null;
  dismissed: boolean;
  evaluated_at: string | null;
}

export function useRuns() {
  const { user, activeProject } = useAuth();
  const queryClient = useQueryClient();
  // Track whether we have seen any runs yet, to distinguish new vs update events
  const initializedRef = useRef(false);

  const query = useQuery({
    queryKey: ["runs", user?.id, activeProject?.id],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase
        .from("runs")
        .select("*")
        .order("timestamp", { ascending: false });
      if (activeProject) {
        q = q.eq("project_id", activeProject.id);
      }
      const { data, error } = await q;
      if (error) {
        console.error(JSON.stringify({ level: "error", message: "useRuns fetch failed", error: error.message }));
        throw error;
      }
      initializedRef.current = true;
      return (data ?? []) as unknown as Run[];
    },
    enabled: !!user,
  });

  // Realtime subscription — one channel per user (not per render).
  // Channel name is scoped to userId so project switches don't create
  // duplicate channels; the query key handles project filtering.
  useEffect(() => {
    if (!user) return;

    const channelName = `runs-realtime-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "runs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["runs", user.id, activeProject?.id] });
          // Only toast for INSERT events (new run received), not UPDATE (evaluation complete)
          if (payload.eventType === "INSERT" && initializedRef.current) {
            toast.info("New run received");
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error(
            JSON.stringify({ level: "error", message: "Realtime subscription error", user_id: user.id })
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeProject?.id, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  return query;
}

export function useRun(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["run", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("runs")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        console.error(JSON.stringify({ level: "error", message: "useRun fetch failed", run_id: id, error: error.message }));
        throw error;
      }
      return data as unknown as Run;
    },
    enabled: !!user && !!id,
  });
}
