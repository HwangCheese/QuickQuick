document.addEventListener('DOMContentLoaded', () => {
  const centerButton = document.getElementById('center-btn'); // 중앙의 +/x 버튼
  const buttons = document.querySelectorAll('.toggle-visible'); // 중앙을 둘러싼 4개의 버튼들
  const usersButton = document.getElementById('right-btn');
  const newMemoButton = document.getElementById('top-btn');
  const searchButton = document.getElementById('left-btn');
  const calendarButton = document.getElementById('bottom-btn');
  const closeButton = document.getElementById('close-btn'); // close-btn 추가

  let isShow = false; // 플로팅 열기/닫기 flag

  function toggleButtons() {
    if (!isShow) {
      // 열릴 때는 먼저 창 크기를 변경하고 나서 버튼을 애니메이션으로 열기
      const newHeight = 250; // 메뉴가 열릴 때의 높이
      window.electron.resizeHeightMenu(newHeight);

      // 창 크기가 변경된 후 버튼을 보여줍니다 (약간의 지연 시간 후 실행)
      setTimeout(() => {
        buttons.forEach((button) => {
          button.classList.add('show');
        });
        isShow = true;
      }, 300); // 창 크기 조절 후 지연 시간
    } else {
      // 닫을 때는 버튼 애니메이션을 먼저 하고, 그 후 창 크기를 줄이기
      buttons.forEach((button) => {
        button.classList.remove('show');
      });

      // 버튼 애니메이션이 끝난 후 창 크기 줄이기
      setTimeout(() => {
        const newHeight = 100; // 메뉴가 닫힐 때의 높이
        window.electron.resizeHeightMenu(newHeight);
        isShow = false;
      }, 600); // 600ms는 CSS transition 시간과 일치해야 함
    }
  }

  centerButton.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 우클릭 시 기본동작을 실행하지 못하게 한다
    toggleButtons(); // 버튼을 토글
  });

  let isDragging = false;
  let offsetX, offsetY;

  centerButton.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      if (isShow) toggleButtons();
      isDragging = true;
      offsetX = e.clientX;
      offsetY = e.clientY;
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const x = e.screenX - offsetX;
      const y = e.screenY - offsetY;
      requestAnimationFrame(() => {
        updateWindowPosition(x, y);
      });
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      isDragging = false;
    }
  });

  const throttle = (func, limit) => {
    let lastFunc;
    let lastRan;
    return function () {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function () {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  };

  const updateWindowPosition = throttle((x, y) => {
    window.electron.moveFloatingWindow(x, y);
  }, 16); // 60 FPS

  usersButton.addEventListener('click', () => {
    window.electron.openUsersWindow();
  });

  calendarButton.addEventListener('click', () => {
    window.electron.openCalendarWindow();
  });

  newMemoButton.addEventListener('click', () => {
    window.electron.addMemoWindow();
  });

  searchButton.addEventListener('click', () => {
    window.electron.openSearchMemoWindow();
  });

  // close-btn에 클릭 이벤트 리스너 추가
  closeButton.addEventListener('click', () => {
    if (isShow) {
      toggleButtons(); // 메뉴를 닫기
    }
  });
});
