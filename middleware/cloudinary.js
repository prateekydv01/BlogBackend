const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store file in memory, then stream to Cloudinary ourselves
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

/**
 * After multer stores the file in req.file.buffer,
 * stream it to Cloudinary and attach the result back
 * onto req.file so the route handler can read it normally.
 */
const uploadToCloudinary = (req, res, next) => {
  if (!req.file) return next();

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'blog-platform',
      transformation: [{ width: 1200, height: 630, crop: 'limit', quality: 'auto' }],
    },
    (error, result) => {
      if (error) return next(error);
      req.file.path = result.secure_url;      // URL to store in DB
      req.file.filename = result.public_id;   // public_id for deletion later
      next();
    }
  );

  const readable = new Readable();
  readable.push(req.file.buffer);
  readable.push(null);
  readable.pipe(stream);
};

module.exports = { cloudinary, upload, uploadToCloudinary };
