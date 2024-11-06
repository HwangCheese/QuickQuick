const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// 전역 변수 선언
let mainFloatingWindow;
let newMemoFloatingWindow;
let searchFloatingWindow;
let homeFloatingWindow;
let calendarFloatingWindow;
let memoListWindow;
let spacing = -50;
let usersWindow;

const floatingWindowOptions = {
  width: 60,
  height: 60,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  resizable: true,
  movable: true,
  show: false,
  skipTaskbar: true,
  webPreferences: {
    contextIsolation: true,
    enableRemoteModule: true,
    nodeIntegration: false,
    audioPlayback: true,
    preload: path.join(__dirname, 'preload.js')
  }
};

//메인 플로팅 버튼 생성
function createMainfloatingWindow() {
  /*
  // 화면 크기 및 작업 영역 얻기
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  // 버튼의 위치를 화면의 우측 하단으로 설정
  const x = width - floatingWindowOptions.width;
  const y = height - floatingWindowOptions.height;
  mainFloatingWindow = new BrowserWindow({
    ...floatingWindowOptions,
    //x: x-10,
    // y: y-10,
  });
  */

  // 화면 크기 및 작업 영역 얻기
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // 버튼의 위치를 화면의 우측 하단으로 설정
  const x = width - floatingWindowOptions.width - 50; // 우측 끝에서 50px 여백 추가
  const y = height - floatingWindowOptions.height - 50; // 하단 끝에서 50px 여백 추가

  mainFloatingWindow = new BrowserWindow({
    ...floatingWindowOptions,
    x: x,
    y: y,
  });

  mainFloatingWindow.loadFile('templates/mainFbtn.html');

  mainFloatingWindow.once('ready-to-show', () => {
    mainFloatingWindow.show();
  });

  mainFloatingWindow.on('closed', () => {
    mainFloatingWindow = null;
  });


  mainFloatingWindow.loadFile('templates/mainFbtn.html');
  mainFloatingWindow.once('ready-to-show', () => {
    mainFloatingWindow.show();
  });
  mainFloatingWindow.on('closed', () => {
    mainFloatingWindow = null;
  });
}

// 플로팅 메뉴 생성
function createFloatingWindow(fileName, xOffset, yOffset) {
  const newFloatingWindow = new BrowserWindow({ ...floatingWindowOptions });
  newFloatingWindow.loadFile(fileName);

  newFloatingWindow.once('ready-to-show', () => {
    const { x, y } = mainFloatingWindow.getBounds();
    newFloatingWindow.setBounds({ x: x + xOffset, y: y + yOffset });
    newFloatingWindow.show();
  });

  return newFloatingWindow;
}

// 플로팅 메뉴 생성 및 열기
function showFloatingWindow(location, direction) {
  newMemoFloatingWindow = createFloatingWindow('templates/writeFbtn.html', 0, location * spacing);

  if (direction == 1) {
    searchFloatingWindow = createFloatingWindow('templates/searchFbtn.html', -211, location * spacing * 2);
    searchFloatingWindow.webContents.on('did-finish-load', () => {
      searchFloatingWindow.webContents.send('expand-floating-window', 'left');
    });
  } else {
    searchFloatingWindow = createFloatingWindow('templates/searchFbtn.html', 13, location * spacing * 2);
    searchFloatingWindow.webContents.on('did-finish-load', () => {
      searchFloatingWindow.webContents.send('expand-floating-window', 'right');
    });
  }
  searchFloatingWindow.setBounds({ width: 270, height: 60 });

  homeFloatingWindow = createFloatingWindow('templates/homeFbtn.html', 0, location * spacing * 3);
  calendarFloatingWindow = createFloatingWindow('templates/calendarFbtn.html', 0, location * spacing * 4);
}

// 플로팅 버튼이 위, 아래 중에 어디에 위치하는지 계산
function getHorizontalPosition() {
  const workAreaHeight = screen.getAllDisplays()[0].workAreaSize.height;
  const screenHalfY = workAreaHeight / 2;
  const { y } = mainFloatingWindow.getBounds();
  return y < screenHalfY ? -1 : 1;
  // mainfloating이 위에 있으면 -1, 아래에 있으면 1 return
}

// 플로팅 버튼이 좌우 중에 어디에 위치하는지 계산
function getVerticalPosition() {
  const workAreaWidth = screen.getAllDisplays()[0].workAreaSize.width;
  const screenHalfX = workAreaWidth / 2;
  const { x } = mainFloatingWindow.getBounds();
  return x < screenHalfX ? -1 : 1;
  // mainfloating이 오른쪽에 있으면 -1, 왼쪽에 있으면 1 return
}

// memoList Window 생성
function createMemoListWindow(xOffset, yOffset) {
  const newWindow = new BrowserWindow({
    width: 180,
    height: 250,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  newWindow.loadFile("templates/memoList.html");

  newWindow.once('ready-to-show', () => {
    const { x, y } = searchFloatingWindow.getBounds();
    newWindow.setBounds({ x: x + xOffset, y: y + yOffset });
    newWindow.show();
  });

  return newWindow;
}

// 플로팅 창 이동
ipcMain.handle('move-floating-window', (event, { x, y }) => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    window.setBounds({ x, y, width: 60, height: 60 }); // 애니메이션을 사용하지 않음
  }
});

// 메모 리스트 윈도우 생성 및 열기, 닫기
ipcMain.handle('memo-list-window', (event, show) => {
  if (show) { // memoList 열기
    if (getHorizontalPosition() < 0) { //위
      if (getVerticalPosition() < 0) { memoListWindow = createMemoListWindow(65, 62); } // 왼쪽
      else { memoListWindow = createMemoListWindow(30, 62); } // 오른쪽
    }
    else {
      if (getVerticalPosition() < 0) { memoListWindow = createMemoListWindow(65, -252); } // 왼쪽
      else { memoListWindow = createMemoListWindow(30, -252); } // 오른쪽
    }
  }
  else { // memoList 닫기
    memoListWindow.close();
  }
});

function createNotificationWindow() {
  if (!usersWindow) {
    usersWindow = createUsersWindow();
  } else {
    usersWindow.focus();
  }
}

// users Window(QR로그인, 친구추가 창) 생성 및 열기
ipcMain.handle('open-users-window', () => {
  if (!usersWindow) {
    usersWindow = createUsersWindow();
  } else {
    usersWindow.focus();
  }
});

// users Window(QR로그인, 친구추가 창) 닫기
ipcMain.handle('close-users-window', () => {
  if (usersWindow && !usersWindow.isDestroyed()) {
    usersWindow.close();
  }
});

// users Window(QR로그인, 친구추가 창) 크기조정
ipcMain.handle('resize-users-window', (event, height) => {
  if (usersWindow) {
    usersWindow.setBounds({ width: 340, height }); // 새로운 세로 크기로 설정
  }
});

// users Window(QR로그인, 친구추가 창) 생성
function createUsersWindow() {
  const newWindow = new BrowserWindow({
    width: 340,
    height: 198,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true
    }
  });

  // HTML 파일을 로드합니다.
  newWindow.loadFile('templates/users.html');
  // 창이 닫힐 때, usersWindow 변수를 null로 설정
  newWindow.on('closed', () => {
    usersWindow = null;
  });
  return newWindow; // BrowserWindow 인스턴스를 반환
}

ipcMain.on('search-memo', (event, searchTerm) => {
  console.log(searchTerm);
  if (memoListWindow) {
    memoListWindow.webContents.send('update-memo-list', searchTerm);
  } else {
    console.log('Memo list window is not open.');
  }
});

module.exports = { createMainfloatingWindow, createUsersWindow, createNotificationWindow };