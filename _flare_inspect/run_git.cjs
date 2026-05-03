const { execSync } = require('child_process');
const fs = require('fs');

const commands = [
    'git add .',
    'git commit -m "Modernized SoulSwipe UI to Tantan-style and cleaned up unused code/icons across components"',
    'git push',
    'git log -n 5 --oneline',
    'git status'
];

let result = '';
commands.forEach(cmd => {
    try {
        console.log(`Running: ${cmd}`);
        const output = execSync(cmd, {
            env: { ...process.env, 'HOME': 'C:/Users/kung6' },
            encoding: 'utf8'
        });
        result += `COMMAND: ${cmd}\nOUTPUT:\n${output}\n\n`;
    } catch (error) {
        result += `COMMAND: ${cmd}\nERROR:\n${error.message}\nSTDOUT: ${error.stdout}\nSTDERR: ${error.stderr}\n\n`;
    }
});

fs.writeFileSync('git_verify_final.txt', result);
console.log('Git operations completed. Check git_result.txt for details.');
