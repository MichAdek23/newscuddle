import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import { MainFeed } from '../components/home/MainFeed';
import { RightPanel } from '../components/home/RightPanel';

export const PopularPage = () => {
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
  } = context;

  return (
    <>
      <div className="feed-column-container">
        {/* Popular Feed Header Banner */}
        <div className="reddit-route-header-banner popular-route-banner animate-fade-in">
          <div className="route-banner-icon-badge popular-badge">
            <Flame size={22} />
          </div>
          <div className="route-banner-content">
            <div className="route-banner-tag-row">
              <span className="route-banner-tag">Global Trend Velocity</span>
              <span className="route-banner-subtag">• Real-Time Signals</span>
            </div>
            <h1 className="route-banner-title">Popular Wire</h1>
            <p className="route-banner-description">
              The highest velocity editorial reporting and community discussions across all desks in the past 24 hours.
            </p>
          </div>
        </div>

        <MainFeed
          searchQuery={searchQuery}
          activeFeed="popular"
          initialSort="Hot"
          savedPosts={savedPosts}
          userDeskIds={userDeskIds}
          pinnedDeskIds={pinnedDeskIds}
          customCommunities={customCommunities}
          onToggleJoinDesk={onToggleJoinDesk}
          onToggleSave={onToggleSave}
          onArticleClick={() => {
            // Navigation to post details occurs first. Post is registered as recent on post details mount.
          }}
        />
      </div>

      <RightPanel
        mode="popular"
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

export default PopularPage;
