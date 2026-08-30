import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { StudentList } from './pages/admin/StudentList';
import { TeamManagement } from './pages/admin/TeamManagement';
import { RecruiterPipeline } from './pages/admin/RecruiterPipeline';
import { Reports } from './pages/admin/Reports';

import { Login } from './pages/Login';
import { LandingPage } from './pages/LandingPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route element={<DashboardLayout role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<StudentList />} />
            <Route path="/admin/team" element={<TeamManagement />} />
            <Route path="/admin/recruiters" element={<RecruiterPipeline />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </Route>
          
          {/* Manager Routes */}
          <Route element={<DashboardLayout role="manager" />}>
            <Route path="/manager" element={<AdminDashboard />} />
            <Route path="/manager/students" element={<StudentList />} />
            <Route path="/manager/team" element={<TeamManagement />} />
            <Route path="/manager/recruiters" element={<RecruiterPipeline />} />
            <Route path="/manager/reports" element={<Reports />} />
            <Route path="/manager/*" element={<Navigate to="/manager" replace />} />
          </Route>

          {/* Placement Lead Routes */}
          <Route element={<DashboardLayout role="placement_lead" />}>
            <Route path="/placement_lead" element={<AdminDashboard />} />
            <Route path="/placement_lead/students" element={<StudentList />} />
            <Route path="/placement_lead/team" element={<TeamManagement />} />
            <Route path="/placement_lead/recruiters" element={<RecruiterPipeline />} />
            <Route path="/placement_lead/reports" element={<Reports />} />
            <Route path="/placement_lead/*" element={<Navigate to="/placement_lead" replace />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
