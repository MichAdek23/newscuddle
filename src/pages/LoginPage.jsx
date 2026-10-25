import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SocialAuthButton } from '../components/SocialAuthButton';
import { triggerGoogleAuth } from '../services/googleAuth';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const LoginPage = () => {
  const { login, googleLogin, isLoading, alert, showAlert } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showAlert('Please enter your email address or username.', 'error');
      return;
    }
    if (!password) {
      showAlert('Please enter your password.', 'error');
      return;
    }
    const result = await login(email, password);
    if (result?.requiresVerification) {
      navigate('/verify-otp');
    } else if (result?.success) {
      navigate('/');
    }
  };

  const handleGoogleLogin = () => {
    try {
      triggerGoogleAuth({
        onToken: async (payload) => {
          const res = await googleLogin(payload);
          if (res?.success) {
            navigate('/');
          }
        },
        onError: (errMsg) => {
          showAlert(errMsg || 'Google sign-in was interrupted.', 'error');
        },
      });
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  return (
    <div className="auth-form-container">
      {/* Editorial Serif Heading matching design.png */}
      <h2 className="auth-heading">Log in to your account</h2>
      
      <div className="auth-subheading">
        <span>Don't have an account?</span>
        <Link to="/signup" className="auth-link" id="link-to-register">
          Sign Up
        </Link>
      </div>

      {/* Alert banner if error or success */}
      {alert && (
        <div className={`form-alert ${alert.type}`}>
          {alert.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Google Login Button */}
      <SocialAuthButton
        label="Log in with Google"
        onClick={handleGoogleLogin}
      />

      {/* Divider */}
      <div className="auth-divider">
        <span>or with email and password</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">
            EMAIL ADDRESS OR USERNAME
          </label>
          <div className="input-wrapper">
            <input
              id="login-email"
              type="text"
              className="form-input"
              placeholder="name@company.com or @username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label className="form-label" htmlFor="login-password">
              PASSWORD
            </label>
            <Link
              to="/forgot-password"
              className="form-label-link"
              id="link-forgot-password"
            >
              Forgot password?
            </Link>
          </div>
          <div className="input-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input has-suffix"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="input-suffix-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              id="toggle-login-password"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="form-checkbox-row">
          <input
            type="checkbox"
            id="remember-me"
            className="custom-checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label htmlFor="remember-me" style={{ cursor: 'pointer' }}>
            Keep me logged in on this browser
          </label>
        </div>

        {/* Primary Action Button */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          id="btn-login-submit"
        >
          <span>{isLoading ? 'Signing in...' : 'Next'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      {/* Footer */}
      <div className="auth-footer">
        © 2026 NewsCuddle Inc.
      </div>
    </div>
  );
};
