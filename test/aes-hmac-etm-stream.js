'use strict';

const AesHmacEtmStream = require('../lib/aes/aes-hmac-etm-stream');
const crypto = require('crypto');
const aes = require('aes-js');
require('should');

describe('aes-hmac-etm-stream', () => {
    it('should encode data which is later decoded by aes-js', (done) => {
        let salt = Buffer.from('1234567890123456', 'ascii');
        let key = Buffer.from('12345678901234567890123456789012', 'ascii');
        let stream = AesHmacEtmStream({
            salt: salt,
            key: key});

        let data = crypto.randomBytes(3000);
        stream.write(data);

        let anotherData = crypto.randomBytes(3000);
        stream.write(anotherData);

        data = Buffer.concat([data, anotherData]);

        stream.end();

        let encodedData = Buffer.alloc(0);
        stream.on('data', data => {
            encodedData = Buffer.concat([encodedData, data]);
        });

        stream.on('end', () => {
            const hmacLength = 10;

            encodedData.should.have.length(16 + 2 + data.length + hmacLength);
            encodedData.slice(0, 16).should.eql(salt);

            let compositeKey = stream.deriveKey(salt, key);

            compositeKey.passwordVerifier.should.be.eql(encodedData.slice(16, 18));

            let decipher = new aes.ModeOfOperation.ctr(new Uint8Array(compositeKey.aesKey),
                new aes.Counter(new Uint8Array(Buffer.from('01000000000000000000000000000000', 'hex'))));

            let decoded = Buffer.from(decipher.decrypt(new Uint8Array(encodedData.slice(18, encodedData.length - hmacLength))));

            decoded.should.be.eql(data);

            done();
        });
    });
});
