import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Newspaper, ShieldCheck } from 'lucide-react';
import { MainFeed } from '../components/home/MainFeed';
import { RightPanel } from '../components/home/RightPanel';

export const NewsPage = () => {
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
        {/* News Feed Header Banner */}
        <div className="reddit-route-header-banner news-route-banner animate-fade-in">
          <div className="route-banner-icon-badge news-badge">
            <Newspaper size={22} />
          </div>
          <div className="route-banner-content">
            <div className="route-banner-tag-row">
              <span className="route-banner-tag">Verified Editorial Wire</span>
              <span className="route-banner-subtag">• Primary Sources</span>
            </div>
            <h1 className="route-banner-title">Editorial News Wire</h1>
            <p className="route-banner-description">
              Strictly primary sources, verified government releases, and institutional terminal reporting across global capitals.
            </p>
          </div>
        </div>

        <MainFeed
          searchQuery={searchQuery}
          activeFeed="news"
          initialSort="New"
          savedPosts={savedPosts}
          userDeskIds={userDeskIds}
          pinnedDeskIds={pinnedDeskIds}
          customCommunities={customCommunities}
          onToggleJoinDesk={onToggleJoinDesk}
          onToggleSave={onToggleSave}
          onArticleClick={(post) => {
            if (onRecordRecentView && post) onRecordRecentView(post);
          }}
        />
      </div>

      <RightPanel
        mode="news"
        recentPosts={recentPosts}
        onClearRecent={onClearRecent}
        savedPosts={savedPosts}
        canonicalDesks={canonicalDesks}
        onSelectPost={(post) => {
          if (!post || !post.id) return;
          const target = post.postCode || post.id;
          navigate(`/post/${target}`, { state: { post } });
        }}
      />
    </>
  );
};

export default NewsPage;
