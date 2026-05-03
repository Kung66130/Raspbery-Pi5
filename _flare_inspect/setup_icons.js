const fs = require('fs');

const srcPath = 'c:/Project/SocialApp/public/Gemini_Generated_Image_ybdaz3ybdaz3ybda.png';
const destIcon = 'c:/Project/SocialApp/assets/icon.png';
const destSplash = 'c:/Project/SocialApp/assets/splash.png';

try {
    if (!fs.existsSync('c:/Project/SocialApp/assets')) {
        fs.mkdirSync('c:/Project/SocialApp/assets');
    }
    fs.copyFileSync(srcPath, destIcon);
    fs.copyFileSync(srcPath, destSplash);
    console.log('Images copied successfully.');
} catch (error) {
    console.error('Error:', error.message);
}
