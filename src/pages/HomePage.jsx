import React from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { MainFeed } from '../components/home/MainFeed';
import { RightPanel } from '../components/home/RightPanel';

export const HomePage = () => {
  const context = useOutletContext() || {};
  const navigate = useNavigate();
  const location = useLocation();

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
        key={`${location.pathname}-${location.state?.reloadFeed || 'init'}`}
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
          const target = post.postCode || post.id;
          navigate(`/post/${target}`, { state: { post } });
        }}
        onAddNewPost={(newPost) => {
          if (!newPost || !newPost.id) return;
          const target = newPost.postCode || newPost.id;
          navigate(`/post/${target}`, { state: { post: newPost } });
        }}
      />
    </>
  );
};

export default HomePage;
