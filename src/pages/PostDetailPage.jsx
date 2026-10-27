import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext, Link } from 'react-router-dom';
import {
  Hand,
  Bookmark,
  Share2,
  Award,
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
  Mail,
  Copy,
  Link2,
  Code2,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { feedApi, communityApi } from '../services/api';
import ThreadedComments from '../components/comments/ThreadedComments';
import { RightPanel } from '../components/home/RightPanel';
import { getDeskMeta } from '../components/home/LeftSidebar';
import PostMediaImage from '../components/common/PostMediaImage';

// Editorial Awards Catalog backed by MongoDB & ML Quality Multipliers
const AWARDS_CATALOG = [
  { type: 'silver', name: 'Silver Award', icon: '🥈', points: 50, desc: 'Recognizes valuable analysis & verified primary claims.' },
  { type: 'gold', name: 'Gold Award', icon: '🥇', points: 100, desc: 'Bestows a golden editorial badge on top investigative reporting.' },
  { type: 'platinum', name: 'Platinum Award', icon: '💎', points: 250, desc: 'Prestigious institutional recognition with highest Bayesian score boost.' },
  { type: 'helpful', name: 'Helpful Award', icon: '💡', points: 30, desc: 'For exceptionally clear and informative data summaries.' },
  { type: 'insightful', name: 'Insightful Award', icon: '🧠', points: 60, desc: 'Deep domain expertise and strategic foresight.' },
  { type: 'rocket', name: 'Rocket Award', icon: '🚀', points: 80, desc: 'Propels real-time trending velocity in the algorithm.' },
];

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
  const passedPost =
    location.state?.post &&
    (location.state.post.id === id ||
      location.state.post.postCode === id ||
      String(location.state.post.postNumber) === id)
      ? location.state.post
      : null;

  const [post, setPost] = useState(passedPost);
  const [loading, setLoading] = useState(!passedPost);
  const [error, setError] = useState(null);

  // Voting & Interaction State
  const [userVote, setUserVote] = useState(passedPost?.hasUpvoted ? 'up' : null);
  const [score, setScore] = useState(passedPost ? Math.max(0, passedPost.upvotes || 0) : 0);
  const [isSaved, setIsSaved] = useState(passedPost?.hasSaved || false);
  const [isFollowedPost, setIsFollowedPost] = useState(passedPost?.hasFollowedPost || false);
  const [copied, setCopied] = useState(false);

  // Modals & Popovers
  const [showMenu, setShowMenu] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedAwardType, setSelectedAwardType] = useState('gold');
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardSuccess, setAwardSuccess] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const shareMenuRef = useRef(null);

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
      window.dispatchEvent(new CustomEvent('newscuddle:post_updated', { detail: updated }));
      try {
        const bc = new BroadcastChannel('newscuddle_feed_realtime');
        bc.postMessage({ type: 'post_updated', post: updated });
        bc.close();
      } catch (_) {}
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
      window.dispatchEvent(new CustomEvent('newscuddle:post_deleted', { detail: { postId: post.id } }));
      try {
        const bc = new BroadcastChannel('newscuddle_feed_realtime');
        bc.postMessage({ type: 'post_deleted', postId: post.id });
        bc.close();
      } catch (_) {}
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
        setScore(Math.max(0, p.upvotes || 0));
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

  // Canonicalize URL to /post/:postCode (e.g. /post/0000000000001) if arrived via raw ID or number
  useEffect(() => {
    if (post && post.postCode && id && id !== post.postCode && location.pathname.startsWith('/post/')) {
      navigate(`/post/${post.postCode}`, { replace: true, state: { post } });
    }
  }, [post?.postCode, id, location.pathname, navigate]);

  // Clean identifiers
  const cleanDesk = (post?.desk || '').replace(/^c\//, '');
  const cleanCat = (post?.category || '').replace(/^c\//, '');
  const cleanSlug = (post?.deskSlug || slug || cleanDesk || cleanCat || 'feed').replace(/^c\//, '');
  const commTarget = cleanSlug;
  const commPath = cleanSlug.startsWith('u/') ? `/${cleanSlug}` : `/c/${commTarget}`;
  const displayComm = cleanSlug.startsWith('u/') ? cleanSlug : `c/${cleanSlug}`;

  // Check if post is a user post alone (not attached to a community)
  const isUserPostOnly = Boolean(
    username ||
    slug === 'user' ||
    slug === 'u' ||
    post?.isUserPost ||
    post?.category === 'user' ||
    post?.desk === 'user' ||
    cleanSlug.startsWith('u/') ||
    cleanSlug === 'user' ||
    post?.deskSlug?.startsWith('u/') ||
    post?.deskSlug?.startsWith('c/u/') ||
    (!post?.deskSlug && !post?.desk && !post?.category && !slug)
  );
  const hasCommunity = !isUserPostOnly && Boolean(cleanSlug && cleanSlug !== 'feed' && cleanSlug !== 'user' && !cleanSlug.startsWith('u/'));

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
  // Note: Downvotes are recorded and factored into feed algorithms and ML virality,
  // but do not subtract from or show in the displayed upvotes count (which remains >= 0).
  const handleVote = async (direction) => {
    if (!post) return;
    const prevVote = userVote;
    const prevScore = score;

    let newVote = prevVote;
    let newScore = prevScore;

    if (direction === 'up') {
      if (prevVote === 'up') {
        newVote = null;
        newScore = Math.max(0, prevScore - 1);
      } else {
        newVote = 'up';
        newScore = prevScore + 1;
      }
    } else if (direction === 'down') {
      if (prevVote === 'down') {
        newVote = null;
        newScore = prevScore; // un-downvoting does not change displayed upvotes
      } else if (prevVote === 'up') {
        newVote = 'down';
        newScore = Math.max(0, prevScore - 1); // switching from upvote to downvote removes previous upvote
      } else {
        newVote = 'down';
        newScore = prevScore; // new downvote does not affect upvotes display
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
        const displayUpvotes = Math.max(0, res.upvotes !== undefined ? res.upvotes : (res.score || 0));
        setScore(displayUpvotes);
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

        // Real-time synchronization with feed across tabs
        window.dispatchEvent(new CustomEvent('newscuddle:post_voted', {
          detail: {
            postId: post.id,
            upvotes: res.upvotes,
            downvotes: res.downvotes,
            score: displayUpvotes,
            direction: res.userDirection,
          }
        }));
        try {
          const bc = new BroadcastChannel('newscuddle_feed_realtime');
          bc.postMessage({
            type: 'post_voted',
            postId: post.id,
            upvotes: res.upvotes,
            downvotes: res.downvotes,
            score: displayUpvotes,
            direction: res.userDirection,
          });
          bc.close();
        } catch (_) {}
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

  // Award Post
  const handleSubmitAward = async () => {
    if (!post || !selectedAwardType || isAwarding) return;
    setIsAwarding(true);
    try {
      const res = await feedApi.awardPost(post.id, selectedAwardType);
      setAwardSuccess(true);
      setTimeout(() => {
        setAwardSuccess(false);
        setShowAwardModal(false);
      }, 1500);
      fetchPost();

      // Real-time broadcast to main feed across tabs
      try {
        const detail = {
          postId: post.id,
          award: res?.award || { type: selectedAwardType },
        };
        window.dispatchEvent(new CustomEvent('newscuddle:post_awarded', { detail }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('newscuddle_feed_realtime');
          bc.postMessage({ type: 'post_awarded', ...detail });
          bc.close();
        }
      } catch (_) {}
    } catch (err) {
      console.error('Failed to award post:', err);
    } finally {
      setIsAwarding(false);
    }
  };

  // Share Permalink & Channels Helper
  const getShareUrl = () => {
    const postCode = post?.postCode || (post?.postNumber ? String(post.postNumber).padStart(13, '0') : post?.id || id);
    return `${window.location.origin}/post/${postCode}`;
  };

  const recordShareInteraction = () => {
    if (post?.id) {
      feedApi.interact({
        feedItemId: post.id,
        action: 'share',
      }).catch(() => {});
      setPost((prev) => (prev ? { ...prev, sharesCount: (prev.sharesCount || 0) + 1 } : prev));
    }
  };

  // Close share popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showShareMenu]);

  const handleChannelShare = async (channel) => {
    const shareUrl = getShareUrl();
    const shareTitle = post?.title || 'Check out this story on NewsCuddle';
    const shareText = `${shareTitle}\n\n${shareUrl}`;

    recordShareInteraction();

    switch (channel) {
      case 'whatsapp':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'x':
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'gmail':
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'email':
      case 'mail':
        window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`I thought you'd find this interesting on NewsCuddle:\n\n${shareTitle}\n\nRead more here: ${shareUrl}`)}`;
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'outlook':
        window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'reddit':
        window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`, '_blank', 'noopener,noreferrer');
        break;
      case 'native':
      case 'nearby':
        if (typeof navigator !== 'undefined' && navigator.share) {
          try {
            await navigator.share({
              title: shareTitle,
              text: post?.summary || shareTitle,
              url: shareUrl,
            });
          } catch (_) {}
        }
        break;
      default:
        break;
    }
  };

  const handleCopyLink = () => {
    const shareUrl = getShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      recordShareInteraction();
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleCopyEmbed = () => {
    const embedCode = `<iframe src="${getShareUrl()}" width="100%" height="480" frameborder="0" scrolling="no" allowfullscreen style="border-radius:12px;border:1px solid #e2e8f0;"></iframe>`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      recordShareInteraction();
      setTimeout(() => setCopiedEmbed(false), 2200);
    }
  };

  const handleOpenMoreOptions = async () => {
    setShowShareMenu(false);
    setShowShareModal(true);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: post?.title || 'NewsCuddle',
          text: post?.summary || post?.title,
          url: getShareUrl(),
        });
      } catch (_) {
        // User closed native prompt or unsupported; modal remains open
      }
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
                  className={`vote-btn vote-btn-reddit up ${userVote === 'up' ? 'active' : ''}`}
                  onClick={() => handleVote('up')}
                  title="Upvote"
                  aria-label="Upvote"
                >
                  <Hand
                    size={20}
                    fill={userVote === 'up' ? 'rgba(0, 135, 81, 0.18)' : 'none'}
                    color={userVote === 'up' ? '#008751' : 'currentColor'}
                    strokeWidth={userVote === 'up' ? 2.2 : 1.9}
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
                  className={`vote-btn vote-btn-reddit down ${userVote === 'down' ? 'active' : ''}`}
                  onClick={() => handleVote('down')}
                  title="Downvote"
                  aria-label="Downvote"
                >
                  <Hand
                    size={20}
                    style={{ transform: 'rotate(180deg)' }}
                    fill={userVote === 'down' ? 'rgba(113, 147, 255, 0.22)' : 'none'}
                    color={userVote === 'down' ? '#7193ff' : 'currentColor'}
                    strokeWidth={userVote === 'down' ? 2.2 : 1.9}
                  />
                </button>
              </div>

              {/* Save */}
              <button
                type="button"
                className={`reddit-action-pill ${isSaved ? 'saved active' : ''}`}
                onClick={handleToggleSave}
                title={isSaved ? 'Saved to bookmarks' : 'Save post'}
              >
                <Bookmark
                  size={15}
                  fill={isSaved ? '#008751' : 'none'}
                  color={isSaved ? '#008751' : 'currentColor'}
                  strokeWidth={isSaved ? 2.2 : 1.9}
                />
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

              {/* Share Pill & Popover Menu (Picture 1) */}
              <div className="share-pill-wrapper" ref={shareMenuRef}>
                <button
                  type="button"
                  className="reddit-action-pill"
                  onClick={() => setShowShareMenu((prev) => !prev)}
                  title="Share this story"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>

                {/* Picture 1: Sleek Reddit Share Popover */}
                {showShareMenu && (
                  <div className="reddit-share-popover animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="share-popover-item"
                      onClick={() => {
                        handleCopyLink();
                        setTimeout(() => setShowShareMenu(false), 800);
                      }}
                    >
                      {copied ? <Check size={18} color="#008751" /> : <Link2 size={18} />}
                      <span>{copied ? 'Copied link!' : 'Copy link'}</span>
                    </button>

                    <button
                      type="button"
                      className="share-popover-item"
                      onClick={() => {
                        handleCopyEmbed();
                        setTimeout(() => setShowShareMenu(false), 800);
                      }}
                    >
                      {copiedEmbed ? <Check size={18} color="#008751" /> : <Code2 size={18} />}
                      <span>{copiedEmbed ? 'Copied embed code!' : 'Embed'}</span>
                    </button>

                    <div className="share-popover-divider" />

                    <button
                      type="button"
                      className="share-popover-item"
                      onClick={() => {
                        handleChannelShare('x');
                        setShowShareMenu(false);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span>X</span>
                    </button>

                    <button
                      type="button"
                      className="share-popover-item"
                      onClick={() => {
                        handleChannelShare('whatsapp');
                        setShowShareMenu(false);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.52 3.48A11.93 11.93 0 0 0 12.06 0C5.46 0 .09 5.37.09 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.23-1.63a11.9 11.9 0 0 0 5.83 1.51h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-.12-6.22-3.52-8.43zm-8.46 17.89h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.88 9.88 0 0 1-1.52-5.24c0-5.48 4.46-9.94 9.95-9.94 2.66 0 5.16 1.04 7.04 2.92a9.88 9.88 0 0 1 2.91 7.04c0 5.49-4.47 9.95-9.95 9.95zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.89-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.05 1.03-1.05 2.51s1.07 2.91 1.22 3.11c.15.2 2.11 3.22 5.11 4.52.71.31 1.27.5 1.7.64.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
                      </svg>
                      <span>WhatsApp</span>
                    </button>

                    <div className="share-popover-divider" />

                    <button
                      type="button"
                      className="share-popover-item"
                      onClick={handleOpenMoreOptions}
                    >
                      <MoreHorizontal size={18} />
                      <span>More options</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        )}

        {/* Threaded Comments Section */}
        {!loading && post && (
          <ThreadedComments postId={post.id} initialCount={post.commentsCount || 0} />
        )}

        {/* Award Selection Modal */}
        {/* ================= EDITORIAL AWARD MODAL ================= */}
        {showAwardModal && (
          <div className="onboarding-overlay" onClick={() => !isAwarding && setShowAwardModal(false)}>
            <div
              className="onboarding-modal-container"
              style={{ maxWidth: '520px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
                <div className="modal-header-with-close">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={22} color="#eab308" />
                    <h3 className="modal-title">Give an Editorial Award</h3>
                  </div>
                  <button
                    type="button"
                    className="modal-close-icon-btn"
                    onClick={() => !isAwarding && setShowAwardModal(false)}
                    disabled={isAwarding}
                  >
                    <X size={18} />
                  </button>
                </div>

                <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0.4rem 0 1rem 0' }}>
                  Reward deep investigative journalism and insightful commentary on:
                  <br />
                  <strong style={{ color: '#0f172a' }}>&ldquo;{post?.title}&rdquo;</strong>
                </p>

                {awardSuccess ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <CheckCircle2 size={44} color="#008751" style={{ margin: '0 auto 0.75rem auto' }} />
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem 0' }}>
                      Award Bestowed!
                    </h4>
                    <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>
                      The author and story have been credited with algorithmic bonus points.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="award-picker-grid">
                      {AWARDS_CATALOG.map((aw) => {
                        const isSelected = selectedAwardType === aw.type;
                        return (
                          <div
                            key={aw.type}
                            className={`award-picker-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedAwardType(aw.type)}
                          >
                            <div className="award-picker-top">
                              <span className="award-picker-emoji">{aw.icon}</span>
                              <span className="award-picker-points">+{aw.points} Karma</span>
                            </div>
                            <div className="award-picker-name">{aw.name}</div>
                            <div className="award-picker-desc">{aw.desc}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="onboarding-actions-row" style={{ marginTop: '1.25rem' }}>
                      <button
                        type="button"
                        className="onboarding-skip-btn"
                        onClick={() => setShowAwardModal(false)}
                        disabled={isAwarding}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="onboarding-next-btn btn-primary"
                        onClick={handleSubmitAward}
                        disabled={isAwarding || !selectedAwardType}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        {isAwarding ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Bestowing...</span>
                          </>
                        ) : (
                          <span>Bestow Award</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= SHARE LINK MODAL (Picture 2) ================= */}
        {showShareModal && (
          <div className="onboarding-overlay" onClick={() => setShowShareModal(false)}>
            <div
              className="share-link-modal-card animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="share-link-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Share2 size={18} color="#0f172a" />
                  <h3 className="share-link-title">Share link</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="share-modal-user-avatar" title={user?.username || 'User'}>
                    {(user?.username || 'MA').slice(0, 2).toUpperCase()}
                  </div>
                  <button
                    type="button"
                    className="modal-close-icon-btn"
                    onClick={() => setShowShareModal(false)}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Link Input Box */}
              <div className="share-link-input-box">
                <Link2 size={16} className="share-link-box-icon" />
                <input
                  type="text"
                  readOnly
                  value={getShareUrl()}
                  className="share-link-text-input"
                  onClick={(e) => e.target.select()}
                />
                <button
                  type="button"
                  className={`share-link-action-btn ${showQr ? 'active' : ''}`}
                  onClick={() => setShowQr((prev) => !prev)}
                  title={showQr ? 'Hide QR Code' : 'Show QR Code'}
                >
                  <QrCode size={16} />
                </button>
                <button
                  type="button"
                  className="share-link-action-btn"
                  onClick={handleCopyLink}
                  title="Copy link"
                >
                  {copied ? <Check size={16} color="#008751" /> : <Copy size={16} />}
                </button>
              </div>

              {/* QR Code Preview Box */}
              {showQr && (
                <div className="qr-code-preview-box">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getShareUrl())}`}
                    alt="Post QR Code"
                    width="150"
                    height="150"
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Scan with camera to open on phone
                  </span>
                </div>
              )}

              {/* Direct Contacts Row (Matching Picture 2 top contact avatars) */}
              <div className="share-direct-contacts-row">
                <button
                  type="button"
                  className="share-direct-contact-item"
                  onClick={() => handleChannelShare('gmail')}
                  title="Share to your Gmail"
                >
                  <div className="share-direct-avatar-wrapper">
                    <div className="share-direct-avatar">
                      {(user?.username || 'MA').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="share-direct-badge">
                      <Mail size={11} color="#ea4335" />
                    </div>
                  </div>
                  <span className="share-direct-name">
                    {user?.name || user?.username || 'Michael Adeleke'} (You)
                  </span>
                </button>

                <button
                  type="button"
                  className="share-direct-contact-item"
                  onClick={() => handleChannelShare('outlook')}
                  title="Share to Outlook"
                >
                  <div className="share-direct-avatar-wrapper">
                    <div className="share-direct-avatar" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                      O
                    </div>
                    <div className="share-direct-badge">
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#0078d4' }}>O</span>
                    </div>
                  </div>
                  <span className="share-direct-name">
                    outlook_{user?.id ? String(user.id).slice(0, 7) : 'account'}
                  </span>
                </button>
              </div>

              <div className="share-modal-divider" />

              {/* Share Using Section */}
              <h4 className="share-using-title">Share using</h4>
              <div className="share-using-grid">
                {/* Nearby Sharing / Device Share */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('native')}
                  title="Nearby Sharing"
                >
                  <div className="share-app-icon-circle nearby-bg">
                    <Share2 size={22} color="#0f172a" />
                  </div>
                  <span className="share-app-label">Nearby Sharing</span>
                </button>

                {/* WhatsApp */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('whatsapp')}
                  title="WhatsApp"
                >
                  <div className="share-app-icon-circle whatsapp-brand-bg">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.52 3.48A11.93 11.93 0 0 0 12.06 0C5.46 0 .09 5.37.09 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.23-1.63a11.9 11.9 0 0 0 5.83 1.51h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-.12-6.22-3.52-8.43zm-8.46 17.89h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.76.99 1-3.66-.24-.38a9.88 9.88 0 0 1-1.52-5.24c0-5.48 4.46-9.94 9.95-9.94 2.66 0 5.16 1.04 7.04 2.92a9.88 9.88 0 0 1 2.91 7.04c0 5.49-4.47 9.95-9.95 9.95zm5.46-7.46c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.89-.8-1.5-1.78-1.67-2.08-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.05 1.03-1.05 2.51s1.07 2.91 1.22 3.11c.15.2 2.11 3.22 5.11 4.52.71.31 1.27.5 1.7.64.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" />
                    </svg>
                  </div>
                  <span className="share-app-label">WhatsApp</span>
                </button>

                {/* Gmail */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('gmail')}
                  title="Gmail"
                >
                  <div className="share-app-icon-circle gmail-brand-bg">
                    <Mail size={22} color="#ea4335" />
                  </div>
                  <span className="share-app-label">Gmail</span>
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('facebook')}
                  title="Facebook"
                >
                  <div className="share-app-icon-circle facebook-brand-bg">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>
                  <span className="share-app-label">Facebook</span>
                </button>

                {/* Twitter / X */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('x')}
                  title="Twitter"
                >
                  <div className="share-app-icon-circle x-brand-bg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </div>
                  <span className="share-app-label">Twitter</span>
                </button>

                {/* LinkedIn */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('linkedin')}
                  title="LinkedIn"
                >
                  <div className="share-app-icon-circle linkedin-brand-bg">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                    </svg>
                  </div>
                  <span className="share-app-label">LinkedIn</span>
                </button>

                {/* Outlook */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('outlook')}
                  title="Outlook"
                >
                  <div className="share-app-icon-circle outlook-brand-bg">
                    <Mail size={22} color="#ffffff" />
                  </div>
                  <span className="share-app-label">Outlook</span>
                </button>

                {/* Reddit */}
                <button
                  type="button"
                  className="share-app-item"
                  onClick={() => handleChannelShare('reddit')}
                  title="Reddit"
                >
                  <div className="share-app-icon-circle reddit-brand-bg">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.56 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z" />
                    </svg>
                  </div>
                  <span className="share-app-label">Reddit</span>
                </button>
              </div>
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
        isAuthor={isAuthor}
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
          const target = p.postCode || p.id;
          navigate(`/post/${target}`, { state: { post: p } });
        }}
        onAddNewPost={(newPost) => {
          if (!newPost || !newPost.id) return;
          const target = newPost.postCode || newPost.id;
          navigate(`/post/${target}`, { state: { post: newPost } });
        }}
      />
    </>
  );
};

export default PostDetailPage;
