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
    // apparently WinZip's AES-CTR implementation uses nonce with 1st byte set to 1 and zeroes to others
    this.cipher = crypto.createCipheriv('aes-256-ctr', this.key.aesKey, Buffer.from('01000000000000000000000000000000', 'hex'));
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
        this.totalSize += this.salt.length;

        this.push(this.passwordVerifier);
        this.totalSize += this.passwordVerifier.length;

        this.headerSent = true;
    }

    let encoded = this.cipher.update(data);

    if (encoded.length > 0) {
        this.hmac.update(encoded);
        this.push(encoded);
        this.totalSize += encoded.length;
    }

    cb();
};

AesHmacEtmStream.prototype._flush = function (cb) {
    let encoded = this.cipher.final();

    if (encoded.length > 0) {
        this.push(encoded);
        this.hmac.update(encoded);

        this.totalSize += encoded.length
    }

    let hmacData = this.hmac.digest().slice(0, 10);
    this.push(hmacData);

    this.totalSize += hmacData.length;

    cb();
};

module.exports = AesHmacEtmStream;