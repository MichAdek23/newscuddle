/**
 * Centralized API Client & Endpoint Configuration for NewsCuddle
 * Consolidates all backend endpoints, HTTP request lifecycle,
 * token authorization, and unified error handling.
 */

// Base API configuration (Supports environment variable or local Go server fallback)
export const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:8080';
export const API_BASE_URL = `${API_ROOT}/api/v1`;

/**
 * Resolves media URLs correctly whether relative /uploads/..., absolute, or data URI
 */
export const formatMediaUrl = (url) => {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) {
    return `${API_ROOT}${trimmed}`;
  }
  if (trimmed.startsWith('uploads/')) {
    return `${API_ROOT}/${trimmed}`;
  }
  return trimmed;
};

// Centralized endpoint registry
export const ENDPOINTS = {
  HEALTH: `${API_ROOT}/health`,
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    CHECK_USERNAME: `${API_BASE_URL}/auth/check-username`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    VERIFY_OTP: `${API_BASE_URL}/auth/verify-otp`,
    RESEND_OTP: `${API_BASE_URL}/auth/resend-otp`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    GOOGLE: `${API_BASE_URL}/auth/google`,
  },
  ONBOARDING: {
    CATALOG: `${API_BASE_URL}/onboarding/catalog`,
    SUGGESTIONS: `${API_BASE_URL}/onboarding/username-suggestions`,
    USERNAME: `${API_BASE_URL}/onboarding/username`,
    FEED: `${API_BASE_URL}/onboarding/feed`,
    FEED_TOGGLE: `${API_BASE_URL}/onboarding/feed/toggle`,
    INTERESTS: `${API_BASE_URL}/onboarding/interests`,
  },
  SEARCH: {
    RECORD: `${API_BASE_URL}/search/record`,
    RECENT: `${API_BASE_URL}/search/recent`,
    TRENDING: `${API_BASE_URL}/trending`,
  },
  TRENDING: `${API_BASE_URL}/trending`,
  TELEMETRY: {
    EVENT: `${API_BASE_URL}/telemetry/event`,
    BATCH: `${API_BASE_URL}/telemetry/batch`,
    STATS: `${API_BASE_URL}/telemetry/stats`,
  },
  FEED: {
    LIST: `${API_BASE_URL}/feed`,
    INTERACT: `${API_BASE_URL}/feed/interact`,
    PROFILE: `${API_BASE_URL}/feed/profile`,
    FOLLOW_USER: `${API_BASE_URL}/feed/follow-user`,
    FOLLOW_POST: `${API_BASE_URL}/feed/follow-post`,
    AWARD: `${API_BASE_URL}/feed/award`,
    SHOW_FEWER: `${API_BASE_URL}/feed/show-fewer`,
    HIDE: `${API_BASE_URL}/feed/hide`,
    REPORT: `${API_BASE_URL}/feed/report`,
    EXPLAIN: `${API_BASE_URL}/feed/explain`,
    POST: `${API_BASE_URL}/feed/post`,
    POSTS: `${API_BASE_URL}/feed/posts`,
    VOTE: `${API_BASE_URL}/feed/posts/vote`,
    SAVE: `${API_BASE_URL}/feed/posts/save`,
    SAVED: `${API_BASE_URL}/feed/saved`,
    UPLOAD: `${API_BASE_URL}/feed/upload`,
    ANALYZE_MEDIA: `${API_BASE_URL}/feed/analyze-media`,
  },
  COMMENTS: {
    LIST: `${API_BASE_URL}/comments`,
    CREATE: `${API_BASE_URL}/comments`,
    VOTE: `${API_BASE_URL}/comments/vote`,
  },
  COMMUNITIES: {
    LIST: `${API_BASE_URL}/communities`,
    JOIN: `${API_BASE_URL}/communities/join`,
    PIN: `${API_BASE_URL}/communities/pin`,
    USER_STATE: `${API_BASE_URL}/communities/user-state`,
    DETAILS: `${API_BASE_URL}/communities/details`,
  },
  USER: {
    DETAILS: `${API_BASE_URL}/user/details`,
    PROFILE: `${API_BASE_URL}/user/profile`,
    PASSWORD: `${API_BASE_URL}/user/password`,
  },
};

/**
 * Universal JSON request wrapper
 * Automatically injects auth tokens, handles timeouts, and parses errors
 */
async function apiRequest(url, options = {}) {
  let token = null;
  let userId = null;
  try {
    const session = localStorage.getItem('newscuddle_auth_session');
    if (session) {
      const parsed = JSON.parse(session);
      token = parsed?.token || null;
      userId = parsed?.user?.id || parsed?.user?._id || null;
    }
  } catch (e) {
    // Session parse error ignored
  }

  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new Error(
      `Unable to connect to backend server at ${API_ROOT}. Please ensure the Go server is running.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

/**
 * Consolidated Authentication Services
 */
export const authApi = {
  /**
   * Log in user
   * @param {{ email: string, password: string }} credentials
   */
  login: (credentials) =>
    apiRequest(ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  /**
   * Register new user in MongoDB Atlas
   * @param {{ firstName: string, lastName: string, username: string, email: string, password: string, confirmPassword: string }} userData
   */
  register: (userData) =>
    apiRequest(ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  /**
   * Real-time username verification
   * @param {string} username
   */
  checkUsername: (username) => {
    const clean = username.replace(/^@/, '').trim();
    return apiRequest(`${ENDPOINTS.AUTH.CHECK_USERNAME}?username=${encodeURIComponent(clean)}`, {
      method: 'GET',
    });
  },

  /**
   * Request password reset code
   * @param {string} email
   */
  forgotPassword: (email) =>
    apiRequest(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  /**
   * Verify 6-digit OTP code for account activation or password reset
   * @param {{ email: string, code: string, type?: string }} payload
   */
  verifyOtp: ({ email, code, type }) =>
    apiRequest(ENDPOINTS.AUTH.VERIFY_OTP, {
      method: 'POST',
      body: JSON.stringify({ email, code, type }),
    }),

  /**
   * Resend a fresh 6-digit OTP code
   * @param {{ email: string, type?: string }} payload
   */
  resendOtp: ({ email, type }) =>
    apiRequest(ENDPOINTS.AUTH.RESEND_OTP, {
      method: 'POST',
      body: JSON.stringify({ email, type }),
    }),

  /**
   * Set new password
   * @param {{ email: string, code?: string, newPassword: string }} payload
   */
  resetPassword: ({ email, code, newPassword }) =>
    apiRequest(ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  /**
   * Sign in / sign up with Google OAuth (ID token credential or access token)
   * @param {{ credential?: string, accessToken?: string } | string} payload
   */
  googleAuth: (payload) => {
    const body = typeof payload === 'string'
      ? (payload.startsWith('ey') ? { credential: payload } : { accessToken: payload })
      : payload;
    return apiRequest(ENDPOINTS.AUTH.GOOGLE, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

/**
 * System Health Service
 */
export const systemApi = {
  checkHealth: () => apiRequest(ENDPOINTS.HEALTH, { method: 'GET' }),
};

/**
 * Search & Machine Learning Intelligence Service
 */
function getStoredUserId() {
  try {
    const session = localStorage.getItem('newscuddle_auth_session');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed?.user?.id || parsed?.user?._id || null;
    }
  } catch (_) {}
  return null;
}

export const searchApi = {
  recordSearch: (query, sessionId) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.SEARCH.RECORD, {
      method: 'POST',
      body: JSON.stringify({ query, userId, sessionId }),
    });
  },

  getRecentSearches: () => {
    const userId = getStoredUserId();
    const url = userId
      ? `${ENDPOINTS.SEARCH.RECENT}?userId=${encodeURIComponent(userId)}`
      : ENDPOINTS.SEARCH.RECENT;
    return apiRequest(url, { method: 'GET' });
  },

  clearRecentSearches: (singleQuery) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (singleQuery) params.append('query', singleQuery);
    const qs = params.toString();
    return apiRequest(`${ENDPOINTS.SEARCH.RECENT}${qs ? `?${qs}` : ''}`, {
      method: 'DELETE',
    });
  },

  getTrending: () => {
    const userId = getStoredUserId();
    const url = userId
      ? `${ENDPOINTS.SEARCH.TRENDING}?userId=${encodeURIComponent(userId)}`
      : ENDPOINTS.SEARCH.TRENDING;
    return apiRequest(url, { method: 'GET' });
  },
};

export const trendingApi = searchApi;

export const telemetryApi = {
  recordEvent: (event) =>
    apiRequest(ENDPOINTS.TELEMETRY.EVENT, {
      method: 'POST',
      body: JSON.stringify(event),
    }),

  recordBatch: (events) =>
    apiRequest(ENDPOINTS.TELEMETRY.BATCH, {
      method: 'POST',
      body: JSON.stringify({ events }),
    }),

  getStats: () =>
    apiRequest(ENDPOINTS.TELEMETRY.STATS, {
      method: 'GET',
    }),
};

export const onboardingApi = {
  getCatalog: () =>
    apiRequest(ENDPOINTS.ONBOARDING.CATALOG, {
      method: 'GET',
    }),

  getUsernameSuggestions: (userId) => {
    const uId = userId || getStoredUserId();
    const query = uId ? `?userId=${encodeURIComponent(uId)}` : '';
    return apiRequest(`${ENDPOINTS.ONBOARDING.SUGGESTIONS}${query}`, {
      method: 'GET',
    });
  },

  setUsername: ({ userId, username, skip = false, source = 'typed', durationMs = 0 }) => {
    const uId = userId || getStoredUserId();
    return apiRequest(ENDPOINTS.ONBOARDING.USERNAME, {
      method: 'POST',
      body: JSON.stringify({ userId: uId, username, skip, source, durationMs }),
    });
  },

  toggleDesk: ({ userId, categoryId, action = 'pick', categories = [], durationMs = 0 }) => {
    const uId = userId || getStoredUserId();
    return apiRequest(ENDPOINTS.ONBOARDING.FEED_TOGGLE, {
      method: 'POST',
      body: JSON.stringify({
        userId: uId,
        categoryId,
        action,
        categories,
        durationMs,
        clientTimeMs: Date.now(),
      }),
    });
  },

  saveFeed: ({ userId, categories, durationMs = 0 }) => {
    const uId = userId || getStoredUserId();
    return apiRequest(ENDPOINTS.ONBOARDING.FEED, {
      method: 'POST',
      body: JSON.stringify({ userId: uId, categories, durationMs }),
    });
  },

  saveInterests: ({ userId, interests, customInterests = [], searchQueries = [], durationMs = 0 }) => {
    const uId = userId || getStoredUserId();
    return apiRequest(ENDPOINTS.ONBOARDING.INTERESTS, {
      method: 'POST',
      body: JSON.stringify({
        userId: uId,
        interests,
        customInterests,
        searchQueries,
        durationMs,
      }),
    });
  },
};

/**
 * Machine Learning Personalized Feed & Online Interaction Service
 */
export const feedApi = {
  /**
   * Fetch personalized feed ranked in real-time by ML multi-objective function
   */
  getFeed: ({ desk = '', feed = '', sort = 'personalized', page = 1, limit = 15, pinned = '', joined = '', owned = '' } = {}) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (desk && desk !== 'all' && desk !== 'home') params.append('desk', desk);
    if (feed) params.append('feed', feed);
    if (sort) params.append('sort', sort);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (pinned) params.append('pinned', Array.isArray(pinned) ? pinned.join(',') : pinned);
    if (joined) params.append('joined', Array.isArray(joined) ? joined.join(',') : joined);
    if (owned) params.append('owned', Array.isArray(owned) ? owned.join(',') : owned);
    const qs = params.toString();
    return apiRequest(`${ENDPOINTS.FEED.LIST}${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * Fetch a single post by ID with enriched ML details and user states
   */
  getPost: (postId) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams({ id: postId });
    if (userId) params.append('userId', userId);
    return apiRequest(`${ENDPOINTS.FEED.POST}?${params.toString()}`, { method: 'GET' });
  },

  /**
   * Record click, upvote, downvote, save, or dwell time to trigger immediate online learning
   */
  interact: ({ feedItemId, action, dwellTimeMs = 0, sessionId = '' }) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.INTERACT, {
      method: 'POST',
      body: JSON.stringify({ userId, feedItemId, action, dwellTimeMs, sessionId }),
    });
  },

  /**
   * Inspect the user's transparent ML interest weights and desk probabilities
   */
  getProfile: () => {
    const userId = getStoredUserId();
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return apiRequest(`${ENDPOINTS.FEED.PROFILE}${query}`, { method: 'GET' });
  },

  /**
   * Follow or unfollow a content author
   */
  toggleFollowUser: (targetAuthor) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.FOLLOW_USER, {
      method: 'POST',
      body: JSON.stringify({ userId, targetAuthor }),
    });
  },

  /**
   * Subscribe/follow or unfollow a post for notifications
   */
  toggleFollowPost: (postId) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.FOLLOW_POST, {
      method: 'POST',
      body: JSON.stringify({ userId, postId }),
    });
  },

  /**
   * Award a post with silver, gold, platinum, helpful, insightful, or rocket awards
   */
  awardPost: (postId, awardType) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.AWARD, {
      method: 'POST',
      body: JSON.stringify({ userId, postId, awardType }),
    });
  },

  /**
   * Show fewer posts like this (negative feedback signal)
   */
  showFewerPosts: (postId) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.SHOW_FEWER, {
      method: 'POST',
      body: JSON.stringify({ userId, postId }),
    });
  },

  /**
   * Hide post from current user's feed
   */
  hidePost: (postId) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.HIDE, {
      method: 'POST',
      body: JSON.stringify({ userId, postId }),
    });
  },

  /**
   * Report a post for policy violations
   */
  reportPost: ({ postId, reason, details = '' }) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.REPORT, {
      method: 'POST',
      body: JSON.stringify({ userId, postId, reason, details }),
    });
  },

  /**
   * Explain why a post was recommended with dynamic mathematical feature attributions
   */
  explainRecommendation: (postId, options = {}) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams({
      postId,
      ...(userId ? { userId } : {}),
      ...(options.pinned ? { pinned: Array.isArray(options.pinned) ? options.pinned.join(',') : options.pinned } : {}),
      ...(options.joined ? { joined: Array.isArray(options.joined) ? options.joined.join(',') : options.joined } : {}),
      ...(options.owned ? { owned: Array.isArray(options.owned) ? options.owned.join(',') : options.owned } : {}),
    });
    return apiRequest(`${ENDPOINTS.FEED.EXPLAIN}?${params.toString()}`, { method: 'GET' });
  },

  /**
   * Create an institutional or community intelligence post
   */
  createPost: (postData) => {
    return apiRequest(ENDPOINTS.FEED.POSTS, {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  /**
   * Delete post authored by user from database
   */
  deletePost: (postId, userId) => {
    const uId = userId || getStoredUserId();
    const params = new URLSearchParams({ id: postId });
    if (uId) params.append('userId', uId);
    return apiRequest(`${ENDPOINTS.FEED.POSTS}?${params.toString()}`, { method: 'DELETE' });
  },

  /**
   * Edit/Update post title, content, or summary
   */
  updatePost: ({ id, title, content, summary }) => {
    return apiRequest(ENDPOINTS.FEED.POSTS, {
      method: 'PUT',
      body: JSON.stringify({ id, title, content, summary }),
    });
  },

  /**
   * Upload image or animated GIF media file or data URL
   */
  uploadMedia: (formDataOrFileOrJson) => {
    let body;
    if (formDataOrFileOrJson instanceof FormData) {
      body = formDataOrFileOrJson;
    } else if (typeof File !== 'undefined' && formDataOrFileOrJson instanceof File) {
      body = new FormData();
      body.append('media', formDataOrFileOrJson, formDataOrFileOrJson.name);
    } else if (typeof Blob !== 'undefined' && formDataOrFileOrJson instanceof Blob) {
      body = new FormData();
      body.append('media', formDataOrFileOrJson, 'upload.jpg');
    } else if (typeof formDataOrFileOrJson === 'string') {
      body = JSON.stringify({ url: formDataOrFileOrJson });
    } else {
      body = JSON.stringify(formDataOrFileOrJson);
    }

    return apiRequest(ENDPOINTS.FEED.UPLOAD, {
      method: 'POST',
      body,
    });
  },

  /**
   * Run real-time Monolith media analyzer on image/GIF URL
   */
  analyzeMedia: (mediaUrl) => {
    return apiRequest(ENDPOINTS.FEED.ANALYZE_MEDIA, {
      method: 'POST',
      body: JSON.stringify({ mediaUrl }),
    });
  },

  /**
   * Vote or un-vote on a post (+1 upvote, -1 downvote, or same direction to remove vote)
   */
  votePost: ({ postId, direction }) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.VOTE, {
      method: 'POST',
      body: JSON.stringify({ userId, postId, direction }),
    });
  },

  /**
   * Toggle save/unsave a post in user's saved collection in MongoDB Atlas
   */
  toggleSavePost: ({ postId }) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.FEED.SAVE, {
      method: 'POST',
      body: JSON.stringify({ userId, postId }),
    });
  },

  /**
   * Fetch all saved posts for current logged-in user
   */
  getSavedPosts: () => {
    const userId = getStoredUserId();
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return apiRequest(`${ENDPOINTS.FEED.SAVED}${query}`, { method: 'GET' });
  },
};

export const communityApi = {
  getCommunities: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`${ENDPOINTS.COMMUNITIES.LIST}${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  createCommunity: (data) =>
    apiRequest(ENDPOINTS.COMMUNITIES.LIST, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteCommunity: (id, userId) => {
    const qs = new URLSearchParams({ id, ...(userId ? { userId } : {}) }).toString();
    return apiRequest(`${ENDPOINTS.COMMUNITIES.LIST}?${qs}`, { method: 'DELETE' });
  },

  savePinnedDesks: (userId, pinned) =>
    apiRequest(ENDPOINTS.COMMUNITIES.PIN, {
      method: 'POST',
      body: JSON.stringify({ userId, pinned }),
    }),

  toggleJoin: ({ userId, communityId, action = 'join' }) => {
    const uId = userId || getStoredUserId();
    return apiRequest(ENDPOINTS.COMMUNITIES.JOIN, {
      method: 'POST',
      body: JSON.stringify({ userId: uId, communityId, action }),
    });
  },

  getUserState: (userId) => {
    const uId = userId || getStoredUserId();
    if (!uId) return Promise.resolve({ joinedCommunities: [], feedCategories: [], pinnedDesks: [], ownedCommunities: [] });
    return apiRequest(`${ENDPOINTS.COMMUNITIES.USER_STATE}?userId=${encodeURIComponent(uId)}`, {
      method: 'GET',
    });
  },

  getCommunityDetails: (slug) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams({ slug, ...(userId ? { userId } : {}) });
    return apiRequest(`${ENDPOINTS.COMMUNITIES.DETAILS}?${params.toString()}`, {
      method: 'GET',
    });
  },
};

/**
 * Threaded Comments & Recursive Discussion Service
 */
export const commentApi = {
  getComments: (postId) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams({ postId });
    if (userId) params.append('userId', userId);
    return apiRequest(`${ENDPOINTS.COMMENTS.LIST}?${params.toString()}`, { method: 'GET' });
  },

  createComment: ({ postId, parentId = '', content, author = '', authorRole = '' }) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.COMMENTS.CREATE, {
      method: 'POST',
      body: JSON.stringify({ postId, parentId, userId, content, author, authorRole }),
    });
  },

  voteComment: ({ commentId, direction }) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.COMMENTS.VOTE, {
      method: 'POST',
      body: JSON.stringify({ commentId, userId, direction }),
    });
  },

  deleteComment: (commentId) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams({ id: commentId });
    if (userId) params.append('userId', userId);
    return apiRequest(`${ENDPOINTS.COMMENTS.LIST}?${params.toString()}`, {
      method: 'DELETE',
    });
  },
};

/**
 * User Profile & Settings Services
 */
export const userApi = {
  getUserDetails: (usernameOrId) => {
    const userId = getStoredUserId();
    const params = new URLSearchParams();
    if (usernameOrId) {
      if (usernameOrId.length === 24 && /^[0-9a-fA-F]+$/.test(usernameOrId)) {
        params.append('userId', usernameOrId);
      } else {
        params.append('username', usernameOrId);
      }
    }
    if (userId) params.append('currentUserId', userId);
    return apiRequest(`${ENDPOINTS.USER.DETAILS}?${params.toString()}`, { method: 'GET' });
  },

  updateProfile: (profileData) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.USER.PROFILE, {
      method: 'PUT',
      body: JSON.stringify({ ...profileData, userId }),
    });
  },

  changePassword: (passwordData) => {
    const userId = getStoredUserId();
    return apiRequest(ENDPOINTS.USER.PASSWORD, {
      method: 'PUT',
      body: JSON.stringify({ ...passwordData, userId }),
    });
  },
};

export default {
  ENDPOINTS,
  auth: authApi,
  system: systemApi,
  trending: trendingApi,
  search: searchApi,
  telemetry: telemetryApi,
  onboarding: onboardingApi,
  feed: feedApi,
  community: communityApi,
  comments: commentApi,
  user: userApi,
  request: apiRequest,
};
