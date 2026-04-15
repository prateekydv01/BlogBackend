const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

require('dotenv').config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // ✅ MUST MATCH GOOGLE CONSOLE
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        if (!user) {
          // 🔥 generate unique username
          let baseUsername = email.split('@')[0];
          let username = baseUsername;
          let count = 0;

          // ensure uniqueness
          while (await User.findOne({ username })) {
            count++;
            username = `${baseUsername}${count}`;
          }

          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            avatar: profile.photos[0]?.value,
            username, // ✅ FIXED
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// serialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// deserialize
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});