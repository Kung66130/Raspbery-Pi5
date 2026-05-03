const fs = require('fs');
const path = require('path');

const src = path.join('Store_Assets', 'App_Icon_512.png');
const destinations = [
    'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
    'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
    'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
    'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
    'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
    'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png',
    'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png',
    'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png',
    'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png',
    'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',
    'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png',
    'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png',
    'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png',
    'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png',
    'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
    'assets/icon.png'
];

try {
    const data = fs.readFileSync(src);
    destinations.forEach(dest => {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.writeFileSync(dest, data);
        console.log(`Copied to ${dest} (${data.length} bytes)`);
    });
    console.log('SUCCESS');
} catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
}
