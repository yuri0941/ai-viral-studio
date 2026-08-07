import { useState, useCallback, useRef, useEffect } from 'react';
import { voiceApi } from '../services/api';

export function useTTS() {
    const [playingId, setPlayingId] = useState(null);
    const [loadingId, setLoadingId] = useState(null);
    const [settings, setSettings] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('omega_voice_settings')) || {
                voiceId: 'ru-RU-female',
                speed: 1.0,
                pitch: 'normal',
                accent: 'ru',
            };
        } catch {
            return { voiceId: 'ru-RU-female', speed: 1.0, pitch: 'normal', accent: 'ru' };
        }
    });
    const audioRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('omega_voice_settings', JSON.stringify(settings));
    }, [settings]);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
        setPlayingId(null);
    }, []);

    const speak = useCallback(async (text, messageId) => {
        if (playingId === messageId) {
            stop();
            return;
        }
        stop();
        setLoadingId(messageId);
        try {
            const res = await voiceApi.speak(text, settings.voiceId);
            const audioUrl = res?.audioUrl || res?.data?.audioUrl;
            if (!audioUrl || audioUrl === 'placeholder') {
                setLoadingId(null);
                return { placeholder: true };
            }
            const audio = new Audio(audioUrl);
            audio.playbackRate = settings.speed;
            audioRef.current = audio;
            audio.onended = () => setPlayingId(null);
            audio.onerror = () => setPlayingId(null);
            await audio.play();
            setPlayingId(messageId);
            return { playing: true };
        } catch (err) {
            console.error('[useTTS] speak failed', err);
        } finally {
            setLoadingId(null);
        }
    }, [playingId, settings, stop]);

    return { speak, stop, playingId, loadingId, settings, setSettings };
}
