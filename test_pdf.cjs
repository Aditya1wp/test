const fs = require('fs');
const pdfModule = require('pdf-parse');
const pdf = pdfModule.default || pdfModule;

const filePath = 'PINNACLE REASONING BOOK FREE.pdf';

if (!fs.existsSync(filePath)) {
  console.error("File not found:", filePath);
  process.exit(1);
}

const dataBuffer = fs.readFileSync(filePath);

pdf(dataBuffer).then(function(data) {
    console.log("--- PDF INFO ---");
    console.log("Pages:", data.numpages);
    console.log("--- SNIPPET ---");
    // Show the first 2500 characters to see how questions are formatted
    console.log(data.text.substring(0, 2500));
}).catch(function(err) {
    console.error("Error reading PDF:", err);
});
