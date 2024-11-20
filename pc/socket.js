const { io } = require('socket.io-client');
const { BrowserWindow, Notification,ipcMain } = require('electron'); // Electron의 Notification API 사용
const path = require('path');
const Speaker = require('speaker');
const fs = require('fs');
const config = require('./config.js'); 
const { shell } = require('electron'); 
const { createUsersWindow } = require('./floting');
const { createExistMemoWindow } = require('./existMemo');

let socket = null;

// 소켓 초기화 함수
async function initializeSocket(serverUrl) {
    socket = io(serverUrl);
    socket.on('connect', async () => {
        console.log('소켓 연결이 성공적으로 이루어졌습니다.');
        // showKockNotification('환영합니다!', `로그인 성공이에요.`);
    });
    socket.on('connect_error', (error) => {
        console.error('소켓 연결 오류:', error);
    });
    // 친구 추가 알림 수신
    socket.on('add-friend', async (message) => {
        showFriendNotification('친구 추가 알림', message);
    });
    // 콕찌르기 ㅋㅋ
    socket.on('kock', async (message)=>{
        showKockNotification('콕 찌르기', message);
    });
    // 새로운 메모 알림
    socket.on('new-memo', async (message, memo_id) => {
        showMemoNotification('새로운 메모 도착', message, memo_id);
    });
    // 화상회의 초대
    socket.on('invite', async (inviteUrl) => {
        showInvite('화상회의 초대', '클릭해서 화상회의를 접속 하세요.', inviteUrl);
    });
    return socket;
}

// 친구추가 알림을 생성하는 함수
function showFriendNotification(title, body) {
    try {
        const notification = new Notification({
            title: title,
            body: body,
            silent: true,
            icon: 'media/add-user.png'
        });
        notification.show();
        playSound();
        notification.on('click', () => {
            // [은비] 이 부분 수정했는데 테스트가 불가한 상황이라 그냥 둠
            createUsersWindow();
        });
    } catch (error) {
        console.error('알림 생성 중 오류:', error);
    }
}

// 콕찌르기 알림을 생성하는 함수
function showKockNotification(title, body) {
    try {
        const notification = new Notification({
            title: title,
            body: body,
            silent: true,
            icon: 'media/tap.png'
        });
        notification.show();
        playSound();
        notification.on('click', () => {
            createUsersWindow();
        });
    } catch (error) {
        console.error('알림 생성 중 오류:', error);
    }
}

// 새로운 메모 알림을 생성하는 함수
async function showMemoNotification(title, body, memo_id) {
    try {
        const notification = new Notification({
            title,
            body,
            silent: true,
            icon: 'media/mail.png',
        });

        notification.show();
        playSound();

        notification.on('click', async () => {
            console.log(memo_id);
            try {
                // 받아온 메모 객체로 메모 창 생성
                createExistMemoWindow(memo_id);
            } catch (error) {
                console.error('메모 요청 중 오류:', error);
            }
        });
    } catch (error) {
        console.error('알림 생성 중 오류:', error);
    }
}

// 화상회의 초대 알림을 생성하는 함수
function showInvite(title, body, inviteUrl) { // inviteUrl 매개변수 추가
    console.log('url:'+inviteUrl);
    try {
        const notification = new Notification({
            title: title,
            body: body,
            silent: true,
            icon: 'media/video-call.png'
        });

        notification.show();
        playSound();
        notification.on('click', () => {
            createConferenceWindowByInvite(inviteUrl); // 클릭 시 URL 열기
        });
    } catch (error) {
        console.error('알림 생성 중 오류:', error);
    }
}

// 화상회의 초대 받고 들어가기
const createConferenceWindowByInvite = (inviteUrl) => {
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
    win.loadURL(inviteUrl);
};

// 비동기 소리 재생 함수
function playSound() {
    return new Promise(async (resolve, reject) => {
        const audioPath = path.join(__dirname, 'media', 'quick.wav');
        const reader = fs.createReadStream(audioPath);
        const speaker = new Speaker({
            channels: 1,
            bitDepth: 16,
            sampleRate: 44100
        });
        reader.pipe(speaker);

        // 스트림 종료 시 처리
        reader.on('end', () => {
            speaker.end(); // Speaker 스트림 종료
        });

        speaker.on('close', () => {
            resolve();
        });

        speaker.on('error', (err) => {
            console.error('오디오 재생 오류:', err);
            reject(err);
        });

        reader.on('error', (err) => {
            console.error('파일 읽기 오류:', err);
            reject(err);
        });
    });
}

// 소켓 객체 반환 함수
function getSocket() {
    if (!socket) {
        throw new Error('소켓이 초기화되지 않았습니다.');
    }
    return socket;
}

// IPC 핸들러 설정
ipcMain.handle('kock-action', async (event, { userName, friendName }) => {
    try {
        const response = await fetch(`${config.SERVER_URL}/kock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sourceUserName: userName, // 요청을 보낸 사용자의 ID
                targetUserName: friendName // 요청을 받는 대상 사용자의 ID
            }),
        });
        if (!response.ok) {  // 사용자가 접속하고 있지 않은 경우
            const errorData = await response.json();
            console.error('서버 메시지:', errorData.message);
            return false;
        } else {
            console.log('콕 요청이 성공적으로 처리되었습니다.');
            return true;
        }
    } catch (error) {
        console.error('콕 요청 중 오류 발생:', error.message);
    }
});

// IPC 핸들러 설정
ipcMain.handle('invite-action', async (event, { inviteUrl, userName, targetUserId }) => {
    try {
        const response = await fetch(`${config.SERVER_URL}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inviteUrl: inviteUrl, // 화상회의 초대 URL
                userName: userName, // 요청을 보낸 사용자의 이름
                targetUserId: targetUserId // 초대받는 대상 사용자의 ID
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('서버에서 오류가 발생했습니다:', errorData.error);
            return { success: false, error: errorData.error };
        } else {
            console.log('화상회의 초대 요청이 성공적으로 처리되었습니다.');
            return { success: true };
        }
    } catch (error) {
        console.error('화상회의 초대 요청 중 오류 발생:', error.message);
        return { success: false, error: error.message };
    }
});

module.exports = { initializeSocket, getSocket };