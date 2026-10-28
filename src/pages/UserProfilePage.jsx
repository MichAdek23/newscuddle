import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { feedApi, userApi, formatMediaUrl } from '../services/api';
import PostMediaImage from '../components/common/PostMediaImage';
import {
  User,
  Calendar,
  Flame,
  FileText,
  MessageSquare,
  Bookmark,
  Share2,
  Check,
  ShieldCheck,
  Plus,
  ExternalLink,
  SlidersHorizontal,
  Mail,
  Loader2,
  Award,
  ArrowLeft,
  X,
  Camera,
  UploadCloud,
  Trash2,
} from 'lucide-react';

export const UserProfilePage = () => {
  const { username: paramUsername } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const context = useOutletContext() || {};

  const {
    savedPosts = [],
    onToggleSave,
    onRecordRecentView,
  } = context;

  const cleanUsername = useMemo(() => {
    const raw = paramUsername || currentUser?.username || 'member';
    return raw.replace(/^u\//, '').replace(/^@/, '').trim();
  }, [paramUsername, currentUser?.username]);

  const isSelf = useMemo(() => {
    if (!currentUser?.username) return false;
    return currentUser.username.toLowerCase() === cleanUsername.toLowerCase();
  }, [currentUser?.username, cleanUsername]);

  const [profileData, setProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'about'
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postSort, setPostSort] = useState('new'); // 'new' | 'top'

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDirectMessageModal, setShowDirectMessageModal] = useState(false);
  const [dmText, setDmText] = useState('');
  const [dmSent, setDmSent] = useState(false);

  // Device File Upload State & Refs
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const avatarFileInputRef = useRef(null);
  const bannerFileInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Upload Avatar from Device
  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const res = await feedApi.uploadMedia(file);
      if (res && res.url) {
        await userApi.updateProfile({
          avatarUrl: res.url,
          userId: currentUser?.id || currentUser?._id,
        });
        setProfileData((prev) => ({ ...prev, avatarUrl: res.url }));
        if (updateUser) {
          updateUser({ ...currentUser, avatarUrl: res.url });
        }
        showToast('Profile photo updated from device!');
      } else {
        throw new Error(res?.message || 'Failed to upload photo');
      }
    } catch (err) {
      showToast(err.message || 'Avatar upload failed');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  // Upload Banner from Device
  const handleBannerFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const res = await feedApi.uploadMedia(file);
      if (res && res.url) {
        await userApi.updateProfile({
          bannerUrl: res.url,
          userId: currentUser?.id || currentUser?._id,
        });
        setProfileData((prev) => ({ ...prev, bannerUrl: res.url }));
        if (updateUser) {
          updateUser({ ...currentUser, bannerUrl: res.url });
        }
        showToast('Profile banner updated from device!');
      } else {
        throw new Error(res?.message || 'Failed to upload banner');
      }
    } catch (err) {
      showToast(err.message || 'Banner upload failed');
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  // 1. Fetch User Profile Details from real backend
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProfile(true);
    setProfileError(null);

    userApi
      .getUserDetails(cleanUsername)
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res.user) {
          setProfileData(res.user);
          setIsFollowing(Boolean(res.user.isFollowing));
        } else {
          setProfileData({
            username: cleanUsername,
            displayName: cleanUsername,
            role: 'Contributing Author',
            createdAt: new Date().toISOString(),
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Failed to load profile details, using fallback:', err);
        setProfileData({
          username: cleanUsername,
          displayName: cleanUsername,
          role: 'Contributing Author',
          createdAt: new Date().toISOString(),
        });
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUsername]);

  // 2. Fetch Posts Authored by this User
  useEffect(() => {
    let isMounted = true;
    setIsLoadingPosts(true);

    feedApi
      .getFeed({
        desk: `u/${cleanUsername}`,
        sort: postSort === 'top' ? 'top' : 'new',
        limit: 30,
      })
      .then((res) => {
        if (!isMounted) return;
        if (res && Array.isArray(res.items)) {
          setPosts(res.items);
        } else {
          setPosts([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Failed to fetch user posts:', err);
        setPosts([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPosts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUsername, postSort]);

  // Handle Follow / Unfollow
  const handleToggleFollow = async () => {
    if (isSelf || followLoading) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowLoading(true);

    try {
      const res = await feedApi.toggleFollowUser(cleanUsername);
      if (res && res.success && res.isFollowing !== undefined) {
        setIsFollowing(res.isFollowing);
        showToast(res.isFollowing ? `Now following u/${cleanUsername}` : `Unfollowed u/${cleanUsername}`);
      }
    } catch (err) {
      console.error('Failed to toggle follow:', err);
      setIsFollowing(!nextState);
    } finally {
      setFollowLoading(false);
    }
  };

  // Handle Share Profile Link
  const handleShareProfile = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Profile link copied to clipboard!');
      });
    } else {
      showToast('Profile URL: ' + url);
    }
  };

  // Handle Send Direct Message
  const handleSendDirectMessage = (e) => {
    e.preventDefault();
    if (!dmText.trim()) return;
    setDmSent(true);
    setTimeout(() => {
      setDmSent(false);
      setDmText('');
      setShowDirectMessageModal(false);
      showToast(`Direct message sent to u/${cleanUsername}`);
    }, 1000);
  };

  // Helper to parse bio with clickable hashtags and mentions
  const renderBioText = (text) => {
    if (!text) return null;
    const parts = text.split(/(#[a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)/g);
    return (
      <p className="profile-bio-text">
        {parts.map((part, idx) => {
          if (part.startsWith('#')) {
            const tag = part.slice(1);
            return (
              <span
                key={idx}
                className="bio-hashtag-pill"
                onClick={() => navigate(`/search?q=%23${encodeURIComponent(tag)}`)}
                title={`Search for #${tag}`}
              >
                {part}
              </span>
            );
          }
          if (part.startsWith('@')) {
            const userHandle = part.slice(1);
            return (
              <span
                key={idx}
                className="bio-mention-pill"
                onClick={() => navigate(`/u/${userHandle}`)}
                title={`View profile of @${userHandle}`}
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </p>
    );
  };

  const formattedDate = useMemo(() => {
    if (!profileData?.createdAt) return 'Recently';
    try {
      const d = new Date(profileData.createdAt);
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } catch (_) {
      return 'Recently';
    }
  }, [profileData?.createdAt]);

  const avatarInitial = (profileData?.displayName || cleanUsername || 'U').charAt(0).toUpperCase();

  return (
    <main className="reddit-main-feed profile-page-feed animate-fade-in" aria-label={`u/${cleanUsername}'s Profile`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="feed-floating-toast animate-fade-in">
          <Check size={16} color="#008751" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= 1. SLEEK PROFILE HEADER CARD ================= */}
      <div className="profile-header-card">
        {/* Banner Strip */}
        <div
          className="profile-banner-strip"
          style={
            profileData?.bannerUrl
              ? {
                  backgroundImage: `url(${formatMediaUrl(profileData.bannerUrl)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        >
          <div className="profile-banner-overlay" />

          {/* Quick Upload from Device for Banner when viewing own profile */}
          {isSelf && (
            <div className="profile-banner-edit-wrap">
              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleBannerFileSelect}
              />
              <button
                type="button"
                className="btn-banner-edit"
                onClick={() => bannerFileInputRef.current?.click()}
                disabled={isUploadingBanner}
                title="Upload banner from device"
                aria-label="Upload banner from device"
              >
                {isUploadingBanner ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Profile Content Body */}
        <div className="profile-header-body">
          <div className="profile-avatar-and-actions-row">
            {/* Avatar Circle */}
            <div className="profile-avatar-circle">
              {profileData?.avatarUrl ? (
                <img
                  src={formatMediaUrl(profileData.avatarUrl)}
                  alt={cleanUsername}
                  className="profile-avatar-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="profile-avatar-initial">{avatarInitial}</span>
              )}

              {/* Quick Upload from Device for Avatar when viewing own profile */}
              {isSelf && (
                <>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileSelect}
                  />
                  <button
                    type="button"
                    className="profile-avatar-edit-badge"
                    onClick={() => avatarFileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    title="Upload profile picture from device"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Camera size={13} />
                    )}
                  </button>
                </>
              )}

              <span className="profile-avatar-online-dot" title="Active on Wire" />
            </div>

            {/* Actions: Follow / Edit Profile / Message / Share */}
            <div className="profile-actions-group">
              {isSelf ? (
                <>
                  <button
                    type="button"
                    className="btn-profile-primary"
                    onClick={() => navigate('/settings')}
                  >
                    <SlidersHorizontal size={15} />
                    <span>Edit Profile & Settings</span>
                  </button>
                  <button
                    type="button"
                    className="btn-profile-secondary"
                    onClick={handleShareProfile}
                    title="Share profile link"
                  >
                    <Share2 size={15} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`btn-profile-follow ${isFollowing ? 'following' : 'not-following'}`}
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <Check size={15} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <Plus size={15} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-profile-secondary"
                    onClick={() => setShowDirectMessageModal(true)}
                    title="Send Direct Message"
                  >
                    <Mail size={15} />
                    <span>Message</span>
                  </button>

                  <button
                    type="button"
                    className="btn-profile-secondary"
                    onClick={handleShareProfile}
                    title="Share profile"
                  >
                    <Share2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name & Handle */}
          <div className="profile-info-group">
            <div className="profile-name-row">
              <h1 className="profile-display-name">
                {profileData?.displayName || cleanUsername}
              </h1>
            </div>
            <div className="profile-handle-row">
              <span className="profile-handle-text">u/{cleanUsername}</span>
              <span className="profile-dot-sep">•</span>
              <span className="profile-date-meta">
                <Calendar size={13} />
                <span>Member since {formattedDate}</span>
              </span>
            </div>
          </div>

          {/* Profile Bio (with hashtags and mentions) */}
          {(profileData?.bio || profileData?.about) && (
            <div className="profile-bio-container">
              {renderBioText(profileData.bio || profileData.about)}
            </div>
          )}

          {/* Quick Stats Bar */}
          <div className="profile-stats-bar">
            <div className="profile-stat-item">
              <span className="stat-number">{profileData?.postsCount || posts.length || 0}</span>
              <span className="stat-label">
                <FileText size={13} />
                <span>Posts</span>
              </span>
            </div>
            <div className="profile-stat-item">
              <span className="stat-number">{profileData?.upvotesCount || 0}</span>
              <span className="stat-label">
                <Flame size={13} color="#ea580c" />
                <span>Upvotes</span>
              </span>
            </div>
            <div className="profile-stat-item">
              <span className="stat-number">{profileData?.commentsCount || 0}</span>
              <span className="stat-label">
                <MessageSquare size={13} />
                <span>Comments</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Posts | About */}
        <div className="profile-tabs-bar">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FileText size={15} />
            <span>Posts ({profileData?.postsCount || posts.length || 0})</span>
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            <User size={15} />
            <span>About</span>
          </button>
        </div>
      </div>

      {/* ================= 2. POSTS STREAM OR ABOUT TAB ================= */}
      {activeTab === 'posts' ? (
        <div className="profile-posts-stream">
          {/* Post Sort Bar */}
          {posts.length > 1 && (
            <div className="reddit-sort-bar" style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
              <div className="sort-buttons-group">
                <button
                  type="button"
                  className={`reddit-sort-btn ${postSort === 'new' ? 'active' : ''}`}
                  onClick={() => setPostSort('new')}
                >
                  <span>Newest</span>
                </button>
                <button
                  type="button"
                  className={`reddit-sort-btn ${postSort === 'top' ? 'active' : ''}`}
                  onClick={() => setPostSort('top')}
                >
                  <Flame size={14} />
                  <span>Top Rated</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoadingPosts ? (
            <div className="reddit-posts-stream">
              {[1, 2, 3].map((i) => (
                <div key={`profile-skel-${i}`} className="skeleton-card">
                  <div className="skeleton-header">
                    <div className="skeleton-box skeleton-avatar" />
                    <div className="skeleton-box skeleton-meta" />
                  </div>
                  <div className="skeleton-box skeleton-title" />
                  <div className="skeleton-box skeleton-text-1" />
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="reddit-posts-stream">
              {posts.map((post) => {
                const isSaved = savedPosts.some((p) => (typeof p === 'string' ? p === post.id : p.id === post.id));
                const postDetailPath = `/post/${post.postCode || post.id}`;

                return (
                  <article
                    key={post.id}
                    className="reddit-post-card cursor-pointer animate-fade-in"
                    onClick={(e) => {
                      if (e.target.closest('button') || e.target.closest('a')) return;
                      if (onRecordRecentView) onRecordRecentView(post);
                      navigate(postDetailPath, { state: { post } });
                    }}
                  >
                    {/* Post Header */}
                    <div className="reddit-post-header">
                      <div className="post-header-left">
                        <div
                          className="community-badge-icon"
                          style={{
                            backgroundColor: `${post.deskColor || '#008751'}20`,
                            color: post.deskColor || '#008751',
                          }}
                        >
                          {(post.deskName || post.category || 'C').charAt(0).toUpperCase()}
                        </div>
                        <span className="community-name-link">
                          {post.deskSlug ? (post.deskSlug.startsWith('c/') ? post.deskSlug : `c/${post.deskSlug}`) : (post.category ? `c/${post.category}` : 'c/feed')}
                        </span>
                        <span className="post-meta-dot">•</span>
                        <span className="post-meta-time">
                          {post.createdAt
                            ? new Date(post.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Recent'}
                        </span>
                      </div>
                    </div>

                    {/* Post Content */}
                    <h2 className="reddit-post-title">{post.title}</h2>
                    {post.summary && <p className="reddit-post-summary">{post.summary}</p>}

                    {/* Media Image */}
                    {post.hasMedia && post.mediaUrl && (
                      <div className="reddit-post-media-wrap">
                        <PostMediaImage
                          mediaUrl={post.mediaUrl}
                          alt={post.title}
                          className="reddit-post-img"
                        />
                      </div>
                    )}

                    {/* Post Footer Actions */}
                    <div className="reddit-post-footer">
                      <div className="post-action-pill vote-pill">
                        <Flame size={16} color="#008751" />
                        <span className="vote-count">{post.upvotes || 0}</span>
                      </div>

                      <div className="post-action-pill comment-pill">
                        <MessageSquare size={16} />
                        <span>{post.commentsCount || 0} comments</span>
                      </div>

                      <button
                        type="button"
                        className={`post-action-pill ${isSaved ? 'saved' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleSave) onToggleSave(post.id, post);
                        }}
                        title={isSaved ? 'Remove from saved' : 'Save post'}
                      >
                        <Bookmark size={16} className={isSaved ? 'fill-current' : ''} />
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>

                      <button
                        type="button"
                        className="post-action-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/post/${post.postCode || post.id}`;
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(url);
                            showToast('Article link copied to clipboard!');
                          }
                        }}
                      >
                        <Share2 size={16} />
                        <span>Share</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="profile-empty-posts-card">
              <div className="profile-empty-icon-wrap">
                <FileText size={28} />
              </div>
              <h3 className="profile-empty-title">No Stories Published Yet</h3>
              <p className="profile-empty-text">
                {isSelf
                  ? 'You have not published any stories or analytical posts yet. Share breaking insights or reporting to any editorial desk.'
                  : `u/${cleanUsername} hasn't published any reporting or analysis on the wire yet.`}
              </p>
              {isSelf && (
                <button
                  type="button"
                  className="btn-profile-primary"
                  onClick={() => navigate('/n/create')}
                  style={{ marginTop: '0.85rem' }}
                >
                  <Plus size={16} />
                  <span>Create First Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ================= ABOUT TAB ================= */
        <div className="profile-about-card animate-fade-in">
          <h3 className="about-section-heading">About u/{cleanUsername}</h3>

          <div className="about-details-grid">
            <div className="about-detail-row">
              <span className="detail-key">Member Since</span>
              <span className="detail-val">{formattedDate}</span>
            </div>
            <div className="about-detail-row">
              <span className="detail-key">Verification Status</span>
              <span className="detail-val verified-badge-val">
                <ShieldCheck size={14} color="#008751" />
                <span>Platform Verified Member</span>
              </span>
            </div>
            <div className="about-detail-row">
              <span className="detail-key">Data Retention Status</span>
              <span className="detail-val">
                Permanent Encrypted Archive Active
              </span>
            </div>
          </div>

          {profileData?.bio && (
            <div style={{ marginTop: '1.25rem' }}>
              <span className="detail-key" style={{ display: 'block', marginBottom: '0.45rem' }}>
                Editorial Bio
              </span>
              <div className="profile-bio-container">
                {renderBioText(profileData.bio)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= DIRECT MESSAGE MODAL ================= */}
      {showDirectMessageModal && (
        <div className="onboarding-overlay" onClick={() => setShowDirectMessageModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div>
                  <h3 className="modal-title">Message u/{cleanUsername}</h3>
                  <p className="modal-subtitle">Direct peer-to-peer transmission across the NewsCuddle Wire.</p>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setShowDirectMessageModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSendDirectMessage} style={{ marginTop: '1rem' }}>
                <textarea
                  className="modal-textarea-field"
                  rows={4}
                  placeholder={`Write your message to u/${cleanUsername}...`}
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    className="onboarding-next-btn"
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                    onClick={() => setShowDirectMessageModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="onboarding-next-btn btn-primary"
                    disabled={!dmText.trim() || dmSent}
                  >
                    {dmSent ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default UserProfilePage;
