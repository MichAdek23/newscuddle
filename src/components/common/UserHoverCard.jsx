import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userApi, feedApi, formatMediaUrl } from '../../services/api';

// In-memory module cache for user profile data to eliminate redundant network hits
const userDetailsCache = new Map();

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

/**
 * UserHoverCard:
 * Floating user profile preview popover when hovering over any user handle or author avatar (u/:username).
 * Provides author identity, bio, role badge, wire stats, and quick follow/unfollow toggle.
 */
export default function UserHoverCard({
  username,
  displayName,
  avatarUrl,
  bannerUrl,
  authorRole,
  children,
  align = 'left',
  className = '',
}) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const cleanUsername = (username || '')
    .toString()
    .trim()
    .replace(/^u\//i, '')
    .replace(/^@/, '');

  const [isOpen, setIsOpen] = useState(false);
  const [userData, setUserData] = useState(() =>
    cleanUsername ? userDetailsCache.get(cleanUsername) || null : null
  );
  const [isFollowing, setIsFollowing] = useState(() =>
    Boolean(userData?.isFollowing)
  );
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  const enterTimerRef = useRef(null);
  const leaveTimerRef = useRef(null);

  const isSelf =
    currentUser &&
    cleanUsername &&
    currentUser.username?.toLowerCase() === cleanUsername.toLowerCase();

  // Listen to global profile updates (e.g. user updated avatar or banner in settings or profile page)
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const updated = e.detail?.user;
      if (!updated) return;
      const uUsername = (updated.username || '')
        .replace(/^u\//i, '')
        .replace(/^@/, '')
        .toLowerCase();
      if (cleanUsername && uUsername === cleanUsername.toLowerCase()) {
        setUserData((prev) => ({
          ...(prev || {}),
          ...updated,
        }));
        setAvatarImgError(false);
        if (userDetailsCache.has(cleanUsername)) {
          const cached = userDetailsCache.get(cleanUsername);
          userDetailsCache.set(cleanUsername, { ...cached, ...updated });
        }
      }
    };

    window.addEventListener('newscuddle:user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('newscuddle:user_profile_updated', handleProfileUpdate);
    };
  }, [cleanUsername]);

  // Listen to global follow changes across feeds/detail pages
  useEffect(() => {
    const handleFollowSync = (e) => {
      const { author, isFollowing: nextState } = e.detail || {};
      if (
        author &&
        cleanUsername &&
        author.toLowerCase() === cleanUsername.toLowerCase()
      ) {
        setIsFollowing(Boolean(nextState));
        if (userDetailsCache.has(cleanUsername)) {
          const cached = userDetailsCache.get(cleanUsername);
          userDetailsCache.set(cleanUsername, { ...cached, isFollowing: nextState });
        }
      }
    };

    window.addEventListener('newscuddle:author_follow_changed', handleFollowSync);
    return () => {
      window.removeEventListener('newscuddle:author_follow_changed', handleFollowSync);
    };
  }, [cleanUsername]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  // Fetch or update user data when opening
  const fetchUserDetails = async () => {
    if (!cleanUsername || cleanUsername === 'member') return;

    if (userDetailsCache.has(cleanUsername)) {
      const cached = userDetailsCache.get(cleanUsername);
      setUserData(cached);
      setIsFollowing(Boolean(cached.isFollowing));
    }

    try {
      const res = await userApi.getUserDetails(cleanUsername);
      if (res?.success && res.user) {
        userDetailsCache.set(cleanUsername, res.user);
        setUserData(res.user);
        setIsFollowing(Boolean(res.user.isFollowing));
      }
    } catch (err) {
      console.warn('Failed to fetch user hover card details:', err);
    }
  };

  const handleMouseEnter = () => {
    if (!cleanUsername || cleanUsername === 'member') return;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);

    enterTimerRef.current = setTimeout(() => {
      setIsOpen(true);
      fetchUserDetails();
    }, 180);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 240);
  };

  const handlePopoverMouseEnter = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
  };

  const handlePopoverMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleToggleFollow = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (isSelf || isTogglingFollow) return;

    try {
      setIsTogglingFollow(true);
      const res = await feedApi.toggleFollowUser(cleanUsername);
      const nextFollow = res?.isFollowing ?? !isFollowing;
      setIsFollowing(nextFollow);

      if (userDetailsCache.has(cleanUsername)) {
        const cached = userDetailsCache.get(cleanUsername);
        userDetailsCache.set(cleanUsername, { ...cached, isFollowing: nextFollow });
      }

      window.dispatchEvent(
        new CustomEvent('newscuddle:author_follow_changed', {
          detail: { author: cleanUsername, isFollowing: nextFollow },
        })
      );
    } catch (err) {
      console.warn('Failed to toggle follow status in hover popover:', err);
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const handleNavigateProfile = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    navigate(`/u/${cleanUsername}`);
  };

  // If no username or generic member, render children without hover popover
  if (!cleanUsername || cleanUsername === 'member') {
    return <>{children}</>;
  }

  const effectiveDisplayName =
    userData?.displayName || displayName || cleanUsername;
  const initial = (effectiveDisplayName || cleanUsername || 'U').charAt(0).toUpperCase();
  const effectiveRole =
    userData?.role || authorRole || 'Contributing Author';
  const effectiveBio =
    userData?.bio ||
    userData?.about ||
    'Independent contributor publishing news, intelligence, and verified reporting on NewsCuddle.';

  const effectiveBanner =
    (isSelf ? currentUser?.bannerUrl : null) ||
    userData?.bannerUrl ||
    bannerUrl;

  const effectiveAvatar =
    (isSelf ? currentUser?.avatarUrl : null) ||
    userData?.avatarUrl ||
    avatarUrl;

  return (
    <div
      className={`user-hover-wrapper ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && (
        <div
          className={`user-hover-popover animate-fade-in ${
            align === 'right' ? 'align-right' : ''
          }`}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Top Banner */}
          <div
            className="user-hover-banner"
            style={
              effectiveBanner
                ? {
                    backgroundImage: `url(${formatMediaUrl(effectiveBanner)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : {
                    background: 'linear-gradient(135deg, #008751 0%, #064e3b 50%, #0f172a 100%)',
                  }
            }
          />

          {/* Popover Body */}
          <div className="user-hover-body">
            {/* Top Row: Avatar & Follow Action */}
            <div className="user-hover-top-row">
              <div
                className="user-hover-avatar"
                onClick={handleNavigateProfile}
                title={`View u/${cleanUsername}'s profile`}
              >
                {effectiveAvatar && !avatarImgError ? (
                  <img
                    src={formatMediaUrl(effectiveAvatar)}
                    alt={effectiveDisplayName}
                    className="user-hover-avatar-img"
                    onError={() => setAvatarImgError(true)}
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>

              <div className="user-hover-action-btn-wrap">
                {isSelf ? (
                  <span className="user-hover-self-tag">You</span>
                ) : (
                  <button
                    type="button"
                    className={`user-hover-follow-btn ${
                      isFollowing ? 'following' : 'follow'
                    }`}
                    onClick={handleToggleFollow}
                    disabled={isTogglingFollow}
                    title={isFollowing ? 'Unfollow author' : 'Follow author'}
                  >
                    {isFollowing ? (
                      <>
                        <span className="follow-text-normal">Following</span>
                        <span className="follow-text-hover">Unfollow</span>
                      </>
                    ) : (
                      <span>+ Follow</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Display Name & Handle */}
            <div className="user-hover-identity">
              <div className="user-hover-title-row">
                <span
                  className="user-hover-display-name"
                  onClick={handleNavigateProfile}
                  title={`View u/${cleanUsername}'s profile`}
                >
                  {effectiveDisplayName}
                </span>
                {userData?.isVerified && (
                  <span className="user-verified-badge" title="Verified Author">
                    ✓
                  </span>
                )}
              </div>

              <div
                className="user-hover-handle"
                onClick={handleNavigateProfile}
              >
                u/{cleanUsername}
              </div>

              {effectiveRole && (
                <div className="user-hover-role-tag">{effectiveRole}</div>
              )}
            </div>

            {/* Bio Snippet */}
            <p className="user-hover-bio">{effectiveBio}</p>

            {/* Stats Row */}
            <div className="user-hover-stats-row">
              <div className="user-hover-stat-item">
                <span className="user-hover-stat-num">
                  {formatNumber(userData?.postsCount ?? 1)}
                </span>
                <span className="user-hover-stat-lbl">Posts</span>
              </div>
              <div className="user-hover-stat-item">
                <span className="user-hover-stat-num">
                  {formatNumber(userData?.upvotesCount ?? 0)}
                </span>
                <span className="user-hover-stat-lbl">Upvotes</span>
              </div>
              <div className="user-hover-stat-item">
                <span className="user-hover-stat-num">
                  {formatNumber(userData?.commentsCount ?? 0)}
                </span>
                <span className="user-hover-stat-lbl">Comments</span>
              </div>
            </div>

            {/* Footer: View Full Profile */}
            <div className="user-hover-footer">
              <button
                type="button"
                className="user-hover-view-profile-btn"
                onClick={handleNavigateProfile}
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
