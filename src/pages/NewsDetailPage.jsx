import React, { useState, useEffect, useMemo } from 'react';
import {
  useParams,
  useNavigate,
  useLocation,
  useOutletContext,
  Link,
} from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Bookmark,
  Share2,
  Check,
  ThumbsUp,
  Newspaper,
  Sparkles,
  ExternalLink,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react';
import { newsApi, formatMediaUrl } from '../services/api';
import {
  FALLBACK_NEWS_ARTICLES,
  findFallbackArticle,
  formatNewsRelativeTime,
} from '../data/newsWireCatalog';
import ThreadedComments from '../components/comments/ThreadedComments';

export const NewsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const context = useOutletContext() || {};
  const { onRecordRecentView, onToggleSave } = context;

  // Immediate article resolution from router state or local catalog
  const initialArticle = useMemo(() => {
    const passed = location.state?.article;
    if (
      passed &&
      (passed.slug === id ||
        passed.id === id ||
        passed.articleCode === id)
    ) {
      return passed;
    }
    return findFallbackArticle(id);
  }, [id, location.state]);

  const [article, setArticle] = useState(initialArticle);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [loading, setLoading] = useState(!initialArticle);
  const [hasLiked, setHasLiked] = useState(Boolean(initialArticle?.hasLiked));
  const [likesCount, setLikesCount] = useState(initialArticle?.likesCount || 0);
  const [hasBookmarked, setHasBookmarked] = useState(
    Boolean(initialArticle?.hasBookmarked)
  );
  const [bookmarksCount, setBookmarksCount] = useState(
    initialArticle?.bookmarksCount || 0
  );
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch full article & related stories from backend News Engine (with fallback)
  useEffect(() => {
    let isMounted = true;
    const localMatch = findFallbackArticle(id) || location.state?.article || null;

    if (localMatch) {
      setArticle(localMatch);
      setLikesCount(localMatch.likesCount || 0);
      setBookmarksCount(localMatch.bookmarksCount || 0);
      setLoading(false);
    } else {
      setLoading(true);
    }

    newsApi
      .getArticle(id)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.article) {
          setArticle(res.article);
          setHasLiked(Boolean(res.article.hasLiked));
          setLikesCount(res.article.likesCount || 0);
          setHasBookmarked(Boolean(res.article.hasBookmarked));
          setBookmarksCount(res.article.bookmarksCount || 0);
          if (Array.isArray(res.relatedArticles) && res.relatedArticles.length > 0) {
            setRelatedArticles(res.relatedArticles);
          }
        }
      })
      .catch(() => {
        if (!isMounted) return;
        if (localMatch) {
          setArticle(localMatch);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, location.state]);

  // Compute fallback related articles if backend didn't return any
  const effectiveRelated = useMemo(() => {
    if (relatedArticles && relatedArticles.length > 0) {
      return relatedArticles;
    }
    if (!article) return FALLBACK_NEWS_ARTICLES.slice(0, 3);
    const sameCategory = FALLBACK_NEWS_ARTICLES.filter(
      (a) =>
        a.slug !== article.slug &&
        a.id !== article.id &&
        a.category === article.category
    );
    const others = FALLBACK_NEWS_ARTICLES.filter(
      (a) =>
        a.slug !== article.slug &&
        a.id !== article.id &&
        a.category !== article.category
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [relatedArticles, article]);

  // Record in recently viewed sidebar
  useEffect(() => {
    if (article && onRecordRecentView) {
      onRecordRecentView({
        id: article.slug || article.id,
        title: article.title,
        desk: article.categoryLabel || 'News Wire',
        upvotes: article.likesCount || 0,
        commentsCount: article.commentsCount || 0,
        isNewsArticle: true,
      });
    }
  }, [article, onRecordRecentView]);

  // Split full article body into clean paragraphs
  const paragraphs = useMemo(() => {
    if (!article) return [];
    const raw = article.content || article.excerpt || '';
    return raw
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [article]);

  const handleToggleLike = async () => {
    if (!article) return;
    const nextLiked = !hasLiked;
    setHasLiked(nextLiked);
    setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    try {
      const res = await newsApi.toggleLike(article.id || article.slug);
      if (res && typeof res.likesCount === 'number') {
        setHasLiked(Boolean(res.hasLiked));
        setLikesCount(res.likesCount);
      }
    } catch (_) {
      // Optimistic state retained
    }
  };

  const handleToggleBookmark = async () => {
    if (!article) return;
    const nextBookmarked = !hasBookmarked;
    setHasBookmarked(nextBookmarked);
    setBookmarksCount((prev) => Math.max(0, prev + (nextBookmarked ? 1 : -1)));

    if (onToggleSave) {
      onToggleSave(article.id || article.slug, {
        id: article.id || article.slug,
        title: article.title,
        summary: article.excerpt,
        deskName: article.categoryLabel || 'News Wire',
        author: article.author,
        imageUrl: article.imageUrl,
        createdAt: article.publishedAt,
      });
    }

    try {
      const res = await newsApi.toggleBookmark(article.id || article.slug);
      if (res && typeof res.bookmarksCount === 'number') {
        setHasBookmarked(Boolean(res.hasBookmarked));
        setBookmarksCount(res.bookmarksCount);
      }
    } catch (_) {
      // Optimistic state retained
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title || 'NewsCuddle Wire',
          text: article?.excerpt || '',
          url: shareUrl,
        });
        return;
      } catch (_) {}
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_) {}
  };

  if (loading && !article) {
    return (
      <main className="news-detail-page-container">
        <div className="news-detail-loading">
          <div className="news-skeleton-line short" />
          <div className="news-skeleton-line title" />
          <div className="news-skeleton-img" style={{ height: '340px', borderRadius: '14px' }} />
          <div className="news-skeleton-line" />
          <div className="news-skeleton-line" />
          <div className="news-skeleton-line" />
        </div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="news-detail-page-container">
        <div className="news-empty-state">
          <Newspaper size={40} />
          <h3>Article Not Found</h3>
          <p>The requested news dispatch could not be located or may have been archived.</p>
          <button
            type="button"
            className="news-reset-btn"
            onClick={() => navigate('/news')}
          >
            Back to News Wire
          </button>
        </div>
      </main>
    );
  }

  const heroImage =
    formatMediaUrl(article.imageUrl) ||
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=85';

  const formattedPublishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Published today';

  return (
    <main className="news-detail-page-container">
      <div className="news-detail-article-flow">
        {/* 1. Top Breadcrumb & Back Navigation */}
        <div className="news-detail-top-bar">
          <button
            type="button"
            className="news-detail-back-btn"
            onClick={() => navigate('/news')}
          >
            <ArrowLeft size={16} />
            <span>Back to News</span>
          </button>

          <div className="news-detail-top-badges">
            <Link
              to={`/news?category=${encodeURIComponent(article.category || 'all')}`}
              className="news-detail-category-pill"
              style={{ backgroundColor: article.categoryColor || '#008751' }}
            >
              {article.categoryLabel || article.category || 'News Wire'}
            </Link>
            {article.isBreaking && (
              <span className="news-card-breaking-badge">BREAKING</span>
            )}
            {article.articleCode && (
              <span className="news-detail-code-badge">{article.articleCode}</span>
            )}
          </div>
        </div>

        {/* 2. Headline & Editorial Deck */}
        <header className="news-detail-header">
          <div className="news-detail-source-row">
            <span className="news-detail-source-name">
              {article.source || 'NewsCuddle Wire'}
            </span>
            {article.dateline && (
              <>
                <span className="news-card-meta-dot">•</span>
                <span className="news-detail-dateline">{article.dateline}</span>
              </>
            )}
            <span className="news-card-meta-dot">•</span>
            <span className="news-detail-relative-time">
              {formatNewsRelativeTime(article.publishedAt)}
            </span>
          </div>

          <h1 className="news-detail-title">{article.title}</h1>

          {(article.subtitle || article.excerpt) && (
            <p className="news-detail-subtitle">
              {article.subtitle || article.excerpt}
            </p>
          )}

          {/* 3. Byline & Reader Action Bar */}
          <div className="news-detail-byline-bar">
            <div className="news-detail-author-box">
              <div className="news-detail-author-avatar">
                {(article.author || 'N').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="news-detail-author-name">
                  {article.author || 'Wire Desk Correspondent'}
                </div>
                <div className="news-detail-author-meta">
                  <span>{article.authorRole || article.source || 'Editorial Desk'}</span>
                  <span className="news-card-meta-dot">•</span>
                  <span>{formattedPublishedDate}</span>
                  <span className="news-card-meta-dot">•</span>
                  <span className="news-detail-readtime">
                    <Clock size={13} />
                    {article.readTime || 5} min read
                  </span>
                </div>
              </div>
            </div>

            <div className="news-detail-action-buttons">
              <button
                type="button"
                className={`news-detail-action-btn ${hasLiked ? 'active' : ''}`}
                onClick={handleToggleLike}
                title="Recommend this story"
              >
                <ThumbsUp size={15} />
                <span>{likesCount}</span>
              </button>

              <button
                type="button"
                className={`news-detail-action-btn ${hasBookmarked ? 'active' : ''}`}
                onClick={handleToggleBookmark}
                title="Bookmark story"
              >
                <Bookmark size={15} />
                <span>{hasBookmarked ? 'Saved' : bookmarksCount || 'Save'}</span>
              </button>

              <button
                type="button"
                className="news-detail-action-btn"
                onClick={handleShare}
                title="Share story link"
              >
                {copiedLink ? <Check size={15} /> : <Share2 size={15} />}
                <span>{copiedLink ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* 4. Hero Editorial Image */}
        <figure className="news-detail-hero-figure">
          <div className="news-detail-hero-img-wrap">
            <img
              src={heroImage}
              alt={article.title}
              className="news-detail-hero-img"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=85';
              }}
            />
          </div>
          {article.imageCaption && (
            <figcaption className="news-detail-hero-caption">
              {article.imageCaption}
            </figcaption>
          )}
        </figure>

        {/* 5. Executive Key Takeaways Box */}
        {Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0 && (
          <aside className="news-detail-takeaways-box" aria-label="Key Takeaways">
            <div className="news-detail-takeaways-header">
              <Sparkles size={16} />
              <span>Executive Summary & Key Takeaways</span>
            </div>
            <ul className="news-detail-takeaways-list">
              {article.keyTakeaways.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </aside>
        )}

        {/* 6. Full Article Content Body */}
        <div className="news-detail-article-body">
          {paragraphs.map((para, index) => (
            <p
              key={index}
              className={index === 0 ? 'news-detail-lead-paragraph' : 'news-detail-paragraph'}
            >
              {para}
            </p>
          ))}
        </div>

        {/* External Source Link if syndicated */}
        {article.sourceUrl && (
          <div className="news-detail-source-link-box">
            <span>Syndicated dispatch via {article.source}:</span>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="news-detail-external-link"
            >
              <span>View original wire source</span>
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {/* 7. Topic Pills */}
        {Array.isArray(article.topics) && article.topics.length > 0 && (
          <div className="news-detail-topics-row">
            <span className="news-detail-topics-label">Filed Under:</span>
            <div className="news-detail-topics-list">
              {article.topics.map((topic) => (
                <Link
                  key={topic}
                  to="/news"
                  className="news-detail-topic-tag"
                >
                  #{String(topic).replace(/^#/, '')}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 8. Related News Articles */}
      {effectiveRelated.length > 0 && (
        <section className="news-detail-related-section" aria-label="More News">
          <div className="news-detail-section-header">
            <h2>More from NewsCuddle Wire</h2>
            <Link to="/news" className="news-detail-view-all-link">
              <span>View all stories</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="news-related-grid">
            {effectiveRelated.map((rel) => {
              const relImg =
                formatMediaUrl(rel.imageUrl) ||
                'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80';
              return (
                <article
                  key={rel.id || rel.slug}
                  className="news-article-card compact"
                  onClick={() =>
                    navigate(`/news/${encodeURIComponent(rel.slug || rel.id)}`, {
                      state: { article: rel },
                    })
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/news/${encodeURIComponent(rel.slug || rel.id)}`, {
                        state: { article: rel },
                      });
                    }
                  }}
                >
                  <div className="news-card-image-wrap">
                    <img
                      src={relImg}
                      alt={rel.title}
                      className="news-card-image"
                      loading="lazy"
                    />
                    <div className="news-card-badges">
                      <span
                        className="news-card-category-badge"
                        style={{
                          backgroundColor: rel.categoryColor || '#008751',
                        }}
                      >
                        {rel.categoryLabel || rel.category}
                      </span>
                    </div>
                  </div>
                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span className="news-card-source">{rel.source}</span>
                      <span className="news-card-meta-dot">•</span>
                      <span>{formatNewsRelativeTime(rel.publishedAt)}</span>
                    </div>
                    <h3 className="news-card-title">{rel.title}</h3>
                    <p className="news-card-excerpt">{rel.excerpt}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 9. Reader Discussion / Threaded Comments */}
      {article.id && /^[0-9a-fA-F]{24}$/.test(String(article.id)) && (
        <section className="news-detail-comments-section">
          <div className="news-detail-comments-header">
            <MessageSquare size={18} />
            <h2>Reader Discussion</h2>
          </div>
          <ThreadedComments postId={article.id} />
        </section>
      )}
    </main>
  );
};

export default NewsDetailPage;

