// Hook for reading and updating AI privacy settings from the user's profile.
//
// Privacy settings are stored in profiles.privacy_settings (jsonb):
//   share_notes_with_ai: boolean (default false)
//   share_analyst_session_with_ai: boolean (default false)
//
// IMPORTANT: AI-generated reflections stored in Supabase may have been informed
// by notes or analyst_session content when sharing was enabled at analysis time.
// The notes/analyst_session themselves are never stored in the reflection field —
// only the AI's interpretation of them. Disabling sharing stops future inclusion
// but does not alter past analyses.

import { useAuth } from '../contexts/AuthContext';

const DEFAULTS = {
  share_notes_with_ai: false,
  share_analyst_session_with_ai: false,
};

export function usePrivacySettings() {
  const { profile, updateProfile } = useAuth();

  // Merge stored settings over defaults so any new keys always have a safe value
  const privacySettings = { ...DEFAULTS, ...(profile?.privacy_settings || {}) };

  // Pass a partial object to patch individual keys without overwriting others
  async function savePrivacySettings(patch) {
    return updateProfile({ privacy_settings: { ...privacySettings, ...patch } });
  }

  return { privacySettings, savePrivacySettings };
}
