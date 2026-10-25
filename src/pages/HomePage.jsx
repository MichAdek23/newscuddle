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
        onArticleClick={() => {
          // Navigation to post details occurs first. Post is registered as recent on post details mount.
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
          navigate(`/c/${clean || 'feed'}/comments/${post.id}`, { state: { post } });
        }}
        onAddNewPost={(newPost) => {
          if (!newPost || !newPost.id) return;
          const clean = (newPost.deskSlug || newPost.desk || newPost.category || 'feed')
            .replace(/^c\//, '')
            .replace(/^\//, '');
          navigate(`/c/${clean || 'feed'}/comments/${newPost.id}`, { state: { post: newPost } });
        }}
      />
    </>
  );
};

export default HomePage;
