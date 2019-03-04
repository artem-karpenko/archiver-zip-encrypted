'use strict';

const crc32 = require('crc').crc32;

function CryptoCipher(key) {
    this.key = key;
    if (!Buffer.isBuffer(key)) {
        this.key = Buffer.from(this.key);
    }

    this._init();
}

CryptoCipher.prototype._init = function () {
    this.key0 = 0x12345678;
    this.key1 = 0x23456789;
    this.key2 = 0x34567890;

    for (let b of this.key) {
        this._updateKeys(b);
    }


};

CryptoCipher.prototype._updateKeys = function (b) {
    this.key0 = crc32(this.key0, b);
    this.key1 = (this.key1 + (this.key0 & 0xFF)) * 0x08088405 + 1;
    this.key2 = crc32(this.key2, this.key1 >> 24);
};

module.exports = CryptoCipher;