import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 파일 열기 다이얼로그
ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'HWP Files', extensions: ['hwp', 'hwpx'] }],
    properties: ['openFile']
  });
  if (canceled) return null;
  return filePaths[0];
});

// 에이전트 통신용 IPC
ipcMain.handle('agent-action', async (event, { agentName, action, payload }) => {
  console.log(`[Main] Agent: ${agentName}, Action: ${action}`);

  if (agentName === 'Parser' && action === 'extract') {
    return new Promise((resolve) => {
      const scriptPath = path.join(__dirname, '../scripts/hwp_processor.py');
      const pythonProcess = spawn('python', [scriptPath, payload.filePath]);

      // stdout/stderr 인코딩을 utf8로 명시적 설정
      pythonProcess.stdout.setEncoding('utf8');
      pythonProcess.stderr.setEncoding('utf8');

      let result = "";
      pythonProcess.stdout.on('data', (data) => { result += data; });
      pythonProcess.stderr.on('data', (data) => { console.error(`Python Error: ${data}`); });

      pythonProcess.on('close', (code) => {
        try {
          resolve(JSON.parse(result));
        } catch (e) {
          resolve({ success: false, error: "파싱 결과 해석 실패" });
        }
      });
    });
  }

  return { success: true, message: `Action ${action} completed` };
});

