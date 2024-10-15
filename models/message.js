const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  message: {
    type: String,
    required: true
  },
  duration: { 
    type: Number,
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  }
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
