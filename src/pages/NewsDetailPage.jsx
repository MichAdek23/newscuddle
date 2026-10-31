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
  ExternalLink,
  ArrowUpRight,
  MessageSquare,
} from 'lucide-react';
import { newsApi, feedApi, formatMediaUrl } from '../services/api';
import {
  formatNewsRelativeTime,
  normalizeUserNewsItem,
} from '../data/newsWireCatalog';
import ThreadedComments from '../components/comments/ThreadedComments';

export const NewsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const context = useOutletContext() || {};
  const { onRecordRecentView, onToggleSave } = context;

  // Resolve initial user-generated article if passed via router navigation state
  const initialArticle = useMemo(() => {
    const passed = location.state?.article;
    if (
      passed &&
      (passed.slug === id ||
        passed.id === id ||
        passed.articleCode === id)
    ) {
      return normalizeUserNewsItem(passed);
    }
    return null;
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

  // Fetch full user-generated article & related user stories from database
  useEffect(() => {
    let isMounted = true;
    const passedMatch = initialArticle;

    if (passedMatch) {
      setArticle(passedMatch);
      setHasLiked(Boolean(passedMatch.hasLiked));
      setLikesCount(passedMatch.likesCount || 0);
      setHasBookmarked(Boolean(passedMatch.hasBookmarked));
      setBookmarksCount(passedMatch.bookmarksCount || 0);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const loadArticleFromDb = async () => {
      try {
        const res = await newsApi.getArticle(id);
        if (!isMounted) return;
        if (res && res.article) {
          const normalized = normalizeUserNewsItem(res.article);
          setArticle(normalized);
          setHasLiked(Boolean(normalized.hasLiked));
          setLikesCount(normalized.likesCount || 0);
          setHasBookmarked(Boolean(normalized.hasBookmarked));
          setBookmarksCount(normalized.bookmarksCount || 0);
          if (Array.isArray(res.relatedArticles)) {
            setRelatedArticles(
              res.relatedArticles
                .filter(
                  (r) =>
                    r &&
                    r.title &&
                    !String(r.articleCode || '').startsWith('NW-2026-') &&
                    !String(r.articleCode || '').startsWith('NW-LIVE-')
                )
                .map(normalizeUserNewsItem)
                .filter(Boolean)
            );
          }
          setLoading(false);
          return;
        }
      } catch (_) {
        // Fallback to user-generated post detail endpoint if /api/v1/news/article is not mounted
      }

      try {
        const postRes = await feedApi.getPostDetail(id);
        if (!isMounted) return;
        const rawPost = postRes?.post || postRes?.item || null;
        if (rawPost) {
          const normalized = normalizeUserNewsItem(rawPost);
          setArticle(normalized);
          setHasLiked(Boolean(normalized.hasLiked));
          setLikesCount(normalized.likesCount || 0);
          setHasBookmarked(Boolean(normalized.hasBookmarked));
          setBookmarksCount(normalized.bookmarksCount || 0);
        }
      } catch (_) {
        // Keep passedMatch if available, otherwise null
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadArticleFromDb();

    return () => {
      isMounted = false;
    };
  }, [id, initialArticle]);

  // Record in recently viewed sidebar
  useEffect(() => {
    if (article && onRecordRecentView) {
      onRecordRecentView({
        id: article.slug || article.id,
        title: article.title,
        desk: article.categoryLabel || article.source || '',
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
        deskName: article.categoryLabel || article.source || '',
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
          title: article?.title || '',
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
          <div className="news-skeleton-img" style={{ height: '340px', borderRadius: '0px' }} />
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
          <p>The requested user-generated news article could not be found.</p>
          <button
            type="button"
            className="news-reset-btn"
            onClick={() => navigate('/news')}
          >
            Back to News
          </button>
        </div>
      </main>
    );
  }

  const heroImage = formatMediaUrl(article.imageUrl);

  const formattedPublishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

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
            {(article.categoryLabel || article.category) && (
              <Link
                to="/news"
                className="news-detail-category-pill"
                style={{ backgroundColor: article.categoryColor || '#008751' }}
              >
                {article.categoryLabel || article.category}
              </Link>
            )}
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
            {article.source && (
              <span className="news-detail-source-name">{article.source}</span>
            )}
            {article.dateline && (
              <>
                <span className="news-card-meta-dot">•</span>
                <span className="news-detail-dateline">{article.dateline}</span>
              </>
            )}
            {article.publishedAt && (
              <>
                {article.source && <span className="news-card-meta-dot">•</span>}
                <span className="news-detail-relative-time">
                  {formatNewsRelativeTime(article.publishedAt)}
                </span>
              </>
            )}
          </div>

          <h1 className="news-detail-title">{article.title}</h1>

          {(article.subtitle || article.excerpt) &&
            article.subtitle !== article.content && (
              <p className="news-detail-subtitle">
                {article.subtitle || article.excerpt}
              </p>
            )}

          {/* 3. Byline & Reader Action Bar */}
          <div className="news-detail-byline-bar">
            <div className="news-detail-author-box">
              <div className="news-detail-author-avatar">
                {(article.author || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                {article.author && (
                  <div className="news-detail-author-name">{article.author}</div>
                )}
                <div className="news-detail-author-meta">
                  {(article.authorRole || article.source) && (
                    <>
                      <span>{article.authorRole || article.source}</span>
                      <span className="news-card-meta-dot">•</span>
                    </>
                  )}
                  {formattedPublishedDate && (
                    <>
                      <span>{formattedPublishedDate}</span>
                      <span className="news-card-meta-dot">•</span>
                    </>
                  )}
                  <span className="news-detail-readtime">
                    <Clock size={13} />
                    {article.readTime || 1} min read
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

        {/* 4. Hero Image (Only when user uploaded/attached an image) */}
        {heroImage && (
          <figure className="news-detail-hero-figure">
            <div className="news-detail-hero-img-wrap">
              <img
                src={heroImage}
                alt={article.title}
                className="news-detail-hero-img"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            {article.imageCaption && (
              <figcaption className="news-detail-hero-caption">
                {article.imageCaption}
              </figcaption>
            )}
          </figure>
        )}

        {/* 5. Key Takeaways Box (Only if present on user article, without any sparkle icon) */}
        {Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0 && (
          <aside className="news-detail-takeaways-box" aria-label="Key Takeaways">
            <div className="news-detail-takeaways-header">
              <span>Key Takeaways</span>
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

        {/* External Source Link if provided by user */}
        {article.sourceUrl && (
          <div className="news-detail-source-link-box">
            <span>Source link:</span>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="news-detail-external-link"
            >
              <span>View original source</span>
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

      {/* 8. Related User-Generated News Articles */}
      {relatedArticles.length > 0 && (
        <section className="news-detail-related-section" aria-label="More News">
          <div className="news-detail-section-header">
            <h2>More User Stories</h2>
            <Link to="/news" className="news-detail-view-all-link">
              <span>View all stories</span>
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="news-related-grid">
            {relatedArticles.map((rel) => {
              const relImg = formatMediaUrl(rel.imageUrl);
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
                    {relImg ? (
                      <img
                        src={relImg}
                        alt={rel.title}
                        className="news-card-image"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="news-card-no-image">
                        <Newspaper size={24} />
                      </div>
                    )}
                    {(rel.categoryLabel || rel.category) && (
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
                    )}
                  </div>
                  <div className="news-card-body">
                    <div className="news-card-meta">
                      {rel.source && (
                        <>
                          <span className="news-card-source">{rel.source}</span>
                          <span className="news-card-meta-dot">•</span>
                        </>
                      )}
                      {rel.publishedAt && (
                        <span>{formatNewsRelativeTime(rel.publishedAt)}</span>
                      )}
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
