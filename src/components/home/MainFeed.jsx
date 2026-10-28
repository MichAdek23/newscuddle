import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { feedApi, communityApi } from '../../services/api';
import PostMediaImage from '../common/PostMediaImage';
import UserHoverCard from '../common/UserHoverCard';
import {
  Hand,
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
  Link2,
  Code2,
  QrCode,
  Mail,
  Copy,
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
  const [shareMenuPostId, setShareMenuPostId] = useState(null);
  const [shareModalPost, setShareModalPost] = useState(null);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [hiddenPostIds, setHiddenPostIds] = useState([]);
  const [followedPostIds, setFollowedPostIds] = useState([]);
  const [followedAuthors, setFollowedAuthors] = useState([]);
  // Real-time stream & update states
  const [unreadNewPosts, setUnreadNewPosts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

      // Broadcast update across tabs and windows
      try {
        window.dispatchEvent(new CustomEvent('newscuddle_post_updated', { detail: updated }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('newscuddle_feed_realtime');
          bc.postMessage({ type: 'post_updated', post: updated });
          bc.close();
        }
      } catch (_) {}
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
      const deletedId = postToDelete.id;
      await feedApi.deletePost(deletedId, userId);
      setFeedItems((prev) => prev.filter((p) => p.id !== deletedId));
      showToast('Post deleted successfully');
      setPostToDelete(null);

      // Broadcast delete across tabs and windows
      try {
        window.dispatchEvent(new CustomEvent('newscuddle_post_deleted', { detail: deletedId }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('newscuddle_feed_realtime');
          bc.postMessage({ type: 'post_deleted', postId: deletedId });
          bc.close();
        }
      } catch (_) {}
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

  // Multi-channel Real-Time synchronization (Cross-Tab BroadcastChannel + Window Event Bus)
  useEffect(() => {
    let feedChannel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        feedChannel = new BroadcastChannel('newscuddle_feed_realtime');
      }
    } catch (_) {}

    const handleRealtimeSync = (msg) => {
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'post_created': {
          const post = msg.post;
          if (post && post.id) {
            setFeedItems((prev) => {
              if (prev.some((p) => p.id === post.id)) return prev;
              if (window.scrollY < 150) {
                return [post, ...prev];
              }
              return prev;
            });

            if (window.scrollY >= 150) {
              setUnreadNewPosts((prev) => {
                if (prev.some((p) => p.id === post.id)) return prev;
                return [post, ...prev];
              });
            }

            setVoteCounts((prev) => ({
              ...prev,
              [post.id]: Math.max(0, post.upvotes || 0),
            }));
            showToast(`Published "${post.title?.slice(0, 36)}..." to the Wire`);
          }
          break;
        }

        case 'post_voted': {
          const { postId, upvotes, downvotes, score } = msg;
          if (postId) {
            setVoteCounts((prev) => ({
              ...prev,
              [postId]: Math.max(0, upvotes !== undefined ? upvotes : score || 0),
            }));
            setFeedItems((prev) =>
              prev.map((item) =>
                item.id === postId
                  ? {
                      ...item,
                      upvotes: upvotes !== undefined ? upvotes : item.upvotes,
                      downvotes: downvotes !== undefined ? downvotes : item.downvotes,
                    }
                  : item
              )
            );
          }
          break;
        }

        case 'post_deleted': {
          const { postId } = msg;
          if (postId) {
            setFeedItems((prev) => prev.filter((p) => p.id !== postId));
            setUnreadNewPosts((prev) => prev.filter((p) => p.id !== postId));
          }
          break;
        }

        case 'post_updated': {
          const { post } = msg;
          if (post && post.id) {
            setFeedItems((prev) =>
              prev.map((p) => (p.id === post.id ? { ...p, ...post } : p))
            );
            setUnreadNewPosts((prev) =>
              prev.map((p) => (p.id === post.id ? { ...p, ...post } : p))
            );
          }
          break;
        }

        case 'comment_created': {
          const { postId } = msg;
          if (postId) {
            setFeedItems((prev) =>
              prev.map((item) =>
                item.id === postId
                  ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
                  : item
              )
            );
          }
          break;
        }

        case 'post_awarded': {
          const { postId, award } = msg;
          if (postId && award) {
            setFeedItems((prev) =>
              prev.map((item) => {
                if (item.id !== postId) return item;
                const awards = Array.isArray(item.awards) ? [...item.awards] : [];
                const idx = awards.findIndex((a) => a.type === award.type);
                if (idx >= 0) {
                  awards[idx] = { ...awards[idx], count: (awards[idx].count || 1) + 1 };
                } else {
                  awards.push({ ...award, count: 1 });
                }
                return { ...item, awards, awardsCount: (item.awardsCount || 0) + 1 };
              })
            );
          }
          break;
        }

        default:
          break;
      }
    };

    if (feedChannel) {
      feedChannel.onmessage = (e) => handleRealtimeSync(e.data);
    }

    const onPostCreated = (e) => handleRealtimeSync({ type: 'post_created', post: e.detail });
    const onPostVoted = (e) => handleRealtimeSync({ type: 'post_voted', ...(e.detail || {}) });
    const onPostDeleted = (e) => handleRealtimeSync({ type: 'post_deleted', postId: e.detail?.postId || e.detail });
    const onPostUpdated = (e) => handleRealtimeSync({ type: 'post_updated', post: e.detail });
    const onCommentCreated = (e) => handleRealtimeSync({ type: 'comment_created', ...(e.detail || {}) });
    const onPostAwarded = (e) => handleRealtimeSync({ type: 'post_awarded', ...(e.detail || {}) });

    window.addEventListener('newscuddle:post_created', onPostCreated);
    window.addEventListener('newscuddle_post_created', onPostCreated);
    window.addEventListener('newscuddle:post_voted', onPostVoted);
    window.addEventListener('newscuddle_post_voted', onPostVoted);
    window.addEventListener('newscuddle:post_deleted', onPostDeleted);
    window.addEventListener('newscuddle_post_deleted', onPostDeleted);
    window.addEventListener('newscuddle:post_updated', onPostUpdated);
    window.addEventListener('newscuddle_post_updated', onPostUpdated);
    window.addEventListener('newscuddle:comment_created', onCommentCreated);
    window.addEventListener('newscuddle_comment_created', onCommentCreated);
    window.addEventListener('newscuddle:post_awarded', onPostAwarded);
    window.addEventListener('newscuddle_post_awarded', onPostAwarded);

    return () => {
      if (feedChannel) feedChannel.close();
      window.removeEventListener('newscuddle:post_created', onPostCreated);
      window.removeEventListener('newscuddle_post_created', onPostCreated);
      window.removeEventListener('newscuddle:post_voted', onPostVoted);
      window.removeEventListener('newscuddle_post_voted', onPostVoted);
      window.removeEventListener('newscuddle:post_deleted', onPostDeleted);
      window.removeEventListener('newscuddle_post_deleted', onPostDeleted);
      window.removeEventListener('newscuddle:post_updated', onPostUpdated);
      window.removeEventListener('newscuddle_post_updated', onPostUpdated);
      window.removeEventListener('newscuddle:comment_created', onCommentCreated);
      window.removeEventListener('newscuddle_comment_created', onCommentCreated);
      window.removeEventListener('newscuddle:post_awarded', onPostAwarded);
      window.removeEventListener('newscuddle_post_awarded', onPostAwarded);
    };
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

  // Close post menu & share popover on outside click
  useEffect(() => {
    const handleDocClick = () => {
      setOpenMenuPostId(null);
      setShareMenuPostId(null);
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Fetch real articles from backend ML feed API
  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }
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
        if (!silent) {
          setFeedItems(res.items);
          setUnreadNewPosts([]);
        } else {
          // Real-time silent reconciliation
          setFeedItems((prevItems) => {
            const existingIds = new Set(prevItems.map((p) => p.id));
            const brandNewItems = res.items.filter((p) => !existingIds.has(p.id));

            if (brandNewItems.length > 0) {
              if (window.scrollY < 150) {
                // Prepend brand new items smoothly if user is near top
                return [...brandNewItems, ...prevItems];
              } else {
                // Queue into floating new posts button if user is reading below
                setUnreadNewPosts((prev) => {
                  const currentUnreadIds = new Set(prev.map((p) => p.id));
                  const toAdd = brandNewItems.filter((p) => !currentUnreadIds.has(p.id));
                  return [...toAdd, ...prev];
                });
                return prevItems;
              }
            }

            // In-place live update for existing posts (scores, comments, awards, content edits)
            const freshMap = new Map(res.items.map((item) => [item.id, item]));
            return prevItems.map((existing) => {
              const fresh = freshMap.get(existing.id);
              if (!fresh) return existing;
              return {
                ...existing,
                ...fresh,
                userVote: existing.userVote !== undefined ? existing.userVote : fresh.userVote,
                hasUpvoted: existing.hasUpvoted !== undefined ? existing.hasUpvoted : fresh.hasUpvoted,
                hasDownvoted: existing.hasDownvoted !== undefined ? existing.hasDownvoted : fresh.hasDownvoted,
                hasSaved: existing.hasSaved !== undefined ? existing.hasSaved : fresh.hasSaved,
              };
            });
          });
        }

        // Seed or update vote counts & user states
        setVoteCounts((prevCounts) => {
          const next = { ...prevCounts };
          res.items.forEach((item) => {
            if (next[item.id] === undefined || !silent) {
              next[item.id] = Math.max(0, item.upvotes || 0);
            }
          });
          return next;
        });

        if (!silent) {
          const initialVotes = {};
          const initialFollowedPosts = [];
          const initialFollowedAuthors = [];
          res.items.forEach((item) => {
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
          setUserVotes(initialVotes);
          setFollowedPostIds(initialFollowedPosts);
          setFollowedAuthors(initialFollowedAuthors);
        }
      } else if (!silent) {
        setFeedItems([]);
      }
    } catch (err) {
      console.error('Failed to load feed from MongoDB Atlas:', err);
      if (!silent) {
        setError('Unable to load intelligence feed. Showing cached wire.');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, [activeFeed, sortParam, activeDesk, pinnedDeskIds, userDeskIds, customCommunities]);

  // Load feed on mount or parameter changes
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Periodic real-time background sync polling (every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        fetchFeed(true);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchFeed]);

  // Tab visibility and window focus auto-sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchFeed(true);
      }
    };
    const handleWindowFocus = () => {
      fetchFeed(true);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchFeed]);

  // Listen for real-time reload feed event (e.g. clicking Home in left sidebar, brand logo, or back button)
  useEffect(() => {
    const handleReload = () => {
      fetchFeed(false);
    };
    window.addEventListener('newscuddle:reload_feed', handleReload);
    return () => window.removeEventListener('newscuddle:reload_feed', handleReload);
  }, [fetchFeed]);

  const handleRevealNewPosts = () => {
    if (unreadNewPosts.length > 0) {
      setFeedItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const toPrepend = unreadNewPosts.filter((p) => !existingIds.has(p.id));
        return [...toPrepend, ...prev];
      });
      setUnreadNewPosts([]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real-time Upvote / Downvote / Un-upvote / Un-downvote handler
  // Note: Downvotes are recorded in the database and utilized by the ML virality and feed ranking algorithms,
  // but do not subtract from or show in the displayed upvotes count (which remains non-negative).
  const handleVote = async (postId, direction) => {
    const currentVote = userVotes[postId] || null;
    let nextVote = null;
    let upvoteDiff = 0;

    if (currentVote === direction) {
      // Toggle vote off (un-upvote if 1, un-downvote if -1)
      nextVote = null;
      if (direction === 1) {
        upvoteDiff = -1; // removing previous upvote
      } else {
        upvoteDiff = 0; // removing downvote does not affect upvotes display
      }
    } else if (direction === 1) {
      // Casting upvote (either from unvoted or switching from downvote)
      nextVote = 1;
      upvoteDiff = 1;
    } else if (direction === -1) {
      // Casting downvote
      nextVote = -1;
      if (currentVote === 1) {
        upvoteDiff = -1; // switching from upvote to downvote removes previous upvote
      } else {
        upvoteDiff = 0; // new downvote does not affect upvotes display
      }
    }

    // Optimistic UI update - upvotes count never goes into negative
    setUserVotes((prev) => ({ ...prev, [postId]: nextVote }));
    setVoteCounts((prev) => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + upvoteDiff),
    }));

    // Send real vote request to backend MongoDB Atlas
    try {
      const res = await feedApi.votePost({
        postId,
        direction,
      });
      if (res && res.success) {
        const displayUpvotes = Math.max(0, res.upvotes !== undefined ? res.upvotes : (res.score || 0));
        setVoteCounts((prev) => ({ ...prev, [postId]: displayUpvotes }));
        setUserVotes((prev) => ({
          ...prev,
          [postId]: res.userDirection === 1 ? 1 : res.userDirection === -1 ? -1 : null,
        }));

        // Broadcast live vote counts to all tabs and open surfaces
        try {
          const detail = {
            postId,
            upvotes: displayUpvotes,
            downvotes: res.downvotes,
            score: res.score,
          };
          window.dispatchEvent(new CustomEvent('newscuddle_post_voted', { detail }));
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('newscuddle_feed_realtime');
            bc.postMessage({ type: 'post_voted', ...detail });
            bc.close();
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Real-time post vote failed, reverting optimistic state:', e);
      setUserVotes((prev) => ({ ...prev, [postId]: currentVote }));
      setVoteCounts((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] || 0) - upvoteDiff),
      }));
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

  // Helper to construct post share permalink
  const getPostShareUrl = (post) => {
    if (!post) return window.location.origin;
    const postCode = post.postCode || (post.postNumber ? String(post.postNumber).padStart(13, '0') : post.id);
    return `${window.location.origin}/post/${postCode}`;
  };

  const handleCopyPostLink = (post) => {
    const permalink = getPostShareUrl(post);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(permalink);
      setCopiedId(post.id);
      showToast('Link copied to clipboard!');
      feedApi.interact({ feedItemId: post.id, action: 'share' }).catch(() => {});
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyPostEmbed = (post) => {
    const permalink = getPostShareUrl(post);
    const embedCode = `<iframe src="${permalink}" width="100%" height="480" frameborder="0" scrolling="no" allowfullscreen style="border-radius:12px;border:1px solid #e2e8f0;"></iframe>`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      showToast('Embed code copied!');
      feedApi.interact({ feedItemId: post.id, action: 'share' }).catch(() => {});
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  const handleChannelShare = async (channel, post) => {
    if (!post) return;
    const shareUrl = getPostShareUrl(post);
    const shareTitle = post.title || 'Check out this story on NewsCuddle';
    const shareText = `${shareTitle}\n\n${shareUrl}`;

    feedApi.interact({ feedItemId: post.id, action: 'share' }).catch(() => {});

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
              text: post.summary || shareTitle,
              url: shareUrl,
            });
          } catch (_) {}
        }
        break;
      default:
        break;
    }
  };

  const handleOpenMoreOptions = async (post) => {
    setShareMenuPostId(null);
    setShareModalPost(post);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'NewsCuddle',
          text: post.summary || post.title,
          url: getPostShareUrl(post),
        });
      } catch (_) {}
    }
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
      const awardedPostId = awardModalPost.id;
      setAwardModalPost(null);

      // Broadcast award to other tabs and views in real-time
      try {
        const detail = {
          postId: awardedPostId,
          award: {
            type: selectedAwardType,
            name: awardDef.name,
            icon: awardDef.icon,
            points: awardDef.points,
          },
        };
        window.dispatchEvent(new CustomEvent('newscuddle_post_awarded', { detail }));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('newscuddle_feed_realtime');
          bc.postMessage({ type: 'post_awarded', ...detail });
          bc.close();
        }
      } catch (_) {}
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
    // Popular Feed: Show ONLY trending posts (momentum from upvotes, active discussions, shares, saves, or awards)
    if (activeFeed === 'popular') {
      const liveVotes = voteCounts[p.id] !== undefined ? voteCounts[p.id] : (p.upvotes || 0);
      const isTrending = (
        liveVotes > 0 ||
        (p.commentsCount || 0) > 0 ||
        (p.sharesCount || 0) > 0 ||
        (p.savesCount || 0) > 0 ||
        (p.awardsCount || 0) > 0 ||
        (p.viewsCount || 0) >= 5 ||
        (Array.isArray(p.awards) && p.awards.length > 0)
      );
      if (!isTrending) return false;
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

      {/* Real-time Unread Posts Floating Pill (if new posts arrived from other users while reading) */}
      {unreadNewPosts.length > 0 && (
        <div className="realtime-new-posts-banner-container">
          <button
            type="button"
            className="realtime-new-posts-pill animate-fade-in"
            onClick={handleRevealNewPosts}
            title="Click to view new stories"
          >
            <span className="realtime-pulse-dot" />
            <span>↑ {unreadNewPosts.length} new {unreadNewPosts.length === 1 ? 'post' : 'posts'} • Click to view</span>
          </button>
        </div>
      )}

      {/* ================= REAL ARTICLES FEED ================= */}
      {!isLoading && displayedPosts.length > 0 && (
        <div className="reddit-posts-stream">
          {displayedPosts.map((post) => {
            const currentVote = userVotes[post.id] || null;
            const currentCount = voteCounts[post.id] !== undefined
              ? Math.max(0, voteCounts[post.id])
              : Math.max(0, post.upvotes || 0);

            const isSaved = savedPosts.some((p) => (typeof p === 'string' ? p === post.id : p.id === post.id));
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

            const isJoined = Boolean(
              hasCommunity && (
                (userDeskIds && (
                  userDeskIds.includes(post.category) ||
                  userDeskIds.includes(cleanCat) ||
                  userDeskIds.includes(post.desk) ||
                  userDeskIds.includes(cleanDesk) ||
                  userDeskIds.includes(post.deskSlug) ||
                  userDeskIds.includes(cleanSlug) ||
                  userDeskIds.includes(`c/${commTarget}`)
                )) ||
                (customCommunities && customCommunities.some((c) =>
                  c.id === post.desk || c.name === post.deskSlug || c.name === `c/${cleanDesk}` || c.name === `c/${commTarget}`
                ))
              )
            );

            const commPath = hasCommunity ? `/c/${commTarget}` : `/u/${post.author || 'member'}`;
            const displayComm = hasCommunity ? `c/${commTarget}` : `u/${post.author || 'member'}`;
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
                    e.target.closest('.user-hover-popover') ||
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
                {/* 1. Header: Avatar • Community / Author • Time • Join Button • Menu */}
                <div className="reddit-post-header">
                  <div className="post-header-left">
                    {hasCommunity ? (
                      /* Community Emblem & Name with Reddit Hover Popover */
                      <>
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
                          {commTarget.charAt(0).toUpperCase()}
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

                        {/* Reddit Community Hover Popover Card */}
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
                                  {commTarget.charAt(0).toUpperCase()}
                                </div>

                                {!isAuthor && (
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

                      {/* Author Handle with User Profile Hover Popover */}
                      {post.author && (
                        <>
                          <span className="post-meta-dot">•</span>
                          <UserHoverCard
                            username={post.author}
                            displayName={post.authorName || post.author}
                            authorRole={post.authorRole}
                          >
                            <span
                              className="community-name-link user-author-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/u/${post.author}`);
                              }}
                              title={`Go to u/${post.author}`}
                            >
                              u/{post.author}
                            </span>
                          </UserHoverCard>
                        </>
                      )}
                    </>
                    ) : (
                      /* Individual User Author Emblem & Name with User Profile Hover Popover */
                      <UserHoverCard
                        username={post.author || 'member'}
                        displayName={post.authorName || post.author}
                        authorRole={post.authorRole}
                      >
                        <div
                          className="user-author-avatar-circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(commPath);
                          }}
                          title={`Go to u/${post.author || 'member'}`}
                        >
                          {post.author ? post.author.charAt(0).toUpperCase() : 'U'}
                        </div>

                        <span
                          className="community-name-link user-author-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(commPath);
                          }}
                          title={`Go to u/${post.author || 'member'}`}
                        >
                          u/{post.author || 'member'}
                        </span>
                      </UserHoverCard>
                    )}

                    <span className="post-meta-dot">•</span>
                    <span className="post-meta-time">
                      {formatRelativeTime(post.createdAt)}
                    </span>
                  </div>

                  <div className="post-header-right">
                    {!isAuthor && hasCommunity && (
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
                      <Hand
                        size={20}
                        fill={currentVote === 1 ? 'rgba(0, 135, 81, 0.18)' : 'none'}
                        color={currentVote === 1 ? '#008751' : 'currentColor'}
                        strokeWidth={currentVote === 1 ? 2.2 : 1.9}
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
                      <Hand
                        size={20}
                        style={{ transform: 'rotate(180deg)' }}
                        fill={currentVote === -1 ? 'rgba(113, 147, 255, 0.22)' : 'none'}
                        color={currentVote === -1 ? '#7193ff' : 'currentColor'}
                        strokeWidth={currentVote === -1 ? 2.2 : 1.9}
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

                  {/* Share Pill & Popover Menu (Picture 1) */}
                  <div className="share-pill-wrapper" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="reddit-action-pill"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareMenuPostId(shareMenuPostId === post.id ? null : post.id);
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

                    {/* Picture 1: Sleek Reddit Share Popover */}
                    {shareMenuPostId === post.id && (
                      <div className="reddit-share-popover animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="share-popover-item"
                          onClick={() => {
                            handleCopyPostLink(post);
                            setTimeout(() => setShareMenuPostId(null), 800);
                          }}
                        >
                          {copiedId === post.id ? <Check size={18} color="#008751" /> : <Link2 size={18} />}
                          <span>{copiedId === post.id ? 'Copied link!' : 'Copy link'}</span>
                        </button>

                        <button
                          type="button"
                          className="share-popover-item"
                          onClick={() => {
                            handleCopyPostEmbed(post);
                            setTimeout(() => setShareMenuPostId(null), 800);
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
                            handleChannelShare('x', post);
                            setShareMenuPostId(null);
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
                            handleChannelShare('whatsapp', post);
                            setShareMenuPostId(null);
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
                          onClick={() => handleOpenMoreOptions(post)}
                        >
                          <MoreHorizontal size={18} />
                          <span>More options</span>
                        </button>
                      </div>
                    )}
                  </div>

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
            <h3 className="empty-feed-title">
              {activeFeed === 'popular' ? 'No trending posts yet' : 'No posts found'}
            </h3>
            <p className="empty-feed-desc">
              {activeFeed === 'popular'
                ? 'Popular Wire showcases posts gaining real-time momentum across all desks. As upvotes, comments, and shares surge, trending stories will appear here.'
                : activeDesk
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
                          {whyExplanation.modelSignals.consensusRatio !== undefined
                            ? `${whyExplanation.modelSignals.consensusRatio}%`
                            : '100%'}
                        </div>
                        <div className="explain-metric-lbl">Vote Consensus</div>
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

      {/* ================= SHARE LINK MODAL (Picture 2) ================= */}
      {shareModalPost && (
        <div className="onboarding-overlay" onClick={() => setShareModalPost(null)}>
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
                  onClick={() => setShareModalPost(null)}
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
                value={getPostShareUrl(shareModalPost)}
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
                onClick={() => handleCopyPostLink(shareModalPost)}
                title="Copy link"
              >
                {copiedId === shareModalPost.id ? <Check size={16} color="#008751" /> : <Copy size={16} />}
              </button>
            </div>

            {/* QR Code Preview Box */}
            {showQr && (
              <div className="qr-code-preview-box">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getPostShareUrl(shareModalPost))}`}
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
                onClick={() => handleChannelShare('gmail', shareModalPost)}
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
                onClick={() => handleChannelShare('outlook', shareModalPost)}
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
                onClick={() => handleChannelShare('native', shareModalPost)}
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
                onClick={() => handleChannelShare('whatsapp', shareModalPost)}
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
                onClick={() => handleChannelShare('gmail', shareModalPost)}
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
                onClick={() => handleChannelShare('facebook', shareModalPost)}
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
                onClick={() => handleChannelShare('x', shareModalPost)}
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
                onClick={() => handleChannelShare('linkedin', shareModalPost)}
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
                onClick={() => handleChannelShare('outlook', shareModalPost)}
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
                onClick={() => handleChannelShare('reddit', shareModalPost)}
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
