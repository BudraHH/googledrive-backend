import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/s3Config.js";
import { Item } from "../models/Item.js";
import asyncHandler from 'express-async-handler';
import { DATA_TYPES, MUTATION_TYPES } from "../constants/appConstants.js";

export const generateUploadUrl = async (req, res) => {
    try {
        const { fileName, fileType } = req.body;

        if (!fileName || !fileType) {
            return res.status(400).json({ error: 'File name and type are required' });
        }

        // Create a unique key for the file in S3 using timestamp and original name
        const sanitizedFileName = fileName.replace(/\s+/g, '_');
        const fileKey = `uploads/${Date.now()}-${sanitizedFileName}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
        });

        // Generate URL valid for 1 hour
        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        res.json({ uploadURL, fileKey });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
};

const FORBIDDEN_CHARS = /[?*:|<>\\\/]/;

export const saveItemMetadata = asyncHandler(async (req, res) => {
    const { name, type, fileKey, fileType, size, parentFolderId } = req.body;

    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Name is required');
    }

    if (FORBIDDEN_CHARS.test(name)) {
        res.status(400);
        throw new Error('Name cannot contain these characters: ? * : | < > \\ /');
    }

    if (name.trim().length > 255) {
        res.status(400);
        throw new Error('Name is too long (max 255 characters)');
    }

    if (!type || !['file', 'folder'].includes(type)) {
        res.status(400);
        throw new Error('Type must be either "file" or "folder"');
    }

    if (type === 'file' && !fileKey) {
        res.status(400);
        throw new Error('File key is required for files');
    }

    const newItem = new Item({
        name: name.trim(),
        type,
        fileKey: type === 'file' ? fileKey : undefined,
        fileType,
        size,
        parentFolderId: parentFolderId || null,
        owner: req.user._id
    });

    await newItem.save();
    res.status(201).json({ message: "Metadata saved successfully", item: newItem });
});

const getDataType = (type, fileType, isShared) => {
    if (type === 'folder') {
        return isShared ? DATA_TYPES.SHARED_FOLDER : DATA_TYPES.FOLDER;
    }

    if (!fileType) return DATA_TYPES.OTHER;

    if (fileType.startsWith('image/')) return DATA_TYPES.IMAGE;
    if (fileType.startsWith('video/')) return DATA_TYPES.VIDEO;
    if (fileType.startsWith('audio/')) return DATA_TYPES.AUDIO;
    if (fileType.includes('pdf')) return DATA_TYPES.PDF;
    if (fileType.includes('sheet') || fileType.includes('csv') || fileType.includes('excel')) return DATA_TYPES.SPREADSHEET;
    if (fileType.includes('document') || fileType.includes('word')) return DATA_TYPES.DOCUMENT;
    if (fileType.includes('zip') || fileType.includes('compressed')) return DATA_TYPES.ARCHIVE;

    return DATA_TYPES.OTHER;
};

const mapItemToDto = (item, userId) => {
    if (!item) return null;

    const itemOwnerStr = item.owner ? item.owner.toString() : '';
    const userIdStr = userId ? userId.toString() : '';
    const isOwner = itemOwnerStr && userIdStr && itemOwnerStr === userIdStr;

    return {
        id: item._id,
        _id: item._id,
        name: item.name,
        type: getDataType(item.type, item.fileType, !isOwner),
        owner: isOwner ? "me" : "Shared",
        modifiedDate: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : "--",
        modifiedTime: "Today",
        size: item.size ? `${(item.size / 1024).toFixed(0)} KB` : "--",
        isUser: isOwner,
        source: !isOwner ? "Shared with me" : (item.parentFolderId ? "Folder" : "My Drive"),
        deletedDate: item.deletedAt || null,
        mutation_type: item.isTrashed ? MUTATION_TYPES.TRASHED : (item.isStarred ? MUTATION_TYPES.STARRED : MUTATION_TYPES.NOTHING),
        parent_id: item.parentFolderId || null,
        updatedAt: item.updatedAt,
        fileType: item.fileType
    };
};

export const getItems = asyncHandler(async (req, res) => {
    try {
        const parentFolderId = req.query.parentFolderId === 'null' ? null : (req.query.parentFolderId || null);
        const isTrashed = req.query.trash === 'true';

        const query = {
            parentFolderId,
            owner: req.user._id,
        };

        // If explicitly asking for trash, set isTrashed=true to override middleware default (which excludes trash)
        // If not checking trash, the middleware will default to isTrashed: false
        if (isTrashed) {
            query.isTrashed = true;
        }

        const items = await Item.find(query).sort({ type: 1, name: 1 }); // Folders first, then files

        const mappedItems = items.map(item => mapItemToDto(item, req.user._id));
        res.json(mappedItems);
    } catch (error) {
        console.error("Error in getItems:", error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});

export const getRecentItems = asyncHandler(async (req, res) => {
    try {
        // Fetch top 20 most recently updated files (excluding folders if desired, or including)
        const items = await Item.find({
            owner: req.user._id,
            type: { $ne: 'folder' } // Typically Google Drive recent shows files
            // isTrashed is handled by middleware
        })
            .sort({ updatedAt: -1 })
            .limit(20);

        const mappedItems = items.map(item => mapItemToDto(item, req.user._id));
        res.json(mappedItems);
    } catch (error) {
        console.error("Error in getRecentItems:", error);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});

export const renameItem = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
        res.status(400);
        throw new Error('Name is required');
    }

    const item = await Item.findOne({ _id: id, owner: req.user._id });

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    item.name = name.trim();
    await item.save();

    res.json({ message: 'Item renamed successfully', item: mapItemToDto(item, req.user._id) });
});

export const trashItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const item = await Item.findOne({ _id: id, owner: req.user._id });

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    item.isTrashed = true;
    item.deletedAt = new Date();
    await item.save();

    // If it's a folder, also trash all children recursively
    if (item.type === 'folder') {
        await trashFolderChildren(item._id, req.user._id);
    }

    res.json({ message: 'Item moved to bin successfully' });
});

// Helper to recursively trash folder contents
const trashFolderChildren = async (folderId, userId) => {
    const children = await Item.find({ parentFolderId: folderId, owner: userId });
    for (const child of children) {
        child.isTrashed = true;
        child.deletedAt = new Date();
        await child.save();
        if (child.type === 'folder') {
            await trashFolderChildren(child._id, userId);
        }
    }
};

export const restoreItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const item = await Item.findOne({ _id: id, owner: req.user._id, isTrashed: true });

    if (!item) {
        res.status(404);
        throw new Error('Item not found in bin');
    }

    // Check if parent folder is also trashed. If so, move reduced item to Root (My Drive).
    let movedToRoot = false;
    if (item.parentFolderId) {
        const parent = await Item.findById(item.parentFolderId);
        if (parent && parent.isTrashed) {
            item.parentFolderId = null;
            movedToRoot = true;
        }
    }

    item.isTrashed = false;
    item.deletedAt = null;
    await item.save();

    // If it's a folder, also restore all children recursively
    if (item.type === 'folder') {
        await restoreFolderChildren(item._id, req.user._id);
    }

    const message = movedToRoot
        ? 'Item restored to My Drive (parent folder was in trash)'
        : 'Item restored successfully';

    res.json({ message, item: mapItemToDto(item, req.user._id) });
});

// Helper to recursively restore folder contents
const restoreFolderChildren = async (folderId, userId) => {
    const children = await Item.find({ parentFolderId: folderId, owner: userId, isTrashed: true });
    for (const child of children) {
        child.isTrashed = false;
        child.deletedAt = null;
        await child.save();
        if (child.type === 'folder') {
            await restoreFolderChildren(child._id, userId);
        }
    }
};

export const toggleStarItem = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const item = await Item.findOne({ _id: id, owner: req.user._id });

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    item.isStarred = !item.isStarred;
    await item.save();

    res.json({
        message: item.isStarred ? 'Item starred' : 'Item unstarred',
        isStarred: item.isStarred,
        item: mapItemToDto(item, req.user._id)
    });
});

export const getStarredItems = asyncHandler(async (req, res) => {
    const items = await Item.find({
        owner: req.user._id,
        isStarred: true,
        // isTrashed is handled by middleware
    }).sort({ updatedAt: -1 });

    const mappedItems = items.map(item => mapItemToDto(item, req.user._id));
    res.json(mappedItems);
});

export const getTrashedItems = asyncHandler(async (req, res) => {
    // 1. Fetch all trashed items
    const items = await Item.find({
        owner: req.user._id,
        isTrashed: true // Middleware won't override
    }).sort({ deletedAt: -1 });

    // 2. Create a Set of all trashed Item IDs for O(1) lookup
    const trashedItemIds = new Set(items.map(item => item._id.toString()));

    // 3. Filter: Only keep items whose parent is NOT in the trash list.
    //    If an item's parent is also trashed, it means this item is implicitly trashed 
    //    as part of the parent folder, so we should hide it from the top-level trash view.
    const rootTrashedItems = items.filter(item => {
        if (!item.parentFolderId) return true; // No parent, so it's a root item
        return !trashedItemIds.has(item.parentFolderId.toString());
    });

    const mappedItems = rootTrashedItems.map(item => mapItemToDto(item, req.user._id));
    res.json(mappedItems);
});

export const deleteItemPermanently = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Must explicitly look for trashed item, otherwise middleware filters it out
    const item = await Item.findOne({
        _id: id,
        owner: req.user._id,
        isTrashed: true
    });

    if (!item) {
        res.status(404);
        throw new Error('Item not found in bin');
    }

    // If it's a file, delete from S3
    if (item.type === 'file' && item.fileKey) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: item.fileKey,
            });
            await s3Client.send(command);
        } catch (s3Error) {
            console.error('Error deleting from S3:', s3Error);
        }
    }

    // If it's a folder, recursively delete all children
    if (item.type === 'folder') {
        await deleteFolderChildrenPermanently(item._id, req.user._id);
    }

    await Item.deleteOne({ _id: id });

    res.json({ message: 'Item permanently deleted' });
});

// Helper to recursively delete folder contents permanently
const deleteFolderChildrenPermanently = async (folderId, userId) => {
    // Explicitly find trashed items (or all items if things got out of sync, but we assume strict trash)
    const children = await Item.find({
        parentFolderId: folderId,
        owner: userId,
        isTrashed: true
    });
    for (const child of children) {
        if (child.type === 'file' && child.fileKey) {
            try {
                const command = new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: child.fileKey,
                });
                await s3Client.send(command);
            } catch (s3Error) {
                console.error('Error deleting from S3:', s3Error);
            }
        }
        if (child.type === 'folder') {
            await deleteFolderChildrenPermanently(child._id, userId);
        }
        await Item.deleteOne({ _id: child._id });
    }
};

export const generateDownloadUrl = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const item = await Item.findOne({ _id: id, owner: req.user._id });

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    if (item.type === 'folder') {
        res.status(400);
        throw new Error('Cannot download a folder directly');
    }

    if (!item.fileKey) {
        res.status(400);
        throw new Error('File key not found');
    }

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: item.fileKey,
        ResponseContentDisposition: `attachment; filename="${item.name}"`,
    });

    const downloadURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({ downloadURL, fileName: item.name });
});

export const getItemById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const item = await Item.findOne({ _id: id, owner: req.user._id });

    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    res.json(mapItemToDto(item, req.user._id));
});

// --- Batch Operations ---

export const batchGenerateUploadUrls = async (req, res) => {
    try {
        const { files } = req.body; // Array of { name, type }

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ error: 'Files array is required' });
        }

        const results = await Promise.all(files.map(async (file) => {
            const sanitizedFileName = file.name.replace(/\s+/g, '_');
            const fileKey = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedFileName}`;

            const command = new PutObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileKey,
                ContentType: file.type,
            });

            const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            return {
                tempId: file.tempId || null, // client tracking
                name: file.name,
                uploadURL,
                fileKey
            };
        }));

        res.json(results);
    } catch (error) {
        console.error('Error generating batch upload URLs:', error);
        res.status(500).json({ error: 'Failed to generate upload URLs' });
    }
};

export const batchSaveItemMetadata = asyncHandler(async (req, res) => {
    const { items } = req.body; // Array of items to create

    if (!items || !Array.isArray(items)) {
        res.status(400);
        throw new Error('Items array is required');
    }

    if (items.length > 100) {
        res.status(400);
        throw new Error('Batch size too large (max 100)');
    }

    const docs = items.map(item => ({
        name: item.name.trim(),
        type: item.type,
        fileKey: item.fileKey,
        fileType: item.fileType,
        size: item.size,
        parentFolderId: item.parentFolderId || null,
        owner: req.user._id
    }));

    const result = await Item.insertMany(docs);
    res.status(201).json({ message: "Batch metadata saved", count: result.length, items: result });
});
