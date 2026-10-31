import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Newspaper,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { newsApi, feedApi, formatMediaUrl } from '../services/api';
import {
  formatNewsRelativeTime,
  normalizeUserNewsItem,
} from '../data/newsWireCatalog';

export const NewsPage = () => {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { searchQuery = '', onRecordRecentView } = context;

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const effectiveSearch = (searchQuery || '').trim();

  const fetchNewsWire = useCallback(async () => {
    setLoading(true);
    try {
      const res = await newsApi.getNews({
        category: 'all',
        sort: 'recommended',
        search: effectiveSearch,
        page: 1,
        limit: 36,
      });

      if (res && Array.isArray(res.articles)) {
        const cleaned = res.articles
          .filter(
            (a) =>
              a &&
              a.title &&
              !String(a.articleCode || '').startsWith('NW-2026-') &&
              !String(a.articleCode || '').startsWith('NW-LIVE-')
          )
          .map(normalizeUserNewsItem)
          .filter(Boolean);
        setArticles(cleaned);
        return;
      }
    } catch (_) {
      // If /api/v1/news is not yet active on the running backend process,
      // load user-generated articles directly from the live database feed endpoint.
    }

    try {
      const feedRes = await feedApi.getFeed({
        sort: 'best',
        page: 1,
        limit: 36,
      });
      if (feedRes && Array.isArray(feedRes.items)) {
        const mapped = feedRes.items
          .filter((item) => item && item.title && !item.isDeleted)
          .map(normalizeUserNewsItem)
          .filter(Boolean);
        setArticles(mapped);
      } else {
        setArticles([]);
      }
    } catch (_) {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveSearch]);

  useEffect(() => {
    let active = true;
    fetchNewsWire().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchNewsWire]);

  // Listen for real-time user-generated post creation, edits, and deletions
  useEffect(() => {
    const handlePostCreated = (e) => {
      const newPost = e?.detail;
      const normalized = normalizeUserNewsItem(newPost);
      if (!normalized || !normalized.title) return;
      setArticles((prev) => {
        const exists = prev.some(
          (a) =>
            (normalized.id && a.id === normalized.id) ||
            (normalized.slug && a.slug === normalized.slug)
        );
        if (exists) return prev;
        return [normalized, ...prev];
      });
    };

    const handlePostUpdated = (e) => {
      const updated = normalizeUserNewsItem(e?.detail);
      if (!updated) return;
      setArticles((prev) =>
        prev.map((a) =>
          (updated.id && a.id === updated.id) ||
          (updated.slug && a.slug === updated.slug)
            ? { ...a, ...updated }
            : a
        )
      );
    };

    const handlePostDeleted = (e) => {
      const deletedId = e?.detail?.postId || e?.detail?.id;
      if (!deletedId) return;
      setArticles((prev) =>
        prev.filter((a) => a.id !== deletedId && a.slug !== deletedId)
      );
    };

    window.addEventListener('newscuddle:post_created', handlePostCreated);
    window.addEventListener('newscuddle:post_updated', handlePostUpdated);
    window.addEventListener('newscuddle:post_deleted', handlePostDeleted);

    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('newscuddle_feed_realtime');
        bc.onmessage = (event) => {
          const msg = event?.data;
          if (!msg) return;
          if (msg.type === 'POST_CREATED' && msg.post) {
            handlePostCreated({ detail: msg.post });
          } else if (msg.type === 'POST_UPDATED' && msg.post) {
            handlePostUpdated({ detail: msg.post });
          } else if (msg.type === 'POST_DELETED' && msg.postId) {
            handlePostDeleted({ detail: { postId: msg.postId } });
          }
        };
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('newscuddle:post_created', handlePostCreated);
      window.removeEventListener('newscuddle:post_updated', handlePostUpdated);
      window.removeEventListener('newscuddle:post_deleted', handlePostDeleted);
      if (bc) {
        try {
          bc.close();
        } catch (_) {}
      }
    };
  }, []);

  const displayedArticles = useMemo(() => {
    let list = [...articles];

    if (effectiveSearch) {
      const q = effectiveSearch.toLowerCase();
      list = list.filter((a) => {
        const matchTitle = (a.title || '').toLowerCase().includes(q);
        const matchExcerpt = (a.excerpt || '').toLowerCase().includes(q);
        const matchContent = (a.content || '').toLowerCase().includes(q);
        const matchSource = (a.source || '').toLowerCase().includes(q);
        const matchCategory = (a.categoryLabel || '').toLowerCase().includes(q);
        const matchAuthor = (a.author || '').toLowerCase().includes(q);
        const matchTopics =
          Array.isArray(a.topics) &&
          a.topics.some((t) => String(t).toLowerCase().includes(q));
        return (
          matchTitle ||
          matchExcerpt ||
          matchContent ||
          matchSource ||
          matchCategory ||
          matchAuthor ||
          matchTopics
        );
      });
    }

    return list;
  }, [articles, effectiveSearch]);

  const handleOpenArticle = (article) => {
    if (!article) return;
    if (onRecordRecentView) {
      onRecordRecentView({
        id: article.slug || article.id,
        title: article.title,
        desk: article.categoryLabel || article.source || '',
        upvotes: article.likesCount || 0,
        commentsCount: article.commentsCount || 0,
        isNewsArticle: true,
      });
    }
    const targetId = article.slug || article.id || article.articleCode;
    navigate(`/news/${encodeURIComponent(targetId)}`, {
      state: { article },
    });
  };

  return (
    <main className="news-wire-page-container">
      {loading && displayedArticles.length === 0 ? (
        <div className="news-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="news-article-card news-card-skeleton">
              <div className="news-skeleton-img" />
              <div className="news-card-body">
                <div className="news-skeleton-line short" />
                <div className="news-skeleton-line title" />
                <div className="news-skeleton-line" />
                <div className="news-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedArticles.length === 0 ? (
        <div className="news-empty-state">
          <Newspaper size={38} />
          <h3>No user-generated news stories yet</h3>
          <p>
            {effectiveSearch
              ? 'No user-generated articles matched your search query.'
              : 'When community members publish news articles and posts, they will appear here.'}
          </p>
        </div>
      ) : (
        <section className="news-cards-grid" aria-label="News Articles">
          {displayedArticles.map((article) => {
            const imgSrc = formatMediaUrl(article.imageUrl);

            return (
              <article
                key={article.id || article.slug}
                className="news-article-card"
                onClick={() => handleOpenArticle(article)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenArticle(article);
                  }
                }}
              >
                {/* Card Image */}
                <div className="news-card-image-wrap">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={article.title}
                      className="news-card-image"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="news-card-no-image">
                      <Newspaper size={28} />
                    </div>
                  )}
                  <div className="news-card-badges">
                    {(article.categoryLabel || article.category) && (
                      <span
                        className="news-card-category-badge"
                        style={{
                          backgroundColor: article.categoryColor || '#008751',
                        }}
                      >
                        {article.categoryLabel || article.category}
                      </span>
                    )}
                    {article.isBreaking && (
                      <span className="news-card-breaking-badge">BREAKING</span>
                    )}
                  </div>
                </div>

                {/* Card Content: Meta, Title, Excerpt, Footer */}
                <div className="news-card-body">
                  <div className="news-card-meta">
                    {article.source && (
                      <>
                        <span className="news-card-source">{article.source}</span>
                        <span className="news-card-meta-dot">•</span>
                      </>
                    )}
                    {article.publishedAt && (
                      <>
                        <span>{formatNewsRelativeTime(article.publishedAt)}</span>
                        <span className="news-card-meta-dot">•</span>
                      </>
                    )}
                    <span className="news-card-readtime">
                      <Clock size={12} />
                      {article.readTime || 1} min read
                    </span>
                  </div>

                  <h2 className="news-card-title">{article.title}</h2>

                  <p className="news-card-excerpt">
                    {article.excerpt || article.subtitle}
                  </p>

                  <div className="news-card-footer">
                    <span className="news-card-author">
                      {article.author ? `By ${article.author}` : ''}
                    </span>
                    <span className="news-card-read-cta">
                      <span>Read full story</span>
                      <ArrowUpRight size={15} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};

export default NewsPage;
