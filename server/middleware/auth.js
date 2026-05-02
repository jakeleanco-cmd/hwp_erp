const jwt = require('jsonwebtoken');

/**
 * JWT 인증 미들웨어
 * 요청 헤더의 Authorization: Bearer <token> 형식을 확인합니다.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증이 필요합니다. (토큰 없음)' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET is not defined in environment variables.');
      return res.status(500).json({ message: '서버 설정 오류: JWT_SECRET이 없습니다.' });
    }

    const decoded = jwt.verify(token, secret);
    
    // 역할(role) 기반 관리를 위해 전체 정보를 req.user에 저장
    req.user = decoded;
    // 하위 호환성을 위해 adminId 유지
    req.adminId = decoded.sub;
    next();
  } catch (err) {
    console.error('JWT Verify Error:', err.message);
    return res.status(401).json({ message: '유효하지 않거나 만료된 토큰입니다.' });
  }
};

module.exports = { requireAuth };
