import fs from 'fs';
import path from 'path';

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile() && filePath.endsWith('.ts')) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

let count = 0;
walkSync('./src', function(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('createSafeServerClient')) {
        const newContent = content.replace(/createSafeServerClient/g, 'createAdminClient_AFTER_PERMISSION_CHECK');
        fs.writeFileSync(filePath, newContent);
        console.log('Updated', filePath);
        count++;
    }
});
console.log('Total files updated:', count);
