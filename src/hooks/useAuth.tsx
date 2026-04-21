import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

type AppRole = "admin" | "student";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  // ✅ Simplified role fetching - skip slow user_roles table query
  const fetchRole = async (u: User): Promise<AppRole> => {
    const email = u.email?.toLowerCase();

    if (email === "alvarezchristiandave059@gmail.com") {
      console.log("✅ Admin user detected");
      return "admin";
    }

    // Everyone else is a student - no table query needed
    console.log("✅ Role defaulted to: student");
    return "student";
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log("🔄 Initializing auth...");
        
        // Step 1: Get current session
        const { data } = await supabase.auth.getSession();

        if (!mounted) {
          console.log("Component unmounted, skipping auth init");
          return;
        }

        const sess = data.session;
        setSession(sess);
        console.log("✅ Session retrieved:", sess ? "authenticated" : "not authenticated");

        // Step 2: Extract user from session
        const currentUser = sess?.user ?? null;
        setUser(currentUser);

        // Step 3: Fetch role ONLY if user exists
        if (currentUser) {
          console.log("👤 User found, fetching role...");
          const userRole = await fetchRole(currentUser);
          if (mounted) {
            setRole(userRole);
            console.log(`✅ Role set to: ${userRole}`);
          }
        } else {
          console.log("❌ No user in session");
          setRole(null);
        }

        // ✅ Step 4: End loading ONLY after complete session → user → role flow
        if (mounted) {
          setLoading(false);
          console.log("✅ Auth initialization complete");
        }
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        if (mounted) {
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, sess) => {
        if (!mounted) return;

        console.log("🔄 Auth state changed:", _event);

        try {
          setSession(sess);

          const currentUser = sess?.user ?? null;
          setUser(currentUser);

          // Only fetch role if user exists
          if (currentUser) {
            const userRole = await fetchRole(currentUser);
            if (mounted) {
              setRole(userRole);
            }
          } else {
            setRole(null);
          }

          // ✅ Only set loading to false after complete flow
          if (mounted) {
            setLoading(false);
          }
        } catch (error) {
          console.error("❌ Auth state change error:", error);
          if (mounted) {
            setSession(null);
            setUser(null);
            setRole(null);
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const navigateCb = useCallback(
    (to: string) => navigate(to, { replace: true }),
    [navigate]
  );

  const [isNavigating, setIsNavigating] = useState(false);

  // ✅ Navigation only happens when user + role exist (no /null routes)
  useEffect(() => {
    // Don't navigate if:
    // - Still loading
    // - Already navigating
    // - User or role don't exist (prevents /null routes)
    // - Already on correct path
    if (loading || isNavigating || !user || !role || pathname.startsWith(`/${role}`)) {
      return;
    }

    setIsNavigating(true);
    console.log(`🚀 Navigating to /${role}`);
    navigateCb(`/${role}`);

    setTimeout(() => setIsNavigating(false), 200);
  }, [role, user, loading, pathname, isNavigating, navigateCb]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{ session, user, role, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);