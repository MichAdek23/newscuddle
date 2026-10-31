import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileBarsHidden, setMobileBarsHidden] = useState(false);
  const [hasUnreadInbox, setHasUnreadInbox] = useState(true);
  const [mobileInboxActive, setMobileInboxActive] = useState(false);
  const lastScrollYRef = useRef(0);
  const scrollTickingRef = useRef(false);

  // Scroll to top automatically whenever the route changes (e.g. returning to Home from a post detail)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMobileSidebarOpen(false);
    setMobileBarsHidden(false);
    setMobileInboxActive(false);
    lastScrollYRef.current = 0;
  }, [location.pathname]);

  // Prevent background body scroll when mobile navigation drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
      setMobileBarsHidden(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  // Reddit / X style mobile scroll listener: hide top & bottom bars when scrolling down feed, reveal when scrolling up
  useEffect(() => {
    const handleWindowScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
        const delta = currentScrollY - lastScrollYRef.current;

        if (window.innerWidth <= 860 && !mobileSidebarOpen) {
          if (currentScrollY < 48) {
            setMobileBarsHidden(false);
            lastScrollYRef.current = currentScrollY;
          } else if (
            delta > 7 &&
            currentScrollY > 64 &&
            !document.activeElement?.closest('.reddit-navbar')
          ) {
            setMobileBarsHidden(true);
            lastScrollYRef.current = currentScrollY;
          } else if (delta < -5) {
            setMobileBarsHidden(false);
            lastScrollYRef.current = currentScrollY;
          }
        } else {
          setMobileBarsHidden(false);
          lastScrollYRef.current = currentScrollY;
        }

        scrollTickingRef.current = false;
      });
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [mobileSidebarOpen]);

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

  // Stable identity (useCallback + functional setState) so consumers can safely list it in effect deps
  const handleRecordRecentView = useCallback((post) => {
    if (!post || !post.id) return;
    setRecentPosts((prev) => {
      // Already the most recent entry: keep same array reference to avoid needless re-renders
      if (prev[0] && prev[0].id === post.id) return prev;
      const filtered = prev.filter((p) => p.id !== post.id);
      const updated = [post, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('newscuddle_recent_posts', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  const handleClearRecent = useCallback(() => {
    setRecentPosts([]);
    try {
      localStorage.removeItem('newscuddle_recent_posts');
    } catch (_) {}
  }, []);

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
        mobileSidebarOpen={mobileSidebarOpen}
        toggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        onOpenCreatePost={handleOpenCreatePost}
        isHiddenOnMobile={mobileBarsHidden && !mobileSidebarOpen}
      />

      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`reddit-sidebar-backdrop ${mobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="reddit-main-container">
        {/* Left Sidebar is a constant and given across all pages */}
        {(!sidebarCollapsed || mobileSidebarOpen) && (
          <LeftSidebar
            canonicalDesks={canonicalDesks}
            userDeskIds={userDeskIds}
            pinnedDeskIds={pinnedDeskIds}
            customCommunities={customCommunities}
            onTogglePin={handleTogglePin}
            onToggleJoinDesk={handleToggleJoinDesk}
            onCreateCommunity={handleCreateCommunity}
            onDeleteCommunity={handleDeleteCommunity}
            isMobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
        )}

        <div className="reddit-feed-and-right-wrapper" key={location.pathname}>
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

      {/* Mobile Bottom Navigation Bar (4 items: Home, Create, Inbox, You) */}
      {(() => {
        const isInboxActive = mobileInboxActive;
        const isCreateActive = !isInboxActive && location.pathname.startsWith('/n/create');
        const isYouActive =
          !isInboxActive &&
          (location.pathname.startsWith('/u/') ||
            location.pathname.startsWith('/user/') ||
            location.pathname === '/profile');
        const isHomeActive = !isInboxActive && !isCreateActive && !isYouActive && location.pathname === '/';

        return (
          <nav
            className={`reddit-mobile-bottom-nav ${
              mobileBarsHidden && !mobileSidebarOpen ? 'mobile-nav-hidden' : ''
            }`}
            aria-label="Mobile Primary Navigation"
          >
            <button
              type="button"
              className={`mobile-bottom-nav-item ${isHomeActive ? 'active' : ''}`}
              onClick={() => {
                setMobileInboxActive(false);
                if (location.pathname === '/') {
                  window.dispatchEvent(new CustomEvent('newscuddle:reload_feed'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  navigate('/');
                }
              }}
            >
              {isHomeActive ? (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="#008751"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mobile-bottom-filled-icon"
                >
                  <path d="M11.3 2.3a1 1 0 0 1 1.4 0l8 8A1 1 0 0 1 21 11v9a2 2 0 0 1-2 2h-4.5a.5.5 0 0 1-.5-.5V15a2 2 0 0 0-4 0v6.5a.5.5 0 0 1-.5.5H5a2 2 0 0 1-2-2v-9a1 1 0 0 1 .3-.7l8-8Z" />
                </svg>
              ) : (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mobile-bottom-outline-icon"
                >
                  <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" />
                </svg>
              )}
              <span>Home</span>
            </button>

            <button
              type="button"
              className={`mobile-bottom-nav-item ${isCreateActive ? 'active' : ''}`}
              onClick={() => {
                setMobileInboxActive(false);
                handleOpenCreatePost();
              }}
              aria-label="Create Post"
            >
              {isCreateActive ? (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="#008751"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mobile-bottom-filled-icon"
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm1 5.5a1 1 0 1 0-2 0V11H7.5a1 1 0 1 0 0 2H11v3.5a1 1 0 1 0 2 0V13h3.5a1 1 0 1 0 0-2H13V7.5Z" />
                </svg>
              ) : (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mobile-bottom-outline-icon"
                >
                  <circle cx="12" cy="12" r="9.5" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              )}
              <span>Create</span>
            </button>

            <button
              type="button"
              className={`mobile-bottom-nav-item ${isInboxActive ? 'active' : ''}`}
              onClick={() => {
                setHasUnreadInbox(false);
                setMobileInboxActive((prev) => !prev);
              }}
              aria-label="Inbox & Notifications"
            >
              <div className="mobile-bottom-icon-wrap">
                {isInboxActive ? (
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="#008751"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mobile-bottom-filled-icon"
                  >
                    <path d="M12 2a6.5 6.5 0 0 0-6.5 6.5v4.086l-1.56 1.56A1.5 1.5 0 0 0 5 16.707V17a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.293a1.5 1.5 0 0 0-.44-1.06l-1.56-1.56V8.5A6.5 6.5 0 0 0 12 2Zm-2.5 17.5a2.5 2.5 0 0 0 5 0h-5Z" />
                  </svg>
                ) : (
                  <svg
                    width="21"
                    height="21"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mobile-bottom-outline-icon"
                  >
                    <path d="M18 8.5a6 6 0 0 0-12 0v4.2l-1.7 1.7a1 1 0 0 0 .7 1.7h14a1 1 0 0 0 .7-1.7L18 12.7V8.5Z" />
                    <path d="M10 19a2 2 0 0 0 4 0" />
                  </svg>
                )}
                {hasUnreadInbox && <span className="mobile-bottom-unread-dot" />}
              </div>
              <span>Inbox</span>
            </button>

            <button
              type="button"
              className={`mobile-bottom-nav-item ${isYouActive ? 'active' : ''}`}
              onClick={() => {
                setMobileInboxActive(false);
                navigate(`/u/${user?.username || 'member'}`);
              }}
            >
              {isYouActive ? (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="#008751"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mobile-bottom-filled-icon"
                >
                  <path d="M12 2.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM4 19.5C4 16.462 7.582 14 12 14s8 2.462 8 5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5Z" />
                </svg>
              ) : (
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mobile-bottom-outline-icon"
                >
                  <circle cx="12" cy="7.5" r="4.25" />
                  <path d="M4.5 20c0-3.3 3.36-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
                </svg>
              )}
              <span>You</span>
            </button>
          </nav>
        );
      })()}

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
