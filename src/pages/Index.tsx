import { useAuth } from '@/hooks/useAuth';
import Auth from './Auth';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse font-heading text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Auth />;
  if (role === 'admin') return <AdminDashboard />;
  return <StudentDashboard />;
}
