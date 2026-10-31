import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Image,
  Film,
  Link as LinkIcon,
  Sparkles,
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Cpu,
  Layers,
  Eye,
  Hash,
  Compass,
} from 'lucide-react';
import { feedApi, API_ROOT } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const QUICK_TRENDING_GIFS = [
  {
    title: 'Quantum Wavefunction Tunneling',
    category: 'Quantum Computing',
    url: 'https://media.giphy.com/media/3o7TKtnuHOH6yx3RhG/giphy.gif',
    tags: ['quantum-computing', 'physics', 'topography'],
  },
  {
    title: 'High-Frequency Market Liquidity Matrix',
    category: 'Markets & Finance',
    url: 'https://media.giphy.com/media/YnkMcHgNIMW4Yfmjxr/giphy.gif',
    tags: ['financial-markets', 'quantitative-finance', 'macro-economics'],
  },
  {
    title: 'Deep Learning Neural Backpropagation',
    category: 'Artificial Intelligence',
    url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
    tags: ['artificial-intelligence', 'neural-networks', 'deep-learning'],
  },
  {
    title: 'Sub-Orbital Earth Observation Telemetry',
    category: 'Space & Defense',
    url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif',
    tags: ['aerospace', 'satellite-remote-sensing', 'defense-tech'],
  },
  {
    title: 'Silicon Micro-Architecture Pipeline',
    category: 'Semiconductors',
    url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif',
    tags: ['semiconductors', 'hardware-engineering', 'vlsi'],
  },
  {
    title: 'Breaking Global Wire Bulletin',
    category: 'Geopolitics',
    url: 'https://media.giphy.com/media/26FPqAH61DhYiuf5e/giphy.gif',
    tags: ['geopolitics', 'intelligence-wire', 'breaking-news'],
  },
];

export const CreatePostModal = ({
  isOpen,
  onClose,
  onPostCreated,
  defaultCommunity = null,
  customCommunities = [],
  canonicalDesks = [],
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Form State
  const [targetType, setTargetType] = useState('community'); // 'community' | 'personal'
  const [selectedDeskId, setSelectedDeskId] = useState('technology');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState([]);
  
  // Media State
  const [mediaTab, setMediaTab] = useState('upload'); // 'upload' | 'url' | 'trending'
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('image'); // 'image' | 'gif'
  const [imageCaption, setImageCaption] = useState('');
  const [mediaAnalysis, setMediaAnalysis] = useState(null);
  const [urlInput, setUrlInput] = useState('');

  // Status & Loading
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');

  // Sync default community when opened
  useEffect(() => {
    if (defaultCommunity) {
      if (typeof defaultCommunity === 'string') {
        const clean = defaultCommunity.replace(/^c\//, '');
        setSelectedDeskId(clean);
        setTargetType('community');
      } else if (defaultCommunity.id || defaultCommunity.slug) {
        setSelectedDeskId(defaultCommunity.id || defaultCommunity.slug);
        setTargetType('community');
      }
    }
  }, [defaultCommunity, isOpen]);

  if (!isOpen) return null;

  // Combine communities for dropdown
  const allCommunityOptions = [
    ...(canonicalDesks || []).map((d) => ({
      id: d.id,
      name: d.name || `c/${d.id}`,
      label: d.label || d.name,
      color: d.color || '#008751',
      category: d.id,
    })),
    ...(customCommunities || []).map((c) => ({
      id: c.id || c.slug,
      name: c.name || `c/${c.id}`,
      label: c.label || c.name,
      color: c.color || '#008751',
      category: c.category || c.id,
    })),
  ];

  // Remove duplicates by ID
  const uniqueCommunities = Array.from(
    new Map(allCommunityOptions.map((item) => [item.id, item])).values()
  );

  const selectedCommunityObj = uniqueCommunities.find((c) => c.id === selectedDeskId) || uniqueCommunities[0];

  // Handle Tag Input
  const handleAddTopic = () => {
    const trimmed = topicInput.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-');
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (t) => {
    setTopics(topics.filter((x) => x !== t));
  };

  // Handle Local File Upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('File exceeds 25MB limit.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('media', file);

      const res = await feedApi.uploadMedia(formData);
      if (res && res.success) {
        // Normalize url: if relative /uploads/..., prefix with API_ROOT for preview if needed
        const fullUrl = res.url.startsWith('http') ? res.url : `${API_ROOT}${res.url}`;
        setMediaUrl(fullUrl);
        setMediaType(res.mediaType || (file.type.includes('gif') ? 'gif' : 'image'));
        setMediaAnalysis(res.analysis || null);
      } else {
        throw new Error(res.message || 'Upload failed');
      }
    } catch (err) {
      console.error('File upload error:', err);
      setError('Failed to upload media. ' + (err.message || ''));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle URL Inspection
  const handleInspectUrl = async (urlToInspect) => {
    const target = (urlToInspect || urlInput).trim();
    if (!target) return;

    setIsAnalyzing(true);
    setError('');

    try {
      const res = await feedApi.analyzeMedia(target);
      if (res && res.success && res.analysis) {
        setMediaUrl(target);
        setMediaType(res.analysis.isAnimated ? 'gif' : 'image');
        setMediaAnalysis(res.analysis);
        setUrlInput('');
      } else {
        // Fallback simple attach
        setMediaUrl(target);
        setMediaType(target.toLowerCase().includes('.gif') ? 'gif' : 'image');
        setMediaAnalysis(null);
      }
    } catch (err) {
      console.warn('Media analyze warning:', err);
      setMediaUrl(target);
      setMediaType(target.toLowerCase().includes('.gif') ? 'gif' : 'image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pick Quick GIF
  const handlePickTrendingGif = (gifItem) => {
    handleInspectUrl(gifItem.url);
    if (gifItem.tags && topics.length === 0) {
      setTopics(gifItem.tags);
    }
    if (!title) {
      setTitle(gifItem.title);
    }
  };

  // Remove attached media
  const handleRemoveMedia = () => {
    setMediaUrl('');
    setMediaAnalysis(null);
    setImageCaption('');
    setMediaType('image');
  };

  // Handle Submission
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a title or headline for the post.');
      return;
    }
    if (title.trim().length < 5) {
      setError('Headline must be at least 5 characters long.');
      return;
    }

    setIsPublishing(true);
    setError('');

    try {
      const authorName = user?.username || user?.name || 'you';
      const authorRole = targetType === 'personal' ? 'Analyst' : 'Community Contributor';

      let desk = selectedCommunityObj?.id || 'technology';
      let deskName = selectedCommunityObj?.label || 'Technology Wire';
      let deskSlug = selectedCommunityObj?.name || 'c/technology';
      let deskColor = selectedCommunityObj?.color || '#008751';
      let category = selectedCommunityObj?.category || 'technology';

      if (targetType === 'personal') {
        desk = `u/${authorName}`;
        deskName = `u/${authorName}'s Personal Wire`;
        deskSlug = `u/${authorName}`;
        deskColor = '#008751';
      }

      const postPayload = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || content.trim().slice(0, 240) || title.trim(),
        author: authorName,
        authorRole,
        authorAvatar: user?.avatar || '',
        desk,
        deskName,
        deskSlug,
        deskColor,
        category,
        topics: topics.length > 0 ? topics : [desk.replace(/^c\//, '')],
        hasMedia: Boolean(mediaUrl),
        mediaType: mediaType || 'image',
        mediaUrl: mediaUrl.trim(),
        imageUrl: mediaUrl.trim(),
        imageCaption: imageCaption.trim(),
        aspectRatio: mediaAnalysis?.aspectRatioLabel || '16:9',
      };

      const res = await feedApi.createPost(postPayload);
      if (res && res.success && res.post) {
        if (onPostCreated) {
          onPostCreated(res.post);
        }
        onClose();
      } else {
        throw new Error(res?.message || 'Publishing failed');
      }
    } catch (err) {
      console.error('Publish error:', err);
      setError(err.message || 'Unable to publish post. Please verify connection.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="onboarding-overlay" onClick={onClose}>
      <div
        className="onboarding-modal-container"
        style={{ maxWidth: '680px', width: '94%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="onboarding-card animate-fade-in" style={{ padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div className="modal-header-with-close" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(0, 135, 81, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#008751',
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  Create an Intelligence Post
                </h3>
                <p className="modal-subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>
                  Publish real-time reporting, analysis, or multi-modal media with Monolith AI scoring.
                </p>
              </div>
            </div>
            <button type="button" className="modal-close-icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handlePublish} className="create-post-form">
            {/* Target Destination: Community vs Personal */}
            <div className="form-group-field" style={{ marginBottom: '1rem' }}>
              <label className="form-field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PUBLISH DESTINATION</span>
                <span style={{ color: '#008751', fontWeight: 600 }}>
                  {targetType === 'community' ? selectedCommunityObj?.name : `u/${user?.username || 'personal'}`}
                </span>
              </label>

              <div className="create-dest-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  className={`modal-select-type-btn ${targetType === 'community' ? 'active' : ''}`}
                  onClick={() => setTargetType('community')}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: targetType === 'community' ? '1.5px solid #008751' : '1px solid #cbd5e1',
                    background: targetType === 'community' ? 'rgba(0, 135, 81, 0.08)' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: targetType === 'community' ? '#008751' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <Compass size={16} />
                  <span>Editorial Desk / Community</span>
                </button>

                <button
                  type="button"
                  className={`modal-select-type-btn ${targetType === 'personal' ? 'active' : ''}`}
                  onClick={() => setTargetType('personal')}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border: targetType === 'personal' ? '1.5px solid #008751' : '1px solid #cbd5e1',
                    background: targetType === 'personal' ? 'rgba(0, 135, 81, 0.08)' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: targetType === 'personal' ? '#008751' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={16} />
                  <span>Personal Profile Wire (u/{user?.username || 'you'})</span>
                </button>
              </div>

              {targetType === 'community' && (
                <select
                  className="modal-select-field"
                  value={selectedDeskId}
                  onChange={(e) => setSelectedDeskId(e.target.value)}
                  style={{ padding: '0.65rem 0.85rem', width: '100%', borderRadius: '8px' }}
                >
                  {uniqueCommunities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Headline / Title */}
            <div className="form-group-field" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-field-label">HEADLINE / TITLE *</label>
                <span style={{ fontSize: '0.72rem', color: title.length > 280 ? '#dc2626' : '#94a3b8' }}>
                  {title.length}/300
                </span>
              </div>
              <input
                type="text"
                className="onboarding-input"
                style={{ padding: '0.75rem 1rem', width: '100%', fontSize: '0.95rem' }}
                placeholder="Write an informative, analytical headline..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                maxLength={300}
                autoFocus
              />
            </div>

            {/* Content / Context */}
            <div className="form-group-field" style={{ marginBottom: '1rem' }}>
              <label className="form-field-label">DETAILED ANALYSIS / CONTEXT (OPTIONAL)</label>
              <textarea
                className="modal-textarea-field"
                rows={3}
                placeholder="Include background facts, methodologies, or citations..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ width: '100%', borderRadius: '8px' }}
              />
            </div>

            {/* ================= MULTI-MODAL MEDIA ATTACHMENT SUITE ================= */}
            <div
              className="media-attachment-suite"
              style={{
                marginBottom: '1.25rem',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Image size={17} color="#008751" />
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                    Multi-Modal Media (Images & Animated GIFs)
                  </span>
                </div>
                {mediaUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Remove Media</span>
                  </button>
                )}
              </div>

              {/* Media Input Tabs if no media is attached yet */}
              {!mediaUrl && (
                <div>
                  <div className="create-media-tabs-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setMediaTab('upload')}
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: mediaTab === 'upload' ? '#008751' : '#cbd5e1',
                        background: mediaTab === 'upload' ? '#008751' : '#fff',
                        color: mediaTab === 'upload' ? '#fff' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <UploadCloud size={14} />
                      <span>Upload File / GIF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaTab('url')}
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: mediaTab === 'url' ? '#008751' : '#cbd5e1',
                        background: mediaTab === 'url' ? '#008751' : '#fff',
                        color: mediaTab === 'url' ? '#fff' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <LinkIcon size={14} />
                      <span>Image / GIF URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaTab('trending')}
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: mediaTab === 'trending' ? '#008751' : '#cbd5e1',
                        background: mediaTab === 'trending' ? '#008751' : '#fff',
                        color: mediaTab === 'trending' ? '#fff' : '#475569',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Film size={14} />
                      <span>Trending Analytical GIFs</span>
                    </button>
                  </div>

                  {/* TAB 1: File Upload */}
                  {mediaTab === 'upload' && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '2px dashed #cbd5e1',
                        borderRadius: '10px',
                        padding: '1.5rem',
                        textAlign: 'center',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      {isUploading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <Loader2 size={24} className="animate-spin" color="#008751" />
                          <span style={{ fontSize: '0.84rem', color: '#475569' }}>
                            Running Monolith AI media analyzer on upload...
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                          <UploadCloud size={28} color="#008751" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                            Click to browse or drag & drop image or animated GIF
                          </span>
                          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            PNG, JPG, WebP, GIF supported (up to 25MB)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: URL Input */}
                  {mediaTab === 'url' && (
                    <div className="create-url-analyze-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <input
                        type="url"
                        className="onboarding-input"
                        placeholder="Paste image or GIF URL (e.g. Tenor, Giphy, Unsplash)..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleInspectUrl(urlInput)}
                        disabled={isAnalyzing || !urlInput.trim()}
                        className="btn-primary"
                        style={{
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          backgroundColor: '#008751',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        <span>Analyze & Attach</span>
                      </button>
                    </div>
                  )}

                  {/* TAB 3: Quick Trending GIFs */}
                  {mediaTab === 'trending' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '0.6rem',
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}
                    >
                      {QUICK_TRENDING_GIFS.map((g, idx) => (
                        <div
                          key={`quick-gif-${idx}`}
                          onClick={() => handlePickTrendingGif(g)}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: '#fff',
                            cursor: 'pointer',
                            position: 'relative',
                          }}
                        >
                          <img
                            src={g.url}
                            alt={g.title}
                            style={{ width: '100%', height: '90px', objectFit: 'cover' }}
                            loading="lazy"
                          />
                          <div style={{ padding: '0.4rem', fontSize: '0.74rem' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {g.title}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#008751', fontWeight: 600 }}>
                              {g.category}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ATTACHED MEDIA PREVIEW & MONOLITH AI INSPECTOR */}
              {mediaUrl && (
                <div className="attached-media-container animate-fade-in">
                  <div
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#0f172a',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxHeight: '280px',
                    }}
                  >
                    <img
                      src={mediaUrl}
                      alt="Attached media"
                      style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: mediaType === 'gif' ? '#eab308' : '#38bdf8',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {mediaType === 'gif' ? '🎬 ANIMATED GIF' : '📸 IMAGE'}
                    </div>
                  </div>

                  {/* Caption Input */}
                  <input
                    type="text"
                    className="onboarding-input"
                    placeholder="Add an editorial caption or photo credit (optional)..."
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    style={{ padding: '0.6rem 0.85rem', width: '100%', fontSize: '0.82rem', marginBottom: '0.75rem' }}
                  />

                  {/* Real-Time Monolith AI Visual Inspector Card */}
                  {mediaAnalysis && (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.45rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#008751' }}>
                          <Cpu size={14} />
                          <span>Monolith Multi-Modal AI Visual Analysis</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                          Format: {mediaAnalysis.aspectRatioLabel || '16:9'} ({mediaAnalysis.width}x{mediaAnalysis.height})
                        </span>
                      </div>

                      <div className="monolith-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <div style={{ backgroundColor: '#f1f5f9', padding: '0.4rem', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Quality Score</div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            {Math.round((mediaAnalysis.visualQualityScore || 0.8) * 100)}%
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#f1f5f9', padding: '0.4rem', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Complexity Index</div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            {mediaAnalysis.visualComplexity ? mediaAnalysis.visualComplexity.toFixed(2) : '0.50'}
                          </div>
                        </div>

                        <div style={{ backgroundColor: '#f1f5f9', padding: '0.4rem', borderRadius: '6px' }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {mediaAnalysis.isAnimated ? 'Loop Duration' : 'Exposure'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            {mediaAnalysis.isAnimated
                              ? `${mediaAnalysis.frameCount || 1}f (${((mediaAnalysis.animationDurationMs || 2000) / 1000).toFixed(1)}s)`
                              : 'Balanced'}
                          </div>
                        </div>
                      </div>

                      {/* Color Palette Swatches */}
                      {mediaAnalysis.colorPalette && mediaAnalysis.colorPalette.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Palette:</span>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {mediaAnalysis.colorPalette.map((col, cIdx) => (
                              <div
                                key={`col-${cIdx}`}
                                title={col}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  backgroundColor: col,
                                  border: '1px solid rgba(0,0,0,0.15)',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Topics / Tags */}
            <div className="form-group-field" style={{ marginBottom: '1.25rem' }}>
              <label className="form-field-label">TOPICS / TAGS</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="e.g. quantum-computing, artificial-intelligence, biotechnology..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTopic();
                    }
                  }}
                  style={{ flex: 1, padding: '0.65rem 0.85rem', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={handleAddTopic}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Add Tag
                </button>
              </div>

              {topics.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {topics.map((t) => (
                    <span
                      key={t}
                      style={{
                        backgroundColor: 'rgba(0, 135, 81, 0.1)',
                        color: '#008751',
                        borderRadius: '6px',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTopic(t)}
                        style={{ background: 'none', border: 'none', color: '#008751', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#dc2626',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="onboarding-actions-row" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="feed-select-all-btn"
                onClick={onClose}
                disabled={isPublishing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="onboarding-next-btn btn-primary"
                disabled={isPublishing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#008751',
                }}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Publishing to Wire...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Publish Intelligence Post</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
