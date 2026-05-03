import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Project/SocialApp/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase keys in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUsers() {
    console.log('Seeding mock users...');
    
    const mockUsers = [
        {
            id: 'user_dummy_1',
            email: 'alice@flare.local',
            name: 'Alice ซ่า',
            username: 'alice_za',
            bio: 'ชอบกินชาบู หมูกระทะ ทักมาคุยกันได้นะ',
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=60',
            password: 'mockpassword',
            profileComplete: 1,
            referral_code: 'ALICE9'
        },
        {
            id: 'user_dummy_2',
            email: 'bob@flare.local',
            name: 'P P',
            username: 'pp_coolguy',
            bio: 'เกมเมอร์สายชิว หากลุ่มเล่นเกมครับ',
            image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&auto=format&fit=crop&q=60',
            password: 'mockpassword',
            profileComplete: 1,
            referral_code: 'BOBP88'
        },
        {
            id: 'user_dummy_3',
            email: 'cat@flare.local',
            name: 'Nong Cat',
            username: 'meow_cat',
            bio: 'ทาสแมว ยินดีที่ได้รู้จักค่า 🐱',
            image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=60',
            password: 'mockpassword',
            profileComplete: 1,
            referral_code: 'CATME0'
        }
    ];

    const { data, error } = await supabase.from('users').upsert(mockUsers);
    
    if (error) {
        console.error('Error inserting mock users:', error);
    } else {
        console.log('Mock users inserted successfully!');
    }
    
    process.exit(0);
}

seedUsers();
