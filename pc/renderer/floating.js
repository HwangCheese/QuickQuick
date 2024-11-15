document.addEventListener('DOMContentLoaded', () => {
  const centerButton = document.getElementById('center-btn'); // 중앙의 +/x 버튼
  const buttons = document.querySelectorAll('.toggle-visible'); // 중앙을 둘러싼 4개의 버튼들
  const usersButton = document.getElementById('right-btn');
  const newMemoButton = document.getElementById('top-btn');
  const searchButton = document.getElementById('left-btn');
  const calendarButton = document.getElementById('bottom-btn');

  let isShow = false; // 플로팅 열기/닫기 flag

  function toggleButtons() {
    buttons.forEach((button) => {
      button.classList.toggle('show', !isShow); // 버튼의 show 클래스를 토글
    });

    // centerButton 색상 토글: 'isShow'에 따라 색상 변경
    // if (isShow) {
    //   //centerButton.style.backgroundColor = '#E48758'; // 초기 상태
    //   centerButton.style.color = 'white';
    // } else {
    //   centerButton.style.backgroundColor = 'white'; // 토글된 상태
    //   centerButton.style.color = '#E48758';
    // }

    isShow = !isShow;
    centerButton.classList.toggle('rotate'); // 회전 애니메이션
  }

  centerButton.addEventListener('contextmenu', (e) => {
    e.preventDefault();  // 우클릭 시 기본동작을 실행하지 못하게 한다
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

});
