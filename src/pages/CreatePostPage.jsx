import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { feedApi } from '../services/api';
import { RightPanel } from '../components/home/RightPanel';
import {
  ChevronDown,
  Tag,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  Film,
  Bold,
  Italic,
  Strikethrough,
  Superscript,
  Heading,
  Quote,
  List,
  ListOrdered,
  Code,
  Sparkles,
  Loader2,
  Check,
  UploadCloud,
  FileText,
  AlertCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';

// Preset Trending Intelligence Animated GIFs
const TRENDING_ANALYTICAL_GIFS = [
  {
    title: 'Financial Market Orderbook Flow',
    category: 'Finance',
    url: 'https://media.giphy.com/media/JtBZm3Getg3dqxK0zP/giphy.gif',
    tags: ['markets', 'algo-trading', 'liquidity'],
  },
  {
    title: 'Quantum Neural Network Convergence',
    category: 'Technology',
    url: 'https://media.giphy.com/media/3o7TKTDnUxE0g2fSE8/giphy.gif',
    tags: ['deep-learning', 'quantum-computing', 'quantum-ai'],
  },
  {
    title: 'Geopolitical Defense Satellite Radar Pulse',
    category: 'Geopolitics',
    url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif',
    tags: ['satellite-remote-sensing', 'defense-tech', 'wire-bulletin'],
  },
  {
    title: 'Silicon Micro-Architecture Pipeline',
    category: 'Semiconductors',
    url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    tags: ['hardware', 'semiconductors', 'chip-design'],
  },
];

const SUGGESTED_TAGS = [
  'technology',
  'markets',
  'geopolitics',
  'intelligence',
  'investigations',
  'semiconductors',
  'policy',
  'energy',
  'science',
];

const DRAFTS_STORAGE_KEY = 'newscuddle_user_drafts';

export const CreatePostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const context = useOutletContext() || {};

  const {
    canonicalDesks = [],
    customCommunities = [],
  } = context;

  const fileInputRef = useRef(null);
  const bodyTextareaRef = useRef(null);
  const communityDropdownRef = useRef(null);
  const draftsDropdownRef = useRef(null);
  const tagsPopoverRef = useRef(null);

  // Initial destination from navigation state (e.g. from a community page)
  const defaultCommSlug = location.state?.defaultCommunity || null;

  // Selected destination state
  // null = 'Select Community', or object: { type: 'community' | 'profile', id, name, label, color }
  const [destination, setDestination] = useState(() => {
    if (defaultCommSlug) {
      const clean = String(defaultCommSlug).replace(/^c\//, '');
      const matched = (canonicalDesks || []).find((d) => d.id === clean || d.name === `c/${clean}`) ||
        (customCommunities || []).find((c) => c.id === clean || c.name === `c/${clean}` || c.name === clean);
      if (matched) {
        return {
          type: 'community',
          id: matched.id,
          name: matched.name || `c/${matched.id}`,
          label: matched.label || matched.name,
          color: matched.color || '#008751',
        };
      }
    }
    // Default destination is the user's personal profile: u/:username
    return {
      type: 'profile',
      id: user?.username || 'member',
      name: `u/${user?.username || 'member'}`,
      label: user?.username ? `u/${user.username}` : 'Your Profile',
      color: '#008751',
    };
  });

  // Sync destination with actual authenticated user if it was initialized as profile
  useEffect(() => {
    if (user?.username && destination?.type === 'profile' && destination.id === 'member') {
      setDestination({
        type: 'profile',
        id: user.username,
        name: `u/${user.username}`,
        label: `u/${user.username}`,
        color: '#008751',
      });
    }
  }, [user?.username, destination?.type, destination?.id]);

  const [communitySearch, setCommunitySearch] = useState('');
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);

  // Post Inputs
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [tags, setTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showTagsPopover, setShowTagsPopover] = useState(false);

  // Media Attachment State
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'gif'
  const [imageCaption, setImageCaption] = useState('');
  const [mediaAnalysis, setMediaAnalysis] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaModalTab, setMediaModalTab] = useState('upload'); // 'upload' | 'url' | 'trending'
  const [urlInput, setUrlInput] = useState('');

  // Status & Feedback
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Drafts
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showDraftsDropdown, setShowDraftsDropdown] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (communityDropdownRef.current && !communityDropdownRef.current.contains(e.target)) {
        setShowCommunityDropdown(false);
      }
      if (draftsDropdownRef.current && !draftsDropdownRef.current.contains(e.target)) {
        setShowDraftsDropdown(false);
      }
      if (tagsPopoverRef.current && !tagsPopoverRef.current.contains(e.target)) {
        setShowTagsPopover(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Update default destination if canonical desks load after mount
  useEffect(() => {
    if (!destination && defaultCommSlug && canonicalDesks.length > 0) {
      const clean = String(defaultCommSlug).replace(/^c\//, '');
      const matched = canonicalDesks.find((d) => d.id === clean || d.name === `c/${clean}`);
      if (matched) {
        setDestination({
          type: 'community',
          id: matched.id,
          name: matched.name || `c/${matched.id}`,
          label: matched.label || matched.name,
          color: matched.color || '#008751',
        });
      }
    }
  }, [canonicalDesks, defaultCommSlug, destination]);

  // Handle local file upload (images, animated GIFs, WebP)
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File exceeds 25MB maximum limit.');
      return;
    }

    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    setMediaType(isGif ? 'gif' : 'image');
    setIsUploading(true);
    setIsAnalyzing(true);
    setErrorMsg('');

    try {
      const res = await feedApi.uploadMedia(file);
      if (res && res.success && res.url) {
        setMediaUrl(res.url);
        if (res.analysis) {
          setMediaAnalysis(res.analysis);
        }
        setShowMediaModal(false);
        showToast(isGif ? '🎬 Animated GIF attached' : '🖼️ Image attached');
      } else {
        throw new Error(res?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload media error:', err);
      // Fallback: local object URL with client analysis
      const localUrl = URL.createObjectURL(file);
      setMediaUrl(localUrl);
      setShowMediaModal(false);
      triggerUrlAnalysis(localUrl, isGif ? 'gif' : 'image');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // Trigger analysis for URL or preset GIF
  const triggerUrlAnalysis = async (url, type = 'image') => {
    if (!url) return;
    setIsAnalyzing(true);
    try {
      const res = await feedApi.analyzeMedia({ url, mediaType: type });
      if (res && res.success && res.analysis) {
        setMediaAnalysis(res.analysis);
      }
    } catch (err) {
      console.warn('Monolith media analysis fallback:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectTrendingGif = (gif) => {
    setMediaUrl(gif.url);
    setMediaType('gif');
    if (gif.title && !title) {
      setTitle(gif.title);
    }
    if (gif.tags && tags.length === 0) {
      setTags(gif.tags);
    }
    setShowMediaModal(false);
    triggerUrlAnalysis(gif.url, 'gif');
    showToast(`Attached "${gif.title}"`);
  };

  const handleAttachUrl = () => {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    const isGif = url.toLowerCase().includes('.gif') || url.toLowerCase().includes('giphy.com') || url.toLowerCase().includes('tenor.com');
    setMediaUrl(url);
    setMediaType(isGif ? 'gif' : 'image');
    setShowMediaModal(false);
    setUrlInput('');
    triggerUrlAnalysis(url, isGif ? 'gif' : 'image');
    showToast(isGif ? '🎬 Animated GIF attached' : '🖼️ Image attached');
  };

  const handleRemoveMedia = () => {
    setMediaUrl('');
    setMediaAnalysis(null);
    setImageCaption('');
  };

  // Text formatting helpers for rich toolbar
  const insertFormatting = (prefix, suffix = '') => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = bodyText.substring(start, end);
    const replacement = prefix + selected + suffix;

    const newText = bodyText.substring(0, start) + replacement + bodyText.substring(end);
    setBodyText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  // Tag management
  const handleAddTag = (tag) => {
    const clean = tag.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return;
    if (!tags.includes(clean)) {
      if (tags.length >= 6) {
        showToast('Maximum 6 tags allowed');
        return;
      }
      setTags([...tags, clean]);
    }
    setCustomTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Drafts save & load
  const handleSaveDraft = () => {
    if (!title.trim() && !bodyText.trim() && !mediaUrl) {
      showToast('Cannot save an empty draft.');
      return;
    }
    const newDraft = {
      id: 'draft_' + Date.now(),
      title: title.trim() || 'Untitled Draft',
      bodyText,
      destination,
      tags,
      mediaUrl,
      mediaType,
      mediaAnalysis,
      imageCaption,
      updatedAt: new Date().toISOString(),
    };

    const nextDrafts = [newDraft, ...drafts.filter((d) => d.id !== newDraft.id)].slice(0, 10);
    setDrafts(nextDrafts);
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
      showToast('Draft saved successfully.');
    } catch (_) {}
  };

  const handleLoadDraft = (draft) => {
    setTitle(draft.title || '');
    setBodyText(draft.bodyText || '');
    setTags(draft.tags || []);
    setDestination(draft.destination || null);
    setMediaUrl(draft.mediaUrl || '');
    setMediaType(draft.mediaType || 'image');
    setMediaAnalysis(draft.mediaAnalysis || null);
    setImageCaption(draft.imageCaption || '');
    setShowDraftsDropdown(false);
    showToast(`Loaded draft "${(draft.title || 'Untitled').slice(0, 28)}..."`);
  };

  const handleDeleteDraft = (draftId, e) => {
    e.stopPropagation();
    const nextDrafts = drafts.filter((d) => d.id !== draftId);
    setDrafts(nextDrafts);
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts));
      showToast('Draft deleted.');
    } catch (_) {}
  };

  // Post Submission
  const handlePublish = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a Title for your post.');
      return;
    }
    if (title.trim().length < 4) {
      setErrorMsg('Title must be at least 4 characters long.');
      return;
    }

    setIsPublishing(true);
    setErrorMsg('');

    try {
      // Determine destination metadata
      const isPersonal = destination?.type === 'profile';
      const defaultDesk = (canonicalDesks && canonicalDesks[0]) || { id: 'technology', name: 'c/technology', label: 'Technology', color: '#7c3aed' };
      const deskId = isPersonal ? 'general' : (destination?.id || defaultDesk.id);
      const deskSlug = isPersonal ? `u/${user?.username || 'member'}` : (destination?.name || defaultDesk.name);
      const deskName = isPersonal ? (user?.username || 'Personal Wire') : (destination?.label || defaultDesk.label);
      const deskColor = destination?.color || defaultDesk.color || '#008751';

      const payload = {
        title: title.trim(),
        content: bodyText.trim(),
        summary: bodyText.trim() ? bodyText.trim().slice(0, 240) : (imageCaption || 'Intelligence dispatch on NewsCuddle.'),
        author: user?.username || 'member',
        authorRole: isPersonal ? 'Contributing Author' : 'Desk Correspondent',
        desk: deskId,
        deskSlug: deskSlug,
        deskName: deskName,
        deskColor: deskColor,
        category: deskId,
        topics: tags.length > 0 ? tags : [deskName],
        mediaUrl: mediaUrl || '',
        imageUrl: mediaUrl || '',
        hasMedia: Boolean(mediaUrl),
        mediaType: mediaUrl ? mediaType : '',
        imageCaption: imageCaption.trim(),
        mediaAnalysis: mediaAnalysis || null,
        isUserPost: isPersonal,
      };

      const res = await feedApi.createPost(payload);
      if (res && res.success && res.post) {
        const createdPost = res.post;
        // Dispatch global event for immediate real-time update in any open feed
        window.dispatchEvent(new CustomEvent('newscuddle:post_created', { detail: createdPost }));

        showToast('🚀 Published to the Wire successfully!');

        // Clean draft if published
        const targetPath = `/post/${createdPost.postCode || createdPost.id}`;

        setTimeout(() => {
          navigate(targetPath, { state: { post: createdPost } });
        }, 350);
      } else {
        throw new Error(res?.message || 'Failed to publish post');
      }
    } catch (err) {
      console.error('Publish error:', err);
      setErrorMsg(err.message || 'Unable to publish post. Please check your connection.');
      setIsPublishing(false);
    }
  };

  // Filter communities for dropdown
  const filteredDesks = (canonicalDesks || []).filter((d) =>
    d.label?.toLowerCase().includes(communitySearch.toLowerCase()) ||
    d.name?.toLowerCase().includes(communitySearch.toLowerCase())
  );

  const filteredCustom = (customCommunities || []).filter((c) =>
    c.label?.toLowerCase().includes(communitySearch.toLowerCase()) ||
    c.name?.toLowerCase().includes(communitySearch.toLowerCase())
  );

  return (
    <>
      <main className="reddit-main-feed reddit-create-page-wrapper" aria-label="Create Post Canvas">
        <div className="reddit-create-page-card animate-fade-in">
          {/* Top Destination Selector & Drafts Bar (Matching User Screenshot) */}
          <div className="reddit-create-top-bar">
            {/* Community Selector Pill */}
            <div className="reddit-community-select-wrapper" ref={communityDropdownRef}>
              <button
                type="button"
                className={`reddit-community-select-btn ${destination ? 'selected' : ''}`}
                onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
              >
                {destination ? (
                  <div className="select-btn-inner">
                    <span
                      className="select-comm-circle"
                      style={{
                        backgroundColor: `${destination.color || '#008751'}22`,
                        color: destination.color || '#008751',
                      }}
                    >
                      {destination.type === 'profile'
                        ? 'u/'
                        : (destination.name ? destination.name.replace(/^c\//, '').charAt(0).toUpperCase() : 'C')}
                    </span>
                    <span className="select-comm-name">{destination.name || destination.label}</span>
                  </div>
                ) : (
                  <div className="select-btn-inner">
                    <span className="select-placeholder-circle">C</span>
                    <span className="select-placeholder-text">Select Community</span>
                  </div>
                )}
                <ChevronDown size={16} className={`chevron-icon ${showCommunityDropdown ? 'open' : ''}`} />
              </button>

              {/* Community Dropdown Menu */}
              {showCommunityDropdown && (
                <div className="reddit-community-dropdown-popover animate-fade-in">
                  <div className="dropdown-search-box">
                    <input
                      type="text"
                      className="dropdown-search-input"
                      placeholder="Search communities..."
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="dropdown-scroll-list custom-scrollbar">
                    {/* 1. Personal Profile Option */}
                    <div className="dropdown-section-title">YOUR PROFILE</div>
                    <div
                      className={`dropdown-comm-item ${destination?.type === 'profile' ? 'active' : ''}`}
                      onClick={() => {
                        setDestination({
                          type: 'profile',
                          id: user?.username || 'member',
                          name: `u/${user?.username || 'member'}`,
                          label: user?.username || 'Your Profile',
                          color: '#008751',
                        });
                        setShowCommunityDropdown(false);
                      }}
                    >
                      <div className="dropdown-comm-avatar profile">
                        {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="dropdown-comm-info">
                        <span className="dropdown-comm-name">u/{user?.username || 'member'}</span>
                        <span className="dropdown-comm-sub">Post directly to your profile wire</span>
                      </div>
                    </div>

                    {/* 2. Custom & Joined Communities */}
                    {filteredCustom.length > 0 && (
                      <>
                        <div className="dropdown-section-title">YOUR COMMUNITIES</div>
                        {filteredCustom.map((c) => (
                          <div
                            key={c.id || c.name}
                            className={`dropdown-comm-item ${destination?.id === c.id ? 'active' : ''}`}
                            onClick={() => {
                              setDestination({
                                type: 'community',
                                id: c.id,
                                name: c.name || `c/${c.id}`,
                                label: c.label || c.name,
                                color: c.color || '#008751',
                              });
                              setShowCommunityDropdown(false);
                            }}
                          >
                            <div
                              className="dropdown-comm-avatar"
                              style={{ backgroundColor: `${c.color || '#008751'}22`, color: c.color || '#008751' }}
                            >
                              {c.name ? c.name.replace(/^c\//, '').charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="dropdown-comm-info">
                              <span className="dropdown-comm-name">{c.name}</span>
                              <span className="dropdown-comm-sub">{c.label}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* 3. All Canonical Editorial Desks */}
                    <div className="dropdown-section-title">ALL COMMUNITIES & DESKS</div>
                    {filteredDesks.map((d) => (
                      <div
                        key={d.id}
                        className={`dropdown-comm-item ${destination?.id === d.id ? 'active' : ''}`}
                        onClick={() => {
                          setDestination({
                            type: 'community',
                            id: d.id,
                            name: d.name,
                            label: d.label,
                            color: d.color || '#008751',
                          });
                          setShowCommunityDropdown(false);
                        }}
                      >
                        <div
                          className="dropdown-comm-avatar"
                          style={{ backgroundColor: `${d.color || '#008751'}22`, color: d.color || '#008751' }}
                        >
                          {d.name ? d.name.replace(/^c\//, '').charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div className="dropdown-comm-info">
                          <span className="dropdown-comm-name">{d.name}</span>
                          <span className="dropdown-comm-sub">{d.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drafts Link with Dropdown */}
            <div className="reddit-drafts-wrapper" ref={draftsDropdownRef}>
              <button
                type="button"
                className="reddit-drafts-btn"
                onClick={() => setShowDraftsDropdown(!showDraftsDropdown)}
              >
                <span>Drafts</span>
                <span className="drafts-count-badge">{drafts.length}</span>
              </button>

              {showDraftsDropdown && (
                <div className="reddit-drafts-popover animate-fade-in">
                  <div className="drafts-header">
                    <span className="drafts-title">Saved Drafts</span>
                    <span className="drafts-sub">{drafts.length} saved</span>
                  </div>

                  {drafts.length === 0 ? (
                    <div className="drafts-empty">
                      <FileText size={24} color="#94a3b8" />
                      <p>No saved drafts yet.</p>
                    </div>
                  ) : (
                    <div className="drafts-list custom-scrollbar">
                      {drafts.map((d) => (
                        <div
                          key={d.id}
                          className="draft-item"
                          onClick={() => handleLoadDraft(d)}
                        >
                          <div className="draft-item-info">
                            <span className="draft-item-title">{d.title}</span>
                            <span className="draft-item-time">
                              {new Date(d.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="draft-delete-btn"
                            title="Delete draft"
                            onClick={(e) => handleDeleteDraft(d.id, e)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="reddit-create-error-alert animate-fade-in">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title Input Field (Matching Screenshot "Title*") */}
          <div className="reddit-create-title-box">
            <input
              type="text"
              className="reddit-create-title-input"
              placeholder="Title*"
              value={title}
              maxLength={300}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              autoFocus
            />
            <span className={`title-char-counter ${title.length > 280 ? 'warn' : ''}`}>
              {title.length}/300
            </span>
          </div>

          {/* Tags Row (+ Add tags chip matching screenshot) */}
          <div className="reddit-create-tags-row">
            {/* Render Selected Tag Chips */}
            {tags.map((t) => (
              <span key={t} className="selected-tag-chip">
                <span>#{t}</span>
                <button
                  type="button"
                  className="tag-remove-btn"
                  onClick={() => handleRemoveTag(t)}
                  title="Remove tag"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {/* + Add tags button */}
            <div className="add-tag-popover-wrapper" ref={tagsPopoverRef}>
              <button
                type="button"
                className="btn-add-tag"
                onClick={() => setShowTagsPopover(!showTagsPopover)}
              >
                <Tag size={14} />
                <span>+ Add tags</span>
              </button>

              {showTagsPopover && (
                <div className="add-tag-popover animate-fade-in">
                  <div className="tag-input-row">
                    <input
                      type="text"
                      className="tag-custom-input"
                      placeholder="Add custom topic tag..."
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(customTagInput);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-add-custom-tag"
                      onClick={() => handleAddTag(customTagInput)}
                      disabled={!customTagInput.trim()}
                    >
                      Add
                    </button>
                  </div>

                  <div className="suggested-tags-title">POPULAR EDITORIAL TAGS</div>
                  <div className="suggested-tags-grid">
                    {SUGGESTED_TAGS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`suggested-tag-pill ${tags.includes(st) ? 'active' : ''}`}
                        onClick={() => {
                          if (tags.includes(st)) {
                            handleRemoveTag(st);
                          } else {
                            handleAddTag(st);
                          }
                        }}
                      >
                        #{st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Body Text Editor (Matching Screenshot "Body text (optional)") */}
          <div className="reddit-create-body-container">
            <textarea
              ref={bodyTextareaRef}
              className="reddit-create-body-textarea"
              placeholder="Body text (optional)"
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
            />

            {/* Media Attachment Preview Box (if attached) */}
            {mediaUrl && (
              <div className="reddit-create-media-preview-box animate-fade-in">
                <div className="preview-top-bar">
                  <div className="preview-indicator">
                    {mediaType === 'gif' || mediaAnalysis?.isAnimated ? (
                      <span className="media-type-badge gif">
                        🎬 ANIMATED GIF
                        {mediaAnalysis?.frameCount > 0 && ` • ${mediaAnalysis.frameCount}f`}
                      </span>
                    ) : (
                      <span className="media-type-badge image">
                        🖼️ {mediaAnalysis?.format?.toUpperCase() || 'IMAGE'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="preview-remove-btn"
                    onClick={handleRemoveMedia}
                    title="Remove media attachment"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="preview-img-wrapper">
                  <img src={mediaUrl} alt="Attached Media" className="preview-media-img" />
                </div>

                {/* Caption input */}
                <div className="preview-caption-row">
                  <input
                    type="text"
                    className="preview-caption-input"
                    placeholder="Add a descriptive caption for this media (optional)..."
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                  />
                </div>


              </div>
            )}

            {/* Embedded Rich Formatting & Media Attachment Toolbar (Matching Screenshot) */}
            <div className="reddit-create-toolbar">
              <div className="toolbar-left-group">
                {/* 1. Link Button */}
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Insert Link [text](url)"
                  onClick={() => insertFormatting('[', '](https://)')}
                >
                  <LinkIcon size={16} />
                </button>

                {/* 2. Image Button */}
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Upload / Attach Image"
                  onClick={() => {
                    setMediaModalTab('upload');
                    setShowMediaModal(true);
                  }}
                >
                  <ImageIcon size={16} />
                </button>

                {/* 3. Animated GIF / Video Button */}
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Attach Animated GIF / Video Media"
                  onClick={() => {
                    setMediaModalTab('trending');
                    setShowMediaModal(true);
                  }}
                >
                  <Film size={16} />
                </button>

                <span className="toolbar-separator" />

                {/* 4. Text Formats: Bold, Italic, Strikethrough, Superscript, Heading, Quote, Lists, Code */}
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Bold (**text**)"
                  onClick={() => insertFormatting('**', '**')}
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Italic (*text*)"
                  onClick={() => insertFormatting('*', '*')}
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Strikethrough (~~text~~)"
                  onClick={() => insertFormatting('~~', '~~')}
                >
                  <Strikethrough size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Superscript (^text)"
                  onClick={() => insertFormatting('^')}
                >
                  <Superscript size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Heading (# )"
                  onClick={() => insertFormatting('# ')}
                >
                  <Heading size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Quote (> )"
                  onClick={() => insertFormatting('> ')}
                >
                  <Quote size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Bulleted List (- )"
                  onClick={() => insertFormatting('- ')}
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Numbered List (1. )"
                  onClick={() => insertFormatting('1. ')}
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  type="button"
                  className="toolbar-btn"
                  title="Code Block"
                  onClick={() => insertFormatting('```\n', '\n```')}
                >
                  <Code size={15} />
                </button>
              </div>

              {/* Character or Word count hint */}
              <div className="toolbar-right-group">
                <span className="body-word-count">
                  {bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0} words
                </span>
              </div>
            </div>
          </div>

          {/* Action Row: Save Draft | Post (Matching Screenshot) */}
          <div className="reddit-create-actions-footer">
            <button
              type="button"
              className="btn-create-save-draft"
              onClick={handleSaveDraft}
              title="Save current work to local drafts"
            >
              Save Draft
            </button>

            <button
              type="button"
              className="btn-create-post-submit"
              disabled={!title.trim() || isPublishing}
              onClick={handlePublish}
            >
              {isPublishing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <span>Post</span>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Media Attachment Modal (Upload, URL, or Trending GIFs) */}
      {showMediaModal && (
        <div className="onboarding-overlay" onClick={() => !isUploading && setShowMediaModal(false)}>
          <div
            className="onboarding-modal-container"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem' }}>
              <div className="modal-header-with-close">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'rgba(0, 135, 81, 0.1)',
                      color: '#008751',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Film size={18} />
                  </div>
                  <div>
                    <h3 className="modal-title">Attach Media & Animated GIFs</h3>
                    <p className="modal-subtitle">Upload image or animated GIF for your post</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-icon-btn"
                  onClick={() => !isUploading && setShowMediaModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="media-modal-tabs">
                <button
                  type="button"
                  className={`media-modal-tab ${mediaModalTab === 'upload' ? 'active' : ''}`}
                  onClick={() => setMediaModalTab('upload')}
                >
                  <UploadCloud size={15} />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  className={`media-modal-tab ${mediaModalTab === 'trending' ? 'active' : ''}`}
                  onClick={() => setMediaModalTab('trending')}
                >
                  <Film size={15} />
                  <span>Trending Wire GIFs</span>
                </button>
                <button
                  type="button"
                  className={`media-modal-tab ${mediaModalTab === 'url' ? 'active' : ''}`}
                  onClick={() => setMediaModalTab('url')}
                >
                  <LinkIcon size={15} />
                  <span>Media URL</span>
                </button>
              </div>

              {/* Tab 1: Upload File */}
              {mediaModalTab === 'upload' && (
                <div
                  className="media-upload-dropzone"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  {isUploading ? (
                    <div className="dropzone-loading">
                      <Loader2 size={36} className="animate-spin" color="#008751" />
                      <p>Uploading and processing media...</p>
                    </div>
                  ) : (
                    <>
                      <div className="dropzone-icon-circle">
                        <UploadCloud size={28} />
                      </div>
                      <h4 className="dropzone-title">Click to upload or drag and drop</h4>
                      <p className="dropzone-desc">
                        Animated GIFs, PNG, JPG, or WebP (up to 25MB).
                      </p>
                      <button type="button" className="btn-secondary" style={{ marginTop: '0.85rem' }}>
                        Browse Computer
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Tab 2: Trending Analytical GIFs */}
              {mediaModalTab === 'trending' && (
                <div className="trending-gifs-grid custom-scrollbar">
                  {TRENDING_ANALYTICAL_GIFS.map((gif, idx) => (
                    <div
                      key={idx}
                      className="trending-gif-card"
                      onClick={() => handleSelectTrendingGif(gif)}
                    >
                      <div className="gif-thumb-wrapper">
                        <img src={gif.url} alt={gif.title} loading="lazy" />
                        <span className="gif-badge-pill">🎬 GIF</span>
                      </div>
                      <div className="gif-card-info">
                        <span className="gif-category-tag">{gif.category}</span>
                        <h5 className="gif-card-title">{gif.title}</h5>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab 3: Media URL */}
              {mediaModalTab === 'url' && (
                <div className="media-url-container">
                  <label className="form-field-label">DIRECT IMAGE OR GIF URL</label>
                  <div className="url-input-action-row">
                    <input
                      type="url"
                      className="onboarding-input"
                      placeholder="https://example.com/image.gif or Tenor/Giphy URL..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleAttachUrl}
                      disabled={!urlInput.trim()}
                    >
                      Attach
                    </button>
                  </div>
                  <p className="form-field-help" style={{ marginTop: '0.5rem' }}>
                    Paste any direct image link or animated GIF URL.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="feed-floating-toast animate-fade-in">
          <Check size={16} color="#008751" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Right Sidebar: Empty except for its footer! */}
      <RightPanel
        mode="create"
        canonicalDesks={canonicalDesks}
      />
    </>
  );
};

export default CreatePostPage;
