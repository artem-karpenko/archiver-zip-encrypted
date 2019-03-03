'use strict';

const inherits = require('util').inherits;
const {Transform} = require('stream');
const crypto = require('crypto');

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
    this.key = this.deriveKey(this.salt, options.key);
    this.cipher = crypto.createCipheriv('aes-256-ctr', this.key.aesKey, this.salt);
    this.hmac = crypto.createHmac('sha1', this.key.hmacKey);
    this.passwordVerifier = this.key.passwordVerifier;

    this.headerSent = false;
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

AesHmacEtmStream.prototype._transform = function (data, encoding, cb) {
    if (!this.headerSent) {
        this.push(this.salt);
        console.log(`[AES] Writing salt of ${this.salt.length} bytes`);

        this.push(this.passwordVerifier);
        console.log(`[AES] Writing verifier of ${this.passwordVerifier.length} bytes`);

        this.headerSent = true;
    }

    let encoded = this.cipher.update(data);

    if (encoded.length > 0) {
        console.log(`[AES] Writing ${Buffer.byteLength(encoded)} bytes`);

        this.hmac.update(encoded);
        this.push(encoded);
    }

    cb();
};

AesHmacEtmStream.prototype._flush = function (cb) {
    let encoded = this.cipher.final();

    if (encoded.length > 0) {
        console.log(`[AES] Writing ${Buffer.byteLength(encoded)} bytes`);

        this.push(encoded);
        this.hmac.update(encoded);
    }

    let hmacData = this.hmac.digest().slice(0, 10);
    console.log(`HMAC of ${hmacData.length} bytes`);
    this.push(hmacData);

    cb();
};

module.exports = AesHmacEtmStream;