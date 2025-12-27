const express = require('express');
const router = express.Router();
const { HeroSlide, HeroSettings, SellingOption } = require('../models/HeroContent');
const { authenticateToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Middleware to check if user is superadmin
const isSuperAdmin = (req, res, next) => {
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Superadmin privileges required.',
        });
    }
    next();
};

// Configure multer for hero image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/hero');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'hero-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed'));
    },
});

// ============= Hero Slides =============

// Get all hero slides (public)
router.get('/slides', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const query = includeInactive ? {} : { isActive: true };

        let slides = await HeroSlide.find(query).sort({ displayOrder: 1 });

        // If no slides exist, create defaults
        if (slides.length === 0) {
            const defaultSlides = HeroSlide.getDefaultSlides();
            slides = await HeroSlide.insertMany(defaultSlides);
        }

        res.json({
            success: true,
            data: slides,
        });
    } catch (error) {
        console.error('Error fetching hero slides:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hero slides',
            error: error.message,
        });
    }
});

// Get hero slide by tab key (public)
router.get('/slides/:tabKey', async (req, res) => {
    try {
        const slide = await HeroSlide.findOne({ tabKey: req.params.tabKey });

        if (!slide) {
            return res.status(404).json({
                success: false,
                message: 'Hero slide not found',
            });
        }

        res.json({
            success: true,
            data: slide,
        });
    } catch (error) {
        console.error('Error fetching hero slide:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hero slide',
            error: error.message,
        });
    }
});

// Create or update hero slide (superadmin only)
router.post('/slides', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { tabKey, title, description, imageUrl, badge, isActive, displayOrder } = req.body;

        // Upsert - create or update
        const slide = await HeroSlide.findOneAndUpdate(
            { tabKey },
            {
                tabKey,
                title,
                description,
                imageUrl,
                badge,
                isActive,
                displayOrder,
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({
            success: true,
            data: slide,
            message: 'Hero slide saved successfully',
        });
    } catch (error) {
        console.error('Error saving hero slide:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save hero slide',
            error: error.message,
        });
    }
});

// Update hero slide (superadmin only)
router.put('/slides/:tabKey', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const slide = await HeroSlide.findOneAndUpdate(
            { tabKey: req.params.tabKey },
            req.body,
            { new: true, runValidators: true }
        );

        if (!slide) {
            return res.status(404).json({
                success: false,
                message: 'Hero slide not found',
            });
        }

        res.json({
            success: true,
            data: slide,
            message: 'Hero slide updated successfully',
        });
    } catch (error) {
        console.error('Error updating hero slide:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update hero slide',
            error: error.message,
        });
    }
});

// Upload hero image (superadmin only)
router.post('/slides/upload-image', authenticateToken, isSuperAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided',
            });
        }

        // Return the URL to the uploaded file
        const imageUrl = `/uploads/hero/${req.file.filename}`;

        res.json({
            success: true,
            data: {
                imageUrl,
                filename: req.file.filename,
            },
            message: 'Image uploaded successfully',
        });
    } catch (error) {
        console.error('Error uploading hero image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message,
        });
    }
});

// Reset slides to defaults (superadmin only)
router.post('/slides/reset', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        // Delete all existing slides
        await HeroSlide.deleteMany({});

        // Insert default slides
        const defaultSlides = HeroSlide.getDefaultSlides();
        const slides = await HeroSlide.insertMany(defaultSlides);

        res.json({
            success: true,
            data: slides,
            message: 'Hero slides reset to defaults',
        });
    } catch (error) {
        console.error('Error resetting hero slides:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset hero slides',
            error: error.message,
        });
    }
});

// ============= Hero Settings =============

// Get hero settings (public)
router.get('/settings', async (req, res) => {
    try {
        const settings = await HeroSettings.getSettings();

        res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        console.error('Error fetching hero settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hero settings',
            error: error.message,
        });
    }
});

// Update hero settings (superadmin only)
router.put('/settings', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const settings = await HeroSettings.findOneAndUpdate(
            { _id: 'hero_settings' },
            {
                ...req.body,
                lastUpdatedBy: req.user._id,
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({
            success: true,
            data: settings,
            message: 'Hero settings updated successfully',
        });
    } catch (error) {
        console.error('Error updating hero settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update hero settings',
            error: error.message,
        });
    }
});

// ============= Selling Options =============

// Get all selling options (public)
router.get('/selling-options', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const query = includeInactive ? {} : { isActive: true };

        let options = await SellingOption.find(query).sort({ displayOrder: 1 });

        // If no options exist, create defaults
        if (options.length === 0) {
            const defaultOptions = SellingOption.getDefaultOptions();
            options = await SellingOption.insertMany(defaultOptions);
        }

        res.json({
            success: true,
            data: options,
        });
    } catch (error) {
        console.error('Error fetching selling options:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch selling options',
            error: error.message,
        });
    }
});

// Create or update selling option (superadmin only)
router.post('/selling-options', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const { optionId, label, description, icon, action, isActive, displayOrder } = req.body;

        const option = await SellingOption.findOneAndUpdate(
            { optionId },
            {
                optionId,
                label,
                description,
                icon,
                action,
                isActive,
                displayOrder,
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.json({
            success: true,
            data: option,
            message: 'Selling option saved successfully',
        });
    } catch (error) {
        console.error('Error saving selling option:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save selling option',
            error: error.message,
        });
    }
});

// Update selling option (superadmin only)
router.put('/selling-options/:optionId', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const option = await SellingOption.findOneAndUpdate(
            { optionId: req.params.optionId },
            req.body,
            { new: true, runValidators: true }
        );

        if (!option) {
            return res.status(404).json({
                success: false,
                message: 'Selling option not found',
            });
        }

        res.json({
            success: true,
            data: option,
            message: 'Selling option updated successfully',
        });
    } catch (error) {
        console.error('Error updating selling option:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update selling option',
            error: error.message,
        });
    }
});

// Delete selling option (superadmin only)
router.delete('/selling-options/:optionId', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        const option = await SellingOption.findOneAndDelete({ optionId: req.params.optionId });

        if (!option) {
            return res.status(404).json({
                success: false,
                message: 'Selling option not found',
            });
        }

        res.json({
            success: true,
            message: 'Selling option deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting selling option:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete selling option',
            error: error.message,
        });
    }
});

// Reset selling options to defaults (superadmin only)
router.post('/selling-options/reset', authenticateToken, isSuperAdmin, async (req, res) => {
    try {
        await SellingOption.deleteMany({});

        const defaultOptions = SellingOption.getDefaultOptions();
        const options = await SellingOption.insertMany(defaultOptions);

        res.json({
            success: true,
            data: options,
            message: 'Selling options reset to defaults',
        });
    } catch (error) {
        console.error('Error resetting selling options:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset selling options',
            error: error.message,
        });
    }
});

// ============= Combined Hero Content =============

// Get all hero content (slides, settings, selling options) - public
router.get('/', async (req, res) => {
    try {
        const [slides, settings, sellingOptions] = await Promise.all([
            HeroSlide.find({ isActive: true }).sort({ displayOrder: 1 }),
            HeroSettings.getSettings(),
            SellingOption.find({ isActive: true }).sort({ displayOrder: 1 }),
        ]);

        // If no slides exist, return defaults
        let finalSlides = slides;
        if (slides.length === 0) {
            const defaultSlides = HeroSlide.getDefaultSlides();
            finalSlides = await HeroSlide.insertMany(defaultSlides);
        }

        // If no selling options exist, return defaults
        let finalOptions = sellingOptions;
        if (sellingOptions.length === 0) {
            const defaultOptions = SellingOption.getDefaultOptions();
            finalOptions = await SellingOption.insertMany(defaultOptions);
        }

        res.json({
            success: true,
            data: {
                slides: finalSlides,
                settings,
                sellingOptions: finalOptions,
            },
        });
    } catch (error) {
        console.error('Error fetching hero content:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hero content',
            error: error.message,
        });
    }
});

module.exports = router;
