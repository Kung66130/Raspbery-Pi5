import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Image as ImageIcon, Send } from 'lucide-react';
import { api } from '../services/api';
import { useNotification } from './NotificationSystem';
import { useLanguage } from '../contexts/LanguageContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const CreatePostModal = ({ user, onClose, onPostSuccess }) => {
    const [text, setText] = useState('');
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const { t } = useLanguage();

    const handleImageChange = async () => {
        if (Capacitor.isNativePlatform()) {
            try {
                // Check and request permissions (native)
                let permissions = await Camera.checkPermissions();
                if (permissions.photos !== 'granted' || permissions.camera !== 'granted') {
                    permissions = await Camera.requestPermissions();
                    if (permissions.photos !== 'granted') {
                         showNotification("ต้องการสิทธิ์เข้าถึงรูปภาพเพื่ออัปโหลด", "error");
                         return;
                    }
                }

                const photo = await Camera.getPhoto({
                    resultType: CameraResultType.Uri,
                    source: CameraSource.Prompt,
                    quality: 80,
                    allowEditing: true,
                });

                if (photo.webPath) {
                    const response = await fetch(photo.webPath);
                    const blob = await response.blob();
                    const file = new File([blob], `photo_${Date.now()}.${photo.format}`, { type: `image/${photo.format}` });
                    setImage(file);
                    setPreviewUrl(photo.webPath);
                }
            } catch (err) {
                console.warn('Camera error or cancelled:', err);
            }
        } else {
            // Fallback for browser
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    setImage(file);
                    setPreviewUrl(URL.createObjectURL(file));
                }
            };
            input.click();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim() && !image) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('text', text);
        formData.append('username', user.name);
        formData.append('userImage', user.image || 'https://i.pravatar.cc/150?u=' + user.id);
        if (image) formData.append('image', image);

        try {
            const newPost = await api.post('/posts', formData, true);
            showNotification(t('feed.momentShared'), 'success');
            onPostSuccess(newPost);
            onClose();
        } catch (err) {
            showNotification(`${t('common.error')}: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="modal-content glass-panel"
            >
                <div className="modal-header">
                    <h2>{t('feed.createMoment')}</h2>
                    <button className="close-btn" onClick={onClose}><X /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <textarea
                        placeholder={t('feed.whatsOnMind')}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        required={!image}
                    />

                    {previewUrl && (
                        <div className="preview-container">
                            <motion.img
                                src={previewUrl}
                                alt="preview"
                                drag="y"
                                dragConstraints={{ top: -150, bottom: 0 }}
                                initial={{ y: 0 }}
                                whileTap={{ cursor: 'grabbing' }}
                                style={{ cursor: 'grab' }}
                            />
                            <button type="button" className="remove-img" onClick={() => { setPreviewUrl(null); setImage(null) }}><X size={14} /></button>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="image-upload-btn" onClick={handleImageChange}>
                            <ImageIcon size={24} />
                        </button>
                        <button type="submit" className="btn-primary send-post" disabled={loading || (!text.trim() && !image)}>
                            {loading ? t('feed.posting') : <><Send size={20} /> {t('feed.post')}</>}
                        </button>
                    </div>
                </form>
            </motion.div>
            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    backdrop-filter: blur(5px);
                }
                .modal-content {
                    width: 100%;
                    max-width: 500px;
                    padding: 24px;
                    background: var(--bg-light);
                    border: 1px solid var(--glass-border);
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
                    color: white;
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
                    height: 200px;
                    background: #1a1a1a;
                }
                .preview-container img { 
                    width: 100%; 
                    min-height: 100%;
                    object-fit: cover; 
                }
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: var(--glass);
                }
                .image-upload-btn:hover { color: var(--primary); background: rgba(255,255,255,0.1); }
                .send-post {
                    padding: 10px 24px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: var(--text-dim);
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default CreatePostModal;
