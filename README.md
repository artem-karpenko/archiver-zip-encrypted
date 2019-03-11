# archiver-zip-encrypted
> AES-256 and legacy Zip 2.0 encryption for Zip files.

Plugin for [archiver](https://www.npmjs.com/package/archiver) that adds encryption 
capabilities to Zip compression. Pure JS, no external zip software needed.

## Install
    npm install archiver-zip-encrypted --save

## Usage
    const archiver = require('archiver');
    
    // register format for archiver
    archiver.registerFormat('zip-encrypted', require("archiver-zip-encrypted"));
    
    // create archive and specify method of encryption and password
    let archive = archiver.create('zip-encrypted', {zlib: {level: 8}, encryptionMethod: 'aes256', password: '123'});
    // ... add contents to archive as usual using archiver

## Encryption methods
Plugin supports 2 encryption methods:

* 'aes256' - this is implementation of AES-256 encryption introduced by WinZip in 2003.
   It is the most safe option in regards of encryption, but limits possibilities of opening resulting archives.
   It's known to be supported by recent versions 7-Zip and WinZip. It is NOT supported by
   Linux unzip 6.00 (by Info-Zip). It is also NOT supported by Windows explorer (i.e. not possible to open Zip file as folder),
   even in Windows 10. 
* 'zip20' - this is implementation of legacy Zip 2.0 encryption (also called "ZipCrypto" in 7-Zip application).
   This is the first encryption method added to Zip format and hence is widely supported, in particular 
   by standard tools in Linux and Windows. However its security is proven to be breakable
   so I would not recommend using it unless you absolutely have to make it work w/o external software.
      
For more information on these encryption methods and its drawbacks in particular see [WinZip documentation](http://kb.winzip.com/help/RU/WZ/help_encryption.htm)
It's worth noting that neither of these encryption methods encrypt file names and their metainformation, 
such as original size, filesystem dates, permissions etc.