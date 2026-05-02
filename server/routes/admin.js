const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const { requireAuth } = require('../middleware/auth');

// 모든 관리자 목록 조회
router.get('/', requireAuth, async (req, res) => {
  try {
    const admins = await Admin.find().select('-passwordHash').sort({ createdAt: 1 });
    res.json(admins);
  } catch (error) {
    console.error('Admin fetch error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 새 관리자 등록
router.post('/', requireAuth, async (req, res) => {
  try {
    const { adminId, password, name } = req.body;

    if (!adminId || !password || !name) {
      return res.status(400).json({ message: '모든 필수 항목을 입력해주세요.' });
    }

    const existing = await Admin.findOne({ adminId: String(adminId).trim() });
    if (existing) {
      return res.status(400).json({ message: '이미 가입된 아이디입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      adminId: String(adminId).trim(),
      passwordHash,
      name,
    });

    const adminData = admin.toObject();
    delete adminData.passwordHash;

    res.status(201).json({ message: '관리자가 등록되었습니다.', admin: adminData });
  } catch (error) {
    console.error('Admin create error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 정보 수정
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { adminId, password, name } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }

    if (adminId && adminId !== admin.adminId) {
      const existing = await Admin.findOne({ adminId: String(adminId).trim() });
      if (existing) {
        return res.status(400).json({ message: '이미 사용 중인 아이디입니다.' });
      }
      admin.adminId = String(adminId).trim();
    }

    if (name) admin.name = name;

    if (password) {
      admin.passwordHash = await bcrypt.hash(password, 10);
    }

    await admin.save();

    const adminData = admin.toObject();
    delete adminData.passwordHash;

    res.json({ message: '관리자 정보가 수정되었습니다.', admin: adminData });
  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 삭제
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // 마지막 관리자 삭제 방지
    const count = await Admin.countDocuments();
    if (count <= 1) {
      return res.status(400).json({ message: '최소 한 명의 관리자는 존재해야 합니다.' });
    }

    // 본인 삭제 방지 (프론트에서도 막지만 서버에서도 한 번 더 체크)
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ message: '자기 자신은 삭제할 수 없습니다.' });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }

    res.json({ message: '관리자가 삭제되었습니다.' });
  } catch (error) {
    console.error('Admin delete error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 모든 사용자(관리자 + 선생님) 목록 조회 (시험지 작성자 변경용)
router.get('/all-users', requireAuth, async (req, res) => {
  try {
    const admins = await Admin.find().select('name _id').lean();
    const teachers = await Teacher.find().select('name _id').lean();

    const users = [
      ...admins.map(a => ({ id: a._id, name: a.name, role: '관리자' })),
      ...teachers.map(t => ({ id: t._id, name: t.name, role: '선생님' }))
    ];

    res.json(users);
  } catch (error) {
    console.error('All users fetch error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
