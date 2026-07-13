import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';

import { AuthProvider } from '@/contexts/auth-context';
import { OfflineProvider } from '@/contexts/offline-context';
import { GpsProvider } from '@/contexts/gps-context';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import Login from '@/pages/Login';
import DriverDutySelect from '@/pages/driver/DriverDutySelect';
import ActiveDuty from '@/pages/driver/ActiveDuty';
import DutyComplete from '@/pages/driver/DutyComplete';
import Dashboard from '@/pages/admin/Dashboard';
import Reports from '@/pages/admin/Reports';
import AdminOverview from '@/pages/admin/AdminOverview';
import Drivers from '@/pages/admin/Drivers';
import Vehicles from '@/pages/admin/Vehicles';
import Duties from '@/pages/admin/Duties';
import Stops from '@/pages/admin/Stops';
import Timetables from '@/pages/admin/Timetables';
import Users from '@/pages/admin/Users';
import AuditLog from '@/pages/admin/AuditLog';
import Settings from '@/pages/admin/Settings';
import Unauthorized from '@/pages/Unauthorized';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/unauthorized" component={Unauthorized} />

      {/* Driver Routes */}
      <Route path="/driver">
        <ProtectedRoute allowedRoles={['driver']}>
          <DriverDutySelect />
        </ProtectedRoute>
      </Route>
      <Route path="/driver/duty/:dutyId">
        <ProtectedRoute allowedRoles={['driver']}>
          <ActiveDuty />
        </ProtectedRoute>
      </Route>
      <Route path="/driver/complete">
        <ProtectedRoute allowedRoles={['driver']}>
          <DutyComplete />
        </ProtectedRoute>
      </Route>

      {/* Admin Routes */}
      <Route path="/dashboard">
        <ProtectedRoute allowedRoles={['admin']}>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute allowedRoles={['admin']}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminOverview />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/drivers">
        <ProtectedRoute allowedRoles={['admin']}>
          <Drivers />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/vehicles">
        <ProtectedRoute allowedRoles={['admin']}>
          <Vehicles />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/duties">
        <ProtectedRoute allowedRoles={['admin']}>
          <Duties />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/stops">
        <ProtectedRoute allowedRoles={['admin']}>
          <Stops />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/timetables">
        <ProtectedRoute allowedRoles={['admin']}>
          <Timetables />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={['admin']}>
          <Users />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/audit-log">
        <ProtectedRoute allowedRoles={['admin']}>
          <AuditLog />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute allowedRoles={['admin']}>
          <Settings />
        </ProtectedRoute>
      </Route>

      {/* Redirect root to login */}
      <Route path="/">
        <Redirect to="/login" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineProvider>
          <GpsProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <Router />
              </WouterRouter>
              <Toaster position="top-center" richColors theme="dark" />
            </TooltipProvider>
          </GpsProvider>
        </OfflineProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
