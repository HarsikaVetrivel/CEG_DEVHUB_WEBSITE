import { Route, Routes } from 'react-router-dom';
import { HackathonDetails, HackathonDirectory } from './pages/Hackathons';
import { AuthPage, BookmarksPage, NotificationsPage, StudentDashboard } from './pages/Student';
import { LandingPage } from './pages/Landing';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminHome } from './pages/AdminPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { ParticipationsPage } from './pages/ParticipationsPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { RankingsPage } from './pages/RankingsPage';
import { TeammatesPage } from './pages/TeammatesPage';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/"               element={<LandingPage />} />
      <Route path="/login"          element={<AuthPage key="login"    mode="login"    />} />
      <Route path="/register"       element={<AuthPage key="register" mode="register" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/admin/login"    element={<AdminLoginPage />} />
      {/* Public leaderboard */}
      <Route path="/rankings"       element={<RankingsPage />} />

      {/* Protected routes — require authentication */}
      <Route path="/hackathons"     element={<ProtectedRoute><HackathonDirectory /></ProtectedRoute>} />
      <Route path="/hackathons/:slug" element={<ProtectedRoute><HackathonDetails /></ProtectedRoute>} />
      <Route path="/dashboard"      element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/bookmarks"      element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
      <Route path="/notifications"  element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/participations" element={<ProtectedRoute><ParticipationsPage /></ProtectedRoute>} />
      <Route path="/achievements"   element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
      <Route path="/teammates"      element={<ProtectedRoute><TeammatesPage /></ProtectedRoute>} />

      <Route path="/admin" element={<AdminRoute><AdminHome /></AdminRoute>} />

      {/* 404 catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
