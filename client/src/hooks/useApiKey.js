import { useState } from 'react';

const KEY_NAME = 'anthropic_api_key';

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem(KEY_NAME) || '');

  function saveApiKey(key) {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(KEY_NAME, trimmed);
    } else {
      localStorage.removeItem(KEY_NAME);
    }
    setApiKeyState(trimmed);
  }

  return { apiKey, saveApiKey, hasKey: !!apiKey };
}
