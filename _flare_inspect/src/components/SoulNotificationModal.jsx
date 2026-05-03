import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Heart, MessageCircle, Sparkles, Trash2, Clock } from 'lucide-react';
import { useNotification } from './NotificationSystem';

const SoulNotificationModal = ({ isOpen, onClose }) => {
    const { getCategoryHistory, clearHistory } = useNotification();
    const soulHistory = getCategoryHistory('soul');

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="soul-notif-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="soul-notif-modal glass-panel"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="notif-modal-header">
                        <div className="header-title">
                            <Bell size={20} className="notif-icon-main" />
                            <h3>Soul Notifications</h3>
                        </div>
                        <div className="header-actions">
                            {soulHistory.length > 0 && (
                                <button className="clear-btn" onClick={clearHistory}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button className="close-btn" onClick={onClose}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="notif-modal-content">
                        {soulHistory.length === 0 ? (
                            <div className="empty-state">
                                <Sparkles size={48} className="empty-icon" />
                                <p>No notifications yet</p>
                                <span>Your soul matches and likes will appear here!</span>
                            </div>
                        ) : (
                            <div className="notif-list">
                                {soulHistory.map((notif, i) => (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`notif-item ${notif.type}`}
                                    >
                                        <div className="item-icon">
                                            {notif.type === 'match' && <Heart size={18} fill="#FF4081" color="#FF4081" />}
                                            {notif.type === 'message' && <MessageCircle size={18} />}
                                            {notif.type === 'info' && <Bell size={18} />}
                                        </div>
                                        <div className="item-body">
                                            <p>{notif.message}</p>
                                            <span className="item-time">
                                                <Clock size={10} /> {formatTime(notif.timestamp)}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            <style>{`
                .soul-notif-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(5px);
                    z-index: 3000;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }
                .soul-notif-modal {
                    width: 100%;
                    max-width: 500px;
                    background: #1a1a2e;
                    border-radius: 30px 30px 0 0;
                    height: 80vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-bottom: none;
                }
                .notif-modal-header {
                    padding: 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .header-title { display: flex; align-items: center; gap: 12px; }
                .header-title h3 { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .notif-icon-main { color: var(--primary); }
                
                .header-actions { display: flex; gap: 15px; align-items: center; }
                .clear-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; }
                .close-btn { background: none; border: none; color: white; cursor: pointer; padding: 4px; }

                .notif-modal-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }
                .empty-state {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: var(--text-dim);
                    gap: 15px;
                }
                .empty-icon { color: rgba(255,255,255,0.05); }
                .empty-state p { font-size: 1.1rem; font-weight: 600; color: white; margin: 0; }
                .empty-state span { font-size: 0.85rem; }

                .notif-list { display: flex; flex-direction: column; gap: 12px; }
                .notif-item {
                    display: flex;
                    gap: 15px;
                    padding: 16px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .item-icon {
                    width: 40px; height: 40px; border-radius: 14px;
                    background: rgba(255,255,255,0.05);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .notif-item.match .item-icon { background: rgba(255, 64, 129, 0.1); }
                
                .item-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
                .item-body p { margin: 0; font-size: 0.95rem; line-height: 1.4; color: #e0e0e0; }
                .item-time { font-size: 0.75rem; color: var(--text-dim); display: flex; align-items: center; gap: 4px; }
            `}</style>
        </AnimatePresence>
    );
};

export default SoulNotificationModal;
