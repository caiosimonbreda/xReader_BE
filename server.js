const express = require("express")
const app = express()

// MIDDLEWARE goes below here

// >CORS because fuck me
// Actually allows cross-origin requests since I'm running
// backend and frontend at different domains
const cors = require('cors');
app.use(cors({
    origin: '*'
}));

// bodyParser middleware so I can access request body and send JSON
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.raw());

// Image manipulation and conversion libraries
const Tesseract = require("tesseract.js")
const Jimp = require("jimp")
const conv64 = require("base64-arraybuffer")

// Adjustments to image before Tesseract to make it more effective
// Tesseract likes big images that are dark text on bright backgrounds.
async function adjustForOCR(buffImg, avgBrightness) {
    return new Promise(resolve => {
        const adjustedImage = Jimp.read(buffImg)
        .then((img) => {
            //img.contrast(1).autocrop([1, true]).write("CROPPED.jpg")
            if (avgBrightness < 70) {
                return img
                .scale(4) // upscale
                .quality(100) // set JPEG quality
                .invert()     // invert image
                .greyscale()  // set greyscale
                .getBufferAsync(Jimp.AUTO) //save as a buffer
            } else {
                return img
                //.resize(4000, Jimp.AUTO) // upscale
                .scale(4) // upscale
                .quality(100) // set JPEG quality
                .greyscale()  // set greyscale
                .contrast(0.2)// boost contrast
                //.normalize()
                //.write("GAGAGAGAGA.jpg")
                .getBufferAsync(Jimp.AUTO) //save as a buffer
            }
        })
        .catch((err) => {
            console.error(err);
        });
        resolve(adjustedImage)
    })
}

// Apply tesseract OCR
// Making this work with a buffeer was a major pain in the bum. Solution below
function applyOCR(buffImg) {
    const ocrOutput = Tesseract.recognize(buffImg, 'eng').then((result) => {
        console.log(result.data)
        const resultingText = result.data
        return resultingText
    })
    return ocrOutput
}

app.post('/upload', (req, res) => {
    console.log("=======")
    console.log("Image received")
    const imgBrightness = req.body.avgBrightness
    const requestId = req.body.id
    let base64Data = req.body.base64img.split("base64,")[1];

    //let imgExtId = base64Data.charAt(0)
    // First character on b64 string could be used to identify format.
    // / is jpeg, i is png, U is webp, etc.

    // When trying Buffer.from before I had a null MIME error. 
    // The issue was that I needed to remove the headers from the base64
    // image string before converting it to a Buffer.
    const myBuffer = Buffer.from(base64Data, 'base64');

    adjustForOCR(myBuffer, imgBrightness).then((readyImage) => {
        console.log("=======")
        console.log("Adjustment complete")
        applyOCR(readyImage).then((ocrOut) => {
            console.log("=======")
            console.log("OCR complete")
            console.log("=======")
            console.log("=======")
            console.log("=======")
            res.json({
                text: ocrOut.paragraphs,
                id: requestId
            })
        })
    })
})

app.listen(3001)