const fs = require('fs');
const should = require('should');
const CRC32Stream = require('crc32-stream').CRC32Stream;
const WrapTransformStream = require('../lib/WrapTransformStream');
const {PassThrough} = require('stream');

describe('wrap crc32', (done) => {
    it('should encode crc32 stream and produce the same results', (done) => {
        let crc32 = Buffer.alloc(0);

        fs.createReadStream('./test/resources/test.txt')
            .pipe(new WrapTransformStream(new PassThrough()))
            .on('data', (data) => {
                crc32 = Buffer.concat([crc32, data]);
            })
            .on('finish', () => {
                console.log(crc32.toString('utf-8'));
                done();
            });
    });
});