import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Image as ImageIcon,
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMediaUrl } from '../../services/api';

/**
 * PostMediaImage renders a post's media (still image or animated GIF)
 * with a high-fidelity shimmer skeleton placeholder ("skewer") while loading,
 * and an interactive full-resolution lightbox preview modal on click.
 */
export default function PostMediaImage({
  src,
  alt = 'Post media',
  className = '',
  wrapperClassName = '',
  aspectRatio,
  isAnimated = false,
  frameCount = 0,
  caption = '',
  postDetailPath,
  enablePreview = true,
  onClick,
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const navigate = useNavigate();
  const resolvedUrl = formatMediaUrl(src);

  // Keyboard shortcut listener to close preview on ESC
  useEffect(() => {
    if (!isPreviewOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPreviewOpen(false);
        setIsZoomed(false);
      }
    };

    // Lock body scroll while lightbox is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isPreviewOpen]);

  if (!resolvedUrl || error) {
    return null;
  }

  // Adaptive placeholder height based on aspect ratio label
  let minHeight = '260px';
  if (aspectRatio === '16:9') minHeight = '240px';
  else if (aspectRatio === '4:3') minHeight = '280px';
  else if (aspectRatio === '1:1') minHeight = '320px';
  else if (aspectRatio === '9:16') minHeight = '380px';

  const containerClasses = [
    wrapperClassName || 'reddit-post-media-wrap',
    'media-skeleton-container',
  ].filter(Boolean).join(' ');

  const handleMediaClick = (e) => {
    e.stopPropagation();
    if (enablePreview) {
      setIsPreviewOpen(true);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <div
        className={containerClasses}
        onClick={handleMediaClick}
        style={{ minHeight: !loaded ? minHeight : undefined }}
        title="Click to preview image"
      >
        {/* Animated GIF Badge Overlay */}
        {isAnimated && (
          <div className="media-gif-badge">
            <span>🎬 GIF</span>
            {frameCount > 0 && <span> • {frameCount}f</span>}
          </div>
        )}

        {/* Hover Expand Hint */}
        {loaded && enablePreview && (
          <div className="media-preview-hint">
            <Maximize2 size={13} />
            <span>Preview</span>
          </div>
        )}

        {/* Shimmer Skeleton Placeholder ("Skewer") while downloading image */}
        {!loaded && (
          <div
            className="media-skeleton-shimmer"
            style={{ minHeight }}
            aria-hidden="true"
          >
            <div className="media-skeleton-icon">
              <ImageIcon size={24} />
            </div>
            <span className="media-skeleton-hint">
              {isAnimated ? 'Loading animated loop...' : 'Loading media...'}
            </span>
          </div>
        )}

        {/* Actual image element with smooth fade-in */}
        <img
          src={resolvedUrl}
          alt={alt}
          className={`${className || 'reddit-post-media-img'} media-img-fade ${
            loaded ? 'media-img-loaded' : 'media-img-loading'
          }`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true);
          }}
        />

        {/* Media caption bar */}
        {caption && (
          <div className="media-caption-bar">{caption}</div>
        )}
      </div>

      {/* Full Resolution Image Lightbox / Preview Modal */}
      {isPreviewOpen &&
        createPortal(
          <div
            className="media-lightbox-overlay animate-fade-in"
            onClick={() => {
              setIsPreviewOpen(false);
              setIsZoomed(false);
            }}
          >
            <div
              className="media-lightbox-container"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar */}
              <div className="media-lightbox-header">
                <div className="media-lightbox-meta">
                  {isAnimated ? (
                    <span className="media-lightbox-badge gif">
                      🎬 Animated GIF {frameCount > 0 ? `(${frameCount}f)` : ''}
                    </span>
                  ) : (
                    <span className="media-lightbox-badge img">🖼️ Image Preview</span>
                  )}
                  {alt && (
                    <span className="media-lightbox-title" title={alt}>
                      {alt}
                    </span>
                  )}
                </div>

                <div className="media-lightbox-actions">
                  <button
                    type="button"
                    className="media-lightbox-btn"
                    onClick={() => setIsZoomed(!isZoomed)}
                    title={isZoomed ? 'Zoom out' : 'Zoom in'}
                  >
                    {isZoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                  </button>

                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="media-lightbox-btn"
                    title="Open original image in new tab"
                  >
                    <ExternalLink size={18} />
                  </a>

                  <button
                    type="button"
                    className="media-lightbox-btn close"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      setIsZoomed(false);
                    }}
                    title="Close preview (Esc)"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Viewport */}
              <div
                className="media-lightbox-viewport"
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? 'Click to zoom out' : 'Click to zoom in'}
              >
                <img
                  src={resolvedUrl}
                  alt={alt}
                  className={`media-lightbox-img ${isZoomed ? 'zoomed' : ''}`}
                />
              </div>

              {/* Footer Bar: Caption & Discussion Button */}
              <div className="media-lightbox-footer">
                <div className="media-lightbox-caption-col">
                  {caption ? (
                    <p className="media-lightbox-caption">{caption}</p>
                  ) : (
                    <span className="media-lightbox-hint-text">
                      Press <kbd>Esc</kbd> or click outside to close
                    </span>
                  )}
                </div>

                {postDetailPath && (
                  <button
                    type="button"
                    className="media-lightbox-discussion-btn"
                    onClick={() => {
                      setIsPreviewOpen(false);
                      setIsZoomed(false);
                      navigate(postDetailPath);
                    }}
                    title="View post and discussion comments"
                  >
                    <MessageSquare size={16} />
                    <span>View Post & Discussion</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
