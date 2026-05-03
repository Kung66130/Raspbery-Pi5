import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, MoreHorizontal, PlusCircle, Image as ImageIcon, Send, X, Bell, Trash2, Bookmark, RefreshCw, ShieldAlert, Ban } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';
import { useLanguage } from '../contexts/LanguageContext';

const MomentsFeed = ({ user, refreshTrigger, onOpenCreateModal, onSelectUser }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activePostMenu, setActivePostMenu] = useState(null);
    const [deleteConfirmationId, setDeleteConfirmationId] = useState(null);
    const [showNotifInbox, setShowNotifInbox] = useState(false);
    const [activeCommentPost, setActiveCommentPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [likeAnimatingId, setLikeAnimatingId] = useState(null);
    const { showNotification, history, clearHistory } = useNotification();
    const { t, language } = useLanguage();

    const [pullStart, setPullStart] = useState(0);
    const [pullChange, setPullChange] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [reactionPostId, setReactionPostId] = useState(null);
    const [longPressTimer, setLongPressTimer] = useState(null);

    // Story Overlay
    const [storyOverlayPost, setStoryOverlayPost] = useState(null);

    // Mention System
    const [mentionQuery, setMentionQuery] = useState('');
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
    const [mentionUsers, setMentionUsers] = useState([]);

    useEffect(() => {
        fetchPosts();
    }, [refreshTrigger]);

    const handleTouchStart = (e) => {
        if (window.scrollY === 0) {
            setPullStart(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e) => {
        if (pullStart > 0 && window.scrollY === 0) {
            const touchY = e.touches[0].clientY;
            const diff = touchY - pullStart;
            if (diff > 0) {
                // e.preventDefault(); // Prevent default browser reload if we want custom only
                setPullChange(diff > 100 ? 100 : diff);
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullChange >= 80) {
            setIsRefreshing(true);
            setPullChange(80); // Hold position
            await fetchPosts();
            setTimeout(() => {
                setIsRefreshing(false);
                setPullChange(0);
                setPullStart(0);
            }, 500);
        } else {
            setPullChange(0);
            setPullStart(0);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActivePostMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchPosts = async () => {
        try {
            // Add cache buster to ensure we get fresh data from server
            const data = await api.get(`/posts?t=${Date.now()}`);
            console.log('DEBUG: Posts received from server:', data.length);
            data.forEach((p, idx) => console.log(`DEBUG: Post ${idx} - User: ${p.username}, TS: ${p.timestamp}, ID: ${p.id}`));
            if (data.length > 0) console.log('DEBUG: First post owner:', data[0].userId || data[0].user_id);

            const blockedRaw = localStorage.getItem('flare_blocked_users');
            const blockedUsers = blockedRaw ? JSON.parse(blockedRaw) : [];
            const blockedIds = new Set(blockedUsers.map(u => u.id));

            console.log('DEBUG: Blocked user IDs:', Array.from(blockedIds));

            const filteredPosts = data.filter(p => {
                const pUserId = p.userId || p.user_id;
                // NEVER filter out your own posts, even if accidentally in block list
                if (String(pUserId) === String(user.id)) return true;
                return !blockedIds.has(pUserId);
            });

            console.log('DEBUG: Posts after filtering:', filteredPosts.length);
            if (filteredPosts.length < data.length) {
                const filteredOut = data.filter(p => !filteredPosts.find(f => f.id === p.id));
                console.log('DEBUG: Filtered out posts:', filteredOut.map(p => ({ id: p.id, user: p.username, blocked: blockedIds.has(p.userId || p.user_id) })));
            }
            setPosts(filteredPosts);
        } catch (err) {
            console.error('Error fetching posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const requestDelete = (e, postId) => {
        e.stopPropagation();
        setDeleteConfirmationId(postId);
        setActivePostMenu(null);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmationId) return;
        try {
            await api.delete(`/posts/${deleteConfirmationId}`);
            setPosts(posts.filter(p => p.id !== deleteConfirmationId));
            showNotification(t('feed.momentDeleted'), 'success');
        } catch (err) {
            console.error("Delete error:", err);
            showNotification(`${t('common.error')}: ${err.message}`, "error");
        } finally {
            setDeleteConfirmationId(null);
        }
    };

    const toggleMenu = (e, postId) => {
        e.stopPropagation();
        setActivePostMenu(activePostMenu === postId ? null : postId);
    };

    const handleLike = async (id, reactionType = null) => {
        // Haptic feedback
        if (reactionType && navigator.vibrate) navigator.vibrate([10]);
        else if (navigator.vibrate) navigator.vibrate(50);

        // Trigger animation immediately
        setLikeAnimatingId(id);
        setTimeout(() => setLikeAnimatingId(null), 600);

        try {
            const data = await api.post(`/posts/${id}/like`, { type: reactionType });
            setPosts(posts.map(post => {
                if (String(post.id) === String(id)) {
                    return {
                        ...post,
                        likes: data.likes,
                        hasLiked: data.hasLiked,
                        reaction: reactionType || (data.hasLiked ? '❤️' : null)
                    };
                }
                return post;
            }));
        } catch (err) {
            console.error('Error liking post:', err);
        }
    };

    const onLikePointerDown = (postId) => {
        const timer = setTimeout(() => {
            setReactionPostId(postId);
            if (navigator.vibrate) navigator.vibrate(100);
        }, 500);
        setLongPressTimer(timer);
    };

    const onLikePointerUp = (postId) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
        // If reactionPostId was not set, it means it was a short press
        // and no reaction picker was shown, so trigger a default like/unlike
        if (reactionPostId !== postId) {
            handleLike(postId);
        }
    };

    const selectReaction = (postId, emoji) => {
        handleLike(postId, emoji);
        setReactionPostId(null);
    };

    const openComments = async (post) => {
        setActiveCommentPost(post);
        try {
            const data = await api.get(`/posts/${post.id}/comments`);
            setComments(data);
        } catch (err) {
            console.error('Error fetching comments:', err);
            showNotification(t('feed.errorLoadingComments'), "error");
        }
    };

    const openStoryOverlay = async (post) => {
        setStoryOverlayPost(post);
        try {
            const data = await api.get(`/posts/${post.id}/comments`);
            setComments(data);
        } catch (err) { }
    };

    // Mention system logic
    const handleCommentChange = async (e) => {
        const val = e.target.value;
        setNewCommentText(val);

        const lastWord = val.split(' ').pop();
        if (lastWord.startsWith('@')) {
            const query = lastWord.slice(1);
            setMentionQuery(query);
            setShowMentionSuggestions(true);
            if (query.length > 0) {
                try {
                    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
                    setMentionUsers(res);
                } catch (err) { }
            } else {
                setMentionUsers([]);
            }
        } else {
            setShowMentionSuggestions(false);
        }
    };

    const insertMention = (username) => {
        const words = newCommentText.split(' ');
        words.pop(); // Remove the current '@query'
        setNewCommentText(words.length > 0 ? words.join(' ') + ` @${username} ` : `@${username} `);
        setShowMentionSuggestions(false);
        setMentionUsers([]);
    };

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim() || isSubmittingComment) return;

        setIsSubmittingComment(true);
        try {
            const data = await api.post(`/posts/${activeCommentPost.id}/comments`, { text: newCommentText });
            setComments([...comments, data]);
            setNewCommentText('');
            // Update the post's comment count in the main feed
            setPosts(posts.map(p =>
                p.id === activeCommentPost.id
                    ? { ...p, commentCount: (p.commentCount || 0) + 1 }
                    : p
            ));
            showNotification(t('feed.commentAdded'), "success");
        } catch (err) {
            console.error('Error sending comment:', err);
            const msg = err.response?.data?.error || err.message || "Failed to send comment";
            showNotification(`${t('common.error')}: ${msg}`, "error");
        } finally {
            setIsSubmittingComment(false);
        }
    };
    const handleSave = async (e, postId) => {
        e.stopPropagation();
        setActivePostMenu(null);
        try {
            const data = await api.post(`/posts/${postId}/save`);
            setPosts(posts.map(p =>
                String(p.id) === String(postId) ? { ...p, hasSaved: data.hasSaved } : p
            ));
            showNotification(data.hasSaved ? t('profile.saved') : t('feed.removedSaved'), 'success');
        } catch (err) {
            console.error('Error saving post:', err);
            showNotification(`${t('common.error')}: ${err.message}`, 'error');
        }
    };

    const handleReport = async (e, postId) => {
        e.stopPropagation();
        setActivePostMenu(null);
        try {
            await api.post('/reports', {
                targetId: postId,
                targetType: 'post',
                reason: 'Inappropriate content' // You can add a prompt or modal to ask for the reason later
            });
            showNotification(t('feed.reported') || 'รายงานสำเร็จแล้ว', 'success');
            // Optimistically remove the post
            setPosts(posts.filter(p => p.id !== postId));
        } catch (err) {
            console.error('Report error:', err);
            const errMsg = err.response?.data?.error || err.message;
            if (errMsg === 'Database Missing Table') {
                showNotification('ระบบรายงานกำลังปรับปรุง (Database Missing Table)', 'error');
                console.error(err.response?.data?.message);
            } else {
                showNotification(`${t('common.error')}: ${errMsg}`, 'error');
            }
        }
    };

    const handleBlock = async (e, targetUserId, targetUserImage, targetUserName) => {
        e.stopPropagation();
        if (String(targetUserId) === String(user.id)) {
            showNotification('คุณไม่สามารถบล็อกตัวเองได้นะ! 😂', 'error');
            return;
        }
        setActivePostMenu(null);

        try {
            await api.post('/users/block', {
                blockedId: targetUserId
            });

            // Keep local storage for immediate UI update and offline fallback
            const currentlyBlockedRaw = localStorage.getItem('flare_blocked_users');
            let currentlyBlocked = currentlyBlockedRaw ? JSON.parse(currentlyBlockedRaw) : [];
            if (!currentlyBlocked.find(u => u.id === targetUserId)) {
                currentlyBlocked.push({ id: targetUserId, image: targetUserImage, name: targetUserName });
                localStorage.setItem('flare_blocked_users', JSON.stringify(currentlyBlocked));
            }

            showNotification(t('feed.userBlocked') || 'บล็อกผู้ใช้คนนี้แล้ว', 'success');
            setPosts(posts.filter(p => String(p.userId) !== String(targetUserId) && String(p.user_id) !== String(targetUserId)));
        } catch (err) {
            console.error('Block error:', err);
            const errMsg = err.response?.data?.error || err.message;
            if (errMsg === 'Database Missing Table') {
                showNotification('ระบบบล็อกกำลังปรับปรุง (Database Missing Table)', 'error');
                console.error(err.response?.data?.message);
            } else {
                showNotification(`${t('common.error')}: ${errMsg}`, 'error');
            }
        }
    };

    return (
        <div className="page-content moments-feed">
            <div className="header glass-panel sticky-header">
                <div className="notification-bell-home" onClick={() => setShowNotifInbox(true)}>
                    <Bell size={24} className="action-icon" />
                    {history.length > 0 && <div className="notif-dot-glow"></div>}
                </div>
                <h1 className="gradient-text" onClick={fetchPosts} style={{ cursor: 'pointer' }}>Flare</h1>
                <div className="header-actions">
                    <PlusCircle size={24} className="action-icon" onClick={onOpenCreateModal} />
                </div>
            </div>


            {/* Pull to Refresh Indicator */}
            <div
                className="pull-indicator"
                style={{
                    height: pullChange,
                    opacity: pullChange / 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: isRefreshing ? 'height 0.2s' : 'none',
                    background: 'linear-gradient(180deg, rgba(168,85,247,0.15) 0%, transparent 100%)',
                    borderRadius: '0 0 30px 30px',
                    marginBottom: pullChange > 0 ? 10 : 0
                }}
            >
                <div style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'var(--primary)',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    animation: isRefreshing ? 'pulse-text 1.5s infinite' : 'none'
                }}>
                    {isRefreshing ? (
                        language === 'th' ? 'กำลังอัปเดต...' : 'Updating...'
                    ) : pullChange > 70 ? (
                        language === 'th' ? 'ปล่อยเพื่อรีเฟรช' : 'Release to Refresh'
                    ) : (
                        language === 'th' ? 'ดึงเพื่อรีเฟรช' : 'Pull to Refresh'
                    )}
                </div>
            </div>

            {/* Feed Posts */}
            <div
                className="feed"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {loading ? (
                    <div className="skeleton-feed-list">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton-feed-card">
                                <div className="skeleton-feed-header">
                                    <div className="skeleton skeleton-avatar"></div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div className="skeleton skeleton-text" style={{ width: '50%' }}></div>
                                        <div className="skeleton skeleton-text-short" style={{ width: '30%' }}></div>
                                    </div>
                                </div>
                                <div className="skeleton-feed-body">
                                    <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
                                    <div className="skeleton skeleton-text" style={{ width: '70%' }}></div>
                                    <div className="skeleton skeleton-image"></div>
                                </div>
                                <div className="skeleton-feed-footer">
                                    <div className="skeleton skeleton-btn"></div>
                                    <div className="skeleton skeleton-btn"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="empty-state-modern">
                        <div className="empty-icon-wrapper">
                            <PlusCircle size={36} color="var(--primary)" />
                        </div>
                        <h3>{t('feed.noMoments') || 'ยังไม่มีโมเมนต์'}</h3>
                        <p>{t('feed.beFirst') || 'มาเป็นคนแรกที่แชร์โมเมนต์กันเถอะ!'}</p>
                        <button className="btn-primary" onClick={onOpenCreateModal} style={{ marginTop: 8 }}>
                            <PlusCircle size={18} /> {t('feed.createMoment') || 'สร้างโมเมนต์'}
                        </button>
                    </div>
                ) : (
                    posts.map(post => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={post.id}
                            className="glass-panel feed-card"
                            style={{
                                zIndex: activePostMenu === post.id ? 100 : 1,
                                position: 'relative'
                            }}
                        >
                            <div className="card-header">
                                <div className="user-info" onClick={() => onSelectUser(post.userId)} style={{ cursor: 'pointer' }}>
                                    <img src={post.userImage} alt="avatar" />
                                    <div>
                                        <h3>{post.username}</h3>
                                        <span>{new Date(post.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="menu-container">
                                    <MoreHorizontal
                                        size={20}
                                        className="more-options"
                                        onClick={(e) => toggleMenu(e, post.id)}
                                    />
                                    {activePostMenu === post.id && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className="post-menu glass-panel"
                                        >
                                            <button onClick={(e) => handleSave(e, post.id)} className="save-btn" style={{ color: post.hasSaved ? 'var(--primary)' : 'white' }}>
                                                <Bookmark size={16} fill={post.hasSaved ? "var(--primary)" : "transparent"} color={post.hasSaved ? "var(--primary)" : "currentColor"} />
                                                {post.hasSaved ? (language === 'th' ? 'เลิกบันทึกโพสต์' : 'Unsave Post') : (language === 'th' ? 'บันทึกโพสต์' : 'Save Post')}
                                            </button>

                                            {post.userId !== user.id && (
                                                <>
                                                    <button onClick={(e) => handleReport(e, post.id)} className="report-btn">
                                                        <ShieldAlert size={16} /> {language === 'th' ? 'รายงานโพสต์' : 'Report Post'}
                                                    </button>
                                                    <button onClick={(e) => handleBlock(e, post.userId, post.userImage, post.username)} className="block-btn danger">
                                                        <Ban size={16} /> {language === 'th' ? 'บล็อกผู้ใช้' : 'Block User'}
                                                    </button>
                                                </>
                                            )}

                                            {post.userId === user.id && (
                                                <button onClick={(e) => requestDelete(e, post.id)} className="delete-btn danger">
                                                    <Trash2 size={16} /> {t('feed.delete')}
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            <p className="post-text">{post.text}</p>

                            {post.image && (
                                <div className="post-image" onClick={() => openStoryOverlay(post)} style={{ cursor: 'pointer' }}>
                                    <img src={post.image} alt="post" />
                                </div>
                            )}

                            <div className="card-footer" style={{ position: 'relative' }}>
                                <div className="like-wrapper">
                                    <AnimatePresence>
                                        {reactionPostId === post.id && (
                                            <motion.div
                                                className="reaction-bar glass-panel"
                                                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                                animate={{ opacity: 1, y: -50, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.5 }}
                                            >
                                                {['❤️', '😂', '🔥', '✨', '👋', '🎵'].map((emoji, i) => (
                                                    <motion.button
                                                        key={emoji}
                                                        whileHover={{ scale: 1.4, y: -5 }}
                                                        onClick={(e) => { e.stopPropagation(); selectReaction(post.id, emoji); }}
                                                        style={{ background: 'none', border: 'none', fontSize: '1.6rem', cursor: 'pointer' }}
                                                    >
                                                        {emoji}
                                                    </motion.button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        className={`action-btn ${post.hasLiked ? 'liked' : ''}`}
                                        onClick={() => handleLike(post.id)}
                                        onPointerDown={() => onLikePointerDown(post.id)}
                                        onPointerUp={onLikePointerUp}
                                        onPointerLeave={onLikePointerUp}
                                    >
                                        <span className={likeAnimatingId === post.id ? 'like-burst' : ''}>
                                            {post.reaction && post.hasLiked ? (
                                                <span style={{ fontSize: '1.4rem' }}>{post.reaction}</span>
                                            ) : (
                                                <Heart
                                                    size={22}
                                                    fill={post.hasLiked ? "#FF4081" : "transparent"}
                                                    color={post.hasLiked ? "#FF4081" : "currentColor"}
                                                    style={{ display: 'block' }}
                                                />
                                            )}
                                        </span>
                                        <span>{post.likes}</span>
                                    </button>
                                </div>
                                <button className="action-btn" onClick={() => openComments(post)}>
                                    <MessageCircle size={22} />
                                    <span>{post.commentCount || 0}</span>
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Comments Modal */}
            <AnimatePresence>
                {activeCommentPost && (
                    <div className="modal-overlay comment-overlay" onClick={() => setActiveCommentPost(null)}>
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="comment-drawer glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="drawer-handle"></div>
                            <div className="drawer-header">
                                <button className="close-drawer" onClick={() => setActiveCommentPost(null)}>
                                    <X size={20} />
                                </button>
                                <h3>{t('feed.comments')}</h3>
                                <div style={{ width: 20 }}></div>
                            </div>

                            <div className="comments-list">
                                {comments.length === 0 ? (
                                    <div className="empty-comments">
                                        <MessageCircle size={48} opacity={0.2} />
                                        <p>{t('feed.beFirstComment')}</p>
                                    </div>
                                ) : (
                                    comments.map(comment => (
                                        <div key={comment.id} className="comment-item">
                                            <img src={comment.userImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${comment.userId}`} alt="avatar" />
                                            <div className="comment-body">
                                                <div className="comment-meta">
                                                    <span className="username">{comment.username}</span>
                                                    <span className="time">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p>{comment.text}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="comment-input-area" style={{ position: 'relative' }}>
                                {showMentionSuggestions && mentionUsers.length > 0 && (
                                    <div className="mention-suggestions glass-panel">
                                        {mentionUsers.map(u => (
                                            <div key={u.id} className="mention-user" onClick={() => insertMention(u.username)}>
                                                <img src={u.image || `https://ui-avatars.com/api/?name=${u.name}&background=random`} alt="user" />
                                                <div className="mention-info">
                                                    <strong>{u.name}</strong>
                                                    <span>@{u.username}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <form onSubmit={handleSendComment}>
                                    <input
                                        type="text"
                                        placeholder={t('feed.addComment')}
                                        value={newCommentText}
                                        onChange={handleCommentChange}
                                        autoFocus
                                    />
                                    <button type="submit" className="send-comment-btn" disabled={!newCommentText.trim() || isSubmittingComment}>
                                        {isSubmittingComment ? <div className="loading-spinner small"></div> : <Send size={20} />}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirmationId && (
                <div className="modal-overlay">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="modal-content glass-panel confirm-modal"
                    >
                        <h3>{t('feed.deleteMoment')}</h3>
                        <p>{t('feed.deleteWarning')}</p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setDeleteConfirmationId(null)}>{t('common.cancel')}</button>
                            <button className="btn-danger" onClick={confirmDelete}>{t('feed.delete')}</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Notification Inbox Modal */}
            <AnimatePresence>
                {showNotifInbox && (
                    <div className="modal-overlay" onClick={() => setShowNotifInbox(false)}>
                        <motion.div
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            className="inbox-modal glass-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="inbox-header">
                                <h2>{t('notifications.title')}</h2>
                                <button className="clear-btn" onClick={clearHistory}>{t('notifications.clearAll')}</button>
                            </div>
                            <div className="inbox-content">
                                {history.length === 0 ? (
                                    <div className="empty-inbox">
                                        <Bell size={48} />
                                        <p>{t('notifications.noNotifications')}</p>
                                    </div>
                                ) : (
                                    history.map(item => (
                                        <div key={item.id} className={`inbox-item ${item.type}`}>
                                            <div className="item-icon">
                                                {item.type === 'welcome' && '✨'}
                                                {item.type === 'match' && '❤️'}
                                                {item.type === 'info' && '🔹'}
                                                {item.type === 'success' && '✅'}
                                            </div>
                                            <div className="item-details">
                                                <p>{item.message}</p>
                                                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Story/Overlay View Modal */}
            <AnimatePresence>
                {storyOverlayPost && (
                    <div className="modal-overlay" style={{ zIndex: 10000 }}>
                        <motion.div
                            className="story-overlay"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            {/* Background Image Container */}
                            <div className="story-bg" style={{ backgroundImage: `url(${storyOverlayPost.image})` }}></div>
                            <div className="story-backdrop"></div>

                            {/* Top info */}
                            <div className="story-top">
                                <div className="user-info" onClick={() => { onSelectUser(storyOverlayPost.userId); setStoryOverlayPost(null); }}>
                                    <img src={storyOverlayPost.userImage} alt="" />
                                    <div>
                                        <h3>{storyOverlayPost.username}</h3>
                                        <span>{new Date(storyOverlayPost.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => setStoryOverlayPost(null)} className="close-story">
                                    <X size={24} color="white" />
                                </button>
                            </div>

                            {/* Bottom interactive area */}
                            <div className="story-bottom">
                                <p className="story-caption">{storyOverlayPost.text}</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .spinning {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse-text {
                    0%, 100% { opacity: 1; text-shadow: 0 0 10px var(--primary-glow); }
                    50% { opacity: 0.5; text-shadow: none; }
                }
                .sticky-header {
                    position: sticky;
                    top: 10px;
                    z-index: 10;
                    margin-bottom: 20px;
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .action-icon { cursor: pointer; color: var(--text-main); transition: all 0.2s; }
                .action-icon:hover { transform: scale(1.1); color: var(--primary); }
                
                .notification-bell-home {
                    position: relative;
                    cursor: pointer;
                }
                .notif-dot-glow {
                    position: absolute;
                    top: 2px;
                    right: 2px;
                    width: 8px;
                    height: 8px;
                    background: var(--primary);
                    border-radius: 50%;
                    box-shadow: 0 0 10px var(--primary-glow);
                }
                
                .inbox-modal {
                    position: fixed;
                    top: 0;
                    bottom: 0;
                    width: 320px;
                    background: var(--glass-thick);
                    backdrop-filter: blur(20px);
                    padding: 30px 20px;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid var(--glass-border);
                }
                .inbox-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                }
                .inbox-header h2 { font-size: 1.4rem; font-weight: 700; color: var(--primary); }
                .clear-btn { background: none; border: none; color: var(--text-muted); font-size: 0.8rem; cursor: pointer; }

                .inbox-content {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .inbox-item {
                    display: flex;
                    gap: 12px;
                    padding: 15px;
                    background: rgba(255,255,255,0.03);
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .inbox-item.welcome { border-left: 4px solid #FFD700; background: rgba(255, 215, 0, 0.05); }
                .inbox-item.match { border-left: 4px solid #FF4081; background: rgba(255, 64, 129, 0.05); }
                .item-icon { font-size: 1.2rem; }
                .item-details p { font-size: 0.85rem; line-height: 1.4; margin-bottom: 4px; color: var(--text-main); }
                .item-details span { font-size: 0.7rem; color: var(--text-dim); }

                .empty-inbox {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--text-muted);
                    gap: 15px;
                    text-align: center;
                }
                .empty-inbox p { font-size: 0.9rem; }

                /* Comment Drawer */
                .comment-overlay { display: flex; align-items: flex-end; justify-content: center; padding: 0; }
                .comment-drawer {
                    width: 100%;
                    max-width: 500px;
                    height: 70vh;
                    border-radius: 30px 30px 0 0;
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    overflow: hidden;
                }
                .drawer-handle {
                    width: 40px;
                    height: 4px;
                    background: var(--glass-border);
                    border-radius: 2px;
                    margin: 12px auto;
                }
                .drawer-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 20px 15px;
                    border-bottom: 1px solid var(--glass-border);
                }
                .close-drawer { background: none; border: none; color: var(--text-muted); cursor: pointer; }
                .drawer-header h3 { font-size: 1.1rem; font-weight: 700; }
                
                .comments-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .comment-item {
                    display: flex;
                    gap: 12px;
                }
                .comment-item img { width: 36px; height: 36px; border-radius: 50%; }
                .comment-body { flex: 1; }
                .comment-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
                .comment-meta .username { font-size: 0.85rem; font-weight: 700; color: var(--primary); }
                .comment-meta .time { font-size: 0.75rem; color: var(--text-dim); }
                .comment-body p { font-size: 0.9rem; line-height: 1.4; color: var(--text-main); }

                .empty-comments {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--text-dim);
                    gap: 10px;
                }

                .comment-input-area {
                    padding: 15px 20px 30px;
                    background: var(--glass);
                    border-top: 1px solid var(--glass-border);
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                .comment-input-area input {
                    flex: 1;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 20px;
                    padding: 10px 15px;
                    color: var(--text-main);
                    outline: none;
                }
                .comment-input-area button {
                    background: none;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .comment-input-area button:disabled { opacity: 0.5; cursor: default; }

                .feed-card {
                    margin-bottom: -15px;
                    border-radius: 20px;
                    padding: 6px 16px 16px;
                    transition: transform 0.2s;
                }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .user-info img {
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                }
                .user-info h3 { font-size: 0.95rem; font-weight: 600; }
                .user-info span { font-size: 0.75rem; color: var(--text-dim); }
                .more-options { color: var(--text-muted); cursor: pointer; }
                
                .menu-container {
                    position: relative;
                    z-index: 20;
                }
                .post-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 5px;
                    padding: 5px;
                    min-width: 120px;
                    z-index: 1000;
                    background: var(--glass-thick);
                }
                .save-btn, .delete-btn, .report-btn, .block-btn {
                    width: 100%;
                    padding: 10px 12px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: none;
                    border: none;
                    font-size: 0.9rem;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: background 0.2s;
                    color: var(--text-main);
                }
                .save-btn:hover, .report-btn:hover {
                    background: var(--glass);
                }
                .delete-btn, .block-btn, .danger {
                    color: #EF4444;
                }
                .delete-btn:hover, .block-btn:hover, .danger:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                .post-text {
                    margin-bottom: 12px;
                    line-height: 1.5;
                    font-size: 0.95rem;
                    color: var(--text-main);
                }
                .post-image {
                    border-radius: 16px;
                    overflow: hidden;
                    margin-bottom: 14px;
                    aspect-ratio: 4/3;
                }
                .post-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .card-footer {
                    display: flex;
                    gap: 24px;
                    padding-top: 9px;
                    border-top: 1px solid var(--glass-border);
                }
                .action-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    font-family: var(--font-main);
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }
                .action-btn.liked { color: var(--primary); }
                .action-btn:hover { color: var(--text-main); }

                .loading-state, .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: var(--text-muted);
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    z-index: 100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .modal-content {
                    width: 100%;
                    max-width: 500px;
                    padding: 24px;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .modal-content textarea {
                    width: 100%;
                    height: 120px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 15px;
                    color: var(--text-main);
                    resize: none;
                    outline: none;
                    font-family: inherit;
                    margin-bottom: 20px;
                }
                .preview-container {
                    position: relative;
                    border-radius: 12px;
                    overflow: hidden;
                    margin-bottom: 20px;
                }
                .preview-container img { width: 100%; max-height: 200px; object-fit: cover; }
                .remove-img {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0,0,0,0.5);
                    border: none;
                    color: white;
                    padding: 5px;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .modal-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .image-upload-btn {
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .image-upload-btn:hover { color: var(--primary); }
                .send-post {
                    padding: 10px 24px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                /* Confirm Modal */
                .confirm-modal {
                    text-align: center;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .confirm-modal h3 {
                    margin-bottom: 10px;
                    color: white;
                }
                .confirm-modal p {
                    margin-bottom: 24px;
                    color: var(--text-muted);
                }
                .btn-secondary {
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 20px;
                    cursor: pointer;
                }
                .btn-danger {
                    background: #EF4444;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 20px;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
                }

                /* Mention Suggestions */
                .mention-suggestions {
                    position: absolute;
                    bottom: 100%;
                    left: 0;
                    right: 0;
                    background: rgba(20, 20, 30, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    margin-bottom: 10px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 1000;
                    box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
                }
                .mention-user {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 15px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .mention-user:hover { background: rgba(255,255,255,0.05); }
                .mention-user img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
                .mention-info strong { display: block; font-size: 0.9rem; color: white; }
                .mention-info span { font-size: 0.8rem; color: var(--primary); }

                /* Story Overlay UI */
                .story-overlay {
                    position: fixed; inset: 0; 
                    background: black; z-index: 10000;
                    display: flex; flex-direction: column; overflow: hidden;
                }
                .story-bg {
                    position: absolute; inset: 0; 
                    background-size: contain; background-position: center; background-repeat: no-repeat;
                    z-index: 1; filter: drop-shadow(0 0 10px rgba(0,0,0,0.8));
                }
                .story-backdrop {
                    position: absolute; inset: 0;
                    background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 60%, rgba(0,0,0,0.9) 100%);
                    z-index: 2; pointer-events: none;
                }
                .story-top {
                    position: relative; z-index: 3;
                    display: flex; justify-content: space-between; align-items: flex-start;
                    padding: 20px; padding-top: calc(20px + env(safe-area-inset-top));
                }
                .story-top .user-info { display: flex; align-items: center; gap: 10px; cursor: pointer; }
                .story-top .user-info img { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--primary); }
                .story-top .user-info h3 { color: white; font-size: 1rem; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
                .story-top .user-info span { color: rgba(255,255,255,0.7); font-size: 0.75rem; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
                .close-story { background: rgba(0,0,0,0.4); border: none; padding: 8px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
                
                .story-bottom {
                    position: relative; z-index: 3; margin-top: auto;
                    display: flex; flex-direction: column; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom));
                }
                .story-caption { color: white; margin-bottom: 20px; font-size: 1.05rem; line-height: 1.5; text-shadow: 0 2px 5px rgba(0,0,0,0.8); }
                .vibe-btn.active, .aura-btn.active { background: #a855f7; border-color: #ec4899; box-shadow: 0 0 10px rgba(236,72,153,0.5); }
                
                .reaction-bar {
                    position: absolute;
                    bottom: 0px;
                    left: 0;
                    display: flex;
                    gap: 12px;
                    padding: 8px 15px;
                    border-radius: 30px;
                    background: rgba(30, 20, 40, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(15px);
                    z-index: 100;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .like-wrapper { position: relative; }

                /* Post text enhancements */
                .post-text { padding: 0 4px; margin-bottom: 12px; font-size: 0.95rem; line-height: 1.5; color: var(--text-main); white-space: pre-wrap; }
            `}</style>
        </div>
    );
};

export default MomentsFeed;
