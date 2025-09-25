const fs = require("fs");
const path = require("path");

// Function to save an image to the public/images directory
function saveImage(imageBuffer, filename) {
  const imagesDir = path.join(__dirname, "public", "images");

  // Ensure the images directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const filePath = path.join(imagesDir, filename);

  // Write the image buffer to the file
  fs.writeFileSync(filePath, imageBuffer);

  console.log(`Image saved to: ${filePath}`);
  return filePath;
}

// Example usage (replace with actual image data)
// const imageBuffer = Buffer.from('your-image-data-here', 'base64');
// saveImage(imageBuffer, 'example.png');

module.exports = { saveImage };
