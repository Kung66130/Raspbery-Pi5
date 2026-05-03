const fs = require('fs');
fs.writeFileSync('C:\\Project\\SocialApp\\secret.txt', fs.readFileSync('C:\\Project\\SocialApp\\.env.secret', 'utf8'));
