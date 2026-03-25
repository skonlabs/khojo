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
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  const fetchProjects = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as unknown as Project[];
    setProjects(list);
    // Auto-select first project if none selected
    if (list.length > 0 && (!activeProjectId || !list.find(p => p.id === activeProjectId))) {
      const firstId = list[0].id;
      setActiveProjectIdState(firstId);
      localStorage.setItem(ACTIVE_PROJECT_KEY, firstId);
    }
  }, [activeProjectId]);

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
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchProjects(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setProjects([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchProjects(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setProjects([]);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0] ?? null;

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
