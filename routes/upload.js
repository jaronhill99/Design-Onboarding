const express = require('express');
const multer = require('multer');
const { uploadFile } = require('../hubspot');

const router = express.Router();

const ALLOWED_EXTENSIONS = [
  // Design files
  '.ai', '.eps', '.svg', '.pdf', '.png',
  // Font files
  '.ttf', '.otf', '.woff', '.woff2',
];
const ALLOWED_MIMETYPES = [
  // Design files
  'application/pdf',
  'image/svg+xml',
  'image/png',
  'application/postscript',       // .ai and .eps
  'application/illustrator',      // .ai (some systems)
  'application/octet-stream',     // .ai / .eps fallback
  // Font files
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',        // legacy WOFF mimetype
  'application/font-woff2',       // legacy WOFF2 mimetype
  'application/x-font-ttf',       // legacy TTF mimetype
  'application/x-font-opentype',  // legacy OTF mimetype
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10,
  },
  fileFilter(_req, file, cb) {
    const ext = file.originalname
      .slice(file.originalname.lastIndexOf('.'))
      .toLowerCase();

    if (
      ALLOWED_EXTENSIONS.includes(ext) ||
      ALLOWED_MIMETYPES.includes(file.mimetype)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        )
      );
    }
  },
});

// POST /upload
// Accepts up to 10 design files, uploads each to HubSpot File Manager.
// Returns: { files: [{ name, url }] }
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided.' });
    }

    const results = await Promise.all(
      req.files.map(async (file) => {
        const url = await uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        return { name: file.originalname, url };
      })
    );

    res.json({ files: results });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Multer error handler (file size / type rejections)
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(400).json({ error: err.message });
});

module.exports = router;
