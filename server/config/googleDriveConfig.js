const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// .keys 폴더 내의 클라이언트 비밀번호 파일 경로 설정
const KEY_FILE_NAME = 'client_secret_953012340020-u7arhbhumrjlq6j7g7i06iik09bgp9l4.apps.googleusercontent.com.json';
const KEY_PATH = path.join(__dirname, '../../.keys', KEY_FILE_NAME);

const TOKEN_PATH = path.join(__dirname, '../../.keys/tokens.json');

/**
 * 구글 OAuth2 클라이언트를 초기화하고 반환합니다.
 */
const getOAuth2Client = () => {
  let credentials;
  
  // 1. 환경 변수에서 먼저 확인 (Vercel 배포 시 사용)
  if (process.env.GOOGLE_CREDENTIALS) {
    credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } 
  // 2. 환경 변수가 없으면 로컬 파일에서 확인
  else if (fs.existsSync(KEY_PATH)) {
    const content = fs.readFileSync(KEY_PATH, 'utf8');
    credentials = JSON.parse(content);
  } else {
    throw new Error(`구글 인증 정보(GOOGLE_CREDENTIALS 환경 변수 또는 키 파일)를 찾을 수 없습니다.`);
  }

  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

  // OAuth2 클라이언트 생성 (Vercel 환경이면 현재 도메인 기반의 redirect_uri 사용 고려)
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  return oAuth2Client;
};

/**
 * 저장된 토큰을 사용하여 인증된 OAuth2 클라이언트를 반환합니다.
 */
const getAuthenticatedClient = () => {
  const oAuth2Client = getOAuth2Client();
  let token;

  // 1. 환경 변수에서 토큰 확인
  if (process.env.GOOGLE_TOKEN) {
    token = JSON.parse(process.env.GOOGLE_TOKEN);
  }
  // 2. 로컬 파일에서 토큰 확인
  else if (fs.existsSync(TOKEN_PATH)) {
    const content = fs.readFileSync(TOKEN_PATH, 'utf8');
    token = JSON.parse(content);
  } else {
    throw new Error('인증된 토큰이 없습니다. 먼저 로그인을 진행해주세요.');
  }

  oAuth2Client.setCredentials(token);

  // 토큰 갱신 이벤트 핸들러
  oAuth2Client.on('tokens', (tokens) => {
    // Vercel(서버리스) 환경에서는 파일 쓰기가 불가능하므로 로그만 출력
    // 실서비스에서는 DB에 저장하는 방식이 권장됩니다.
    console.log('🔄 Google Access Token refreshed.');
    if (fs.existsSync(TOKEN_PATH)) {
      const currentToken = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      const updatedToken = { ...currentToken, ...tokens };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken));
    }
  });

  return oAuth2Client;
};

/**
 * 드라이브 서비스 객체를 생성합니다.
 */
const getDriveService = () => {
  const auth = getAuthenticatedClient();
  return google.drive({ version: 'v3', auth });
};

/**
 * 파일을 구글 드라이브에 업로드합니다.
 * @param {string} filePath - 업로드할 파일의 로컬 경로
 * @param {string} fileName - 드라이브에 저장될 파일 이름
 * @param {string} folderId - 저장될 폴더 ID (선택 사항)
 */
const uploadFile = async (filePath, fileName, folderId = null) => {
  const drive = getDriveService();
  
  const fileMetadata = {
    name: fileName,
  };
  
  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType: 'image/png', // 이미지 위주이므로 png로 설정 (필요시 유동적으로 변경 가능)
    body: fs.createReadStream(filePath),
  };

  try {
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // 누구나 볼 수 있도록 권한 설정 (이미지 렌더링을 위해)
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Google Drive Upload Error:', error);
    throw error;
  }
};

module.exports = {
  getOAuth2Client,
  getAuthenticatedClient,
  getDriveService,
  uploadFile,
  KEY_PATH,
  TOKEN_PATH
};
