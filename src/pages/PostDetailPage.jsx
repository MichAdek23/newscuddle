import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  Bookmark,
  Share2,
  Award,
  Sparkles,
  MoreHorizontal,
  Bell,
  EyeOff,
  Flag,
  Check,
  CheckCircle2,
  X,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { feedApi, communityApi } from '../services/api';
import ThreadedComments from '../components/comments/ThreadedComments';
import { RightPanel } from '../components/home/RightPanel';
import { getDeskMeta } from '../components/home/LeftSidebar';
import PostMediaImage from '../components/common/PostMediaImage';

export const PostDetailPage = () => {
  const { user } = useAuth();
  const { slug, id, username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const context = useOutletContext() || {};

  const {
    canonicalDesks = [],
    userDeskIds = [],
    pinnedDeskIds = [],
    customCommunities = [],
    savedPosts = [],
    recentPosts = [],
    onToggleJoinDesk,
    onTogglePin,
    onToggleSave,
    onRecordRecentView,
    onClearRecent,
  } = context;

  // Passed state if user arrived via clicking a post card/item
  const passedPost = location.state?.post && location.state.post.id === id ? location.state.post : null;

  const [post, setPost] = useState(passedPost);
  const [loading, setLoading] = useState(!passedPost);
  const [error, setError] = useState(null);

  // Voting & Interaction State
  const [userVote, setUserVote] = useState(passedPost?.hasUpvoted ? 'up' : null);
  const [score, setScore] = useState(passedPost ? (passedPost.upvotes || 0) - (passedPost.downvotes || 0) : 0);
  const [isSaved, setIsSaved] = useState(passedPost?.hasSaved || false);
  const [isFollowedPost, setIsFollowedPost] = useState(passedPost?.hasFollowedPost || false);
  const [copied, setCopied] = useState(false);

  // Modals & Popovers
  const [showMenu, setShowMenu] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [whyExplanation, setWhyExplanation] = useState(null);
  const [loadingWhy, setLoadingWhy] = useState(false);
  const [awardSuccess, setAwardSuccess] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Author Edit Post state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Author Delete Post state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isAuthor = Boolean(
    user && post && (
      (user.username && post.author && user.username.toLowerCase() === post.author.toLowerCase()) ||
      (user.id && post.authorId && String(user.id) === String(post.authorId)) ||
      (user._id && post.authorId && String(user._id) === String(post.authorId)) ||
      (user.id && post.userId && String(user.id) === String(post.userId)) ||
      (user._id && post.userId && String(user._id) === String(post.userId)) ||
      post.author === 'you' ||
      post.isAuthor === true
    )
  );

  const handleOpenEdit = () => {
    setShowMenu(false);
    setEditTitle(post?.title || '');
    setEditContent(post?.content || post?.summary || '');
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!post || !editTitle.trim()) return;
    setIsEditing(true);
    setEditError('');
    try {
      const summaryText = editContent.trim()
        ? (editContent.trim().length > 280 ? editContent.trim().slice(0, 280) + '...' : editContent.trim())
        : (post.summary || '');
      const res = await feedApi.updatePost({
        id: post.id,
        title: editTitle.trim(),
        content: editContent.trim(),
        summary: summaryText,
      });
      const updated = res?.post || {
        ...post,
        title: editTitle.trim(),
        content: editContent.trim(),
        summary: summaryText,
      };
      setPost((prev) => ({ ...prev, ...updated }));
      setShowEditModal(false);
    } catch (err) {
      setEditError(err.message || 'Failed to update post');
    } finally {
      setIsEditing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!post) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const userId = user?.id || user?._id;
      await feedApi.deletePost(post.id, userId);
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  // Community hover popover state
  const [isHoveringCommunity, setIsHoveringCommunity] = useState(false);
  const [communityDetails, setCommunityDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Format post date nicely matching reference screenshot (e.g. Oct 22, 05:49 AM)
  const formatPostDate = (isoString) => {
    if (!isoString) return 'Oct 22, 05:49 AM';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Oct 22, 05:49 AM';
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (_) {
      return 'Oct 22, 05:49 AM';
    }
  };

  // When arriving on post details, register the post as a recent view
  useEffect(() => {
    if (passedPost && onRecordRecentView) {
      onRecordRecentView(passedPost);
    }
  }, [passedPost, onRecordRecentView]);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    try {
      if (!passedPost) {
        setLoading(true);
      }
      setError(null);
      const res = await feedApi.getPost(id);
      if (res && res.success && res.post) {
        const p = res.post;
        setPost(p);
        setScore((p.upvotes || 0) - (p.downvotes || 0));
        setUserVote(
          p.userVote === 1 || p.hasUpvoted
            ? 'up'
            : p.userVote === -1 || p.hasDownvoted
            ? 'down'
            : null
        );
        setIsSaved(Boolean(p.hasSaved));
        setIsFollowedPost(p.hasFollowedPost || false);

        // Register post details as recent view
        if (onRecordRecentView) {
          onRecordRecentView(p);
        }
      } else {
        if (!passedPost) {
          setError('Article not found.');
        }
      }
    } catch (err) {
      console.error('Failed to load post detail:', err);
      if (!passedPost) {
        setError('Unable to load article. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  }, [id, passedPost, onRecordRecentView]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Clean identifiers
  const cleanDesk = (post?.desk || '').replace(/^c\//, '');
  const cleanCat = (post?.category || '').replace(/^c\//, '');
  const cleanSlug = (post?.deskSlug || slug || cleanDesk || cleanCat || 'feed').replace(/^c\//, '');
  const commTarget = cleanSlug;
  const commPath = `/c/${commTarget}`;
  const displayComm = `c/${cleanSlug}`;

  // Check if post is a user post alone (not attached to a community)
  const isUserPostOnly = Boolean(
    username ||
    slug === 'user' ||
    slug === 'u' ||
    post?.isUserPost ||
    post?.category === 'user' ||
    post?.desk === 'user' ||
    post?.deskSlug?.startsWith('u/') ||
    (!post?.deskSlug && !post?.desk && !post?.category && !slug)
  );
  const hasCommunity = !isUserPostOnly && Boolean(cleanSlug && cleanSlug !== 'feed' && cleanSlug !== 'user');

  // Automatically fetch community metadata when attached to a community
  useEffect(() => {
    if (hasCommunity && commTarget && commTarget !== 'feed') {
      communityApi.getCommunityDetails(commTarget)
        .then((res) => {
          if (res && res.success && res.community) {
            setCommunityDetails(res.community);
          }
        })
        .catch(() => {});
    }
  }, [hasCommunity, commTarget]);

  // Construct community data object with rules, administrators, and moderators
  const communityObj = useMemo(() => {
    if (!hasCommunity) return null;
    const fromCustom = customCommunities?.find(
      (c) => c.name === displayComm || c.slug === commTarget || c.id === commTarget
    );
    const fromCanonical = canonicalDesks?.find(
      (d) => d.id === commTarget || d.name === displayComm
    );
    const deskMeta = getDeskMeta(commTarget);
    return {
      name: displayComm,
      label: communityDetails?.label || fromCustom?.label || fromCanonical?.label || deskMeta?.label || cleanSlug.replace(/_/g, ' '),
      description: communityDetails?.description || fromCustom?.description || fromCanonical?.description || `${displayComm} reporting and community intelligence discussions on NewsCuddle.`,
      color: communityDetails?.color || fromCustom?.color || fromCanonical?.color || deskMeta?.color || post?.deskColor || '#008751',
      membersCount: communityDetails?.membersCount ?? fromCustom?.membersCount ?? fromCanonical?.membersCount ?? 0,
      weeklyVisitors: communityDetails?.weeklyVisitors ?? (post?.viewsCount || 0),
      weeklyContributions: communityDetails?.weeklyContributions ?? (post?.commentsCount || 0),
      rules: communityDetails?.rules || [
        `Posts must directly pertain to ${communityDetails?.label || cleanSlug}`,
        'Primary sources & verified institutional references required',
        'No self-promotion, spam, or referral links',
        'Maintain professional, analytical, and civil discourse',
        'Respect copyright, attribution, and member privacy',
      ],
      administrators: communityDetails?.administrators || [
        communityDetails?.creatorUsername || `${cleanSlug}_lead`
      ],
      moderators: communityDetails?.moderators || [
        'NewsCuddleMod',
        `Automod_${cleanSlug}`
      ],
      createdAt: communityDetails?.createdAt || fromCustom?.createdAt,
    };
  }, [hasCommunity, displayComm, commTarget, cleanSlug, communityDetails, customCommunities, canonicalDesks, post?.deskColor]);

  // Check if current user is joined to this community
  const isJoined = Boolean(
    (userDeskIds && (
      userDeskIds.includes(post?.category) ||
      userDeskIds.includes(cleanCat) ||
      userDeskIds.includes(post?.desk) ||
      userDeskIds.includes(cleanDesk) ||
      userDeskIds.includes(post?.deskSlug) ||
      userDeskIds.includes(cleanSlug) ||
      userDeskIds.includes(commTarget) ||
      userDeskIds.includes(displayComm)
    )) ||
    (customCommunities && customCommunities.some((c) =>
      c.id === post?.desk || c.name === post?.deskSlug || c.name === `c/${cleanDesk}` || c.id === commTarget || c.name === displayComm
    ))
  );

  // Toggle join community helper
  const handleToggleJoinCommunity = () => {
    if (!onToggleJoinDesk) return;
    const matchingId = (userDeskIds || []).find((id) =>
      id === commTarget ||
      id === displayComm ||
      id === post?.category ||
      id === cleanCat ||
      id === post?.desk ||
      id === cleanDesk ||
      id === post?.deskSlug ||
      id === cleanSlug
    );
    onToggleJoinDesk(matchingId || commTarget || post?.category);
  };

  const handleToggleFollowAuthor = async () => {
    if (!post || !post.author) return;
    try {
      await feedApi.toggleFollowUser(post.author);
      setPost((prev) => prev ? { ...prev, hasFollowedAuthor: !prev.hasFollowedAuthor } : prev);
    } catch (_) {}
  };

  // Real Upvote / Downvote / Unvote Handler
  const handleVote = async (direction) => {
    if (!post) return;
    const prevVote = userVote;
    const prevScore = score;

    let newVote = prevVote;
    let newScore = prevScore;

    if (direction === 'up') {
      if (prevVote === 'up') {
        newVote = null;
        newScore -= 1;
      } else {
        newVote = 'up';
        newScore += prevVote === 'down' ? 2 : 1;
      }
    } else if (direction === 'down') {
      if (prevVote === 'down') {
        newVote = null;
        newScore += 1;
      } else {
        newVote = 'down';
        newScore -= prevVote === 'up' ? 2 : 1;
      }
    }

    setUserVote(newVote);
    setScore(newScore);

    try {
      const res = await feedApi.votePost({
        postId: post.id,
        direction: direction === 'up' ? 1 : -1,
      });
      if (res && res.success) {
        setScore(res.score);
        setUserVote(res.userDirection === 1 ? 'up' : res.userDirection === -1 ? 'down' : null);
        setPost((prev) =>
          prev
            ? {
                ...prev,
                upvotes: res.upvotes,
                downvotes: res.downvotes,
                hasUpvoted: res.hasUpvoted,
                hasDownvoted: res.hasDownvoted,
                userVote: res.userDirection,
              }
            : prev
        );
      }
    } catch (e) {
      console.warn('Post detail vote failed, reverting optimistic state:', e);
      setUserVote(prevVote);
      setScore(prevScore);
    }
  };

  // Toggle Save with real database persistence
  const handleToggleSave = async () => {
    if (!post) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (onToggleSave) onToggleSave(post);

    try {
      const res = await feedApi.toggleSavePost({ postId: post.id });
      if (res && res.success) {
        setIsSaved(res.hasSaved);
        setPost((prev) =>
          prev ? { ...prev, hasSaved: res.hasSaved, savesCount: res.savesCount } : prev
        );
      }
    } catch (_) {
      setIsSaved(!nextSaved);
    }
  };

  // Toggle Follow Post
  const handleToggleFollowPost = async () => {
    if (!post) return;
    const nextFollow = !isFollowedPost;
    setIsFollowedPost(nextFollow);
    setShowMenu(false);

    try {
      await feedApi.toggleFollowPost(post.id);
    } catch (_) {
      setIsFollowedPost(!nextFollow);
    }
  };

  // Explain Recommendation
  const handleOpenWhy = async () => {
    if (!post) return;
    setShowWhyModal(true);
    setLoadingWhy(true);
    try {
      const res = await feedApi.explainRecommendation(post.id, {
        pinned: pinnedDeskIds,
        joined: userDeskIds,
      });
      if (res && res.success) {
        setWhyExplanation(res.explanation);
      }
    } catch (err) {
      console.error('Failed to get explanation:', err);
    } finally {
      setLoadingWhy(false);
    }
  };

  // Award Post
  const handleAward = async (awardType) => {
    if (!post) return;
    try {
      await feedApi.awardPost(post.id, awardType);
      setAwardSuccess(true);
      setTimeout(() => {
        setAwardSuccess(false);
        setShowAwardModal(false);
      }, 1500);
      fetchPost();
    } catch (err) {
      console.error('Failed to award post:', err);
    }
  };

  // Share
  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (post?.id) {
      feedApi.interact({
        feedItemId: post.id,
        action: 'share',
      }).catch(() => {});
    }
  };

  // Community hover popover loader
  const handleCommunityMouseEnter = () => {
    setIsHoveringCommunity(true);
    if (!communityDetails && commTarget) {
      setLoadingDetails(true);
      communityApi.getCommunityDetails(commTarget)
        .then((res) => {
          if (res && res.success && res.community) {
            setCommunityDetails(res.community);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingDetails(false));
    }
  };

  return (
    <>
      <main className="reddit-main-feed post-detail-main">
        {/* Breadcrumb / Back Bar */}
        <div className="post-detail-back-bar">
          <Link
            to="/"
            className="post-back-btn"
            title="Return to Home Feed"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowLeft size={16} />
            <span>Home</span>
          </Link>

          <span className="breadcrumb-separator">/</span>

          {hasCommunity ? (
            <Link to={commPath} className="breadcrumb-comm-link">
              {displayComm}
            </Link>
          ) : (
            <span className="breadcrumb-comm-link">
              u/{post?.author || 'member'}
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="skeleton-card animate-pulse" style={{ padding: '2rem 1rem' }}>
            <div className="skeleton-header">
              <div className="skeleton-avatar skeleton-box" />
              <div className="skeleton-meta skeleton-box" />
            </div>
            <div className="skeleton-title skeleton-box" style={{ height: '32px' }} />
            <div className="skeleton-text-1 skeleton-box" style={{ height: '18px' }} />
            <div className="skeleton-text-2 skeleton-box" style={{ height: '18px' }} />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="empty-feed-card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{error}</h3>
            <p style={{ color: '#64748b', marginTop: '0.5rem' }}>
              The post may have been removed or the URL is incorrect.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '1.25rem' }}
              onClick={() => navigate('/')}
            >
              Return to Home Feed
            </button>
          </div>
        )}

        {/* Full Post Detail Card */}
        {!loading && post && (
          <article className="post-detail-card">
            {/* Clean Header: matches user image - Community Name • Date + Join [...] */}
            <div className="reddit-post-header post-detail-clean-header">
              <div className="post-header-left">
                {hasCommunity ? (
                  <>
                    {/* Community Emblem Circle */}
                    <div
                      className="community-badge-icon"
                      style={{
                        backgroundColor: `${communityObj?.color || post.deskColor || '#008751'}20`,
                        color: communityObj?.color || post.deskColor || '#008751',
                      }}
                      onClick={() => navigate(commPath)}
                      title={`Go to ${displayComm}`}
                    >
                      {displayComm.replace(/^c\//, '').charAt(0).toUpperCase()}
                    </div>

                    {/* Community Name Link */}
                    <Link
                      to={commPath}
                      className="community-name-link post-detail-comm-name"
                      title={`Go to ${displayComm}`}
                    >
                      {displayComm}
                    </Link>

                    <span className="reddit-post-dot">•</span>

                    {/* Timestamp: e.g. Oct 22, 05:49 AM */}
                    <span className="reddit-post-time">
                      {formatPostDate(post.createdAt)}
                    </span>

                    {/* Green Join Button matching user image - hidden on author's own post */}
                    {!isAuthor && !displayComm.startsWith('c/u/') && (
                      <button
                        type="button"
                        className={`btn-community-join ${isJoined ? 'joined' : ''}`}
                        onClick={handleToggleJoinCommunity}
                      >
                        {isJoined ? 'Joined' : '+ Join'}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* User profile picture for user post alone */}
                    <div className="user-author-avatar-circle">
                      {post.author ? post.author.charAt(0).toUpperCase() : 'U'}
                    </div>

                    <span className="user-author-name">
                      u/{post.author || 'member'}
                    </span>

                    <span className="reddit-post-dot">•</span>

                    <span className="reddit-post-time">
                      {formatPostDate(post.createdAt)}
                    </span>

                    {!isAuthor && (
                      <button
                        type="button"
                        className={`btn-community-join ${post.hasFollowedAuthor ? 'joined' : ''}`}
                        onClick={handleToggleFollowAuthor}
                      >
                        {post.hasFollowedAuthor ? 'Following' : '+ Follow'}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Menu Button on far right */}
              <div className="post-header-right">
                <div className="post-menu-dropdown-wrapper">
                  <button
                    type="button"
                    className="post-header-menu-btn"
                    onClick={() => setShowMenu(!showMenu)}
                    aria-label="Post options"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {showMenu && (
                    <div className="post-menu-dropdown animate-fade-in">
                      {isAuthor && (
                        <>
                          <button
                            type="button"
                            className="post-menu-item"
                            onClick={handleOpenEdit}
                          >
                            <Pencil size={15} color="#008751" />
                            <span style={{ fontWeight: 600 }}>Edit Post</span>
                          </button>
                          <button
                            type="button"
                            className="post-menu-item danger"
                            onClick={() => {
                              setShowMenu(false);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 size={15} color="#dc2626" />
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Delete Post</span>
                          </button>
                          <div className="menu-divider" />
                        </>
                      )}

                      {!isAuthor && (
                        <button
                          type="button"
                          className="post-menu-item"
                          onClick={handleToggleFollowPost}
                        >
                          <Bell size={15} />
                          <span>{isFollowedPost ? 'Unfollow Post' : 'Follow Post'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="post-menu-item"
                        onClick={handleToggleSave}
                      >
                        <Bookmark size={15} />
                        <span>{isSaved ? 'Remove from Saved' : 'Save Post'}</span>
                      </button>

                      {!isAuthor && (
                        <button
                          type="button"
                          className="post-menu-item"
                          onClick={() => {
                            setShowMenu(false);
                            setShowAwardModal(true);
                          }}
                        >
                          <Award size={15} />
                          <span>Give Award</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="post-menu-item"
                        onClick={() => {
                          setShowMenu(false);
                          handleOpenWhy();
                        }}
                      >
                        <Sparkles size={15} />
                        <span>Why was I recommended this?</span>
                      </button>

                      {!isAuthor && (
                        <>
                          <div className="menu-divider" />
                          <button
                            type="button"
                            className="post-menu-item danger"
                            onClick={() => {
                              feedApi.reportPost({ postId: post.id, reason: 'inappropriate' });
                              setReportSuccess(true);
                              setShowMenu(false);
                            }}
                          >
                            <Flag size={15} />
                            <span>Report Post</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="post-detail-title">{post.title}</h1>

            {/* Media if present (Image or Animated GIF) with Image Skeleton Loader ("Skewer") */}
            {(post.mediaUrl || post.imageUrl) && (
              <PostMediaImage
                src={post.mediaUrl || post.imageUrl}
                alt={post.imageCaption || post.title}
                aspectRatio={post.aspectRatio || post.mediaAnalysis?.aspectRatioLabel}
                wrapperClassName="post-detail-media-box"
                className="post-detail-image"
                isAnimated={post.mediaType === 'gif' || post.mediaAnalysis?.isAnimated}
                frameCount={post.mediaAnalysis?.frameCount}
                caption={post.imageCaption}
              />
            )}



            {/* Full Content / Summary */}
            <div className="post-detail-body">
              <p>{post.content || post.summary}</p>
            </div>

            {/* Awards Summary if present */}
            {post.awards && post.awards.length > 0 && (
              <div className="post-awards-ribbon">
                {post.awards.map((aw) => (
                  <span key={aw.awardType} className="award-ribbon-badge">
                    🏆 {aw.awardType} ({aw.count})
                  </span>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="reddit-post-actions">
              {/* Vote Pill */}
              <div className="reddit-vote-pill">
                <button
                  type="button"
                  className={`vote-btn-reddit up ${userVote === 'up' ? 'active' : ''}`}
                  onClick={() => handleVote('up')}
                  title="Upvote"
                  aria-label="Upvote"
                >
                  <ArrowBigUp
                    size={20}
                    fill={userVote === 'up' ? '#008751' : 'none'}
                    color={userVote === 'up' ? '#008751' : 'currentColor'}
                  />
                </button>
                <span
                  className={`vote-count-reddit ${
                    userVote === 'up' ? 'active-up' : userVote === 'down' ? 'active-down' : ''
                  }`}
                >
                  {score}
                </span>
                <button
                  type="button"
                  className={`vote-btn-reddit down ${userVote === 'down' ? 'active' : ''}`}
                  onClick={() => handleVote('down')}
                  title="Downvote"
                  aria-label="Downvote"
                >
                  <ArrowBigDown
                    size={20}
                    fill={userVote === 'down' ? '#7193ff' : 'none'}
                    color={userVote === 'down' ? '#7193ff' : 'currentColor'}
                  />
                </button>
              </div>

              {/* Save */}
              <button
                type="button"
                className={`reddit-action-pill ${isSaved ? 'active' : ''}`}
                onClick={handleToggleSave}
                title={isSaved ? 'Saved' : 'Save post'}
              >
                <Bookmark size={15} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              {/* Award */}
              <button
                type="button"
                className="reddit-action-pill"
                onClick={() => setShowAwardModal(true)}
                title="Give an Award"
              >
                <Award size={15} />
                <span>Award</span>
              </button>

              {/* Share */}
              <button
                type="button"
                className="reddit-action-pill"
                onClick={handleShare}
                title="Share link"
              >
                {copied ? <Check size={15} color="#008751" /> : <Share2 size={15} />}
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>

              {/* Why Recommended */}
              <button
                type="button"
                className="reddit-action-pill why-pill"
                onClick={handleOpenWhy}
                title="Why was I recommended this?"
              >
                <Sparkles size={15} />
                <span className="why-text">Why recommended?</span>
              </button>
            </div>
          </article>
        )}

        {/* Threaded Comments Section */}
        {!loading && post && (
          <ThreadedComments postId={post.id} initialCount={post.commentsCount || 0} />
        )}

        {/* Award Selection Modal */}
        {showAwardModal && (
          <div className="modal-backdrop-reddit" onClick={() => setShowAwardModal(false)}>
            <div className="award-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <h3>Give an Award</h3>
                <button type="button" className="close-btn" onClick={() => setShowAwardModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <p className="modal-subtitle">
                Reward outstanding institutional analysis and elevate it across NewsCuddle.
              </p>

              {awardSuccess ? (
                <div className="award-success-box">
                  <CheckCircle2 size={36} color="#008751" />
                  <h4>Award sent!</h4>
                  <p>The author and community have been credited.</p>
                </div>
              ) : (
                <div className="award-options-grid">
                  {[
                    { id: 'silver', label: 'Silver Award', icon: '🥈', desc: 'Highlights post with a silver badge' },
                    { id: 'gold', label: 'Gold Award', icon: '🥇', desc: 'Gives 100 bonus algorithmic priority points' },
                    { id: 'platinum', label: 'Platinum Award', icon: '💎', desc: 'Top-tier institutional endorsement' },
                    { id: 'helpful', label: 'Helpful', icon: '💡', desc: 'Acknowledges high clarity & insight' },
                    { id: 'rocket', label: 'Rocket', icon: '🚀', desc: 'Boosts trending velocity across desks' },
                  ].map((aw) => (
                    <button
                      key={aw.id}
                      type="button"
                      className="award-select-card"
                      onClick={() => handleAward(aw.id)}
                    >
                      <span className="award-emoji">{aw.icon}</span>
                      <strong className="award-name">{aw.label}</strong>
                      <span className="award-hint">{aw.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Why Was I Recommended Modal */}
        {showWhyModal && (
          <div className="modal-backdrop-reddit" onClick={() => setShowWhyModal(false)}>
            <div className="why-modal-card animate-scale-up" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <div className="modal-title-with-icon">
                  <Sparkles size={20} color="#008751" />
                  <h3>Recommendation Intelligence</h3>
                </div>
                <button type="button" className="close-btn" onClick={() => setShowWhyModal(false)}>
                  <X size={18} />
                </button>
              </div>

              {loadingWhy ? (
                <div className="why-loading-state">
                  <div className="skeleton-box" style={{ width: '80%', height: '18px', marginBottom: '10px' }} />
                  <div className="skeleton-box" style={{ width: '60%', height: '14px' }} />
                </div>
              ) : whyExplanation ? (
                <div className="why-modal-content">
                  <div className="why-score-banner">
                    <span className="why-score-label">Personalized Relevance Score</span>
                    <strong className="why-score-number">{whyExplanation.personalizedScore}</strong>
                  </div>

                  <h4 className="why-section-title">Key Signals & Attributions:</h4>
                  <ul className="why-reasons-list">
                    {whyExplanation.reasons?.map((reason, idx) => (
                      <li key={idx} className="why-reason-item">
                        <CheckCircle2 size={16} color="#008751" className="flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="why-transparency-box">
                    <p>
                      NewsCuddle uses an open multi-objective continuous learning engine. As you read, vote, award, and comment, your topic weights update dynamically without dark patterns or echo chambers.
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#64748b', padding: '1rem 0' }}>Explanation details unavailable.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= EDIT POST MODAL ================= */}
      {showEditModal && (
        <div className="onboarding-overlay" onClick={() => !isEditing && setShowEditModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '580px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Pencil size={20} color="#008751" />
                  <h3 className="modal-title">Edit Post</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => !isEditing && setShowEditModal(false)}
                  disabled={isEditing}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Headline / Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                    Content / Summary
                  </label>
                  <textarea
                    rows={5}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      resize: 'vertical',
                    }}
                  />
                </div>

                {editError && (
                  <div style={{ padding: '0.6rem 0.8rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.82rem' }}>
                    {editError}
                  </div>
                )}

                <div className="onboarding-actions-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="onboarding-skip-btn"
                    onClick={() => setShowEditModal(false)}
                    disabled={isEditing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="onboarding-next-btn btn-primary"
                    disabled={isEditing || !editTitle.trim()}
                    style={{
                      backgroundColor: '#008751',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {isEditing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE POST CONFIRMATION MODAL ================= */}
      {showDeleteModal && (
        <div className="onboarding-overlay" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Trash2 size={20} color="#dc2626" />
                  <h3 className="modal-title">Delete post?</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => !isDeleting && setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to delete &ldquo;<strong>{post?.title}</strong>&rdquo;? You cannot undo this action.
                </p>
                {deleteError && (
                  <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.8rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.82rem' }}>
                    {deleteError}
                  </div>
                )}
              </div>

              <div className="onboarding-actions-row" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="onboarding-skip-btn"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="onboarding-next-btn btn-primary"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  style={{
                    backgroundColor: '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Sidebar */}
      <RightPanel
        mode="post-detail"
        hasCommunity={hasCommunity}
        community={communityObj}
        author={{
          username: post?.author || 'member',
          role: post?.authorRole || 'Community Contributor',
          avatar: post?.authorAvatar,
          bio: post?.authorBio,
          upvotes: post?.upvotes || 0,
          commentsCount: post?.commentsCount || 0,
        }}
        userCommunitiesJoined={(canonicalDesks || []).filter((d) =>
          userDeskIds.includes(d.id)
        )}
        isJoined={isJoined}
        isPinned={pinnedDeskIds && (pinnedDeskIds.includes(commTarget) || pinnedDeskIds.includes(displayComm))}
        onToggleJoin={handleToggleJoinCommunity}
        onTogglePin={() => onTogglePin && onTogglePin(post?.category || commTarget)}
        savedPosts={savedPosts}
        canonicalDesks={canonicalDesks}
        showRecent={false}
        onSelectPost={(p) => {
          if (!p || !p.id) return;
          const clean = (p.deskSlug || p.desk || p.category || 'feed')
            .replace(/^c\//, '')
            .replace(/^\//, '');
          navigate(`/c/${clean || 'feed'}/comments/${p.id}`, { state: { post: p } });
        }}
        onAddNewPost={(newPost) => {
          if (!newPost || !newPost.id) return;
          const clean = (newPost.deskSlug || newPost.desk || newPost.category || 'feed')
            .replace(/^c\//, '')
            .replace(/^\//, '');
          navigate(`/c/${clean || 'feed'}/comments/${newPost.id}`, { state: { post: newPost } });
        }}
      />
    </>
  );
};

export default PostDetailPage;
