import { Client } from '@stomp/stompjs';
import { getAuth } from '../../utils/Auth';
import { getWebSocketUrl } from '../../config/apiConfig';

class StompService {
    constructor() {
        this.client = null;
        this.subscriptions = new Map(); // topic -> { subscription, callback }
        this.connectionState = 'DISCONNECTED'; // DISCONNECTED | CONNECTING | CONNECTED
        this.onConnectCallbacks = new Set();
        this.onDisconnectCallbacks = new Set();
        this.currentToken = null;
        this.failedTopics = new Set();
    }

    /**
     * Compute Native WebSocket URL (ws:// or wss://)
     */
    getWsUrl() {
        return getWebSocketUrl();
    }

    /**
     * Connect to STOMP WebSocket server using pure Native WebSockets
     */
    connect() {
        const auth = getAuth();
        const token = auth?.token;

        if (!token) {
            if (this.client) {
                this.disconnect();
            }
            console.warn('[StompService] Cannot connect to WebSocket: No auth token found.');
            return;
        }

        // If client exists and is connected/connecting, verify token match
        if (this.client && (this.connectionState === 'CONNECTED' || this.connectionState === 'CONNECTING')) {
            if (this.currentToken === token) {
                return;
            }
            // User account changed! Disconnect old socket session immediately
            console.log('[StompService] User token changed. Reconnecting WebSocket with active credentials...');
            this.disconnect();
        }

        const wsUrl = this.getWsUrl();
        console.log(`[StompService] Connecting via Native WebSocket to: ${wsUrl}`);
        this.connectionState = 'CONNECTING';
        this.currentToken = token;

        this.client = new Client({
            brokerURL: wsUrl,
            connectHeaders: {
                Authorization: `Bearer ${token}`,
                token: token, // Fallback header
            },
            debug: (str) => {
                if (import.meta.env.DEV && !str.includes('ping') && !str.includes('pong') && !str.includes('scheduling reconnection') && !str.includes('Opening Web Socket') && !str.includes('Connection closed') && !str.includes('Whoops! Lost connection')) {
                    console.log('[STOMP Debug]', str);
                }
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,
        });

        this.client.onConnect = (frame) => {
            this.connectionState = 'CONNECTED';
            this.failedConnectCount = 0;
            if (this.client) this.client.reconnectDelay = 5000;
            console.log('[StompService] Connected successfully to WebSocket STOMP');

            // Notify connect listeners
            this.onConnectCallbacks.forEach((cb) => cb(frame));

            // Resubscribe active topics after reconnection (filtering failed topics)
            this.subscriptions.forEach((subObj, topic) => {
                if (this.failedTopics.has(topic)) return;
                const sub = this._doSubscribe(topic, subObj.callback);
                subObj.subscription = sub;
            });
        };

        this.client.onStompError = (frame) => {
            const errorMsg = frame.headers?.['message'] || frame.body || '';
            console.warn('[StompService] STOMP Channel Error (handled):', errorMsg);
            // Evict group topic subscriptions that trigger server STOMP errors to prevent infinite reconnect loops
            this.subscriptions.forEach((subObj, topic) => {
                if (topic && (topic.includes('/topic/chat/group/') || topic.includes('/topic/chat/'))) {
                    this.failedTopics.add(topic);
                    try {
                        if (subObj.subscription) subObj.subscription.unsubscribe();
                    } catch (e) {}
                    this.subscriptions.delete(topic);
                }
            });
        };

        this.client.onWebSocketClose = () => {
            this.connectionState = 'DISCONNECTED';
            this.onDisconnectCallbacks.forEach((cb) => cb());

            this.failedConnectCount = (this.failedConnectCount || 0) + 1;
            if (this.failedConnectCount <= 2) {
                console.log('[StompService] WebSocket connection closed');
            } else if (this.failedConnectCount === 3) {
                console.warn('[StompService] WebSocket server unavailable after multiple retries. Slowing down reconnection attempts to 30s.');
                if (this.client) this.client.reconnectDelay = 30000;
            } else if (this.failedConnectCount >= 6) {
                if (this.failedConnectCount === 6) {
                    console.warn('[StompService] WebSocket server remains unreachable. Slowing down reconnection attempts to 60s.');
                }
                if (this.client) this.client.reconnectDelay = 60000;
            }
        };

        this.client.activate();
    }

    /**
     * Internal subscribe execution
     */
    _doSubscribe(topic, callback) {
        if (!this.client || !this.client.connected) return null;
        if (this.failedTopics && this.failedTopics.has(topic)) {
            console.warn(`[StompService] Skipping resubscribe to rejected topic: ${topic}`);
            return null;
        }

        console.log(`[StompService] Subscribing to STOMP topic: ${topic}`);
        try {
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
        } catch (err) {
            console.warn(`[StompService] Failed to subscribe to topic ${topic}:`, err);
            return null;
        }
    }

    /**
     * Subscribe to a topic (e.g. /topic/chat/global)
     * @param {string} topic
     * @param {Function} callback
     * @returns {string} subscription topic key
     */
    subscribe(topic, callback) {
        if (this.failedTopics) {
            this.failedTopics.delete(topic);
        }

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
            try {
                this.client.deactivate();
            } catch (e) { /* ignore */ }
            this.client = null;
            this.currentToken = null;
            this.connectionState = 'DISCONNECTED';
            console.log('[StompService] Disconnected');
        }
    }
}

const stompServiceInstance = new StompService();
export default stompServiceInstance;
