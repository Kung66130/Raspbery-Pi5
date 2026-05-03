import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Info, AlertCircle, CheckCircle, X, Sparkles, MessageCircle } from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const savedUser = localStorage.getItem('flare_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const historyKey = user ? `flare_notif_history_${user.id}` : 'flare_notif_history_guest';

    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem(historyKey);
        return saved ? JSON.parse(saved) : [];
    });

    // Request permission for local notifications on mount
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            LocalNotifications.requestPermissions();
        }
    }, []);

    // Update history when user changes
    useEffect(() => {
        const saved = localStorage.getItem(historyKey);
        setHistory(saved ? JSON.parse(saved) : []);
    }, [historyKey]);

    useEffect(() => {
        localStorage.setItem(historyKey, JSON.stringify(history));
    }, [history, historyKey]);

    const showNotification = async (message, type = 'info', category = 'general', data = {}) => {
        const id = Math.random().toString(36).substr(2, 9) + Date.now();
        const newNotif = { id, message, type, category, timestamp: new Date(), ...data };
        
        // Internal state notification
        setNotifications(prev => [...prev, newNotif]);
        setHistory(prev => [newNotif, ...prev].slice(0, 50));
        setTimeout(() => removeNotification(id), 5000);

        // Device notification (Local)
        if (Capacitor.isNativePlatform() && (type === 'message' || type === 'match')) {
            try {
                const hasPermission = await LocalNotifications.checkPermissions();
                if (hasPermission.display === 'granted') {
                    await LocalNotifications.schedule({
                        notifications: [
                            {
                                title: data.title || (type === 'match' ? "แมตช์ใหม่! ❤️" : "Flare"),
                                body: message,
                                id: Math.floor(Math.random() * 100000),
                                schedule: { at: new Date(Date.now() + 100) },
                                sound: 'notif_sound.mp3',
                                extra: data
                            }
                        ]
                    });
                }
            } catch (err) {
                console.error('Failed to schedule local notification:', err);
            }
        }
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getCategoryHistory = (category) => {
        return history.filter(n => n.category === category);
    };

    const clearHistory = () => {
        setHistory([]);
    };

    return (
        <NotificationContext.Provider value={{ showNotification, history, clearHistory, getCategoryHistory }}>
            {children}
            <div className="notification-container">
                <AnimatePresence>
                    {notifications.map((notif, index) => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, scale: 0.5, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                            className={`notification-pill glass-panel ${notif.type}`}
                            onClick={() => removeNotification(notif.id)}
                            style={{
                                top: 20 + (index * 80),
                                left: '50%',
                                transform: 'translateX(-50%)',
                                cursor: 'pointer',
                                position: 'fixed',
                                zIndex: 10000
                            }}
                        >
                            <div className="notif-glow"></div>
                            <div className="notif-icon">
                                {notif.type === 'success' && <CheckCircle size={20} color="#10B981" />}
                                {notif.type === 'error' && <AlertCircle size={20} color="#EF4444" />}
                                {notif.type === 'message' && <MessageCircle size={20} color="#7C4DFF" />}
                                {notif.type === 'match' && <Bell size={20} color="#FF4081" />}
                                {notif.type === 'welcome' && <Sparkles size={20} color="#FFD700" />}
                                {notif.type === 'info' && <Info size={20} color="#7C4DFF" />}
                            </div>
                            <div className="notif-content">
                                {notif.title && <div className="notif-title">{notif.title}</div>}
                                <div className="notif-message">{notif.message}</div>
                            </div>
                            <button className="notif-close" onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}>
                                <X size={14} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <style>{`
                .notification-container {
                    position: fixed;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100%;
                    max-width: 450px;
                    z-index: 10000;
                    pointer-events: none;
                }
                .notification-pill {
                    pointer-events: auto;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 14px 20px;
                    width: 90%;
                    border-radius: 20px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(15, 15, 25, 0.85);
                    backdrop-filter: blur(15px);
                }
                .notif-glow {
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, var(--primary-glow) 0%, transparent 60%);
                    opacity: 0.1;
                }
                .notif-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .notif-title {
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: var(--primary);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }
                .notif-message {
                    font-size: 0.95rem;
                    color: white;
                    line-height: 1.3;
                }
                .success { border-left: 5px solid #10B981; }
                .error { border-left: 5px solid #EF4444; }
                .message { 
                    border-left: 5px solid #7C4DFF; 
                    background: linear-gradient(90deg, rgba(124, 77, 255, 0.1), transparent);
                }
                .match { 
                    border-left: 5px solid #FF4081;
                    background: linear-gradient(90deg, rgba(255, 64, 129, 0.1), transparent);
                }
            `}</style>
        </NotificationContext.Provider>
    );
};

export default NotificationContext;
