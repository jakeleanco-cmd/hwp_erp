const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const { requireAuth } = require('../middleware/auth');

// 선생님 계정 목록 조회 (관리자 전용)
router.get('/', requireAuth, async (req, res) => {
  try {
    const teachers = await Teacher.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(teachers);
  } catch (error) {
    console.error('Teacher fetch error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 선생님 계정 생성 (관리자 전용)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { teacherId, password, name, subject, permissions } = req.body;

    if (!teacherId || !password || !name) {
      return res.status(400).json({ message: '모든 필수 항목(ID, 비밀번호, 이름)을 입력해주세요.' });
    }

    // 아이디 중복 확인
    const existingTeacher = await Teacher.findOne({ teacherId });
    if (existingTeacher) {
      return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
    }

    // 비밀번호 해싱
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 새 선생님 생성
    const newTeacher = new Teacher({
      teacherId,
      passwordHash,
      name,
      subject: subject || '수학',
      ...(permissions && { permissions })
    });

    await newTeacher.save();
    
    // 응답에서 비밀번호 제외
    const teacherData = newTeacher.toObject();
    delete teacherData.passwordHash;

    res.status(201).json({ message: '선생님 계정이 성공적으로 생성되었습니다.', teacher: teacherData });
  } catch (error) {
    console.error('Teacher create error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 선생님 권한 수정 (관리자 전용)
router.patch('/:id/permissions', requireAuth, async (req, res) => {
  try {
    const { permissions } = req.body;
    const teacher = await Teacher.findById(req.params.id);
    
    if (!teacher) {
      return res.status(404).json({ message: '선생님을 찾을 수 없습니다.' });
    }

    teacher.permissions = { ...teacher.permissions, ...permissions };
    await teacher.save();

    const teacherData = teacher.toObject();
    delete teacherData.passwordHash;

    res.json({ message: '권한이 수정되었습니다.', teacher: teacherData });
  } catch (error) {
    console.error('Teacher permissions update error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 선생님 계정 상태 토글 (활성/비활성)
router.patch('/:id/toggle-status', requireAuth, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: '선생님을 찾을 수 없습니다.' });
    }

    teacher.isActive = !teacher.isActive;
    await teacher.save();

    const teacherData = teacher.toObject();
    delete teacherData.passwordHash;

    res.json({ message: '상태가 변경되었습니다.', teacher: teacherData });
  } catch (error) {
    console.error('Teacher status toggle error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 선생님 정보 수정 (관리자 전용)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { teacherId, password, name, subject } = req.body;
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({ message: '선생님을 찾을 수 없습니다.' });
    }

    // 아이디가 변경되는 경우 중복 확인
    if (teacherId && teacherId !== teacher.teacherId) {
      const existing = await Teacher.findOne({ teacherId });
      if (existing) {
        return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
      }
      teacher.teacherId = teacherId;
    }

    if (name) teacher.name = name;
    if (subject) teacher.subject = subject;

    // 비밀번호가 입력된 경우에만 해싱하여 업데이트
    if (password) {
      const salt = await bcrypt.genSalt(10);
      teacher.passwordHash = await bcrypt.hash(password, salt);
    }

    await teacher.save();

    const teacherData = teacher.toObject();
    delete teacherData.passwordHash;

    res.json({ message: '선생님 정보가 수정되었습니다.', teacher: teacherData });
  } catch (error) {
    console.error('Teacher update error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 선생님 계정 삭제
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ message: '선생님을 찾을 수 없습니다.' });
    }
    res.json({ message: '선생님 계정이 삭제되었습니다.' });
  } catch (error) {
    console.error('Teacher delete error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
