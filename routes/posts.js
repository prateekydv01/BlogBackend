const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { protect, optionalAuth } = require('../middleware/auth');
const { cloudinary, upload, uploadToCloudinary } = require('../middleware/cloudinary');

// Upload image
router.post('/upload', protect, upload.single('image'), uploadToCloudinary, (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: req.file.path, publicId: req.file.filename });
});

// Get all postxss (with filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, tag, search, author } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'active'; // Public only sees active
    }

    // Admins/authors can see all statuses
    if (req.user) {
      if (status) query.status = status;
      else delete query.status;

      // If not admin, only show own inactive/draft
      if (status && status !== 'active') {
        query.author = req.user._id;
      }
    }

    if (tag) query.tags = { $in: [tag.toLowerCase()] };
    if (author) query.author = author;
    if (search) query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } }
    ];

    const posts = await Post.find(query)
      .populate('author', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.json({ posts, total, pages: Math.ceil(total / limit), page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my posts (all statuses)
router.get('/my', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { author: req.user._id };
    if (status) query.status = status;

    const posts = await Post.find(query)
      .populate('author', 'name avatar email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);
    const counts = {
      all: await Post.countDocuments({ author: req.user._id }),
      active: await Post.countDocuments({ author: req.user._id, status: 'active' }),
      inactive: await Post.countDocuments({ author: req.user._id, status: 'inactive' }),
      draft: await Post.countDocuments({ author: req.user._id, status: 'draft' }),
    };

    res.json({ posts, total, pages: Math.ceil(total / limit), page: parseInt(page), counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name avatar email bio');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Increment views
    post.views += 1;
    await post.save();

    const isLiked = req.user ? post.likes.includes(req.user._id) : false;
    res.json({ ...post.toJSON(), isLiked });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create post
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, tags, status, coverImage, excerpt } = req.body;
    const post = await Post.create({
      title, content, tags: tags || [], status: status || 'draft',
      coverImage: coverImage || {}, excerpt, author: req.user._id
    });
    await post.populate('author', 'name avatar email');
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update post
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, content, tags, status, coverImage, excerpt } = req.body;
    Object.assign(post, { title, content, tags, status, excerpt });
    if (coverImage) post.coverImage = coverImage;

    await post.save();
    await post.populate('author', 'name avatar email');
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete post
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (post.coverImage?.publicId) {
      await cloudinary.uploader.destroy(post.coverImage.publicId);
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const idx = post.likes.indexOf(req.user._id);
    if (idx > -1) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();
    res.json({ likes: post.likes.length, isLiked: idx === -1 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
