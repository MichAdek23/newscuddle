import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SocialAuthButton } from '../components/SocialAuthButton';
import { triggerGoogleAuth } from '../services/googleAuth';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export const RegisterPage = () => {
  const { register, googleLogin, checkUsernameAvailability, isLoading, alert, showAlert } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false, // Must explicitly be accepted before sign up
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Username validation and availability state
  const [usernameStatus, setUsernameStatus] = useState({
    isChecking: false,
    checked: false,
    available: null,
    valid: true,
    message: '',
  });

  const debounceTimerRef = useRef(null);

  // Real-time username verification with debouncing
  useEffect(() => {
    const rawUsername = formData.username.trim().replace(/^@/, '');

    if (!rawUsername) {
      setUsernameStatus({
        isChecking: false,
        checked: false,
        available: null,
        valid: true,
        message: '',
      });
      return;
    }

    // Check for special characters (only letters and numbers allowed)
    const hasSpecialChars = !/^[a-zA-Z0-9]+$/.test(rawUsername);
    if (hasSpecialChars) {
      setUsernameStatus({
        isChecking: false,
        checked: true,
        available: false,
        valid: false,
        message: 'No special characters allowed. Use letters and numbers only.',
      });
      return;
    }

    if (rawUsername.length < 3) {
      setUsernameStatus({
        isChecking: false,
        checked: true,
        available: false,
        valid: false,
        message: 'Username must be at least 3 characters',
      });
      return;
    }

    setUsernameStatus((prev) => ({ ...prev, isChecking: true, message: 'Checking availability...' }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const result = await checkUsernameAvailability(rawUsername);
      setUsernameStatus({
        isChecking: false,
        checked: true,
        available: result.available,
        valid: result.valid !== false,
        message: result.message || (result.available ? 'Username is available' : 'Username is taken'),
      });
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData.username]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      showAlert('Please enter both your first and last name.', 'error');
      return;
    }

    const cleanUsername = formData.username.trim().replace(/^@/, '');
    if (!cleanUsername) {
      showAlert('Please choose a username.', 'error');
      return;
    }

    // Enforce no special characters
    if (!/^[a-zA-Z0-9]+$/.test(cleanUsername)) {
      showAlert('Username cannot contain special characters. Only letters and numbers are permitted.', 'error');
      return;
    }

    if (usernameStatus.available === false) {
      showAlert(usernameStatus.message || 'Please choose an available username.', 'error');
      return;
    }

    if (!formData.email.trim()) {
      showAlert('Please enter your email address.', 'error');
      return;
    }

    if (formData.password.length < 6) {
      showAlert('Password must be at least 6 characters.', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showAlert('Passwords do not match.', 'error');
      return;
    }

    // Enforce Terms & Conditions acceptance
    if (!formData.agreeTerms) {
      showAlert('You must accept the Terms of Service & Privacy Policy before creating an account.', 'error');
      return;
    }

    const result = await register(formData);
    if (result?.requiresVerification) {
      navigate('/verify-otp');
    }
  };

  const handleGoogleSignUp = () => {
    try {
      triggerGoogleAuth({
        onToken: async (payload) => {
          const res = await googleLogin(payload);
          if (res?.success) {
            navigate('/');
          }
        },
        onError: (errMsg) => {
          showAlert(errMsg || 'Google sign-up was interrupted.', 'error');
        },
      });
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  return (
    <div className="auth-form-container">
      {/* Editorial Serif Heading matching design2.png */}
      <h2 className="auth-heading">Create your account</h2>
      
      <div className="auth-subheading">
        <span>Already have an account?</span>
        <Link to="/login" className="auth-link" id="link-to-login">
          Sign In
        </Link>
      </div>

      {/* Alert banner */}
      {alert && (
        <div className={`form-alert ${alert.type}`}>
          {alert.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Google Sign Up Button */}
      <SocialAuthButton
        label="Sign up with Google"
        onClick={handleGoogleSignUp}
      />

      {/* Divider */}
      <div className="auth-divider">
        <span>or with email and password</span>
      </div>

      {/* Registration Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* First Name & Last Name Grid */}
        <div className="form-group form-grid-2">
          <div>
            <label className="form-label" htmlFor="register-firstName">
              FIRST NAME
            </label>
            <input
              id="register-firstName"
              name="firstName"
              type="text"
              className="form-input"
              placeholder="Adeleke"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="register-lastName">
              LAST NAME
            </label>
            <input
              id="register-lastName"
              name="lastName"
              type="text"
              className="form-input"
              placeholder="Adeoye"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Username with @ prefix & Real-time availability indicator */}
        <div className="form-group">
          <label className="form-label" htmlFor="register-username">
            USERNAME *
          </label>
          <div className="input-wrapper">
            <span className="input-prefix">@</span>
            <input
              id="register-username"
              name="username"
              type="text"
              className={`form-input has-prefix ${
                usernameStatus.checked && !usernameStatus.isChecking
                  ? usernameStatus.available
                    ? 'border-success'
                    : 'border-error'
                  : ''
              }`}
              placeholder="adelekepaul"
              value={formData.username}
              onChange={handleChange}
              autoComplete="off"
              required
            />
            {usernameStatus.isChecking && (
              <span className="input-suffix-btn" style={{ pointerEvents: 'none' }}>
                <Loader2 size={15} className="spin-animation" color="#008751" />
              </span>
            )}
            {!usernameStatus.isChecking && usernameStatus.checked && (
              <span className="input-suffix-btn" style={{ pointerEvents: 'none' }}>
                {usernameStatus.available ? (
                  <CheckCircle2 size={16} color="#008751" />
                ) : (
                  <XCircle size={16} color="#dc2626" />
                )}
              </span>
            )}
          </div>

          {/* Real-time username feedback message */}
          {usernameStatus.message && (
            <div
              style={{
                fontSize: '0.75rem',
                marginTop: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: usernameStatus.available ? '#008751' : '#dc2626',
                fontWeight: 500,
              }}
            >
              <span>{usernameStatus.message}</span>
            </div>
          )}
        </div>

        {/* Email Address */}
        <div className="form-group">
          <label className="form-label" htmlFor="register-email">
            EMAIL ADDRESS
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            className="form-input"
            placeholder="name@company.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        {/* Password & Confirm Password Grid */}
        <div className="form-group form-grid-2">
          <div>
            <label className="form-label" htmlFor="register-password">
              PASSWORD
            </label>
            <div className="input-wrapper">
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input has-suffix"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="input-suffix-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label" htmlFor="register-confirmPassword">
              CONFIRM PASSWORD
            </label>
            <div className="input-wrapper">
              <input
                id="register-confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input has-suffix"
                placeholder="••••••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="input-suffix-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mandatory Terms of Service Checkbox */}
        <div className="form-checkbox-row" style={{ alignItems: 'center' }}>
          <input
            type="checkbox"
            id="register-terms"
            name="agreeTerms"
            className="custom-checkbox"
            checked={formData.agreeTerms}
            onChange={handleChange}
            required
          />
          <label htmlFor="register-terms" style={{ cursor: 'pointer', fontSize: '0.84rem' }}>
            I agree to the{' '}
            <span className="auth-link">Terms of Service</span> &amp;{' '}
            <span className="auth-link">Privacy Policy</span>{' '}
            <span style={{ color: '#dc2626' }}>*</span>
          </label>
        </div>

        {/* Primary Action Button */}
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !formData.agreeTerms}
          id="btn-register-submit"
        >
          <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
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


