import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { onboardingApi, communityApi, feedApi } from '../../services/api';
import { Navbar } from '../home/Navbar';
import { LeftSidebar, DESK_METADATA_MAP } from '../home/LeftSidebar';
import { CreatePostModal } from '../home/CreatePostModal';

export const MainLayout = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Scroll to top automatically whenever the route changes (e.g. returning to Home from a post detail)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  // Dynamic Canonical Desks loaded directly from real MongoDB Atlas database
  const [canonicalDesks, setCanonicalDesks] = useState([]);

  // Fetch live categories from database
  useEffect(() => {
    let isMounted = true;
    onboardingApi
      .getCatalog()
      .then((res) => {
        if (isMounted && res?.categories && Array.isArray(res.categories)) {
          const dynamic = res.categories.map((c) => {
            const meta = DESK_METADATA_MAP[c.id] || {
              icon: null,
              color: '#008751',
              name: c.name || `c/${c.id.replace(/_/g, '')}`,
              label: c.label,
            };
            return {
              id: c.id,
              name: c.name || meta.name,
              label: c.label || meta.label,
              icon: meta.icon,
              color: meta.color,
            };
          });
          setCanonicalDesks(dynamic);
        }
      })
      .catch((err) => {
        console.warn('Failed to load categories from database:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Clean up legacy localStorage cache keys from previous testing
  useEffect(() => {
    try {
      localStorage.removeItem('newscuddle_guest_desks');
      localStorage.removeItem('newscuddle_custom_communities');
      localStorage.removeItem('newscuddle_saved_posts');
      localStorage.removeItem('newscuddle_pinned_desks');
      localStorage.removeItem('newscuddle_recent_searches');
    } catch (_) {}
  }, []);

  // 1. Strictly user-joined communities (ONLY communities the user is actually in)
  const [userDeskIds, setUserDeskIds] = useState(() => {
    if (user?.joinedCommunities && Array.isArray(user.joinedCommunities)) {
      return user.joinedCommunities;
    }
    return [];
  });

  // 2. Strictly user-pinned communities (default empty [])
  const [pinnedDeskIds, setPinnedDeskIds] = useState(() => {
    if (user?.pinnedCommunities && Array.isArray(user.pinnedCommunities)) {
      return user.pinnedCommunities;
    }
    return [];
  });

  // 3. User-owned custom communities (default empty [])
  const [customCommunities, setCustomCommunities] = useState([]);

  // Sync real state directly with MongoDB database
  useEffect(() => {
    let isMounted = true;
    const userId = user?.id || user?._id;
    if (userId) {
      communityApi
        .getUserState(userId)
        .then((res) => {
          if (!isMounted || !res) return;
          if (Array.isArray(res.joinedCommunities)) {
            setUserDeskIds(res.joinedCommunities);
          } else {
            setUserDeskIds([]);
          }
          if (Array.isArray(res.pinnedDesks)) {
            setPinnedDeskIds(res.pinnedDesks);
          } else {
            setPinnedDeskIds([]);
          }
          if (Array.isArray(res.ownedCommunities)) {
            const mapped = res.ownedCommunities.map((c) => ({
              id: c.slug || c.name,
              name: c.name,
              label: c.label,
              category: c.category,
              description: c.description,
              isOwner: true,
              membersCount: c.membersCount,
            }));
            setCustomCommunities(mapped);
          } else {
            setCustomCommunities([]);
          }
        })
        .catch((err) => {
          console.warn('Error loading user state from database:', err);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?._id]);

  // Saved posts (loaded from real MongoDB Atlas post_saves collection)
  const [savedPosts, setSavedPosts] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const userId = user?.id || user?._id;
    if (userId) {
      feedApi.getSavedPosts()
        .then((res) => {
          if (isMounted && res?.items && Array.isArray(res.items)) {
            setSavedPosts(res.items);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?._id]);

  // Recently viewed posts (persisted across sessions)
  const [recentPosts, setRecentPosts] = useState(() => {
    try {
      const saved = localStorage.getItem('newscuddle_recent_posts');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Toggle Join Desk Handler (Synchronizes across Sidebar, MainFeed, and MongoDB)
  const handleToggleJoinDesk = async (deskId) => {
    if (!deskId) return;
    const isJoined = userDeskIds.includes(deskId);
    const nextDesks = isJoined
      ? userDeskIds.filter((id) => id !== deskId)
      : [...userDeskIds, deskId];

    setUserDeskIds(nextDesks);

    // If leaving a desk and it was pinned, unpin it
    if (isJoined && pinnedDeskIds.includes(deskId)) {
      const nextPinned = pinnedDeskIds.filter((id) => id !== deskId);
      setPinnedDeskIds(nextPinned);
      const userId = user?.id || user?._id;
      if (userId) {
        communityApi.savePinnedDesks(userId, nextPinned).catch(() => {});
      } else {
        try {
          localStorage.setItem('newscuddle_pinned_desks', JSON.stringify(nextPinned));
        } catch (_) {}
      }
    }

    if (user) {
      updateUser({ joinedCommunities: nextDesks });
    }
    const userId = user?.id || user?._id;
    if (userId) {
      try {
        await communityApi.toggleJoin({
          userId,
          communityId: deskId,
          action: isJoined ? 'leave' : 'join',
        });
      } catch (err) {
        console.error('Failed to sync community join toggle to MongoDB:', err);
      }
    }
  };

  // Toggle Pin for a desk or custom community (Synchronizes directly with MongoDB)
  const handleTogglePin = (deskId) => {
    if (!deskId) return;
    const isPinned = pinnedDeskIds.includes(deskId);
    const next = isPinned
      ? pinnedDeskIds.filter((id) => id !== deskId)
      : [...pinnedDeskIds, deskId];
    setPinnedDeskIds(next);

    const userId = user?.id || user?._id;
    if (userId) {
      communityApi.savePinnedDesks(userId, next).catch((err) => {
        console.warn('Failed to sync pinned desks to MongoDB:', err);
      });
    } else {
      try {
        localStorage.setItem('newscuddle_pinned_desks', JSON.stringify(next));
      } catch (_) {}
    }
  };

  // Create new custom community (Saved directly to MongoDB Atlas)
  const handleCreateCommunity = async (newCommData) => {
    const userId = user?.id || user?._id;
    try {
      const payload = {
        name: newCommData.name,
        label: newCommData.label,
        category: newCommData.category,
        description: newCommData.description,
        type: newCommData.type || 'public',
        isNsfw: !!newCommData.isNsfw,
        creatorId: userId || '',
        creatorUsername: user?.username || 'member',
      };
      const res = await communityApi.createCommunity(payload);
      const created = res?.community || {
        id: `c/${newCommData.name.replace(/^c\//, '')}`,
        name: `c/${newCommData.name.replace(/^c\//, '')}`,
        label: newCommData.label,
        category: newCommData.category,
        description: newCommData.description,
      };

      const normalized = {
        id: created.slug || created.name,
        name: created.name,
        label: created.label,
        category: created.category,
        description: created.description,
        isOwner: true,
      };

      setCustomCommunities((prev) => [normalized, ...prev.filter((c) => c.id !== normalized.id)]);
      handleTogglePin(normalized.id);
      return normalized;
    } catch (err) {
      console.warn('Creating local community fallback:', err);
      const local = {
        id: `c/${newCommData.name.replace(/^c\//, '')}`,
        name: `c/${newCommData.name.replace(/^c\//, '')}`,
        label: newCommData.label,
        category: newCommData.category,
        description: newCommData.description,
        isOwner: true,
      };
      setCustomCommunities((prev) => [local, ...prev]);
      handleTogglePin(local.id);
      return local;
    }
  };

  // Delete custom community (Deleted directly from MongoDB Atlas)
  const handleDeleteCommunity = async (commId) => {
    const userId = user?.id || user?._id;
    try {
      await communityApi.deleteCommunity(commId, userId);
    } catch (err) {
      console.warn('Failed to delete community from MongoDB:', err);
    }
    setCustomCommunities((prev) => prev.filter((c) => c.id !== commId && c.slug !== commId));
    if (pinnedDeskIds.includes(commId)) {
      handleTogglePin(commId);
    }
  };

  const handleToggleSave = (id, postData) => {
    setSavedPosts((prev) => {
      const isAlreadySaved = prev.some((p) => (typeof p === 'string' ? p === id : p.id === id));
      let updated;
      if (isAlreadySaved) {
        updated = prev.filter((p) => (typeof p === 'string' ? p !== id : p.id !== id));
      } else {
        const item = postData || { id, title: 'Saved Article' };
        updated = [item, ...prev];
      }
      try {
        localStorage.setItem('newscuddle_saved_posts', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const handleRecordRecentView = (post) => {
    if (!post || !post.id) return;
    setRecentPosts((prev) => {
      const filtered = prev.filter((p) => p.id !== post.id);
      const updated = [post, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('newscuddle_recent_posts', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentPosts([]);
    try {
      localStorage.removeItem('newscuddle_recent_posts');
    } catch (_) {}
  };

  // Create Post Modal State & Handler
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [createPostDefaultCommunity, setCreatePostDefaultCommunity] = useState(null);

  const handleOpenCreatePost = (defaultComm = null) => {
    let commTarget = null;
    if (typeof defaultComm === 'string') {
      commTarget = defaultComm;
    } else if (defaultComm) {
      commTarget = defaultComm.slug || defaultComm.id || defaultComm.name || null;
    }
    navigate('/n/create', { state: { defaultCommunity: commTarget } });
  };

  const handlePostCreated = (newPost) => {
    // Notify feed components via CustomEvent to prepend immediately
    window.dispatchEvent(new CustomEvent('newscuddle:post_created', { detail: newPost }));
  };

  return (
    <div className="reddit-layout-wrapper">
      {/* 1. Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenCreatePost={handleOpenCreatePost}
      />

      <div className="reddit-main-container">
        {/* Left Sidebar is a constant and given across all pages */}
        {!sidebarCollapsed && (
          <LeftSidebar
            canonicalDesks={canonicalDesks}
            userDeskIds={userDeskIds}
            pinnedDeskIds={pinnedDeskIds}
            customCommunities={customCommunities}
            onTogglePin={handleTogglePin}
            onToggleJoinDesk={handleToggleJoinDesk}
            onCreateCommunity={handleCreateCommunity}
            onDeleteCommunity={handleDeleteCommunity}
          />
        )}

        <div className="reddit-feed-and-right-wrapper">
          <Outlet
            context={{
              searchQuery,
              canonicalDesks,
              userDeskIds,
              pinnedDeskIds,
              customCommunities,
              savedPosts,
              recentPosts,
              onToggleJoinDesk: handleToggleJoinDesk,
              onTogglePin: handleTogglePin,
              onToggleSave: handleToggleSave,
              onRecordRecentView: handleRecordRecentView,
              onClearRecent: handleClearRecent,
              onCreateCommunity: handleCreateCommunity,
              onDeleteCommunity: handleDeleteCommunity,
              onOpenCreatePost: handleOpenCreatePost,
            }}
          />
        </div>
      </div>

      {/* Global Universal Create Post Modal */}
      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreated={handlePostCreated}
        defaultCommunity={createPostDefaultCommunity}
        customCommunities={customCommunities}
        canonicalDesks={canonicalDesks}
      />
    </div>
  );
};

export default MainLayout;
