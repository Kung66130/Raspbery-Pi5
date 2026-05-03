console.log('--- BACKEND STARTING ---');
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
    console.error('❌ CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment variables!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

console.log('✓ Supabase client initialized');



const app = express();
const PORT = process.env.PORT || 3004;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
    console.error('❌ CRITICAL ERROR: SECRET_KEY not found in environment variables!');
    process.exit(1);
}
console.log('✓ SECRET_KEY loaded successfully');

// Base Security Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false, // Useful if we serve some images locally
}));

// CORS
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'] : '*';
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());

// Global Rate Limiter to prevent DoS (1,000 requests per 15 minutes)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', globalLimiter);

// Specific Auth/OTP Limiter to stop brute force & spam
const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 20, // 20 attempts per 10 min
    message: { error: 'Too many authentication attempts, please wait 10 minutes.' }
});
app.use('/api/auth', authLimiter);

app.get('/api', (req, res) => {
    res.json({ status: 'Flare API with Supabase is running', version: '2.1.0 (Secured)' });
});

// Request logger to help debug
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Use memory storage for Render deployment compatibility (100% Supabase Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB safety limit
    fileFilter: (req, file, cb) => {
        // Strict Mimetype filter to prevent malicious file uploads like .html or .php
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type! Only images, audio, and video are allowed.'), false);
        }
    }
});

// Memory store for OTPs (In production, use Redis or DB)
const otpStore = new Map();

// Mail Transporter (Mock for now, can be configured with Gmail/Resend/Postmark)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER || 'mock_user',
        pass: process.env.SMTP_PASS || 'mock_pass'
    }
});

// --- Auth Routes ---
app.post('/api/auth/otp/send', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email/Phone is required' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { code, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins

    const isPhone = /^[0-9]+$/.test(email.replace(/[\s-+]/g, ''));

    if (isPhone) {
        console.log(`[OTP-SMS] 📱 Sending Code to ${email}: ${code}`);
    } else {
        console.log(`[OTP-EMAIL] 📧 Sending Code to ${email}: ${code}`);
        // Send email only if it's meant to be an email
        if (process.env.SMTP_USER) {
            try {
                await transporter.sendMail({
                    from: '"Flare Social" <no-reply@flare.app>',
                    to: email,
                    subject: "Flare Verification Code",
                    text: `Your verification code is: ${code}`,
                    html: `<b>Your verification code is: ${code}</b>`
                });
            } catch (err) {
                console.error('Email send failed:', err);
            }
        }
    }

    res.json({ message: 'OTP sent successfully (check console)' });
});

app.post('/api/auth/otp/verify', async (req, res) => {
    const { email, code, name } = req.body; // email variable holds the input identifier (email or phone)
    const stored = otpStore.get(email);

    if (!stored || stored.code !== code || Date.now() > stored.expires) {
        return res.status(400).json({ error: 'Invalid or expired code' });
    }

    otpStore.delete(email);

    try {
        const isPhone = /^[0-9]+$/.test(email.replace(/[\s-+]/g, ''));
        let user;

        // Try to find existing user
        if (isPhone) {
            const { data: phoneUser } = await supabase.from('users').select('*').eq('phone', email).maybeSingle();
            user = phoneUser;
        } else {
            const { data: emailUser } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
            user = emailUser;
        }

        // Create new user if not exists
        if (!user) {
            const id = 'user_' + Date.now();
            // Generate a safe username
            const baseName = name || email.split('@')[0];
            const username = baseName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '_' + Math.floor(Math.random() * 1000);

            const userData = {
                id,
                name: baseName,
                username,
                profileComplete: 0
            };

            if (isPhone) {
                userData.phone = email;
                userData.email = `phone_${email}@flare.com`; // Placeholder email for DB constraints
            } else {
                userData.email = email;
            }

            const { data: newUser, error } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (error) {
                if (error.message.includes('column "phone" does not exist')) {
                    throw new Error('Database Missing Column: phone (Please notify admin)');
                }
                throw error;
            }
            user = newUser;
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '30d' });
        const pc = user.profile_complete === 1 || user.profile_complete === true ? 1 : 0;
        res.json({ token, user: { ...user, profileComplete: pc, profile_complete: pc, soulProfile: user.soul_profile || null } });
    } catch (err) {
        console.error("OTP Verify Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/google-sync', async (req, res) => {
    const { email, name, image, id: googleId } = req.body;
    try {
        let { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();

        if (!user) {
            const id = 'user_' + Date.now();
            const username = (name || email.split('@')[0]).toLowerCase().replace(/\s/g, '_') + '_' + Math.floor(Math.random() * 1000);

            // Try with profile_complete (snake_case) first, fallback to minimal if column doesn't exist
            const userData = { id, email, name, image, username };

            const { data: newUser, error } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (error) throw error;
            user = newUser;
        }

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '30d' });
        res.json({ token, user: { ...user, profileComplete: user.profile_complete || user.profileComplete || 0 } });
    } catch (err) {
        console.error('Google sync error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, username, referralCode } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = 'user_' + Date.now();
        const isPhone = /^[0-9]+$/.test(email.replace(/[\s-+]/g, ''));
        const userData = { id, password: hashedPassword, name, username: username || (name ? name.toLowerCase().replace(/\s/g, '_') : 'user_' + Date.now()) };

        if (isPhone) {
            userData.phone = email;
            userData.email = `phone_${email}@flare.com`;
        } else {
            userData.email = email;
        }

        const { data, error } = await supabase.from('users').insert([userData]).select().single();
        if (error) throw error;

        // Apply referral or Promo Code if provided
        if (referralCode && referralCode.trim()) {
            const code = referralCode.trim().toUpperCase();
            try {
                // Check if it's the GLOBAL PROMO CODE
                if (code === 'FLAREVIP') {
                    const vipUntil = new Date();
                    vipUntil.setMonth(vipUntil.getMonth() + 3);

                    await supabase
                        .from('users')
                        .update({ 
                            is_vip: true, 
                            vip_until: vipUntil.toISOString(),
                            referred_by: 'PROMO_FLARE_GLOBAL'
                        })
                        .eq('id', id);
                    console.log(`[PROMO] Applied FLAREVIP to new user ${id}`);
                } else {
                    // Standard Referral Logic
                    const { data: referrer } = await supabase
                        .from('users')
                        .select('id, vip_until')
                        .eq('referral_code', code)
                        .single();

                    if (referrer) {
                        // --- 1. Give 3 months VIP to the NEW USER (Referee) ---
                        const refereeVipUntil = new Date();
                        refereeVipUntil.setMonth(refereeVipUntil.getMonth() + 3);

                        // Update current user (referee)
                        await supabase
                            .from('users')
                            .update({ 
                                referred_by: referrer.id,
                                is_vip: true,
                                vip_until: refereeVipUntil.toISOString()
                            })
                            .eq('id', id);

                        // --- 2. Add 3 months VIP to REFERRER (Owner of the code) ---
                        let newVipUntil;
                        const currentVipUntil = referrer.vip_until ? new Date(referrer.vip_until) : new Date();
                        const baseDate = currentVipUntil > new Date() ? currentVipUntil : new Date();
                        newVipUntil = new Date(baseDate.setMonth(baseDate.getMonth() + 3)).toISOString();

                        await supabase
                            .from('users')
                            .update({ is_vip: true, vip_until: newVipUntil })
                            .eq('id', referrer.id);
                    }
                }
            } catch (refErr) {
                console.warn('Referral/Promo apply failed at signup:', refErr.message);
            }
        }


        const token = jwt.sign({ id, email: data.email || email }, SECRET_KEY, { expiresIn: '30d' });
        res.json({ token, user: { ...data, profileComplete: 0 } });
    } catch (err) {
        console.error('Registration Error:', err);
        if (err.message.includes('unique') || err.code === '23505') {
            const field = err.message.includes('username') ? 'Username' : 'Email/Phone';
            return res.status(400).json({ error: `${field} already exists` });
        }
        if (err.message.includes('column "username" does not exist')) {
            return res.status(500).json({
                error: 'Database Missing Column',
                message: 'กรุณาเพิ่มคอลัมน์ username ในตาราง users (ALTER TABLE users ADD COLUMN username TEXT UNIQUE;)'
            });
        }
        if (err.message.includes('column "phone" does not exist')) {
            return res.status(500).json({
                error: 'Database Missing Column',
                message: 'กรุณาเพิ่มคอลัมน์ phone ในตาราง users (ALTER TABLE users ADD COLUMN phone TEXT;)'
            });
        }
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body; // email field used as generic identifier
    try {
        // Try to find by email
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

        // If not found, try to find by phone if the table has it
        if (!user && !error) {
            const { data: phoneUser } = await supabase
                .from('users')
                .select('*')
                .eq('phone', email)
                .maybeSingle();
            user = phoneUser;
        }

        if (!user) return res.status(400).json({ error: 'User not found' });

        if (!user.password) {
            return res.status(400).json({ error: 'Please use OTP or Google Login for this account' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '30d' });
        const { password: _, ...userWithoutPassword } = user;
        const pc = userWithoutPassword.profile_complete === 1 || userWithoutPassword.profile_complete === true ? 1 : 0;
        res.json({ token, user: { ...userWithoutPassword, profileComplete: pc, profile_complete: pc, soulProfile: userWithoutPassword.soul_profile || null } });
    } catch (err) {
        console.error('Login Error:', err);
        if (err.message?.includes('column "phone" does not exist')) {
            return res.status(500).json({
                error: 'Database Missing Column',
                message: 'กรุณาเพิ่มคอลัมน์ phone ในตาราง users (ALTER TABLE users ADD COLUMN phone TEXT;)'
            });
        }
        res.status(500).json({ error: err.message });
    }
});

// --- Search Users ---
app.get('/api/users/search', async (req, res) => {
    let { q } = req.query;

    // Optional: Get current user ID if token is provided to exclude them from results
    let currentUserId = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, SECRET_KEY);
            currentUserId = decoded.id;
        } catch (e) { /* ignore auth errors for search */ }
    }

    // If no query, return users as suggestions
    if (!q || q.trim().length < 1) {
        try {
            let query = supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (currentUserId) {
                query = query.neq('id', currentUserId);
            }

            const { data: users, error } = await query;

            if (error) throw error;

            // Map to safe public format
            const results = (users || []).map(u => {
                const isOnline = u.last_seen ? (new Date() - new Date(u.last_seen)) < 5 * 60 * 1000 : false;
                return {
                    id: u.id,
                    name: u.name,
                    username: u.username,
                    image: u.image,
                    bio: u.bio,
                    isOnline
                };
            });

            return res.json(results);
        } catch (err) {
            console.error('Initial suggestions error:', err);
            return res.status(500).json({ error: err.message });
        }
    }

    try {
        // Strip '@' if user typed it at the beginning
        let query = q.trim();
        if (query.startsWith('@')) {
            query = query.substring(1);
        }

        // Split query into individual words to allow matching any part across fields
        const terms = query.split(/\s+/).filter(Boolean);
        let allOrs = [];
        terms.forEach(t => {
            const term = `%${t.toLowerCase()}%`;
            allOrs.push(`name.ilike.${term},username.ilike.${term},id.ilike.${term}`);
        });

        const finalOr = allOrs.join(',');

        // Search by name, username, or id
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .or(`name.ilike.%${query}%,username.ilike.%${query}%,id.ilike.%${query}%`)
            .neq('id', 'npc_flare_official') // Exclude official account
            .limit(20);

        if (error) {
            console.error('[Search] Error:', error);
            throw error;
        }

        // Map to safe public format
            const results = (users || []).map(u => {
                // Consider online if last_seen was within the last 5 minutes
                const isOnline = u.last_seen ? (new Date() - new Date(u.last_seen)) < 5 * 60 * 1000 : false;
                return {
                    id: u.id,
                    name: u.name,
                    username: u.username,
                    image: u.image,
                    bio: u.bio,
                    email: u.email,
                    isOnline
                };
            });

        res.json(results);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Middleware to verify JWT
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ error: 'Invalid token format', message: 'Token is missing or null' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;

        // Proactive: Update last_seen for online status tracking
        // We do this asynchronously to not block the request
        supabase.from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', decoded.id)
            .then(({ error }) => {
                if (error && error.message.includes('column "last_seen" does not exist')) {
                    console.warn('[Status] Missing column "last_seen" in users table');
                }
            });

        next();
    } catch (err) {
        console.error('[Auth] JWT Verification Failed:', err.message);
        res.status(401).json({
            error: 'Invalid token',
            message: err.message,
            reason: err.name // e.g. TokenExpiredError, JsonWebTokenError
        });
    }
};

// --- Soul Profile Routes ---
app.post('/api/soul/profile', authenticate, async (req, res) => {
    try {
        const profileData = req.body;

        // Use an upsert into soul_profiles table or just save to users table.
        // We'll save it as a JSONB column `soul_profile` in `users` table for simplicity.
        const updates = { 
            soul_profile: profileData, 
            profile_complete: 1,
            name: profileData.displayName || profileData.name,
            bio: profileData.bio
        };
        if (profileData.imagePreview) updates.image = profileData.imagePreview;

        let { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.user.id)
            .select('*')
            .single();

        if (error) {
            if (error.message.includes('column "soul_profile"')) {
                return res.status(500).json({
                    error: 'Database Missing Column',
                    message: 'กรุณาเพิ่มคอลัมน์ soul_profile (ชนิด JSONB) ในตาราง users'
                });
            }
            throw error;
        }

        // Try to update age and gender separately so it won't crash if columns are missing
        if (profileData.age !== undefined || profileData.gender) {
             const extraUpdates = {};
             if (profileData.age !== undefined) extraUpdates.age = parseInt(profileData.age, 10) || null;
             if (profileData.gender) extraUpdates.gender = profileData.gender;
             
             try {
                 await supabase.from('users').update(extraUpdates).eq('id', req.user.id);
             } catch (extraErr) {
                 console.log("Age/Gender column missing, skipping...");
             }
        }

        res.json(data.soul_profile);
    } catch (err) {
        console.error('Save soul profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/soul/profile', authenticate, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('soul_profile')
            .eq('id', req.user.id)
            .single();

        if (error) {
            if (error.message.includes('column "soul_profile" does not exist')) {
                return res.json(null); // Return null gracefully
            }
            throw error;
        }
        res.json(data ? data.soul_profile : null);
    } catch (err) {
        console.error('Get soul profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- User & Safety Routes ---
app.post('/api/reports', authenticate, async (req, res) => {
    try {
        const { targetId, targetType, reason, details } = req.body;

        const { error } = await supabase
            .from('reports')
            .insert([{
                reporter_id: req.user.id,
                target_id: targetId,
                target_type: targetType || 'user',
                reason: reason || 'Inappropriate content',
                details: details || '',
            }]);

        if (error) {
            if (error.code === '42P01') { // relation does not exist
                return res.status(500).json({
                    error: 'Database Missing Table',
                    message: 'กรุณาสร้างตาราง reports (CREATE TABLE reports (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), reporter_id TEXT, target_id TEXT, target_type TEXT, reason TEXT, details TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(\'utc\'::text, now())));'
                });
            }
            throw error;
        }

        res.json({ success: true, message: 'Report submitted successfully' });
    } catch (err) {
        console.error('Report error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/block', authenticate, async (req, res) => {
    try {
        const { blockedId } = req.body;

        const { error } = await supabase
            .from('blocks')
            .insert([{
                blocker_id: req.user.id,
                blocked_id: blockedId
            }]);

        if (error) {
            if (error.code === '42P01') { // relation does not exist
                return res.status(500).json({
                    error: 'Database Missing Table',
                    message: 'กรุณาสร้างตาราง blocks (CREATE TABLE blocks (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), blocker_id TEXT, blocked_id TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone(\'utc\'::text, now()), UNIQUE(blocker_id, blocked_id)));'
                });
            }
            // Ignore unique constraint error if they block again
            if (error.code !== '23505') {
                throw error;
            }
        }

        res.json({ success: true, message: 'User blocked successfully' });
    } catch (err) {
        console.error('Block error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update current user location
app.post('/api/users/location', authenticate, async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        console.log(`[Location] User ${req.user.id} update: ${latitude}, ${longitude}`);

        const { error } = await supabase
            .from('users')
            .update({ 
                latitude: parseFloat(latitude), 
                longitude: parseFloat(longitude),
                last_seen: new Date().toISOString()
            })
            .eq('id', req.user.id);

        if (error) {
            console.error('[Location] Update Error:', error);
            if (error.code === '42703') { // undefined_column
                return res.status(500).json({
                    error: 'Database Missing Columns',
                    message: 'กรุณาเพิ่มคอลัมน์ latitude และ longitude ในตาราง users (ALTER TABLE users ADD COLUMN latitude FLOAT, ADD COLUMN longitude FLOAT;)'
                });
            }
            throw error;
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Location Update error:', err);
        res.status(500).json({ error: err.message });
    }
});


// --- User Profile Routes ---
app.delete('/api/users/profile', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
        console.log(`[Delete Account] Starting for user: ${userId}`);

        // All tables now have ON DELETE CASCADE, but we still clean up explicitly for safety

        // 1. Delete Messages
        await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        
        // 2. Delete Reveal Requests
        await supabase.from('reveal_requests').delete().or(`user_id.eq.${userId},partner_id.eq.${userId}`);

        // 3. Delete Swipes
        await supabase.from('swipes').delete().or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

        // 4. Delete Post Interactions (cascade handles most, but being safe)
        await supabase.from('post_likes').delete().eq('user_id', userId);
        await supabase.from('post_bookmarks').delete().eq('user_id', userId);
        await supabase.from('comments').delete().eq('user_id', userId);

        // 5. Delete Posts (cascade will also remove likes/comments/bookmarks)
        await supabase.from('posts').delete().eq('user_id', userId);

        // 6. Delete User record
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        console.log(`[Delete Account] Successfully deleted user: ${userId}`);
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id', authenticate, async (req, res, next) => {
    // We must intercept 'profile', 'search', and 'referral' before they match ':id'
    if (req.params.id === 'profile' || req.params.id === 'search' || req.params.id === 'referral') return next();

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, name, username, bio, image, cover_image')
            .eq('id', req.params.id)
            .single();

        if (userError || !user) return res.status(404).json({ error: 'User not found' });

        // Build safe user profile
        const safeUser = {
            id: user.id,
            name: user.name,
            username: user.username,
            bio: user.bio,
            image: user.image,
            coverImage: user.cover_image,
            followersCount: 0,
            followingCount: 0
        };

        const { count: followersCount } = await supabase
            .from('swipes')
            .select('*', { count: 'exact', head: true })
            .eq('to_user_id', req.params.id)
            .eq('direction', 'right');

        if (followersCount) safeUser.followersCount = followersCount;

        const { count: followingCount } = await supabase
            .from('swipes')
            .select('*', { count: 'exact', head: true })
            .eq('from_user_id', req.params.id)
            .eq('direction', 'right');

        if (followingCount) safeUser.followingCount = followingCount;

        // Check if current user is following this profile
        const { data: followData } = await supabase
            .from('swipes')
            .select('id')
            .eq('from_user_id', req.user.id)
            .eq('to_user_id', req.params.id)
            .eq('direction', 'right')
            .single();

        safeUser.isFollowing = !!followData;

        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', req.params.id)
            .order('timestamp', { ascending: false });

        const mappedPosts = (posts || []).map(p => ({
            ...p,
            userId: p.user_id,
            userImage: p.user_image,
            commentCount: p.comment_count || 0
        }));

        res.json({ user: safeUser, posts: mappedPosts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/follow', authenticate, async (req, res) => {
    try {
        const targetId = req.params.id;
        if (targetId === req.user.id) return res.status(400).json({ error: "Cannot follow yourself" });

        const { data: existing } = await supabase
            .from('swipes')
            .select('*')
            .eq('from_user_id', req.user.id)
            .eq('to_user_id', targetId)
            .eq('direction', 'right')
            .single();

        if (existing) {
            await supabase.from('swipes').delete()
                .eq('from_user_id', req.user.id)
                .eq('to_user_id', targetId)
                .eq('direction', 'right');
            res.json({ isFollowing: false });
        } else {
            await supabase.from('swipes').insert([{
                from_user_id: req.user.id,
                to_user_id: targetId,
                direction: 'right'
            }]);
            res.json({ isFollowing: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id/followers', authenticate, async (req, res) => {
    try {
        const { data: swipes, error } = await supabase
            .from('swipes')
            .select('from_user_id')
            .eq('to_user_id', req.params.id)
            .eq('direction', 'right');

        if (error) throw error;
        if (!swipes || swipes.length === 0) return res.json([]);

        const ids = swipes.map(s => s.from_user_id);
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, name, username, image, bio')
            .in('id', ids);

        if (userError) throw userError;
        res.json(users || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id/following', authenticate, async (req, res) => {
    try {
        const { data: swipes, error } = await supabase
            .from('swipes')
            .select('to_user_id')
            .eq('from_user_id', req.params.id)
            .eq('direction', 'right');

        if (error) throw error;
        if (!swipes || swipes.length === 0) return res.json([]);

        const ids = swipes.map(s => s.to_user_id);
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, name, username, image, bio')
            .in('id', ids);

        if (userError) throw userError;
        res.json(users || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/profile', authenticate, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error || !user) return res.status(404).json({ error: 'User not found' });

        // Get counts
        const { count: followersCount } = await supabase
            .from('swipes')
            .select('*', { count: 'exact', head: true })
            .eq('to_user_id', req.user.id)
            .eq('direction', 'right');

        const { count: followingCount } = await supabase
            .from('swipes')
            .select('*', { count: 'exact', head: true })
            .eq('from_user_id', req.user.id)
            .eq('direction', 'right');

        // Convert DB snake_case to Frontend camelCase
        // Force profileComplete to be exactly 1 or 0 for reliable frontend comparison
        const rawProfileComplete = user.profile_complete !== undefined ? user.profile_complete : user.profileComplete;
        const userProfile = {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            image: user.image,
            coverImage: user.cover_image,
            bio: user.bio,
            phone: user.phone,
            profileComplete: rawProfileComplete === 1 || rawProfileComplete === true ? 1 : 0,
            profile_complete: rawProfileComplete === 1 || rawProfileComplete === true ? 1 : 0,
            soulProfile: user.soul_profile || null,
            followersCount: followersCount || 0,
            followingCount: followingCount || 0,
        };

        res.json(userProfile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/profile', authenticate, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), async (req, res) => {
    const { name, bio, profileComplete, username, email, age, gender } = req.body;
    const updates = {};

    if (age !== undefined) updates.age = parseInt(age, 10) || null;
    if (gender !== undefined) updates.gender = gender;

    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (profileComplete !== undefined) updates.profile_complete = (profileComplete === 'true' || profileComplete === true ? 1 : 0);

    // Helper function to upload to Supabase Storage
    const uploadToSupabase = async (file, folder = 'profiles') => {
        const fileExt = file.originalname.split('.').pop() || 'png';
        const fileName = `${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error } = await supabase.storage
            .from('user_photos')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype || 'image/png',
                upsert: true
            });

        if (error) throw error;

        const { data } = supabase.storage.from('user_photos').getPublicUrl(filePath);
        return data.publicUrl;
    };

    if (req.files) {
        try {
            if (req.files['image']) {
                updates.image = await uploadToSupabase(req.files['image'][0], 'profiles');
            }
            if (req.files['coverImage']) {
                updates.cover_image = await uploadToSupabase(req.files['coverImage'][0], 'covers');
            }
        } catch (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload image to storage' });
        }
    }

    // Mirror updates to soul_profile JSON if it exists
    try {
        const { data: currentUser } = await supabase.from('users').select('soul_profile').eq('id', req.user.id).single();
        if (currentUser && currentUser.soul_profile) {
            const sp = currentUser.soul_profile;
            if (updates.name) sp.displayName = updates.name;
            if (updates.bio !== undefined) sp.bio = updates.bio;
            if (updates.age !== undefined) sp.age = updates.age;
            if (updates.gender) sp.gender = updates.gender;
            if (updates.image) sp.imagePreview = updates.image;
            updates.soul_profile = sp;
        }
    } catch (e) { console.warn('Mirroring to soul_profile failed:', e.message); }

    try {
        const { data: updatedUser, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        const rawPC = updatedUser.profile_complete !== undefined ? updatedUser.profile_complete : updatedUser.profileComplete;
        const userProfile = {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            username: updatedUser.username,
            image: updatedUser.image,
            coverImage: updatedUser.cover_image,
            bio: updatedUser.bio,
            phone: updatedUser.phone,
            profileComplete: rawPC === 1 || rawPC === true ? 1 : 0,
            profile_complete: rawPC === 1 || rawPC === true ? 1 : 0,
            soulProfile: updatedUser.soul_profile || null,
            age: updatedUser.age,
            gender: updatedUser.gender
        };

        res.json(userProfile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Change Password ---
app.put('/api/users/password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const { data: user, error } = await supabase.from('users').select('password').eq('id', req.user.id).single();
        if (error || !user) return res.status(404).json({ error: 'User not found' });
        if (!user.password) return res.status(400).json({ error: 'Account uses OTP/Google login, no password set' });

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(400).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await supabase.from('users').update({ password: hashed }).eq('id', req.user.id);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Password Change Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Post Routes ---
app.get('/api/posts', authenticate, async (req, res) => {
    try {
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        let likedPosts = [];
        try {
            const { data } = await supabase.from('post_likes').select('*').eq('user_id', req.user.id);
            likedPosts = data || [];
        } catch (e) {
            console.error('Liked posts fetch error:', e.message);
        }

        let savedPosts = [];
        try {
            const { data } = await supabase.from('post_bookmarks').select('*').eq('user_id', req.user.id);
            savedPosts = data || [];
        } catch (e) {
            console.error('Saved posts fetch error:', e.message);
        }

        const likedSet = new Set(likedPosts.map(lp => String(lp.post_id || '')));
        const savedSet = new Set(savedPosts.map(sp => String(sp.post_id || '')));

        const postsWithLikeStatus = posts.map(post => {
            const pId = String(post.id);
            return {
                ...post,
                userId: post.user_id,
                userImage: post.user_image,
                commentCount: post.comment_count || 0,
                hasLiked: likedSet.has(pId),
                hasSaved: savedSet.has(pId)
            };
        });

        res.json(postsWithLikeStatus);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts', authenticate, upload.single('image'), async (req, res) => {
    const { text, username, userImage } = req.body;
    const id = 'post_' + Date.now();
    let imageUrl = null;
    if (req.file) {
        try {
            const fileExt = req.file.originalname.split('.').pop() || 'png';
            const fileName = `posts/${req.user.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('user_photos')
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype || 'image/png',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('user_photos').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        } catch (err) {
            console.error('Post Image Upload Error:', err);
            return res.status(500).json({ error: 'Image upload failed' });
        }
    }

    try {
        const insertData = {
            id: id,
            user_id: req.user.id,
            username: username || 'User',
            user_image: userImage,
            text: text,
            image: imageUrl,
            timestamp: new Date().toISOString()
        };

        const { data: newPost, error } = await supabase
            .from('posts')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Insert Error:', error.message);
            throw error;
        }

        res.json({
            ...newPost,
            userId: newPost.user_id,
            userImage: newPost.user_image,
            commentCount: newPost.comment_count || 0,
            hasLiked: false,
            hasSaved: false
        });
    } catch (err) {
        console.error('Global Create Post Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/posts/:id', authenticate, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        const { data: post } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (post.user_id !== userId) {
            return res.status(403).json({ error: 'You can only delete your own posts' });
        }

        await supabase.from('post_likes').delete().eq('post_id', postId);
        await supabase.from('comments').delete().eq('post_id', postId);
        const { error } = await supabase.from('posts').delete().eq('id', postId);

        if (error) throw error;
        res.json({ success: true, message: 'Post deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/:id/like', authenticate, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    try {
        const { data: existing } = await supabase
            .from('post_likes')
            .select('*')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle();

        if (existing) {
            await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId);
            const { data: p } = await supabase.from('posts').select('likes').eq('id', postId).single();
            await supabase.from('posts').update({ likes: Math.max(0, (p?.likes || 0) - 1) }).eq('id', postId);
        } else {
            await supabase.from('post_likes').insert([{ user_id: userId, post_id: postId }]);
            const { data: p } = await supabase.from('posts').select('likes').eq('id', postId).single();
            await supabase.from('posts').update({ likes: (p?.likes || 0) + 1 }).eq('id', postId);
        }

        const { data: updatedPost } = await supabase.from('posts').select('likes').eq('id', postId).single();
        res.json({ likes: updatedPost.likes, hasLiked: !existing });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/:id/save', authenticate, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    try {
        const { data: existing, error: selectError } = await supabase
            .from('post_bookmarks')
            .select('*')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            await supabase.from('post_bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
            res.json({ hasSaved: false });
        } else {
            await supabase.from('post_bookmarks').insert([{ user_id: userId, post_id: postId }]);
            res.json({ hasSaved: true });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Comment Routes ---
app.get('/api/posts/:id/comments', authenticate, async (req, res) => {
    const postId = req.params.id;
    try {
        const { data: comments, error } = await supabase
            .from('comments')
            .select(`
                *,
                users:user_id (name, image)
            `)
            .eq('post_id', postId)
            .order('timestamp', { ascending: true });

        if (error) {
            // Fallback: try without join if relation is broken
            const { data: simpleComments, error: simpleError } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', postId);

            if (simpleError) throw simpleError;
            return res.json(simpleComments);
        }

        const formatted = comments.map(c => ({
            ...c,
            username: c.users?.name || 'Anonymous',
            userImage: c.users?.image
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts/:id/comments', authenticate, async (req, res) => {
    const postId = req.params.id;
    const { text } = req.body;
    try {
        // Simple insert first
        const { data: comment, error: insertError } = await supabase
            .from('comments')
            .insert([{
                id: 'comment_' + Date.now(),
                post_id: postId,
                user_id: req.user.id,
                text,
                timestamp: new Date()
            }])
            .select()
            .single();

        if (insertError) {
            console.error('Supabase Insert Error:', insertError);
            throw insertError;
        }

        // Fetch user info separately if join is unstable
        const { data: user } = await supabase
            .from('users')
            .select('name, image')
            .eq('id', req.user.id)
            .single();

        // Increment comment count - wrapped in try/catch to not block the comment itself
        try {
            const { data: postData, error: fetchErr } = await supabase.from('posts').select('comment_count').eq('id', postId).maybeSingle();  
            if (!fetchErr && postData) {
                await supabase.from('posts').update({
                    comment_count: (postData.comment_count || 0) + 1
                }).eq('id', postId);
            }
        } catch (e) {
            console.error('Optional commentCount update failed:', e.message);
        }

        res.json({
            ...comment,
            username: user?.name || 'Anonymous',
            userImage: user?.image
        });
    } catch (err) {
        console.error('Comment error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- Match Routes ---
app.get('/api/matches/potential', authenticate, async (req, res) => {
    try {
        // Get current user's location to calculate distance
        const { data: currentUser } = await supabase
            .from('users')
            .select('latitude, longitude')
            .eq('id', req.user.id)
            .single();

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .neq('id', req.user.id)
            .limit(50);

        if (error) throw error;

        // Haversine formula for distance in kilometers
        const getDistance = (lat1, lon1, lat2, lon2) => {
            if (!lat1 || !lon1 || !lat2 || !lon2) return null;
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * (Math.PI/180);
            const dLon = (lon2 - lon1) * (Math.PI/180);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
                      Math.sin(dLon/2) * Math.sin(dLon/2); 
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            return Math.floor(R * c); // Return km
        };

        const usersWithoutPassword = (users || []).map(u => {
            const { password, ...rest } = u;
            const isOnline = u.last_seen ? (new Date() - new Date(u.last_seen)) < 5 * 60 * 1000 : false;
            
            let realDistance = null;
            if (currentUser && currentUser.latitude && currentUser.longitude && u.latitude && u.longitude) {
                realDistance = getDistance(currentUser.latitude, currentUser.longitude, u.latitude, u.longitude);
            }

            return { ...rest, isOnline, realDistance };
        });
        res.json(usersWithoutPassword);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/location', authenticate, async (req, res) => {
    const { latitude, longitude } = req.body;
    try {
        const { error } = await supabase
            .from('users')
            .update({ latitude, longitude })
            .eq('id', req.user.id);
            
        if (error) {
            if (error.message.includes('column "latitude" of relation "users" does not exist')) {
                return res.status(500).json({ error: 'Database Missing Column', message: 'กรุณาเพิ่มคอลัมน์ latitude (FLOAT8) และ longitude (FLOAT8) ในตาราง users (ALTER TABLE users ADD COLUMN latitude DOUBLE PRECISION, ADD COLUMN longitude DOUBLE PRECISION;)' });
            }
            throw error;
        }
        res.json({ success: true, message: 'Location updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/swipes', authenticate, async (req, res) => {
    const { toUserId, direction } = req.body;
    try {
        // Insert the swipe (ignore duplicate error gracefully)
        const { error } = await supabase
            .from('swipes')
            .insert([{ from_user_id: req.user.id, to_user_id: toUserId, direction }]);

        if (error && error.code !== '23505') throw error; // 23505 = unique violation, ignore

        // If it's a right swipe, check for mutual match
        if (direction === 'right') {
            const { data: theirSwipe } = await supabase
                .from('swipes')
                .select('id')
                .eq('from_user_id', toUserId)
                .eq('to_user_id', req.user.id)
                .eq('direction', 'right')
                .maybeSingle();

            if (theirSwipe) {
                // 🎉 It's a match! Fetch partner info to return
                const { data: partner } = await supabase
                    .from('users')
                    .select('id, name, image, bio, username')
                    .eq('id', toUserId)
                    .single();

                return res.json({ success: true, isMatch: true, partner });
            }
        }

        res.json({ success: true, isMatch: false });
    } catch (err) {
        console.error('[Swipe] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/swipes/following_ids', authenticate, async (req, res) => {
    try {
        const { data: swipes, error } = await supabase
            .from('swipes')
            .select('to_user_id')
            .eq('from_user_id', req.user.id)
            .eq('direction', 'right');

        if (error) throw error;
        res.json((swipes || []).map(s => s.to_user_id));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/swipes/liked', authenticate, async (req, res) => {
    try {
        const { data: swipes, error } = await supabase
            .from('swipes')
            .select('to_user_id')
            .eq('from_user_id', req.user.id)
            .eq('direction', 'right');

        if (error) throw error;
        if (!swipes || swipes.length === 0) return res.json([]);

        const likedUserIds = swipes.map(s => s.to_user_id);
        const { data: likedUsers, error: userError } = await supabase
            .from('users')
            .select('id, name, image, bio, age, gender')
            .in('id', likedUserIds);

        if (userError) throw userError;

        // Image URLs are already fully resolved via Supabase Storage
        const results = likedUsers.map(u => ({ ...u }));

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Chat Routes ---
app.get('/api/chats', authenticate, async (req, res) => {
    try {
        // This query is complex, we'll simplify by getting unique conversational partners
        const { data: sentMessages } = await supabase.from('messages').select('receiver_id').eq('sender_id', req.user.id);
        const { data: receivedMessages } = await supabase.from('messages').select('sender_id').eq('receiver_id', req.user.id);

        const partnerIds = [...new Set([
            ...(sentMessages?.map(m => m.receiver_id) || []),
            ...(receivedMessages?.map(m => m.sender_id) || [])
        ])];

        if (partnerIds.length === 0) return res.json([]);

        const { data: users } = await supabase.from('users').select('id, name, image').in('id', partnerIds);
        if (!users) return res.json([]);

        const chats = await Promise.all(users.map(async (u) => {
            const { data: lastMsgs, error: msgError } = await supabase
                .from('messages')
                .select('text, timestamp')
                .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${u.id}),and(sender_id.eq.${u.id},receiver_id.eq.${req.user.id})`)
                .order('timestamp', { ascending: false })
                .limit(1);

            if (msgError) console.error(`Error lastMsg ${u.id}:`, msgError);
            const lastMsg = lastMsgs && lastMsgs.length > 0 ? lastMsgs[0] : null;

            return {
                id: u.id,
                name: u.name,
                image: u.image,
                lastMessage: lastMsg?.text || '',
                lastTimestamp: lastMsg?.timestamp || '',
                revealStatus: 2 // Always revealed now
            };
        }));

        const sorted = chats.sort((a, b) => {
            const timeA = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
            const timeB = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
            return timeB - timeA;
        });

        res.json(sorted);
    } catch (err) {
        console.error('API CHATS ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/chats/:partnerId', authenticate, async (req, res) => {
    const { partnerId } = req.params;
    try {
        const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${req.user.id})`)
            .order('timestamp', { ascending: true });

        res.json({
            messages: messages || [],
            isRevealed: true
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chats/:partnerId', authenticate, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), async (req, res) => {
    const { partnerId } = req.params;
    const { text } = req.body;
    const chatId = [req.user.id, partnerId].sort().join('_');

    let imageUrl = null;
    let audioUrl = null;

    const file = req.files?.['image']?.[0] || req.files?.['audio']?.[0];
    const isAudioField = req.files?.['audio']?.[0] !== undefined;

    if (file) {
        try {
            const fileName = `chat_${Date.now()}_${file.originalname}`;
            const { error: uploadError } = await supabase.storage
                .from('user_photos')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('user_photos').getPublicUrl(fileName);
            if (isAudioField) {
                audioUrl = data.publicUrl;
            } else {
                imageUrl = data.publicUrl;
            }
        } catch (err) {
            console.error('Chat File Upload Error:', err);
            return res.status(500).json({ error: 'File upload failed' });
        }
    }

    try {
        const insertData = {
            chat_id: chatId,
            sender_id: req.user.id,
            receiver_id: partnerId,
            text: text || '',
        };

        if (imageUrl) {
            insertData.image = imageUrl;
        }
        if (audioUrl) {
            insertData.audio = audioUrl;
        }

        const { data: newMessage, error } = await supabase
            .from('messages')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            if (error.message.includes('column "image" of relation "messages" does not exist')) {
                return res.status(500).json({
                    error: 'Database Missing Column',
                    message: 'กรุณาเพิ่มคอลัมน์ image ในตาราง messages (ALTER TABLE messages ADD COLUMN image TEXT;)'
                });
            }
            if (error.message.includes('column "audio" of relation "messages" does not exist') || error.message.includes('Could not find the \'audio\' column')) {
                return res.status(500).json({
                    error: 'Database Missing Column',
                    message: 'กรุณาเพิ่มคอลัมน์ audio ในตาราง messages\nไปที่ Supabase SQL Editor แล้วรัน:\nALTER TABLE messages ADD COLUMN audio TEXT;'
                });
            }
            throw error;
        }
        res.json(newMessage);
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chats/:partnerId/reveal', authenticate, async (req, res) => {
    const { partnerId } = req.params;
    const chatId = [req.user.id, partnerId].sort().join('_');

    try {
        await supabase
            .from('reveal_requests')
            .upsert([{ user_id: req.user.id, partner_id: partnerId, chat_id: chatId }]);

        const { count: revealCount } = await supabase
            .from('reveal_requests')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chatId);

        res.json({ success: true, isRevealed: (revealCount || 0) >= 2 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/chats/:partnerId', authenticate, async (req, res) => {
    const { partnerId } = req.params;
    const chatId = [req.user.id, partnerId].sort().join('_');
    try {
        const { error } = await supabase
            .from('messages')
            .delete()
            .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${req.user.id})`);

        if (error) throw error;

        // Also clean up reveal requests
        await supabase.from('reveal_requests').delete().eq('chat_id', chatId);

        res.json({ success: true, message: 'Chat deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- DEV ONLY: RESET DATABASE ---
app.post('/api/dev/reset', async (req, res) => {
    // SECURITY FIX: Requires DEV_SECRET header
    const devSecret = req.headers['x-dev-secret'];
    if (!devSecret || devSecret !== process.env.SECRET_KEY) {
        console.warn(`[Security] Blocked unauthorized attempt to reset database from IP: ${req.ip}`);
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        console.log('--- REMOTE RESET AUTHORIZED & REQUESTED ---');

        // 1. Delete all posts
        // We use a dummy condition to delete everything
        const { error: delError } = await supabase.from('posts').delete().neq('id', 'nothing_to_match_this_string_ever');
        if (delError) console.error('Delete error:', delError);

        // 2. Create/Update Official User
        const officialId = 'npc_flare_official';
        await supabase.from('users').upsert([{
            id: officialId,
            email: 'hello@flare.social',
            password: 'flare_official_secret_pass',
            name: 'Flare Official',
            username: 'flare_social',
            image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400',
            bio: 'Welcome to Flare! We connect souls.',
            profile_complete: 1
        }]);

        // 3. Insert Official Welcome Post
        await supabase.from('posts').insert([{
            id: 'post_official_welcome_' + Date.now(),
            user_id: officialId,
            username: 'Flare Official',
            user_image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400',
            text: 'ยินดีต้อนรับสู่ Flare! 🔥 พื้นที่สำหรับเชื่อมต่อพูดคุย สานสัมพันธ์ และตามหา Soulmate ของคุณ เริ่มต้นด้วยการเข้าร่วมปาร์ตี้ หรือปัดหาคนที่ใช่เพื่อเปิดโลกใบใหม่ได้เลย! #FlareSocial',
            image: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=800',
            likes: 999,
            comment_count: 42,
            timestamp: new Date().toISOString()
        }]);

        res.json({ success: true, message: 'Database reset and seeded with Flare Official!' });
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- Referral & VIP System ---
app.get('/api/users/referral', authenticate, async (req, res) => {
    try {
        // Try snake_case first, if fails we'll catch and try camelCase or use a more generic approach
        let { data: user, error } = await supabase
            .from('users')
            .select('*') // Select all to avoid column not found errors during select
            .eq('id', req.user.id)
            .maybeSingle();

        if (error) throw error;
        
        if (!user) {
            return res.status(404).json({ 
                error: 'ไม่พบโปรไฟล์ในระบบ! คุณอาจจะเผลอลบบัญชีทิ้งไปแล้ว กรุณาออกจากระบบแล้วเข้าใหม่ครับ' 
            });
        }


        let referralCode = user.referral_code || user.referralCode;

        // Generate code if it doesn't exist
        if (!referralCode) {
            referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Try to update both possible column names
            const updateData = {};
            if ('referral_code' in user) updateData.referral_code = referralCode;
            if ('referralCode' in user) updateData.referralCode = referralCode;
            
            // If neither exists in the 'user' object we got back, it's a real schema mismatch
            // Default to snake_case but try/catch
            if (Object.keys(updateData).length === 0) {
                updateData.referral_code = referralCode;
            }

            const { error: updateError } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', req.user.id);
            
            if (updateError) {
                // Final fallback trial
                await supabase.from('users').update({ referralCode: referralCode }).eq('id', req.user.id);
            }
        }

        // Count successful invites
        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .or(`referred_by.eq.${req.user.id},referredBy.eq.${req.user.id}`);

        res.json({ 
            referralCode: referralCode, 
            inviteCount: count || 0 
        });
    } catch (err) {
        console.error('Get referral error:', err);
        res.status(500).json({ error: err.message, suggestion: 'Please ensure referral_code column exists in users table.' });
    }
});

app.post('/api/users/referral/apply', authenticate, async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Referral code is required' });

    try {
        // 1. Check if current user was already referred
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('referred_by, id')
            .eq('id', req.user.id)
            .single();
        
        if (userError) throw userError;
        if (currentUser.referred_by) return res.status(400).json({ error: 'You have already applied a referral code' });

        // 2. Find the referrer
        const { data: referrer, error: refError } = await supabase
            .from('users')
            .select('id, vip_until')
            .eq('referral_code', code.toUpperCase())
            .single();

        if (refError || !referrer) return res.status(404).json({ error: 'Invalid referral code' });
        if (referrer.id === req.user.id) return res.status(400).json({ error: 'Cannot use your own referral code' });

        // 3. Mark current user as referred
        await supabase.from('users').update({ referred_by: referrer.id }).eq('id', req.user.id);

        // 4. Grant 3 months VIP to the referrer
        const currentVipUntil = referrer.vip_until ? new Date(referrer.vip_until) : new Date();
        if (currentVipUntil < new Date()) {
            currentVipUntil.setTime(new Date().getTime());
        }
        
        // Add 3 months (approx 90 days)
        currentVipUntil.setMonth(currentVipUntil.getMonth() + 3);

        const { error: vipError } = await supabase
            .from('users')
            .update({ 
                is_vip: true, 
                vip_until: currentVipUntil.toISOString() 
            })
            .eq('id', referrer.id);

        if (vipError) throw vipError;

        res.json({ success: true, message: 'Referral code applied! Your friend got 3 months VIP.' });
    } catch (err) {
        console.error('Apply referral error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Error Handling ---
// --- Serve Frontend (for Render/Production) ---
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    console.log('✓ Serving static frontend from ./dist');
    app.use(express.static(distPath));

    // Handle SPA routing - return index.html for any unknown non-API route
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        } else {
            next();
        }
    });
} else {
    // Only use check for 404 if frontend is not built
    app.use((req, res) => {
        console.log(`[404] Not Found: ${req.method} ${req.url}`);
        res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
    });
}

app.use((err, req, res, next) => {
    console.error('[500] Server Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
    console.log(`Backend Server with Supabase running at http://localhost:${PORT}`);
});
