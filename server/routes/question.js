const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const { requireAuth } = require('../middleware/auth');

// GET /api/questions
router.get('/', requireAuth, async (req, res) => {
  try {
    const { tag, search, grade, difficulty } = req.query;
    let query = {};
    
    if (tag) {
      query.tags = tag;
    }

    if (grade && grade !== '전체') {
      query.grade = grade;
    }

    if (difficulty && difficulty !== '전체') {
      query.difficulty = difficulty;
    }

    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const keyword = trimmedSearch.replace(/\s+/g, '');
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flexibleKeyword = escapedKeyword.split('').join('\\s*');
      const searchRegex = { $regex: flexibleKeyword, $options: 'i' };
      
      query.$or = [
        { content: searchRegex },
        { explanation: searchRegex },
        { answer: searchRegex },
        { tags: searchRegex }
      ];
    }

    const questions = await Question.find(query).sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/questions
router.post('/', requireAuth, async (req, res) => {
  try {
    const questionData = req.body;
    if (req.user) {
      questionData.createdBy = req.user.sub;
      questionData.authorName = req.user.name;
      questionData.authorRole = req.user.role === 'admin' ? 'Admin' : 'Teacher';
    }
    const newQuestion = new Question(questionData);
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/questions/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { content, explanation, answer, difficulty, grade } = req.body;
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // 이 문항을 사용하는 모든 시험지 업데이트
    await Exam.updateMany(
      { "questions.questionRefId": req.params.id },
      { 
        $set: { 
          "questions.$[elem].content": content,
          "questions.$[elem].explanation": explanation,
          "questions.$[elem].answer": answer,
          "questions.$[elem].difficulty": difficulty,
          "questions.$[elem].grade": grade
        } 
      },
      { arrayFilters: [{ "elem.questionRefId": req.params.id }] }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/questions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/questions/tags/rename
router.patch('/tags/rename', requireAuth, async (req, res) => {
  try {
    const { oldTag, newTag } = req.body;
    if (!oldTag || !newTag) {
      return res.status(400).json({ message: '기존 태그와 새 태그 명칭을 모두 입력하세요.' });
    }

    const result = await Question.updateMany(
      { tags: oldTag },
      { $set: { "tags.$": newTag } }
    );

    res.json({ 
      success: true, 
      message: `${result.modifiedCount}개의 문항에서 태그가 변경되었습니다.`,
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
