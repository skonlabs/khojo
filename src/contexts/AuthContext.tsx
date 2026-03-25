import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  project_name: string | null;
  api_key: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  api_key: string;
  monitoring_enabled: boolean;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  projects: Project[];
  activeProject: Project | null;
  setActiveProjectId: (id: string) => void;
  refreshProjects: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  projects: [],
  activeProject: null,
  setActiveProjectId: () => {},
  refreshProjects: async () => {},
});

const ACTIVE_PROJECT_KEY = "khojo_active_project";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_PROJECT_KEY)
  );

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error && error.code !== "PGRST116") {
      console.error(JSON.stringify({ level: "error", message: "fetchProfile failed", error: error.message }));
    }
    setProfile(data as Profile | null);
  };

  const fetchProjects = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(JSON.stringify({ level: "error", message: "fetchProjects failed", error: error.message }));
    }

    const list = (data ?? []) as unknown as Project[];
    setProjects(list);

    // Validate stored project ID against the freshly-fetched list.
    // If the stored ID doesn't match any project (e.g. deleted externally),
    // fall back to the first project and update localStorage.
    setActiveProjectIdState((prev) => {
      if (list.length === 0) {
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
        return null;
      }
      const stillValid = prev && list.some((p) => p.id === prev);
      if (stillValid) return prev;
      const fallbackId = list[0].id;
      localStorage.setItem(ACTIVE_PROJECT_KEY, fallbackId);
      return fallbackId;
    });
  }, []); // No deps — avoids stale closure capturing old activeProjectId

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const refreshProjects = async () => {
    if (user) await fetchProjects(user.id);
  };

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          // Use setTimeout(0) to avoid Supabase auth deadlock in the callback
          setTimeout(() => {
            fetchProfile(sess.user.id);
            fetchProjects(sess.user.id);
          }, 0);
        } else {
          setProfile(null);
          setProjects([]);
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
          setActiveProjectIdState(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
        fetchProjects(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setProjects([]);
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    setActiveProjectIdState(null);
  };

  // activeProjectId is always validated against the live projects list
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading, signOut, refreshProfile,
      projects, activeProject, setActiveProjectId, refreshProjects,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
