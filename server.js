// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Formidable } = require('formidable');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('./authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// --- Mongoose/MongoDB Setup ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Database Schemas ---
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, default: '🦜' }
});
const User = mongoose.model('User', UserSchema);

// --- Level Schema (Updated for Picture Round) ---
const LevelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  color: { type: String },
  // Words can now be strings OR objects ({text: "CAT", image: "url"})
  words: [mongoose.Schema.Types.Mixed], 
  nextLevelId: { type: String, default: null }, 
  nextLevelName: { type: String, default: null } 
});
const Level = mongoose.model('Level', LevelSchema);

const ProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  word: { type: String, required: true },
  accuracy: { type: Number, required: true },
  mastered: { type: Boolean, default: false },
  level: { type: String },
  date: { type: Date, default: Date.now }
});
const Progress = mongoose.model('Progress', ProgressSchema);

const leaderboardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  maxCombo: {
    type: Number,
    default: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
});
const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// --- PICTURE LEVEL SEEDING (CAT, DOG, CAR, TREE, FISH) ---
mongoose.connection.once('open', () => {
  console.log('MongoDB connection open, checking for Picture Level...');
  
  const setupPictureLevel = async () => {
    try {
      const pictureLevelId = "PICTURE_ROUND_1";
      const existingLevel = await Level.findOne({ id: pictureLevelId });

      const newWords = [
        { text: "CAT", image: "https://i.ibb.co/N7FwP1p/cat-icon.png" },
        { text: "DOG", image: "https://i.ibb.co/wK40sS1/dog-icon.png" },
        { text: "CAR", image: "https://i.ibb.co/dJtW3s6/car-icon.png" },
        { text: "TREE", image: "https://i.ibb.co/fQ2B01Q/tree-icon.png" },
        { text: "FISH", image: "https://i.ibb.co/yBNP21h/fish-icon.png" }
      ];

      if (existingLevel) {
        console.log('Picture Round level exists. Updating words...');
        existingLevel.words = newWords;
        await existingLevel.save();
        console.log('Picture Round words updated!');
      } else {
        console.log('Creating new Picture Round level...');
        const pictureLevel = new Level({
          id: pictureLevelId,
          name: "🖼️ Picture Round 🖼️",
          description: "Say what you see! (No text!)",
          color: "#3498db", // A new blue color
          words: newWords,
          nextLevelId: null // It's a special level
        });

        await pictureLevel.save();
        console.log('Picture Round level created successfully!');
      }
    } catch (err) {
      console.error('Error setting up picture level:', err);
    }
  };

  setupPictureLevel();
});
// --- END OF NEW SEEDING ---


// --- STREAK CALCULATION HELPER ---
function calculateStreak(progressEntries) {
  if (!progressEntries || progressEntries.length === 0) {
    return 0;
  }
  const practiceDays = new Set(
    progressEntries.map(p => new Date(p.date).toDateString())
  );

  let streak = 0;
  let currentDate = new Date();

  if (practiceDays.has(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  } else {
    currentDate.setDate(currentDate.getDate() - 1);
    if (practiceDays.has(currentDate.toDateString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      return 0;
    }
  }
  while (practiceDays.has(currentDate.toDateString())) {
    streak++;
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return streak;
}

// --- Deepgram API Logic ---
const DEEPGRAM_KEY = process.env.DEEPGRAM_KEY;
if (DEEPGRAM_KEY) {
  console.log("DEEPGRAM_KEY loaded successfully.");
} else {
  console.error("ERROR: DEEPGRAM_KEY is not set in server/.env file");
}

app.post('/api/check-speech', async (req, res) => {
  try {
    const form = new Formidable({ multiples: false });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing audio file' });
      }
      const audioBlob = files.audioBlob ? files.audioBlob[0] : null;
      if (!audioBlob) {
         return res.status(400).json({ error: 'No audio file received' });
      }
      if (!DEEPGRAM_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
      }
      try {
        const deepgramResponse = await axios.post(
          'https://api.deepgram.com/v1/listen?model=general',
          fs.createReadStream(audioBlob.filepath),
          { headers: { 'Authorization': `Token ${DEEPGRAM_KEY}`, 'Content-Type': audioBlob.mimetype } }
        );
        res.json(deepgramResponse.data);
      } catch (deepgramError) {
        console.error('Error from Deepgram API:', deepgramError.message);
        res.status(500).json({ error: 'Deepgram API failed' });
      }
    });
  } catch (error) {
    console.error('Outer server error:', error.message);
    res.status(500).json({ error: 'Error processing speech' });
  }
});

// --- AUTH ENDPOINTS ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }
    user = new User({ name, email, password, avatar: avatar || '🦜' });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const payload = { user: { id: user.id, name: user.name, avatar: user.avatar } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' }, (err, token) => {
      if (err) throw err;
      res.status(201).json({ token, user: payload.user });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const payload = { user: { id: user.id, name: user.name, avatar: user.avatar } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: payload.user });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- LEVEL ENDPOINTS ---
app.get('/api/levels', async (req, res) => {
  try {
    const levels = await Level.find().select('-words');
    res.json(levels);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/level/:id', async (req, res) => {
  try {
    const level = await Level.findOne({ id: req.params.id });
    if (!level) {
      return res.status(404).json({ error: 'Level not found' });
    }
    res.json(level); 
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- PROGRESS ENDPOINTS ---
app.get('/api/progress', authMiddleware, async (req, res) => {
  try {
    const levels = await Level.find();
    const levelInfoMap = new Map();
    for (const level of levels) {
      levelInfoMap.set(level.id, {
        name: level.name,
        color: level.color || '#DDD',
      });
    }
    levelInfoMap.set("PRACTICE_DECK", {
        name: "Personalized Practice",
        color: "#00c896"
    });

    const allProgressEntries = await Progress.find({ user: req.user.id }).sort({ date: -1 });

    const progressEntries = allProgressEntries.filter(p => {
      return p.level !== "1" && p.level !== "TIME_ATTACK"; 
    });

    const streak = calculateStreak(allProgressEntries);

    const progressByTheme = {};

    for (const p of progressEntries) {
      const themeId = p.level; 
      
      if (!progressByTheme[themeId]) {
        const info = levelInfoMap.get(themeId) || { name: themeId, color: '#CCC' };
        progressByTheme[themeId] = {
          themeName: info.name,
          color: info.color,
          mastered: [],
          practiceLater: []
        };
      }
      
      if (p.mastered) {
        if (!progressByTheme[themeId].mastered.includes(p.word)) {
          progressByTheme[themeId].mastered.push(p.word);
        }
      } else {
        if (!progressByTheme[themeId].practiceLater.includes(p.word)) {
          progressByTheme[themeId].practiceLater.push(p.word);
        }
      }
    }

    const themedProgress = Object.values(progressByTheme);
    
    res.json({
      themedProgress: themedProgress,
      streak: streak,
      progress: allProgressEntries
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/progress', authMiddleware, async (req, res) => {
  try {
    const { word, accuracy, mastered, level } = req.body;
    const userId = req.user.id;
    let progress = await Progress.findOne({ user: userId, word: word });

    if (progress) {
      progress.accuracy = accuracy;
      progress.mastered = mastered;
      progress.level = level;
      progress.date = Date.now();
    } else {
      progress = new Progress({
        user: userId, word, accuracy, mastered, level,
        date: new Date().toISOString()
      });
    }
    await progress.save();
    res.json(progress);
  } catch (err)
 {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ENDPOINT FOR THE PRACTICE DECK ---
app.get('/api/progress/practice', authMiddleware, async (req, res) => {
  try {
    const practiceWords = await Progress.find({ 
      user: req.user.id, 
      mastered: false 
    }).select('word -_id'); 
    
    const wordList = practiceWords.map(p => p.word);
    
    res.json(wordList);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- ENDPOINT TO CLEAR PROGRESS ---
app.delete('/api/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await Progress.deleteMany({ user: userId });
    res.json({ message: 'Progress cleared successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- LEADERBOARD ENDPOINTS ---
app.post('/api/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { score, maxCombo } = req.body;
    const userId = req.user.id; 

    const newScore = new Leaderboard({
      user: userId,
      score,
      maxCombo
    });

    await newScore.save();
    res.status(201).json(newScore);

  } catch (err) {
    console.error('Leaderboard save error:', err);
    res.status(500).send('Server error');
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const topScores = await Leaderboard.find()
      .sort({ score: -1 }) 
      .limit(10)            
      .populate('user', 'name avatar'); 

    res.json(topScores);
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Server Listen ---
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Vocalis server listening on http://localhost:${PORT}`);
});
