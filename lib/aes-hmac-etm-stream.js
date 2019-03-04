'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');
const crypto = require('crypto');

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const COMPOSITE_KEY_LENGTH = 2 * KEY_LENGTH + 2;
const PBKDF2_ITERATION_COUNT = 1000;

/**
 * Transform stream that encodes data with AES stream and prepends additional data for authentication and verification:
 * ${salt}${passwordVerifier}${encodedData}${hmac}
 */
function AesHmacEtmStream(options = {key: null, salt: null, transformOptions: {}}) {
    if (!(this instanceof AesHmacEtmStream)) {
        return new AesHmacEtmStream(options);
    }
    Transform.call(this, options);

    this.salt = options.salt;
    if (!this.salt) {
        this.salt = crypto.randomBytes(SALT_LENGTH);
    }

    this.key = this.deriveKey(this.salt, options.key);
    this.cipher = crypto.createCipheriv('aes-256-ctr', this.key.aesKey, this.salt);
    this.hmac = crypto.createHmac('sha1', this.key.hmacKey);
    this.passwordVerifier = this.key.passwordVerifier;

    this.headerSent = false;
    this.totalSize = 0;
}
inherits(AesHmacEtmStream, Transform);

AesHmacEtmStream.prototype.deriveKey = function (salt, key) {
    const compositeKey = crypto.pbkdf2Sync(key, salt, PBKDF2_ITERATION_COUNT, COMPOSITE_KEY_LENGTH, 'sha1');
    return {
        aesKey: compositeKey.slice(0, KEY_LENGTH),
        hmacKey: compositeKey.slice(KEY_LENGTH, 2 * KEY_LENGTH),
        passwordVerifier: compositeKey.slice(2 * KEY_LENGTH)
    };
};

AesHmacEtmStream.prototype.getTotalSize = function () {
    return this.totalSize;
};

AesHmacEtmStream.prototype._transform = function (data, encoding, cb) {
    if (!this.headerSent) {
        this.push(this.salt);
        console.log(`[AES] Writing salt of ${this.salt.length} bytes`);
        console.log(`[AES] Salt: ${this.salt.toString('hex')}`);
        this.totalSize += this.salt.length;

        this.push(this.passwordVerifier);
        console.log(`[AES] Writing verifier of ${this.passwordVerifier.length} bytes`);
        console.log(`[AES] Verifier: ${this.passwordVerifier.toString('hex')}`);
        this.totalSize += this.passwordVerifier.length;

        this.headerSent = true;
    }

    let encoded = this.cipher.update(data);

    if (encoded.length > 0) {
        console.log(`[AES] Writing ${Buffer.byteLength(encoded)} bytes of data`);

        this.hmac.update(encoded);
        this.push(encoded);
        this.totalSize += encoded.length;
    }

    cb();
};

AesHmacEtmStream.prototype._flush = function (cb) {
    let encoded = this.cipher.final();

    if (encoded.length > 0) {
        console.log(`[AES] Writing ${Buffer.byteLength(encoded)} bytes of data`);

        this.push(encoded);
        this.hmac.update(encoded);

        this.totalSize += encoded.length
    }

    let hmacData = this.hmac.digest().slice(0, 10);
    console.log(`HMAC of ${hmacData.length} bytes`);
    console.log(`HMAC: ${hmacData.toString('hex')}`);
    this.push(hmacData);

    this.totalSize += hmacData.length;

    cb();
};

module.exports = AesHmacEtmStream;