const archiver = require('archiver');
const fs = require('fs');

archiver.registerFormat('zip-encrypted', require('../'));
let archive = archiver.create('zip-encrypted', {zlib: {level: 0}, encryptionMethod: 'aes256', password: '123'});
archive.append(fs.readFileSync('C:\\ffmpeg-20190428-45048ec-win64-static.zip'), {name: 'backupZip.zip'});
archive.finalize();
let out = fs.createWriteStream('aes123.zip');
archive.pipe(out);

// out.on('close', () => {
//     console.log('close');
// });