import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { commentApi } from '../../services/api';
import {
  MessageSquare,
  CornerDownRight,
  ChevronUp,
  ChevronDown,
  Share2,
  Check,
  Minus,
  Plus,
  Send,
} from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return 'just now';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CommentItem({
  comment,
  postId,
  onReplyAdded,
  currentUser,
  depth = 0,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [score, setScore] = useState(comment.score ?? ((comment.upvotes || 0) - (comment.downvotes || 0)) ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(Boolean(comment.hasUpvoted || comment.userDirection === 1));
  const [hasDownvoted, setHasDownvoted] = useState(Boolean(comment.hasDownvoted || comment.userDirection === -1));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setScore(comment.score ?? ((comment.upvotes || 0) - (comment.downvotes || 0)) ?? 0);
    setHasUpvoted(Boolean(comment.hasUpvoted || comment.userDirection === 1));
    setHasDownvoted(Boolean(comment.hasDownvoted || comment.userDirection === -1));
  }, [comment.id, comment.score, comment.hasUpvoted, comment.hasDownvoted, comment.userDirection, comment.upvotes, comment.downvotes]);

  const handleVote = async (direction) => {
    if (!currentUser) return;

    // Optimistic UI update
    const prevScore = score;
    const prevUp = hasUpvoted;
    const prevDown = hasDownvoted;

    let newUp = prevUp;
    let newDown = prevDown;
    let newScore = prevScore;

    if (direction === 1) {
      if (prevUp) {
        newUp = false;
        newScore -= 1;
      } else {
        newUp = true;
        newScore += prevDown ? 2 : 1;
        newDown = false;
      }
    } else if (direction === -1) {
      if (prevDown) {
        newDown = false;
        newScore += 1;
      } else {
        newDown = true;
        newScore -= prevUp ? 2 : 1;
        newUp = false;
      }
    }

    setScore(newScore);
    setHasUpvoted(newUp);
    setHasDownvoted(newDown);

    try {
      const res = await commentApi.voteComment({
        commentId: comment.id,
        direction,
      });
      if (res && res.success) {
        setScore(res.score);
        setHasUpvoted(res.userDirection === 1);
        setHasDownvoted(res.userDirection === -1);
      }
    } catch (e) {
      // Revert on error
      setScore(prevScore);
      setHasUpvoted(prevUp);
      setHasDownvoted(prevDown);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply) return;

    setSubmittingReply(true);
    try {
      const authorName = currentUser?.username || currentUser?.displayName || 'Community Member';
      const authorRole = currentUser?.role || 'Member';

      const res = await commentApi.createComment({
        postId,
        parentId: comment.id,
        content: replyText.trim(),
        author: authorName,
        authorRole,
      });

      if (res && res.success && res.comment) {
        setReplyText('');
        setIsReplying(false);
        if (onReplyAdded) {
          onReplyAdded(res.comment, comment.id);
        }
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleShareComment = () => {
    const permalink = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;
    navigator.clipboard?.writeText(permalink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = (comment.author || 'U')
    .slice(0, 2)
    .toUpperCase();

  const repliesCount = comment.replies?.length || 0;

  return (
    <div
      id={`comment-${comment.id}`}
      className={`comment-thread-node ${depth > 0 ? 'comment-nested' : ''}`}
      style={{ '--depth': Math.min(depth, 6) }}
    >
      <div className="comment-main-card">
        {/* Comment Header */}
        <div className="comment-header-row">
          <div className="comment-author-badge">
            <div className="comment-avatar-bubble">{initials}</div>
            <span className="comment-author-name">{comment.author}</span>
            {comment.authorRole && (
              <span className="comment-role-tag">{comment.authorRole}</span>
            )}
            <span className="comment-timestamp-dot">•</span>
            <span className="comment-timestamp">{formatRelativeTime(comment.createdAt)}</span>
          </div>

          <button
            type="button"
            className="comment-collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand thread' : 'Collapse thread'}
            aria-label={isCollapsed ? 'Expand thread' : 'Collapse thread'}
          >
            {isCollapsed ? <Plus size={13} /> : <Minus size={13} />}
            {isCollapsed && repliesCount > 0 && (
              <span className="collapsed-count">({repliesCount + 1})</span>
            )}
          </button>
        </div>

        {/* Comment Body */}
        {!isCollapsed && (
          <>
            <div className="comment-body-text">{comment.content}</div>

            {/* Comment Actions Toolbar */}
            <div className="comment-actions-bar">
              {/* Vote pill */}
              <div className="comment-vote-pill">
                <button
                  type="button"
                  className={`vote-btn upvote ${hasUpvoted ? 'active' : ''}`}
                  onClick={() => handleVote(1)}
                  title="Upvote"
                  aria-label="Upvote comment"
                >
                  <ChevronUp size={16} />
                </button>
                <span className={`vote-score ${hasUpvoted ? 'active-up' : ''} ${hasDownvoted ? 'active-down' : ''}`}>
                  {score}
                </span>
                <button
                  type="button"
                  className={`vote-btn downvote ${hasDownvoted ? 'active' : ''}`}
                  onClick={() => handleVote(-1)}
                  title="Downvote"
                  aria-label="Downvote comment"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Reply toggle */}
              <button
                type="button"
                className="comment-action-pill reply-pill"
                onClick={() => setIsReplying(!isReplying)}
              >
                <CornerDownRight size={14} />
                <span>Reply</span>
              </button>

              {/* Share */}
              <button
                type="button"
                className="comment-action-pill share-pill"
                onClick={handleShareComment}
                title="Copy link to comment"
              >
                {copied ? <Check size={14} color="#008751" /> : <Share2 size={14} />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>

            {/* Inline Reply Form */}
            {isReplying && (
              <form className="comment-inline-reply-box" onSubmit={handleSendReply}>
                <div className="reply-input-wrapper">
                  <textarea
                    rows={2}
                    placeholder={`Reply to ${comment.author}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    autoFocus
                    className="comment-textarea reply-textarea"
                  />
                  <div className="reply-btn-row">
                    <button
                      type="button"
                      className="reply-cancel-btn"
                      onClick={() => setIsReplying(false)}
                      disabled={submittingReply}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="reply-submit-btn"
                      disabled={!replyText.trim() || submittingReply}
                    >
                      {submittingReply ? 'Posting...' : 'Reply'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Nested Replies with Vertical Guide Line */}
      {!isCollapsed && repliesCount > 0 && (
        <div className="comment-replies-container">
          <div className="comment-thread-guideline" />
          <div className="comment-replies-list">
            {comment.replies.map((childReply) => (
              <CommentItem
                key={childReply.id}
                comment={childReply}
                postId={postId}
                onReplyAdded={onReplyAdded}
                currentUser={currentUser}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThreadedComments({ postId, initialCount = 0 }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingRoot, setSubmittingRoot] = useState(false);
  const [sortBy, setSortBy] = useState('top'); // 'top' | 'newest'

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const res = await commentApi.getComments(postId);
      if (res && res.success) {
        setComments(res.comments || []);
        if (res.total !== undefined) {
          setTotalCount(res.total);
        }
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Recursively append reply to matching node in tree
  const appendReplyToTree = (nodeList, newReply, parentId) => {
    return nodeList.map((node) => {
      if (node.id === parentId) {
        return {
          ...node,
          replies: [...(node.replies || []), newReply],
          repliesCount: (node.repliesCount || 0) + 1,
        };
      }
      if (node.replies && node.replies.length > 0) {
        return {
          ...node,
          replies: appendReplyToTree(node.replies, newReply, parentId),
        };
      }
      return node;
    });
  };

  const handleReplyAdded = (newReply, parentId) => {
    setComments((prev) => appendReplyToTree(prev, newReply, parentId));
    setTotalCount((prev) => prev + 1);
  };

  const handlePostRootComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || submittingRoot) return;

    setSubmittingRoot(true);
    try {
      const authorName = user?.username || user?.displayName || 'Community Member';
      const authorRole = user?.role || 'Member';

      const res = await commentApi.createComment({
        postId,
        parentId: '',
        content: newCommentText.trim(),
        author: authorName,
        authorRole,
      });

      if (res && res.success && res.comment) {
        setNewCommentText('');
        // Append root comment to top of list
        setComments((prev) => [res.comment, ...prev]);
        setTotalCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingRoot(false);
    }
  };

  // Sort top-level comments
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    // Default 'top': highest score first
    return (b.score || 0) - (a.score || 0);
  });

  return (
    <section className="threaded-comments-container">
      {/* Top Header */}
      <div className="comments-section-header">
        <div className="comments-title-wrap">
          <MessageSquare className="comments-header-icon" size={18} />
          <h3 className="comments-section-title">
            Discussion <span className="comments-badge">({totalCount})</span>
          </h3>
        </div>

        <div className="comments-sort-wrap">
          <span className="sort-label">Sort by:</span>
          <button
            type="button"
            className={`sort-tab ${sortBy === 'top' ? 'active' : ''}`}
            onClick={() => setSortBy('top')}
          >
            Top
          </button>
          <button
            type="button"
            className={`sort-tab ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => setSortBy('newest')}
          >
            Newest
          </button>
        </div>
      </div>

      {/* Root Comment Creator Box */}
      <form className="root-comment-composer" onSubmit={handlePostRootComment}>
        <div className="composer-header">
          <div className="composer-author-info">
            <div className="composer-avatar">
              {(user?.username || user?.displayName || 'U').slice(0, 2).toUpperCase()}
            </div>
            <span className="composer-user-label">
              Comment as <strong className="brand-accent">@{user?.username || 'member'}</strong>
            </span>
          </div>
        </div>

        <div className="composer-input-area">
          <textarea
            rows={3}
            placeholder="What are your thoughts on this analysis?"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            className="comment-textarea root-textarea"
          />
        </div>

        <div className="composer-footer">
          <span className="composer-hint">Markdown formatting supported</span>
          <button
            type="submit"
            className="comment-submit-btn"
            disabled={!newCommentText.trim() || submittingRoot}
          >
            <Send size={14} />
            <span>{submittingRoot ? 'Posting...' : 'Comment'}</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="comments-tree-wrapper">
        {loading ? (
          <div className="comments-loading-state">
            <div className="comment-skeleton-line short" />
            <div className="comment-skeleton-line long" />
            <div className="comment-skeleton-line medium" />
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="comments-empty-state">
            <div className="empty-bubble-icon">
              <MessageSquare size={26} />
            </div>
            <h4 className="empty-title">No comments yet</h4>
            <p className="empty-sub">Be the first to share your institutional insight or perspective.</p>
          </div>
        ) : (
          <div className="comments-nodes-list">
            {sortedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplyAdded={handleReplyAdded}
                currentUser={user}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
