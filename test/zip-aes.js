const archiver = require('archiver');
const fs = require('fs');
const cp = require('child_process');
const rmrf = require('rimraf');
const should = require('should');
const path = require('path');
const lazystream = require('lazystream');

/**
 * This test assumes 7-Zip installed in the system and available in path
 */
describe('zip-aes', () => {
    before(() => {
        try {
            archiver.registerFormat('zip-encrypted', require('../'));
        } catch (e) {
            // already registered
        }
    });

    beforeEach(() => {
        rmrf.sync('./target');
        fs.mkdirSync('./target', {recursive: true});
    });

    it('should pack with zip-aes and unpack with 7z', (done) => {
        let archive = archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'aes256', password: '123'});
        archive.append(fs.createReadStream('./test/resources/test.txt'), { // with stream
            name: 'test.txt'
        });
        archive.append(fs.createReadStream('./test/resources/test.txt'), { // with buffer
            name: 'test2.txt'
        });
        archive.append('./test/resources/test.txt', { // file path
            name: 'test3.txt'
        });
        archive.append(new lazystream.Readable(() => fs.createReadStream('./test/resources/test.txt')), { // lazy stream
            name: 'test4.txt'
        });
        archive.finalize();

        let out = fs.createWriteStream('./target/test.zip');
        archive.pipe(out);

        out.on('close', () => {
            cp.execFile('7z', ['e', `target${path.sep}test.zip`, '-otarget', '-p123'], (e) => {
                should.not.exist(e, '7z throws error: ' + e);
                fs.existsSync('./target/test.txt').should.be.true('Extracted file should exist');
                fs.existsSync('./target/test2.txt').should.be.true('Extracted file should exist');
                fs.existsSync('./target/test3.txt').should.be.true('Extracted file should exist');

                const originalFileContents = fs.readFileSync('./test/resources/test.txt').toString('utf-8');

                fs.readFileSync('./target/test.txt').toString('utf-8').should.be.eql(
                    originalFileContents
                );
                fs.readFileSync('./target/test2.txt').toString('utf-8').should.be.eql(
                    originalFileContents
                );

                done();
            });
        });
    });

    // setting compression to 0 to overcome bug (?) in 16.02 7z (only available version of 7z in travis)
    // modern 7z (and WinZip as well) on Windows 10 does unpack compressed encrypted empty files w/o issues
    it('should pack empty file with zip-aes and unpack with 7z', (done) => {
        let archive = archiver.create('zip-encrypted', {zlib: {level: 0}, encryptionMethod: 'aes256', password: '123'});
        archive.append(fs.createReadStream('./test/resources/empty-file.txt'), {
            name: 'test.txt'
        });
        archive.append(fs.createReadStream('./test/resources/test.txt'), {
            name: 'test2.txt'
        });
        archive.finalize();

        let out = fs.createWriteStream('./target/test.zip');
        archive.pipe(out);

        out.on('close', () => {
            cp.execFile('7z', ['e', `target${path.sep}test.zip`, '-otarget', '-p123'], (e, stdout, stderr) => {
                should.not.exist(e, '7z throws error: ' + e + '.\nError output: ' + stderr);

                fs.existsSync('./target/test.txt').should.be.true('Extracted file should exist');
                fs.existsSync('./target/test2.txt').should.be.true('Extracted file should exist');

                fs.readFileSync('./target/test.txt').toString('utf-8').should.be.eql('');
                fs.readFileSync('./target/test2.txt').toString('utf-8').should.be.eql(
                    fs.readFileSync('./test/resources/test.txt').toString('utf-8'));

                done();
            });
        });
    });

    it('should pack directory with zip-aes and unpack with 7z', (done) => {
        let archive = archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'aes256', password: '123'});
        archive.directory('./test/resources/dir', 'dir');
        archive.finalize();

        let out = fs.createWriteStream('./target/test.zip');
        archive.pipe(out);

        out.on('close', () => {
            cp.execFile('7z', ['e', `target${path.sep}test.zip`, '-spf', '-otarget', '-p123'], (e, stdout, stderr) => {
                should.not.exist(e, '7z throws error: ' + e + '.\nError output: ' + stderr);

                fs.existsSync('./target/dir/sub/test.txt').should.be.true('Extracted directory and file should exist');

                const originalFileContents = fs.readFileSync('./test/resources/dir/sub/test.txt').toString('utf-8');

                fs.readFileSync('./target/dir/sub/test.txt').toString('utf-8').should.be.eql(
                    originalFileContents
                );

                done();
            });
        });
    });
});