const cv = require('opencv4nodejs');
const fs = require('fs');
const tesseract = require('node-tesseract-ocr')
const path = require('path');
const req = require('request');
const util = require('util');
const cheerio = require('cheerio');
const download = util.promisify(function (uri, filename, callback) {
    req.head(uri, function (err, res, body) {
        req(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
});
const getp = util.promisify(req.get);

const config = {
    lang: 'eng',
    oem: 1,
    psm: 3
}

const debug = false;

async function getLunch() {
    //Scrape the site with cheerio
    let scrape = await getp('https://corda.be/corda-cuisine/');
    const $ = cheerio.load(scrape.body);

    let src = $('.attachment-full.size-full').attr('src');
    await download(src, 'image.jpg');

    //Empty the fragments folder
    rmDir('fragments');

    //Original image and clone to perform edits on 
    var ormat = cv.imread('image.jpg', 0);
    var mat = cv.imread('image.jpg', 0);

    //Dynamic limits to determine which rectangles are big/small enough to be considered cells
    const widthThreshold = Math.round(ormat.cols / 7);
    const widthLimit = Math.round(ormat.cols / 5.8);
    const heightThreshold = Math.round(ormat.rows / 24);

    //Greyscale the image
    mat = mat.threshold(150, 255, cv.THRESH_BINARY_INV);

    //Define kernels for horizontal and vertical lines
    var verticle_kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 44));
    var horizontal_kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(44, 1));

    //Erode and dilate to get vertical and horizontal lines
    var img_temp1 = mat.erode(verticle_kernel, new cv.Vec(-1, -1), 3);
    var verticle_lines_img = img_temp1.dilate(verticle_kernel, new cv.Vec(-1, -1), 3)
    var img_temp2 = mat.erode(horizontal_kernel, new cv.Vec(-1, -1), 3);
    var horizontal_lines_img = img_temp2.dilate(horizontal_kernel, new cv.Vec(-1, -1), 3)

    //Paste horizontal and vertical lines on top of each other to get contour image
    var img_final_bin = verticle_lines_img.addWeighted(0.5, horizontal_lines_img, 0.5, 0.0);
    var contours = img_final_bin.findContours(cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

    //An array containing all x-coordinates, later used to determine which x-coord corresponds to which day
    var xcoords = [];

    if (debug) {
        console.log('WIDTH = ' + widthThreshold + '-' + widthLimit + ' HEIGHT = ' + heightThreshold);
        fs.writeFile('data.json', JSON.stringify(contours));
    }

    //Loop over all contours, match them against all limits and save the eligible ones in the fragments folder
    for (i = 0; i < contours.length; i++) {
        var boundingRect = contours[i].boundingRect();
        if (boundingRect.width > widthThreshold && boundingRect.width < widthLimit && boundingRect.height > heightThreshold) {
            xcoords.includes(boundingRect.x) || xcoords.push(boundingRect.x);
            var newimage = ormat.getRegion(boundingRect);
            cv.imwrite('fragments/' + boundingRect.x + '-' + boundingRect.y + ".jpg", newimage);
        }
        //Get around the world tile
        if (boundingRect.width > (widthThreshold * 5) && boundingRect.width < widthLimit * 5 && boundingRect.height > heightThreshold * 2) {
            let image = ormat.getRegion(boundingRect);
            cv.imwrite('world.jpg', image);
        }
    }

    if (debug) {
        cv.imwrite("verticle_lines.jpg", verticle_lines_img)
        cv.imwrite("horizontal_lines_img.jpg", horizontal_lines_img)
        cv.imwrite("img_final_bin.jpg", img_final_bin);
        cv.imwrite('new2.jpg', mat);
    }
    var fragments = [];
    var promises = [];

    //Parse all files in the fragments folder and use Tesseract to recognize the text
    promises = fs.readdirSync('fragments').map(async file => {
        let val = await tesseract.recognize('./fragments/' + file, config);
        let coords = file.split('-');
        fragments.push({ x: parseInt(coords[0]), y: parseInt(coords[1]), file: file, rawText: val.replace(/\n/g, ' ').trim() });
        return true;
    })

    //Parse the around the world image with Tesseract
    let worldlines = await tesseract.recognize('world.jpg',config);
    let lines = worldlines.split('\n');
    //filter out empty and short lines
    lines = lines.filter(el =>{
        return el.length > 8;
    }).slice(1,lines.length);
    
    //Sort the fragments according to x coord
    await Promise.all(promises);
    //console.log(fragments);
    fragments.sort((a, b) => {
        if (a.x === b.x) {
            if (a.y < b.y) {
                return -1
            } else {
                return 1
            }
        }
        if (a.x < b.x) {
            return -1
        } else {
            return 1
        }
    });

    //Filter out the lowest X value fragments
    var lowestX = fragments[0].x;
    fragments = fragments.filter(val => {
        return val.x != lowestX;
    });
    //Sort x-coords numerically ASC
    xcoords = xcoords.sort((a, b) => a - b);

    //Get the dishes of today's date
    const dayofweek = new Date().getDay();
    let dishes = fragments.filter((val) => {
        return val.x === xcoords[dayofweek];
    })
    
    return {dishes: dishes, world: lines};

}

function rmDir(directory) {
    var files = fs.readdirSync(directory);
    for (const file of files) {
        fs.unlinkSync(path.join(directory, file));
    }
};

module.exports = getLunch;