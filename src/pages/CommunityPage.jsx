import React, { useMemo } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import {
  Users,
  Star,
  Check,
  Plus,
  ShieldCheck,
  Share2,
  ArrowLeft,
} from 'lucide-react';
import { MainFeed } from '../components/home/MainFeed';
import { RightPanel } from '../components/home/RightPanel';
import { DESK_METADATA_MAP, getDeskMeta } from '../components/home/LeftSidebar';

export const CommunityPage = () => {
  const { slug } = useParams();
  const context = useOutletContext() || {};
  const navigate = useNavigate();

  const {
    searchQuery = '',
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
    onOpenCreatePost,
  } = context;

  // Resolve the community model based on :slug
  const community = useMemo(() => {
    if (!slug) return null;
    const cleanSlug = slug.replace(/^c\//, '').replace(/^\//, '').toLowerCase();

    // 1. Check canonical desks loaded from DB
    for (const desk of canonicalDesks) {
      const dName = (desk.name || '').replace(/^c\//, '').toLowerCase();
      const dId = (desk.id || '').toLowerCase();
      if (dName === cleanSlug || dId === cleanSlug) {
        const meta = getDeskMeta(desk.id);
        return {
          ...desk,
          id: desk.id,
          name: desk.name || meta.name,
          label: desk.label || meta.label,
          icon: desk.icon || meta.icon,
          color: desk.color || meta.color,
          description:
            desk.description ||
            `Official verified editorial desk covering ${desk.label || meta.label} with primary terminal reporting.`,
          isCanonical: true,
          membersCount: desk.membersCount || 1240,
        };
      }
    }

    // 2. Check metadata map
    for (const [deskId, meta] of Object.entries(DESK_METADATA_MAP)) {
      const mName = (meta.name || '').replace(/^c\//, '').toLowerCase();
      if (mName === cleanSlug || deskId.toLowerCase() === cleanSlug) {
        return {
          id: deskId,
          name: meta.name,
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
          description: `Official verified editorial desk covering ${meta.label} with primary terminal reporting.`,
          isCanonical: true,
          membersCount: 1240,
        };
      }
    }

    // 3. Check custom communities
    for (const comm of customCommunities) {
      const cName = (comm.name || '').replace(/^c\//, '').toLowerCase();
      const cId = (comm.id || '').replace(/^c\//, '').toLowerCase();
      const cSlug = (comm.slug || '').toLowerCase();
      if (cName === cleanSlug || cId === cleanSlug || cSlug === cleanSlug) {
        return {
          ...comm,
          id: comm.id || comm.slug || comm.name,
          name: comm.name.startsWith('c/') ? comm.name : `c/${comm.name}`,
          label: comm.label || comm.name,
          icon: Users,
          color: '#008751',
          description: comm.description || `Community circle for ${comm.label || comm.name} on NewsCuddle.`,
          isCanonical: false,
          membersCount: comm.membersCount || 1,
        };
      }
    }

    // 4. Fallback for dynamic community
    return {
      id: cleanSlug,
      name: `c/${cleanSlug}`,
      label: cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1),
      icon: Users,
      color: '#008751',
      description: `Specialized circle for ${cleanSlug} on the NewsCuddle Wire terminal.`,
      isCanonical: false,
      membersCount: 1,
    };
  }, [slug, canonicalDesks, customCommunities]);

  const Icon = community?.icon || Users;
  const isJoined = Boolean(
    community &&
      (userDeskIds?.includes(community.id) ||
        userDeskIds?.includes(community.name) ||
        customCommunities?.some((c) => c.id === community.id && c.isOwner))
  );
  const isPinned = Boolean(
    community && (pinnedDeskIds?.includes(community.id) || pinnedDeskIds?.includes(community.name))
  );

  const handleShareCommunity = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <>
      <div className="feed-column-container">
        {/* Community Header Banner */}
        <div className="community-page-header-card animate-fade-in">
          {/* Top colored strip banner */}
          <div
            className="community-page-banner-strip"
            style={{
              background: `linear-gradient(135deg, ${community.color || '#008751'}, #0f172a)`,
            }}
          />

          <div className="community-page-header-content">
            <div className="community-header-main-row">
              {/* Overlapping circle avatar */}
              <div
                className="community-header-avatar"
                style={{
                  backgroundColor: `${community.color || '#008751'}20`,
                  color: community.color || '#008751',
                  border: `3px solid ${community.color || '#008751'}`,
                }}
              >
                <Icon size={28} />
              </div>

              {/* Title, handle & stats */}
              <div className="community-header-info">
                <div className="community-title-row">
                  <h1 className="community-header-title">{community.name}</h1>
                  {community.isCanonical && (
                    <span className="community-verified-badge" title="Official Canonical Editorial Desk">
                      <ShieldCheck size={14} />
                      <span>Verified Desk</span>
                    </span>
                  )}
                </div>
                <div className="community-handle-row">
                  <span className="community-header-label">{community.label}</span>
                  <span className="community-dot-sep">•</span>
                  <span className="community-stats-meta">
                    <Users size={12} />
                    <span>{(community.membersCount || 1).toLocaleString()} members</span>
                  </span>
                  <span className="community-dot-sep">•</span>
                  <span className="community-online-meta">
                    <span className="online-green-dot" />
                    <span>{Math.max(1, Math.floor((community.membersCount || 1) * 0.12) + 8)} active</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: Join, Pin, Share */}
              <div className="community-header-actions">
                <button
                  type="button"
                  className={`btn-community-page-join ${isJoined ? 'joined' : 'join'}`}
                  onClick={() => onToggleJoinDesk && onToggleJoinDesk(community.id)}
                >
                  {isJoined ? (
                    <>
                      <Check size={14} />
                      <span>Joined</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Join</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={`btn-community-page-pin ${isPinned ? 'is-pinned' : ''}`}
                  onClick={() => onTogglePin && onTogglePin(community.id)}
                  title={isPinned ? 'Unpin community' : 'Pin community to sidebar'}
                >
                  <Star size={16} className={isPinned ? 'filled' : ''} />
                </button>

                <button
                  type="button"
                  className="btn-community-page-join"
                  style={{ backgroundColor: '#008751', color: '#fff', border: 'none', marginLeft: '0.25rem' }}
                  onClick={() => onOpenCreatePost && onOpenCreatePost(community)}
                >
                  <Plus size={14} />
                  <span>Create Post</span>
                </button>

                <button
                  type="button"
                  className="btn-community-page-share"
                  onClick={handleShareCommunity}
                  title="Copy link to community"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="community-header-desc">{community.description}</p>
          </div>
        </div>

        {/* Community Feed */}
        <MainFeed
          searchQuery={searchQuery}
          activeDesk={community.id}
          savedPosts={savedPosts}
          userDeskIds={userDeskIds}
          pinnedDeskIds={pinnedDeskIds}
          customCommunities={customCommunities}
          onToggleJoinDesk={onToggleJoinDesk}
          onToggleSave={onToggleSave}
          onOpenCreatePost={onOpenCreatePost}
          onArticleClick={() => {
            // Navigation to post details occurs first. Post is registered as recent on post details mount.
          }}
        />
      </div>

      {/* Right Sidebar tailored for this specific community */}
      <RightPanel
        mode="community"
        community={community}
        isJoined={isJoined}
        isPinned={isPinned}
        onToggleJoin={() => onToggleJoinDesk && onToggleJoinDesk(community.id)}
        onTogglePin={() => onTogglePin && onTogglePin(community.id)}
        recentPosts={recentPosts}
        onClearRecent={onClearRecent}
        savedPosts={savedPosts}
        canonicalDesks={canonicalDesks}
        onOpenCreatePost={() => onOpenCreatePost && onOpenCreatePost(community)}
        onSelectPost={(post) => {
          if (!post || !post.id) return;
          const clean = (post.deskSlug || post.desk || post.category || community?.id || 'feed')
            .replace(/^c\//, '')
            .replace(/^\//, '');
          navigate(`/c/${clean || 'feed'}/comments/${post.id}`, { state: { post } });
        }}
      />
    </>
  );
};

export default CommunityPage;
