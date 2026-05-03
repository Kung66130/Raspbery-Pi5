import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, User, Copy, PenLine, Camera, Heart, MapPin, Calendar, ChevronRight, ChevronLeft, Check, X as XIcon, LogOut } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';

const INTEREST_OPTIONS = [
    { id: 'music', emoji: '🎵', label: 'soul.interests.music' },
    { id: 'movies', emoji: '🎬', label: 'soul.interests.movies' },
    { id: 'travel', emoji: '✈️', label: 'soul.interests.travel' },
    { id: 'food', emoji: '🍜', label: 'soul.interests.food' },
    { id: 'sports', emoji: '⚽', label: 'soul.interests.sports' },
    { id: 'gaming', emoji: '🎮', label: 'soul.interests.gaming' },
    { id: 'art', emoji: '🎨', label: 'soul.interests.art' },
    { id: 'reading', emoji: '📚', label: 'soul.interests.reading' },
    { id: 'photography', emoji: '📷', label: 'soul.interests.photography' },
    { id: 'cooking', emoji: '👨‍🍳', label: 'soul.interests.cooking' },
    { id: 'fitness', emoji: '💪', label: 'soul.interests.fitness' },
    { id: 'anime', emoji: '🌸', label: 'soul.interests.anime' },
    { id: 'nature', emoji: '🌿', label: 'soul.interests.nature' },
    { id: 'tech', emoji: '💻', label: 'soul.interests.tech' },
    { id: 'fashion', emoji: '👗', label: 'soul.interests.fashion' },
    { id: 'coffee', emoji: '☕', label: 'soul.interests.coffee' },
    { id: 'pet', emoji: '🐾', label: 'soul.interests.pet' },
    { id: 'kpop', emoji: '🎤', label: 'soul.interests.kpop' },
];

const LOOKING_FOR_OPTIONS = [
    { id: 'friends', emoji: '👋', label: 'soul.looking.friends' },
    { id: 'dating', emoji: '💕', label: 'soul.looking.dating' },
    { id: 'relationship', emoji: '❤️', label: 'soul.looking.relationship' },
    { id: 'hangout', emoji: '🎉', label: 'soul.looking.hangout' },
    { id: 'anything', emoji: '🌈', label: 'soul.looking.anything' },
];

const SoulProfileSetup = ({ user, onComplete, initialData }) => {
    const { t, language } = useLanguage();
    // Use localStorage to remember if they started setup
    const draftKey = `soul_draft_${user.id}`;
    const savedDraft = localStorage.getItem(draftKey);
    const parsedDraft = savedDraft ? JSON.parse(savedDraft) : null;

    // If we have initialData, we are editing, so skip the choice step and go straight to form
    const [step, setStep] = useState(initialData ? 'form' : (parsedDraft?.step || 'form'));
    const [soulProfile, setSoulProfile] = useState({
        displayName: initialData?.displayName || parsedDraft?.profile?.displayName || '',
        bio: initialData?.bio || parsedDraft?.profile?.bio || '',
        age: initialData?.age || parsedDraft?.profile?.age || '',
        gender: initialData?.gender || parsedDraft?.profile?.gender || '',
        height: initialData?.height || parsedDraft?.profile?.height || '',
        education: initialData?.education || parsedDraft?.profile?.education || '',
        zodiac: initialData?.zodiac || parsedDraft?.profile?.zodiac || '',
        image: null,
        imagePreview: initialData?.imagePreview || parsedDraft?.profile?.imagePreview || null,
        additionalImages: initialData?.additionalImages || parsedDraft?.profile?.additionalImages || [],
        interests: initialData?.interests || parsedDraft?.profile?.interests || [],
        lookingFor: initialData?.lookingFor || parsedDraft?.profile?.lookingFor || [],
        location: initialData?.location || parsedDraft?.profile?.location || '',
    });

    const saveDraft = (newStep, newProfile) => {
        if (initialData) return; // Don't save drafts while editing existing profile
        localStorage.setItem(draftKey, JSON.stringify({
            step: newStep,
            profile: newProfile || soulProfile
        }));
    };

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
    };

    const handleImportProfile = async () => {
        const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=80`;
        const profileToSave = {
            displayName: user.name || 'Soul User',
            bio: user.bio || 'Hello, I\'m new here!',
            age: 22,
            gender: 'other',
            imagePreview: user.image || defaultAvatar,
            interests: ['music', 'travel', 'food'],
            lookingFor: ['friends', 'anything'],
            location: 'กรุงเทพมหานคร',
            ownerId: user.id,
            updatedAt: new Date().toISOString()
        };

        try {
            // Immediate save for one-click entry
            await api.post('/soul/profile', profileToSave);
            clearDraft();
            onComplete(profileToSave);
        } catch (err) {
            console.error('Failed to quick-import profile:', err);
            // Fallback: if API fails, at least let them see the form
            setSoulProfile(profileToSave);
            setStep('form');
        }
    };

    const handleCreateNew = () => {
        // Even for new profiles, give a random starter avatar so it's not empty
        const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${Math.random()}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=80`;
        const nextProfile = {
            ...soulProfile,
            imagePreview: soulProfile.imagePreview || defaultAvatar
        };
        setSoulProfile(nextProfile);
        setStep('form');
        saveDraft('form', nextProfile);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const nextProfile = {
                ...soulProfile,
                image: file,
                imagePreview: URL.createObjectURL(file),
            };
            setSoulProfile(nextProfile);
            saveDraft(step, nextProfile);
        }
    };

    const toggleInterest = (id) => {
        const nextProfile = {
            ...soulProfile,
            interests: soulProfile.interests.includes(id)
                ? soulProfile.interests.filter(i => i !== id)
                : soulProfile.interests.length < 6 ? [...soulProfile.interests, id] : soulProfile.interests
        };
        setSoulProfile(nextProfile);
        saveDraft(step, nextProfile);
    };

    const toggleLookingFor = (id) => {
        const nextProfile = {
            ...soulProfile,
            lookingFor: soulProfile.lookingFor.includes(id)
                ? soulProfile.lookingFor.filter(i => i !== id)
                : [...soulProfile.lookingFor, id]
        };
        setSoulProfile(nextProfile);
        saveDraft(step, nextProfile);
    };

    const handleSave = async () => {
        const profileToSave = {
            ...soulProfile,
            ownerId: user.id,
            image: undefined,
            updatedAt: new Date().toISOString()
        };

        try {
            await api.post('/soul/profile', profileToSave);

            // Transition only if successful
            onComplete(profileToSave);
            clearDraft();
        } catch (err) {
            console.error('Failed to save profile background:', err);
            alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล:\n${err.message}`);
        }
    };

    const canProceedForm = soulProfile.displayName.trim() && soulProfile.age && soulProfile.gender && soulProfile.imagePreview;
    const canProceedInterests = soulProfile.interests.length >= 1;
    const canProceedLooking = soulProfile.lookingFor.length >= 1;


    // ===== STEP: FORM =====
    const renderForm = () => (
        <motion.div
            key="form"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="soul-setup-step"
        >
            <div className="step-header">
                <button className="back-btn" onClick={() => window.location.reload()} title="ไปที่หน้าแรก">
                    <ChevronLeft size={20} />
                </button>
                <div className="step-progress">
                    <div className="progress-dot active" />
                    <div className="progress-dot" />
                    <div className="progress-dot" />
                    <div className="progress-dot" />
                    <div className="progress-dot" />
                </div>
                <span className="step-label">1/5</span>
            </div>

            <h2 className="form-title">
                {t('soul.basicInfo')}
            </h2>

            <div className="avatar-upload-area">
                <label className="avatar-upload-circle">
                    {soulProfile.imagePreview ? (
                        <img
                            src={soulProfile.imagePreview}
                            alt="Soul Avatar"
                            onError={(e) => {
                                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=80`;
                            }}
                        />
                    ) : (
                        <div className="avatar-placeholder">
                            <Camera size={32} />
                        </div>
                    )}
                    <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                </label>
                <span className={`avatar-hint ${!soulProfile.imagePreview ? 'required' : ''}`}>
                    {!soulProfile.imagePreview ? 'กรุณาลงรูปโปรไฟล์ก่อนไปขั้นตอนถัดไป' : t('soul.tapToChange')}
                </span>
            </div>

            <div className="form-fields">
                <div className="field-group">
                    <label><User size={16} /> {t('soul.displayName')}</label>
                    <input
                        type="text"
                        placeholder={t('soul.displayNamePlaceholder')}
                        value={soulProfile.displayName}
                        onChange={e => {
                            const next = { ...soulProfile, displayName: e.target.value };
                            setSoulProfile(next);
                            saveDraft('form', next);
                        }}
                        maxLength={30}
                    />
                </div>

                <div className="field-group">
                    <label><Heart size={16} /> Bio</label>
                    <textarea
                        placeholder={t('soul.bioPlaceholder')}
                        value={soulProfile.bio}
                        onChange={e => {
                            const next = { ...soulProfile, bio: e.target.value };
                            setSoulProfile(next);
                            saveDraft('form', next);
                        }}
                        maxLength={150}
                        rows={3}
                    />
                    <span className="char-count">{soulProfile.bio.length}/150</span>
                </div>

                <div className="field-row">
                    <div className="field-group half">
                        <label><Calendar size={16} /> {t('soul.age')}</label>
                        <input
                            type="number"
                            placeholder="18"
                            min={16}
                            max={99}
                            value={soulProfile.age}
                            onChange={e => {
                                const next = { ...soulProfile, age: e.target.value };
                                setSoulProfile(next);
                                saveDraft('form', next);
                            }}
                        />
                    </div>
                    <div className="field-group half">
                        <label>{t('soul.gender')}</label>
                        <div className="gender-selector">
                            {[
                                { id: 'male', emoji: '♂️', label: t('soul.male') },
                                { id: 'female', emoji: '♀️', label: t('soul.female') },
                                { id: 'other', emoji: '🌈', label: t('soul.other') },
                            ].map(g => (
                                <button
                                    key={g.id}
                                    type="button"
                                    className={`gender-btn ${soulProfile.gender === g.id ? 'active' : ''}`}
                                    onClick={() => {
                                        const next = { ...soulProfile, gender: g.id };
                                        setSoulProfile(next);
                                        saveDraft('form', next);
                                    }}
                                >
                                    <span>{g.emoji}</span>
                                    <span>{g.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="field-row">
                    <div className="field-group half">
                        <label>📐 {t('soul.height') || 'ส่วนสูง (cm)'}</label>
                        <input
                            type="number"
                            placeholder="170"
                            min={100}
                            max={250}
                            value={soulProfile.height || ''}
                            onChange={e => {
                                const next = { ...soulProfile, height: e.target.value };
                                setSoulProfile(next);
                                saveDraft('form', next);
                            }}
                        />
                    </div>
                    <div className="field-group half">
                        <label>🎓 {t('soul.education') || 'การศึกษา'}</label>
                        <select
                            value={soulProfile.education || ''}
                            onChange={e => {
                                const next = { ...soulProfile, education: e.target.value };
                                setSoulProfile(next);
                                saveDraft('form', next);
                            }}
                        >
                            <option value="">เลือกการศึกษา</option>
                            <option value="highschool">มัธยมศึกษา</option>
                            <option value="bachelor">ปริญญาตรี</option>
                            <option value="master">ปริญญาโท</option>
                            <option value="doctorate">ปริญญาเอก</option>
                            <option value="other">อื่นๆ</option>
                        </select>
                    </div>
                </div>

                <div className="field-row">
                    <div className="field-group half">
                        <label>✨ {t('soul.zodiac') || 'ราศี'}</label>
                        <select
                            value={soulProfile.zodiac || ''}
                            onChange={e => {
                                const next = { ...soulProfile, zodiac: e.target.value };
                                setSoulProfile(next);
                                saveDraft('form', next);
                            }}
                        >
                            <option value="">เลือกราศี</option>
                            <option value="aries">ราศีเมษ</option>
                            <option value="taurus">ราศีพฤษภ</option>
                            <option value="gemini">ราศีเมถุน</option>
                            <option value="cancer">ราศีกรกฎ</option>
                            <option value="leo">ราศีสิงห์</option>
                            <option value="virgo">ราศีกันย์</option>
                            <option value="libra">ราศีตุลย์</option>
                            <option value="scorpio">ราศีพิจิก</option>
                            <option value="sagittarius">ราศีธนู</option>
                            <option value="capricorn">ราศีมังกร</option>
                            <option value="aquarius">ราศีกุมภ์</option>
                            <option value="pisces">ราศีมีน</option>
                        </select>
                    </div>
                    <div className="field-group half">
                        <label><MapPin size={16} /> {t('soul.location')}</label>
                        <select
                            className="province-select"
                            value={soulProfile.location}
                            onChange={e => {
                                const next = { ...soulProfile, location: e.target.value };
                                setSoulProfile(next);
                                saveDraft('form', next);
                            }}
                        >
                            <option value="">{t('soul.selectProvince')}</option>
                            {[
                                "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น", "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร", "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม", "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส", "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี", "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก", "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน", "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง", "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ", "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย", "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง", "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี"
                            ].sort((a, b) => a.localeCompare(b, 'th')).map(pv => (
                                <option key={pv} value={pv}>{pv}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="step-actions">
                <button
                    className={`next-btn btn-primary ${!canProceedForm ? 'disabled' : ''}`}
                    disabled={!canProceedForm}
                    onClick={() => { setStep('interests'); saveDraft('interests'); }}
                >
                    {t('common.next')} <ChevronRight size={18} />
                </button>
            </div>
        </motion.div>
    );

    // ===== STEP: INTERESTS =====
    const renderInterests = () => (
        <motion.div
            key="interests"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="soul-setup-step"
        >
            <div className="step-header">
                <button className="back-btn" onClick={() => { setStep('form'); saveDraft('form'); }}>
                    <ChevronLeft size={20} />
                </button>
                <div className="step-progress">
                    <div className="progress-dot done" />
                    <div className="progress-dot active" />
                    <div className="progress-dot" />
                    <div className="progress-dot" />
                    <div className="progress-dot" />
                </div>
                <span className="step-label">2/5</span>
            </div>

            <h2 className="form-title">
                {t('soul.interestsTitle')}
            </h2>
            <p className="form-hint">
                {t('soul.interestsHint', { count: soulProfile.interests.length })}
            </p>

            <div className="interest-grid">
                {INTEREST_OPTIONS.map(item => (
                    <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.92 }}
                        className={`interest-chip ${soulProfile.interests.includes(item.id) ? 'selected' : ''}`}
                        onClick={() => toggleInterest(item.id)}
                    >
                        <span className="chip-emoji">{item.emoji}</span>
                        <span className="chip-label">{t(item.label)}</span>
                        {soulProfile.interests.includes(item.id) && <Check size={14} className="chip-check" />}
                    </motion.button>
                ))}
            </div>

            <div className="step-actions">
                <button className="prev-btn" onClick={() => { setStep('form'); saveDraft('form'); }}>
                    <ChevronLeft size={18} /> {t('common.back') || 'ย้อนกลับ'}
                </button>
                <button
                    className={`next-btn btn-primary ${!canProceedInterests ? 'disabled' : ''}`}
                    disabled={!canProceedInterests}
                    onClick={() => { setStep('lookingFor'); saveDraft('lookingFor'); }}
                >
                    {t('common.next')} <ChevronRight size={18} />
                </button>
            </div>
        </motion.div>
    );

    // ===== STEP: LOOKING FOR =====
    const renderLookingFor = () => (
        <motion.div
            key="lookingFor"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="soul-setup-step"
        >
            <div className="step-header">
                <button className="back-btn" onClick={() => { setStep('interests'); saveDraft('interests'); }}>
                    <ChevronLeft size={20} />
                </button>
                <div className="step-progress">
                    <div className="progress-dot done" />
                    <div className="progress-dot done" />
                    <div className="progress-dot active" />
                    <div className="progress-dot" />
                    <div className="progress-dot" />
                </div>
                <span className="step-label">3/5</span>
            </div>

            <h2 className="form-title">
                {t('soul.lookingForTitle')}
            </h2>
            <p className="form-hint">
                {t('soul.lookingForHint')}
            </p>

            <div className="looking-for-list">
                {LOOKING_FOR_OPTIONS.map(item => (
                    <motion.button
                        key={item.id}
                        whileTap={{ scale: 0.97 }}
                        className={`looking-card ${soulProfile.lookingFor.includes(item.id) ? 'selected' : ''}`}
                        onClick={() => toggleLookingFor(item.id)}
                    >
                        <span className="looking-emoji">{item.emoji}</span>
                        <span className="looking-label">{t(item.label)}</span>
                        <div className={`looking-check ${soulProfile.lookingFor.includes(item.id) ? 'checked' : ''}`}>
                            {soulProfile.lookingFor.includes(item.id) && <Check size={14} />}
                        </div>
                    </motion.button>
                ))}
            </div>

            <div className="step-actions">
                <button className="prev-btn" onClick={() => { setStep('interests'); saveDraft('interests'); }}>
                    <ChevronLeft size={18} /> {t('common.back') || 'ย้อนกลับ'}
                </button>
                <button
                    className={`next-btn btn-primary ${!canProceedLooking ? 'disabled' : ''}`}
                    disabled={!canProceedLooking}
                    onClick={() => { setStep('photos'); saveDraft('photos'); }}
                >
                    {t('common.next')} <ChevronRight size={18} />
                </button>
            </div>
        </motion.div>
    );

    // ===== STEP: PHOTOS =====
    const renderPhotos = () => {
        const canProceedPhotos = (soulProfile.imagePreview ? 1 : 0) + (soulProfile.additionalImages?.length || 0) >= 2;

        const handleAdditionalImage = (e) => {
            const files = Array.from(e.target.files);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            const nextProfile = {
                ...soulProfile,
                additionalImages: [...(soulProfile.additionalImages || []), ...newPreviews].slice(0, 5)
            };
            setSoulProfile(nextProfile);
            saveDraft('photos', nextProfile);
        };

        const removeImage = (index) => {
            const nextProfile = {
                ...soulProfile,
                additionalImages: (soulProfile.additionalImages || []).filter((_, i) => i !== index)
            };
            setSoulProfile(nextProfile);
            saveDraft('photos', nextProfile);
        };

        return (
            <motion.div
                key="photos"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="soul-setup-step"
            >
                <div className="step-header">
                    <button className="back-btn" onClick={() => { setStep('lookingFor'); saveDraft('lookingFor'); }}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="step-progress">
                        <div className="progress-dot done" />
                        <div className="progress-dot done" />
                        <div className="progress-dot done" />
                        <div className="progress-dot active" />
                        <div className="progress-dot" />
                    </div>
                    <span className="step-label">4/5</span>
                </div>

                <h2 className="form-title">
                    {t('soul.photosTitle') || 'เพิ่มรูปภาพของคุณ'}
                </h2>
                <p className="form-hint">
                    {t('soul.photosHint') || 'อัปโหลดอย่างน้อย 2 รูปเพื่อให้โปรไฟล์ของคุณน่าสนใจยิ่งขึ้น'}
                </p>

                <div className="photo-grid">
                    <div className="photo-frame main">
                         <img src={soulProfile.imagePreview} alt="avatar" />
                         <div className="photo-badge main">รูปโปรไฟล์</div>
                    </div>

                    {(soulProfile.additionalImages || []).map((img, idx) => (
                        <div key={idx} className="photo-frame">
                            <img src={img} alt={`extra-${idx}`} />
                            <button className="remove-photo" onClick={() => removeImage(idx)}>
                                <XIcon size={14} />
                            </button>
                        </div>
                    ))}

                    {(soulProfile.additionalImages?.length || 0) < 5 && (
                        <label className="photo-frame upload-btn">
                            <input type="file" accept="image/*" multiple hidden onChange={handleAdditionalImage} />
                            <Camera size={24} />
                            <span>เพิ่มรูป</span>
                        </label>
                    )}
                </div>

                <div className="step-actions">
                    <button className="prev-btn" onClick={() => { setStep('lookingFor'); saveDraft('lookingFor'); }}>
                        <ChevronLeft size={18} /> {t('common.back') || 'ย้อนกลับ'}
                    </button>
                    <button
                        className={`next-btn btn-primary ${!canProceedPhotos ? 'disabled' : ''}`}
                        disabled={!canProceedPhotos}
                        onClick={() => { setStep('preview'); saveDraft('preview'); }}
                    >
                        {t('soul.viewPreview') || 'ดูตัวอย่างโปรไฟล์'} <ChevronRight size={18} />
                    </button>
                </div>

                <style>{`
                    .photo-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 12px;
                        margin-bottom: 30px;
                    }
                    .photo-frame {
                        aspect-ratio: 1/1;
                        border-radius: 16px;
                        overflow: hidden;
                        background: var(--glass);
                        border: 2px dashed var(--glass-border);
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: var(--text-dim);
                        font-size: 0.75rem;
                        gap: 8px;
                    }
                    .photo-frame.main { border: 2px solid var(--primary); }
                    .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
                    .photo-badge.main {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: var(--primary);
                        color: white;
                        text-align: center;
                        padding: 2px 0;
                        font-size: 0.65rem;
                        font-weight: 700;
                    }
                    .remove-photo {
                        position: absolute;
                        top: -5px;
                        right: -5px;
                        background: #EF4444;
                        color: white;
                        border: none;
                        border-radius: 50%;
                        width: 22px;
                        height: 22px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        z-index: 2;
                    }
                    .photo-frame.upload-btn { cursor: pointer; border-style: dashed; }
                    .photo-frame.upload-btn:hover { background: rgba(168,85,247,0.05); border-color: var(--primary); color: var(--primary); }
                `}</style>
            </motion.div>
        );
    };

    // ===== STEP: PREVIEW =====
    const renderPreview = () => (
        <motion.div
            key="preview"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="soul-setup-step"
        >
            <div className="step-header">
                <button className="back-btn" onClick={() => { setStep('photos'); saveDraft('photos'); }}>
                    <ChevronLeft size={20} />
                </button>
                <div className="step-progress">
                    <div className="progress-dot done" />
                    <div className="progress-dot done" />
                    <div className="progress-dot done" />
                    <div className="progress-dot done" />
                    <div className="progress-dot active" />
                </div>
                <span className="step-label">5/5</span>
            </div>

            <h2 className="form-title">
                {t('soul.previewTitle')}
            </h2>

            <div className="preview-card glass-panel">
                <div className="preview-cover">
                    <div className="preview-cover-gradient" />
                </div>
                <div className="preview-avatar-area">
                    <div className="preview-avatar">
                        <img
                            src={soulProfile.imagePreview || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&backgroundColor=b6e3f4,c0aede,d1d4f9&scale=80`}
                            alt="Soul"
                        />
                        <div className="preview-online-dot" />
                    </div>
                </div>
                <div className="preview-info">
                    <h3>{soulProfile.displayName}, {soulProfile.age}</h3>
                    <div className="preview-meta">
                        <span className={`preview-gender ${soulProfile.gender}`}>
                            {soulProfile.gender === 'female' ? '♀' : soulProfile.gender === 'male' ? '♂' : '🌈'}
                            {' '}
                            {soulProfile.gender === 'female' ? t('soul.female')
                                : soulProfile.gender === 'male' ? t('soul.male')
                                    : t('soul.other')}
                        </span>
                        {soulProfile.location ? (
                            <span className="preview-location"><MapPin size={12} /> {soulProfile.location}</span>
                        ) : null}
                    </div>
                    {(soulProfile.height || soulProfile.education || soulProfile.zodiac) && (
                        <div className="preview-meta additional-meta">
                            {soulProfile.height && <span className="preview-location">📏 {soulProfile.height} cm</span>}
                            {soulProfile.education && <span className="preview-location">🎓 {
                                soulProfile.education === 'highschool' ? 'มัธยมศึกษา' :
                                soulProfile.education === 'bachelor' ? 'ปริญญาตรี' :
                                soulProfile.education === 'master' ? 'ปริญญาโท' :
                                soulProfile.education === 'doctorate' ? 'ปริญญาเอก' : 'อื่นๆ'
                            }</span>}
                            {soulProfile.zodiac && <span className="preview-location">✨ ราศี{
                                soulProfile.zodiac === 'aries' ? 'เมษ' : soulProfile.zodiac === 'taurus' ? 'พฤษภ' : soulProfile.zodiac === 'gemini' ? 'เมถุน' :
                                soulProfile.zodiac === 'cancer' ? 'กรกฎ' : soulProfile.zodiac === 'leo' ? 'สิงห์' : soulProfile.zodiac === 'virgo' ? 'กันย์' :
                                soulProfile.zodiac === 'libra' ? 'ตุลย์' : soulProfile.zodiac === 'scorpio' ? 'พิจิก' : soulProfile.zodiac === 'sagittarius' ? 'ธนู' :
                                soulProfile.zodiac === 'capricorn' ? 'มังกร' : soulProfile.zodiac === 'aquarius' ? 'กุมภ์' : 'มีน'
                            }</span>}
                        </div>
                    )}
                    {soulProfile.bio ? <p className="preview-bio">{soulProfile.bio}</p> : null}
                    <div className="preview-tags">
                        {soulProfile.interests.map(id => {
                            const item = INTEREST_OPTIONS.find(i => i.id === id);
                            return item ? (
                                <span key={id} className="preview-tag">{item.emoji} {t(item.label)}</span>
                            ) : null;
                        })}
                    </div>
                    <div className="preview-looking">
                        <span className="looking-title">{t('soul.lookingForLabel')}</span>
                        {soulProfile.lookingFor.map(id => {
                            const item = LOOKING_FOR_OPTIONS.find(i => i.id === id);
                            return item ? (
                                <span key={id} className="looking-badge">{item.emoji} {t(item.label)}</span>
                            ) : null;
                        })}
                    </div>
                    {soulProfile.additionalImages && soulProfile.additionalImages.length > 0 ? (
                        <div className="preview-photos">
                            {soulProfile.additionalImages.map((img, i) => (
                                <img key={i} src={img} alt="extra" className="preview-extra-img" />
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="step-actions">
                <button className="prev-btn" onClick={() => { setStep('photos'); saveDraft('photos'); }}>
                    <ChevronLeft size={18} /> {t('common.back') || 'ย้อนกลับ'}
                </button>
                <button className="next-btn btn-primary save-btn" onClick={handleSave}>
                    <Sparkles size={18} />
                    {t('soul.startSoul')}
                </button>
            </div>
        </motion.div>
    );

    const renderPreviewStyles = () => (
        <style>{`
            .preview-photos {
                display: flex;
                gap: 8px;
                justify-content: center;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid var(--glass-border);
                flex-wrap: wrap;
            }
            .preview-extra-img {
                width: 50px;
                height: 50px;
                border-radius: 10px;
                object-fit: cover;
                border: 1px solid var(--glass-border);
            }
        `}</style>
    );

    return (
        <div className="soul-profile-setup">
            <AnimatePresence mode="wait">
                {step === 'form' && renderForm()}
                {step === 'interests' && renderInterests()}
                {step === 'lookingFor' && renderLookingFor()}
                {step === 'photos' && renderPhotos()}
                {step === 'preview' && renderPreview()}
            </AnimatePresence>
            {renderPreviewStyles()}

            <style>{`
                .soul-profile-setup {
                    min-height: calc(100vh - 80px);
                    padding: 20px 20px 120px;
                    display: flex;
                    flex-direction: column;
                }
                .soul-setup-step {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: 480px;
                    margin: 0 auto;
                }

                /* HERO */
                .setup-hero {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 30px 0 25px;
                    position: relative;
                }
                .hero-glow {
                    position: absolute;
                    width: 120px;
                    height: 120px;
                    background: radial-gradient(circle, rgba(168,85,247,0.4), transparent);
                    border-radius: 50%;
                }
                .hero-icon {
                    color: var(--primary);
                    filter: drop-shadow(0 0 20px rgba(168,85,247,0.5));
                    z-index: 1;
                }
                .setup-title {
                    font-size: 1.8rem;
                    font-weight: 800;
                    text-align: center;
                    margin-bottom: 10px;
                    background: linear-gradient(135deg, var(--primary), #ec4899);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .setup-subtitle {
                    text-align: center;
                    color: var(--text-dim);
                    font-size: 0.9rem;
                    line-height: 1.5;
                    margin-bottom: 30px;
                    padding: 0 10px;
                }

                /* CHOICE CARDS */
                .choice-cards {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .choice-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 18px 20px;
                    border-radius: 20px;
                    border: 1px solid var(--glass-border);
                    background: var(--glass);
                    color: var(--text-main);
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.3s;
                    width: 100%;
                }
                .avatar-hint {
                    margin-top: 10px;
                    font-size: 0.85rem;
                    color: var(--text-dim);
                }
                .avatar-hint.required {
                    color: #ec4899;
                    font-weight: 600;
                    animation: pulse 2s infinite;
                }
                    background: rgba(255,255,255,0.07);
                    border-color: rgba(168,85,247,0.3);
                    transform: translateX(4px);
                }
                .choice-icon-wrap {
                    width: 52px;
                    height: 52px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .import-icon {
                    background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.08));
                    color: #60a5fa;
                }
                .new-icon {
                    background: linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.08));
                    color: var(--primary);
                }
                .choice-text { flex: 1; }
                .choice-text h3 { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
                .choice-text p { font-size: 0.78rem; color: var(--text-dim); margin: 0; line-height: 1.4; }
                .choice-arrow { color: var(--text-dim); flex-shrink: 0; }

                .current-profile-hint {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 25px;
                    padding: 12px 16px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 14px;
                    font-size: 0.8rem;
                    color: var(--text-dim);
                }
                .hint-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    object-fit: cover;
                }

                /* STEP HEADER */
                .step-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 25px;
                    padding-top: 10px;
                }
                .back-btn {
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-dim);
                    width: 36px;
                    height: 36px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .back-btn:hover { background: var(--glass); color: var(--text-main); }
                .step-progress {
                    flex: 1;
                    display: flex;
                    gap: 6px;
                }
                .progress-dot {
                    flex: 1;
                    height: 4px;
                    border-radius: 4px;
                    background: var(--glass-border);
                    transition: all 0.3s;
                }
                .progress-dot.active {
                    background: linear-gradient(135deg, var(--primary), #ec4899);
                    box-shadow: 0 0 8px rgba(168,85,247,0.4);
                }
                .progress-dot.done { background: var(--primary); opacity: 0.4; }
                .step-label { font-size: 0.75rem; color: var(--text-dim); font-weight: 600; }

                .form-title {
                    font-size: 1.4rem;
                    font-weight: 800;
                    margin-bottom: 8px;
                    color: var(--text-main);
                }
                .form-hint {
                    color: var(--text-dim);
                    font-size: 0.85rem;
                    margin-bottom: 20px;
                }

                /* AVATAR UPLOAD */
                .avatar-upload-area {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 25px;
                }
                .avatar-upload-circle {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    overflow: hidden;
                    cursor: pointer;
                    position: relative;
                    border: 3px solid rgba(168,85,247,0.3);
                    transition: all 0.3s;
                }
                .avatar-upload-circle:hover {
                    border-color: var(--primary);
                    transform: scale(1.05);
                }
                .avatar-upload-circle img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(168,85,247,0.1);
                    color: var(--primary);
                }
                .avatar-edit-badge {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    background: var(--primary);
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    border: 2px solid var(--bg-dark);
                }
                .avatar-hint {
                    font-size: 0.75rem;
                    color: var(--text-dim);
                    margin-top: 10px;
                }

                /* FORM FIELDS */
                .form-fields {
                    display: flex;
                    flex-direction: column;
                    gap: 18px;
                    margin-bottom: 25px;
                }
                .field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    position: relative;
                }
                .field-group label {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .field-group input,
                .field-group textarea,
                .field-group select {
                    width: 100%;
                    padding: 12px 16px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    border-radius: 14px;
                    color: var(--text-main);
                    outline: none;
                    transition: all 0.2s;
                }
                .field-group select option {
                    background: var(--bg-light);
                    color: var(--text-main);
                }
                .field-group input:focus,
                .field-group textarea:focus,
                .field-group select:focus {
                    border-color: var(--primary);
                    background: rgba(168,85,247,0.05);
                }
                .field-row {
                    display: flex;
                    gap: 14px;
                }
                .field-group.half { flex: 1; }

                .char-count {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    text-align: right;
                }

                .gender-selector {
                    display: flex;
                    gap: 8px;
                }
                .gender-btn {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 8px;
                    border-radius: 12px;
                    border: 1px solid var(--glass-border);
                    background: var(--glass);
                    color: var(--text-dim);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .gender-btn.active {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: #fff;
                }

                /* INTEREST GRID */
                .interest-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-bottom: 25px;
                }
                .interest-chip {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    border-radius: 14px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-dim);
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                .interest-chip.selected {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: #fff;
                }
                .chip-check { color: var(--primary); margin-left: auto; }

                /* LOOKING LIST */
                .looking-for-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 25px;
                }
                .looking-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 16px;
                    border-radius: 18px;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-main);
                    cursor: pointer;
                    text-align: left;
                }
                .looking-card.selected {
                    background: rgba(168,85,247,0.1);
                    border-color: var(--primary);
                }
                .looking-check {
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid var(--glass-border);
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .looking-check.checked {
                    background: var(--primary);
                    border-color: var(--primary);
                }

                /* PREVIEW */
                .preview-card {
                    margin-bottom: 30px;
                    border-radius: 30px;
                    overflow: hidden;
                    border: 1px solid var(--glass-border);
                    position: relative;
                }
                .preview-cover {
                    height: 120px;
                    background: linear-gradient(135deg, var(--primary), #ec4899);
                }
                .preview-avatar-area {
                    margin-top: -60px;
                    display: flex;
                    justify-content: center;
                }
                .preview-avatar {
                    width: 120px;
                    height: 120px;
                    border-radius: 40px;
                    border: 4px solid var(--bg-dark);
                    overflow: hidden;
                    position: relative;
                }
                .preview-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .preview-online-dot {
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    width: 14px;
                    height: 14px;
                    background: #10b981;
                    border: 2px solid var(--bg-dark);
                    border-radius: 50%;
                }
                .preview-info {
                    padding: 20px;
                    text-align: center;
                }
                .preview-info h3 { font-size: 1.5rem; margin-bottom: 8px; }
                .preview-meta { display: flex; justify-content: center; gap: 12px; margin-bottom: 15px; }
                .preview-gender { font-size: 0.8rem; padding: 4px 12px; border-radius: 20px; font-weight: 700; color: white; }
                .preview-gender.male { background: #3b82f6; }
                .preview-gender.female { background: #ec4899; }
                .preview-gender.other { background: var(--primary); }
                .preview-location { font-size: 0.8rem; color: var(--text-dim); display: flex; align-items: center; gap: 4px; }
                .preview-bio { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 20px; line-height: 1.5; }
                .preview-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 20px; }
                .preview-tag { font-size: 0.75rem; padding: 6px 12px; background: var(--glass); border-radius: 100px; color: var(--text-dim); }
                .preview-looking { border-top: 1px solid var(--glass-border); padding-top: 15px; }
                .looking-title { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 10px; }
                .looking-badge { font-size: 0.75rem; padding: 6px 12px; background: rgba(168,85,247,0.1); color: var(--primary); border-radius: 100px; margin: 0 4px; }

                /* BUTTONS */
                .step-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: auto;
                }
                .next-btn {
                    flex: 2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 16px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 1rem;
                }
                .prev-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    padding: 16px;
                    border-radius: 16px;
                    font-weight: 800;
                    font-size: 1rem;
                    background: var(--glass);
                    border: 1px solid var(--glass-border);
                    color: var(--text-main);
                }
                .next-btn.disabled { opacity: 0.5; pointer-events: none; }
                .save-btn { background: linear-gradient(135deg, var(--primary), #ec4899); border: none; box-shadow: 0 10px 20px rgba(168,85,247,0.3); }
            `}</style>
        </div>
    );
};

export default SoulProfileSetup;
