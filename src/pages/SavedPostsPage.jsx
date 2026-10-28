import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { feedApi } from '../services/api';
import PostMediaImage from '../components/common/PostMediaImage';
import UserHoverCard from '../components/common/UserHoverCard';
import {
  Bookmark,
  Search,
  Flame,
  MessageSquare,
  Share2,
  Trash2,
  SlidersHorizontal,
  ArrowRight,
  ExternalLink,
  Check,
  RefreshCw,
} from 'lucide-react';

export const SavedPostsPage = () => {
  const navigate = useNavigate();
  const context = useOutletContext() || {};

  const {
    savedPosts: contextSavedPosts = [],
    onToggleSave,
    onRecordRecentView,
  } = context;

  const [dbSavedPosts, setDbSavedPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Fetch saved posts directly from MongoDB Atlas backend
  const fetchSavedFromDB = () => {
    setIsLoading(true);
    feedApi
      .getSavedPosts()
      .then((res) => {
        if (res?.success && Array.isArray(res.items)) {
          setDbSavedPosts(res.items);
        } else {
          setDbSavedPosts([]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load saved posts from database, using cached:', err);
        setDbSavedPosts(contextSavedPosts || []);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchSavedFromDB();
  }, []);

  // Merge context saved list with DB saved items
  const combinedSavedPosts = useMemo(() => {
    // If we have full items from DB, use them
    if (dbSavedPosts.length > 0) return dbSavedPosts;
    // Otherwise fallback to context objects if they have full post data
    return (contextSavedPosts || []).filter((p) => p && typeof p === 'object' && p.title);
  }, [dbSavedPosts, contextSavedPosts]);

  // Filter posts by query
  const filteredPosts = useMemo(() => {
    if (!filterQuery.trim()) return combinedSavedPosts;
    const q = filterQuery.toLowerCase();
    return combinedSavedPosts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.summary?.toLowerCase().includes(q) ||
        p.author?.toLowerCase().includes(q) ||
        p.deskName?.toLowerCase().includes(q)
    );
  }, [combinedSavedPosts, filterQuery]);

  const handleUnsave = (post, e) => {
    e.stopPropagation();
    if (onToggleSave) {
      onToggleSave(post.id, post);
    }
    setDbSavedPosts((prev) => prev.filter((p) => p.id !== post.id));
    showToast('Post removed from saved collection');
  };

  return (
    <main className="reddit-main-feed saved-posts-feed animate-fade-in" aria-label="Saved Posts Collection">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="feed-floating-toast animate-fade-in">
          <Check size={16} color="#008751" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= 1. HEADER BANNER ================= */}
      <div className="reddit-route-header-banner" style={{ marginBottom: '1.25rem' }}>
        <div className="route-banner-icon-badge" style={{ background: '#e6f6ee', color: '#008751', border: '1px solid #bbf7d0' }}>
          <Bookmark size={22} />
        </div>
        <div className="route-banner-content">
          <div className="route-banner-tag-row">
            <span className="route-banner-tag">LIBRARY & BOOKMARKS</span>
            <span className="route-banner-subtag">• {combinedSavedPosts.length} saved</span>
          </div>
          <h1 className="route-banner-title">Saved Posts</h1>
          <p className="route-banner-description">
            Articles, editorial analyses, and community discussions you have bookmarked for ongoing reference.
          </p>
        </div>
      </div>

      {/* Search & Refresh Filter Bar */}
      {combinedSavedPosts.length > 0 && (
        <div className="saved-filter-bar">
          <div className="saved-search-input-wrap">
            <Search size={15} className="saved-search-icon" />
            <input
              type="text"
              placeholder="Search in saved posts..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="saved-search-field"
            />
          </div>
          <button
            type="button"
            className="feed-refresh-btn"
            onClick={fetchSavedFromDB}
            title="Refresh saved collection"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      )}

      {/* ================= 2. SAVED POSTS STREAM ================= */}
      {isLoading ? (
        <div className="reddit-posts-stream">
          {[1, 2, 3].map((i) => (
            <div key={`saved-skel-${i}`} className="skeleton-card">
              <div className="skeleton-header">
                <div className="skeleton-box skeleton-avatar" />
                <div className="skeleton-box skeleton-meta" />
              </div>
              <div className="skeleton-box skeleton-title" />
              <div className="skeleton-box skeleton-text-1" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="reddit-posts-stream">
          {filteredPosts.map((post) => {
            const postDetailPath = `/post/${post.postCode || post.id}`;

            return (
              <article
                key={post.id}
                className="reddit-post-card cursor-pointer animate-fade-in"
                onClick={(e) => {
                  if (e.target.closest('button') || e.target.closest('a')) return;
                  if (onRecordRecentView) onRecordRecentView(post);
                  navigate(postDetailPath, { state: { post } });
                }}
              >
                {/* Post Header */}
                <div className="reddit-post-header">
                  <div className="post-header-left">
                    <div
                      className="community-badge-icon"
                      style={{
                        backgroundColor: `${post.deskColor || '#008751'}20`,
                        color: post.deskColor || '#008751',
                      }}
                    >
                      {(post.deskName || post.category || 'C').charAt(0).toUpperCase()}
                    </div>
                    <span className="community-name-link">
                      {post.deskSlug ? (post.deskSlug.startsWith('c/') ? post.deskSlug : `c/${post.deskSlug}`) : (post.category ? `c/${post.category}` : 'c/feed')}
                    </span>
                    <span className="post-meta-dot">•</span>
                    <span className="post-meta-author">
                      Posted by{' '}
                      <UserHoverCard username={post.author || 'member'}>
                        <span
                          className="user-author-link"
                          style={{ cursor: 'pointer', fontWeight: 600, color: '#0f172a' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/u/${post.author || 'member'}`);
                          }}
                        >
                          u/{post.author || 'member'}
                        </span>
                      </UserHoverCard>
                    </span>
                    <span className="post-meta-dot">•</span>
                    <span className="post-meta-time">
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'Saved'}
                    </span>
                  </div>

                  <div className="post-header-right">
                    <button
                      type="button"
                      className="saved-remove-btn"
                      onClick={(e) => handleUnsave(post, e)}
                      title="Remove from saved collection"
                    >
                      <Trash2 size={15} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

                {/* Post Title */}
                <h2 className="reddit-post-title">{post.title}</h2>
                {post.summary && <p className="reddit-post-summary">{post.summary}</p>}

                {/* Media Image */}
                {post.hasMedia && post.mediaUrl && (
                  <div className="reddit-post-media-wrap">
                    <PostMediaImage
                      mediaUrl={post.mediaUrl}
                      alt={post.title}
                      className="reddit-post-img"
                    />
                  </div>
                )}

                {/* Post Footer */}
                <div className="reddit-post-footer">
                  <div className="post-action-pill vote-pill">
                    <Flame size={16} color="#008751" />
                    <span className="vote-count">{post.upvotes || 0}</span>
                  </div>

                  <div className="post-action-pill comment-pill">
                    <MessageSquare size={16} />
                    <span>{post.commentsCount || 0} comments</span>
                  </div>

                  <button
                    type="button"
                    className="post-action-pill saved"
                    onClick={(e) => handleUnsave(post, e)}
                    title="Saved (click to unsave)"
                  >
                    <Bookmark size={16} className="fill-current" />
                    <span>Saved</span>
                  </button>

                  <button
                    type="button"
                    className="post-action-pill"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = `${window.location.origin}/post/${post.postCode || post.id}`;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(url);
                        showToast('Article link copied to clipboard!');
                      }
                    }}
                  >
                    <Share2 size={16} />
                    <span>Share</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="saved-empty-card">
          <div className="saved-empty-icon-wrap">
            <Bookmark size={32} />
          </div>
          <h3 className="saved-empty-title">
            {filterQuery ? 'No Matching Saved Posts' : 'No Saved Posts Yet'}
          </h3>
          <p className="saved-empty-text">
            {filterQuery
              ? `No saved articles matching "${filterQuery}". Clear the search to view all saved items.`
              : 'When you bookmark reporting or intelligence posts across NewsCuddle, they will be organized here for quick reference.'}
          </p>
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem' }}>
            {filterQuery ? (
              <button
                type="button"
                className="btn-profile-secondary"
                onClick={() => setFilterQuery('')}
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                className="btn-profile-primary"
                onClick={() => navigate('/popular')}
              >
                <span>Browse Popular Stories</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default SavedPostsPage;
