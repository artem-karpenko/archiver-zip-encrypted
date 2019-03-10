const archiver = require('archiver');
const fs = require('fs');
const cp = require('child_process');
const rmrf = require('rimraf');
const should = require('should');
const path = require('path');

describe('zip-crypto', () => {
    beforeEach(() => {
        rmrf.sync('./target');
        fs.mkdirSync('./target', {recursive: true});
    });

    it('should pack zip-crypto/unpack 7z', (done) => {
        try {
            archiver.registerFormat('zip-encrypted', require("../lib/zip-encrypted"));
        } catch (e) {} // already registered

        let archive = archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'zip20', password: '123'});
        archive.append(fs.createReadStream('./test/resources/test.txt'), {
            name: 'test.txt'
        });
        archive.finalize();

        let out = fs.createWriteStream('./target/test.zip');
        archive.pipe(out);

        out.on("close", () => {
            cp.execFile('7z.exe', ['e', `target${path.sep}test.zip`, '-otarget', '-p123'], (e) => {
                should.not.exist(e, '7z throws error: ' + e);
                fs.existsSync('./target/test.txt').should.be.true('Extracted file should exist');
                fs.readFileSync('./target/test.txt').toString('utf-8').should.be.eql(
                    fs.readFileSync('./test/resources/test.txt').toString('utf-8')
                );

                done();
            });
        });
    });
});