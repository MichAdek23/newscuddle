import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'newscuddle_auth_session';
const PENDING_EMAIL_KEY = 'newscuddle_pending_email';
const OTP_PURPOSE_KEY = 'newscuddle_otp_purpose';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.token) {
          return parsed.user;
        }
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.token || null;
      }
    } catch (e) {
      console.error('Failed to restore auth token:', e);
    }
    return null;
  });

  const [pendingEmail, setPendingEmailState] = useState(() => {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) || '';
  });

  const [otpPurpose, setOtpPurposeState] = useState(() => {
    return sessionStorage.getItem(OTP_PURPOSE_KEY); // 'account_verification' | 'password_reset'
  });

  const setPendingEmail = (email) => {
    setPendingEmailState(email);
    if (email) {
      sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    } else {
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
    }
  };

  const setOtpPurpose = (purpose) => {
    setOtpPurposeState(purpose);
    if (purpose) {
      sessionStorage.setItem(OTP_PURPOSE_KEY, purpose);
    } else {
      sessionStorage.removeItem(OTP_PURPOSE_KEY);
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'error' | 'success', message: '' }

  const showAlert = (message, type = 'error') => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 6000);
  };

  const clearAlert = () => setAlert(null);

  // Authenticate user with Go + MongoDB Atlas
  const login = async (email, password) => {
    setIsLoading(true);
    clearAlert();
    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password.');
      }

      const data = await authApi.login({ email, password });

      // If user is not verified, require OTP verification before accessing app
      if (data.requiresVerification) {
        const userEmail = data.email || email;
        setPendingEmail(userEmail);
        setOtpPurpose('account_verification');
        showAlert(data.message || 'Please verify your account with the OTP sent to your email.', 'error');
        return { requiresVerification: true, email: userEmail };
      }

      // User is verified: initialize session
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));
      showAlert('Signed in successfully!', 'success');
      return { success: true };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Register new user: strictly requires OTP verification before dashboard access
  const register = async (userData) => {
    setIsLoading(true);
    clearAlert();
    try {
      const { firstName, lastName, username, email, password, confirmPassword, agreeTerms } = userData;

      if (!firstName || !lastName || !username || !email || !password) {
        throw new Error('Please fill in all required fields.');
      }
      if (!agreeTerms) {
        throw new Error('You must accept the Terms of Service & Privacy Policy to create an account.');
      }
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const data = await authApi.register({
        firstName,
        lastName,
        username,
        email,
        password,
        confirmPassword,
      });

      // Account created -> save pending email and switch to OTP verification
      const userEmail = data.email || email;
      setPendingEmail(userEmail);
      setOtpPurpose('account_verification');
      showAlert(data.message || 'Account created! Enter the 6-digit OTP code sent to your email.', 'success');
      return { requiresVerification: true, email: userEmail };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time username availability check against MongoDB
  const checkUsernameAvailability = async (username) => {
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return { available: false, message: '' };

    try {
      return await authApi.checkUsername(clean);
    } catch (err) {
      return { available: false, valid: false, message: 'Server unavailable for username verification' };
    }
  };

  // Password reset request
  const requestPasswordReset = async (email) => {
    setIsLoading(true);
    clearAlert();
    try {
      if (!email) {
        throw new Error('Please enter your email address.');
      }

      const data = await authApi.forgotPassword(email);
      setPendingEmail(email);
      setOtpPurpose('password_reset');
      showAlert(data.message || 'A 6-digit verification code has been sent to your email.', 'success');
      return { success: true };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP for either account activation or password reset
  const verifyOtp = async (code) => {
    setIsLoading(true);
    clearAlert();
    try {
      if (!code || code.length < 6) {
        throw new Error('Please enter a valid 6-digit code.');
      }
      if (!pendingEmail) {
        throw new Error('Session email missing. Please restart the process from login or signup.');
      }

      const data = await authApi.verifyOtp({
        email: pendingEmail,
        code,
        type: otpPurpose,
      });

      // Flow 1: Account verification completed -> User is now verified and gets access to application
      if (otpPurpose === 'account_verification') {
        if (data.user && data.token) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));
        }
        showAlert('Account verified successfully! Welcome to NewsCuddle.', 'success');
        return { success: true, verified: true };
      }

      // Flow 2: Password reset OTP verified -> Proceed to set new password
      showAlert('Code verified! Please enter your new password.', 'success');
      return { success: true, proceedToReset: true };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Resend fresh OTP
  const resendOtp = async () => {
    if (!pendingEmail) {
      showAlert('No pending email address found.', 'error');
      return false;
    }
    try {
      const data = await authApi.resendOtp({
        email: pendingEmail,
        type: otpPurpose,
      });
      showAlert(data.message || 'A new verification code has been sent to ' + pendingEmail, 'success');
      return true;
    } catch (err) {
      showAlert(err.message, 'error');
      return false;
    }
  };

  // Set new password
  const resetPassword = async (newPassword, confirmPassword, code) => {
    setIsLoading(true);
    clearAlert();
    try {
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const data = await authApi.resetPassword({
        email: pendingEmail,
        code,
        newPassword,
      });

      showAlert(data.message || 'Password updated successfully! Please log in.', 'success');
      return { success: true };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign in or sign up with Google OAuth
  const googleLogin = async (payload) => {
    setIsLoading(true);
    clearAlert();
    try {
      if (!payload) {
        throw new Error('Google credential is required.');
      }
      const data = await authApi.googleAuth(payload);
      if (!data.success || !data.user || !data.token) {
        throw new Error(data.message || 'Google authentication failed.');
      }
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));
      showAlert(data.message || 'Signed in with Google!', 'success');
      return { success: true, isNewUser: data.isNewUser, user: data.user };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Live user state updater for onboarding steps and profile updates
  const updateUser = (updatedUserOrFields) => {
    setUser((prev) => {
      const merged = typeof updatedUserOrFields === 'function'
        ? updatedUserOrFields(prev)
        : { ...prev, ...updatedUserOrFields };
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, user: merged }));
      } catch (_) {}

      // Dispatch global profile synchronization event across all visual components
      try {
        window.dispatchEvent(
          new CustomEvent('newscuddle:user_profile_updated', {
            detail: { user: merged },
          })
        );
      } catch (_) {}

      return merged;
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    showAlert('You have been logged out.', 'success');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        alert,
        showAlert,
        clearAlert,
        pendingEmail,
        setPendingEmail,
        otpPurpose,
        setOtpPurpose,
        login,
        register,
        checkUsernameAvailability,
        requestPasswordReset,
        verifyOtp,
        resendOtp,
        resetPassword,
        googleLogin,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
