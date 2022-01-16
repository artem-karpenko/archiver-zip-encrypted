const archiver = require('archiver');
const fs = require('fs');

const LARGE_FILE = 'C:\\Users\\gooyo\\Downloads\\Blade Runner 2049 (2017) BDRip 720p.mkv';

// register format for archiver
archiver.registerFormat(
    'zip-encrypted',
    require('../')
);

// create archive and specify method of encryption and password
const archive = archiver.create('zip-encrypted', {
    zlib: { level: 4, chunkSize: 10 * 1024 * 1024 },
    encryptionMethod: 'aes256',
    password: Buffer.from('123')
});

archive.on('error', err => {
    console.log(err);
});

archive.append(fs.createReadStream(LARGE_FILE), { name: 'data.mkv' });
// archive.append(fs.createReadStream(LARGE_FILE), { name: 'data.mkv' });
// archive.append(fs.createReadStream('./issue-30.js'), { name: 'data.txt' });
archive.finalize();

let out = fs.createWriteStream('aes-large-orig.zip');
archive.pipe(out);