import { Client } from '@stomp/stompjs';
import { getAuth } from '../../utils/Auth';

class StompService {
    constructor() {
        this.client = null;
        this.subscriptions = new Map(); // topic -> { subscription, callback }
        this.connectionState = 'DISCONNECTED'; // DISCONNECTED | CONNECTING | CONNECTED
        this.onConnectCallbacks = new Set();
        this.onDisconnectCallbacks = new Set();
    }

    /**
     * Compute Native WebSocket URL (ws:// or wss://)
     */
    getWsUrl() {
        const apiBase = import.meta.env.VITE_API_BASE_URL || '';
        
        if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
            const serverOrigin = apiBase.replace(/\/api\/?$/, '');
            return serverOrigin.replace(/^http/, 'ws') + '/ws';
        }
        
        // Relative path -> use window.location.host so Vite proxy handles /ws
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
    }

    /**
     * Connect to STOMP WebSocket server using pure Native WebSockets
     */
    connect() {
        if (this.client && (this.connectionState === 'CONNECTED' || this.connectionState === 'CONNECTING')) {
            return;
        }

        const auth = getAuth();
        const token = auth?.token;

        if (!token) {
            console.warn('[StompService] Cannot connect to WebSocket: No auth token found.');
            return;
        }

        const wsUrl = this.getWsUrl();
        this.connectionState = 'CONNECTING';
        console.log(`[StompService] Connecting via Native WebSocket to: ${wsUrl}`);

        this.client = new Client({
            brokerURL: wsUrl,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
                token: token, // Fallback header
            },
            debug: (str) => {
                if (import.meta.env.DEV) {
                    console.log('[STOMP Debug]', str);
                }
            },
            reconnectDelay: 3000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        });

        this.client.onConnect = (frame) => {
            this.connectionState = 'CONNECTED';
            console.log('[StompService] Connected successfully to WebSocket STOMP');

            // Notify connect listeners
            this.onConnectCallbacks.forEach((cb) => cb(frame));

            // Resubscribe active topics after reconnection
            this.subscriptions.forEach((subObj, topic) => {
                const sub = this._doSubscribe(topic, subObj.callback);
                subObj.subscription = sub;
            });
        };

        this.client.onStompError = (frame) => {
            console.error('[StompService] STOMP Error:', frame.headers['message'], frame.body);
            this.connectionState = 'DISCONNECTED';
            this.onDisconnectCallbacks.forEach((cb) => cb(frame));
        };

        this.client.onWebSocketClose = () => {
            console.log('[StompService] WebSocket connection closed');
            this.connectionState = 'DISCONNECTED';
            this.onDisconnectCallbacks.forEach((cb) => cb());
        };

        this.client.activate();
    }

    /**
     * Internal subscribe execution
     */
    _doSubscribe(topic, callback) {
        if (!this.client || !this.client.connected) return null;

        console.log(`[StompService] Subscribing to STOMP topic: ${topic}`);
        const stompSubscription = this.client.subscribe(topic, (message) => {
            try {
                const parsedBody = JSON.parse(message.body);
                console.log(`[StompService] Received STOMP message on ${topic}:`, parsedBody);
                callback(parsedBody, message);
            } catch (err) {
                console.error(`[StompService] Failed to parse message on topic ${topic}:`, err);
                callback(message.body, message);
            }
        });

        return stompSubscription;
    }

    /**
     * Subscribe to a topic (e.g. /topic/chat/global)
     * @param {string} topic
     * @param {Function} callback
     * @returns {string} subscription topic key
     */
    subscribe(topic, callback) {
        if (this.subscriptions.has(topic)) {
            this.unsubscribe(topic);
        }

        let stompSub = null;
        if (this.connectionState === 'CONNECTED') {
            stompSub = this._doSubscribe(topic, callback);
        } else {
            this.connect();
        }

        this.subscriptions.set(topic, {
            subscription: stompSub,
            callback,
        });

        return topic;
    }

    /**
     * Unsubscribe from a topic
     * @param {string} topic
     */
    unsubscribe(topic) {
        if (this.subscriptions.has(topic)) {
            const subObj = this.subscriptions.get(topic);
            if (subObj && subObj.subscription) {
                try {
                    subObj.subscription.unsubscribe();
                } catch (err) {
                    console.error(`[StompService] Unsubscribe error for topic ${topic}:`, err);
                }
            }
            this.subscriptions.delete(topic);
        }
    }

    /**
     * Publish a message via STOMP (e.g., /app/chat/send)
     * @param {string} destination
     * @param {Object} body
     */
    publish(destination, body) {
        if (this.client && this.client.connected && this.connectionState === 'CONNECTED') {
            console.log(`[StompService] Publishing to ${destination}:`, body);
            this.client.publish({
                destination,
                body: JSON.stringify(body),
            });
            return true;
        }
        console.warn('[StompService] Cannot publish: STOMP client not connected');
        return false;
    }

    /**
     * Register connect listener callback
     */
    onConnect(cb) {
        this.onConnectCallbacks.add(cb);
        return () => this.onConnectCallbacks.delete(cb);
    }

    /**
     * Register disconnect listener callback
     */
    onDisconnect(cb) {
        this.onDisconnectCallbacks.add(cb);
        return () => this.onDisconnectCallbacks.delete(cb);
    }

    /**
     * Check if currently connected
     */
    isConnected() {
        return this.connectionState === 'CONNECTED';
    }

    /**
     * Disconnect STOMP client
     */
    disconnect() {
        if (this.client) {
            this.subscriptions.forEach((subObj) => {
                if (subObj.subscription) {
                    try {
                        subObj.subscription.unsubscribe();
                    } catch (e) { /* ignore */ }
                }
            });
            this.subscriptions.clear();
            this.client.deactivate();
            this.client = null;
            this.connectionState = 'DISCONNECTED';
            console.log('[StompService] Disconnected');
        }
    }
}

const stompServiceInstance = new StompService();
export default stompServiceInstance;
