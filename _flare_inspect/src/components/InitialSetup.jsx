import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ChevronRight, User } from 'lucide-react';
import { api } from '../services/api';

const InitialSetup = ({ user, onComplete }) => {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(user.image || '');
    const [age, setAge] = useState('');
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('profileComplete', 'true');
            if (age) formData.append('age', age); // Note: Backend must support saving age if needed, else we just use it for completeness here.
            
            if (image) {
                formData.append('image', image);
            }

            const updatedUser = await api.put('/users/profile', formData, true); // true for multipart
            
            // Ensure local storage is updated
            const currentUserStr = localStorage.getItem('flare_user');
            if (currentUserStr) {
                const currentUser = JSON.parse(currentUserStr);
                const merged = { ...currentUser, ...updatedUser, profileComplete: 1 };
                localStorage.setItem('flare_user', JSON.stringify(merged));
                onComplete(merged);
            } else {
                onComplete({ ...updatedUser, profileComplete: 1 });
            }

        } catch (error) {
            console.error('Setup failed:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกโปรไฟล์');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="setup-container">
            <motion.div 
                className="setup-card glass-panel"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <h2>ยินดีต้อนรับสู่ Flare! 🔥</h2>
                <p>ก่อนเริ่มต้น ขอรูปโปรไฟล์และอายุของคุณเพื่อให้เพื่อนๆ รู้จักคุณมากขึ้น</p>

                <div className="avatar-upload">
                    <label>
                        {imagePreview ? (
                            <img src={imagePreview} alt="Profile" />
                        ) : (
                            <div className="avatar-placeholder">
                                <Camera size={40} />
                                <span>อัปโหลดรูป</span>
                            </div>
                        )}
                        <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                    </label>
                </div>

                <div className="input-field">
                    <label><User size={16} /> อายุของคุณ</label>
                    <input 
                        type="number" 
                        placeholder="ระบุอายุ (เช่น 18)" 
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        min={13}
                        max={99}
                    />
                </div>

                <button 
                    className={`btn-primary next-btn ${(imagePreview || age) ? '' : 'disabled'}`} 
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? 'กำลังบันทึก...' : 'เข้าสู่แอป'} <ChevronRight size={20} />
                </button>
            </motion.div>

            <style>{`
                .setup-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    background: radial-gradient(circle at top right, var(--primary-glow), transparent),
                                radial-gradient(circle at bottom left, var(--secondary-glow), transparent);
                    padding: 20px;
                }
                .setup-card {
                    width: 100%;
                    max-width: 400px;
                    padding: 40px;
                    text-align: center;
                    border-radius: 24px;
                }
                .setup-card h2 {
                    background: linear-gradient(135deg, var(--primary), #ec4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 1.8rem;
                    margin-bottom: 10px;
                }
                .setup-card p {
                    color: var(--text-muted);
                    font-size: 0.95rem;
                    margin-bottom: 30px;
                }
                .avatar-upload {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 30px;
                }
                .avatar-upload label {
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 2px dashed rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    overflow: hidden;
                    transition: all 0.3s;
                }
                .avatar-upload label:hover {
                    border-color: var(--primary);
                    background: rgba(255, 255, 255, 0.1);
                }
                .avatar-upload img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .avatar-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    color: rgba(255, 255, 255, 0.5);
                    gap: 10px;
                }
                .input-field {
                    text-align: left;
                    margin-bottom: 30px;
                }
                .input-field label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                    color: var(--text-dim);
                    margin-bottom: 10px;
                }
                .input-field input {
                    width: 100%;
                    padding: 14px 20px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    color: white;
                    font-size: 1rem;
                    outline: none;
                    transition: all 0.3s;
                }
                .input-field input:focus {
                    border-color: var(--primary);
                    background: rgba(255, 255, 255, 0.08);
                }
                .next-btn {
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 10px;
                    padding: 14px;
                    font-size: 1.1rem;
                }
                .next-btn.disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};

export default InitialSetup;
