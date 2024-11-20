const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

// 전역 변수 선언
let floatingWindow;
let memoListWindow;
let searchWindow;
let usersWindow;
let searchMemoWindow;

//메인 플로팅 버튼 생성
function createfloatingWindow() {
  // 화면 크기 및 작업 영역 얻기
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  // 버튼의 위치를 화면의 우측 하단으로 설정
  const x = width - 150; // 우측 끝에서 50px 여백 추가
  const y = height - 150.; // 하단 끝에서 50px 여백 추가

  floatingWindow = new BrowserWindow({
    width: 150,
    height: 100,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
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

  });

  floatingWindow.loadFile('templates/floating.html');

  floatingWindow.once('ready-to-show', () => {
    floatingWindow.show();
  });

  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });

  // 전체 화면의 마우스 위치를 주기적으로 브라우저에 전송
  setInterval(() => {
    const mousePosition = screen.getCursorScreenPoint();
    const windowBounds = floatingWindow.getBounds(); // 현재 창의 위치 및 크기

    // 마우스 좌표를 창 내부 기준으로 변환
    const relativeX = mousePosition.x - windowBounds.x;
    const relativeY = mousePosition.y - windowBounds.y;

    // 브라우저에 변환된 마우스 좌표 전송
    floatingWindow.webContents.send('mouse-position', { x: relativeX, y: relativeY });
  }, 16); // 60fps를 위해 16ms마다 업데이트
}

// memoList Window 생성
function createMemoListWindow() {
  if (memoListWindow) {
    memoListWindow = null;
  }
  const newWindow = new BrowserWindow({
    width: 320,
    height: 200,
    frame: false,
    transparent: false,
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
    newWindow.setBounds({ x: 640, y: 200 });
    newWindow.show();
  });

  memoListWindow = newWindow;
  return newWindow;
}

// 검색창
function createSearchMemoWindow() {
  if (searchMemoWindow) {
    return searchMemoWindow;
  }

  const newWindow = new BrowserWindow({
    width: 320,
    height: 270,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    movable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  newWindow.loadFile("templates/searchMemo.html");
  newWindow.once('ready-to-show', () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // 새 창의 크기와 중앙 위치 계산
    const windowWidth = newWindow.getBounds().width;
    const windowHeight = newWindow.getBounds().height;

    const x = Math.floor((width - windowWidth) / 2);
    const y = Math.floor((height - windowHeight) / 2);

    newWindow.setBounds({ x, y });
    newWindow.show();
  });
  // 윈도우가 포커스를 잃을 때
  newWindow.on('blur', () => {
    // 포커스를 잃으면 윈도우를 닫음
    newWindow.hide();
    searchMemoWindow = null;
  });
  newWindow.on('closed', () => {
    searchMemoWindow = null;
  });

  searchMemoWindow = newWindow;

  return searchMemoWindow;

}

// 검색 윈도우 생성
ipcMain.handle('open-search-window', () => {
  console.log('open search-window');
  createSearchMemoWindow();
  // createMemoListWindow();
});

// 플로팅 창 이동
ipcMain.handle('move-floating-window', (event, { x, y }) => {
  const window = BrowserWindow.getFocusedWindow();
  if (window) {
    //console.log("x: " + x + "y: " + y)
    window.setBounds({ x: x, y: y, width: 150, height: 100 }); // 애니메이션을 사용하지 않음
  }
});

// 메모 리스트 윈도우 생성 및 열기, 닫기
ipcMain.handle('memo-list-window', (event, show) => {
  if (show) { // memoList 열기
    // createMemoListWindow();
  }
  else { // memoList 닫기
    memoListWindow.close();
  }
});

// users Window(QR로그인, 친구추가 창) 생성 및 열기
ipcMain.handle('open-users-window', () => {
  console.log('open users-window');
  createUsersWindow();
});

// users Window(QR로그인, 친구추가 창) 닫기
ipcMain.handle('close-users-window', () => {
  if (usersWindow && !usersWindow.isDestroyed()) {
    usersWindow.close();
  }
});

ipcMain.handle('close-search-window', () => {
  // if (memoListWindow && !memoListWindow.isDestroyed()) {
  //   memoListWindow.close();
  // }
  if (searchMemoWindow && !searchMemoWindow.isDestroyed()) {
    searchMemoWindow.close();
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
  if (usersWindow) {
    usersWindow.focus();
    console.log('already opened users-window');
    return;
  }
  const newWindow = new BrowserWindow({
    width: 300,
    height: 300,
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
  usersWindow = newWindow;
  return usersWindow; // BrowserWindow 인스턴스를 반환
}

ipcMain.on('resize-width', (event, arg) => {
  const { width } = arg;
  if (usersWindow) {
    usersWindow.setBounds({ width, height: usersWindow.getBounds().height });
  }
});

ipcMain.on('resize-height', (event, arg) => {
  const { height } = arg;
  if (usersWindow) {
    usersWindow.setBounds({ width: usersWindow.getBounds().width, height });
  }
});

ipcMain.on('resize-height-menu', (event, arg) => {
  const { height } = arg;
  if (floatingWindow) {
    floatingWindow.setBounds({ width: floatingWindow.getBounds().width, height });
  }
});

ipcMain.on('search-memo', (event, searchTerm) => {
  console.log(searchTerm);
  if (searchMemoWindow) {
    searchMemoWindow.webContents.send('update-memo-list', searchTerm);
  } else {
    console.log('Memo list window is not open.');
  }
});

ipcMain.on('filter-memo', (event, memoIds) => {
  console.log(memoIds);
  if (searchMemoWindow) {
    searchMemoWindow.webContents.send('filter-memo-list', memoIds);
    console.log('render로');
  } else {
    console.log('Memo list window is not open.');
  }
});

ipcMain.on('loading-start', (event) => {
  console.log('로딩시작');
  if (searchMemoWindow) {
    searchMemoWindow.webContents.send('on-loading');
  } else {
    console.log('Memo list window is not open.');
  }
});

ipcMain.on('loading-end', (event) => {
  console.log('로딩끝');
  if (searchMemoWindow) {
    searchMemoWindow.webContents.send('loading-end');
  } else {
    console.log('Memo list window is not open.');
  }
});

module.exports = { createfloatingWindow, createUsersWindow, createMemoListWindow, createSearchMemoWindow };