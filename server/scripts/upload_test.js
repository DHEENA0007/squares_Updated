const cloudinary = require('cloudinary').v2;
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log('Loading environment from:', envPath);
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('API Key:', process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'Not Set');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Path to the image to upload
// Going up from server/scripts to root, then into src/assets
const imagePath = path.join(__dirname, '../../src/assets/logo.png');

console.log('Attempting to upload image from:', imagePath);

if (!fs.existsSync(imagePath)) {
    console.error('Error: Image file not found at', imagePath);
    process.exit(1);
}

// Upload the image
cloudinary.uploader.upload(imagePath, {
    folder: 'test_uploads',
    public_id: 'test_logo_' + Date.now(),
}, (error, result) => {
    if (error) {
        console.error('Upload failed:', error);
    } else {
        console.log('Upload successful!');
        console.log('Public ID:', result.public_id);
        console.log('URL:', result.secure_url);
        console.log('Format:', result.format);
        console.log('Size:', result.bytes, 'bytes');
    }
});
