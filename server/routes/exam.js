const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const { requireAuth } = require('../middleware/auth');
const { deleteFile } = require('../config/googleDriveConfig');

// 시험지 저장 시 개별 문항 동기화 함수
async function syncQuestionsFromExam(exam) {
  const { _id, examName, questions, createdBy, authorName } = exam;
  let updatedQuestions = [...questions];
  let changed = false;

  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = updatedQuestions[i];
    // 기존에 해당 시험지에서 온 동일한 내용의 문항이 있는지 확인 (또는 이미 연결된 ID가 있는지)
    let filter = { sourceExamId: _id, content: q.content };
    if (q.questionRefId) {
      filter = { _id: q.questionRefId };
    }

    const update = {
      content: q.content,
      explanation: q.explanation,
      answer: q.answer,
      difficulty: q.difficulty || '중',
      grade: q.grade,
      createdBy,
      authorName,
      sourceExamId: _id,
      $addToSet: { tags: examName }
    };
    
    const savedQ = await Question.findOneAndUpdate(filter, update, { upsert: true, new: true });
    
    // 시험지 문항 객체에 레퍼런스 ID 저장
    if (!q.questionRefId || q.questionRefId.toString() !== savedQ._id.toString()) {
      updatedQuestions[i].questionRefId = savedQ._id;
      changed = true;
    }
  }

  // 변경사항이 있으면 시험지 문서 업데이트
  if (changed) {
    await Exam.updateOne({ _id: exam._id }, { $set: { questions: updatedQuestions } });
  }
}

// GET /api/exams
router.get('/', requireAuth, async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role === 'teacher') {
      filter = { createdBy: req.user.sub };
    }
    const exams = await Exam.find(filter).sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exams/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/exams
router.post('/', requireAuth, async (req, res) => {
  try {
    const examData = req.body;
    if (req.user) {
      examData.createdBy = req.user.sub;
      examData.authorName = req.user.name;
    }
    const newExam = new Exam(examData);
    await newExam.save();
    
    // 개별 문항 동기화
    await syncQuestionsFromExam(newExam);
    
    res.status(201).json(newExam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/exams/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    if (req.user && req.user.role === 'teacher') {
      if (exam.createdBy && exam.createdBy.toString() !== req.user.sub) {
        return res.status(403).json({ error: '수정 권한이 없습니다.' });
      }
    }

    const updatedExam = await Exam.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    
    // 개별 문항 동기화
    await syncQuestionsFromExam(updatedExam);
    
    res.json(updatedExam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/exams/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    if (req.user && req.user.role === 'teacher') {
      if (exam.createdBy && exam.createdBy.toString() !== req.user.sub) {
        return res.status(403).json({ error: '삭제 권한이 없습니다.' });
      }
    }

    // 모든 문항의 내용과 해설에서 구글 드라이브 이미지 ID 추출
    const fileIds = new Set();
    const driveIdRegex = /id=([a-zA-Z0-9_-]{25,})/g;

    exam.questions.forEach(q => {
      const text = (q.content || '') + (q.explanation || '');
      let match;
      while ((match = driveIdRegex.exec(text)) !== null) {
        fileIds.add(match[1]);
      }
    });

    // 구글 드라이브 파일 삭제
    if (fileIds.size > 0) {
      await Promise.all(Array.from(fileIds).map(id => deleteFile(id)));
    }

    await Exam.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '시험지 및 관련 이미지가 삭제되었습니다.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
