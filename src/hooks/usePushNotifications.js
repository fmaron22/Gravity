import { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';

// This key will be injected from Env Vars (Public)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkSubscription();
    }, []);

    const urlBase64ToUint8Array = (base64String) => {
        if (!base64String) return new Uint8Array();
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (e) {
            console.error(e);
        }
    };

    const subscribeToPush = async () => {
        setLoading(true);
        try {
            if (!VAPID_PUBLIC_KEY) throw new Error("Missing VAPID Key configuration");

            const registration = await navigator.serviceWorker.ready;

            // 1. Request Browser Permission (Native Prompt)
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error("Permission denied");
            }

            // 2. Subscribe to Push Service (Google/Apple)
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // 3. Send Subscription to Our DB
            await dataService.savePushSubscription(subscription);

            setIsSubscribed(true);
            alert("Notifications Enabled! 🔔");

        } catch (err) {
            console.error("Push Error:", err);
            setError(err.message);
            alert("Failed to enable notifications: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return { isSubscribed, subscribeToPush, loading, error };
}
