'use strict';

const ZipEncrypted = require('../lib/zip-encrypted');
const archiver = require('archiver');
const should = require('should');

describe('zip-encrypted', () => {
    before(() => {
        try {
            archiver.registerFormat('zip-encrypted', ZipEncrypted);
        } catch (e) {
            // already registered
        }
    });

    it('should fail if password is not provided', () => {
        (() => archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'zip20'})).should.throw();
    });

    it('should fail if encryption method is not provided', () => {
        (() => archiver.create('zip-encrypted', {zlib: {level: 8}, password: '123'})).should.throw();
    });

    it('should fail if nothing is not provided', () => {
        (() => archiver.create('zip-encrypted')).should.throw();
    });

    it('fallback construction', () => {
        should(ZipEncrypted({ encryptionMethod: 'zip20', password: '123'})).not.be.undefined();
    });
});