import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Run {
  id: string;
  user_id: string;
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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["runs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("runs")
        .select("*")
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Run[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("runs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "runs", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["runs", user.id] });
          toast.info("New run received");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
      if (error) throw error;
      return data as unknown as Run;
    },
    enabled: !!user && !!id,
  });
}
