const archiver = require('archiver');
const fs = require('fs');

describe('archiver', () => {
    archiver.registerFormat('zip-aes', require('../lib/zip-aes'));

    let archive = archiver.create('zip-aes', {comment: "hello"});
    archive.append(fs.createReadStream('./test/resources/test.file'), {
        name: 'test.txt'
    });
    archive.finalize();
    archive.pipe(fs.createWriteStream('./target/test.zip'));
});