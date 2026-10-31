/**
 * NewsCuddle Wire Utilities
 * Strictly 100% user-generated news utilities — zero hardcoded, mock, or fallback articles.
 */

export function formatNewsRelativeTime(isoDate) {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Normalizes a user-generated post/article object from the database into
 * the canonical NewsArticle shape used by NewsPage and NewsDetailPage.
 */
export function normalizeUserNewsItem(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const content = String(raw.content || raw.summary || raw.excerpt || '').trim();
  const summary = String(raw.excerpt || raw.summary || raw.subtitle || '').trim();
  const excerpt =
    summary ||
    (content.length > 220 ? `${content.slice(0, 220).trim()}...` : content);

  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const computedReadTime = Math.max(1, Math.ceil(wordCount / 200));

  return {
    id: raw.id || raw._id || '',
    articleCode: raw.articleCode || raw.postCode || '',
    slug: raw.slug || raw.id || raw._id || '',
    title: raw.title || '',
    subtitle: raw.subtitle || raw.summary || '',
    excerpt,
    content,
    keyTakeaways: Array.isArray(raw.keyTakeaways) ? raw.keyTakeaways : [],
    imageUrl: raw.imageUrl || raw.mediaUrl || '',
    imageCaption: raw.imageCaption || '',
    category: raw.category || raw.desk || '',
    categoryLabel: raw.categoryLabel || raw.deskName || raw.category || '',
    categoryColor: raw.categoryColor || raw.deskColor || '#008751',
    source: raw.source || raw.deskName || raw.deskSlug || '',
    sourceUrl: raw.sourceUrl || '',
    author: raw.author || '',
    authorRole: raw.authorRole || '',
    authorAvatar: raw.authorAvatar || '',
    dateline: raw.dateline || '',
    readTime: raw.readTime || computedReadTime,
    isBreaking: Boolean(raw.isBreaking),
    isFeatured: Boolean(raw.isFeatured),
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    viewsCount: Number(raw.viewsCount || 0),
    likesCount: Number(
      raw.likesCount !== undefined ? raw.likesCount : raw.upvotes || 0
    ),
    bookmarksCount: Number(
      raw.bookmarksCount !== undefined ? raw.bookmarksCount : raw.savesCount || 0
    ),
    sharesCount: Number(raw.sharesCount || 0),
    commentsCount: Number(raw.commentsCount || 0),
    publishedAt: raw.publishedAt || raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    hasLiked: Boolean(raw.hasLiked || raw.hasUpvoted),
    hasBookmarked: Boolean(raw.hasBookmarked || raw.hasSaved),
  };
}
