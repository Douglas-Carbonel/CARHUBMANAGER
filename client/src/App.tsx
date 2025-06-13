
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Services from "@/pages/services";
import Customers from "@/pages/customers";
import Vehicles from "@/pages/vehicles";
import Schedule from "@/pages/schedule";
import Reports from "@/pages/reports";
import Admin from "@/pages/admin";
import NotFoundPage from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthGuard } from "@/lib/auth-guard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/">
            <AuthGuard />
          </Route>
          <Route path="/auth" component={AuthPage} />
          <Route path="/dashboard">
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/services">
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          </Route>
          <Route path="/customers">
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          </Route>
          <Route path="/vehicles">
            <ProtectedRoute>
              <Vehicles />
            </ProtectedRoute>
          </Route>
          <Route path="/schedule">
            <ProtectedRoute>
              <Schedule />
            </ProtectedRoute>
          </Route>
          <Route path="/reports">
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          </Route>
          <Route path="/admin">
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          </Route>
          <Route component={NotFoundPage} />
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
