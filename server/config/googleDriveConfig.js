const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// .keys 폴더 내의 클라이언트 비밀번호 파일 경로 설정
const KEY_FILE_NAME = 'client_secret_2_953012340020-u7arhbhumrjlq6j7g7i06iik09bgp9l4.apps.googleusercontent.com.json';
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
    throw new Error(`구글 인증 정보(키 파일)를 찾을 수 없습니다. 경로를 확인하세요: ${KEY_PATH}`);
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

let appFolderId = null;

/**
 * 앱 전용 폴더를 찾거나 생성합니다.
 */
const getOrCreateAppFolder = async (folderName = 'HWP_ERP_Images') => {
  if (appFolderId) return appFolderId;

  const drive = getDriveService();
  try {
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files.length > 0) {
      appFolderId = response.data.files[0].id;
      return appFolderId;
    }

    // 폴더가 없으면 생성
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    
    console.log(`📁 Created new folder in Google Drive: ${folderName} (${folder.data.id})`);
    appFolderId = folder.data.id;
    return appFolderId;
  } catch (error) {
    console.error('Error getting/creating folder:', error);
    throw error;
  }
};

/**
 * 파일을 구글 드라이브에 업로드합니다.
 * @param {string} filePath - 업로드할 파일의 로컬 경로
 * @param {string} fileName - 드라이브에 저장될 파일 이름
 * @param {string} folderId - 저장될 폴더 ID (선택 사항)
 */
const uploadFile = async (filePath, fileName, folderId = null) => {
  const drive = getDriveService();
  
  // 폴더 ID가 지정되지 않은 경우 전용 폴더 사용
  const targetFolderId = folderId || await getOrCreateAppFolder();
  
  const fileMetadata = {
    name: fileName,
    parents: [targetFolderId]
  };

  const media = {
    mimeType: 'image/png',
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

/**
 * 구글 드라이브에서 파일을 삭제합니다.
 * @param {string} fileId - 삭제할 파일 ID
 */
const deleteFile = async (fileId) => {
  const drive = getDriveService();
  try {
    await drive.files.delete({
      fileId: fileId,
    });
    console.log(`🗑️ Deleted file from Google Drive: ${fileId}`);
  } catch (error) {
    // 파일이 이미 없거나 권한 문제가 있을 수 있으므로 로그만 남김
    console.warn(`Failed to delete file ${fileId} from Google Drive:`, error.message);
  }
};

module.exports = {
  getOAuth2Client,
  getAuthenticatedClient,
  getDriveService,
  getOrCreateAppFolder,
  uploadFile,
  deleteFile,
  KEY_PATH,
  TOKEN_PATH
};
