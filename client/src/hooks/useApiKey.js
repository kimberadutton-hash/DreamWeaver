import { useState } from 'react';
import { API_KEY_NAME } from '../lib/constants';

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(API_KEY_NAME) || '');

  function saveApiKey(key) {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(API_KEY_NAME, trimmed);
    } else {
      localStorage.removeItem(API_KEY_NAME);
    }
    setApiKeyState(trimmed);
  }

  return { apiKey, saveApiKey, hasKey: !!apiKey };
}
