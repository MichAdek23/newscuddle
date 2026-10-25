import React from 'react';
import { Outlet } from 'react-router-dom';
import { BrandHero } from './BrandHero';

export const AuthLayout = ({ children }) => {
  return (
    <div className="auth-split-layout">
      {/* Left Form Panel */}
      <div className="auth-form-side">
        {children || <Outlet />}
      </div>

      {/* Right Pure Emerald Fluid Canvas (Clean without text or extra designs) */}
      <BrandHero />
    </div>
  );
};
