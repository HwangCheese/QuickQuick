document.addEventListener('DOMContentLoaded', () => {

  const button = document.querySelector('#center-btn'); // 중앙의 +/x 버튼
  const buttons = document.querySelectorAll('.toggle-visible'); // 중앙을 둘러싼 4개의 버튼들
  let isDragging = false;
  let offsetX, offsetY;

  let isShow = false; // 플로팅 열기/닫기 flag
  // function hideButtons() {
  //   buttons.forEach(button => button.style.display = 'none');
  //   isShow = false;
  // }

  // function showButtons() {
  //   buttons.forEach(button => button.style.display = 'block');
  //   isShow = true;
  // }

  function hideButtons() {
    buttons.forEach(button => button.classList.remove('show'));
    isShow = false;
  }
  
  function showButtons() {
    buttons.forEach(button => {
      button.style.display = 'block'; // 애니메이션 적용을 위해 block으로 표시
      setTimeout(() => button.classList.add('show'), 0); // 애니메이션 시작
    });
    isShow = true;
  }

  button.addEventListener('contextmenu', (e) => {
    e.preventDefault();  // 우클릭 시 기본동작을 실행하지 못하게 한다
    isShow ? hideButtons() : showButtons();
  })

  button.addEventListener('mousedown', (e) => {
    if (e.button === 0) {

      isDragging = true;
      showMenu = false;

      offsetX = e.clientX;
      offsetY = e.clientY;
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      hideButtons();

      //button.style.backgroundImage =  "url('../media/plus.png')";
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
      console.log(isShow);
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
});


