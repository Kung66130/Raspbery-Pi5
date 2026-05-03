import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, MessageSquare, ChevronRight, X, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';

const SoulChatList = ({ user, onSelectChat, onGoToSoul }) => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { showNotification } = useNotification();

    const handleDeleteChat = async (e, partnerId) => {
        e.stopPropagation();
        if (!window.confirm('คุณต้องการลบการสนทนานี้ใช่หรือไม่? (ข้อความทั้งหมดจะหายไป)')) return;

        try {
            await api.delete(`/chats/${partnerId}`);
            setChats(prev => prev.filter(c => c.id !== partnerId));
            showNotification("ลบการสนทนาเรียบร้อยแล้ว", "success");
        } catch (err) {
            showNotification("ลบการสนทนาไม่สำเร็จ", "error");
        }
    };

    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const data = await api.get('/chats');

            const blockedRaw = localStorage.getItem('flare_blocked_users');
            const blockedUsers = blockedRaw ? JSON.parse(blockedRaw) : [];
            const blockedIds = new Set(blockedUsers.map(u => u.id));

            setChats(data.filter(c => c && c.id && !blockedIds.has(c.id)));
        } catch (err) {
            console.error('Error fetching chats:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredChats = chats.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="chat-list-loading">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="loading-spinner"
                />
            </div>
        );
    }

    return (
        <div className="soul-chat-list-container">
            <header className="chat-list-header">
                <h1>Chats</h1>
                <div className="search-bar-wrap glass-panel">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className="chat-items-scroll">
                {filteredChats.length > 0 ? (
                    filteredChats.map((chat, i) => (
                        <motion.div
                            key={chat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="chat-item-row"
                            onClick={() => onSelectChat(chat)}
                        >
                            <div className="chat-avatar-wrap">
                                <img
                                    src={chat.image || `https://i.pravatar.cc/100?u=${chat.id}`}
                                    alt="avatar"
                                />
                            </div>

                            <div className="chat-item-info">
                                <div className="chat-item-top">
                                    <h3>{chat.name}</h3>
                                    <span className="chat-time">{new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="chat-last-msg">{chat.lastMessage}</p>
                            </div>

                            <div className="chat-item-actions">
                                {chat.unreadCount > 0 && (
                                    <div className="unread-badge">{chat.unreadCount}</div>
                                )}
                                <button className="chat-delete-btn" onClick={(e) => handleDeleteChat(e, chat.id)}>
                                    <Trash2 size={16} />
                                </button>
                                <ChevronRight size={18} className="chevron" />
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="empty-chats">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="empty-icon-box"
                        >
                            <MessageSquare size={48} />
                        </motion.div>
                        <p>ยังไม่มีการแชทเกิดขึ้น</p>
                        <span>ไปที่หน้า 'Soul' เพื่อจับคู่และเริ่มบทสนทนาใหม่ได้เลย! ✨</span>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="empty-action-btn"
                            onClick={onGoToSoul}
                        >
                            ค้นหาเพื่อนใหม่
                        </motion.button>
                    </div>
                )}
            </div>

            <style>{`
                .soul-chat-list-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                }
                .chat-list-header {
                    padding: 20px 0;
                }
                .chat-list-header h1 {
                    font-size: 1.8rem;
                    font-weight: 800;
                    margin-bottom: 20px;
                    letter-spacing: -1px;
                }
                .search-bar-wrap {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 16px;
                    border-radius: 16px;
                }
                .search-bar-wrap input {
                    background: transparent;
                    border: none;
                    color: var(--text-main);
                    flex: 1;
                    outline: none;
                }

                .chat-items-scroll {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding-top: 10px;
                }
                .chat-item-row {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 14px;
                    border-radius: 20px;
                    cursor: pointer;
                    transition: background 0.2s;
                    position: relative;
                }
                .chat-item-row:hover {
                    background: var(--glass);
                }
                .chat-avatar-wrap {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    overflow: hidden;
                    position: relative;
                    border: 2px solid var(--primary);
                }
                .chat-avatar-wrap img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .chat-avatar-wrap.blurred img {
                    filter: blur(8px) brightness(0.7);
                }
                .mask-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 1.2rem;
                }

                .chat-item-info {
                    flex: 1;
                }
                .chat-item-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 4px;
                }
                .chat-item-top h3 {
                    font-size: 1rem;
                    font-weight: 700;
                    margin: 0;
                }
                .chat-time {
                    font-size: 0.75rem;
                    color: var(--text-dim);
                }
                .chat-last-msg {
                    font-size: 0.85rem;
                    color: var(--text-dim);
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .chat-item-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .chat-delete-btn {
                    background: none;
                    border: none;
                    color: var(--text-dim);
                    opacity: 0.3;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 8px;
                    transition: all 0.2s;
                    display: flex;
                }
                .chat-item-row:hover .chat-delete-btn {
                    opacity: 0.6;
                }
                .chat-delete-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444 !important;
                }
                .unread-badge {
                    background: var(--primary);
                    color: white;
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 10px;
                    min-width: 20px;
                    text-align: center;
                }
                .chevron {
                    color: var(--text-dim);
                    opacity: 0.3;
                }

                .empty-chats {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    color: var(--text-dim);
                    text-align: center;
                }
                .empty-chats p {
                    margin: 15px 0 5px;
                    font-weight: 700;
                    color: var(--text-main);
                    font-size: 1.1rem;
                }
                .empty-chats span { 
                    font-size: 0.9rem; 
                    opacity: 0.7;
                    max-width: 250px;
                }
                .empty-icon-box {
                    width: 100px;
                    height: 100px;
                    background: var(--glass);
                    border-radius: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary);
                    margin-bottom: 10px;
                    border: 1px solid var(--glass-border);
                }
                .empty-action-btn {
                    margin-top: 25px;
                    padding: 10px 24px;
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    border: none;
                    border-radius: 50px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 10px 20px rgba(168, 85, 247, 0.2);
                }

                .chat-list-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid rgba(255,255,255,0.1);
                    border-top-color: var(--primary);
                    border-radius: 50%;
                }
            `}</style>
        </div>
    );
};

export default SoulChatList;
