import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Image,
  Link as LinkIcon,
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Cpu,
  Layers,
  Eye,
  Compass,
} from 'lucide-react';
import { feedApi, API_ROOT } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

  // Combine communities from props (loaded from database)
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

  const uniqueCommunities = Array.from(
    new Map(
      allCommunityOptions.filter((item) => item && item.id).map((item) => [item.id, item])
    ).values()
  );

  // Form State
  const [targetType, setTargetType] = useState('community'); // 'community' | 'personal'
  const [selectedDeskId, setSelectedDeskId] = useState(
    () => uniqueCommunities[0]?.id || ''
  );
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState([]);

  // Media State
  const [mediaTab, setMediaTab] = useState('upload'); // 'upload' | 'url'
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
    } else if (!selectedDeskId && uniqueCommunities.length > 0) {
      setSelectedDeskId(uniqueCommunities[0].id);
    }
  }, [defaultCommunity, isOpen, selectedDeskId, uniqueCommunities]);

  if (!isOpen) return null;

  const selectedCommunityObj =
    uniqueCommunities.find((c) => c.id === selectedDeskId) ||
    uniqueCommunities[0] ||
    null;

  // Handle Tag Input
  const handleAddTopic = () => {
    const trimmed = topicInput
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
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
        const fullUrl = res.url.startsWith('http')
          ? res.url
          : `${API_ROOT}${res.url}`;
        setMediaUrl(fullUrl);
        setMediaType(
          res.mediaType || (file.type.includes('gif') ? 'gif' : 'image')
        );
        setMediaAnalysis(res.analysis || null);
      } else {
        throw new Error(res?.message || 'Upload failed');
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
        throw new Error(res?.message || 'Unable to verify and analyze media URL.');
      }
    } catch (err) {
      setError(err.message || 'Unable to analyze media URL.');
    } finally {
      setIsAnalyzing(false);
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

    const authorName = (user?.username || user?.name || '').trim();
    if (!authorName) {
      setError('You must be signed in to publish a post.');
      return;
    }

    if (targetType === 'community' && !selectedCommunityObj) {
      setError('Please select a community destination.');
      return;
    }

    setIsPublishing(true);
    setError('');

    try {
      const authorRole = user?.role || '';

      let desk = selectedCommunityObj?.id || '';
      let deskName = selectedCommunityObj?.label || selectedCommunityObj?.name || '';
      let deskSlug = selectedCommunityObj?.name || '';
      let deskColor = selectedCommunityObj?.color || '#008751';
      let category = selectedCommunityObj?.category || selectedCommunityObj?.id || '';

      if (targetType === 'personal') {
        desk = `u/${authorName}`;
        deskName = `u/${authorName}`;
        deskSlug = `u/${authorName}`;
        deskColor = '#008751';
        category = `u/${authorName}`;
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
        topics,
        hasMedia: Boolean(mediaUrl),
        mediaType: mediaUrl ? mediaType : '',
        mediaUrl: mediaUrl.trim(),
        imageUrl: mediaUrl.trim(),
        imageCaption: imageCaption.trim(),
        aspectRatio: mediaAnalysis?.aspectRatioLabel || '',
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
        <div
          className="onboarding-card animate-fade-in"
          style={{ padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto' }}
        >
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
                <Layers size={20} />
              </div>
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  Create a Post
                </h3>
                <p className="modal-subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>
                  Publish user-generated reporting, analysis, or media.
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
              <label
                className="form-field-label"
                style={{ display: 'flex', justifyContent: 'space-between' }}
              >
                <span>PUBLISH DESTINATION</span>
                <span style={{ color: '#008751', fontWeight: 600 }}>
                  {targetType === 'community'
                    ? selectedCommunityObj?.name || ''
                    : user?.username
                    ? `u/${user.username}`
                    : ''}
                </span>
              </label>

              <div
                className="create-dest-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.65rem',
                  marginBottom: '0.75rem',
                }}
              >
                <button
                  type="button"
                  className={`modal-select-type-btn ${targetType === 'community' ? 'active' : ''}`}
                  onClick={() => setTargetType('community')}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border:
                      targetType === 'community'
                        ? '1.5px solid #008751'
                        : '1px solid #cbd5e1',
                    background:
                      targetType === 'community' ? 'rgba(0, 135, 81, 0.08)' : '#fff',
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
                  <span>Community</span>
                </button>

                <button
                  type="button"
                  className={`modal-select-type-btn ${targetType === 'personal' ? 'active' : ''}`}
                  onClick={() => setTargetType('personal')}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    border:
                      targetType === 'personal'
                        ? '1.5px solid #008751'
                        : '1px solid #cbd5e1',
                    background:
                      targetType === 'personal' ? 'rgba(0, 135, 81, 0.08)' : '#fff',
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
                  <span>
                    Personal Profile {user?.username ? `(u/${user.username})` : ''}
                  </span>
                </button>
              </div>

              {targetType === 'community' && uniqueCommunities.length > 0 && (
                <select
                  className="modal-select-field"
                  value={selectedDeskId}
                  onChange={(e) => setSelectedDeskId(e.target.value)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    width: '100%',
                    borderRadius: '8px',
                  }}
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label className="form-field-label">HEADLINE / TITLE *</label>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: title.length > 280 ? '#dc2626' : '#94a3b8',
                  }}
                >
                  {title.length}/300
                </span>
              </div>
              <input
                type="text"
                className="onboarding-input"
                style={{
                  padding: '0.75rem 1rem',
                  width: '100%',
                  fontSize: '0.95rem',
                }}
                placeholder="Write a headline..."
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
              <label className="form-field-label">
                ARTICLE BODY / CONTEXT (OPTIONAL)
              </label>
              <textarea
                className="modal-textarea-field"
                rows={4}
                placeholder="Write your full story or analysis..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ width: '100%', borderRadius: '8px' }}
              />
            </div>

            {/* ================= MEDIA ATTACHMENT SUITE ================= */}
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
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Image size={17} color="#008751" />
                  <span
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    Media Attachment (Images & GIFs)
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
                  <div
                    className="create-media-tabs-row"
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
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
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <Loader2
                            size={24}
                            className="animate-spin"
                            color="#008751"
                          />
                          <span style={{ fontSize: '0.84rem', color: '#475569' }}>
                            Uploading and analyzing media...
                          </span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <UploadCloud size={28} color="#008751" />
                          <span
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              color: '#1e293b',
                            }}
                          >
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
                    <div
                      className="create-url-analyze-row"
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
                    >
                      <input
                        type="url"
                        className="onboarding-input"
                        placeholder="Paste direct image or GIF URL..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '0.65rem 0.85rem',
                          fontSize: '0.85rem',
                        }}
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
                        {isAnalyzing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        <span>Analyze & Attach</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ATTACHED MEDIA PREVIEW & REAL VISUAL INSPECTOR */}
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
                      style={{
                        maxWidth: '100%',
                        maxHeight: '280px',
                        objectFit: 'contain',
                      }}
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
                      {mediaType === 'gif' ? 'ANIMATED GIF' : 'IMAGE'}
                    </div>
                  </div>

                  {/* Caption Input */}
                  <input
                    type="text"
                    className="onboarding-input"
                    placeholder="Add a caption or credit (optional)..."
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    style={{
                      padding: '0.6rem 0.85rem',
                      width: '100%',
                      fontSize: '0.82rem',
                      marginBottom: '0.75rem',
                    }}
                  />

                  {/* Real-Time Monolith AI Visual Inspector Card (strictly real decoded metrics) */}
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.35rem',
                          marginBottom: '0.45rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 800,
                            color: '#008751',
                          }}
                        >
                          <Cpu size={14} />
                          <span>Visual Media Analysis</span>
                        </div>
                        {mediaAnalysis.width > 0 && mediaAnalysis.height > 0 && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: '#64748b',
                              fontWeight: 600,
                            }}
                          >
                            {mediaAnalysis.aspectRatioLabel
                              ? `${mediaAnalysis.aspectRatioLabel} `
                              : ''}
                            ({mediaAnalysis.width}x{mediaAnalysis.height})
                          </span>
                        )}
                      </div>

                      <div
                        className="monolith-metrics-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.5rem',
                          marginBottom: '0.45rem',
                        }}
                      >
                        {typeof mediaAnalysis.visualQualityScore === 'number' && (
                          <div
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '0.4rem',
                              borderRadius: '6px',
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              Quality Score
                            </div>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>
                              {Math.round(mediaAnalysis.visualQualityScore * 100)}%
                            </div>
                          </div>
                        )}

                        {typeof mediaAnalysis.visualComplexity === 'number' && (
                          <div
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '0.4rem',
                              borderRadius: '6px',
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                              Complexity Index
                            </div>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>
                              {mediaAnalysis.visualComplexity.toFixed(2)}
                            </div>
                          </div>
                        )}

                        <div
                          style={{
                            backgroundColor: '#f1f5f9',
                            padding: '0.4rem',
                            borderRadius: '6px',
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            {mediaAnalysis.isAnimated ? 'Frames' : 'Luminance'}
                          </div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            {mediaAnalysis.isAnimated
                              ? `${mediaAnalysis.frameCount}f (${(
                                  mediaAnalysis.animationDurationMs / 1000
                                ).toFixed(1)}s)`
                              : typeof mediaAnalysis.luminance === 'number'
                              ? mediaAnalysis.luminance.toFixed(2)
                              : '—'}
                          </div>
                        </div>
                      </div>

                      {/* Color Palette Swatches */}
                      {Array.isArray(mediaAnalysis.colorPalette) &&
                        mediaAnalysis.colorPalette.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginTop: '0.35rem',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.68rem',
                                color: '#64748b',
                                fontWeight: 600,
                              }}
                            >
                              Palette:
                            </span>
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
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="Add topic tag..."
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTopic();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.85rem',
                  }}
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
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#008751',
                          cursor: 'pointer',
                          padding: 0,
                        }}
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
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Publish Post</span>
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
