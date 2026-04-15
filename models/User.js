const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
    },

    googleId: {
      type: String,
    },

    avatar: {
      type: String,
    },

    // 🔥 FIXED FIELD
    username: {
      type: String,
      unique: true,
      sparse: true, // ✅ allows multiple nulls
    },

    bio: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// 🔐 hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔑 compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);