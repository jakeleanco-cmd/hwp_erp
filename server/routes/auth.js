const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * JWT 서명 함수
 */
function signToken(adminId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim() === '') {
    const e = new Error('JWT_SECRET_NOT_SET');
    e.code = 'JWT_SECRET_NOT_SET';
    throw e;
  }
  return jwt.sign({ sub: adminId }, secret, { expiresIn: '7d' });
}

/**
 * 에러 핸들러 헬퍼
 */
function handleAuthError(res, err, fallbackMessage) {
  console.error(err);
  if (err && err.code === 'JWT_SECRET_NOT_SET') {
    return res.status(500).json({
      message: '서버 설정 오류: JWT_SECRET 환경 변수가 설정되지 않았습니다.',
    });
  }
  return res.status(500).json({ message: fallbackMessage });
}

/** 최초 관리자 등록 화면 표시 여부 판단용 */
router.get('/has-admin', async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    return res.json({ hasAdmin: count > 0 });
  } catch (err) {
    return res.status(500).json({ message: '확인에 실패했습니다.' });
  }
});

/** 관리자 가입 (최초 등록 - 가입 코드 필요) */
router.post('/register-first', async (req, res) => {
  try {
    const { email, password, name, registrationCode } = req.body;

    const secretCode = process.env.ADMIN_REGISTRATION_CODE;
    if (!secretCode || registrationCode !== secretCode) {
      return res.status(403).json({ message: '가입 코드가 올바르지 않거나 서버 설정이 미비합니다.' });
    }

    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호는 필수입니다.' });
    }

    const existing = await Admin.findOne({ email: String(email).trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: '이미 가입된 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      email: String(email).trim().toLowerCase(),
      passwordHash,
      name: name || '관리자',
    });

    const token = signToken(admin._id.toString());
    return res.status(201).json({
      token,
      admin: { 
        id: admin._id, 
        email: admin.email, 
        name: admin.name,
        examViewerSettings: admin.examViewerSettings 
      },
    });
  } catch (err) {
    return handleAuthError(res, err, '관리자 등록에 실패했습니다.');
  }
});

/** 로그인 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' });
    }

    const admin = await Admin.findOne({ email: String(email).trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = signToken(admin._id.toString());
    return res.json({
      token,
      admin: { 
        id: admin._id, 
        email: admin.email, 
        name: admin.name,
        examViewerSettings: admin.examViewerSettings 
      },
    });
  } catch (err) {
    return handleAuthError(res, err, '로그인 처리 중 오류가 발생했습니다.');
  }
});

/** 아이디 찾기 */
router.post('/find-id', async (req, res) => {
  try {
    const { name, registrationCode } = req.body;
    const secretCode = process.env.ADMIN_REGISTRATION_CODE;
    
    if (!secretCode || registrationCode !== secretCode) {
      return res.status(403).json({ message: '가입 코드가 올바르지 않습니다.' });
    }
    
    if (!name) {
      return res.status(400).json({ message: '이름을 입력하세요.' });
    }

    const admin = await Admin.findOne({ name: String(name).trim() });
    if (!admin) {
      return res.status(404).json({ message: '해당 이름으로 등록된 계정을 찾을 수 없습니다.' });
    }

    return res.json({ email: admin.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '아이디 찾기 중 오류가 발생했습니다.' });
  }
});

/** 비밀번호 재설정 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email, name, newPassword, registrationCode } = req.body;
    const secretCode = process.env.ADMIN_REGISTRATION_CODE;
    
    if (!secretCode || registrationCode !== secretCode) {
      return res.status(403).json({ message: '가입 코드가 올바르지 않습니다.' });
    }
    
    if (!email || !name || !newPassword) {
      return res.status(400).json({ message: '이메일, 이름, 새 비밀번호를 모두 입력하세요.' });
    }

    const admin = await Admin.findOne({ 
      email: String(email).trim().toLowerCase(),
      name: String(name).trim() 
    });
    
    if (!admin) {
      return res.status(404).json({ message: '입력하신 정보와 일치하는 계정을 찾을 수 없습니다.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    admin.passwordHash = passwordHash;
    await admin.save();

    return res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '비밀번호 재설정 중 오류가 발생했습니다.' });
  }
});

/** 내 정보 조회 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).lean();
    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }
    return res.json({
      admin: { 
        id: admin._id, 
        email: admin.email, 
        name: admin.name,
        examViewerSettings: admin.examViewerSettings 
      },
    });
  } catch (err) {
    return res.status(500).json({ message: '조회에 실패했습니다.' });
  }
});

/** 설정 업데이트 */
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings) {
      return res.status(400).json({ message: '설정값이 없습니다.' });
    }

    const admin = await Admin.findByIdAndUpdate(
      req.adminId,
      { examViewerSettings: settings },
      { returnDocument: 'after' }
    );

    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }

    return res.json({
      success: true,
      admin: { 
        id: admin._id, 
        email: admin.email, 
        name: admin.name,
        examViewerSettings: admin.examViewerSettings 
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '설정 저장 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
