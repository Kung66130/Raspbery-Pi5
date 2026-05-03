const fs = require('fs');
const path = require('path');

const dir = 'c:\\Project\\SocialApp';
const devDir = path.join(dir, 'dev_scripts');

if (!fs.existsSync(devDir)) {
    fs.mkdirSync(devDir);
}

const files = fs.readdirSync(dir);

const patterns = [
    /^check_.*\.cjs$/,
    /^test_.*\.(js|cjs)$/,
    /^fetch_.*\.(cjs|txt)$/,
    /^tmp_.*\.js$/,
    /^seed_.*\.(js|cjs)$/,
    /^.*_out\.txt$/,
    /^.*log.*\.txt$/,
    /^out\.txt$/,
    /^git_result.*\.txt$/,
    /^git_push_result.*\.txt$/,
    /^trigger_reset\.cjs$/,
    /^debug_search\.cjs$/,
    /^get_admin\.cjs$/,
    /^copy_secret\.cjs$/,
    /^verify_seed\.cjs$/,
    /^run_git\.cjs$/,
    /^console\.error\('ERROR$/,
    /^push_all\.cjs$/,
    /^check_users_cols\.cjs$/
];

let movedCount = 0;

files.forEach(file => {
    // Only process files
    if (!fs.statSync(path.join(dir, file)).isFile()) return;

    const matches = patterns.some(pattern => pattern.test(file));
    if (matches) {
        fs.renameSync(path.join(dir, file), path.join(devDir, file));
        movedCount++;
        console.log(`Moved: ${file}`);
    }
});

console.log(`Successfully moved ${movedCount} files to dev_scripts folder.`);
