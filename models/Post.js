const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  excerpt: { type: String, default: '' },
  coverImage: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' }
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String, trim: true, lowercase: true }],
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'draft' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views: { type: Number, default: 0 },
  slug: { type: String, unique: true },
}, { timestamps: true });

postSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      + '-' + Date.now();
  }
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...';
  }
  next();
});

postSchema.virtual('likesCount').get(function () {
  return this.likes.length;
});

postSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
