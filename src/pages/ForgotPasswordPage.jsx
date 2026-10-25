import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const { requestPasswordReset, isLoading, alert, showAlert } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showAlert('Please enter your email address.', 'error');
      return;
    }
    const result = await requestPasswordReset(email);
    if (result?.success) {
      navigate('/verify-otp');
    }
  };

  return (
    <div className="auth-form-container">
      <h2 className="auth-heading">Reset your password</h2>
      <p className="auth-description">
        Enter your work email address and we will send a 6-digit verification code.
      </p>

      {alert && (
        <div className={`form-alert ${alert.type}`}>
          {alert.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="forgot-email">
            EMAIL ADDRESS
          </label>
          <input
            id="forgot-email"
            type="email"
            className="form-input"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          style={{ marginTop: '1.5rem' }}
          id="btn-send-reset-code"
        >
          <span>{isLoading ? 'Sending Code...' : 'Send Verification Code'}</span>
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="auth-footer">
        © 2026 NewsCuddle Inc.
      </div>
    </div>
  );
};
