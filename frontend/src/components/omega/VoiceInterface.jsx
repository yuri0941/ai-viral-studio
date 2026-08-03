import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Volume2, Loader2, AlertCircle } from 'lucide-react'

export function VoiceInterface({ onTranscript, textToSpeak, compact = false }) {
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [elevenLabsInfo, setElevenLabsInfo] = useState(null)
    const audioRef = useRef(null)
    // [P19] added: MediaRecorder refs for backend STT
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])

    const checkElevenLabs = useCallback(async () => {
        try {
            const res = await fetch('/api/omega/voice/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: 'test' }),
            })
            const json = await res.json()
            if (json?.data?.status === 'fallback' && json.data.message) {
                setElevenLabsInfo(json.data.message)
            }
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        checkElevenLabs()
    }, [checkElevenLabs])

    // [P19] added: fallback Web Speech API STT
    const startWebSpeechFallback = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
            alert('Голосовой ввод не поддерживается в этом браузере')
            return
        }
        const recognition = new SpeechRecognition()
        recognition.lang = 'ru-RU'
        recognition.interimResults = false
        recognition.maxAlternatives = 1
        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript
            onTranscript?.(transcript)
        }
        recognition.onerror = () => setIsListening(false)
        recognition.start()
    }

    // [P19] added: backend Whisper STT via MediaRecorder
    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            startWebSpeechFallback()
            return
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                setIsListening(false)
                stream.getTracks().forEach(t => t.stop())
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                if (blob.size === 0) return
                try {
                    const token = localStorage.getItem('token')
                    const formData = new FormData()
                    formData.append('audio', blob, 'recording.webm')
                    const res = await fetch('/api/omega/voice/stt', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                    })
                    const json = await res.json()
                    const data = json?.data
                    if (data?.status === 'ok' && data.transcript) {
                        onTranscript?.(data.transcript)
                    } else {
                        setElevenLabsInfo(data?.message || 'Распознавание недоступно, пробуем браузерный ввод')
                        startWebSpeechFallback()
                    }
                } catch (err) {
                    console.error('[VoiceInterface:stt]', err)
                    startWebSpeechFallback()
                }
            }

            mediaRecorder.start()
            setIsListening(true)
        } catch (err) {
            console.error('[VoiceInterface:mic]', err)
            startWebSpeechFallback()
        }
    }

    const stopRecording = () => {
        try {
            mediaRecorderRef.current?.stop()
        } catch {}
    }

    const speak = async () => {
        if (!textToSpeak) return
        setIsSpeaking(true)
        try {
            const res = await fetch('/api/omega/voice/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSpeak }),
            })
            const json = await res.json()
            const data = json?.data

            if (data?.status === 'ok' && data.audioBase64) {
                const audio = new Audio(`data:${data.contentType || 'audio/mpeg'};base64,${data.audioBase64}`)
                audioRef.current = audio
                audio.onended = () => setIsSpeaking(false)
                audio.play()
            } else {
                // Fallback to browser TTS
                const utterance = new SpeechSynthesisUtterance(textToSpeak)
                utterance.lang = 'ru-RU'
                utterance.onend = () => setIsSpeaking(false)
                window.speechSynthesis.speak(utterance)
                if (data?.message) setElevenLabsInfo(data.message)
            }
        } catch (err) {
            console.error('Voice speak error:', err)
            const utterance = new SpeechSynthesisUtterance(textToSpeak)
            utterance.lang = 'ru-RU'
            utterance.onend = () => setIsSpeaking(false)
            window.speechSynthesis.speak(utterance)
        }
    }

    if (compact) {
        return (
            <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                title={isListening ? 'Слушаю...' : 'Голосовой ввод (удерживайте)'}
                aria-label="Голосовой ввод"
            >
                <Mic size={16} />
            </button>
        )
    }

    return (
        <div className="rounded-2xl bg-[#0f0f1a] border border-white/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
                <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onMouseLeave={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        isListening ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                    }`}
                >
                    {isListening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                </button>
                <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                        {isListening ? 'Слушаю... отпустите, когда закончите' : 'Зажмите 🎤 и говорите'}
                    </div>
                    <div className="text-xs text-gray-500">
                        {isListening ? 'Распознавание через OMEGA Whisper' : 'Текст появится в поле ввода'}
                    </div>
                </div>
                {textToSpeak && (
                    <button
                        onClick={speak}
                        disabled={isSpeaking}
                        className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                        title="Озвучить"
                    >
                        {isSpeaking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                )}
            </div>
            {elevenLabsInfo && (
                <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4" />
                    {elevenLabsInfo}
                </div>
            )}
        </div>
    )
}

export default VoiceInterface
