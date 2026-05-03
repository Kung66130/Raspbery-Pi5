import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, UserCheck, X, Users, TrendingUp, Sparkles, MapPin, Clock, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from './NotificationSystem';

const Discover = ({ user, onSelectUser }) => {
    const { t } = useLanguage();
    const { showNotification } = useNotification();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [followedIds, setFollowedIds] = useState(new Set());
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);
    const [searchHistory, setSearchHistory] = useState(() => {
        const saved = localStorage.getItem('search_history');
        return saved ? JSON.parse(saved) : [];
    });

    // Load suggested users on mount
    useEffect(() => {
        const loadSuggested = async () => {
            try {
                // Fetch following IDs independently
                api.get('/swipes/following_ids')
                    .then(res => setFollowedIds(new Set(res || [])))
                    .catch(err => console.error('Failed to load following ids:', err));

                const results = await api.get('/users/search?q=');
                setSuggestedUsers(results);
            } catch (err) {
                console.error('Failed to load suggestions:', err);
            } finally {
                setLoadingSuggestions(false);
            }
        };
        loadSuggested();
    }, [user]);

    // Save to history when search completes
    const saveToHistory = useCallback((term) => {
        if (!term || term.trim().length < 2) return;
        const normalized = term.trim();
        setSearchHistory(prev => {
            const filtered = prev.filter(h => h.toLowerCase() !== normalized.toLowerCase());
            const updated = [normalized, ...filtered].slice(0, 10);
            localStorage.setItem('search_history', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('search_history');
    };

    const removeFromHistory = (e, term) => {
        e.stopPropagation();
        setSearchHistory(prev => {
            const updated = prev.filter(h => h !== term);
            localStorage.setItem('search_history', JSON.stringify(updated));
            return updated;
        });
    };

    // Debounced search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setHasSearched(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            setHasSearched(true);
            try {
                const results = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
                setSearchResults(results);
                // Save to history if we have results
                if (results.length > 0) {
                    saveToHistory(searchQuery);
                }
            } catch (err) {
                console.error('Search failed:', err);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [searchQuery, user, saveToHistory]);

    const toggleFollow = async (userId) => {
        try {
            // Optimistic update locally
            setFollowedIds(prev => {
                const next = new Set(prev);
                if (next.has(userId)) {
                    next.delete(userId);
                } else {
                    next.add(userId);
                }
                return next;
            });

            const res = await api.post(`/users/${userId}/follow`);

            // Sync with backend confirmed state
            setFollowedIds(prev => {
                const next = new Set(prev);
                if (res.isFollowing) next.add(userId);
                else next.delete(userId);
                return next;
            });

            if (res.isFollowing) {
                showNotification('ติดตามสำเร็จ! ✨', 'success');
            } else {
                showNotification('ยกเลิกการติดตาม', 'info');
            }
        } catch (err) {
            console.error('Follow error:', err);
            // On error, we might want to revert, but this simple fetch is enough for now
            showNotification('เกิดข้อผิดพลาด กรุณาลองใหม่', 'error');
            // Revert state on error by re-fetching
            try {
                const followingRes = await api.get('/swipes/following_ids');
                setFollowedIds(new Set(followingRes || []));
            } catch (_) { }
        }
    };

    const displayList = searchQuery.trim() ? searchResults : suggestedUsers;

    return (
        <div className="discover-page page-content">
            {/* Header */}
            <div className="discover-header">
                <h1 className="discover-title">
                    <Search size={28} />
                    <span>{t('nav.explore') || 'สำรวจ'}</span>
                </h1>
            </div>

            {/* Search Bar */}
            <div className="search-container">
                <div className="search-input-wrapper glass-panel">
                    <Search size={20} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="ค้นหาชื่อ, @username, หรืออีเมล..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                    />
                    {searchQuery && (
                        <button className="clear-search" onClick={() => setSearchQuery('')}>
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Section Label */}
            <div className="section-label">
                {searchQuery.trim() ? (
                    <span><TrendingUp size={16} /> ผลการค้นหา "{searchQuery}"</span>
                ) : searchHistory.length > 0 ? (
                    <div className="history-header">
                        <span><Clock size={16} /> ประวัติการค้นหา</span>
                        <button className="clear-history-btn" onClick={clearHistory}>ล้างทั้งหมด</button>
                    </div>
                ) : (
                    <span><Sparkles size={16} /> แนะนำสำหรับคุณ</span>
                )}
            </div>

            {/* Search History Chips */}
            {!searchQuery && searchHistory.length > 0 && (
                <div className="history-chips">
                    <AnimatePresence>
                        {searchHistory.map((term) => (
                            <motion.div
                                key={term}
                                className="history-chip glass-panel"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setSearchQuery(term)}
                            >
                                <span>{term}</span>
                                <button
                                    className="remove-history-item"
                                    onClick={(e) => removeFromHistory(e, term)}
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Loading State */}
            {(isSearching || (loadingSuggestions && !searchQuery)) && (
                <div className="search-loading">
                    <div className="pulse-loader">
                        <div></div><div></div><div></div>
                    </div>
                    <p>กำลังค้นหา...</p>
                </div>
            )}

            {/* Results List */}
            <div className="results-list">
                <AnimatePresence mode="popLayout">
                    {displayList.map((person, index) => (
                        <motion.div
                            key={person.id}
                            className="user-card glass-panel"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            layout
                        >
                            <div
                                className="user-card-left"
                                onClick={() => onSelectUser && onSelectUser(person.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="user-avatar-wrapper">
                                    {person.image ? (
                                        <img src={person.image} alt={person.name} className="user-avatar" />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            {(person.name || '?')[0].toUpperCase()}
                                        </div>
                                    )}
                                    {person.isOnline && <div className="online-dot"></div>}
                                </div>
                                <div className="user-info">
                                    <h3 className="user-name">{person.name || 'ไม่ระบุชื่อ'}</h3>
                                    <p className="user-username">
                                        @{person.username || (person.email ? person.email.split('@')[0] : person.id?.slice(0, 10))}
                                    </p>
                                    {person.bio && (
                                        <p className="user-bio">{person.bio.length > 50 ? person.bio.slice(0, 50) + '...' : person.bio}</p>
                                    )}
                                </div>
                            </div>
                            <motion.button
                                className={`follow-btn ${followedIds.has(person.id) ? 'following' : ''}`}
                                onClick={() => toggleFollow(person.id)}
                                whileTap={{ scale: 0.9 }}
                            >
                                {followedIds.has(person.id) ? (
                                    <>
                                        <UserCheck size={16} />
                                        <span>ติดตามแล้ว</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        <span>ติดตาม</span>
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* No Results */}
            {hasSearched && !isSearching && searchResults.length === 0 && searchQuery.trim() && (
                <motion.div
                    className="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Users size={48} />
                    <h3>ไม่พบผู้ใช้</h3>
                    <p>ลองค้นหาด้วยชื่อ, username, หรืออีเมลอื่น</p>
                </motion.div>
            )}

            {/* Empty suggestions */}
            {!searchQuery && !loadingSuggestions && suggestedUsers.length === 0 && (
                <motion.div
                    className="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Sparkles size={48} />
                    <h3>ยังไม่มีผู้ใช้อื่น</h3>
                    <p>ชวนเพื่อนมาใช้ Flare กันเถอะ!</p>
                </motion.div>
            )}

            <style>{`
                .discover-page {
                    padding-top: 10px !important;
                }
                .discover-header {
                    margin-bottom: 20px;
                }
                .discover-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-size: 1.6rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, var(--text-main), var(--primary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                /* Search Bar */
                .search-container {
                    margin-bottom: 20px;
                }
                .search-input-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 14px 18px;
                    border-radius: 16px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    transition: all 0.3s ease;
                }
                .search-input-wrapper:focus-within {
                    border-color: var(--primary);
                    box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
                    background: rgba(255, 255, 255, 0.08);
                }
                .search-icon {
                    color: var(--text-muted);
                    flex-shrink: 0;
                }
                .search-input {
                    flex: 1;
                    background: none;
                    border: none;
                    outline: none;
                    color: var(--text-primary);
                    font-size: 1rem;
                    font-family: inherit;
                }
                .search-input::placeholder {
                    color: var(--text-muted);
                }
                .clear-search {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: var(--text-dim);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .clear-search:hover {
                    background: rgba(255, 255, 255, 0.2);
                    color: #fff;
                }

                /* Section Label */
                .section-label {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-dim);
                    margin-bottom: 16px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .section-label span {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .history-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }
                .clear-history-btn {
                    background: none;
                    border: none;
                    color: var(--primary);
                    font-size: 0.75rem;
                    font-weight: 700;
                    cursor: pointer;
                    text-transform: none;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                .clear-history-btn:hover {
                    background: rgba(168, 85, 247, 0.1);
                }

                /* History Chips */
                .history-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 24px;
                }
                .history-chip {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 14px;
                    border-radius: 100px;
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: var(--text-primary);
                    font-size: 0.88rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .history-chip:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: var(--primary);
                    transform: translateY(-1px);
                }
                .remove-history-item {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2px;
                    border-radius: 50%;
                    transition: all 0.2s;
                }
                .remove-history-item:hover {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                /* Results List */
                .results-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .user-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 14px 16px;
                    border-radius: 16px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    transition: all 0.2s ease;
                }
                .user-card:hover {
                    background: var(--glass-thick);
                    border-color: var(--primary);
                    transform: translateX(4px);
                }
                .user-card-left {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    flex: 1;
                    min-width: 0;
                }

                /* Avatar */
                .user-avatar-wrapper {
                    position: relative;
                    flex-shrink: 0;
                }
                .user-avatar {
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 2px solid rgba(168, 85, 247, 0.4);
                }
                .user-avatar-placeholder {
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: white;
                }
                .online-dot {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 12px;
                    height: 12px;
                    background: #22c55e;
                    border-radius: 50%;
                    border: 2px solid var(--bg-dark);
                }

                /* User Info */
                .user-info {
                    min-width: 0;
                }
                .user-name {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .user-username {
                    font-size: 0.82rem;
                    color: var(--text-muted);
                    margin: 2px 0 0;
                }
                .user-bio {
                    font-size: 0.78rem;
                    color: var(--text-dim);
                    margin: 4px 0 0;
                    line-height: 1.3;
                }

                /* Follow Button */
                .follow-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                    border-radius: 12px;
                    border: none;
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                    font-family: inherit;
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    color: white;
                    box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
                }
                .follow-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(168, 85, 247, 0.4);
                }
                .follow-btn.following {
                    background: rgba(255, 255, 255, 0.08);
                    color: var(--text-dim);
                    box-shadow: none;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                }
                .follow-btn.following:hover {
                    background: rgba(239, 68, 68, 0.15);
                    color: #ef4444;
                    border-color: rgba(239, 68, 68, 0.3);
                }

                /* Loading */
                .search-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    padding: 40px 0;
                    color: var(--text-muted);
                }
                .pulse-loader {
                    display: flex;
                    gap: 6px;
                }
                .pulse-loader div {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: var(--primary);
                    animation: pulse-bounce 1.2s ease-in-out infinite;
                }
                .pulse-loader div:nth-child(2) { animation-delay: 0.15s; }
                .pulse-loader div:nth-child(3) { animation-delay: 0.3s; }
                @keyframes pulse-bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }

                /* No Results */
                .no-results {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    padding: 50px 20px;
                    text-align: center;
                    color: var(--text-muted);
                }
                .no-results h3 {
                    font-size: 1.2rem;
                    color: var(--text-dim);
                    margin: 0;
                }
                .no-results p {
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    margin: 0;
                }
            `}</style>
        </div>
    );
};

export default Discover;
