const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  latex: { type: String },
  difficulty: { type: String, enum: ['하', '중', '상'], default: '중' },
  category: { type: String },
  createdAt: { type: Date, default: Date.now },
  tags: [String]
});

module.exports = mongoose.model('Question', QuestionSchema);
