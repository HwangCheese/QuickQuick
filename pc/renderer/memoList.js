let userId;
let memoList;
let memos = [];
let filteredMemos = [];
let memoDataCache = {}; // 메모 ID와 텍스트 내용을 저장하는 캐시

document.addEventListener('DOMContentLoaded', async () => {
    memoList = document.getElementById('memo-list');
    memoItems = document.querySelectorAll('.memo-item');

    const observerOptions = {
        root: document.querySelector('.memo-list'),
        rootMargin: '0px',
        threshold: 0.5, // 50% 이상 보일 때 'active' 클래스를 추가
    };

    const observer = new IntersectionObserver((entries, observer) => {
        let activeItemCount = 0;

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                activeItemCount++;
                entry.target.classList.add('active'); // 화면에 들어왔을 때 클래스 추가
            } else {
                entry.target.classList.remove('active'); // 화면을 벗어나면 클래스 제거
            }
        });

        // activeItemCount가 많을수록 메모리스트의 크기를 증가시킴
        if (activeItemCount > 0) {
            const newHeight = 450 + (activeItemCount * 20); // 예시로 1개당 20px씩 늘리기
            memoList.style.maxHeight = `${Math.min(newHeight, 600)}px`; // 최대 600px로 제한
        }
    }, observerOptions);

    memoItems.forEach(item => {
        observer.observe(item);
    });
    try {
        // 사용자 아이디와 메모 데이터를 불러옴
        userId = await window.electron.getUserId(); 
        memos = await window.electron.getMemo(userId);

        if (!memos || memos.length === 0) {
            console.log("메모 데이터가 없습니다.");
            return;
        } 
        
        for(let memo of memos) {
            const getDatasById = await window.electron.getDatas(memo.memo_id); //메모 id를 통해 메모 데이터 정보 객체들 불러오기
            console.log(getDatasById);
            // 캐시에 memo_id가 없다면 초기화
            if (!memoDataCache[memo.memo_id]) {
                memoDataCache[memo.memo_id] = [];
            }

            for (const data of getDatasById) { // 메모id를 통해 불러온 메모 데이터 정보 객체들을 순회
               // const getFilePath = await window.electron.getFile(data.data_id, data.file_name); // 메모 id를 통해 메모 데이터 정보들 불러오기
                if (data.format === 'txt' && data.file_name === 'data.txt') {
                    const getFilePath = await window.electron.getFile(data.data_id, data.file_name); // 메모 id를 통해 메모 데이터 정보들 불러오기
                    const response = await fetch(getFilePath);
                    if (response.ok) {
                        const text = await response.text(); // 파일 내용을 텍스트로 읽기
                        console.log('가져온 텍스트 내용: ' + text);
                        memoDataCache[memo.memo_id].push(text);  
                    } else {
                        console.error('파일을 읽는 도중 오류 발생:', response.statusText);
                    }
                }
                else {
                    memoDataCache[memo.memo_id].push(data.file_name);
                }
            }
        }

        // 메인 프로세스에서 보내는 'update-memo-list' 이벤트를 수신
        window.electron.ipcRenderer.on('update-memo-list', (event, searchTerm) => {
            filteredMemos = memos.filter(memo => {
                const cacheEntries = memoDataCache[memo.memo_id] || [];
                console.log(`메모 ID: ${memo.memo_id}, 캐시된 데이터: ${cacheEntries}`);
                // 캐시된 텍스트 또는 파일 이름 중 검색어가 포함된 항목이 있는지 확인
                return cacheEntries.some(entry => entry.toLowerCase().includes(searchTerm.toLowerCase()));
            });
            renderMemos(filteredMemos);
        });

        renderMemos(memos); // 초기 메모 렌더링
    } catch (error) {
        console.error("server-db 연결 중 오류 발생:", error.message);
    }
});

// 메모들을 화면에 렌더링하는 함수
function renderMemos(memosToRender) {
    memoList.innerHTML = ''; // 기존 메모 항목을 초기화
    memosToRender.forEach(memo => {
        const memoItem = document.createElement('div');
        memoItem.className = 'memo-item';

        // 읽지 않은 메모에만 애니메이션 클래스 추가
        if (!memo.is_read) {
            memoItem.classList.add('unread-memo'); // CSS에서 정의된 애니메이션 클래스
        }
        // 후에 메모를 오픈하면 is_read 를 true로 수정

        memoItem.innerHTML = `<p>${memo.title}</p>`;
        memoItem.addEventListener('click', async () => {
            try {
                memoList.style.display = 'none';  // 메모를 열 때 memoList 숨기기
                window.electron.openExistMemo(memo.memo_id);
            } catch (error) {
                console.error('메모 열기 중 오류 발생:', error.message);
                alert('메모 열기 중 오류가 발생했습니다.');
            }
        });
        memoList.appendChild(memoItem); // 메모를 리스트에 추가
    });
}
