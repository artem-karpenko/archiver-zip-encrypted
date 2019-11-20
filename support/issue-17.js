const archiver = require('archiver');
const fs = require('fs');

const express = require('express');
const app = express();
const port = 3000;

// register format for archiver
archiver.registerFormat(
    'zip-encrypted',
    require('../')
);

app.get('/', (req, res) => {
    // create archive and specify method of encryption and password
    const archive = archiver.create('zip-encrypted', {
        zlib: { level: 9 },
        encryptionMethod: 'zip20',
        password: Buffer.from('123')
    });

    archive.on('error', err => {
        console.log(err);
        res.status(500).send({ error: err.message });
    });

    res.attachment('archive.zip');

    archive.pipe(res);
    archive.append(fs.createReadStream('./resources/test.txt'), { name: 'data.txt' });
    archive.finalize();

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));