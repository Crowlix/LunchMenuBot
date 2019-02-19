# LunchMenuBot
Using OpenCV and Tesseract OCR to parse a lunch menu


In short, this is what lunch.js does
It'll parse the following image:

![original image](http://proficient.ninja/js/image.jpg)

Convert it to greyscale and parse the horizontal lines:
![horizontal_lines lines](http://proficient.ninja/js/horizontal_lines_img.jpg)

Parse the vertical lines:
![vertical_lines](http://proficient.ninja/js/vertical_lines.jpg)

Layer them on top of each other:
![final_image](http://proficient.ninja/js/img_final_bin.jpg)

Detect all the contours and parse each rectangle as a separate image, example:
![contour](http://proficient.ninja/js/181-852.jpg)

After the images are parsed, I loop over all the fragments and use Tesseract to recognize the text.

There are two more files, latte.js and index.js
* Latte.js just parses a coffee/sandwich bar menu with OCR
* Index.js combines uses the two other files to get the content and push it as a formatted message to Discord
