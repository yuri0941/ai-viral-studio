import { useState, useCallback, useRef, useEffect } from 'react';

const SOUND_FILES = {
  click: '/sounds/click.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  notification: '/sounds/notification.mp3',
  send: '/sounds/send.mp3'
};

const audioCache = {};

function getAudio(name) {
  const src = SOUND_FILES[name];
  if (!src) return null;
  if (!audioCache[name]) {
    const audio = new Audio(src);
    audio.volume = 0.4;
    audioCache[name] = audio;
  }
  return audioCache[name];
}

export function playSound(name) {
  const audio = getAudio(name);
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

export function useSound() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('omega-sound-enabled');
    return stored === null ? true : stored === 'true';
  });
  const refs = useRef({});

  useEffect(() => {
    if (enabled) {
      Object.entries(SOUND_FILES).forEach(([key, src]) => {
        const audio = refs.current[key] || new Audio(src);
        audio.volume = 0.4;
        refs.current[key] = audio;
      });
    }
  }, [enabled]);

  const play = useCallback((name) => {
    if (!enabled) return;
    const audio = refs.current[name];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      localStorage.setItem('omega-sound-enabled', String(next));
      return next;
    });
  }, []);

  return { play, enabled, toggle, sounds: Object.keys(SOUND_FILES) };
}
