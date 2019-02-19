const cv = require('opencv4nodejs');
const fs = require('fs');
const tesseract = require('node-tesseract-ocr')
const util = require('util');
const req = require('request');
const cheerio = require('cheerio');
const download = util.promisify(function (uri, filename, callback) {
    req.head(uri, function (err, res, body) {
        req(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
});
const config = {
    lang: 'eng',
    oem: 1,
    psm: 3
}
const getp = util.promisify(req.get);
async function getLunch() {
    //Scrape the site with Cheerio
    let scrape = await getp('https://corda.be/corda-latte/');
    if (scrape.error) {
        throw scrape.error;
    }
    let $ = cheerio.load(scrape.body);
    //Get the image
    let src = $('.attachment-medium_large.size-medium_large').attr('src');
    await download(src, 'latte.jpg');

    //Use tesseract to get all text lines and split it into an array
    let scan = await tesseract.recognize('latte.jpg', config);
    
    var lines = scan.split('\n');

    let broodjelatte = '';
    let broodjecorda = '';

    //Filter out empty lines
    lines = lines.filter(el =>{
        return !!el.trim();
    });
    console.log(lines);

    //Look for the right strings and parse them
    lines.forEach((line, index) => {
        if (line.startsWith('BROODJE LATT') || line.startsWith('BROODSE LATT')) {
            broodjelatte = lines[index + 1]
        }
        if (line.startsWith('BROODJE CORDA')) {
            broodjecorda = lines[index + 1]
        }
    });
    return { latte: broodjelatte, corda: broodjecorda }

}
getLunch();
module.exports = getLunch;

