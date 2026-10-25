import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Compass,
  Search,
  Users,
  Star,
  Check,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { RightPanel } from '../components/home/RightPanel';
import { getDeskMeta } from '../components/home/LeftSidebar';
import { communityApi } from '../services/api';

export const ExplorePage = () => {
  const context = useOutletContext() || {};
  const navigate = useNavigate();

  const {
    canonicalDesks = [],
    userDeskIds = [],
    pinnedDeskIds = [],
    customCommunities = [],
    savedPosts = [],
    recentPosts = [],
    onToggleJoinDesk,
    onTogglePin,
    onRecordRecentView,
    onClearRecent,
    onCreateCommunity,
  } = context;

  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'canonical' | 'custom'
  const [dbCommunities, setDbCommunities] = useState([]);

  // Fetch real database communities created by users from MongoDB Atlas
  useEffect(() => {
    let isMounted = true;
    communityApi
      .getCommunities()
      .then((res) => {
        if (isMounted && res?.communities && Array.isArray(res.communities)) {
          setDbCommunities(res.communities);
        }
      })
      .catch((err) => {
        console.warn('Failed to load communities from MongoDB:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Combine and format all communities
  const allCommunitiesList = useMemo(() => {
    const canonical = (canonicalDesks || []).map((d) => {
      const meta = getDeskMeta(d.id);
      return {
        id: d.id,
        name: d.name || meta.name,
        label: d.label || meta.label,
        category: d.id,
        description:
          d.description ||
          `Official verified editorial desk covering ${d.label || meta.label} with primary terminal reporting.`,
        icon: d.icon || meta.icon,
        color: d.color || meta.color,
        isCanonical: true,
        membersCount: d.membersCount || 1240,
      };
    });

    // Merge custom communities from context and live database
    const mergedCustom = [...(customCommunities || [])];
    (dbCommunities || []).forEach((dbComm) => {
      if (!mergedCustom.some((c) => c.id === dbComm.slug || c.id === dbComm.name || c.id === dbComm.id)) {
        mergedCustom.push(dbComm);
      }
    });

    const custom = mergedCustom.map((c) => ({
      id: c.slug || c.id || c.name,
      name: (c.name || c.slug || '').startsWith('c/') ? (c.name || c.slug) : `c/${c.name || c.slug}`,
      label: c.label || c.name || c.slug,
      category: c.category || 'general',
      description: c.description || 'Community circle created on NewsCuddle.',
      icon: Users,
      color: '#008751',
      isCanonical: false,
      membersCount: c.membersCount || 1,
    }));

    return [...canonical, ...custom];
  }, [canonicalDesks, customCommunities, dbCommunities]);

  // Filtered list
  const filteredList = useMemo(() => {
    return allCommunitiesList.filter((c) => {
      if (activeTab === 'canonical' && !c.isCanonical) return false;
      if (activeTab === 'custom' && c.isCanonical) return false;
      if (filterText.trim()) {
        const q = filterText.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchLabel = c.label.toLowerCase().includes(q);
        const matchDesc = c.description.toLowerCase().includes(q);
        return matchName || matchLabel || matchDesc;
      }
      return true;
    });
  }, [allCommunitiesList, activeTab, filterText]);

  const getCleanSlug = (item) => {
    const raw = item?.name || item?.slug || item?.id || '';
    return raw.replace(/^c\//, '').replace(/^\//, '');
  };

  return (
    <>
      <div className="feed-column-container">
        {/* Explore Route Header */}
        <div className="reddit-route-header-banner explore-route-banner animate-fade-in">
          <div className="route-banner-icon-badge explore-badge">
            <Compass size={22} />
          </div>
          <div className="route-banner-content">
            <div className="route-banner-tag-row">
              <span className="route-banner-tag">Global Directory</span>
              <span className="route-banner-subtag">• {allCommunitiesList.length} Live Communities</span>
            </div>
            <h1 className="route-banner-title">Explore Communities</h1>
            <p className="route-banner-description">
              Browse canonical editorial desks and specialized user circles. Join communities to customize your personal feed.
            </p>
          </div>
        </div>

        {/* Explore Search and Filter Bar */}
        <div className="explore-search-filter-card">
          <div className="explore-search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by community name, desk, or keyword..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="explore-search-field"
            />
            {filterText && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setFilterText('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="explore-tabs-row">
            <button
              type="button"
              className={`explore-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Communities ({allCommunitiesList.length})
            </button>
            <button
              type="button"
              className={`explore-tab-btn ${activeTab === 'canonical' ? 'active' : ''}`}
              onClick={() => setActiveTab('canonical')}
            >
              Editorial Desks ({(canonicalDesks || []).length})
            </button>
            <button
              type="button"
              className={`explore-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => setActiveTab('custom')}
            >
              User Created ({(customCommunities || []).length})
            </button>
          </div>
        </div>

        {/* Communities Grid */}
        <div className="explore-cards-grid">
          {filteredList.map((comm) => {
            const Icon = comm.icon || Users;
            const isJoined =
              (userDeskIds && (userDeskIds.includes(comm.id) || userDeskIds.includes(comm.name))) ||
              (customCommunities && customCommunities.some((c) => c.id === comm.id));
            const isPinned = pinnedDeskIds && (pinnedDeskIds.includes(comm.id) || pinnedDeskIds.includes(comm.name));
            const cleanSlug = getCleanSlug(comm);

            return (
              <div
                key={comm.id}
                className="explore-community-card animate-fade-in"
                onClick={() => navigate(`/c/${cleanSlug}`)}
              >
                <div
                  className="explore-card-top-strip"
                  style={{
                    background: `linear-gradient(135deg, ${comm.color || '#008751'}, #0f172a)`,
                  }}
                />

                <div className="explore-card-body">
                  <div className="explore-card-header">
                    <div
                      className="explore-avatar-circle"
                      style={{
                        backgroundColor: `${comm.color || '#008751'}20`,
                        color: comm.color || '#008751',
                        border: `2px solid ${comm.color || '#008751'}`,
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="explore-header-text">
                      <span className="explore-comm-name">{comm.name}</span>
                      <span className="explore-comm-label">{comm.label}</span>
                    </div>

                    <button
                      type="button"
                      className={`explore-pin-btn ${isPinned ? 'is-pinned' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTogglePin) onTogglePin(comm.id);
                      }}
                      title={isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                    >
                      <Star size={15} className={isPinned ? 'filled' : ''} />
                    </button>
                  </div>

                  <p className="explore-comm-desc">{comm.description}</p>

                  <div className="explore-card-footer">
                    <div className="explore-members-count">
                      <Users size={13} />
                      <span>{comm.membersCount.toLocaleString()} members</span>
                    </div>

                    <button
                      type="button"
                      className={`explore-join-btn ${isJoined ? 'joined' : 'join'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onToggleJoinDesk) onToggleJoinDesk(comm.id);
                      }}
                    >
                      {isJoined ? (
                        <>
                          <Check size={13} />
                          <span>Joined</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Join</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredList.length === 0 && (
            <div className="explore-empty-state">
              <p className="explore-empty-title">No communities found</p>
              <p className="explore-empty-sub">
                Try searching with different keywords or check out all communities.
              </p>
              <button
                type="button"
                className="explore-reset-btn"
                onClick={() => {
                  setFilterText('');
                  setActiveTab('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <RightPanel
        mode="explore"
        recentPosts={recentPosts}
        onClearRecent={onClearRecent}
        savedPosts={savedPosts}
        canonicalDesks={canonicalDesks}
        onSelectPost={(post) => {
          if (!post || !post.id) return;
          const clean = (post.deskSlug || post.desk || post.category || 'feed')
            .replace(/^c\//, '')
            .replace(/^\//, '');
          navigate(`/c/${clean || 'feed'}/comments/${post.id}`, { state: { post } });
        }}
      />
    </>
  );
};

export default ExplorePage;
