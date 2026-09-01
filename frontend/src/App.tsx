import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { StudentList } from './pages/admin/StudentList';
import { TeamManagement } from './pages/admin/TeamManagement';
import { RecruiterPipeline } from './pages/admin/RecruiterPipeline';
import { Reports } from './pages/admin/Reports';
import Approvals from './pages/approvals/Approvals';

import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';
import { Settings } from './pages/admin/Settings';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { VerifyOtp } from './pages/auth/VerifyOtp';
import { ResetPassword } from './pages/auth/ResetPassword';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Admin Routes */}
          <Route element={<DashboardLayout role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentList />} />
            <Route path="/admin/team" element={<TeamManagement />} />
            <Route path="/admin/recruiters" element={<RecruiterPipeline />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/approvals" element={<Approvals />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Route>
          
          {/* Manager Routes */}
          <Route element={<DashboardLayout role="manager" />}>
            <Route path="/manager" element={<AdminDashboard />} />
            <Route path="/manager/students" element={<StudentList />} />
            <Route path="/manager/team" element={<TeamManagement />} />
            <Route path="/manager/recruiters" element={<RecruiterPipeline />} />
            <Route path="/manager/reports" element={<Reports />} />
            <Route path="/manager/approvals" element={<Approvals />} />
            <Route path="/manager/settings" element={<Settings />} />
            <Route path="/manager/*" element={<Navigate to="/manager" replace />} />
          </Route>

          {/* Placement Lead Routes */}
          <Route element={<DashboardLayout role="placement_lead" />}>
            <Route path="/placement_lead" element={<AdminDashboard />} />
            <Route path="/placement_lead/students" element={<StudentList />} />
            <Route path="/placement_lead/team" element={<TeamManagement />} />
            <Route path="/placement_lead/recruiters" element={<RecruiterPipeline />} />
            <Route path="/placement_lead/reports" element={<Reports />} />
            <Route path="/placement_lead/settings" element={<Settings />} />
            <Route path="/placement_lead/*" element={<Navigate to="/placement_lead" replace />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
