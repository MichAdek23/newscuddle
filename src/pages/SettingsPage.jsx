import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userApi, feedApi, formatMediaUrl } from '../services/api';
import {
  SlidersHorizontal,
  User,
  Lock,
  Shield,
  Bell,
  Check,
  Save,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  UploadCloud,
  Camera,
  Trash2,
} from 'lucide-react';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'preferences'

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [bio, setBio] = useState(user?.bio || user?.about || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(user?.bannerUrl || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const avatarFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Preferences State
  const [defaultFeed, setDefaultFeed] = useState('home');
  const [autoplayMedia, setAutoplayMedia] = useState(true);
  const [notifyOnReplies, setNotifyOnReplies] = useState(true);
  const [prefSavedMsg, setPrefSavedMsg] = useState('');

  useEffect(() => {
    if (user) {
      if (user.firstName) setFirstName(user.firstName);
      if (user.lastName) setLastName(user.lastName);
      if (user.bio || user.about) setBio(user.bio || user.about);
      if (user.avatarUrl) setAvatarUrl(user.avatarUrl);
      if (user.bannerUrl) setBannerUrl(user.bannerUrl);
    }
  }, [user]);

  // Handle Local Device Upload for Avatar
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    setProfileErrorMsg('');
    try {
      const res = await feedApi.uploadMedia(file);
      if (res && res.url) {
        setAvatarUrl(res.url);
        setProfileSuccessMsg('Profile photo uploaded from device!');
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      } else {
        throw new Error(res?.message || 'Failed to upload photo from device');
      }
    } catch (err) {
      setProfileErrorMsg(err.message || 'Avatar upload failed');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  // Handle Local Device Upload for Banner
  const handleBannerFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    setProfileErrorMsg('');
    try {
      const res = await feedApi.uploadMedia(file);
      if (res && res.url) {
        setBannerUrl(res.url);
        setProfileSuccessMsg('Profile banner uploaded from device!');
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      } else {
        throw new Error(res?.message || 'Failed to upload banner from device');
      }
    } catch (err) {
      setProfileErrorMsg(err.message || 'Banner upload failed');
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');
    setIsSavingProfile(true);

    try {
      const res = await userApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        about: bio.trim(),
        avatarUrl: avatarUrl ? avatarUrl.trim() : 'REMOVE',
        bannerUrl: bannerUrl ? bannerUrl.trim() : 'REMOVE',
      });

      if (res && res.success) {
        setProfileSuccessMsg('Profile information updated successfully!');
        if (updateUser && res.user) {
          updateUser(res.user);
        }
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      } else {
        setProfileErrorMsg(res?.message || 'Failed to update profile');
      }
    } catch (err) {
      setProfileErrorMsg(err.message || 'An error occurred while saving your profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirm password do not match');
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await userApi.changePassword({
        currentPassword,
        newPassword,
      });

      if (res && res.success) {
        setPasswordSuccessMsg('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccessMsg(''), 4000);
      } else {
        setPasswordErrorMsg(res?.message || 'Failed to update password');
      }
    } catch (err) {
      setPasswordErrorMsg(err.message || 'Error updating password. Check your current password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    setPrefSavedMsg('Preferences saved successfully!');
    setTimeout(() => setPrefSavedMsg(''), 3000);
  };

  const avatarInitial = (user?.username || user?.firstName || 'U').charAt(0).toUpperCase();

  return (
    <main className="reddit-main-feed settings-page-feed animate-fade-in" aria-label="Account Settings">
      {/* ================= 1. HEADER BANNER ================= */}
      <div className="reddit-route-header-banner" style={{ marginBottom: '1.25rem' }}>
        <div className="route-banner-icon-badge" style={{ background: '#e6f6ee', color: '#008751', border: '1px solid #bbf7d0' }}>
          <SlidersHorizontal size={22} />
        </div>
        <div className="route-banner-content">
          <div className="route-banner-tag-row">
            <span className="route-banner-tag">ACCOUNT PREFERENCES</span>
            <span className="route-banner-subtag">• u/{user?.username || 'member'}</span>
          </div>
          <h1 className="route-banner-title">Settings & Profile</h1>
          <p className="route-banner-description">
            Manage your personal profile, editorial author bio, security credentials, and wire configurations.
          </p>
        </div>
      </div>

      {/* ================= 2. SETTINGS NAVIGATION TABS ================= */}
      <div className="settings-nav-tabs">
        <button
          type="button"
          className={`settings-nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} />
          <span>Profile & Bio</span>
        </button>
        <button
          type="button"
          className={`settings-nav-tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={16} />
          <span>Security & Password</span>
        </button>
        <button
          type="button"
          className={`settings-nav-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Bell size={16} />
          <span>Wire Preferences & Data</span>
        </button>
      </div>

      {/* ================= 3. TAB 1: PROFILE & BIO ================= */}
      {activeTab === 'profile' && (
        <div className="settings-card animate-fade-in">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-section-title">Author Profile</h2>
              <p className="settings-section-desc">
                This information appears on your public author card and when other analysts visit u/{user?.username || 'your-profile'}.
              </p>
            </div>
            <button
              type="button"
              className="btn-profile-secondary"
              onClick={() => navigate(`/u/${user?.username || 'member'}`)}
              title="View your public profile"
            >
              <span>View Public Profile</span>
            </button>
          </div>

          {profileSuccessMsg && (
            <div className="settings-alert-success animate-fade-in">
              <Check size={16} />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div className="settings-alert-error animate-fade-in">
              <AlertCircle size={16} />
              <span>{profileErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="settings-form">
            {/* 1. Author Avatar Row (Upload from Device) */}
            <div className="settings-avatar-preview-row">
              <div className="settings-avatar-circle">
                {avatarUrl ? (
                  <img
                    src={formatMediaUrl(avatarUrl)}
                    alt="Avatar preview"
                    className="settings-avatar-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="settings-avatar-letter">{avatarInitial}</span>
                )}
              </div>
              <div className="settings-avatar-input-wrap">
                <label className="form-field-label">Profile Avatar</label>
                <div className="settings-upload-btn-group">
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileSelect}
                  />
                  <button
                    type="button"
                    className="btn-profile-primary settings-upload-device-btn"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={15} />
                        <span>Upload from device</span>
                      </>
                    )}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      className="btn-profile-secondary"
                      onClick={() => setAvatarUrl('')}
                      title="Remove custom avatar"
                    >
                      <Trash2 size={14} color="#dc2626" />
                      <span style={{ color: '#dc2626' }}>Remove</span>
                    </button>
                  )}
                </div>
                <span className="form-field-hint">
                  Upload an image from your device (PNG, JPG, WEBP, or GIF). Saved permanently.
                </span>
              </div>
            </div>

            {/* 2. Author Banner Row (Upload from Device) */}
            <div className="settings-banner-preview-box">
              <label className="form-field-label">Profile Header Banner</label>
              <div
                className="settings-banner-preview-strip"
                style={
                  bannerUrl
                    ? {
                        backgroundImage: `url(${formatMediaUrl(bannerUrl)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        background: 'linear-gradient(135deg, #008751 0%, #064e3b 50%, #0f172a 100%)',
                      }
                }
              >
                <div className="settings-banner-preview-overlay">
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleBannerFileSelect}
                  />
                  <button
                    type="button"
                    className="settings-banner-upload-btn"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={isUploadingBanner}
                  >
                    {isUploadingBanner ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Uploading banner...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={15} />
                        <span>Upload Banner from device</span>
                      </>
                    )}
                  </button>

                  {bannerUrl && (
                    <button
                      type="button"
                      className="settings-banner-remove-btn"
                      onClick={() => setBannerUrl('')}
                      title="Reset to default brand banner"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
              <span className="form-field-hint">
                Custom banner displayed on your public profile and author cards. Upload any image from your device.
              </span>
            </div>

            {/* Username (Read Only Handle) */}
            <div className="form-group-field">
              <label className="form-field-label">Wire Username (Handle)</label>
              <input
                type="text"
                value={`u/${user?.username || 'member'}`}
                disabled
                className="modal-select-field settings-input-disabled"
              />
              <span className="form-field-hint">
                Your canonical NewsCuddle username established during account registration.
              </span>
            </div>

            {/* First & Last Name */}
            <div className="settings-name-grid">
              <div className="form-group-field">
                <label className="form-field-label">First Name</label>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="modal-select-field"
                />
              </div>
              <div className="form-group-field">
                <label className="form-field-label">Last Name</label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="modal-select-field"
                />
              </div>
            </div>

            {/* Editorial Bio with #hashtag & @mention advice */}
            <div className="form-group-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-field-label">Editorial Bio / About</label>
                <span className="settings-char-count">{bio.length}/500</span>
              </div>
              <textarea
                rows={4}
                maxLength={500}
                placeholder="Share your analytical focus, expertise, and interests. Tip: write #hashtags to create searchable topic links, and @mentions to reference other authors..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="modal-textarea-field"
              />
              <span className="form-field-hint">
                Hashtags like <strong>#technology</strong> and mentions like <strong>@author</strong> automatically become interactive links on your profile card.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="submit"
                className="btn-profile-primary"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= 4. TAB 2: SECURITY & PASSWORD ================= */}
      {activeTab === 'security' && (
        <div className="settings-card animate-fade-in">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-section-title">Security & Password</h2>
              <p className="settings-section-desc">
                Update your account password and review identity authentication credentials.
              </p>
            </div>
          </div>

          {passwordSuccessMsg && (
            <div className="settings-alert-success animate-fade-in">
              <Check size={16} />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {passwordErrorMsg && (
            <div className="settings-alert-error animate-fade-in">
              <AlertCircle size={16} />
              <span>{passwordErrorMsg}</span>
            </div>
          )}

          {/* Email Address Info */}
          <div className="form-group-field" style={{ marginBottom: '1.25rem' }}>
            <label className="form-field-label">Registered Email Address</label>
            <input
              type="text"
              value={user?.email || 'No email attached'}
              disabled
              className="modal-select-field settings-input-disabled"
            />
            <span className="form-field-hint">
              Your verified communication and security recovery address.
            </span>
          </div>

          <form onSubmit={handleSavePassword} className="settings-form">
            <div className="form-group-field">
              <label className="form-field-label">Current Password</label>
              <div className="settings-password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="modal-select-field"
                  required
                />
                <button
                  type="button"
                  className="settings-eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="settings-name-grid">
              <div className="form-group-field">
                <label className="form-field-label">New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="modal-select-field"
                  required
                />
              </div>
              <div className="form-group-field">
                <label className="form-field-label">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="modal-select-field"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="submit"
                className="btn-profile-primary"
                disabled={isSavingPassword || !currentPassword || !newPassword}
              >
                {isSavingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= 5. TAB 3: WIRE PREFERENCES & DATA ================= */}
      {activeTab === 'preferences' && (
        <div className="settings-card animate-fade-in">
          <div className="settings-card-header">
            <div>
              <h2 className="settings-section-title">Wire Preferences & Permanent Retention</h2>
              <p className="settings-section-desc">
                Configure your default views and view data compliance guarantees.
              </p>
            </div>
          </div>

          {prefSavedMsg && (
            <div className="settings-alert-success animate-fade-in">
              <Check size={16} />
              <span>{prefSavedMsg}</span>
            </div>
          )}

          <div className="settings-form">
            {/* Default Feed */}
            <div className="form-group-field">
              <label className="form-field-label">Default Wire on Launch</label>
              <select
                value={defaultFeed}
                onChange={(e) => setDefaultFeed(e.target.value)}
                className="modal-select-field"
              >
                <option value="home">Home Wire (Personalized Subscriptions)</option>
                <option value="popular">Popular Wire (High Velocity Trending)</option>
                <option value="news">News & Politics (Verified Editorial)</option>
              </select>
            </div>

            {/* Toggle: Autoplay Media */}
            <div className="settings-toggle-row">
              <div>
                <span className="settings-toggle-title">Autoplay GIFs & Animated Media</span>
                <span className="settings-toggle-desc">Automatically play media loops in the intelligence feed.</span>
              </div>
              <input
                type="checkbox"
                checked={autoplayMedia}
                onChange={(e) => setAutoplayMedia(e.target.checked)}
                className="settings-checkbox-input"
              />
            </div>

            {/* Toggle: Notifications */}
            <div className="settings-toggle-row">
              <div>
                <span className="settings-toggle-title">Discussion & Mention Notifications</span>
                <span className="settings-toggle-desc">Receive real-time alerts when authors reply to your reporting or mention your handle.</span>
              </div>
              <input
                type="checkbox"
                checked={notifyOnReplies}
                onChange={(e) => setNotifyOnReplies(e.target.checked)}
                className="settings-checkbox-input"
              />
            </div>

            {/* Permanent Data Retention Guarantee Card */}
            <div className="settings-data-retention-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
                <Shield size={18} color="#008751" />
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Permanent Data Preservation Guarantee
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: 1.5, color: '#475569' }}>
                All media uploads, intelligence articles, and comment threads are permanently archived in encrypted cold storage for system backups, platform analytics, and training. All content deletes are executed as soft-deletes, removing items from live user feeds while maintaining permanent integrity.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-profile-primary"
                onClick={handleSavePreferences}
              >
                <Check size={16} />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default SettingsPage;
