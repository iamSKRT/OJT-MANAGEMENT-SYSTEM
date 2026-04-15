import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

type AppRole = 'admin' | 'student';

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
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const navigateCb = useCallback((to: string, opts?: { replace?: boolean }) => {
    navigate(to, opts);
  }, [navigate]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      
      if (newSession?.user) {
        const userEmail = newSession.user.email;
    // console.log('📧 Auth email:', userEmail);
        
        if (userEmail?.toLowerCase() === 'alvarezchristiandave059@gmail.com') {
          // console.log('🟢 ADMIN EMAIL MATCH - setting admin');
          setRole('admin' as AppRole);
        } else {
          try {
            const { data, error } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', newSession.user.id)
              .maybeSingle();

            if (error) throw error;

            const roles = data ? [data.role] : [];
            const roleToSet = roles.includes('admin') ? 'admin' : (roles[0] ?? 'student');
            setRole(roleToSet as AppRole);
          } catch {
            // console.log('DB role fetch failed, default student');
            setRole('student' as AppRole);
          }
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Guard against infinite redirect loops
    if (isNavigating || !role || !session?.user || loading || pathname.startsWith(`/${role}`)) {
      return;
    }

    const target = `/${role}`;
    setIsNavigating(true);
    navigateCb(target, { replace: true });
    // Reset after short delay to allow navigation
    setTimeout(() => setIsNavigating(false), 100);
  }, [role, session?.user, loading, pathname, navigateCb, isNavigating]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
