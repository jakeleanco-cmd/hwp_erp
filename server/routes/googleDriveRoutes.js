const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getOAuth2Client, uploadFile } = require('../config/googleDriveConfig');

const TOKEN_PATH = path.join(__dirname, '../../.keys/tokens.json');
const IMG_DIR = path.join(__dirname, '../../public/extracted_images');

/**
 * 구글 인증 URL을 생성하여 반환합니다.
 */
router.get('/auth-url', (req, res) => {
  const oAuth2Client = getOAuth2Client();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // refresh_token을 받기 위해 필수
    scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'],
    prompt: 'consent' // 매번 동의 화면을 보여주어 refresh_token을 확실히 받음
  });
  res.json({ url: authUrl });
});

/**
 * 구글 인증 후 전달받은 코드를 토큰으로 교환하고 저장합니다.
 */
router.post('/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: '인증 코드가 누락되었습니다.' });
  }

  try {
    const oAuth2Client = getOAuth2Client();
    const { tokens } = await oAuth2Client.getToken(code);
    
    // 토큰 저장 (추후 자동 인증을 위해)
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    
    res.json({ success: true, message: '인증 성공 및 토큰 저장 완료' });
  } catch (err) {
    console.error('구글 토큰 교환 에러:', err);
    res.status(500).json({ 
      error: '토큰 교환 중 오류가 발생했습니다.',
      details: err.message
    });
  }
});

/**
 * 현재 인증 상태를 확인합니다.
 */
router.get('/status', (req, res) => {
  if (fs.existsSync(TOKEN_PATH)) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

/**
 * 로컬 추출 이미지들을 구글 드라이브에 업로드합니다.
 */
router.post('/upload-images', async (req, res) => {
  try {
    if (!fs.existsSync(IMG_DIR)) {
      return res.status(404).json({ error: '이미지 디렉토리를 찾을 수 없습니다.' });
    }

    const files = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
    const uploadResults = [];

    for (const file of files) {
      const filePath = path.join(IMG_DIR, file);
      const result = await uploadFile(filePath, `hwp_img_${Date.now()}_${file}`);
      uploadResults.push({
        originalName: file,
        driveId: result.id,
        // 드라이브 직접 링크를 이미지 태그에서 사용하려면 webContentLink를 가공하거나 
        // 전용 프록시가 필요할 수 있습니다. 여기서는 ID와 원본 이름을 반환합니다.
        link: result.webContentLink 
      });
    }

    res.json({ success: true, images: uploadResults });
  } catch (err) {
    console.error('이미지 업로드 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 단일 이미지 파일을 구글 드라이브에 업로드합니다 (에디터 등에서 사용).
 */
router.post('/upload', async (req, res) => {
  try {
    const { image, fileName } = req.body; // base64 image data
    if (!image) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    // base64 데이터를 임시 파일로 저장
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const tempFilePath = path.join(__dirname, `../../temp/temp_${Date.now()}.png`);
    
    if (!fs.existsSync(path.join(__dirname, '../../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../../temp'));
    }

    fs.writeFileSync(tempFilePath, base64Data, 'base64');

    const result = await uploadFile(tempFilePath, fileName || `editor_img_${Date.now()}.png`);

    // 임시 파일 삭제
    fs.unlinkSync(tempFilePath);

    res.json({ success: true, link: result.webContentLink, driveId: result.id });
  } catch (err) {
    console.error('단일 이미지 업로드 실패:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
