import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ResetPasswordPage = () => {
  const { resetPassword, isLoading, alert, showAlert } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      showAlert('Password must be at least 6 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Passwords do not match.', 'error');
      return;
    }
    const result = await resetPassword(password, confirmPassword);
    if (result?.success) {
      navigate('/login');
    }
  };

  return (
    <div className="auth-form-container">
      <h2 className="auth-heading">Set new password</h2>
      <p className="auth-description">
        Please enter and confirm your new secure password.
      </p>

      {alert && (
        <div className={`form-alert ${alert.type}`}>
          {alert.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="reset-new-password">
            NEW PASSWORD
          </label>
          <div className="input-wrapper">
            <input
              id="reset-new-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input has-suffix"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="input-suffix-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="reset-confirm-password">
            CONFIRM NEW PASSWORD
          </label>
          <div className="input-wrapper">
            <input
              id="reset-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input has-suffix"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          style={{ marginTop: '1.25rem' }}
          id="btn-update-password"
        >
          <span>{isLoading ? 'Updating Password...' : 'Update Password'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="auth-footer">
        © 2026 NewsCuddle Inc.
      </div>
    </div>
  );
};
