import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { feedApi, communityApi } from '../../services/api';
import PostMediaImage from '../common/PostMediaImage';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  Check,
  SlidersHorizontal,
  ExternalLink,
  Newspaper,
  Bell,
  Award,
  EyeOff,
  HelpCircle,
  Flag,
  X,
  UserPlus,
  UserCheck,
  Loader2,
  Film,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react';

// Format count into Reddit style: 8.6k, 120, 1.2M
function formatCount(num) {
  if (!num || num === 0) return '0';
  const abs = Math.abs(num);
  if (abs >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num);
}

// Format relative date into Reddit style: 3 days ago, 2h ago, Just now
function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Real Editorial Awards Catalog backed by MongoDB & ML Quality Multiplier
const AWARDS_CATALOG = [
  { type: 'silver', name: 'Silver Award', icon: '🥈', points: 50, desc: 'Recognizes valuable analysis & verified primary claims.' },
  { type: 'gold', name: 'Gold Award', icon: '🥇', points: 100, desc: 'Bestows a golden editorial badge on top investigative reporting.' },
  { type: 'platinum', name: 'Platinum Award', icon: '💎', points: 250, desc: 'Prestigious institutional recognition with highest Bayesian score boost.' },
  { type: 'helpful', name: 'Helpful Award', icon: '💡', points: 30, desc: 'For exceptionally clear and informative data summaries.' },
  { type: 'insightful', name: 'Insightful Award', icon: '🧠', points: 60, desc: 'Deep domain expertise and strategic foresight.' },
  { type: 'rocket', name: 'Rocket Award', icon: '🚀', points: 80, desc: 'Propels real-time trending velocity in the algorithm.' },
];

// Violation Report Options
const REPORT_REASONS = [
  { id: 'misinformation', title: 'Misinformation or Unverified Sources', desc: 'Contains demonstrably false data, fabricated claims, or manipulated media.' },
  { id: 'spam', title: 'Spam or Commercial Promotion', desc: 'Repetitive submissions, affiliate links, or promotional advertisements.' },
  { id: 'harassment', title: 'Harassment or Uncivil Discourse', desc: 'Hostile personal attacks, threatening behavior, or abusive language.' },
  { id: 'rules_violation', title: 'Violates Desk Editorial Guidelines', desc: 'Off-topic for this community desk or lacks required primary source citations.' },
  { id: 'low_quality', title: 'Low Editorial Quality', desc: 'Incoherent reporting, clickbait headline, or unoriginal duplicate post.' },
];

export const MainFeed = ({
  searchQuery = '',
  activeFeed = 'home',
  activeDesk = null,
  initialSort = null,
  savedPosts = [],
  userDeskIds = [],
  pinnedDeskIds = [],
  customCommunities = [],
  onToggleJoinDesk,
  onToggleSave,
  onClearDesk,
  onArticleClick,
  onOpenCreatePost,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sort mode parameter passed to backend (defaults according to route)
  const sortParam = initialSort || (activeFeed === 'popular' ? 'hot' : activeFeed === 'news' ? 'new' : 'personalized');

  // Feed items loaded from real MongoDB ML recommendation engine
  const [feedItems, setFeedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Local interaction cache (votes, saved states)
  const [userVotes, setUserVotes] = useState({});
  const [voteCounts, setVoteCounts] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Post options menu matching Reddit screenshot
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  const [followedPostIds, setFollowedPostIds] = useState([]);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);

  // Award modal state
  const [awardModalPost, setAwardModalPost] = useState(null);
  const [selectedAwardType, setSelectedAwardType] = useState('gold');
  const [isAwarding, setIsAwarding] = useState(false);

  // Report modal state
  const [reportModalPost, setReportModalPost] = useState(null);
  const [reportReason, setReportReason] = useState('misinformation');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  // Why was I recommended modal state (real dynamic ML attribution)
  const [whyModalPost, setWhyModalPost] = useState(null);
  const [whyExplanation, setWhyExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Author Edit Post state
  const [postToEdit, setPostToEdit] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Author Delete Post state
  const [postToDelete, setPostToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleStartEditPost = (post) => {
    setPostToEdit(post);
    setEditTitle(post.title || '');
    setEditContent(post.content || post.summary || '');
    setEditError('');
  };

  const handleSaveEdit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!postToEdit || !editTitle.trim()) return;
    setIsEditing(true);
    setEditError('');
    try {
      const summaryText = editContent.trim()
        ? (editContent.trim().length > 280 ? editContent.trim().slice(0, 280) + '...' : editContent.trim())
        : (postToEdit.summary || '');
      const res = await feedApi.updatePost({
        id: postToEdit.id,
        title: editTitle.trim(),
        content: editContent.trim(),
        summary: summaryText,
      });
      const updated = res?.post || {
        ...postToEdit,
        title: editTitle.trim(),
        content: editContent.trim(),
        summary: summaryText,
      };
      setFeedItems((prev) =>
        prev.map((p) => (p.id === postToEdit.id ? { ...p, ...updated } : p))
      );
      showToast('Post updated successfully');
      setPostToEdit(null);
    } catch (err) {
      setEditError(err.message || 'Failed to update post');
    } finally {
      setIsEditing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const userId = user?.id || user?._id;
      await feedApi.deletePost(postToDelete.id, userId);
      setFeedItems((prev) => prev.filter((p) => p.id !== postToDelete.id));
      showToast('Post deleted successfully');
      setPostToDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Listen for real-time post creation to immediately prepend post to feed
  useEffect(() => {
    const handlePostCreated = (e) => {
      const newPost = e.detail;
      if (newPost && newPost.id) {
        setFeedItems((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
        showToast(`Published "${newPost.title.slice(0, 36)}..." to the Wire`);
      }
    };
    window.addEventListener('newscuddle:post_created', handlePostCreated);
    return () => window.removeEventListener('newscuddle:post_created', handlePostCreated);
  }, [showToast]);

  // Community Hover Popover Card state (matching Reddit Image 2)
  const [hoveredCommunitySlug, setHoveredCommunitySlug] = useState(null);
  const [hoveredPostId, setHoveredPostId] = useState(null);
  const [communityDetailsCache, setCommunityDetailsCache] = useState({});
  const hoverTimerRef = useRef(null);

  const handleCommunityMouseEnter = (post) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const commTarget = (post.deskSlug || post.desk || post.category || '')
      .replace(/^c\//, '')
      .replace(/^\//, '');

    hoverTimerRef.current = setTimeout(() => {
      setHoveredCommunitySlug(commTarget);
      setHoveredPostId(post.id);

      // Fetch dynamic details if not in cache (zero mock data, directly from MongoDB Atlas)
      if (commTarget && !communityDetailsCache[commTarget]) {
        communityApi
          .getCommunityDetails(commTarget)
          .then((res) => {
            if (res?.community) {
              setCommunityDetailsCache((prev) => ({ ...prev, [commTarget]: res.community }));
            }
          })
          .catch((err) => {
            console.warn('Failed to load community details:', err);
          });
      }
    }, 180);
  };

  const handleCommunityMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredPostId(null);
      setHoveredCommunitySlug(null);
    }, 240);
  };

  const handlePopoverMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  // Close post menu on outside click
  useEffect(() => {
    const handleDocClick = () => setOpenMenuPostId(null);
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Fetch real articles from backend ML feed API
  const fetchFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await feedApi.getFeed({
        desk: activeDesk || (activeFeed === 'popular' ? 'all' : (activeFeed === 'home' ? 'home' : '')),
        feed: activeFeed || 'home',
        sort: sortParam,
        page: 1,
        limit: 20,
        pinned: pinnedDeskIds || [],
        joined: userDeskIds || [],
        owned: (customCommunities || []).map((c) => c.id || c.name),
      });

      if (res?.items && Array.isArray(res.items)) {
        setFeedItems(res.items);

        // Seed initial vote counts & user states from returned items
        const initialCounts = {};
        const initialVotes = {};
        const initialFollowedPosts = [];
        const initialFollowedAuthors = [];
        res.items.forEach((item) => {
          initialCounts[item.id] = (item.upvotes || 0) - (item.downvotes || 0);
          initialVotes[item.id] = (item.userVote === 1 || item.hasUpvoted)
            ? 1
            : (item.userVote === -1 || item.hasDownvoted)
            ? -1
            : null;
          if (item.hasFollowedPost) initialFollowedPosts.push(item.id);
          if (item.hasFollowedAuthor && !initialFollowedAuthors.includes(item.author)) {
            initialFollowedAuthors.push(item.author);
          }
        });
        setVoteCounts(initialCounts);
        setUserVotes(initialVotes);
        setFollowedPostIds(initialFollowedPosts);
        setFollowedAuthors(initialFollowedAuthors);
      } else {
        setFeedItems([]);
      }
    } catch (err) {
      console.error('Failed to load feed from MongoDB Atlas:', err);
      setError('Unable to load intelligence feed. Showing cached wire.');
    } finally {
      setIsLoading(false);
    }
  }, [activeFeed, sortParam, activeDesk, pinnedDeskIds, userDeskIds, customCommunities]);

  // Load feed on mount or parameter changes
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Real-time Upvote / Downvote / Un-upvote / Un-downvote handler
  const handleVote = async (postId, direction) => {
    const currentVote = userVotes[postId] || null;
    let nextVote = null;
    let diff = 0;

    if (currentVote === direction) {
      // Toggle vote off (un-upvote if 1, un-downvote if -1)
      nextVote = null;
      diff = -direction;
    } else if (currentVote !== null) {
      // Switch vote (e.g. down to up = +2, up to down = -2)
      nextVote = direction;
      diff = direction * 2;
    } else {
      // New vote
      nextVote = direction;
      diff = direction;
    }

    // Optimistic UI update
    setUserVotes((prev) => ({ ...prev, [postId]: nextVote }));
    setVoteCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + diff }));

    // Send real vote request to backend MongoDB Atlas
    try {
      const res = await feedApi.votePost({
        postId,
        direction,
      });
      if (res && res.success) {
        setVoteCounts((prev) => ({ ...prev, [postId]: res.score }));
        setUserVotes((prev) => ({
          ...prev,
          [postId]: res.userDirection === 1 ? 1 : res.userDirection === -1 ? -1 : null,
        }));
      }
    } catch (e) {
      console.warn('Real-time post vote failed, reverting optimistic state:', e);
      setUserVotes((prev) => ({ ...prev, [postId]: currentVote }));
      setVoteCounts((prev) => ({ ...prev, [postId]: (prev[postId] || 0) - diff }));
    }
  };

  // Toggle Save handler with real MongoDB Atlas persistence
  const handleSaveToggle = async (postId, post) => {
    if (onToggleSave) onToggleSave(postId, post);

    try {
      await feedApi.toggleSavePost({ postId });
    } catch (e) {
      console.warn('Real-time save toggle failed:', e);
    }
  };

  // Real Share link handler with clean /post/0000000000001 permalink and shares count increment
  const handleShare = (post) => {
    // Format: 12 zeros then post number (e.g. 0000000000001)
    const postCode = post.postCode || (post.postNumber ? String(post.postNumber).padStart(13, '0') : post.id);
    const permalink = `${window.location.origin}/post/${postCode}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(permalink);
      setCopiedId(post.id);
      showToast('Link copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    }

    // Increment share counter in database
    feedApi.interact({
      feedItemId: post.id,
      action: 'share',
    }).catch(() => {});
  };

  // Follow / Unfollow User (Author) with real database persistence & ML score boost
  const handleToggleFollowAuthor = async (targetAuthor) => {
    if (!targetAuthor) return;
    const isCurrentlyFollowed = followedAuthors.includes(targetAuthor);

    // Optimistic state toggle
    setFollowedAuthors((prev) =>
      isCurrentlyFollowed ? prev.filter((a) => a !== targetAuthor) : [...prev, targetAuthor]
    );

    // Update feed items locally
    setFeedItems((prev) =>
      prev.map((item) =>
        item.author === targetAuthor
          ? { ...item, hasFollowedAuthor: !isCurrentlyFollowed }
          : item
      )
    );

    showToast(isCurrentlyFollowed ? `Unfollowed u/${targetAuthor}` : `Now following u/${targetAuthor}`);

    try {
      await feedApi.toggleFollowUser(targetAuthor);
    } catch (err) {
      console.error('Failed to toggle follow user:', err);
      // Revert optimistic update
      setFollowedAuthors((prev) =>
        isCurrentlyFollowed ? [...prev, targetAuthor] : prev.filter((a) => a !== targetAuthor)
      );
    }
  };

  // Follow / Unfollow Post Notifications
  const handleToggleFollowPost = async (postId) => {
    if (!postId) return;
    const isCurrentlyFollowed = followedPostIds.includes(postId);

    setFollowedPostIds((prev) =>
      isCurrentlyFollowed ? prev.filter((id) => id !== postId) : [...prev, postId]
    );

    setFeedItems((prev) =>
      prev.map((item) =>
        item.id === postId
          ? {
              ...item,
              hasFollowedPost: !isCurrentlyFollowed,
              followersCount: Math.max(0, (item.followersCount || 0) + (isCurrentlyFollowed ? -1 : 1)),
            }
          : item
      )
    );

    setOpenMenuPostId(null);
    showToast(isCurrentlyFollowed ? 'Unsubscribed from post notifications' : 'Subscribed to post notifications');

    try {
      await feedApi.toggleFollowPost(postId);
    } catch (err) {
      console.error('Failed to toggle follow post:', err);
      setFollowedPostIds((prev) =>
        isCurrentlyFollowed ? [...prev, postId] : prev.filter((id) => id !== postId)
      );
    }
  };

  // Open Award Picker Modal
  const handleOpenAwardModal = (post) => {
    setAwardModalPost(post);
    setSelectedAwardType('gold');
    setOpenMenuPostId(null);
  };

  // Submit Post Award (Silver, Gold, Platinum, Helpful, Insightful, Rocket)
  const handleSubmitAward = async () => {
    if (!awardModalPost || !selectedAwardType) return;
    setIsAwarding(true);

    const awardDef = AWARDS_CATALOG.find((a) => a.type === selectedAwardType) || AWARDS_CATALOG[1];

    try {
      const res = await feedApi.awardPost(awardModalPost.id, selectedAwardType);
      const awardRecord = res?.award;

      // Update feed item awards badge array and count
      setFeedItems((prev) =>
        prev.map((item) => {
          if (item.id !== awardModalPost.id) return item;
          const currentAwards = Array.isArray(item.awards) ? [...item.awards] : [];
          const existingIdx = currentAwards.findIndex((a) => a.type === selectedAwardType);

          if (existingIdx >= 0) {
            currentAwards[existingIdx] = {
              ...currentAwards[existingIdx],
              count: (currentAwards[existingIdx].count || 1) + 1,
            };
          } else {
            currentAwards.push({
              type: selectedAwardType,
              name: awardDef.name,
              icon: awardDef.icon,
              count: 1,
              points: awardDef.points,
            });
          }

          return {
            ...item,
            awards: currentAwards,
            awardsCount: (item.awardsCount || 0) + 1,
            hasAwarded: true,
          };
        })
      );

      showToast(`Awarded ${awardDef.name} (+${awardDef.points} karma)`);
      setAwardModalPost(null);
    } catch (err) {
      console.error('Failed to award post:', err);
      showToast('Unable to bestow award. Please try again.');
    } finally {
      setIsAwarding(false);
    }
  };

  // Show fewer posts like this: online Bayesian negative signal damping
  const handleShowFewer = async (post) => {
    if (!post?.id) return;
    setHiddenPostIds((prev) => [...prev, post.id]);
    setOpenMenuPostId(null);
    showToast(`Tuning algorithm: damping topics and ${post.deskName || post.category || 'desk'}`);

    try {
      await feedApi.showFewerPosts(post.id);
    } catch (err) {
      console.warn('Negative signal logging failed:', err);
    }
  };

  // Hide post permanently from current user's feed
  const handleHidePost = async (post) => {
    if (!post?.id) return;
    setHiddenPostIds((prev) => [...prev, post.id]);
    setOpenMenuPostId(null);
    showToast('Post hidden from your feed');

    try {
      await feedApi.hidePost(post.id);
    } catch (err) {
      console.warn('Hide post call failed:', err);
    }
  };

  // Open Why Was I Recommended Modal with dynamic ML attribution breakdown
  const handleOpenWhyModal = async (post) => {
    if (!post?.id) return;
    setWhyModalPost(post);
    setWhyExplanation(null);
    setIsExplaining(true);
    setOpenMenuPostId(null);

    try {
      const res = await feedApi.explainRecommendation(post.id, {
        pinned: pinnedDeskIds || [],
        joined: userDeskIds || [],
        owned: (customCommunities || []).map((c) => c.id || c.name),
      });

      if (res?.explanation) {
        setWhyExplanation(res.explanation);
      }
    } catch (err) {
      console.error('Failed to explain recommendation:', err);
    } finally {
      setIsExplaining(false);
    }
  };

  // Open Report Modal
  const handleOpenReportModal = (post) => {
    setReportModalPost(post);
    setReportReason('misinformation');
    setReportDetails('');
    setOpenMenuPostId(null);
  };

  // Submit Report with editorial violation category
  const handleSubmitReport = async () => {
    if (!reportModalPost || !reportReason) return;
    setIsReporting(true);

    try {
      await feedApi.reportPost({
        postId: reportModalPost.id,
        reason: reportReason,
        details: reportDetails,
      });

      // Also hide reported post from feed
      setHiddenPostIds((prev) => [...prev, reportModalPost.id]);
      showToast('Report submitted for editorial review. Post hidden.');
      setReportModalPost(null);
    } catch (err) {
      console.error('Failed to submit report:', err);
      showToast('Unable to submit report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };


  // Filter posts based on client-side search, hidden posts, or saved filter
  const displayedPosts = feedItems.filter((p) => {
    if (hiddenPostIds.includes(p.id)) return false;
    if (activeFeed === 'saved') {
      return savedPosts.some((saved) => (typeof saved === 'string' ? saved === p.id : saved.id === p.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchSummary = p.summary?.toLowerCase().includes(q);
      const matchDesk = p.deskName?.toLowerCase().includes(q) || p.deskSlug?.toLowerCase().includes(q);
      const matchTopics = p.topics?.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchSummary || matchDesk || matchTopics;
    }
    return true;
  });

  return (
    <main className="reddit-main-feed" aria-label="Main Intelligence Feed">
      {/* Active Desk Filter Banner (if filtered via community route or search) */}
      {activeDesk && (
        <div className="active-filter-banner animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <SlidersHorizontal size={14} />
            <span>
              Filtered by desk: <strong>{activeDesk}</strong>
            </span>
          </div>
          {onClearDesk && (
            <button type="button" className="clear-filter-btn" onClick={onClearDesk}>
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* ================= SKELETON LOADING STATES ================= */}
      {isLoading && (
        <div className="reddit-posts-stream">
          {[1, 2, 3].map((i) => (
            <div key={`skeleton-${i}`} className="skeleton-card">
              <div className="skeleton-header">
                <div className="skeleton-box skeleton-avatar" />
                <div className="skeleton-box skeleton-meta" />
              </div>
              <div className="skeleton-box skeleton-title" />
              <div className="skeleton-box skeleton-text-1" />
              <div className="skeleton-box skeleton-text-2" />
              <div className="skeleton-actions">
                <div className="skeleton-box skeleton-pill" style={{ width: '90px' }} />
                <div className="skeleton-box skeleton-pill" style={{ width: '70px' }} />
                <div className="skeleton-box skeleton-pill" style={{ width: '80px' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= REAL ARTICLES FEED ================= */}
      {!isLoading && displayedPosts.length > 0 && (
        <div className="reddit-posts-stream">
          {displayedPosts.map((post) => {
            const currentVote = userVotes[post.id] || null;
            const currentCount = voteCounts[post.id] !== undefined
              ? voteCounts[post.id]
              : (post.upvotes || 0) - (post.downvotes || 0);

            const isSaved = savedPosts.some((p) => (typeof p === 'string' ? p === post.id : p.id === post.id));
            const cleanDesk = (post.desk || '').replace(/^c\//, '');
            const cleanCat = (post.category || '').replace(/^c\//, '');
            const cleanSlug = (post.deskSlug || '').replace(/^c\//, '');

            const isJoined = Boolean(
              (userDeskIds && (
                userDeskIds.includes(post.category) ||
                userDeskIds.includes(cleanCat) ||
                userDeskIds.includes(post.desk) ||
                userDeskIds.includes(cleanDesk) ||
                userDeskIds.includes(post.deskSlug) ||
                userDeskIds.includes(cleanSlug)
              )) ||
              (customCommunities && customCommunities.some((c) =>
                c.id === post.desk || c.name === post.deskSlug || c.name === `c/${cleanDesk}`
              ))
            );

            const commTarget = (post.deskSlug || post.desk || post.category || '')
              .replace(/^c\//, '')
              .replace(/^\//, '');

            const isUserDesk = commTarget.startsWith('u/') || (post.deskSlug && post.deskSlug.startsWith('c/u/'));
            const commPath = isUserDesk ? `/${commTarget}` : `/c/${commTarget || 'feed'}`;
            const displayComm = post.deskSlug || (isUserDesk ? `c/${commTarget}` : `c/${cleanDesk || cleanCat || 'feed'}`);
            const postDetailPath = `/post/${post.postCode || post.id}`;

            const isAuthor = Boolean(
              user && (
                (user.username && post.author && user.username.toLowerCase() === post.author.toLowerCase()) ||
                (user.id && post.authorId && String(user.id) === String(post.authorId)) ||
                (user._id && post.authorId && String(user._id) === String(post.authorId)) ||
                (user.id && post.userId && String(user.id) === String(post.userId)) ||
                (user._id && post.userId && String(user._id) === String(post.userId)) ||
                post.author === 'you' ||
                post.isAuthor === true
              )
            );

            return (
              <article
                key={post.id}
                className="reddit-post-card"
                id={post.id}
                onClick={(e) => {
                  // If clicking inside interactive controls (buttons, links, inputs, popovers, dropdowns, media preview), do not navigate
                  if (
                    e.target.closest('button') ||
                    e.target.closest('a') ||
                    e.target.closest('input') ||
                    e.target.closest('.community-hover-popover') ||
                    e.target.closest('.post-dropdown-menu') ||
                    e.target.closest('.reddit-post-media-wrap') ||
                    e.target.closest('.media-lightbox-overlay')
                  ) {
                    return;
                  }
                  if (onArticleClick) onArticleClick(post);
                  navigate(postDetailPath, { state: { post } });
                }}
              >
                {/* 1. Header: Avatar • Community • Time • Join Button • Menu */}
                <div className="reddit-post-header">
                  <div className="post-header-left">
                    {/* Community Emblem & Name with Reddit Hover Popover (Image 2) */}
                    <div
                      className="community-hover-wrapper"
                      onMouseEnter={() => handleCommunityMouseEnter(post)}
                      onMouseLeave={handleCommunityMouseLeave}
                    >
                      <div
                        className="community-badge-icon"
                        style={{
                          backgroundColor: `${post.deskColor || '#008751'}20`,
                          color: post.deskColor || '#008751',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (commTarget) navigate(commPath);
                        }}
                        title={`Go to ${displayComm}`}
                      >
                        {displayComm.replace(/^c\//, '').charAt(0).toUpperCase()}
                      </div>

                      <span
                        className="community-name-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (commTarget) navigate(commPath);
                        }}
                        title={`Go to ${displayComm}`}
                      >
                        {displayComm}
                      </span>

                      {/* Reddit Community Hover Popover Card (Image 2) */}
                      {hoveredPostId === post.id && (
                        <div
                          className="community-hover-popover animate-fade-in"
                          onMouseEnter={handlePopoverMouseEnter}
                          onMouseLeave={handleCommunityMouseLeave}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            className="hover-popover-banner"
                            style={{
                              background: `linear-gradient(135deg, ${post.deskColor || '#008751'}dd 0%, #0f172a 100%)`,
                            }}
                          />

                          <div className="hover-popover-body">
                            <div className="hover-popover-top-row">
                              <div
                                className="hover-popover-avatar"
                                style={{ color: post.deskColor || '#008751' }}
                                onClick={() => commTarget && navigate(commPath)}
                                title={`Go to ${displayComm}`}
                              >
                                {displayComm.replace(/^c\//, '').charAt(0).toUpperCase()}
                              </div>

                              {!isAuthor && !isUserDesk && (
                                <button
                                  type="button"
                                  className={`hover-popover-join-btn ${isJoined ? 'joined' : 'join'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleJoinDesk) onToggleJoinDesk(post.category || cleanDesk);
                                  }}
                                  title={isJoined ? 'Click to leave' : 'Click to join'}
                                >
                                  {isJoined ? (
                                    <>
                                      <span className="join-text-normal">Joined</span>
                                      <span className="join-text-hover">Leave</span>
                                    </>
                                  ) : (
                                    <span>Join</span>
                                  )}
                                </button>
                              )}
                            </div>

                            <div className="hover-popover-title-row">
                              <span
                                className="hover-popover-title"
                                onClick={() => commTarget && navigate(commPath)}
                              >
                                {displayComm}
                              </span>
                            </div>

                            <p className="hover-popover-desc">
                              {communityDetailsCache[commTarget]?.description ||
                                (post.deskName
                                  ? `${post.deskName} - verified reporting, primary investigations, and community debate on NewsCuddle.`
                                  : post.summary || 'Verified community intelligence wire on NewsCuddle.')}
                            </p>

                            <div className="hover-popover-stats-row">
                              <div className="hover-popover-stat-item">
                                <span className="hover-popover-stat-num">
                                  {formatCount(
                                    communityDetailsCache[commTarget]?.weeklyVisitors ??
                                      (post.viewsCount || 0)
                                  )}
                                </span>
                                <span className="hover-popover-stat-lbl">Weekly visitors</span>
                              </div>
                              <div className="hover-popover-stat-item">
                                <span className="hover-popover-stat-num">
                                  {formatCount(
                                    communityDetailsCache[commTarget]?.weeklyContributions ??
                                      (post.commentsCount || 0)
                                  )}
                                </span>
                                <span className="hover-popover-stat-lbl">Weekly contributions</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="post-meta-dot">•</span>
                    <span className="post-meta-time">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </div>

                  <div className="post-header-right">
                    {!isAuthor && !isUserDesk && (
                      <button
                        type="button"
                        className={`btn-community-join ${isJoined ? 'joined' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleJoinDesk) onToggleJoinDesk(post.category || cleanDesk);
                        }}
                        title={isJoined ? 'Joined community - Click to leave' : 'Join community'}
                      >
                        {isJoined ? (
                          <>
                            <span className="join-text-normal">Joined</span>
                            <span className="join-text-hover">Leave</span>
                          </>
                        ) : (
                          <span>Join</span>
                        )}
                      </button>
                    )}

                    <div className="post-header-menu-container">
                      <button
                        type="button"
                        className="post-menu-btn"
                        title="More options"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {openMenuPostId === post.id && (
                        <div className="post-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          {/* Author Specific Actions */}
                          {isAuthor && (
                            <>
                              <button
                                type="button"
                                className="post-dropdown-item"
                                onClick={() => {
                                  setOpenMenuPostId(null);
                                  handleStartEditPost(post);
                                }}
                              >
                                <span className="post-dropdown-item-icon">
                                  <Pencil size={17} color="#008751" />
                                </span>
                                <span style={{ fontWeight: 600 }}>Edit post</span>
                              </button>

                              <button
                                type="button"
                                className="post-dropdown-item"
                                style={{ color: '#dc2626' }}
                                onClick={() => {
                                  setOpenMenuPostId(null);
                                  setPostToDelete(post);
                                }}
                              >
                                <span className="post-dropdown-item-icon">
                                  <Trash2 size={17} color="#dc2626" />
                                </span>
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>Delete post</span>
                              </button>

                              <div className="post-dropdown-divider" />
                            </>
                          )}

                          {/* 1. Follow post (for non-authors) */}
                          {!isAuthor && (
                            <button
                              type="button"
                              className="post-dropdown-item"
                              onClick={() => handleToggleFollowPost(post.id)}
                            >
                              <span className="post-dropdown-item-icon">
                                <Bell size={18} color={followedPostIds.includes(post.id) || post.hasFollowedPost ? '#008751' : undefined} />
                              </span>
                              <span>{followedPostIds.includes(post.id) || post.hasFollowedPost ? 'Unfollow post' : 'Follow post'}</span>
                            </button>
                          )}

                          {/* 2. Award this post (for non-authors) */}
                          {!isAuthor && (
                            <button
                              type="button"
                              className="post-dropdown-item"
                              onClick={() => handleOpenAwardModal(post)}
                            >
                              <span className="post-dropdown-item-icon">
                                <Award size={18} color="#eab308" />
                              </span>
                              <span>Award this post</span>
                            </button>
                          )}

                          {/* 3. Save */}
                          <button
                            type="button"
                            className="post-dropdown-item brand-accent"
                            onClick={() => {
                              handleSaveToggle(post.id, post);
                              setOpenMenuPostId(null);
                            }}
                          >
                            <span className="post-dropdown-item-icon">
                              <Bookmark size={18} color={isSaved ? '#008751' : undefined} />
                            </span>
                            <span>{isSaved ? 'Remove from saved' : 'Save'}</span>
                          </button>

                          {/* 4. Hide (for non-authors) */}
                          {!isAuthor && (
                            <button
                              type="button"
                              className="post-dropdown-item"
                              onClick={() => handleHidePost(post)}
                            >
                              <span className="post-dropdown-item-icon">
                                <EyeOff size={18} />
                              </span>
                              <span>Hide</span>
                            </button>
                          )}

                          <div className="post-dropdown-divider" />

                          {/* 5. Why was I recommended this? */}
                          <button
                            type="button"
                            className="post-dropdown-item"
                            onClick={() => handleOpenWhyModal(post)}
                          >
                            <span className="post-dropdown-item-icon">
                              <HelpCircle size={18} color="#008751" />
                            </span>
                            <span>Why was I recommended this?</span>
                          </button>

                          {/* 6. Report (for non-authors) */}
                          {!isAuthor && (
                            <button
                              type="button"
                              className="post-dropdown-item"
                              onClick={() => handleOpenReportModal(post)}
                            >
                              <span className="post-dropdown-item-icon">
                                <Flag size={18} color="#dc2626" />
                              </span>
                              <span>Report</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Post Title (Navigates to dedicated post detail page) */}
                <h2
                  className="reddit-post-title"
                  onClick={() => {
                    navigate(postDetailPath, { state: { post } });
                    if (onArticleClick) onArticleClick(post);
                  }}
                  title="Click to view full post & discussion thread"
                >
                  {post.title}
                </h2>

                {/* Awards Row (if post has received awards) */}
                {post.awards && post.awards.length > 0 && (
                  <div className="post-awards-badge-row">
                    {post.awards.map((aw, awIdx) => (
                      <span
                        key={`award-${post.id}-${aw.type || awIdx}`}
                        className="post-award-chip"
                        title={`${aw.name || aw.type}: ${aw.count || 1} award${(aw.count || 1) > 1 ? 's' : ''}`}
                      >
                        <span className="post-award-chip-icon">{aw.icon || '🏅'}</span>
                        {aw.count > 1 && <span className="post-award-chip-count">{aw.count}</span>}
                      </span>
                    ))}
                  </div>
                )}



                {/* 3. Post Content / Image Container with Image Skeleton Loader ("Skewer") & Lightbox Preview */}
                {(post.mediaUrl || post.imageUrl) && (
                  <PostMediaImage
                    src={post.mediaUrl || post.imageUrl}
                    alt={post.title}
                    aspectRatio={post.aspectRatio || post.mediaAnalysis?.aspectRatioLabel}
                    isAnimated={post.mediaType === 'gif' || post.mediaAnalysis?.isAnimated}
                    frameCount={post.mediaAnalysis?.frameCount}
                    caption={post.imageCaption}
                    postDetailPath={postDetailPath}
                    enablePreview={true}
                  />
                )}

                {post.summary && (
                  <div
                    className="reddit-post-text"
                    onClick={() => {
                      navigate(postDetailPath, { state: { post } });
                      if (onArticleClick) onArticleClick(post);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <p>{post.summary}</p>
                  </div>
                )}

                {/* 4. Reddit Engagement Bar: Vote Pill | Comments Pill | Share Pill */}
                <div
                  className="reddit-post-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Upvote / Downvote Pill */}
                  <div
                    className="reddit-vote-pill"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={`vote-btn up ${currentVote === 1 ? 'voted' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(post.id, 1);
                      }}
                      title="Upvote"
                      aria-label="Upvote"
                    >
                      <ArrowBigUp
                        size={20}
                        fill={currentVote === 1 ? '#008751' : 'none'}
                        color={currentVote === 1 ? '#008751' : 'currentColor'}
                      />
                    </button>
                    <span
                      className={`vote-count ${
                        currentVote === 1 ? 'voted-up' : currentVote === -1 ? 'voted-down' : ''
                      }`}
                    >
                      {formatCount(currentCount)}
                    </span>
                    <button
                      type="button"
                      className={`vote-btn down ${currentVote === -1 ? 'voted' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(post.id, -1);
                      }}
                      title="Downvote"
                      aria-label="Downvote"
                    >
                      <ArrowBigDown
                        size={20}
                        fill={currentVote === -1 ? '#7193ff' : 'none'}
                        color={currentVote === -1 ? '#7193ff' : 'currentColor'}
                      />
                    </button>
                  </div>

                  {/* Comment Pill -> navigates to post comments thread */}
                  <button
                    type="button"
                    className="reddit-action-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(postDetailPath, { state: { post } });
                      if (onArticleClick) onArticleClick(post);
                    }}
                    title="View comments thread"
                  >
                    <MessageSquare size={16} />
                    <span>{formatCount(post.commentsCount || 0)}</span>
                  </button>

                  {/* Share Pill */}
                  <button
                    type="button"
                    className="reddit-action-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(post);
                    }}
                    title="Share link"
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check size={15} color="#008751" />
                        <span style={{ color: '#008751' }}>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={16} />
                        <span>Share</span>
                      </>
                    )}
                  </button>

                  {/* Save Pill */}
                  <button
                    type="button"
                    className={`reddit-action-pill ${isSaved ? 'saved' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveToggle(post.id, post);
                    }}
                    title={isSaved ? 'Remove from saved' : 'Save post'}
                  >
                    <Bookmark size={16} />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>

                  {/* 3-Dots More Pill */}
                  <button
                    type="button"
                    className="reddit-action-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuPostId(openMenuPostId === post.id ? null : post.id);
                    }}
                    title="More actions"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ================= EMPTY STATE ================= */}
      {!isLoading && displayedPosts.length === 0 && (
        <div className="reddit-post-card empty-feed-card animate-fade-in">
          <div className="empty-feed-inner">
            <div className="empty-feed-icon-circle">
              <Newspaper size={26} color="#008751" />
            </div>
            <h3 className="empty-feed-title">No posts found</h3>
            <p className="empty-feed-desc">
              {activeDesk
                ? `There are currently no posts in ${activeDesk}. Be the first to publish an intelligence report or attach media!`
                : 'No reports published yet. Start the conversation with verified analysis, images, or animated GIFs.'}
            </p>
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
              {onOpenCreatePost && (
                <button
                  type="button"
                  className="onboarding-next-btn btn-primary"
                  style={{ width: 'auto', padding: '0.65rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => onOpenCreatePost(activeDesk ? { slug: activeDesk, name: activeDesk } : null)}
                >
                  <Plus size={16} />
                  <span>Create Post</span>
                </button>
              )}
              {activeDesk && onClearDesk && (
                <button
                  type="button"
                  className="onboarding-next-btn"
                  style={{ width: 'auto', padding: '0.65rem 1.25rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                  onClick={onClearDesk}
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= AWARD PICKER MODAL ================= */}
      {awardModalPost && (
        <div className="onboarding-overlay" onClick={() => !isAwarding && setAwardModalPost(null)}>
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
                  onClick={() => !isAwarding && setAwardModalPost(null)}
                  disabled={isAwarding}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0.4rem 0 1rem 0' }}>
                Reward deep investigative journalism and insightful commentary on:
                <br />
                <strong style={{ color: '#0f172a' }}>"{awardModalPost.title}"</strong>
              </p>

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
                  onClick={() => setAwardModalPost(null)}
                  disabled={isAwarding}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="onboarding-next-btn btn-primary"
                  onClick={handleSubmitAward}
                  disabled={isAwarding}
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
            </div>
          </div>
        </div>
      )}

      {/* ================= DYNAMIC ML WHY RECOMMENDED MODAL ================= */}
      {whyModalPost && (
        <div className="onboarding-overlay" onClick={() => setWhyModalPost(null)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={20} color="#008751" />
                  <h3 className="modal-title">Why was this recommended?</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setWhyModalPost(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#0f172a', fontWeight: 600, margin: '0.4rem 0 0.85rem 0' }}>
                "{whyModalPost.title}"
              </p>

              {isExplaining && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', gap: '0.75rem' }}>
                  <Loader2 size={28} className="animate-spin" color="#008751" />
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Computing real-time Bayesian feature attributions...
                  </span>
                </div>
              )}

              {!isExplaining && whyExplanation && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span className="explain-algorithm-badge">
                      {whyExplanation.algorithmVersion || 'MultiObjective-Bayesian-v2.6'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Desk: <strong style={{ color: '#008751' }}>{whyExplanation.deskName || whyModalPost.deskName || 'wire'}</strong>
                    </span>
                  </div>

                  {/* Score Banner */}
                  <div className="explain-score-banner">
                    <div>
                      <div className="explain-score-number">
                        {whyExplanation.personalizedScore ? whyExplanation.personalizedScore.toFixed(1) : '45.0'}
                      </div>
                      <div className="explain-score-label">Personalized ML Ranking Score</div>
                    </div>
                    <div className="explain-rank-percentile">
                      <div>Top {100 - (whyExplanation.rankPercentile || 95)}% Feed Match</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.85, fontWeight: 500 }}>Live Atlas Pipeline</div>
                    </div>
                  </div>

                  {/* Summary Bullets */}
                  {whyExplanation.explanationSummary && whyExplanation.explanationSummary.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
                      {whyExplanation.explanationSummary.map((sum, idx) => (
                        <div key={`sum-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#166534' }}>
                          <Check size={14} color="#008751" />
                          <span>{sum}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Attribution Breakdown List */}
                  <div className="explain-signals-list">
                    {(whyExplanation.featureAttribution || []).map((attr, idx) => {
                      const impactClass =
                        attr.impact === 'High Positive'
                          ? 'high-positive'
                          : attr.impact === 'Medium Positive'
                          ? 'medium-positive'
                          : 'neutral';

                      return (
                        <div key={`attr-${idx}`} className="explain-signal-item">
                          <div className="explain-signal-row">
                            <span className="explain-signal-name">{attr.signalName}</span>
                            <span className={`explain-impact-tag ${impactClass}`}>
                              {attr.impact || 'Positive'}
                            </span>
                          </div>

                          <div className="explain-bar-track">
                            <div
                              className="explain-bar-fill"
                              style={{ width: `${Math.min(100, Math.max(8, attr.percentage || 20))}%` }}
                            />
                          </div>

                          <div className="explain-signal-desc">{attr.description}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live Model Signals Grid */}
                  {whyExplanation.modelSignals && (
                    <div className="explain-metrics-grid">
                      <div className="explain-metric-item">
                        <div className="explain-metric-val">
                          {whyExplanation.modelSignals.wilsonQuality
                            ? `${(whyExplanation.modelSignals.wilsonQuality * 100).toFixed(0)}%`
                            : '96%'}
                        </div>
                        <div className="explain-metric-lbl">Wilson Quality</div>
                      </div>
                      <div className="explain-metric-item">
                        <div className="explain-metric-val">
                          {whyExplanation.modelSignals.categoryWeight !== undefined
                            ? `${(whyExplanation.modelSignals.categoryWeight * 100).toFixed(0)}%`
                            : '50%'}
                        </div>
                        <div className="explain-metric-lbl">Topic Affinity</div>
                      </div>
                      <div className="explain-metric-item">
                        <div className="explain-metric-val">
                          {whyExplanation.modelSignals.hoursSincePublished !== undefined
                            ? `${whyExplanation.modelSignals.hoursSincePublished.toFixed(1)}h`
                            : '1.2h'}
                        </div>
                        <div className="explain-metric-lbl">Freshness</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="onboarding-actions-row" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="onboarding-next-btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setWhyModalPost(null)}
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT VIOLATION MODAL ================= */}
      {reportModalPost && (
        <div className="onboarding-overlay" onClick={() => !isReporting && setReportModalPost(null)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '500px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flag size={20} color="#dc2626" />
                  <h3 className="modal-title">Report Content Violation</h3>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => !isReporting && setReportModalPost(null)}
                  disabled={isReporting}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '0.4rem 0 1rem 0' }}>
                Select an editorial violation reason for:
                <br />
                <strong style={{ color: '#0f172a' }}>"{reportModalPost.title}"</strong>
              </p>

              <div className="report-reasons-list">
                {REPORT_REASONS.map((reason) => {
                  const isSelected = reportReason === reason.id;
                  return (
                    <div
                      key={reason.id}
                      className={`report-reason-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setReportReason(reason.id)}
                    >
                      <div className="report-radio-box">
                        {isSelected && <div className="report-radio-inner" />}
                      </div>
                      <div className="report-reason-texts">
                        <div className="report-reason-title">{reason.title}</div>
                        <div className="report-reason-desc">{reason.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                  Additional context (optional)
                </label>
                <textarea
                  className="report-details-textarea"
                  placeholder="Provide any additional citations, corroborating evidence, or relevant links..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="onboarding-actions-row" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="onboarding-skip-btn"
                  onClick={() => setReportModalPost(null)}
                  disabled={isReporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="onboarding-next-btn btn-primary"
                  onClick={handleSubmitReport}
                  disabled={isReporting}
                  style={{
                    backgroundColor: '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isReporting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Report</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT POST MODAL ================= */}
      {postToEdit && (
        <div className="onboarding-overlay" onClick={() => !isEditing && setPostToEdit(null)}>
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
                  onClick={() => !isEditing && setPostToEdit(null)}
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
                    onClick={() => setPostToEdit(null)}
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
      {postToDelete && (
        <div className="onboarding-overlay" onClick={() => !isDeleting && setPostToDelete(null)}>
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
                  onClick={() => !isDeleting && setPostToDelete(null)}
                  disabled={isDeleting}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginTop: '0.85rem' }}>
                <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to delete &ldquo;<strong>{postToDelete.title}</strong>&rdquo;? You cannot undo this action.
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
                  onClick={() => setPostToDelete(null)}
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

      {/* Floating Toast */}
      {toastMessage && (
        <div className="feed-floating-toast animate-fade-in">
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
};

export default MainFeed;
