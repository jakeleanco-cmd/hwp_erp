const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Question = require('./models/Question');
const Exam = require('./models/Exam');
const googleDriveRoutes = require('./routes/googleDriveRoutes');
const authRoutes = require('./routes/auth.js');
const { requireAuth } = require('./middleware/auth');
const { deleteFile } = require('./config/googleDriveConfig');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hwp_math_erp';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes - Auth
app.use('/api/auth', authRoutes);

// Routes - Teacher Management
const teacherRoutes = require('./routes/teacher');
app.use('/api/teachers', teacherRoutes);

// Routes - Google Drive Auth
app.use('/api/google-drive', googleDriveRoutes);

// Routes - Questions
app.get('/api/questions', requireAuth, async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/questions/batch', requireAuth, async (req, res) => {
  try {
    const { questions } = req.body;
    const result = await Question.insertMany(questions);
    res.status(201).json({ success: true, count: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes - Exams
app.get('/api/exams', requireAuth, async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/exams/:id', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exams', requireAuth, async (req, res) => {
  try {
    const newExam = new Exam(req.body);
    await newExam.save();
    res.status(201).json(newExam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/exams/:id', requireAuth, async (req, res) => {
  try {
    const updatedExam = await Exam.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(updatedExam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exams/:id', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (exam) {
      // 모든 문항의 내용과 해설에서 구글 드라이브 이미지 ID 추출
      const fileIds = new Set();
      const driveIdRegex = /id=([a-zA-Z0-9_-]{25,})/g;

      exam.questions.forEach(q => {
        // 문제 본문과 해설 합치기
        const text = (q.content || '') + (q.explanation || '');
        let match;
        // regex.exec를 사용하여 모든 매칭되는 ID 수집
        while ((match = driveIdRegex.exec(text)) !== null) {
          fileIds.add(match[1]);
        }
      });

      // 구글 드라이브 파일 삭제 수행 (비동기 병렬 처리)
      if (fileIds.size > 0) {
        console.log(`[Cleanup] 시험지(${req.params.id}) 삭제 시작: 이미지 ${fileIds.size}개 삭제 시도`);
        // 개별 삭제 오류가 전체 삭제를 막지 않도록 처리
        await Promise.all(Array.from(fileIds).map(id => deleteFile(id)));
      }
    }

    await Exam.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '시험지 및 관련 이미지가 삭제되었습니다.' });
  } catch (err) {
    console.error('시험지 삭제 중 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

console.log('Starting server...');
console.log(`Target PORT: ${PORT}`);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
