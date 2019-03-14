'use strict';

const fs = require('fs');
const CryptoStream = require('../lib/zip20/crypto-stream');
const DecryptoStream = require('../lib/zip20/decrypto-stream');
require('should');

describe('crypt-stream', () => {
    it('should encrypt and then decrypt stream', (done) => {
        let cryptoStream = CryptoStream({crc: Buffer.from('ABF033D8', 'hex'), key: '123'});
        let decryptoStream = new DecryptoStream({crc: Buffer.from('ABF033D8', 'hex'), key: '123'});

        let originalData = Buffer.alloc(0);
        let finalData = Buffer.alloc(0);
        fs.createReadStream('./test/resources/test.txt', {highWaterMark: 1024})
            .on('data', (data) => {
                originalData = Buffer.concat([originalData, data]);
            })
            .pipe(cryptoStream)
            .pipe(decryptoStream)
            .on('data', (data) => {
                finalData = Buffer.concat([finalData, data]);
            })
            .on('end', () => {
                finalData.should.eql(originalData);
                done();
            });
    });
});