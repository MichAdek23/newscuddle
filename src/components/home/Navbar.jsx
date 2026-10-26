import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchApi, trendingApi } from '../../services/api';
import telemetry from '../../services/telemetry';
import {
  Search,
  Plus,
  Bell,
  MessageSquare,
  ChevronDown,
  LogOut,
  Bookmark,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  X,
  Megaphone,
  Globe,
  Flame,
  Compass,
  User,
} from 'lucide-react';

const RECENT_SEARCHES_KEY = 'newscuddle_recent_searches';

export const Navbar = ({ searchQuery, setSearchQuery, toggleSidebar, onOpenCreatePost }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [dismissedScopeId, setDismissedScopeId] = useState(null);

  // Compute active route scope matching Reddit's scoped search bar (Image 1: e.g. [r/decadeology ✕])
  const currentRouteScope = (() => {
    const p = location.pathname;
    if (p.startsWith('/c/')) {
      const slug = p.split('/')[2];
      if (slug) {
        return {
          id: `community:${slug}`,
          type: 'community',
          slug,
          label: slug.startsWith('c/') ? slug : `c/${slug}`,
          placeholder: `Search in ${slug.startsWith('c/') ? slug : `c/${slug}`}`,
        };
      }
    }
    if (p === '/news') {
      return { id: 'route:news', type: 'news', label: 'News', placeholder: 'Search in News' };
    }
    if (p === '/popular') {
      return { id: 'route:popular', type: 'popular', label: 'Popular', placeholder: 'Search in Popular' };
    }
    if (p === '/explore') {
      return { id: 'route:explore', type: 'explore', label: 'Explore', placeholder: 'Search in Explore' };
    }
    if (p.startsWith('/u/') || p === '/profile') {
      const uSlug = p.split('/')[2] || user?.username || 'profile';
      return {
        id: `user:${uSlug}`,
        type: 'user',
        label: `u/${uSlug}`,
        placeholder: `Search in u/${uSlug}`,
      };
    }
    return null;
  })();

  // Reset dismissed scope if user navigates to a new route scope
  useEffect(() => {
    if (currentRouteScope && dismissedScopeId && dismissedScopeId !== currentRouteScope.id) {
      setDismissedScopeId(null);
    }
  }, [currentRouteScope?.id]);

  const activeScope = currentRouteScope && dismissedScopeId !== currentRouteScope.id ? currentRouteScope : null;
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const searchContainerRef = useRef(null);
  const profileContainerRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowSearchDropdown(false);
      }
      if (
        profileContainerRef.current &&
        !profileContainerRef.current.contains(e.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleSearchSubmit = (term) => {
    const trimmed = (term !== undefined ? term : searchQuery).trim();
    if (!trimmed) return;

    setSearchQuery(trimmed);
    setShowSearchDropdown(false);

    // 1. Save to local storage for instant feedback
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save search history', err);
      }
      return updated;
    });

    // 2. Track real-time interaction telemetry for analytics and ML models
    telemetry.track('query_submit', { query: trimmed }, 'navbar_search_form');

    // 3. Transmit to backend ML pipeline with sessionId to record search and train user interest weights
    searchApi
      .recordSearch(trimmed, telemetry.sessionId)
      .then(() => {
        // Refresh ML trending searches
        return searchApi.getTrending();
      })
      .then((res) => {
        if (Array.isArray(res?.topics)) {
          setTrendingTopics(res.topics);
        }
      })
      .catch((err) => {
        console.warn('Search record background sync:', err);
      });
  };

  const handleRemoveRecentSearch = (e, itemToRemove) => {
    e.stopPropagation();
    telemetry.track('recent_search_remove', { query: itemToRemove }, 'recent_search_remove_btn');
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== itemToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to update search history', err);
      }
      return updated;
    });
    searchApi.clearRecentSearches(itemToRemove).catch(() => {});
  };

  const handleClearAllRecent = (e) => {
    e.stopPropagation();
    telemetry.track('recent_search_clear_all', {}, 'recent_search_clear_all_btn');
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (err) {
      console.error('Failed to clear search history', err);
    }
    searchApi.clearRecentSearches().catch(() => {});
  };

  // Dynamic trending topics computed by ML algorithm (zero mock data)
  const [trendingTopics, setTrendingTopics] = useState([]);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch ML trending searches
    searchApi
      .getTrending()
      .then((res) => {
        if (isMounted && Array.isArray(res?.topics)) {
          setTrendingTopics(res.topics);
        }
      })
      .catch(() => {});

    // 2. Fetch authenticated user search history from database
    searchApi
      .getRecentSearches()
      .then((res) => {
        if (isMounted && Array.isArray(res?.searches) && res.searches.length > 0) {
          setRecentSearches(res.searches);
          try {
            localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(res.searches));
          } catch (_) {}
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user]);

  // User details derived strictly from AuthContext (no hardcoded info)
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || user?.username || user?.email?.split('@')[0] || 'Member';

  const userHandle = user?.username
    ? `u/${user.username}`
    : user?.email
    ? `u/${user.email.split('@')[0]}`
    : '';

  const avatarInitial = (displayName || 'U').charAt(0).toUpperCase();

  return (
    <header className="reddit-navbar">
      {/* 1. Left: Brand Logo + Text (Reddit-style) */}
      <div className="reddit-nav-left">
        <Link
          to="/"
          className="reddit-brand-link"
          title="NewsCuddle Home"
          onClick={() => {
            if (setSearchQuery) setSearchQuery('');
            window.dispatchEvent(new CustomEvent('newscuddle:reload_feed'));
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
        >
          <img
            src="/logo-icon.png"
            alt="NewsCuddle"
            className="reddit-brand-logo-img"
          />
          <span className="reddit-brand-name">
            <span className="brand-name-news">news</span>
            <span className="brand-name-cuddle">cuddle</span>
          </span>
        </Link>
      </div>

      {/* 2. Center: Reddit-style Pill Search Bar with Dropdown & Scoped Route Chip */}
      <div className="reddit-nav-center" ref={searchContainerRef}>
        <div className={`reddit-search-bar ${showSearchDropdown ? 'active-focus' : ''}`}>
          {/* Magnifying Search Icon (matching Reddit screenshot) */}
          <div className="reddit-search-brand-badge">
            <Search size={16} color="#576f76" />
          </div>

          {/* Active Route-Scoped Search Chip (Reddit style, e.g. [ r/decadeology ✕ ]) */}
          {activeScope && (
            <div className="reddit-search-scope-chip animate-fade-in" title={`Searching within ${activeScope.label}`}>
              <span className="search-scope-avatar">
                {activeScope.type === 'community' ? (
                  <span className="search-scope-initial">{activeScope.slug.charAt(0).toUpperCase()}</span>
                ) : activeScope.type === 'news' ? (
                  <Globe size={11} color="#ffffff" />
                ) : activeScope.type === 'popular' ? (
                  <Flame size={11} color="#ffffff" />
                ) : activeScope.type === 'explore' ? (
                  <Compass size={11} color="#ffffff" />
                ) : (
                  <User size={11} color="#ffffff" />
                )}
              </span>
              <span className="search-scope-label">{activeScope.label}</span>
              <button
                type="button"
                className="search-scope-dismiss-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedScopeId(activeScope.id);
                }}
                title="Search globally across NewsCuddle"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <input
            type="text"
            className="reddit-search-input"
            placeholder={activeScope ? activeScope.placeholder : "Search NewsCuddle"}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => {
              setShowSearchDropdown(true);
              telemetry.track('search_focus', { queryLength: searchQuery.length, scope: activeScope?.label || 'global' }, 'navbar_search_input');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              } else if (e.key === 'Escape') {
                setShowSearchDropdown(false);
              }
            }}
          />

          {searchQuery && (
            <button
              type="button"
              className="reddit-search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(true);
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Search Autocomplete / Recent & ML Trending Dropdown */}
        {showSearchDropdown && (
          <div className="reddit-search-dropdown-menu">
            {/* Active search query trigger */}
            {searchQuery.trim() && (
              <div
                className="search-item search-query-prompt"
                onClick={() => handleSearchSubmit(searchQuery)}
              >
                <div className="search-item-left">
                  <Search size={14} className="search-item-icon query-icon" />
                  <span className="search-item-text">
                    Search for "<strong>{searchQuery.trim()}</strong>"
                    {activeScope ? <span style={{ color: '#008751', fontWeight: 600 }}> in {activeScope.label}</span> : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Real User Recent Searches (from local user history) */}
            {recentSearches.length > 0 && (
              <div className="search-dropdown-section">
                <div className="search-dropdown-header">
                  <span className="search-dropdown-title">Recent Searches</span>
                  <button
                    type="button"
                    className="search-clear-all-link"
                    onClick={handleClearAllRecent}
                  >
                    Clear all
                  </button>
                </div>
                <div className="search-results-list">
                  {recentSearches.map((item) => (
                    <div
                      key={item}
                      className="search-item recent-item"
                      onClick={() => {
                        telemetry.track('recent_search_click', { query: item }, 'recent_search_item');
                        handleSearchSubmit(item);
                      }}
                    >
                      <div className="search-item-left">
                        <Clock size={14} className="search-item-icon" />
                        <span className="search-item-text">{item}</span>
                      </div>
                      <button
                        type="button"
                        className="search-remove-btn"
                        title="Remove from history"
                        onClick={(e) => handleRemoveRecentSearch(e, item)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real Trending Topics (Only rendered when computed by backend ML algorithm) */}
            {trendingTopics.length > 0 && (
              <div className="search-dropdown-section">
                <div className="search-dropdown-header">
                  <span className="search-dropdown-title">Trending Topics</span>
                </div>
                <div className="search-results-list">
                  {trendingTopics.map((topic) => (
                    <div
                      key={topic.id || topic.title}
                      className="search-item trending-item"
                      onClick={() => {
                        telemetry.track('trending_click', {
                          query: topic.query || topic.title || topic.name,
                          desk: topic.desk,
                          score: topic.score,
                          rank: topic.rank,
                        }, 'trending_item_' + (topic.id || topic.title));
                        handleSearchSubmit(topic.query || topic.title || topic.name);
                      }}
                    >
                      <div className="search-item-left">
                        <div className="trending-badge-icon">
                          <TrendingUp size={13} />
                        </div>
                        <div className="trending-text-group">
                          <span className="search-item-text">{topic.title || topic.name}</span>
                          {topic.desk && (
                            <span className="trending-desk-tag">{topic.desk}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state when no searches, no active query, and no ML topics yet */}
            {recentSearches.length === 0 &&
              trendingTopics.length === 0 &&
              !searchQuery.trim() && (
                <div className="search-dropdown-empty">
                  <p className="search-empty-text">
                    Search news, topics, and verified sources across NewsCuddle
                  </p>
                </div>
              )}
          </div>
        )}
      </div>

      {/* 3. Right: [AD], Chat, + Create, Notifications, Compact Profile */}
      <div className="reddit-nav-right">
        {/* [AD] / Advertise Pill */}
        <button
          type="button"
          className="reddit-icon-action"
          title="Advertise on NewsCuddle"
        >
          <Megaphone size={18} />
        </button>

        {/* Chat / Discussions */}
        <button
          type="button"
          className="reddit-icon-action"
          title="Discussions & Chat"
        >
          <MessageSquare size={19} />
        </button>

        {/* + Create Pill Button */}
        <button
          type="button"
          className="btn-reddit-create"
          title="Create a Post or Wire"
          onClick={() => onOpenCreatePost && onOpenCreatePost()}
        >
          <Plus size={16} />
          <span>Create</span>
        </button>

        {/* Notifications */}
        <button
          type="button"
          className="reddit-icon-action"
          title="Notifications"
          onClick={() => setHasUnread(false)}
        >
          <Bell size={19} />
          {hasUnread && <span className="reddit-unread-dot"></span>}
        </button>

        {/* Compact Reddit-Style Profile Avatar (No wide name pill) */}
        <div className="reddit-profile-wrapper" ref={profileContainerRef}>
          <button
            type="button"
            className="reddit-avatar-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="User Profile & Settings"
            aria-expanded={showProfileMenu}
          >
            <div className="reddit-avatar-circle">
              {user?.avatarUrl && !avatarImgError && user.avatarUrl.startsWith('http') ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="reddit-avatar-img"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                <span className="reddit-avatar-letter">{avatarInitial}</span>
              )}
            </div>
            <span className="reddit-avatar-status"></span>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="reddit-dropdown-menu">
              <div className="reddit-dropdown-user">
                <p className="dd-name">{displayName}</p>
                {userHandle && <p className="dd-handle">{userHandle}</p>}
                {user?.email && <p className="dd-email">{user.email}</p>}
              </div>

              <div className="reddit-dropdown-sep"></div>

              <a
                href="#saved"
                className="reddit-dropdown-link"
                onClick={() => setShowProfileMenu(false)}
              >
                <Bookmark size={16} />
                <span>Saved Posts</span>
              </a>

              <a
                href="#preferences"
                className="reddit-dropdown-link"
                onClick={() => setShowProfileMenu(false)}
              >
                <SlidersHorizontal size={16} />
                <span>Settings</span>
              </a>

              <div className="reddit-dropdown-sep"></div>

              <button
                type="button"
                className="reddit-dropdown-link signout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
