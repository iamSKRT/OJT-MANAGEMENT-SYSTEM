import { memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle } from 'lucide-react';
import Auth from './Auth';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';

export default memo(function Index() {
  const { user, role, loading: authLoading } = useAuth();

  // Show auth screen if not logged in
  if (!user) {
    return <Auth />;
  }

  // Show unified loading during auth (no more timeout hacks)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="font-heading text-xl font-semibold text-muted-foreground">Loading Dashboard...</div>
          <p className="text-sm text-muted-foreground">Authenticating</p>
        </div>
      </div>
    );
  }

  // Render dashboard with ErrorBoundary
  return (
    <ErrorBoundary>
      {role === 'admin' ? <AdminDashboard /> : <StudentDashboard />}
    </ErrorBoundary>
  );
});

