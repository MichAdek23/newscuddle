import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { feedApi, userApi, formatMediaUrl } from '../../services/api';
import {
  Home,
  Clock,
  Bookmark,
  Plus,
  ShieldCheck,
  Check,
  X,
  Compass,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  MessageSquare,
  FileText,
  Lock,
  Eye,
  Shield,
  Flame,
  Mail,
  User,
  Users,
  Send,
} from 'lucide-react';

// Render user bio with interactive #hashtag and @mention parsing
const renderFormattedBio = (text, onNavigate) => {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Split tokens by hashtags (#tag), mentions (@username), and newlines
  const regex = /([@#][a-zA-Z0-9_]+|\n)/g;
  const parts = trimmed.split(regex);

  return (
    <div className="author-bio-container">
      <p className="author-bio-text">
        {parts.map((part, idx) => {
          if (part === '\n') {
            return <br key={idx} />;
          }
          if (part.startsWith('#')) {
            const tag = part.slice(1);
            return (
              <span
                key={idx}
                className="bio-hashtag-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(`/search?q=${encodeURIComponent('#' + tag)}`);
                }}
                title={`Search posts tagged #${tag}`}
              >
                {part}
              </span>
            );
          }
          if (part.startsWith('@')) {
            const username = part.slice(1);
            return (
              <span
                key={idx}
                className="bio-mention-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(`/u/${username}`);
                }}
                title={`View u/${username}'s profile`}
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </p>
    </div>
  );
};

export const RightPanel = ({
  mode = 'home',
  community = null,
  hasCommunity = Boolean(community),
  author = null,
  isAuthor = false,
  userCommunitiesJoined = [],
  isJoined = false,
  isPinned = false,
  onToggleJoin,
  onTogglePin,
  onOpenCreateCommunity,
  recentPosts = [],
  onClearRecent,
  savedPosts = [],
  canonicalDesks = [],
  onSelectPost,
  onAddNewPost,
  onOpenCreatePost,
  showRecent = mode !== 'post-detail' && mode !== 'create',
}) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState(null);
  const [showMessageModsModal, setShowMessageModsModal] = useState(false);
  const [modMessageText, setModMessageText] = useState('');
  const [modMessageSent, setModMessageSent] = useState(false);
  const [showMessageUserModal, setShowMessageUserModal] = useState(false);
  const [userMessageText, setUserMessageText] = useState('');
  const [userMessageSent, setUserMessageSent] = useState(false);
  const [authorFollowed, setAuthorFollowed] = useState(Boolean(author?.isFollowing));
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [bannerLoadError, setBannerLoadError] = useState(false);
  const [liveAuthorData, setLiveAuthorData] = useState(null);

  const cleanAuthorUsername = (author?.username || '')
    .toString()
    .trim()
    .replace(/^u\//i, '')
    .replace(/^@/, '');

  const isCurrentAuthor = Boolean(
    currentUser &&
      cleanAuthorUsername &&
      currentUser.username?.toLowerCase() === cleanAuthorUsername.toLowerCase()
  );

  // Fetch or sync live author details (banner & avatar)
  useEffect(() => {
    setBannerLoadError(false);
    setAvatarLoadError(false);

    if (!cleanAuthorUsername || cleanAuthorUsername === 'member') {
      setLiveAuthorData(null);
      return;
    }

    if (isCurrentAuthor) {
      setLiveAuthorData({
        ...currentUser,
        avatarUrl: currentUser.avatarUrl,
        bannerUrl: currentUser.bannerUrl,
      });
      return;
    }

    let isMounted = true;
    userApi
      .getUserDetails(cleanAuthorUsername)
      .then((res) => {
        if (isMounted && res?.success && res.user) {
          setLiveAuthorData(res.user);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [cleanAuthorUsername, isCurrentAuthor, currentUser?.avatarUrl, currentUser?.bannerUrl]);

  // Listen to global profile update events (e.g. author uploaded a new banner or avatar)
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      const updated = e.detail?.user;
      if (!updated) return;
      const uUsername = (updated.username || '')
        .replace(/^u\//i, '')
        .replace(/^@/, '')
        .toLowerCase();
      if (cleanAuthorUsername && uUsername === cleanAuthorUsername.toLowerCase()) {
        setLiveAuthorData((prev) => ({
          ...(prev || {}),
          ...updated,
        }));
        setAvatarLoadError(false);
        setBannerLoadError(false);
      }
    };

    window.addEventListener('newscuddle:user_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('newscuddle:user_profile_updated', handleProfileUpdate);
    };
  }, [cleanAuthorUsername]);

  useEffect(() => {
    if (author?.isFollowing !== undefined) {
      setAuthorFollowed(Boolean(author.isFollowing));
    }
  }, [author?.isFollowing, author?.username]);

  const handleToggleFollowAuthor = async () => {
    if (!author?.username || isFollowLoading) return;
    const nextState = !authorFollowed;
    setAuthorFollowed(nextState);
    setIsFollowLoading(true);
    try {
      const res = await feedApi.toggleFollowUser(author.username);
      if (res && res.success && res.isFollowing !== undefined) {
        setAuthorFollowed(res.isFollowing);
      }
    } catch (err) {
      console.error('Failed to toggle follow user:', err);
      setAuthorFollowed(!nextState);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleRecentPostClick = (post) => {
    if (!post) return;
    if (onSelectPost) {
      onSelectPost(post);
      return;
    }
    const target = post.postCode || post.id;
    navigate(`/post/${target}`, { state: { post } });
  };

  // Form state for Create Post modal
  const [postTitle, setPostTitle] = useState('');
  const [postDesk, setPostDesk] = useState('technology');
  const [postSummary, setPostSummary] = useState('');
  const [createError, setCreateError] = useState('');

  // Handle post creation with MongoDB persistence
  const handlePublishPost = async (e) => {
    e.preventDefault();
    if (!postTitle.trim()) {
      setCreateError('Please enter a headline or title.');
      return;
    }
    if (postTitle.trim().length < 5) {
      setCreateError('Title must be at least 5 characters long.');
      return;
    }

    const deskObj = (canonicalDesks || []).find((d) => d.id === postDesk) || {
      id: postDesk,
      label: postDesk,
      name: `c/${postDesk}`,
      color: '#008751',
    };

    try {
      const res = await feedApi.createPost({
        title: postTitle.trim(),
        summary: postSummary.trim() || 'Community submission to NewsCuddle Wire terminal.',
        content: postSummary.trim(),
        author: 'you',
        authorRole: 'Member',
        desk: deskObj.id,
        deskName: deskObj.label,
        deskSlug: deskObj.name,
        deskColor: deskObj.color || '#008751',
        category: deskObj.id,
        topics: [deskObj.label],
      });

      if (res?.post) {
        if (onAddNewPost) onAddNewPost(res.post);
        window.dispatchEvent(new CustomEvent('newscuddle:post_created', { detail: res.post }));
        try {
          const bc = new BroadcastChannel('newscuddle_feed_realtime');
          bc.postMessage({ type: 'post_created', post: res.post });
          bc.close();
        } catch (_) {}
      }

      // Reset and close
      setPostTitle('');
      setPostSummary('');
      setCreateError('');
      setShowCreatePostModal(false);
    } catch (err) {
      setCreateError(err.message || 'Failed to publish post');
    }
  };

  return (
    <>
      <aside className="reddit-right-sidebar" aria-label="Right Panel Widgets">
        {/* ================= RECENT POSTS WIDGET (MOUNTED AT TOP OF SIDEBAR FOR HOME & FEED) ================= */}
        {showRecent && (
          <div className="reddit-widget-card recent-posts-widget animate-fade-in">
            <div className="recent-widget-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={13} color="#64748b" />
                <span className="recent-widget-title">RECENT POSTS</span>
              </div>
              {recentPosts && recentPosts.length > 0 && (
                <button
                  type="button"
                  className="recent-clear-btn"
                  onClick={onClearRecent}
                  title="Clear recently viewed articles"
                >
                  Clear
                </button>
              )}
            </div>

            {recentPosts && recentPosts.length > 0 ? (
              <div className="recent-posts-list">
                {recentPosts.map((post) => {
                  const cleanDesk = (post.desk || '').replace(/^c\//, '');
                  const cleanCat = (post.category || '').replace(/^c\//, '');
                  const cleanSlug = (post.deskSlug || '').replace(/^c\//, '');

                  const isUserPostOnly = Boolean(
                    post.isUserPost ||
                    post.category === 'user' ||
                    post.desk === 'user' ||
                    cleanSlug.startsWith('u/') ||
                    cleanSlug === 'user' ||
                    post.deskSlug?.startsWith('u/') ||
                    post.deskSlug?.startsWith('c/u/') ||
                    cleanDesk.startsWith('u/') ||
                    cleanCat.startsWith('u/') ||
                    (!post.deskSlug && !post.desk && !post.category)
                  );

                  const hasCommunity = !isUserPostOnly && Boolean(
                    (cleanSlug && cleanSlug !== 'feed' && cleanSlug !== 'user' && !cleanSlug.startsWith('u/')) ||
                    (cleanDesk && cleanDesk !== 'feed' && cleanDesk !== 'user' && !cleanDesk.startsWith('u/')) ||
                    (cleanCat && cleanCat !== 'feed' && cleanCat !== 'user' && !cleanCat.startsWith('u/'))
                  );

                  const resolvedDesk = cleanSlug || cleanDesk || cleanCat || 'feed';
                  const commTarget = resolvedDesk.replace(/^c\//, '').replace(/^\//, '');
                  const displayAuthor = hasCommunity ? `c/${commTarget}` : `u/${post.author || 'member'}`;
                  const avatarInitial = hasCommunity
                    ? commTarget.charAt(0).toUpperCase()
                    : (post.author ? post.author.charAt(0).toUpperCase() : 'U');

                  return (
                    <div
                      key={post.id}
                      className="recent-post-item"
                      onClick={() => handleRecentPostClick(post)}
                      title={post.title}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="recent-post-content">
                        <div className="recent-meta-row">
                          <div
                            className="recent-avatar-circle"
                            style={{
                              backgroundColor: hasCommunity ? (post.deskColor || '#008751') : '#008751',
                              color: '#ffffff',
                            }}
                          >
                            {!hasCommunity &&
                            (post.authorAvatar ||
                              post.avatarUrl ||
                              (currentUser?.username?.toLowerCase() ===
                                (post.author || '').toLowerCase() &&
                                currentUser?.avatarUrl)) ? (
                              <img
                                src={formatMediaUrl(
                                  (currentUser?.username?.toLowerCase() ===
                                    (post.author || '').toLowerCase() &&
                                    currentUser?.avatarUrl) ||
                                    post.authorAvatar ||
                                    post.avatarUrl
                                )}
                                alt={displayAuthor}
                                className="recent-avatar-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              avatarInitial
                            )}
                          </div>
                          <span className="recent-author">
                            {displayAuthor}
                          </span>
                          <span className="recent-dot">•</span>
                          <span className="recent-time">
                            {post.createdAt
                              ? new Date(post.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Recent'}
                          </span>
                        </div>

                        <h4 className="recent-item-title">{post.title}</h4>

                        <div className="recent-stats-row">
                          <span>{post.upvotes || 0} upvotes</span>
                          <span className="recent-dot">•</span>
                          <span>{post.commentsCount || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="recent-empty-state" style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.83rem', lineHeight: '1.4' }}>
                No recently viewed posts yet. Posts you open will appear here.
              </div>
            )}
          </div>
        )}

        {/* ================= MODE: COMMUNITY PAGE / POST-DETAIL (WITH COMMUNITY) ================= */}
        {((mode === 'community' || (mode === 'post-detail' && hasCommunity)) && community) && (
          <div className="reddit-widget-card about-community-card">
            <div
              className="about-banner-strip"
              style={{
                background: `linear-gradient(135deg, ${community.color || '#008751'}, #0f172a)`,
              }}
            />
            <div className="about-content-inner">
              <div className="about-header-row">
                <div
                  className="about-logo-circle"
                  style={{
                    backgroundColor: `${community.color || '#008751'}20`,
                    color: community.color || '#008751',
                    border: `2px solid ${community.color || '#008751'}`,
                  }}
                >
                  {community.name ? community.name.replace(/^c\//, '').charAt(0).toUpperCase() : 'C'}
                </div>
                <div className="about-title-group">
                  <h3 className="about-comm-name">{community.name}</h3>
                  <span className="about-comm-handle">{community.label}</span>
                </div>
              </div>

              <p className="about-comm-desc">
                {community.description ||
                  `Welcome to ${community.name}. Specialized editorial circle on the NewsCuddle Wire.`}
              </p>

              <div className="community-stats-grid">
                <div className="comm-stat-cell">
                  <span className="comm-stat-num">
                    {(community.membersCount || 0).toLocaleString()}
                  </span>
                  <span className="comm-stat-lbl">Members</span>
                </div>
                <div className="comm-stat-cell">
                  <span className="comm-stat-num">
                    <span className="online-indicator-dot" />
                    {community.onlineCount || (community.membersCount > 0 ? 1 : 0)}
                  </span>
                  <span className="comm-stat-lbl">Online</span>
                </div>
              </div>

              <div className="about-actions-col">
                {onToggleJoin && (
                  <button
                    type="button"
                    className={`btn-community-join-main ${isJoined ? 'joined' : 'join'}`}
                    onClick={onToggleJoin}
                  >
                    {isJoined ? 'Joined Community' : '+ Join Community'}
                  </button>
                )}

                {onTogglePin && isJoined && (
                  <button
                    type="button"
                    className={`btn-community-pin-sub ${isPinned ? 'pinned' : ''}`}
                    onClick={onTogglePin}
                  >
                    {isPinned ? '★ Pinned to Sidebar' : '☆ Pin to Sidebar'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn-community-create-post"
                  onClick={() => {
                    if (onOpenCreatePost) {
                      onOpenCreatePost(community);
                    } else {
                      setShowCreatePostModal(true);
                    }
                  }}
                >
                  <Plus size={16} />
                  <span>Create Post in {community.name}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= COMMUNITY RULES ================= */}
        {(mode === 'community' && community) && (
          <div className="reddit-widget-card rules-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}>
              <ShieldCheck size={16} color={community.color || '#008751'} />
              <h4 className="rules-card-title">{community.name.toUpperCase()} RULES</h4>
            </div>
            <ol className="rules-numbered-list">
              {(community.rules && community.rules.length > 0 ? community.rules : [
                `1. Posts must pertain to ${community.label || community.name}`,
                '2. Primary institutional sources required for data claims',
                '3. No self-promotion, spam, or promotional referral links',
                '4. Maintain professional and civil analytical discourse',
                '5. Respect copyright, attribution, and member privacy',
              ]).map((rule, idx) => (
                <li key={`rule-${idx}`}>
                  {rule.startsWith(`${idx + 1}.`) ? rule : `${idx + 1}. ${rule}`}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* ================= COMMUNITY ADMINISTRATORS & MODERATORS ================= */}
        {(mode === 'community' && community) && (
          <div className="reddit-widget-card moderators-card">
            <div className="moderators-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Shield size={16} color={community.color || '#008751'} />
                <h4 className="rules-card-title">MODERATORS</h4>
              </div>
              <button
                type="button"
                className="btn-message-mods"
                onClick={() => setShowMessageModsModal(true)}
                title="Message the moderators of this community"
              >
                <Mail size={13} />
                <span>Message Mods</span>
              </button>
            </div>

            {/* Administrators section */}
            <div className="moderator-group">
              <span className="moderator-group-label">Administrators & Founders</span>
              {(community.administrators && community.administrators.length > 0
                ? community.administrators
                : [community.name.replace(/^c\//, '') + '_lead']
              ).map((admin) => (
                <div key={admin} className="moderator-row">
                  <div className="moderator-avatar-circle">
                    {admin.charAt(0).toUpperCase()}
                  </div>
                  <div className="moderator-info">
                    <span className="moderator-username">u/{admin}</span>
                    <span className="moderator-role-pill admin-pill">Admin</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Moderators section */}
            <div className="moderator-group" style={{ marginTop: '0.65rem' }}>
              <span className="moderator-group-label">Active Moderators</span>
              {(community.moderators && community.moderators.length > 0
                ? community.moderators
                : ['NewsCuddleMod', `Automod_${community.name.replace(/^c\//, '')}`]
              ).map((mod) => (
                <div key={mod} className="moderator-row">
                  <div className="moderator-avatar-circle mod">
                    {mod.charAt(0).toUpperCase()}
                  </div>
                  <div className="moderator-info">
                    <span className="moderator-username">u/{mod}</span>
                    <span className="moderator-role-pill mod-pill">Mod</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= POST DETAIL: ABOUT THE AUTHOR CARD ================= */}
        {(mode === 'post-detail' && author) && (() => {
          const effectiveAuthorBanner =
            (isCurrentAuthor ? currentUser?.bannerUrl : null) ||
            author?.bannerUrl ||
            author?.banner ||
            liveAuthorData?.bannerUrl;

          const effectiveAuthorAvatar =
            (isCurrentAuthor ? currentUser?.avatarUrl : null) ||
            author?.avatar ||
            author?.avatarUrl ||
            liveAuthorData?.avatarUrl;

          const effectiveDisplayName =
            (isCurrentAuthor
              ? currentUser?.displayName || currentUser?.name || (currentUser?.firstName ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : null)
              : null) ||
            liveAuthorData?.displayName ||
            liveAuthorData?.name ||
            (liveAuthorData?.firstName
              ? `${liveAuthorData.firstName} ${liveAuthorData.lastName || ''}`.trim()
              : null) ||
            author.displayName ||
            author.name ||
            cleanAuthorUsername;

          return (
            <div className="reddit-widget-card about-author-card">
              <div
                className="about-author-banner"
                style={
                  effectiveAuthorBanner && !bannerLoadError
                    ? {
                        backgroundImage: `url(${formatMediaUrl(effectiveAuthorBanner)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        background: 'linear-gradient(135deg, #008751 0%, #064e3b 50%, #0f172a 100%)',
                      }
                }
              />

              <div className="about-author-body">
                {/* Profile Picture row */}
                <div className="about-author-avatar-row">
                  <div
                    className="about-author-avatar"
                    onClick={() => navigate(`/u/${cleanAuthorUsername}`)}
                    title={`View u/${cleanAuthorUsername}'s profile`}
                  >
                    {effectiveAuthorAvatar && !avatarLoadError ? (
                      <img
                        src={formatMediaUrl(effectiveAuthorAvatar)}
                        alt={cleanAuthorUsername}
                        onError={() => setAvatarLoadError(true)}
                      />
                    ) : (
                      <span>{cleanAuthorUsername ? cleanAuthorUsername.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                </div>

                {/* Divider line below the profile picture */}
                <div className="about-author-divider-line" />

                {/* Name of the user, user name, and about written seamlessly under the line below the profile picture */}
                <div className="about-author-identity-block">
                  <h3
                    className="about-author-display-name"
                    onClick={() => navigate(`/u/${cleanAuthorUsername}`)}
                    title={`View u/${cleanAuthorUsername}'s profile`}
                  >
                    {effectiveDisplayName}
                  </h3>
                  <div
                    className="about-author-handle"
                    onClick={() => navigate(`/u/${cleanAuthorUsername}`)}
                    title={`View u/${cleanAuthorUsername}'s profile`}
                  >
                    u/{cleanAuthorUsername}
                  </div>

                  {/* Render User Bio / About - written naturally just like the name and username without a box container */}
                  {renderFormattedBio(
                    liveAuthorData?.bio || liveAuthorData?.about || author.bio || author.about,
                    navigate
                  )}
                </div>

              {!isAuthor && (
                <div className="about-actions-col">
                  <button
                    type="button"
                    className={`btn-community-join-main ${authorFollowed ? 'joined' : 'join'}`}
                    onClick={handleToggleFollowAuthor}
                    disabled={isFollowLoading}
                  >
                    {isFollowLoading ? 'Updating...' : authorFollowed ? '✓ Following User' : '+ Follow User'}
                  </button>
                  <button
                    type="button"
                    className="btn-community-pin-sub"
                    onClick={() => setShowMessageUserModal(true)}
                  >
                    <MessageSquare size={14} />
                    <span>Send Direct Message</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}



        {/* ================= FOOTER / LEGAL POLICIES (ANCHORED AT THE BASE NO MATTER WHAT) ================= */}
        <div className="reddit-right-footer">
          <div className="sidebar-policy-links">
            <button
              type="button"
              className="policy-link-btn"
              onClick={() => setActivePolicyModal('rules')}
            >
              NewsCuddle Rules
            </button>
            <button
              type="button"
              className="policy-link-btn"
              onClick={() => setActivePolicyModal('privacy')}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className="policy-link-btn"
              onClick={() => setActivePolicyModal('terms')}
            >
              User Agreement
            </button>
            <button
              type="button"
              className="policy-link-btn"
              onClick={() => setActivePolicyModal('accessibility')}
            >
              Accessibility
            </button>
          </div>
          <div className="sidebar-copyright-text">
            NewsCuddle, Inc. © 2026. All rights reserved.
          </div>
        </div>
      </aside>

      {/* ================= MODAL: CREATE POST ================= */}
      {showCreatePostModal && (
        <div className="onboarding-overlay" onClick={() => setShowCreatePostModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div>
                  <h3 className="modal-title">Create an Intelligence Post</h3>
                  <p className="modal-subtitle">Publish breaking reporting or analysis to an editorial desk.</p>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setShowCreatePostModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePublishPost} className="create-community-form">
                <div className="form-group-field">
                  <label className="form-field-label">TARGET EDITORIAL DESK</label>
                  <select
                    className="modal-select-field"
                    value={postDesk}
                    onChange={(e) => setPostDesk(e.target.value)}
                  >
                    {(canonicalDesks || []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label} ({d.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-field">
                  <label className="form-field-label">HEADLINE / TITLE</label>
                  <input
                    type="text"
                    className="onboarding-input"
                    style={{ padding: '0.8rem 1rem' }}
                    placeholder="Enter analytical title or wire headline..."
                    value={postTitle}
                    onChange={(e) => {
                      setPostTitle(e.target.value);
                      setCreateError('');
                    }}
                    autoFocus
                  />
                </div>

                <div className="form-group-field">
                  <label className="form-field-label">SUMMARY / CONTEXT</label>
                  <textarea
                    className="modal-textarea-field"
                    rows={4}
                    placeholder="Summarize key facts, market takeaways, or research findings..."
                    value={postSummary}
                    onChange={(e) => setPostSummary(e.target.value)}
                  />
                </div>

                {createError && <div className="modal-error-alert">{createError}</div>}

                <div className="onboarding-actions-row">
                  <button
                    type="button"
                    className="feed-select-all-btn"
                    onClick={() => setShowCreatePostModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="onboarding-next-btn btn-primary">
                    <Check size={16} />
                    <span>Publish Post</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: POLICY / RULES ================= */}
      {activePolicyModal && (
        <div className="onboarding-overlay" onClick={() => setActivePolicyModal(null)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: '#e6f6ee',
                      color: '#008751',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {activePolicyModal === 'rules' && <Shield size={18} />}
                    {activePolicyModal === 'privacy' && <Lock size={18} />}
                    {activePolicyModal === 'terms' && <FileText size={18} />}
                    {activePolicyModal === 'accessibility' && <Eye size={18} />}
                  </div>
                  <div>
                    <h3 className="modal-title">
                      {activePolicyModal === 'rules' && 'NewsCuddle Rules'}
                      {activePolicyModal === 'privacy' && 'Privacy Policy'}
                      {activePolicyModal === 'terms' && 'User Agreement'}
                      {activePolicyModal === 'accessibility' && 'Accessibility'}
                    </h3>
                    <span className="modal-subtitle">Official NewsCuddle Institutional Framework</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setActivePolicyModal(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="policy-modal-body custom-scrollbar"
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  margin: '1rem 0',
                  paddingRight: '0.5rem',
                  fontSize: '0.88rem',
                  color: '#334155',
                  lineHeight: 1.6,
                }}
              >
                {activePolicyModal === 'rules' && (
                  <div>
                    <p>
                      <strong>1. Civil, Fact-Driven Discourse:</strong> Treat all community members
                      with respect. Baseless harassment, hate speech, or defamatory claims will result in
                      immediate account suspension.
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      <strong>2. Source Verification:</strong> When sharing breaking developments, link
                      to credible primary reporting or institutional documentation.
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      <strong>3. No Automated Spam or Manipulation:</strong> Coordinated voting, spam bots,
                      or artificial metric manipulation violate terminal integrity.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'privacy' && (
                  <div>
                    <p>
                      NewsCuddle respects your privacy. We store your feed preferences, desk selections,
                      and interaction telemetry securely on encrypted MongoDB Atlas clusters.
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      We do not sell your personal telemetry or browsing habits to third-party data brokers.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'terms' && (
                  <div>
                    <p>
                      By accessing or registering with NewsCuddle, you agree to comply with our User
                      Agreement, Community Guidelines, and copyright terms.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'accessibility' && (
                  <div>
                    <p>
                      NewsCuddle is committed to ensuring full digital accessibility for individuals of all
                      abilities adhering to WCAG 2.1 AA standards.
                    </p>
                  </div>
                )}
              </div>

              <div className="onboarding-actions-row">
                <button
                  type="button"
                  className="onboarding-next-btn btn-primary"
                  onClick={() => setActivePolicyModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MESSAGE THE MODERATORS ================= */}
      {showMessageModsModal && community && (
        <div className="onboarding-overlay" onClick={() => setShowMessageModsModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div>
                  <h3 className="modal-title">Message Moderators</h3>
                  <p className="modal-subtitle">
                    Send a direct dispatch to the moderators of <strong>{community.name}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setShowMessageModsModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {modMessageSent ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(0, 135, 81, 0.1)',
                      color: '#008751',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem auto',
                    }}
                  >
                    <Check size={24} />
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Message Dispatched
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Your inquiry has been submitted to the community modmail queue.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!modMessageText.trim()) return;
                    setModMessageSent(true);
                    setTimeout(() => {
                      setModMessageSent(false);
                      setModMessageText('');
                      setShowMessageModsModal(false);
                    }, 1400);
                  }}
                  className="create-community-form"
                >
                  <div className="form-group-field">
                    <label className="form-field-label">SUBJECT OR INQUIRY</label>
                    <textarea
                      className="modal-textarea-field"
                      rows={4}
                      placeholder={`State your question, appeal, or feedback for the moderators of ${community.name}...`}
                      value={modMessageText}
                      onChange={(e) => setModMessageText(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="modal-actions-row">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowMessageModsModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!modMessageText.trim()}
                    >
                      <Send size={15} style={{ marginRight: '0.35rem' }} />
                      Send to Modmail
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MESSAGE USER ================= */}
      {showMessageUserModal && author && (
        <div className="onboarding-overlay" onClick={() => setShowMessageUserModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div>
                  <h3 className="modal-title">Direct Message</h3>
                  <p className="modal-subtitle">
                    Send a private dispatch to <strong>u/{author.username}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setShowMessageUserModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {userMessageSent ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(0, 135, 81, 0.1)',
                      color: '#008751',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem auto',
                    }}
                  >
                    <Check size={24} />
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Message Delivered
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Your message has been sent to u/{author.username}.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!userMessageText.trim()) return;
                    setUserMessageSent(true);
                    setTimeout(() => {
                      setUserMessageSent(false);
                      setUserMessageText('');
                      setShowMessageUserModal(false);
                    }, 1400);
                  }}
                  className="create-community-form"
                >
                  <div className="form-group-field">
                    <label className="form-field-label">YOUR MESSAGE</label>
                    <textarea
                      className="modal-textarea-field"
                      rows={4}
                      placeholder={`Write a message to u/${author.username}...`}
                      value={userMessageText}
                      onChange={(e) => setUserMessageText(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="modal-actions-row">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setShowMessageUserModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!userMessageText.trim()}
                    >
                      <Send size={15} style={{ marginRight: '0.35rem' }} />
                      Send Message
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RightPanel;
