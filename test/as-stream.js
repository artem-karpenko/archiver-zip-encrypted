const ZipEncryptedStream = require('../').ZipEncryptedStream;
const fs = require('fs');
const cp = require('child_process');
const rmrf = require('rimraf');
const should = require('should');
const path = require('path');
const ZipCryptoStream = require('../lib/zip20/zip-crypto-stream');

describe('using as stream', (done) => {
    beforeEach(() => {
        rmrf.sync('./target');
        fs.mkdirSync('./target', {recursive: true});
    });

    it('should encrypt data and 7z and 7z will decrypt it', (done) => {
        fs.createReadStream('./test/resources/test.txt')
            .pipe(new ZipCryptoStream({password: '123', encryptionMethod: 'zip20'}))
            .pipe(fs.createWriteStream('./target/test.zip'))
            .on('finish', done);
    })
});