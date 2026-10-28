import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { feedApi, userApi, formatMediaUrl } from '../services/api';
import PostMediaImage from '../components/common/PostMediaImage';
import { RightPanel } from '../components/home/RightPanel';
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
  MoreHorizontal,
  Pencil,
  Link2,
} from 'lucide-react';

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

export const UserProfilePage = () => {
  const { username: paramUsername } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, updateUser } = useAuth();
  const context = useOutletContext() || {};

  const {
    savedPosts = [],
    recentPosts = [],
    canonicalDesks = [],
    onToggleSave,
    onRecordRecentView,
    onClearRecent,
    onOpenCreatePost,
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

  // Network state: followers and following lists
  const [network, setNetwork] = useState({ followers: [], following: [] });
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);

  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'about'
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postSort, setPostSort] = useState('new'); // 'new' | 'top'

  // Live vote & interaction state for profile posts
  const [userVotes, setUserVotes] = useState({});
  const [voteCounts, setVoteCounts] = useState({});
  const [openMenuPostId, setOpenMenuPostId] = useState(null);

  // Edit story modal state
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete story modal state
  const [deletingPost, setDeletingPost] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // 3. Fetch User Network (Followers & Following) from MongoDB
  useEffect(() => {
    let isMounted = true;
    setIsLoadingNetwork(true);

    userApi
      .getUserNetwork(cleanUsername)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success) {
          setNetwork({
            followers: Array.isArray(res.followers) ? res.followers : [],
            following: Array.isArray(res.following) ? res.following : [],
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to load user network:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingNetwork(false);
      });

    return () => {
      isMounted = false;
    };
  }, [cleanUsername]);

  // Seed or sync live vote counts & user direction whenever posts are loaded
  useEffect(() => {
    const initialVotes = {};
    const initialCounts = {};
    (posts || []).forEach((post) => {
      initialVotes[post.id] =
        post.userVote === 1 || post.hasUpvoted
          ? 1
          : post.userVote === -1 || post.hasDownvoted
          ? -1
          : null;
      initialCounts[post.id] = Math.max(0, post.upvotes || 0);
    });
    setUserVotes(initialVotes);
    setVoteCounts(initialCounts);
  }, [posts]);

  // Listen for real-time post updates across tabs / components
  useEffect(() => {
    const onPostVoted = (e) => {
      const { postId, upvotes, direction } = e.detail || {};
      if (postId) {
        setVoteCounts((prev) => ({
          ...prev,
          [postId]: Math.max(0, upvotes !== undefined ? upvotes : prev[postId] || 0),
        }));
        setUserVotes((prev) => ({
          ...prev,
          [postId]: direction !== undefined ? direction : prev[postId],
        }));
      }
    };

    const onPostDeleted = (e) => {
      const pId = e.detail?.postId || e.detail;
      if (pId) {
        setPosts((prev) => prev.filter((p) => p.id !== pId));
        setProfileData((prev) =>
          prev ? { ...prev, postsCount: Math.max(0, (prev.postsCount || 1) - 1) } : prev
        );
      }
    };

    const onPostUpdated = (e) => {
      const updated = e.detail;
      if (updated && updated.id) {
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      }
    };

    const onPostCreated = (e) => {
      const created = e.detail;
      if (created && created.author && created.author.toLowerCase() === cleanUsername.toLowerCase()) {
        setPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        setProfileData((prev) =>
          prev ? { ...prev, postsCount: (prev.postsCount || 0) + 1 } : prev
        );
      }
    };

    window.addEventListener('newscuddle:post_voted', onPostVoted);
    window.addEventListener('newscuddle:post_deleted', onPostDeleted);
    window.addEventListener('newscuddle:post_updated', onPostUpdated);
    window.addEventListener('newscuddle:post_created', onPostCreated);

    return () => {
      window.removeEventListener('newscuddle:post_voted', onPostVoted);
      window.removeEventListener('newscuddle:post_deleted', onPostDeleted);
      window.removeEventListener('newscuddle:post_updated', onPostUpdated);
      window.removeEventListener('newscuddle:post_created', onPostCreated);
    };
  }, [cleanUsername]);

  // Close post more menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (openMenuPostId && !e.target.closest('.post-options-menu-wrap')) {
        setOpenMenuPostId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenuPostId]);

  // Real-time Upvote / Downvote Handler for profile stream
  const handleVote = async (postId, direction) => {
    const currentVote = userVotes[postId] || null;
    let nextVote = null;
    let upvoteDiff = 0;

    if (currentVote === direction) {
      nextVote = null;
      if (direction === 1) {
        upvoteDiff = -1;
      }
    } else if (direction === 1) {
      nextVote = 1;
      upvoteDiff = 1;
    } else if (direction === -1) {
      nextVote = -1;
      if (currentVote === 1) {
        upvoteDiff = -1;
      }
    }

    setUserVotes((prev) => ({ ...prev, [postId]: nextVote }));
    setVoteCounts((prev) => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + upvoteDiff),
    }));

    try {
      const res = await feedApi.votePost({ postId, direction });
      if (res && res.success) {
        const displayUpvotes = Math.max(
          0,
          res.upvotes !== undefined ? res.upvotes : res.score || 0
        );
        setVoteCounts((prev) => ({ ...prev, [postId]: displayUpvotes }));
        setUserVotes((prev) => ({
          ...prev,
          [postId]: res.userDirection === 1 ? 1 : res.userDirection === -1 ? -1 : null,
        }));
        window.dispatchEvent(
          new CustomEvent('newscuddle:post_voted', {
            detail: {
              postId,
              upvotes: displayUpvotes,
              direction: res.userDirection,
            },
          })
        );
      }
    } catch (err) {
      console.error('Failed to vote post:', err);
    }
  };

  // Toggle Save Post
  const handleToggleSavePost = (post) => {
    if (!post?.id) return;
    const isCurrentlySaved = savedPosts.some((p) =>
      typeof p === 'string' ? p === post.id : p.id === post.id
    );
    if (onToggleSave) {
      onToggleSave(post.id, post);
    } else {
      feedApi.toggleSavePost(post.id).catch(() => {});
    }
    showToast(isCurrentlySaved ? 'Removed story from saved collection' : 'Saved story to bookmarks');
  };

  // Share story
  const handleSharePost = async (post) => {
    if (!post) return;
    const url = `${window.location.origin}/post/${post.postCode || post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.summary || post.title,
          url,
        });
        return;
      } catch (_) {}
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Story link copied to clipboard!');
    } else {
      showToast('Article URL: ' + url);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (post) => {
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditSummary(post.summary || '');
    setEditContent(post.content || post.summary || '');
    setOpenMenuPostId(null);
  };

  // Save Post Edits
  const handleSubmitEditPost = async (e) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim()) {
      showToast('Please enter a headline');
      return;
    }
    setIsSavingEdit(true);
    try {
      const res = await feedApi.updatePost({
        id: editingPost.id,
        title: editTitle.trim(),
        summary: editSummary.trim(),
        content: editContent.trim(),
      });
      if (res && res.success) {
        const updated = {
          ...editingPost,
          title: editTitle.trim(),
          summary: editSummary.trim(),
          content: editContent.trim(),
        };
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? updated : p)));
        window.dispatchEvent(
          new CustomEvent('newscuddle:post_updated', { detail: updated })
        );
        showToast('Story updated successfully!');
        setEditingPost(null);
      } else {
        throw new Error(res?.message || 'Failed to update story');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update story');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (post) => {
    setDeletingPost(post);
    setOpenMenuPostId(null);
  };

  // Confirm Delete Post
  const handleConfirmDeletePost = async () => {
    if (!deletingPost) return;
    setIsDeleting(true);
    try {
      const res = await feedApi.deletePost(deletingPost.id);
      if (res && res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== deletingPost.id));
        setProfileData((prev) =>
          prev ? { ...prev, postsCount: Math.max(0, (prev.postsCount || 1) - 1) } : prev
        );
        window.dispatchEvent(
          new CustomEvent('newscuddle:post_deleted', {
            detail: { postId: deletingPost.id },
          })
        );
        showToast('Story deleted from wire');
        setDeletingPost(null);
      } else {
        throw new Error(res?.message || 'Failed to delete story');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete story');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle follow user from the network sidebar list
  const handleToggleFollowNetworkUser = async (targetUsername) => {
    if (!targetUsername) return;
    setNetwork((prev) => {
      const toggleInList = (list) =>
        list.map((u) => {
          const match =
            (u.username || '').toLowerCase() === targetUsername.toLowerCase();
          return match ? { ...u, isFollowing: !u.isFollowing } : u;
        });
      return {
        followers: toggleInList(prev.followers),
        following: toggleInList(prev.following),
      };
    });

    try {
      const res = await feedApi.toggleFollowUser(targetUsername);
      const isF = res && res.isFollowing !== undefined ? res.isFollowing : true;
      showToast(
        isF
          ? `Now following u/${targetUsername}`
          : `Unfollowed u/${targetUsername}`
      );

      try {
        let followed = [];
        const raw = localStorage.getItem('newscuddle_followed_authors');
        if (raw) followed = JSON.parse(raw);
        if (isF) {
          if (!followed.includes(targetUsername)) followed.push(targetUsername);
        } else {
          followed = followed.filter((a) => a !== targetUsername);
        }
        localStorage.setItem('newscuddle_followed_authors', JSON.stringify(followed));
      } catch (_) {}

      window.dispatchEvent(
        new CustomEvent('newscuddle:follow_change', {
          detail: { targetAuthor: targetUsername, isFollowing: isF },
        })
      );
    } catch (err) {
      console.error('Failed to toggle follow user in network list:', err);
    }
  };

  // Handle Follow / Unfollow
  const handleToggleFollow = async () => {
    if (isSelf || followLoading) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowLoading(true);

    try {
      const res = await feedApi.toggleFollowUser(cleanUsername);
      const isF = res && res.isFollowing !== undefined ? res.isFollowing : nextState;
      setIsFollowing(isF);
      showToast(isF ? `Now following u/${cleanUsername}` : `Unfollowed u/${cleanUsername}`);
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              followersCount: Math.max(0, (prev.followersCount || 0) + (isF ? 1 : -1)),
            }
          : prev
      );

      try {
        let followed = [];
        const raw = localStorage.getItem('newscuddle_followed_authors');
        if (raw) followed = JSON.parse(raw);
        if (isF) {
          if (!followed.includes(cleanUsername)) followed.push(cleanUsername);
        } else {
          followed = followed.filter((a) => a !== cleanUsername);
        }
        localStorage.setItem('newscuddle_followed_authors', JSON.stringify(followed));
      } catch (_) {}

      window.dispatchEvent(
        new CustomEvent('newscuddle:follow_change', {
          detail: { targetAuthor: cleanUsername, isFollowing: isF },
        })
      );
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
    <>
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
                const isSaved = savedPosts.some((p) =>
                  typeof p === 'string' ? p === post.id : p.id === post.id
                );
                const postDetailPath = `/post/${post.postCode || post.id}`;
                const rawDeskSlug = post.deskSlug || post.desk || post.category || 'feed';
                const cleanDeskSlug = rawDeskSlug.replace(/^c\//, '').replace(/^\//, '');
                const deskDisplay = rawDeskSlug.startsWith('c/') ? rawDeskSlug : `c/${cleanDeskSlug}`;

                const isAuthorPost = Boolean(
                  isSelf ||
                    (currentUser?.username &&
                      post.author &&
                      currentUser.username.toLowerCase() === post.author.toLowerCase())
                );

                const currentVote = userVotes[post.id] || null;
                const displayScore =
                  voteCounts[post.id] !== undefined
                    ? voteCounts[post.id]
                    : Math.max(0, post.upvotes || 0);

                return (
                  <article
                    key={post.id}
                    className="reddit-post-card cursor-pointer animate-fade-in"
                    onClick={(e) => {
                      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.post-options-menu-wrap')) return;
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
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/c/${cleanDeskSlug}`);
                          }}
                          title={`View ${deskDisplay}`}
                        >
                          {(post.deskName || post.category || 'C').charAt(0).toUpperCase()}
                        </div>
                        <span
                          className="community-name-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/c/${cleanDeskSlug}`);
                          }}
                          title={`View ${deskDisplay}`}
                        >
                          {deskDisplay}
                        </span>
                        <span className="post-meta-dot">•</span>
                        <span className="post-meta-time" title={post.createdAt}>
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>

                      {/* Post Options Menu Button (...) */}
                      <div className="post-header-right post-options-menu-wrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="post-options-menu-btn"
                          onClick={() =>
                            setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)
                          }
                          title="More options"
                          aria-label="More options"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuPostId === post.id && (
                          <div className="post-dropdown-menu animate-fade-in">
                            {isAuthorPost ? (
                              <>
                                <button
                                  type="button"
                                  className="post-dropdown-item"
                                  onClick={() => handleOpenEditModal(post)}
                                >
                                  <Pencil size={15} color="#008751" />
                                  <span>Edit Story</span>
                                </button>
                                <button
                                  type="button"
                                  className="post-dropdown-item danger"
                                  onClick={() => handleOpenDeleteModal(post)}
                                >
                                  <Trash2 size={15} color="#dc2626" />
                                  <span>Delete Story</span>
                                </button>
                                <div className="post-dropdown-divider" />
                                <button
                                  type="button"
                                  className="post-dropdown-item"
                                  onClick={() => {
                                    handleSharePost(post);
                                    setOpenMenuPostId(null);
                                  }}
                                >
                                  <Link2 size={15} />
                                  <span>Copy Link</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="post-dropdown-item"
                                  onClick={() => {
                                    handleToggleSavePost(post);
                                    setOpenMenuPostId(null);
                                  }}
                                >
                                  <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
                                  <span>{isSaved ? 'Remove from Saved' : 'Save Story'}</span>
                                </button>
                                <button
                                  type="button"
                                  className="post-dropdown-item"
                                  onClick={() => {
                                    handleSharePost(post);
                                    setOpenMenuPostId(null);
                                  }}
                                >
                                  <Link2 size={15} />
                                  <span>Copy Link</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
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
                      {/* Interactive Voting Pill */}
                      <div className="post-action-pill vote-pill" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`vote-btn upvote ${currentVote === 1 ? 'voted' : ''}`}
                          onClick={() => handleVote(post.id, 1)}
                          title="Upvote story"
                          aria-label="Upvote"
                        >
                          <Flame size={16} color={currentVote === 1 ? '#008751' : 'currentColor'} />
                        </button>
                        <span className="vote-count">{displayScore}</span>
                        <button
                          type="button"
                          className={`vote-btn downvote ${currentVote === -1 ? 'voted' : ''}`}
                          onClick={() => handleVote(post.id, -1)}
                          title="Downvote story"
                          aria-label="Downvote"
                        >
                          <span className="downvote-chevron">▼</span>
                        </button>
                      </div>

                      {/* Comments Navigation Pill */}
                      <div
                        className="post-action-pill comment-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRecordRecentView) onRecordRecentView(post);
                          navigate(postDetailPath, { state: { post } });
                        }}
                        title="View discussion & comments"
                      >
                        <MessageSquare size={16} />
                        <span>{post.commentsCount || 0} comments</span>
                      </div>

                      {/* Save Story Pill */}
                      <button
                        type="button"
                        className={`post-action-pill ${isSaved ? 'saved' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSavePost(post);
                        }}
                        title={isSaved ? 'Remove from saved' : 'Save post'}
                      >
                        <Bookmark size={16} className={isSaved ? 'fill-current' : ''} />
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>

                      {/* Share Story Pill */}
                      <button
                        type="button"
                        className="post-action-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSharePost(post);
                        }}
                        title="Share story"
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
              <span className="detail-val">Permanent Encrypted Archive Active</span>
            </div>
          </div>

          {profileData?.bio && (
            <div style={{ marginTop: '1.25rem' }}>
              <span className="detail-key" style={{ display: 'block', marginBottom: '0.45rem' }}>
                Editorial Bio
              </span>
              <div className="profile-bio-container">{renderBioText(profileData.bio)}</div>
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

      {/* ================= EDIT STORY MODAL ================= */}
      {editingPost && (
        <div className="onboarding-overlay" onClick={() => setEditingPost(null)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '540px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div>
                  <h3 className="modal-title">Edit Story</h3>
                  <p className="modal-subtitle">Update your headline and summary on the NewsCuddle Wire.</p>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setEditingPost(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitEditPost} style={{ marginTop: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Headline / Title *
                  </label>
                  <input
                    type="text"
                    className="modal-textarea-field"
                    style={{ minHeight: 'auto', padding: '0.65rem 0.85rem' }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Enter headline..."
                    required
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Executive Summary
                  </label>
                  <textarea
                    className="modal-textarea-field"
                    rows={3}
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    placeholder="Short summary displayed on feed..."
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Full Content
                  </label>
                  <textarea
                    className="modal-textarea-field"
                    rows={5}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Story full article body..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button
                    type="button"
                    className="onboarding-next-btn"
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                    onClick={() => setEditingPost(null)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="onboarding-next-btn btn-primary"
                    disabled={isSavingEdit || !editTitle.trim()}
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE STORY CONFIRMATION MODAL ================= */}
      {deletingPost && (
        <div className="onboarding-overlay" onClick={() => setDeletingPost(null)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '460px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ color: '#0f172a', margin: 0 }}>
                    Delete Story?
                  </h3>
                  <p className="modal-subtitle" style={{ margin: 0 }}>
                    This action will remove the story permanently from the wire feed.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.86rem',
                  color: '#334155',
                  fontWeight: 600,
                  marginBottom: '1.25rem',
                }}
              >
                "{deletingPost.title}"
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="onboarding-next-btn"
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                  onClick={() => setDeletingPost(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="onboarding-next-btn"
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                  }}
                  onClick={handleConfirmDeletePost}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Story'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>

    {/* ================= RIGHT SIDEBAR: FOLLOWERS & FOLLOWING ================= */}
    <RightPanel
      mode="profile"
      profileUser={profileData}
      followers={network.followers}
      following={network.following}
      followersCount={
        profileData?.followersCount !== undefined
          ? profileData.followersCount
          : network.followers.length
      }
      followingCount={
        profileData?.followingCount !== undefined
          ? profileData.followingCount
          : network.following.length
      }
      onToggleFollowUser={handleToggleFollowNetworkUser}
      recentPosts={recentPosts}
      savedPosts={savedPosts}
      canonicalDesks={canonicalDesks}
      onClearRecent={onClearRecent}
      onOpenCreatePost={onOpenCreatePost}
      onSelectPost={(post) => {
        if (!post || !post.id) return;
        const target = post.postCode || post.id;
        navigate(`/post/${target}`, { state: { post } });
      }}
      onAddNewPost={(newPost) => {
        if (!newPost || !newPost.id) return;
        setPosts((prev) => [newPost, ...prev]);
        setProfileData((prev) =>
          prev ? { ...prev, postsCount: (prev.postsCount || 0) + 1 } : prev
        );
      }}
    />
  </>
  );
};

export default UserProfilePage;
