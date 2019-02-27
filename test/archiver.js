const archiver = require('archiver');
const fs = require('fs');

describe('archiver', () => {
    let archive = archiver.create('zip');
    archive.append(fs.createReadStream('./test/resources/test.file'), {
        name: 'test.txt'
    });
    archive.finalize();
    archive.pipe(fs.createWriteStream('./test/target/test.zip'));
});