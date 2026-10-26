import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <OnboardingModalFlow />
        <Routes>
          {/* Main Terminal App Routes:
              Left Sidebar is constant and given across all pages.
              Right Sidebar is given on every page, but differs in contents based on page mode.
              Communities open into their own dedicated /c/:slug route.
              Post detail and threaded comments open into /c/:slug/comments/:id or /comments/:id.
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
            <Route path="/c/u/:username" element={<CommunityPage />} />
            <Route path="/u/:username" element={<CommunityPage />} />
            <Route path="/c/:slug/comments/:id" element={<PostDetailPage />} />
            <Route path="/c/u/:username/comments/:id" element={<PostDetailPage />} />
            <Route path="/u/:username/comments/:id" element={<PostDetailPage />} />
            <Route path="/comments/:id" element={<PostDetailPage />} />
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
