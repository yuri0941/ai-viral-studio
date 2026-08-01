import { useEffect, useState } from 'react'

let Camera, PushNotifications, App, SplashScreen

export function isCapacitor() {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
}

async function loadPlugins() {
    if (!isCapacitor()) return false
    try {
        const cameraMod = await import('@capacitor/camera')
        const pushMod = await import('@capacitor/push-notifications')
        const appMod = await import('@capacitor/app')
        const splashMod = await import('@capacitor/splash-screen')
        Camera = cameraMod.Camera
        PushNotifications = pushMod.PushNotifications
        App = appMod.App
        SplashScreen = splashMod.SplashScreen
        return true
    } catch (err) {
        console.warn('[Capacitor] plugin load failed:', err.message)
        return false
    }
}

export function useCapacitor() {
    const [ready, setReady] = useState(false)
    const [pushToken, setPushToken] = useState(null)

    useEffect(() => {
        loadPlugins().then(ok => {
            setReady(ok)
            if (ok) {
                SplashScreen?.hide()
                initPush(setPushToken)
                initDeeplinks()
            }
        })
    }, [])

    return { ready, pushToken, takePhoto, requestBiometric }
}

async function initPush(setToken) {
    try {
        await PushNotifications.requestPermissions()
        await PushNotifications.register()
        PushNotifications.addListener('registration', token => setToken(token.value))
        PushNotifications.addListener('pushNotificationReceived', notification => {
            console.log('[Push] received', notification)
        })
    } catch (err) {
        console.warn('[Capacitor] push init failed:', err.message)
    }
}

async function initDeeplinks() {
    App.addListener('appUrlOpen', data => {
        const url = new URL(data.url)
        const path = url.pathname || '/'
        window.history.pushState({}, '', path)
    })
}

export async function takePhoto() {
    if (!Camera) return null
    try {
        const photo = await Camera.getPhoto({
            resultType: 'uri',
            source: 'prompt',
            quality: 90,
        })
        return photo.webPath || photo.path
    } catch (err) {
        console.warn('[Capacitor] takePhoto failed:', err.message)
        return null
    }
}

export async function requestBiometric() {
    if (!isCapacitor()) return true
    try {
        const { NativeBiometric } = await import('@aparajita/capacitor-biometric-auth')
        const result = await NativeBiometric.verifyIdentity({
            reason: 'Подтвердите личность',
            title: 'AI Viral Studio',
            cancelTitle: 'Отмена',
        })
        return result.verified
    } catch (err) {
        console.warn('[Capacitor] biometric failed:', err.message)
        return false
    }
}

export default useCapacitor
