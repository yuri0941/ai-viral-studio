import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

export function useSocket() {
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt') || ''
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', (err) => {
      console.warn('[socket] connection error:', err.message)
      setConnected(false)
    })

    socket.on('new_notification', (data) => {
      setLastEvent({ type: 'new_notification', data, at: Date.now() })
    })
    socket.on('chat_message', (data) => {
      setLastEvent({ type: 'chat_message', data, at: Date.now() })
    })
    socket.on('task_update', (data) => {
      setLastEvent({ type: 'task_update', data, at: Date.now() })
    })
    socket.on('approval_request', (data) => {
      setLastEvent({ type: 'approval_request', data, at: Date.now() })
    })
    socket.on('omega_alert', (data) => {
      setLastEvent({ type: 'omega_alert', data, at: Date.now() })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  return { socket: socketRef.current, connected, lastEvent, emit, on }
}

export default useSocket
