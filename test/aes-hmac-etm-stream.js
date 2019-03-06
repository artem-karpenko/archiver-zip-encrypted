'use strict';

const AesHmacEtmStream = require('../lib/aes/aes-hmac-etm-stream');
const fs = require('fs');
const should = require('should');
const crypto = require('crypto');

describe('aes-hmac-etm-stream', () => {
    it('should encode data which is later decoded by standard crypto cipher', (done) => {
        const data = Buffer.from("Hello AES", 'utf-8');
        let salt = Buffer.from('1234567890123456', 'ascii');
        let key = Buffer.from('12345678901234567890123456789012', 'ascii');
        let stream = new AesHmacEtmStream({
            salt: salt,
            key: key});
        stream.write(data);
        stream.end();

        let encodedData = Buffer.alloc(0);
        stream.on('data', data => {
            encodedData = Buffer.concat([encodedData, data]);
            console.log(`encoded received: ${data.toString('utf-8')}`);
        });

        stream.on('end', () => {
            console.log('Encoding completed');

            const hmacLength = 10;

            encodedData.should.have.length(16 + 2 + data.length + hmacLength);
            encodedData.slice(0, 16).should.eql(salt);

            let compositeKey = stream.deriveKey(salt, key);

            compositeKey.passwordVerifier.should.be.eql(encodedData.slice(16, 18));

            let decipher = crypto.createDecipheriv('aes-256-ctr', compositeKey.aesKey, Buffer.from("01000000000000000000000000000000", "hex"));
            let decoded = decipher.update(encodedData.slice(18, encodedData.length - hmacLength));
            decoded = Buffer.concat([decoded, decipher.final()]);

            decoded.should.be.eql(data);

            done();
        });
    });
});