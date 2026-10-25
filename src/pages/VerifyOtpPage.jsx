import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const VerifyOtpPage = () => {
  const { verifyOtp, resendOtp, pendingEmail, otpPurpose, isLoading, alert } = useAuth();
  const navigate = useNavigate();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(45);
  const inputRefs = useRef([]);

  const isAccountVerification = otpPurpose === 'account_verification';

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (index, value) => {
    const val = value.slice(-1);
    if (!/^[0-9]?$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const splitDigits = pasteData.split('');
      setDigits(splitDigits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    const result = await verifyOtp(code);

    if (result?.verified) {
      // Flow 1: Account activation completed -> Grant access to home
      navigate('/');
    } else if (result?.proceedToReset) {
      // Flow 2: Password reset verification completed -> Proceed to /reset-password
      navigate('/reset-password');
    }
  };

  const handleResend = async () => {
    if (resendTimer === 0 && pendingEmail) {
      const success = await resendOtp();
      if (success) {
        setResendTimer(45);
      }
    }
  };

  return (
    <div className="auth-form-container">
      <h2 className="auth-heading">
        {isAccountVerification ? 'Verify your account' : 'Verify reset code'}
      </h2>

      <p className="auth-description">
        {isAccountVerification
          ? 'Enter the 6-digit confirmation code sent to '
          : 'Enter the 6-digit code sent to '}
        <strong>{pendingEmail || 'your email address'}</strong>
        {isAccountVerification ? ' to activate your account and enter the platform.' : ' to reset your password.'}
      </p>

      {alert && (
        <div className={`form-alert ${alert.type}`}>
          {alert.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* 6 Digit Inputs */}
        <div className="otp-container" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="otp-box"
              required
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.84rem' }}>
          {resendTimer > 0 ? (
            <span style={{ color: '#64748b' }}>
              Resend code in <strong>{resendTimer}s</strong>
            </span>
          ) : (
            <button
              type="button"
              className="auth-link"
              onClick={handleResend}
            >
              Resend verification code
            </button>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || digits.join('').length < 6}
          id="btn-verify-otp"
        >
          <span>
            {isLoading
              ? 'Verifying...'
              : isAccountVerification
              ? 'Verify & Access Application'
              : 'Verify Code'}
          </span>
          <ArrowRight size={16} />
        </button>
      </form>

      <div className="auth-footer">
        © 2026 NewsCuddle Inc.
      </div>
    </div>
  );
};
