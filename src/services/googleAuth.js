/**
 * Triggers official Google OAuth 2.0 flow using Google Identity Services (GIS).
 * Opens Google's native authorization window directly with zero custom interstitial modals.
 */
export const triggerGoogleAuth = ({ onToken, onError }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId || !clientId.trim()) {
    throw new Error('Google Client ID is not configured. Please set VITE_GOOGLE_CLIENT_ID in frontend/.env');
  }

  // Priority 1: Google OAuth2 token client (official Google popup window)
  if (window.google?.accounts?.oauth2) {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'openid email profile',
        callback: (response) => {
          if (response.error) {
            onError?.(response.error_description || response.error);
            return;
          }
          if (response.access_token) {
            onToken?.({ accessToken: response.access_token });
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
      return;
    } catch (err) {
      console.warn('Token client init error, falling back to ID prompt:', err);
    }
  }

  // Priority 2: Google Identity Services ID Token One-Tap / Prompt
  if (window.google?.accounts?.id) {
    try {
      window.google.accounts.id.initialize({
        client_id: clientId.trim(),
        callback: (response) => {
          if (response.credential) {
            onToken?.({ credential: response.credential });
          }
        },
        auto_select: false,
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          onError?.('Google sign-in prompt was closed or blocked by browser.');
        }
      });
      return;
    } catch (err) {
      onError?.(err.message || 'Failed to launch Google authentication.');
      return;
    }
  }

  throw new Error('Google authentication services are still loading. Please try again.');
};

export default triggerGoogleAuth;
