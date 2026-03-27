import { supabase } from './supabase';

// Handles both old entries (stored full public URL) and new ones (stored path)
export function getStoragePath(value) {
  if (!value) return null;
  if (value.startsWith('http')) {
    const marker = '/embodiment-media/';
    const idx = value.indexOf(marker);
    return idx !== -1 ? value.slice(idx + marker.length) : null;
  }
  return value; // already a path
}

export async function getSignedUrl(path) {
  const storagePath = getStoragePath(path);
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from('embodiment-media')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function hydrateSignedUrls(entries) {
  return Promise.all(
    entries.map(async entry => {
      if (!entry.media_url) return entry;
      const signedUrl = await getSignedUrl(entry.media_url);
      return { ...entry, media_url_signed: signedUrl };
    })
  );
}
