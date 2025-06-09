
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Router, Route, Switch } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/lib/protected-route";
import { AuthGuard } from "@/lib/auth-guard";

// Import pages
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import CustomersPage from "@/pages/customers";
import VehiclesPage from "@/pages/vehicles";
import ServicesPage from "@/pages/services";
import SchedulePage from "@/pages/schedule";
import ReportsPage from "@/pages/reports";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router>
            <Switch>
              {/* Root route - shows auth page if not authenticated, redirects to dashboard if authenticated */}
              <Route path="/">
                <AuthGuard />
              </Route>
              
              {/* Auth route - only accessible when not authenticated */}
              <Route path="/auth">
                <AuthPage />
              </Route>
              
              {/* Protected routes */}
              <Route path="/dashboard">
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/customers">
                <ProtectedRoute>
                  <CustomersPage />
                </ProtectedRoute>
              </Route>
              <Route path="/vehicles">
                <ProtectedRoute>
                  <VehiclesPage />
                </ProtectedRoute>
              </Route>
              <Route path="/services">
                <ProtectedRoute>
                  <ServicesPage />
                </ProtectedRoute>
              </Route>
              <Route path="/schedule">
                <ProtectedRoute>
                  <SchedulePage />
                </ProtectedRoute>
              </Route>
              <Route path="/reports">
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              </Route>
              <Route path="/admin">
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              </Route>
              
              {/* 404 page */}
              <Route component={NotFound} />
            </Switch>
          </Router>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
