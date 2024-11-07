document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('#center-btn');

  let isDragging = false;
  let offsetX, offsetY;   
  let showMenu = false;
  let isClick = false;

  /*
  button.addEventListener('click', () => {
    console.log(showMenu);
    if(!showMenu){
      window.electron.openFloatingWindow();
      showMenu = true;
      button.style.backgroundImage = "url('media/exit.png')";
    }
    else{
      window.electron.closeFloatingWindow();
      showMenu = false;
      button.style.backgroundImage =  "url('media/plus.png')";
    }
  });*/
  
  button.addEventListener('mousedown', (e) => {
    //button.style.backgroundImage =  "url('media/plus.png')";
    isDragging = true;
    hideButtons();
    showMenu = false;

    offsetX = e.clientX;
    offsetY = e.clientY;

    isClick = true;
  });

  const throttle = (func, limit) => {
    let lastFunc;
    let lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
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

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      isClick = false;
      //button.style.backgroundImage =  "url('../media/plus.png')";
      const x = e.screenX - offsetX;
      const y = e.screenY - offsetY;
      requestAnimationFrame(() => {
        updateWindowPosition(x, y);
      });
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    //button.style.backgroundImage =  "url('../media/plus.png')";

    if(isClick){
      if(!showMenu){
        showButtons();
        showMenu = true;
        //button.style.backgroundImage = "url('../media/exit.png')";
      }
      else{
        hideButtons();
        showMenu = false;
        //button.style.backgroundImage =  "url('../media/plus.png')";
      }
    }
  });
});


