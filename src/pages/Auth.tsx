import { useState, useEffect } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, ArrowRight, Mail, Lock, User, Clock } from 'lucide-react';
import Footer from '@/components/Footer';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [totalRequiredHours, setTotalRequiredHours] = useState('600');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let link = document.querySelector('link[rel~="icon"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = '/graduate-hat.png';

    return () => {
      const links = document.querySelectorAll('link[rel~="icon"]');
      links.forEach(l => l.remove());
      const defaultFavicon = document.createElement('link');
      defaultFavicon.rel = 'icon';
      defaultFavicon.href = '/graduate-hat.png';
      defaultFavicon.type = 'image/png';
      document.head.appendChild(defaultFavicon);
    };
  }, []);

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      const metaData = {
        full_name: fullName,
        total_required_hours: totalRequiredHours
      };
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metaData },
      });
      if (signupError) {
        toast({ title: 'Signup failed', description: signupError.message, variant: 'destructive' });
      } else {
        // Auto login after successful signup
        const { error: signinError } = await supabase.auth.signInWithPassword({ email, password });
        if (signinError) {
          toast({ title: 'Account created! Please log in manually.', description: signinError.message, variant: 'destructive' });
          setIsLogin(true);
        } else {
          // Explicitly ensure profile has correct total_required_hours
          const hoursNum = Number(totalRequiredHours);
          if (!isNaN(hoursNum) && hoursNum > 0 && fullName.trim()) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
              const profileData: ProfileInsert = {
                user_id: session.user.id,
                full_name: fullName.trim(),
                total_required_hours: hoursNum,
                is_archived: false,
              };
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert(profileData, { onConflict: 'user_id' });
              if (profileError) {
                toast({ 
                  title: 'Profile save issue', 
                  description: profileError.message, 
                  variant: 'destructive' 
                });
              }
            }
          }
          toast({ title: 'Account created & logged in successfully!', description: `Total hours set to ${totalRequiredHours}. Refreshing dashboard...` });
          // Reload to ensure fresh profile fetch
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: '0 8px 30px hsl(250 85% 60% / 0.3)' }}>
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">OJT Management System</h1>
          <p className="text-muted-foreground mt-1"></p>
        </div>

        <Card className="animate-scale-in border-0 shadow-xl" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-xl text-center">{isLogin ? 'Welcome back' : 'Create account'}</CardTitle>
<CardDescription className="text-center">
  {isLogin 
    ? "Sign in to continue tracking your progress" 
    : "Get started with your OJT reporting"
  }
</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-10 h-11"
                  />
                </div>
              )}
              {!isLogin && (
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    max="5000"
                    step="1"
                    placeholder="Total OJT hours required (e.g. 600)"
                    value={totalRequiredHours}
                    onChange={(e) => setTotalRequiredHours(e.target.value)}
                    required
                    className="pl-10 h-11"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 font-semibold text-sm" disabled={loading}>
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-semibold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <Footer />
      </div>
    </div>
  );
}
