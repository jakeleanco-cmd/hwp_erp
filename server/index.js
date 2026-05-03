const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// 환경 변수 로드 (.env 파일이 루트 디렉토리에 있으므로 경로 지정)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const googleDriveRoutes = require('./routes/googleDriveRoutes');
const authRoutes = require('./routes/auth.js');
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');
const examRoutes = require('./routes/exam');
const questionRoutes = require('./routes/question');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hwp_math_erp';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1); // 연결 실패 시 서버 종료
  });

// API 라우트 등록
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/google-drive', googleDriveRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/export', exportRoutes);

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

module.exports = app;


