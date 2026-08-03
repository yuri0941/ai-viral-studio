// [P19] added: sound design hook + utility

const SOUNDS = {
  'omega-activate': '/sounds/omega-activate.mp3',
  'message-sent': '/sounds/message-sent.mp3',
  notification: '/sounds/notification.mp3',
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
}

export function playSound(name) {
  try {
    const enabled = localStorage.getItem('omega_sound_enabled') !== 'false'
    if (!enabled) return
    const src = SOUNDS[name]
    if (!src) return
    const audio = new Audio(src)
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch {
    // ignore
  }
}

export function useSound() {
  return { playSound }
}

export default useSound
