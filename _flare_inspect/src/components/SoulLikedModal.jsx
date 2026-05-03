import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, MapPin, Sparkles, User } from 'lucide-react';
import { api } from '../services/api';

const SoulLikedModal = ({ isOpen, onClose }) => {
    const [likedUsers, setLikedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchLikedUsers();
        }
    }, [isOpen]);

    const fetchLikedUsers = async () => {
        setLoading(true);
        try {
            const data = await api.get('/swipes/liked');
            setLikedUsers(data);
        } catch (err) {
            console.error('Failed to fetch liked souls:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="liked-souls-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="liked-souls-modal glass-panel"
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="liked-header">
                        <div className="header-title">
                            <Heart size={24} fill="#FF4081" color="#FF4081" />
                            <h3>Souls You Liked</h3>
                        </div>
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className="liked-content">
                        {loading ? (
                            <div className="loading-state">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <Heart size={40} color="#FF4081" fill="#FF4081" />
                                </motion.div>
                                <p>Loading your likes...</p>
                            </div>
                        ) : likedUsers.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon-circle">
                                    <User size={40} color="rgba(255,255,255,0.1)" />
                                </div>
                                <p>No likes yet</p>
                                <span>Go to Card Swipe and start liking some souls!</span>
                            </div>
                        ) : (
                            <div className="liked-grid">
                                {likedUsers.map((u, i) => (
                                    <motion.div
                                        key={u.id}
                                        className="liked-card glass-panel"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <div className="liked-avatar">
                                            <img src={u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} alt={u.name} />
                                            <div className="liked-badge"><Heart size={10} fill="white" color="white" /></div>
                                        </div>
                                        <div className="liked-info">
                                            <h4>{u.name}, {u.age || 22}</h4>
                                            <div className="liked-meta">
                                                <span className={`g-tag ${u.gender === 'female' ? 'pink' : 'blue'}`}>
                                                    {u.gender === 'female' ? '♀' : '♂'}
                                                </span>
                                                <span className="l-tag"><MapPin size={10} /> {u.location || 'TH'}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            <style>{`
                .liked-souls-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    backdrop-filter: blur(8px);
                    z-index: 4000;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }
                .liked-souls-modal {
                    width: 100%;
                    max-width: 550px;
                    background: var(--bg-dark, #0f021a);
                    border-radius: 32px 32px 0 0;
                    height: 85vh;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid var(--glass-border);
                    border-bottom: none;
                    box-shadow: 0 -20px 50px rgba(0,0,0,0.6);
                }
                .liked-header {
                    padding: 24px 24px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--glass-border);
                }
                .header-title { display: flex; align-items: center; gap: 12px; }
                .header-title h3 { font-size: 1.3rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, var(--text-main), #FF4081); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                
                .close-btn { background: var(--glass); border: none; color: var(--text-main); cursor: pointer; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

                .liked-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }
                .loading-state, .empty-state {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: var(--text-dim);
                    gap: 16px;
                }
                .empty-icon-circle {
                    width: 100px; height: 100px; border-radius: 50%;
                    background: var(--glass);
                    display: flex; align-items: center; justify-content: center;
                    border: 1px dashed var(--glass-border);
                }
                .empty-state p { font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin: 0; }
                .empty-state span { font-size: 0.9rem; max-width: 240px; opacity: 0.7; }

                .liked-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }
                .liked-card {
                    padding: 12px;
                    border-radius: 20px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .liked-avatar {
                    width: 100%;
                    aspect-ratio: 2 / 3;
                    border-radius: 16px;
                    overflow: hidden;
                    position: relative;
                }
                .liked-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .liked-badge {
                    position: absolute;
                    top: 8px; right: 8px;
                    width: 24px; height: 24px;
                    background: #FF4081;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                }
                
                .liked-info h4 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); }
                .liked-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
                .g-tag { font-size: 0.7rem; font-weight: 800; border-radius: 6px; padding: 1px 6px; }
                .g-tag.pink { background: rgba(255, 64, 129, 0.2); color: #FF4081; }
                .g-tag.blue { background: rgba(59, 130, 246, 0.2); color: #3B82F6; }
                .l-tag { font-size: 0.7rem; color: var(--text-dim); display: flex; align-items: center; gap: 2px; }
            `}</style>
        </AnimatePresence>
    );
};

export default SoulLikedModal;
