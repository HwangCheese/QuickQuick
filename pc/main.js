//main.js
const { app, globalShortcut, ipcMain, BrowserWindow } = require('electron');
const { createMemoWindow } = require('./newMemo');
const { initializeSocket } = require('./socket'); // 소켓 초기화 모듈
const { createExistMemoWindow } = require('./existMemo');
const { createfloatingWindow, createUsersWindow, createMemoListWindow,createSearchMemoWindow } = require('./floting');
const { generateId, checkAndSignUpUser,getUserName } = require('./login.js');
const config = require('./config.js'); 
const {} = require('./api-helpers');
const {} = require('./memoUpload.js');   
const {} = require('./memoPull.js');
const {} = require('./memoDelete.js');
const {} = require('./newVideoConference.js');
const {createCalendarWindow} = require('./fullCalendar.js');
const { cleanTempFiles } = require('./tempUnlink.js');
const {} = require('./assistantWindow.js');

let userId;
let userName;
let socket;

//어플리케이션이 준비되면
app.whenReady().then(async() => {
    //app.setLoginItemSettings({ openAtLogin: true });
    userId = await generateId(); // 앱 시작 시 사용자 ID 생성
    console.log('userId: ' + userId);
    createfloatingWindow(); // main 플로팅 버튼 생성.
    // 사용자 가입 확인 및 처리
    try {
      await checkAndSignUpUser(userId);
    } catch (err) {
      console.error('sign up error:', err);
    }
    console.log('App is ready');
    userName = getUserName();
    console.log('userName: ' + userName);

    socket = await initializeSocket(config.SERVER_URL); // 서버 주소를 전달하여 소켓을 초기화합니다.
    // 특정 사용자 ID로 방에 참여
    socket.emit('join-room', userId+';'+userName);

    // 주기적으로 임시 파일 정리 실행 
    setInterval(cleanTempFiles, 36000000); // 1시간마다

    // 전역 단축키 등록 (control + Q) > 새로운 메모 생성
    globalShortcut.register('CommandOrControl+Q', () => {
      createMemoWindow('../templates/newMemo.html');
      // 새로운 창을 생성
    });
    globalShortcut.register('CommandOrControl+U', () => {
      createUsersWindow();
      // 새로운 창을 생성
    });
    globalShortcut.register('CommandOrControl+L', () => {
      createCalendarWindow();
      // 새로운 창을 생성
    });
    globalShortcut.register('CommandOrControl+P', () => {
      createSearchMemoWindow();
      createMemoListWindow();
      // 새로운 창을 생성
    });
  });

//기존 메모를 선택하여 open했을 때, 호출
ipcMain.on('open-exist-memo', (event, memo_id) => {
    //console.log(memoData);
    createExistMemoWindow(memo_id); //in existMemo.js...
});


//모든 창이 닫혔을 때, 호출
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { //macOS와 다른 플랫폼을 구분, 운영체제가 macOS가 아니라면
    app.quit(); //애플리케이션 종료
  }
});