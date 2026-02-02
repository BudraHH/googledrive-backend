import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Original filename or folder name
    type: { type: String, enum: ['file', 'folder'], required: true },

    // AWS S3 specific metadata
    fileKey: { type: String, required: function () { return this.type === 'file'; } },
    fileType: { type: String }, // e.g., 'image/png', 'application/pdf'
    size: { type: Number }, // Size in bytes

    // Hierarchy & Ownership
    parentFolderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        default: null // null means it's in the root "My Drive"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Ensures only the creator can access it
    },

    isStarred: { type: Boolean, default: false },
    isTrashed: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }, // Date when it was moved to trash
}, { timestamps: true }); // Automatically creates 'createdAt' and 'updatedAt'

// Indexing for faster dashboard loading
itemSchema.index({ parentFolderId: 1, owner: 1 });

// Note: We intentionally do NOT enforce unique names within folders.
// Google Drive allows multiple items with the same name (identified by unique ID).
// This matches professional cloud storage behavior.
itemSchema.index({ owner: 1, parentFolderId: 1, name: 1 }); // Non-unique index for query optimization

// Middleware: Automatically exclude trashed items unless specified
itemSchema.pre(/^find/, async function () {
    if (this.getQuery().isTrashed === undefined) {
        this.where({ isTrashed: false });
    }
});

export const Item = mongoose.model('Item', itemSchema);
