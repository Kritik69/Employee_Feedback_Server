const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Feedback = require('./models/Feedback');
const { auth, JWT_SECRET } = require('./middleware/auth');

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  'https://employee-feedback-theta.vercel.app',
  'http://localhost:3000'
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  }
});

// Admin credentials (in production, this should be in a database)
const ADMIN_EMAIL = 'kritikjambusariya@gmail.com';
const ADMIN_PASSWORD = '12345678'; // hashed "12345678"

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://kritikjambusariya:BL01utiEaK0ff8Qh@employee.wa4jscz.mongodb.net/employee-feedback')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    // Log more details about the error
    if (err.name === 'MongoServerError') {
      console.error('MongoDB Server Error Details:', {
        code: err.code,
        codeName: err.codeName,
        message: err.message
      });
    }
  });

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit feedback (public route)
app.post('/api/feedback', async (req, res) => {
  try {
    console.log('Received feedback request:', req.body);
    const feedback = new Feedback(req.body);
    console.log('Created feedback object:', feedback);
    await feedback.save();
    console.log('Feedback saved successfully');
    io.emit('newFeedback', feedback);
    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error in feedback submission:', error);
    res.status(400).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Protected Admin Routes
app.get('/api/feedback', auth, async (req, res) => {
  try {
    console.log('Received feedback list request');
    const { category } = req.query;
    const query = category ? { category } : {};
    console.log('Query:', query);
    const feedback = await Feedback.find(query).sort({ createdAt: -1 });
    console.log(`Found ${feedback.length} feedback items`);
    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

app.patch('/api/feedback/:id/reviewed', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      { reviewed: req.body.reviewed },
      { new: true }
    );
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    io.emit('feedbackUpdated', feedback);
    res.json(feedback);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/feedback/:id', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    io.emit('feedbackDeleted', req.params.id);
    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 