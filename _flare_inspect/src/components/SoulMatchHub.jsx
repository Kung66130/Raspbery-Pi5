import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Music, Zap, Globe, Bell, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';
import SoulRandomChat from './SoulRandomChat';
import SoulChatRoom from './SoulChatRoom';
import SoulNotificationModal from './SoulNotificationModal';
import SoulPartyLobby from './SoulPartyLobby';

const SoulMatchHub = ({ user, matchCount, onClearMatches }) => {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeAction, setActiveAction] = useState(null); // 'chat', 'call', 'party'
    const [selectedPartner, setSelectedPartner] = useState(null);
    const [showNotifModal, setShowNotifModal] = useState(false);
    const { showNotification } = useNotification();

    useEffect(() => {
        // Fetch real users but style them like the "monster" avatars in Litmatch
        fetchOnlineUsers();
    }, []);

    const handleFeatureLock = (actionId, title) => {
        if (actionId === 'chat' || actionId === 'call' || actionId === 'party') {
            setActiveAction(actionId);
        } else {
            showNotification(`${title} is coming soon to Flare!`, 'match', 'soul');
        }
    };

    const handleUserClick = (targetUser) => {
        // Prepare partner object for SoulChatRoom
        setSelectedPartner({
            id: targetUser.id,
            name: targetUser.name,
            image: targetUser.image,
            revealStatus: 100 // Fully revealed from the start for Online Match
        });
    };

    const fetchOnlineUsers = async () => {
        try {
            const data = await api.get('/matches/potential');
            setOnlineUsers(data);
        } catch (err) {
            console.error('Error fetching online users:', err);
        }
    };

    const QUICK_ACTIONS = [
        { id: 'chat', title: 'Soul Chat', icon: <MessageCircle size={32} />, color: '#EF4444', count: '43k Online' },
        { id: 'party', title: 'Soul Party', icon: <Music size={32} />, color: '#8B5CF6', count: '17k Playing' },
    ];

    if (selectedPartner) {
        return (
            <SoulChatRoom
                user={user}
                partner={selectedPartner}
                onBack={() => setSelectedPartner(null)}
            />
        );
    }

    return (
        <div className="match-hub-container">
            <SoulNotificationModal
                isOpen={showNotifModal}
                onClose={() => setShowNotifModal(false)}
            />

            {activeAction === 'chat' && (
                <SoulRandomChat
                    user={user}
                    onExit={() => setActiveAction(null)}
                />
            )}

            {activeAction === 'party' && (
                <SoulPartyLobby
                    user={user}
                    onBack={() => setActiveAction(null)}
                />
            )}

            <header className="hub-header">
                <div className="header-offset"></div> {/* To offset the notification button and keep title centered */}
                <h1 className="hub-title">Flare</h1>
                <div className="header-right">
                    <div className="notif-wrapper" onClick={() => { setShowNotifModal(true); if (onClearMatches) onClearMatches(); }}>
                        <Bell size={24} className="notification-bell" />
                        {matchCount > 0 && (
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="notif-badge"
                            >
                                {matchCount}
                            </motion.span>
                        )}
                    </div>
                </div>
            </header>

            <div className="quick-actions-grid">
                {QUICK_ACTIONS.map(action => (
                    <motion.div
                        key={action.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="action-card glass-panel"
                        onClick={() => handleFeatureLock(action.id, action.title)}
                    >
                        <div className="action-icon-circle" style={{ background: action.color }}>
                            {action.icon}
                        </div>
                        <span className="action-name">{action.title}</span>
                        <div className="status-indicator">
                            <span className="dot" style={{ background: action.color }}></span>
                            <span className="online-count">{action.count}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="users-list">
                {/* 2. Show Online Users (Filter out self) */}
                {onlineUsers.filter(u => u.id !== user?.id).map((u, i) => (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.03)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ delay: i * 0.05 }}
                        key={u.id}
                        className="user-list-item"
                        onClick={() => handleUserClick(u)}
                    >
                        <div className="avatar-container">
                            <div className="monster-frame" style={{ background: u.image ? 'transparent' : `hsl(${u.id.charCodeAt(0) * 40}, 70%, 60%)` }}>
                                <img src={u.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=80`} alt={u.name} />
                            </div>
                            <div className="online-dot"></div>
                        </div>
                        <div className="user-info-hub">
                            <div className="name-meta">
                                <h3>{u.name}</h3>
                                <div className={`gender-age ${u.gender === 'male' ? 'badge-blue' : 'badge-pink'}`}>
                                    <span>{u.gender === 'male' ? '♂' : '♀'}</span>
                                    <span>{u.age || 22}</span>
                                </div>
                            </div>
                            <p className="user-bio-hub">{u.bio || "Feeling lonely tonight..."}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="floating-status-btn"
            >
                <Plus size={24} />
                <span>Status</span>
            </motion.button>

            <style>{`
                .match-hub-container {
                    padding: 0 0 100px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .hub-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 15px;
                    width: 100%;
                }
                .header-offset { width: 40px; } /* Same width as .notif-wrapper to keep title centered */
                .hub-title { 
                    font-size: 1.6rem; 
                    font-weight: 800; 
                    letter-spacing: -1px;
                    flex: 1;
                    text-align: center;
                    background: linear-gradient(135deg, var(--primary), #ec4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .notification-bell { color: var(--primary); filter: drop-shadow(0 0 5px var(--primary-glow)); }
                .notif-wrapper {
                    position: relative;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .notif-wrapper:hover {
                    background: rgba(255,255,255,0.05);
                }
                .notif-badge {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: #FF4081;
                    color: white;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    min-width: 18px;
                    height: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    border: 2px solid var(--bg-dark);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                }

                .quick-actions-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
                .action-card {
                    padding: 16px 8px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    text-align: center;
                    cursor: pointer;
                }
                .action-icon-circle {
                    width: 56px;
                    height: 56px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin-bottom: 4px;
                }
                .action-name { font-size: 0.85rem; font-weight: 700; color: white; }
                .status-indicator {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .dot { width: 6px; height: 6px; border-radius: 50%; }
                .online-count { font-size: 0.6rem; color: var(--text-dim); }

                .online-match-banner {
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 64, 129, 0.05);
                    border: 1px solid rgba(255, 64, 129, 0.1);
                }
                .banner-content { display: flex; gap: 15px; align-items: center; }
                .flare-icon { 
                    font-size: 24px; 
                    background: var(--glass); 
                    width: 44px; 
                    height: 44px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    border-radius: 14px; 
                }
                .banner-text h3 { font-size: 0.95rem; font-weight: 700; margin: 0; }
                .banner-text p { font-size: 0.75rem; color: var(--text-dim); margin: 0; }
                .region-tag {
                    font-size: 0.7rem;
                    padding: 4px 10px;
                    background: var(--primary);
                    border-radius: 10px;
                    font-weight: 600;
                }

                .users-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .user-list-item {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                    padding: 12px;
                    border-radius: 18px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .avatar-container {
                    position: relative;
                }
                .monster-frame {
                    width: 60px;
                    height: 60px;
                    border-radius: 24px;
                    padding: 3px;
                    overflow: hidden;
                }
                .monster-frame img {
                    width: 100%;
                    height: 100%;
                    border-radius: 21px;
                    object-fit: cover;
                }
                .online-dot {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 14px;
                    height: 14px;
                    background: #10B981;
                    border: 3px solid var(--bg-dark);
                    border-radius: 50%;
                }
                .user-info-hub { flex: 1; }
                .name-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
                .name-meta h3 { font-size: 1rem; font-weight: 700; margin: 0; }
                .gender-age {
                    font-size: 0.7rem;
                    padding: 2px 8px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: white;
                    font-weight: 800;
                }
                .badge-pink { background: #FF4D94; }
                .badge-blue { background: #3b82f6; }
                .user-bio-hub {
                    font-size: 0.85rem;
                    color: var(--text-dim);
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .floating-status-btn {
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    background: var(--glass);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--glass-border);
                    padding: 12px 24px;
                    border-radius: 25px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: white;
                    font-weight: 700;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                }
            `}</style>
        </div>
    );
};

export default SoulMatchHub;
