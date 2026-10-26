import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { MainFeed } from '../components/home/MainFeed';
import { RightPanel } from '../components/home/RightPanel';

export const HomePage = () => {
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

  return (
    <>
      <MainFeed
        searchQuery={searchQuery}
        activeFeed="home"
        savedPosts={savedPosts}
        userDeskIds={userDeskIds}
        pinnedDeskIds={pinnedDeskIds}
        customCommunities={customCommunities}
        onToggleJoinDesk={onToggleJoinDesk}
        onToggleSave={onToggleSave}
        onOpenCreatePost={onOpenCreatePost}
        onArticleClick={(post) => {
          if (onRecordRecentView && post) {
            onRecordRecentView(post);
          }
        }}
      />
      <RightPanel
        mode="home"
        recentPosts={recentPosts}
        onClearRecent={onClearRecent}
        savedPosts={savedPosts}
        canonicalDesks={canonicalDesks}
        onOpenCreatePost={onOpenCreatePost}
        onSelectPost={(post) => {
          if (!post || !post.id) return;
          const clean = (post.deskSlug || post.desk || post.category || 'feed')
            .replace(/^c\//, '')
            .replace(/^\//, '');
          const path = clean.startsWith('u/')
            ? `/${clean}/comments/${post.id}`
            : `/c/${clean || 'feed'}/comments/${post.id}`;
          navigate(path, { state: { post } });
        }}
        onAddNewPost={(newPost) => {
          if (!newPost || !newPost.id) return;
          const clean = (newPost.deskSlug || newPost.desk || newPost.category || 'feed')
            .replace(/^c\//, '')
            .replace(/^\//, '');
          const path = clean.startsWith('u/')
            ? `/${clean}/comments/${newPost.id}`
            : `/c/${clean || 'feed'}/comments/${newPost.id}`;
          navigate(path, { state: { post: newPost } });
        }}
      />
    </>
  );
};

export default HomePage;
