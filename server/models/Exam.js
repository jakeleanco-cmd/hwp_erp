const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  examName: { type: String, required: true },
  questionCount: { type: Number, required: true },
  questions: [
    {
      id: Number,
      content: String,
      explanation: String,
      answer: String
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 업데이트 시 updatedAt 자동 갱신
ExamSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Exam', ExamSchema);
