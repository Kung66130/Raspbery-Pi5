import fs from 'fs';

try {
    const src = 'c:/Project/SocialApp/public/Gemini_Generated_Image_ybdaz3ybdaz3ybda.png';
    const rawData = fs.readFileSync(src);
    fs.writeFileSync('c:/Project/SocialApp/assets/icon.png', rawData);
    fs.writeFileSync('c:/Project/SocialApp/assets/splash.png', rawData);
    console.log('Icons copied successfully');
} catch (e) {
    console.error('Error:', e.message);
}
