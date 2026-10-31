import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { onboardingApi, communityApi } from '../../services/api';
import {
  Home,
  Flame,
  Newspaper,
  Compass,
  Plus,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Cpu,
  Globe,
  Leaf,
  Trophy,
  Gamepad2,
  Coffee,
  Dumbbell,
  Scissors,
  GraduationCap,
  Palette,
  Sliders,
  Megaphone,
  HelpCircle,
  BookOpen,
  Briefcase,
  Radio,
  Star,
  Check,
  X,
  Search,
  Users,
  Shield,
  FileText,
  Lock,
  Eye,
  Info,
  Trash2,
} from 'lucide-react';

// Editorial Desk Visual Metadata (Maps database IDs to visual icons and branding colors)
export const DESK_METADATA_MAP = {
  news_politics: { icon: Globe, color: '#2563eb', name: 'c/politics', label: 'News & Politics' },
  business_finance: { icon: TrendingUp, color: '#008751', name: 'c/markets', label: 'Business & Finance' },
  technology: { icon: Cpu, color: '#7c3aed', name: 'c/technology', label: 'Technology' },
  science_environment: { icon: Leaf, color: '#059669', name: 'c/science', label: 'Science & Nature' },
  sports: { icon: Trophy, color: '#ea580c', name: 'c/sports', label: 'Sports' },
  gaming: { icon: Gamepad2, color: '#dc2626', name: 'c/gaming', label: 'Gaming' },
  culture_lifestyle: { icon: Coffee, color: '#d97706', name: 'c/culture', label: 'Culture & Life' },
  health_fitness: { icon: Dumbbell, color: '#0284c7', name: 'c/fitness', label: 'Health & Fitness' },
  fashion_beauty: { icon: Scissors, color: '#db2777', name: 'c/fashion', label: 'Fashion & Style' },
  travel_outdoors: { icon: Compass, color: '#0891b2', name: 'c/travel', label: 'Travel & Outdoors' },
  education_careers: { icon: GraduationCap, color: '#4f46e5', name: 'c/careers', label: 'Careers & Study' },
  art_design: { icon: Palette, color: '#9333ea', name: 'c/art', label: 'Art & Design' },
};

export const getDeskMeta = (id) =>
  DESK_METADATA_MAP[id] || {
    icon: Globe,
    color: '#008751',
    name: `c/${(id || '').replace(/_/g, '')}`,
    label: id || 'Community',
  };

export const LeftSidebar = ({
  activeFeed,
  setActiveFeed,
  activeDesk,
  setActiveDesk,
  canonicalDesks: propCanonicalDesks,
  userDeskIds: controlledUserDeskIds,
  pinnedDeskIds: controlledPinnedDeskIds,
  customCommunities: controlledCustomCommunities,
  onTogglePin: controlledOnTogglePin,
  onToggleJoinDesk: controlledOnToggleJoinDesk,
  onCreateCommunity: controlledOnCreateCommunity,
  onDeleteCommunity: controlledOnDeleteCommunity,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getCommunityPath = (item) => {
    const raw = item?.name || item?.slug || item?.id || '';
    const clean = raw.replace(/^c\//, '').replace(/^\//, '');
    return `/c/${clean}`;
  };

  const isCommunityActive = (item) => {
    const p = getCommunityPath(item);
    return location.pathname === p || (item?.id && location.pathname === `/c/${item.id}`);
  };

  const isNavActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Collapsible accordion states
  const [communitiesOpen, setCommunitiesOpen] = useState(true);
  const [resourcesOpen, setResourcesOpen] = useState(true);

  // Dynamic Canonical Desks loaded directly from real MongoDB Atlas database (No hardcoded fallbacks)
  const [localCanonicalDesks, setLocalCanonicalDesks] = useState([]);
  const canonicalDesks =
    propCanonicalDesks && propCanonicalDesks.length > 0 ? propCanonicalDesks : localCanonicalDesks;

  // Fetch real categories directly from MongoDB via onboardingApi.getCatalog()
  useEffect(() => {
    let isMounted = true;
    onboardingApi
      .getCatalog()
      .then((res) => {
        if (isMounted && res?.categories && Array.isArray(res.categories)) {
          const dynamicDesks = res.categories.map((c) => {
            const meta = DESK_METADATA_MAP[c.id] || {
              icon: Globe,
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
          setLocalCanonicalDesks(dynamicDesks);
        }
      })
      .catch((err) => {
        console.warn('Error loading catalog categories from database:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Internal state fallbacks (strictly empty by default - no mock data)
  const [localPinnedDeskIds, setLocalPinnedDeskIds] = useState(() => []);
  const [localCustomCommunities, setLocalCustomCommunities] = useState(() => []);
  const localUserDeskIds = useMemo(() => {
    if (user?.joinedCommunities && Array.isArray(user.joinedCommunities)) {
      return user.joinedCommunities;
    }
    return [];
  }, [user?.joinedCommunities]);

  // Use controlled props if passed from HomePage; else local state
  const userDeskIds = controlledUserDeskIds !== undefined ? controlledUserDeskIds : localUserDeskIds;
  const pinnedDeskIds = controlledPinnedDeskIds !== undefined ? controlledPinnedDeskIds : localPinnedDeskIds;
  const customCommunities = controlledCustomCommunities !== undefined ? controlledCustomCommunities : localCustomCommunities;

  // Modal Dialog States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState(null);

  // Manage Communities Modal: 'joined' | 'owned' | 'explore'
  const [manageTab, setManageTab] = useState('joined');
  const [manageSearch, setManageSearch] = useState('');

  // Form state for Start Community Modal
  const [newCommName, setNewCommName] = useState('');
  const [newCommCategory, setNewCommCategory] = useState('technology');
  const [newCommDescription, setNewCommDescription] = useState('');
  const [createError, setCreateError] = useState('');

  // Toggle pin state for a desk or custom community
  const togglePin = (deskId) => {
    if (controlledOnTogglePin) {
      controlledOnTogglePin(deskId);
      return;
    }
    setLocalPinnedDeskIds((prev) => {
      const next = prev.includes(deskId)
        ? prev.filter((id) => id !== deskId)
        : [...prev, deskId];
      try {
        localStorage.setItem('newscuddle_pinned_desks', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // Handle joining or leaving a desk
  const handleToggleJoinDesk = async (deskId) => {
    if (controlledOnToggleJoinDesk) {
      controlledOnToggleJoinDesk(deskId);
      return;
    }

    const isJoined = userDeskIds.includes(deskId);
    const updatedDesks = isJoined
      ? userDeskIds.filter((id) => id !== deskId)
      : [...userDeskIds, deskId];

    if (isJoined && pinnedDeskIds.includes(deskId)) {
      togglePin(deskId);
    }

    if (user) {
      updateUser({ feedCategories: updatedDesks });
      try {
        await onboardingApi.toggleDesk({
          userId: user.id || user._id,
          categoryId: deskId,
          action: isJoined ? 'remove' : 'add',
          categories: updatedDesks,
          durationMs: 400,
        });
      } catch (e) {
        console.error('Failed to sync desk toggle:', e);
      }
    } else {
      try {
        localStorage.setItem('newscuddle_guest_desks', JSON.stringify(updatedDesks));
      } catch (_) {}
    }
  };

  // Create new community handler (User Owned)
  const handleCreateCommunity = (e) => {
    e.preventDefault();
    const clean = newCommName.trim().replace(/^c\//, '').toLowerCase();
    if (!clean) {
      setCreateError('Please enter a community name.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setCreateError('Only lowercase letters, numbers, and underscores allowed.');
      return;
    }
    if (clean.length < 3) {
      setCreateError('Community name must be at least 3 characters.');
      return;
    }

    const newComm = {
      id: `custom_${clean}`,
      name: `c/${clean}`,
      label: newCommDescription || `c/${clean} Community`,
      category: newCommCategory,
      createdAt: new Date().toISOString(),
      isOwner: true,
    };

    if (controlledOnCreateCommunity) {
      controlledOnCreateCommunity(newComm);
    } else {
      const nextCustom = [newComm, ...customCommunities];
      setLocalCustomCommunities(nextCustom);
      try {
        localStorage.setItem('newscuddle_custom_communities', JSON.stringify(nextCustom));
      } catch (_) {}
      togglePin(newComm.id);
      setActiveDesk(newComm.id);
      setActiveFeed(null);
    }

    setNewCommName('');
    setNewCommDescription('');
    setCreateError('');
    setShowCreateModal(false);
  };

  // Delete custom community
  const handleDeleteCommunity = (commId) => {
    if (controlledOnDeleteCommunity) {
      controlledOnDeleteCommunity(commId);
      return;
    }
    const nextCustom = customCommunities.filter((c) => c.id !== commId);
    setLocalCustomCommunities(nextCustom);
    try {
      localStorage.setItem('newscuddle_custom_communities', JSON.stringify(nextCustom));
    } catch (_) {}
    if (pinnedDeskIds.includes(commId)) {
      togglePin(commId);
    }
    if (activeDesk === commId) {
      setActiveDesk(null);
    }
  };

  // Canonical desks that user has strictly joined
  const joinedCanonicalDesks = useMemo(() => {
    return (canonicalDesks || []).filter(
      (d) => userDeskIds.includes(d.id) || userDeskIds.includes(d.name)
    );
  }, [canonicalDesks, userDeskIds]);

  // Custom communities that user has strictly joined or owns
  const joinedCustomCommunities = useMemo(() => {
    return (customCommunities || []).filter(
      (c) => userDeskIds.includes(c.id) || userDeskIds.includes(c.name) || c.isOwner
    );
  }, [customCommunities, userDeskIds]);

  // Pinned communities: ONLY what the user has pinned and belongs to or owns
  const pinnedDesks = useMemo(() => {
    const pinnedCanonical = joinedCanonicalDesks.filter((d) => pinnedDeskIds.includes(d.id));
    const pinnedCustom = joinedCustomCommunities.filter((c) => pinnedDeskIds.includes(c.id));
    return [...pinnedCanonical, ...pinnedCustom];
  }, [joinedCanonicalDesks, joinedCustomCommunities, pinnedDeskIds]);

  // Unpinned communities that the user is in
  const unpinnedJoinedDesks = useMemo(() => {
    return joinedCanonicalDesks.filter((d) => !pinnedDeskIds.includes(d.id));
  }, [joinedCanonicalDesks, pinnedDeskIds]);

  // Unpinned custom communities that the user owns
  const unpinnedOwnedDesks = useMemo(() => {
    return joinedCustomCommunities.filter((c) => !pinnedDeskIds.includes(c.id));
  }, [joinedCustomCommunities, pinnedDeskIds]);

  // Main Nav Items with explicit route paths
  const mainNavItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'popular', label: 'Popular', icon: Flame, path: '/popular' },
    { id: 'news', label: 'News', icon: Newspaper, path: '/news' },
    { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
  ];

  return (
    <>
      <aside
        className={`reddit-left-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Primary Left Sidebar Navigation"
      >
        {/* Mobile Drawer Header (visible on screens <= 860px) */}
        <div className="mobile-sidebar-header">
          <div className="mobile-sidebar-brand">
            <img src="/logo-icon.png" alt="NewsCuddle" className="mobile-sidebar-logo" />
            <span className="reddit-brand-name">
              <span className="brand-name-news">news</span>
              <span className="brand-name-cuddle">cuddle</span>
            </span>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              className="mobile-sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="sidebar-scrollable-inner">
          {/* ================= 1. TOP NAV ITEMS ================= */}
          <div className="reddit-sidebar-section">
            <nav className="reddit-sidebar-nav">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = isNavActive(item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`reddit-nav-pill ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (item.path === '/') {
                        window.dispatchEvent(new CustomEvent('newscuddle:reload_feed'));
                        navigate('/', { state: { reloadFeed: Date.now() } });
                      } else {
                        navigate(item.path);
                      }
                      window.scrollTo({ top: 0, behavior: 'instant' });
                      if (setActiveFeed) setActiveFeed(item.id);
                      if (setActiveDesk) setActiveDesk(null);
                      if (onCloseMobile) onCloseMobile();
                    }}
                  >
                    <Icon size={19} className="nav-pill-icon" />
                    <span className="nav-pill-label">{item.label}</span>
                  </button>
                );
              })}

              {/* Start Community Button */}
              <button
                type="button"
                className="reddit-nav-pill create-comm-btn"
                onClick={() => {
                  setShowCreateModal(true);
                  if (onCloseMobile) onCloseMobile();
                }}
              >
                <Plus size={19} className="nav-pill-icon" />
                <span className="nav-pill-label">Start Community</span>
              </button>
            </nav>
          </div>

          <div className="reddit-sidebar-divider"></div>

          {/* ================= 2. COMMUNITIES SECTION ================= */}
          <div className="reddit-sidebar-section">
            <button
              type="button"
              className="reddit-accordion-trigger"
              onClick={() => setCommunitiesOpen(!communitiesOpen)}
            >
              <span>COMMUNITIES</span>
              {communitiesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {communitiesOpen && (
              <div className="reddit-accordion-content">
                {/* Manage Communities Button */}
                <button
                  type="button"
                  className="reddit-nav-pill manage-comm-pill"
                  onClick={() => {
                    setManageTab('joined');
                    setShowManageModal(true);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title="View and manage communities you own or are in"
                >
                  <Sliders size={17} className="nav-pill-icon" />
                  <span className="nav-pill-label">Manage Communities</span>
                </button>

                {/* Sub-navigation: Pinned Communities (ONLY rendered if pinnedDesks.length > 0) */}
                {pinnedDesks.length > 0 && (
                  <div className="communities-subgroup">
                    <span className="communities-subgroup-label">PINNED</span>
                    {pinnedDesks.map((desk) => {
                      const Icon = desk.icon || Users;
                      const isSelected = isCommunityActive(desk);
                      const deskColor = desk.color || '#008751';
                      return (
                        <div
                          key={desk.id}
                          className={`reddit-community-row ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            navigate(getCommunityPath(desk));
                            if (setActiveDesk) setActiveDesk(desk.id);
                            if (setActiveFeed) setActiveFeed(null);
                            if (onCloseMobile) onCloseMobile();
                          }}
                        >
                          <div
                            className="desk-avatar-icon"
                            style={{ backgroundColor: `${deskColor}15`, color: deskColor }}
                          >
                            <Icon size={15} />
                          </div>
                          <div className="desk-label-group">
                            <span className="desk-name">{desk.name}</span>
                            <span className="desk-sub">{desk.label}</span>
                          </div>
                          <button
                            type="button"
                            className="pin-action-btn is-pinned"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(desk.id);
                            }}
                            title="Unpin community"
                          >
                            <Star size={14} className="star-icon filled" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sub-navigation: The Communities the User is In / Owns */}
                <div className="communities-subgroup">
                  {pinnedDesks.length > 0 && (
                    <span className="communities-subgroup-label">YOUR COMMUNITIES</span>
                  )}

                  {/* Joined canonical editorial desks */}
                  {unpinnedJoinedDesks.map((desk) => {
                    const Icon = desk.icon || Globe;
                    const isSelected = isCommunityActive(desk);
                    const deskColor = desk.color || '#008751';
                    return (
                      <div
                        key={desk.id}
                        className={`reddit-community-row ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          navigate(getCommunityPath(desk));
                          if (setActiveDesk) setActiveDesk(desk.id);
                          if (setActiveFeed) setActiveFeed(null);
                          if (onCloseMobile) onCloseMobile();
                        }}
                      >
                        <div
                          className="desk-avatar-icon"
                          style={{ backgroundColor: `${deskColor}15`, color: deskColor }}
                        >
                          <Icon size={15} />
                        </div>
                        <div className="desk-label-group">
                          <span className="desk-name">{desk.name}</span>
                          <span className="desk-sub">{desk.label}</span>
                        </div>
                        <button
                          type="button"
                          className="pin-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(desk.id);
                          }}
                          title="Pin community to top"
                        >
                          <Star size={14} className="star-icon" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Custom Communities Created and Owned by User */}
                  {unpinnedOwnedDesks.map((comm) => {
                    const isSelected = isCommunityActive(comm);
                    return (
                      <div
                        key={comm.id}
                        className={`reddit-community-row ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          navigate(getCommunityPath(comm));
                          if (setActiveDesk) setActiveDesk(comm.id);
                          if (setActiveFeed) setActiveFeed(null);
                          if (onCloseMobile) onCloseMobile();
                        }}
                      >
                        <div
                          className="desk-avatar-icon"
                          style={{ backgroundColor: '#00875115', color: '#008751' }}
                        >
                          <Users size={14} />
                        </div>
                        <div className="desk-label-group">
                          <span className="desk-name">{comm.name}</span>
                          <span className="desk-sub">{comm.label}</span>
                        </div>
                        <button
                          type="button"
                          className="pin-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(comm.id);
                          }}
                          title="Pin community to top"
                        >
                          <Star size={14} className="star-icon" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Empty state prompt if user has joined 0 communities and created 0 */}
                  {pinnedDesks.length === 0 &&
                    unpinnedJoinedDesks.length === 0 &&
                    unpinnedOwnedDesks.length === 0 && (
                      <div className="empty-communities-prompt animate-fade-in">
                        <p className="empty-prompt-text">You haven't joined any communities yet.</p>
                        <button
                          type="button"
                          className="empty-explore-btn"
                          onClick={() => {
                            navigate('/explore');
                            if (onCloseMobile) onCloseMobile();
                          }}
                        >
                          <Compass size={14} />
                          <span>Explore Communities</span>
                        </button>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          <div className="reddit-sidebar-divider"></div>

          {/* ================= 3. RESOURCES SECTION ================= */}
          <div className="reddit-sidebar-section">
            <button
              type="button"
              className="reddit-accordion-trigger"
              onClick={() => setResourcesOpen(!resourcesOpen)}
            >
              <span>RESOURCES</span>
              {resourcesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {resourcesOpen && (
              <div className="reddit-accordion-content">
                <nav className="reddit-sidebar-nav">
                  <button
                    type="button"
                    className="reddit-nav-pill"
                    onClick={() => setActivePolicyModal('advertise')}
                  >
                    <Megaphone size={18} className="nav-pill-icon" />
                    <span className="nav-pill-label">Advertise</span>
                  </button>

                  <button
                    type="button"
                    className="reddit-nav-pill"
                    onClick={() => setActivePolicyModal('help')}
                  >
                    <HelpCircle size={18} className="nav-pill-icon" />
                    <span className="nav-pill-label">Help</span>
                  </button>

                  <button
                    type="button"
                    className="reddit-nav-pill"
                    onClick={() => setActivePolicyModal('blog')}
                  >
                    <BookOpen size={18} className="nav-pill-icon" />
                    <span className="nav-pill-label">Blog</span>
                  </button>

                  <button
                    type="button"
                    className="reddit-nav-pill"
                    onClick={() => setActivePolicyModal('careers')}
                  >
                    <Briefcase size={18} className="nav-pill-icon" />
                    <span className="nav-pill-label">Careers</span>
                  </button>

                  <button
                    type="button"
                    className="reddit-nav-pill"
                    onClick={() => setActivePolicyModal('press')}
                  >
                    <Radio size={18} className="nav-pill-icon" />
                    <span className="nav-pill-label">Press</span>
                  </button>
                </nav>
              </div>
            )}
          </div>

          <div className="reddit-sidebar-divider"></div>

          {/* ================= 4. FOOTER / LEGAL POLICIES ================= */}
          <div className="reddit-sidebar-footer">
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
        </div>
      </aside>

      {/* ================= MODAL 1: START A COMMUNITY ================= */}
      {showCreateModal && (
        <div className="onboarding-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div>
                  <h3 className="modal-title">Create a Community</h3>
                  <p className="modal-subtitle">Build a specialized editorial desk on NewsCuddle.</p>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCommunity} className="create-community-form">
                <div className="form-group-field">
                  <label className="form-field-label">COMMUNITY NAME</label>
                  <div className="onboarding-input-wrapper">
                    <span className="onboarding-input-prefix">c/</span>
                    <input
                      type="text"
                      className="onboarding-input"
                      placeholder="quantumcomputing"
                      value={newCommName}
                      onChange={(e) => {
                        setNewCommName(e.target.value);
                        setCreateError('');
                      }}
                      autoFocus
                    />
                  </div>
                  <span className="form-field-hint">
                    Names cannot have spaces or special characters. (e.g. c/generative_ai)
                  </span>
                </div>

                <div className="form-group-field">
                  <label className="form-field-label">PRIMARY EDITORIAL DESK</label>
                  <select
                    className="modal-select-field"
                    value={newCommCategory}
                    onChange={(e) => setNewCommCategory(e.target.value)}
                  >
                    {(canonicalDesks || []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label} ({d.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-field">
                  <label className="form-field-label">COMMUNITY DESCRIPTION</label>
                  <textarea
                    className="modal-textarea-field"
                    rows={3}
                    placeholder="Provide a brief mandate for discussions, links, and breaking stories..."
                    value={newCommDescription}
                    onChange={(e) => setNewCommDescription(e.target.value)}
                  />
                </div>

                {createError && <div className="modal-error-alert">{createError}</div>}

                <div className="onboarding-actions-row">
                  <button
                    type="button"
                    className="feed-select-all-btn"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="onboarding-next-btn btn-primary">
                    <Check size={16} />
                    <span>Create Community</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: MANAGE COMMUNITIES ================= */}
      {showManageModal && (
        <div className="onboarding-overlay" onClick={() => setShowManageModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div>
                  <h3 className="modal-title">Manage Communities</h3>
                  <p className="modal-subtitle">
                    Communities you own, communities you're in, and explore editorial desks.
                  </p>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => setShowManageModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* 3 Dedicated Tabs: Joined | Owned | Explore */}
              <div className="manage-tabs-row">
                <button
                  type="button"
                  className={`manage-tab-btn ${manageTab === 'joined' ? 'active' : ''}`}
                  onClick={() => setManageTab('joined')}
                >
                  <Users size={14} />
                  <span>Communities You're In</span>
                  <span className="manage-tab-count">{userDeskIds.length}</span>
                </button>
                <button
                  type="button"
                  className={`manage-tab-btn ${manageTab === 'owned' ? 'active' : ''}`}
                  onClick={() => setManageTab('owned')}
                >
                  <Shield size={14} />
                  <span>Communities You Own</span>
                  <span className="manage-tab-count">{customCommunities.length}</span>
                </button>
                <button
                  type="button"
                  className={`manage-tab-btn ${manageTab === 'explore' ? 'active' : ''}`}
                  onClick={() => setManageTab('explore')}
                >
                  <Compass size={14} />
                  <span>Explore Desks</span>
                  <span className="manage-tab-count">{canonicalDesks.length}</span>
                </button>
              </div>

              {/* Search Filter input */}
              <div className="interests-search-wrapper" style={{ marginBottom: '1rem' }}>
                <Search size={16} className="interests-search-icon" />
                <input
                  type="text"
                  className="interests-search-input"
                  placeholder={
                    manageTab === 'owned'
                      ? 'Filter communities you own...'
                      : manageTab === 'joined'
                      ? "Filter communities you're in..."
                      : 'Search desks to discover and join...'
                  }
                  value={manageSearch}
                  onChange={(e) => setManageSearch(e.target.value)}
                />
              </div>

              <div className="manage-desks-list custom-scrollbar">
                {/* 1. COMMUNITIES YOU'RE IN */}
                {manageTab === 'joined' && (
                  <>
                    {joinedCanonicalDesks
                      .filter(
                        (d) =>
                          d.label.toLowerCase().includes(manageSearch.toLowerCase()) ||
                          d.name.toLowerCase().includes(manageSearch.toLowerCase())
                      )
                      .map((desk) => {
                        const Icon = desk.icon;
                        const isPinned = pinnedDeskIds.includes(desk.id);
                        return (
                          <div key={desk.id} className="manage-desk-card">
                            <div
                              className="desk-avatar-icon"
                              style={{ backgroundColor: `${desk.color}18`, color: desk.color, width: 34, height: 34 }}
                            >
                              <Icon size={18} />
                            </div>

                            <div
                              className="manage-desk-info"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                navigate(getCommunityPath(desk));
                                setShowManageModal(false);
                              }}
                            >
                              <span className="manage-desk-title">{desk.label}</span>
                              <span className="manage-desk-handle">{desk.name}</span>
                            </div>

                            <div className="manage-desk-actions">
                              <button
                                type="button"
                                className={`manage-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                                onClick={() => togglePin(desk.id)}
                                title={isPinned ? 'Unpin from sidebar' : 'Pin to top of sidebar'}
                              >
                                <Star size={13} className={isPinned ? 'filled' : ''} />
                                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                              </button>

                              <button
                                type="button"
                                className="manage-join-btn joined"
                                onClick={() => handleToggleJoinDesk(desk.id)}
                                title="Leave community"
                              >
                                Leave
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {joinedCanonicalDesks.length === 0 && (
                      <div className="manage-empty-state">
                        <div className="manage-empty-icon-wrap">
                          <Users size={28} />
                        </div>
                        <h4 className="manage-empty-title">You're not in any communities yet</h4>
                        <p className="manage-empty-text">
                          Join editorial desks to personalize your feed with intelligence you care about.
                        </p>
                        <button
                          type="button"
                          className="manage-empty-action-btn"
                          onClick={() => setManageTab('explore')}
                        >
                          <Compass size={15} />
                          <span>Explore All Desks</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* 2. COMMUNITIES YOU OWN */}
                {manageTab === 'owned' && (
                  <>
                    {customCommunities
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(manageSearch.toLowerCase()) ||
                          c.label.toLowerCase().includes(manageSearch.toLowerCase())
                      )
                      .map((comm) => {
                        const isPinned = pinnedDeskIds.includes(comm.id);
                        return (
                          <div key={comm.id} className="manage-desk-card">
                            <div
                              className="desk-avatar-icon"
                              style={{ backgroundColor: '#00875118', color: '#008751', width: 34, height: 34 }}
                            >
                              <Users size={17} />
                            </div>

                            <div
                              className="manage-desk-info"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                navigate(getCommunityPath(comm));
                                setShowManageModal(false);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                <span className="manage-desk-title">{comm.name}</span>
                                <span className="owner-badge">
                                  <Shield size={11} /> Owner
                                </span>
                              </div>
                              <span className="manage-desk-handle">{comm.label}</span>
                            </div>

                            <div className="manage-desk-actions">
                              <button
                                type="button"
                                className={`manage-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                                onClick={() => togglePin(comm.id)}
                                title={isPinned ? 'Unpin from sidebar' : 'Pin to top of sidebar'}
                              >
                                <Star size={13} className={isPinned ? 'filled' : ''} />
                                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                              </button>

                              <button
                                type="button"
                                className="manage-delete-btn"
                                onClick={() => handleDeleteCommunity(comm.id)}
                                title="Delete community"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {customCommunities.length === 0 && (
                      <div className="manage-empty-state">
                        <div className="manage-empty-icon-wrap">
                          <Plus size={28} />
                        </div>
                        <h4 className="manage-empty-title">No communities created yet</h4>
                        <p className="manage-empty-text">
                          You haven't founded any communities. Create a specialized desk for curated discussions.
                        </p>
                        <button
                          type="button"
                          className="manage-empty-action-btn"
                          onClick={() => {
                            setShowManageModal(false);
                            setShowCreateModal(true);
                          }}
                        >
                          <Plus size={15} />
                          <span>Start a Community</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* 3. EXPLORE ALL DESKS */}
                {manageTab === 'explore' && (
                  <>
                    {canonicalDesks
                      .filter(
                        (d) =>
                          d.label.toLowerCase().includes(manageSearch.toLowerCase()) ||
                          d.name.toLowerCase().includes(manageSearch.toLowerCase())
                      )
                      .map((desk) => {
                        const Icon = desk.icon || Globe;
                        const deskColor = desk.color || '#008751';
                        const isJoined = userDeskIds.includes(desk.id);
                        const isPinned = pinnedDeskIds.includes(desk.id);

                        return (
                          <div key={desk.id} className="manage-desk-card">
                            <div
                              className="desk-avatar-icon"
                              style={{ backgroundColor: `${deskColor}18`, color: deskColor, width: 34, height: 34 }}
                            >
                              <Icon size={18} />
                            </div>

                            <div
                              className="manage-desk-info"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                navigate(getCommunityPath(desk));
                                setShowManageModal(false);
                              }}
                            >
                              <span className="manage-desk-title">{desk.label}</span>
                              <span className="manage-desk-handle">{desk.name}</span>
                            </div>

                            <div className="manage-desk-actions">
                              {isJoined && (
                                <button
                                  type="button"
                                  className={`manage-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                                  onClick={() => togglePin(desk.id)}
                                  title={isPinned ? 'Unpin from sidebar' : 'Pin to top of sidebar'}
                                >
                                  <Star size={13} className={isPinned ? 'filled' : ''} />
                                  <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                                </button>
                              )}

                              <button
                                type="button"
                                className={`manage-join-btn ${isJoined ? 'joined' : 'join'}`}
                                onClick={() => handleToggleJoinDesk(desk.id)}
                              >
                                {isJoined ? 'Joined' : '+ Join'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>

              <div className="onboarding-actions-row" style={{ marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="onboarding-next-btn btn-primary"
                  onClick={() => setShowManageModal(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RESOURCES & POLICY MODAL ================= */}
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
                    {activePolicyModal === 'advertise' && <Megaphone size={18} />}
                    {activePolicyModal === 'help' && <HelpCircle size={18} />}
                    {activePolicyModal === 'blog' && <BookOpen size={18} />}
                    {activePolicyModal === 'careers' && <Briefcase size={18} />}
                    {activePolicyModal === 'press' && <Radio size={18} />}
                  </div>
                  <div>
                    <h3 className="modal-title">
                      {activePolicyModal === 'rules' && 'NewsCuddle Rules'}
                      {activePolicyModal === 'privacy' && 'Privacy Policy'}
                      {activePolicyModal === 'terms' && 'User Agreement'}
                      {activePolicyModal === 'accessibility' && 'Accessibility Commitment'}
                      {activePolicyModal === 'advertise' && 'Advertise on NewsCuddle'}
                      {activePolicyModal === 'help' && 'NewsCuddle Help Center'}
                      {activePolicyModal === 'blog' && 'NewsCuddle Engineering & Editorial Blog'}
                      {activePolicyModal === 'careers' && 'Careers at NewsCuddle'}
                      {activePolicyModal === 'press' && 'Press & Media Inquiries'}
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
                  maxHeight: '320px',
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
                      Your ML ranking vector is computed exclusively to personalize your intelligence terminal.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'terms' && (
                  <div>
                    <p>
                      By accessing or registering with NewsCuddle, you agree to comply with our User
                      Agreement, Community Guidelines, and copyright terms.
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      All articles, headlines, and data syndications remain the intellectual property of their
                      respective publishers and authors.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'accessibility' && (
                  <div>
                    <p>
                      NewsCuddle is committed to ensuring full digital accessibility for individuals of all
                      abilities. We continually refine user journeys adhering to WCAG 2.1 AA standards.
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      If you encounter any accessibility barrier across our desktop or mobile interfaces,
                      reach out to accessibility@newscuddle.com.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'advertise' && (
                  <div>
                    <p>
                      Reach high-net-worth professionals, market operators, technologists, and decision-makers
                      directly inside targeted NewsCuddle desks.
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      Our native sponsor modules blend seamlessly into the feed with zero tracking bloat.
                      For media kits and rate cards, contact sponsor@newscuddle.com.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'help' && (
                  <div>
                    <p>
                      Need assistance configuring your editorial desks, managing your account handle, or
                      tuning your collaborative ML feed?
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      Browse documentation at docs.newscuddle.com or email support@newscuddle.com.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'blog' && (
                  <div>
                    <p>
                      Read deep-dives from our engineering and editorial teams on collaborative filtering,
                      real-time syndication pipelines, and distributed news architectures.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'careers' && (
                  <div>
                    <p>
                      We are expanding our distributed team across machine learning engineering, backend Go
                      distributed systems, and institutional design.
                    </p>
                    <p style={{ marginTop: '0.75rem' }}>
                      Check open roles or submit your portfolio to careers@newscuddle.com.
                    </p>
                  </div>
                )}

                {activePolicyModal === 'press' && (
                  <div>
                    <p>
                      Members of the press seeking commentary, terminal access, or executive interviews
                      can reach our communications desk at press@newscuddle.com.
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
    </>
  );
};
