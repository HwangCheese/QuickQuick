const { app, BrowserWindow, clipboard, dialog, ipcMain } = require('electron');
const path = require('path');
const { summarizeUrl } = require('./api-helpers'); // api-helpers.js에서 summarizeUrl 함수 가져오기

let win;
let dialogShown = false; // 다이얼로그가 이미 표시되었는지 추적하는 플래그
let focusedWindowId = null;
const plusX=30;
const plusY=30;
const screenWidth = 1920;  // 예시로 가로 해상도 1920
const screenHeight = 1080; // 예시로 세로 해상도 1080
let centerX = Math.floor((screenWidth - 270) / 2)-400;
let centerY = Math.floor((screenHeight - 345) / 2)-250; 

// 윈도우 생성 함수
const createMemoWindow = () => {
    // 창이 화면 밖으로 벗어나지 않도록 좌표를 조정
    if (centerX + 270 > screenWidth-180 || centerY + 345 > screenHeight-400 || centerX < 0 || centerY < 0) {
        // 화면을 벗어나면 중앙 좌표로 초기화
        centerX = Math.floor((screenWidth - 270) / 2)-400;
        centerY = Math.floor((screenHeight - 345) / 2)-250; 
    }

    win = new BrowserWindow({
        width: 310,
        height: 320,
        x: centerX, // 증가된 x 좌표
        y: centerY, // 증가된 y 좌표
        frame: false,  // 본 타이틀바 제거
        transparent: true, // 프레임을 투명하게 설정
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });
    win.loadFile('templates/newMemo.html');

    // 포커스 및 블러 이벤트 핸들링
    win.on('focus', () => {
        if (focusedWindowId !== win.id) {
            console.log('Window focused with id:', win.id);
            focusedWindowId = win.id;
        }
    });

    win.on('blur', () => {
        console.log('Window blurred:', win.id);
    });

    // 다음 창을 생성할 때 좌표가 이동되도록 현재 좌표에 증가량 추가
    centerX += plusX;
    centerY += plusY;
};

// IPC 핸들러 설정, ipcMain에서의 이벤트 수신
ipcMain.handle('summarize-url-content', async (event,) => {
    // 다이얼로그가 이미 열렸으면 처리하지 않음
    if (dialogShown) return;
    //현재 clipboard의 텍스트 가져오기
    const clipboardText = clipboard.readText();
    //url패턴 설정
    const urlPattern = new RegExp('^(https?:\\/\\/)?' +
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' +
        '((\\d{1,3}\\.){3}\\d{1,3}))' +
        '(\\:\\d+)?' +
        '(\\/[-a-z\\d%_.~+]*)*' +
        '(\\?[;&a-z\\d%_.~+=-]*)?' +
        '(\\#[-a-z\\d_]*)?$', 'i');

    //설정한 url패턴을 기준으로 현재 클립보드 내의 문자열이 url형태인지 파악
    if (urlPattern.test(clipboardText)) {
        dialogShown = true; // 다이얼로그 표시 플래그 설정
        //다이얼로그 옵션 설정
        const options = {
            type: 'question',
            buttons: ['예', '아니오'],
            defaultId: 0,
            title: 'URL 요약',
            message: '클립보드의 URL을 요약하시겠습니까?',
            detail: clipboardText
        };
        //url형태라면 다이얼로그 띄우기.
        dialog.showMessageBox(win, options).then(async response => {
            if (response.response === 0) {
                // '예'를 눌렀을 때 요약 요청
                try {
                    const summary = await summarizeUrl(clipboardText); // apihelper.js의 summarizeUrl 함수 호출
                    console.log('Summary:', summary);
                    win.webContents.send('summary', summary);
                } catch (error) {
                    console.error('Error:', error);
                    win.webContents.send('summary-error', error);
                }
            }
            else{ //'아니오'를 눌렸을 때, 클립보드 내의 url을 문자열 그대로 보내기
                win.webContents.send('real-url',clipboardText);
            }
            // '아니오'를 눌렀거나 '예'를 눌렀을 때, 작업이 끝난 후 클립보드 비우기
            clipboard.clear();
            dialogShown = false; // 다이얼로그 표시 플래그 리셋
        });
    }
});

// 창닫기 버튼, 메세지 채널 이름 close-window
ipcMain.handle('close-memo-window', () => {
    console.log('close-memo-window event received');
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.close();
    }
});

// 메모 추가 생성 버튼 누르면 창 추가 생성
ipcMain.handle('add-memo-window', () => {
    console.log('add-memo-window event received');
    createMemoWindow();
});

module.exports = { createMemoWindow };