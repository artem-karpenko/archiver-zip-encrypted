'use strict';

const aes = require('aes-js');
const AesHmacEtmStream = require('../lib/aes-hmac-etm-stream');

let key = AesHmacEtmStream.prototype.deriveKey(Buffer.from('C8208C7C221D1BCCA164C6D79B485033', 'hex'), Buffer.from('123', 'utf-8')).aesKey;

// console.log(key.ae.toString('hex'));

const key1 = aes.utils.hex.toBytes(key.toString('hex'));
console.log(aes.utils.hex.fromBytes(key1));
const c = new aes.ModeOfOperation.ctr(key1);
console.log(aes.utils.hex.fromBytes(c.encrypt(Buffer.from('Hello zip!'))));