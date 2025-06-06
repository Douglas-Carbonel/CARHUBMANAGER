import { Router, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/useAuth";

import Dashboard from "./pages/dashboard";
import AuthPage from "./pages/auth-page";
import CustomersPage from "./pages/customers";
import VehiclesPage from "./pages/vehicles";
import ServicesPage from "./pages/services";
import SchedulePage from "./pages/schedule";
import ReportsPage from "./pages/reports";
import NotFound from "./pages/not-found";
import LandingPage from "./pages/landing";
import { ProtectedRoute } from "./lib/protected-route";

import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <Switch>
              <Route path="/" component={AuthPage} />
              <Route path="/auth" component={AuthPage} />
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
              <Route component={NotFound} />
            </Switch>
          </Router>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;