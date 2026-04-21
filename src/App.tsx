import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors, 404s, or 403s
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * (2 ** attemptIndex), 5000),
      staleTime: 0, // Always fetch fresh data on mount
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true, // Refetch when component mounts or query becomes enabled
    },
  },
});

// 👇 Move AuthProvider INSIDE router context
const RootLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <Index />,
        errorElement: <NotFound />,
      },
      {
        path: "/login",
        element: <Auth />,
      },
      {
        path: "/admin",
        element: <AdminDashboard />,
      },
      {
        path: "/student",
        element: <StudentDashboard />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
