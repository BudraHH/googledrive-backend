import express from 'express';
import {
    generateUploadUrl,
    saveItemMetadata,
    getItems,
    getRecentItems,
    renameItem,
    trashItem,
    restoreItem,
    toggleStarItem,
    getStarredItems,
    getTrashedItems,
    deleteItemPermanently,
    generateDownloadUrl,
    getItemById,
    batchGenerateUploadUrls,
    batchSaveItemMetadata
} from '../controllers/fileController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Upload
router.post('/generate-upload-url', protect, generateUploadUrl);
router.post('/metadata', protect, saveItemMetadata);

// Batch Upload
router.post('/batch/generate-upload-urls', protect, batchGenerateUploadUrls);
router.post('/batch/metadata', protect, batchSaveItemMetadata);

// Fetch items
router.get('/recent', protect, getRecentItems);
router.get('/starred', protect, getStarredItems);
router.get('/trash', protect, getTrashedItems);
router.get('/', protect, getItems);

// Single item operations (must be after specific routes like /recent, /starred, /trash)
router.get('/:id', protect, getItemById);
router.get('/:id/download', protect, generateDownloadUrl);
router.put('/:id/rename', protect, renameItem);
router.put('/:id/trash', protect, trashItem);
router.put('/:id/restore', protect, restoreItem);
router.put('/:id/star', protect, toggleStarItem);
router.delete('/:id', protect, deleteItemPermanently);

export default router;
