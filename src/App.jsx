import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthLayout } from './components/AuthLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { MainLayout } from './components/layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { PopularPage } from './pages/PopularPage';
import { NewsPage } from './pages/NewsPage';
import { ExplorePage } from './pages/ExplorePage';
import { CommunityPage } from './pages/CommunityPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SavedPostsPage } from './pages/SavedPostsPage';
import { SettingsPage } from './pages/SettingsPage';
import { OnboardingModalFlow } from './components/onboarding/OnboardingModalFlow';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Only Route Guard (prevents logged in users from seeing login again)
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Legacy Post Redirect (transparently forwards legacy /comments/:id URLs into /post/:id)
const LegacyPostRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/post/${id}`} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OnboardingModalFlow />
        <Routes>
          {/* Main Terminal App Routes:
              Left Sidebar is constant and given across all pages.
              Right Sidebar is given on home/popular/community/post-detail, but empty on user profiles, saved posts, and settings.
              Communities open into their own dedicated /c/:slug route.
              User profile opens into /u/:username.
              Post detail and threaded comments open into /post/:id.
          */}
          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/popular" element={<PopularPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/c/:slug" element={<CommunityPage />} />

            {/* User Profile Routes in Main Feed (No Right Sidebar) */}
            <Route path="/u/:username" element={<UserProfilePage />} />
            <Route path="/user/:username" element={<UserProfilePage />} />
            <Route path="/c/u/:username" element={<UserProfilePage />} />

            {/* Saved Posts Route in Main Feed (No Right Sidebar) */}
            <Route path="/saved" element={<SavedPostsPage />} />
            <Route path="/saved-posts" element={<SavedPostsPage />} />

            {/* Account Settings Route in Main Feed (No Right Sidebar) */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/preferences" element={<SettingsPage />} />

            {/* Canonical Post Detail Route */}
            <Route path="/post/:id" element={<PostDetailPage />} />
            <Route path="/p/:id" element={<PostDetailPage />} />

            {/* Transparent Redirects for legacy comment URLs */}
            <Route path="/c/:slug/comments/:id" element={<LegacyPostRedirect />} />
            <Route path="/c/u/:username/comments/:id" element={<LegacyPostRedirect />} />
            <Route path="/u/:username/comments/:id" element={<LegacyPostRedirect />} />
            <Route path="/comments/:id" element={<LegacyPostRedirect />} />

            <Route path="/n/create" element={<CreatePostPage />} />
          </Route>

          {/* Auth Pages with Split Layout (Form on Left, Clean Emerald Canvas on Right) */}
          <Route element={<AuthLayout />}>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            {/* Alias /register to /signup */}
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <RegisterPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
