const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Feedback text is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Work Environment', 'Leadership', 'Growth', 'Others'],
      message: '{VALUE} is not a valid category'
    }
  },
  reviewed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema); 