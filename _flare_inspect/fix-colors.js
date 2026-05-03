const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.jsx') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace background rgba(255,255,255, 0.xx) usually maps to var(--glass) or var(--glass-border)
    // Actually, background: rgba(255,255,255, 0.xx) -> background: var(--glass)
    content = content.replace(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'background: var(--glass)');
    
    // Replace border: 1px solid rgba(255,255,255, 0.xx) -> border: 1px solid var(--glass-border)
    content = content.replace(/border:\s*(1px|2px|3px|4px)\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'border: $1 solid var(--glass-border)');
    content = content.replace(/border-color:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'border-color: var(--glass-border)');
    content = content.replace(/border-top:\s*(1px|2px|3px|4px)\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'border-top: $1 solid var(--glass-border)');
    content = content.replace(/border-bottom:\s*(1px|2px|3px|4px)\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'border-bottom: $1 solid var(--glass-border)');
    content = content.replace(/border-left:\s*(1px|2px|3px|4px)\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'border-left: $1 solid var(--glass-border)');
    content = content.replace(/border-right:\s*(1px|2px|3px|4px)\s+solid\s+rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'border-right: $1 solid var(--glass-border)');

    // Replace color: rgba(255,255,255, 0.xx) -> color: var(--text-dim)
    content = content.replace(/color:\s*rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)/g, 'color: var(--text-dim)');
    
    // Replace color: white -> color: var(--text-main) but ONLY in general styling (could be risky if inside svg, let's keep it minimal)
    content = content.replace(/color:\s*white([^;]*);/g, 'color: var(--text-main)$1;');

    if (original !== content) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
