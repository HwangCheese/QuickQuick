document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('search-floating-button');
    const input = document.getElementById('search-bar');
    let isLocked = false;
    //const currentUserId = window.electron.getUserId();

    input.addEventListener('input', async () => {
        const searchTerm = input.value;
        window.electron.ipcRenderer.send('search-memo', searchTerm); // 검색어를 memoList.js로 전송
    });

    input.addEventListener('keydown', async (event) => {
        // Enter 키를 눌렀을 때만 실행
        if (event.key === 'Enter') {
            const searchTerm = input.value.trim(); // 앞뒤 공백 제거
            if (searchTerm !== "") {  // 빈 문자열이 아닐 때만 전송
                try {
                    // 검색어를 서버로 보내서 결과 받기
                    const response = await window.electron.searchMemo(searchTerm);
                    const memoIds = response.data; // 결과에서 메모의 ID들만 받음
                    console.log("검색된 메모 ID들:", memoIds);

                    window.electron.ipcRenderer.send('filter-memo', memoIds);
                } catch (error) {
                    console.error("검색 오류:", error);
                }
            }
        }
    });

    window.electron.ipcRenderer.on('expand-floating-window', (event, message) => {
        console.log(message); 
        if (message == "left") { moveLeftButton(); }
        else { moveRightButton(); }
    });

    function moveRightButton() {
        button.style.left = "1px";
        button.style.right = "";
        button.style.backgroundPosition = "center left 8px";
      
        input.style.right = "15px";
    }

    function moveLeftButton() {
        input.style.left = "15px";
    }

    button.addEventListener('mouseover', () => {
        if (!isLocked) {
            button.classList.add('hover');
        }
    });

    button.addEventListener('mouseout', () => {
        if (!isLocked) {
            button.classList.remove('hover');
        }
    });

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (isLocked) {
            // 고정 해제 및 즉시 축소
            button.classList.remove('hover');

            input.classList.remove('expand');
            button.classList.remove('expand');
            window.electron.memoListWindow(false);

            isLocked = false;
        } else {
            // 고정
            input.focus();
            input.classList.add('expand');
            button.classList.add('expand');
            window.electron.memoListWindow(true);
            isLocked = true;
        }
    });
    // 입력 필드 클릭 시 버튼 클릭과 같은 동작을 방지
    input.addEventListener('click', (event) => {
        event.stopPropagation();
    });
});
