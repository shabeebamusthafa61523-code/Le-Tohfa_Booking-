import fs from 'fs';
import path from 'path';

const logoPath = path.resolve('frontend/public/logo2.png');
const buffer = fs.readFileSync(logoPath);
const base64 = buffer.toString('base64');
const dataUrl = `data:image/png;base64,${base64}`;

console.log('Length:', dataUrl.length);
fs.writeFileSync('scratch/logo2_base64.txt', dataUrl);
console.log('Base64 logo written to scratch/logo2_base64.txt');
