import { Route, Routes } from 'react-router-dom';
import { HackathonDetails, HackathonDirectory } from './pages/Hackathons';
import { AuthPage, BookmarksPage, NotificationsPage, StudentDashboard } from './pages/Student';
import { LandingPage } from './pages/Landing';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminPage } from './pages/AdminPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login"    element={<AuthPage key="login"    mode="login"    />} />
      <Route path="/register" element={<AuthPage key="register" mode="register" />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected routes — require authentication */}
      <Route
        path="/hackathons"
        element={
          <ProtectedRoute>
            <HackathonDirectory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hackathons/:slug"
        element={
          <ProtectedRoute>
            <HackathonDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookmarks"
        element={
          <ProtectedRoute>
            <BookmarksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      {/* 404 catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
