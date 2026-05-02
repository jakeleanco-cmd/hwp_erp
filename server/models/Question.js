const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  content: { type: String, required: true },
  explanation: { type: String },
  answer: { type: String },
  tags: [String],
  difficulty: { type: String, enum: ['하', '중', '상'], default: '중' },
  grade: { type: String },
  category: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'authorRole', required: false },
  authorRole: { type: String, enum: ['Admin', 'Teacher'], default: 'Teacher' },
  authorName: { type: String, required: false },
  sourceExamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 업데이트 시 updatedAt 자동 갱신
QuestionSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Question', QuestionSchema);
