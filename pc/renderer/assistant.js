const cancelButton = document.getElementById('cancelButton'); // 취소 버튼
const confirmButton = document.getElementById('confirmButton'); // 확인 버튼
const loadingScreen = document.getElementById('loading-screen'); // 로딩 화면 요소

const modal = document.getElementById('modal'); // 모달
const closeButton = document.getElementById('closeButton'); // 모달 닫기
const modalConfirmButton = document.getElementById('modalConfirmButton'); // 모달 내 확인 버튼
const modalCancleButton = document.getElementById('modalCancleButton'); // 모달 내 취소 버튼
// 이벤트 리스너 관련 코드는 319번째 줄부터

let imagePaths = []; // 이미지 파일 경로를 저장할 배열
let filePaths = []; // 기타 파일 경로를 저장할 배열

// 메모 데이터
let memoData = [];
let memoID = null;

// 로딩 화면 표시 함수
function showLoadingScreen() {
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        loadingContainer.style.display = 'flex'; // 로딩창 보이기
    }
}

// 로딩 화면 숨기기 함수
function hideLoadingScreen() {
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) {
        loadingContainer.style.display = 'none'; // 로딩창 숨기기
        document.getElementById('cancelButton').style.display = 'block';
        document.getElementById('confirmButton').style.display = 'block';
    }
}

// 페이지 로드 시 분석 중 상태 표시 및 메모 렌더링
window.onload = () => {
    console.log("로드됨");

    showLoadingScreen();

    // 기존의 setTimeout 제거
    /*
    setTimeout(() => {
        // 로딩 화면을 숨기고 콘텐츠 표시
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        document.getElementById('memoContainer').style.display = 'block';
        document.getElementById('modal').style.display = 'block';
        
        // 실제 데이터를 불러오는 함수 호출
        loadMemos();
    }, 2000);
    */

    window.electron.ipcRenderer.on('original-memo-id', (event, memoId) => {
        memoID = memoId;
        console.log(memoID);
    });

    window.electron.ipcRenderer.on('matched-indexes', (event, analyzedMemoData) => {
        console.log("window에서 받앗다");

        console.log('Received analyzedMemoData:', analyzedMemoData);
        console.log('Type of received data:', typeof analyzedMemoData);
        try {
            // JSON 문자열을 파싱하여 객체로 변환
            const parsedData = JSON.parse(analyzedMemoData);
            console.log('Parsed data:', parsedData);
            console.log('Is parsed data an array?', Array.isArray(parsedData));

            if (Array.isArray(parsedData)) {
                memoData = parsedData;
                // showLoading(false); // 분석 완료 상태 표시
                renderMemos(); // 메모 렌더링
                hideLoadingScreen(); // 분석 완료 후 로딩 화면 숨기기
            } else {
                console.error('Parsed data is not an array:', parsedData);
            }
        } catch (error) {
            console.error('Failed to parse JSON:', error);
        }
    });
};

// 파일 확장자 추출 함수
function getFileExtension(filePath) {
    return filePath.split('.').pop().toLowerCase();
}

// 미리보기가 가능한 파일인지 확인하는 함수
function isPreviewableExtension(extension) {
    const previewableExtensions = ['jpg', 'jpeg', 'png', 'txt', 'pdf']; // 미리보기가 가능한 확장자
    return previewableExtensions.includes(extension);
}

// 새 메모 추가 함수
function addMemo() {
    const newMemo = {
        index: memoData.length + 1,
        title: '새 메모',
        content: '메모 내용을 입력하세요.',
        files: []
    };
    memoData.push(newMemo);
    renderMemos(); // 화면 업데이트
}

// 메모 삭제 함수
function deleteMemo(index) {
    memoData = memoData.filter(memo => memo.index !== index);
    renderMemos(); // 화면 업데이트
}

// 텍스트 영역 크기 조정 함수
function adjustTextAreas(memoBox) {
    const content = memoBox.querySelector('.memo-content');
    const fileList = memoBox.querySelector('.file-list');

    if (fileList.children.length > 0) {
        // 파일이 있는 경우 파일 목록의 높이에 맞춰 텍스트 영역 조정
        content.style.height = '70%'; // 파일 목록을 위한 여유 공간을 남깁니다
    } else {
        // 파일이 없는 경우 기본 높이 설정
        content.style.height = '100%'; // 기본 높이
    }
}

// 메모 박스에 메모를 동적으로 추가하는 함수
function renderMemos() {
    const container = document.getElementById('memoContainer');
    container.innerHTML = ''; // 기존 내용 제거

    memoData.forEach((memo, memoIndex) => {
        // 메모 박스 생성
        const memoBox = document.createElement('div');
        memoBox.className = 'memo';

        // 제목과 내용 생성
        const title = document.createElement('textarea');
        title.className = 'memo-title';
        title.value = memo.title;
        title.spellcheck = false;
        title.addEventListener('input', () => {
            memo.title = title.value; // 제목 변경 시 즉시 저장
        });

        const content = document.createElement('textarea');
        content.className = 'memo-content';
        content.value = memo.content;
        content.spellcheck = false;
        content.addEventListener('input', () => {
            memo.content = content.value; // 내용 변경 시 즉시 저장
        });

        // 파일 목록 생성
        const fileList = document.createElement('div');
        fileList.className = 'file-list';

        memo.files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-list-item';
            fileItem.draggable = true;
            fileItem.dataset.filePath = file.filePath;
            fileItem.dataset.memoIndex = memoIndex;

            const fileLink = document.createElement('a');
            fileLink.textContent = file.displayName;

            // 파일 확장자 추출
            const fileExtension = getFileExtension(file.filePath);

            // 파일 미리보기
            if (isPreviewableExtension(fileExtension)) {
                // 미리보기 가능한 파일일 경우, 링크 설정
                fileLink.href = file.filePath;
                fileLink.target = '_blank'; // 새 창에서 열기
            } else {
                // 미리보기가 불가능한 파일일 경우, 클릭해도 아무 일도 일어나지 않도록 설정
                fileLink.href = '#'; // 기본 링크 동작 방지
                fileLink.classList.add('non-previewable'); // CSS 클래스 추가
                fileLink.addEventListener('click', (event) => {
                    event.preventDefault(); // 기본 링크 동작 방지
                });
            }

            // 삭제 버튼
            const deleteFileBtn = document.createElement('button');
            deleteFileBtn.id = "delete-file-btn"; // 고유 ID 부여
            deleteFileBtn.addEventListener('click', () => {
                memo.files = memo.files.filter(f => f.filePath !== file.filePath);
                renderMemos(); // 파일 삭제 후 화면 업데이트
            });

            // 다운로드 버튼
            const downloadBtn = document.createElement('button');
            downloadBtn.id = "download-btn"; // 고유 ID 부여
            downloadBtn.addEventListener('click', () => {
                const downloadLink = document.createElement('a');
                downloadLink.href = file.filePath;
                downloadLink.download = file.displayName; // 다운로드할 파일 이름 설정
                downloadLink.click(); // 링크 클릭으로 다운로드 유도
            });

            fileItem.appendChild(fileLink);
            fileItem.appendChild(downloadBtn);
            fileItem.appendChild(deleteFileBtn);

            // 드래그 이벤트 설정
            fileItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', fileItem.dataset.filePath);
                e.dataTransfer.setData('text/memoIndex', fileItem.dataset.memoIndex);
            });

            fileList.appendChild(fileItem);
        });

        // 메모 삭제 버튼 생성
        const deleteMemoBtn = document.createElement('button');
        deleteMemoBtn.id = 'delete-memo-btn';

        deleteMemoBtn.addEventListener('click', () => deleteMemo(memo.index));

        // 메모 박스에 제목, 내용, 파일 목록, 삭제 버튼 추가
        memoBox.appendChild(title);
        memoBox.appendChild(deleteMemoBtn);
        memoBox.appendChild(content);
        memoBox.appendChild(fileList);

        // 텍스트 영역 크기 조절
        adjustTextAreas(memoBox);

        // 드래그 앤 드롭 영역 설정
        memoBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            memoBox.classList.add('drag-over');
        });

        memoBox.addEventListener('dragleave', () => {
            memoBox.classList.remove('drag-over');
        });

        memoBox.addEventListener('drop', (e) => {
            e.preventDefault();
            memoBox.classList.remove('drag-over');

            const filePath = e.dataTransfer.getData('text/plain');
            const draggedMemoIndex = parseInt(e.dataTransfer.getData('text/memoIndex'), 10);

            if (draggedMemoIndex !== memoIndex) {
                const file = memoData[draggedMemoIndex].files.find(f => f.filePath === filePath);
                if (file) {
                    memoData[memoIndex].files.push(file);
                    memoData[draggedMemoIndex].files = memoData[draggedMemoIndex].files.filter(f => f.filePath !== filePath);
                    renderMemos(); // 파일 이동 후 화면 업데이트
                }
            }
        });

        // 메모 컨테이너에 메모 박스 추가
        container.appendChild(memoBox);
    });

    // 마지막에 추가 메모 박스 생성
    const addMemoBox = document.createElement('div');
    addMemoBox.className = 'memo add-memo-box'; // 추가 버튼이 있는 메모칸
    addMemoBox.textContent = '+';

    addMemoBox.addEventListener('click', addMemo);

    // 추가 메모 박스에 버튼 추가
    // addMemoBox.appendChild(addButton);
    container.appendChild(addMemoBox);

    // 로딩 화면 숨기기 제거
    // hideLoadingScreen();  // 이 부분을 제거
}

// 분석된 메모 생성
async function createMemos() {
    console.log("메모를 만들자");
    // 각 메모의 ID를 기반으로 saveMemo 함수를 호출
    for (const memo of memoData) {
        // 메모 ID 생성 및 창 닫기
        console.log(memo);
        await saveMemo(memo);  // 메모를 저장하는 함수
    }
}

// 분석된 메모 저장
async function saveMemo(memo) {
    const memo_ID = await window.electron.createMemoId();  // 메모 ID를 생성하는 함수 (Electron API 가정)
    console.log('생성된 메모 ID:', memo_ID);

    const filePaths = memo.files.map(file => file.filePath).join(';'); // 파일 경로를 ';'으로 구분하여 연결

    // 프레임 크기,위치,데이터 저장
    // 수정중
    // 프레임 크기와 위치는 임의로 설정
    const frameWidth = 271;
    const frameHeight = 296;
    const frameX = 596;
    const frameY = 285;
    const textData = memo.content; // 메모의 텍스트 가져오기
    const filesData = filePaths + ';'; // 파일의 경로 합본

    const title = memo.title; //메모 제목 가져오기
    const userId = await window.electron.getUserId();

    console.log(`현재 창의 크기: ${frameWidth}x${frameHeight}`);
    console.log(`현재 창의 좌표: (${frameX}, ${frameY})`);
    console.log('텍스트 데이터 경로: ' + textData);
    console.log('파일 데이터 내용: ' + filesData);
    console.log('title: ' + title);
    console.log('userId: ' + userId);
    console.log('memoId: ' + memo_ID);

    await window.electron.pushData({
        posX: frameX,
        posY: frameY,
        width: 310,
        height: 320,
        dataTxt: textData,
        filesToUpload: filesData,
        title: title,
        user_Id: userId,
        memo_id: memo_ID
    });
}

// 모달 여는 함수
function openModal() {
    updateModalContent(); // 모달 내용 업데이트
    modal.style.display = 'flex'; // 모달을 보이게 설정
}

// 모달 닫는 함수
function closeModal() {
    modal.style.display = 'none'; // 모달을 숨김
}

// 모달 내용 업데이트 함수
function updateModalContent() {
    const modalContent = document.getElementById('modalContent');
    const memoCount = memoData.length; // 메모 개수 계산
    modalContent.textContent = `${memoCount}개의 새로운 메모가 저장되었습니다.`; // 모달 내용 업데이트
}

// 취소 버튼 클릭시 프레임 닫기
cancelButton.addEventListener('click', () => window.electron.closeAssistantWindow());

// 확인 버튼 클릭 시 모달 열기 및 메모 생성
confirmButton.addEventListener('click', () => {
    openModal();
    createMemos();
});

// 모달 닫기 버튼 클릭 시 모달 닫기
closeButton.addEventListener('click', closeModal);

// 모달 닫기
modalConfirmButton.addEventListener('click', () => {
    closeModal();
    window.electron.closeAssistantWindow(); 
});
