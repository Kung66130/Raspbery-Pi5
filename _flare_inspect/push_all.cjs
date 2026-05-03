const { execSync } = require('child_process');
const fs = require('fs');

const commands = [
    'git add .',
    'git commit -m "Soul: implement auto-profile, real-time status, cleanup items and update code map"',
    'git push'
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

fs.writeFileSync('git_push_result.txt', result);
console.log('Git operations completed. Check git_push_result.txt for details.');
