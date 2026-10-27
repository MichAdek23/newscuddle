import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
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
          onArticleClick={(post) => {
            if (onRecordRecentView && post) onRecordRecentView(post);
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
          const target = post.postCode || post.id;
          navigate(`/post/${target}`, { state: { post } });
        }}
      />
    </>
  );
};

export default PopularPage;
