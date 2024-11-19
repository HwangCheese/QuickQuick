const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const config = require('./config.js'); 

let existMemoData;

async function importFetch() {
  return (await import('node-fetch')).default;
}


// 기존에 작성했던 메모를 가져오는 함수
const createExistMemoWindow = async (memo_id) => {
  fetch = await importFetch();
  const response = await fetch(`${config.SERVER_URL}/memoID/${memo_id}`);
  // 응답이 정상인지 확인
  if (!response.ok) {
    throw new Error('메모를 불러오는 중 오류가 발생했습니다.');
  }
  // 서버에서 받아온 메모 객체
  console.log('memo_id:'+memo_id);
  const memo = await response.json();
  console.log('메모정보:'+memo[0]);

  const win = new BrowserWindow({
    width: memo[0].width || 310,
    height: memo[0].height || 320,
    x: memo[0].posX,
    y: memo[0].posY,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  });
  existMemoData = memo[0];
  win.loadFile('templates/existMemo.html');
};

// ipcMain 핸들러는 앱 시작 시 한 번만 등록합니다.
ipcMain.handle('get-exist-memo-data', () => {
  return existMemoData;
});

module.exports = { createExistMemoWindow };
