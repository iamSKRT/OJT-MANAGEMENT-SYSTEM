import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, ArrowRight, Mail, Lock, User, Clock, Eye, EyeOff } from 'lucide-react';
import Footer from '@/components/Footer';

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [totalRequiredHours, setTotalRequiredHours] = useState('600');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      if (error) {
        toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
        setLoading(false);
      } else {
        // Navigation will be handled by AuthProvider
        toast({ title: 'Login successful!', description: 'Redirecting to dashboard...' });
      }
    } else {
      // Validate passwords match
      if (password !== confirmPassword) {
        toast({ title: 'Passwords do not match', description: 'Please make sure both passwords are the same', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Validate password length
      if (password.length < 6) {
        toast({ title: 'Password too short', description: 'Password must be at least 6 characters long', variant: 'destructive' });
        setLoading(false);
        return;
      }

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
        setLoading(false);
      } else {
        // Account created successfully
        toast({ title: 'Account created successfully!', description: 'Please log in with your credentials.', variant: 'default' });
        
        // Switch to login mode and clear form
        setIsLogin(true);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setTotalRequiredHours('600');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setLoading(false);
      }
    }
  };

  return (
   <div className="min-h-screen flex items-center justify-center bg-background p-4 pb-24 relative overflow-hidden">
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

       <Card className="animate-scale-in border shadow-xl rounded-2xl overflow-hidden">
              <CardHeader className="pt-6 pb-2 px-6">
            <CardTitle className="font-heading text-xl text-center leading-tight">{isLogin ? 'Welcome back' : 'Create account'}</CardTitle>
<CardDescription className="text-center text-sm mt-1">
  {isLogin 
    ? "Sign in to continue tracking your progress" 
    : "Get started with your OJT reporting"
  }
</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4">
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
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isLogin && (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}
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
                onClick={() => {
                  setIsLogin(!isLogin);
                  // Reset form fields when switching modes
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setFullName('');
                  setTotalRequiredHours('600');
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                className="text-primary font-semibold hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
     <div className="absolute bottom-0 left-0 right-0 w-full">
  <Footer />
</div>
    </div>
  );
}
