const { app, BrowserWindow, ipcMain, ipcRenderer } = require('electron');
const path = require('path');

let inviteUrl;
//윈도우 생성 함수
const createConferenceWindow = () => {
    const roomId = generateRoomId(); // 방 ID 생성
    const url = `https://vervet-sacred-needlessly.ngrok-free.app/roomId?roomId=${roomId}`; // URL에 방 ID 추가
    const win = new BrowserWindow({
        width: 650,
        height: 700,
        frame: false,  // 본 타이틀바 제거
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });
    win.loadURL(url); // 서버에서 제공하는 URL을 로드
    inviteUrl = url;
};

// 메모 추가 생성 버튼 누르면 창 추가 생성
ipcMain.handle('add-conference-window', () => {
    console.log('add-conference-window event received');
    createConferenceWindow();
});

// 화상회의 초대 링크
ipcMain.handle('invite-url', () => {
    console.log('초대를 보낸 url: ' + inviteUrl);
    return inviteUrl;
});

function generateRoomId() {
    return Math.floor(Math.random() * 1e10);
}

module.exports = { createConferenceWindow };