const menu = document.getElementById('menu'); // 메뉴
const container = document.getElementById('container'); // 메모 내의 contents를 포괄하는 container(imageDropZone+fileDropZone+textArea)
const editor = document.getElementById('editor'); // container 내의 텍스트 입력을 위한 textarea
const imageDropZone = document.getElementById('image-drop-zone'); // container 내의 이미지 삽입을 위한 dropZone
const imageDropZoneText = imageDropZone.querySelector('p'); // imageDropZone 내의 <p> 요소
const fileDropZone = document.getElementById('file-drop-zone'); // container 내의 파일 삽입을 위한 dropZone
const fileDropZoneText = fileDropZone.querySelector('p'); // fileDropZone 내의 <p> 요소
//메모 내의 메뉴가 클릭된 상태인지를 판단하는 변수
let isMemoMenuBtnClicked = 0;
//메모 내의 메뉴
const memoAddBtn = document.getElementById('add-btn'); //메모 내의 메모 추가 버튼(+)
const memoMenuBtn = document.getElementById('arrow-btn'); //메모 내의 메뉴 열기 버튼(^)
const memoCloseBtn = document.getElementById('close-btn'); //메모 내의 메모 닫기 버튼(X)
//히든 버튼
const deleteBtn = document.getElementById('delete-button'); //메모 삭제 버튼(hidden)
//프레임의 물결 효과
const waveEffect = document.getElementById('wave-effect');

// 모달 창과 닫기 버튼 선택
const modal = document.getElementById('media-modal');
const modalContent = document.getElementById('media-viewer');
const closeBtn = document.querySelector('.close');

const sendBtn = document.getElementById('send-button');
const sendModal = document.getElementById('friend-modal');
const sendModalCloseBtn = document.getElementById('friend-modal-close-button'); // x 버튼 선택
const searchFriendNameInput = document.getElementById('friend-search');

//초대
const inviteBtn = document.getElementById('call-button');
const inviteModal = document.getElementById('invite-modal');
const inviteModalCloseBtn = document.getElementById('invite-modal-close-button'); // x 버튼 선택

let isDragging = false; // 드래그 상태를 추적하기 위한 변수
let imagesDropped = false; // 이미지 드롭 유무를 파악하기 위한 변수
let filesDropped = false; // 파일 드롭 유무를 파악하기 위한 변수

let imageFiles = []; // 이미지, 동영상, 오디오 파일을 저장할 배열
let otherFiles = []; // 기타 파일을 저장할 배열

let imagePaths = []; // 이미지 파일 경로를 저장할 배열
let filePaths = []; // 기타 파일 경로를 저장할 배열

let imagePathString; // 드롭된 이미지의 경로
let filePathString; // 드롭된 파일의 경로

let getMemoData; //불러 들인 메모 데이터. 1개
let getDatasById = []; //불러 들인 메모 데이터의 id를 통해 얻은 해당 메모의 데이터 정보들의 배열. 다수 가능

let filePathMap = new Map(); // 파일 메타데이터와 경로를 매핑하는 맵

// 친구 목록 데이터
let friendNameSets = [];
let friendIDSets = [];

let tempPaths = []; 

const friendListSection = document.getElementById('friend-list-section'); // 친구 목록 섹션
const friendList = document.getElementById('friends'); // 친구 목록
const inviteListSection = document.getElementById('invite-list-section'); // 초대 목록 섹션
const inviteList = document.getElementById('invites'); // 초대 목록
const loadingScreen = document.getElementById('loading-screen'); // 로딩 화면 요소
let memo_ID;

//파일 경로를 통해 파일 객체를 생성하는 메서드
async function createFileObject(filePath) {
    try {
        loadingScreen.style.display = 'flex'; // 로딩 화면 표시
        const fileData = await window.electron.getFileObjByPath(filePath);

        // Blob으로 File 객체 생성
        const blob = new Blob([fileData.buffer], { type: fileData.type });
        const file = new File([blob], fileData.name, {
            type: fileData.type,
            //lastModified: Date.now() // 필요 시 수정 시간 설정
        });

        // 파일 경로를 맵에 저장
        filePathMap.set(file, filePath);

        console.log('File 객체:', file);
        return file;
    } catch (error) {
        console.error('파일 객체를 생성하는 도중 오류가 발생했습니다:', error);
        return null; // 오류 발생 시 null 반환
    }
    finally {
        loadingScreen.style.display = 'none'; // 파일 불러오기 후 로딩 화면 제거
    }
}

//맵에 저장된 File객체의 경로를 리턴하는 메서드
function getFilePathByMap(file) {
    return filePathMap.get(file);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 비동기 함수로 메모 데이터 요청
        getMemoData = await window.electron.getExistMemoData(); //메모 리스트에서 선택된 메모 데이터 불러오기(크기, 위치, 메모 id 등)
        console.log('메모의 정보' + getMemoData);

        memo_ID = getMemoData.memo_id;

        getDatasById = await window.electron.getDatas(getMemoData.memo_id); //메모 id를 통해 메모 데이터 정보 객체들 불러오기
        console.log(getDatasById);

        for (const data of getDatasById) { // 메모id를 통해 불러온 메모 데이터 정보 객체들을 순회
            const getFilePath = await window.electron.getFile(data.data_id, data.file_name); // 메모 id를 통해 메모 데이터 정보들 불러오기
            console.log('얻어낸 파일 경로:', getFilePath);
                                       
            tempPaths.push(getFilePath);

            // textArea의 text 내용일 경우
            if (data.format === 'txt' && data.file_name === 'data.txt') {
                // fetch를 사용하여 파일 내용 읽기
                const response = await fetch(getFilePath);
                if (response.ok) {
                    const text = await response.text(); // 파일 내용을 텍스트로 읽기
                    console.log('가져온 텍스트 내용: ' + text);
                    editor.value = text; // editor에 파일 내용 넣기
                } else {
                    console.error('파일을 읽는 도중 오류 발생:', response.statusText);
                }
            }
            //textArea가 아닌 파일의 경우,
            else {
                const file = await createFileObject(getFilePath); //파일 경로를 통해 파일 객체 생성하여 저장
                if (file) {
                    // 파일을 blob URL로 변환
                    const fileUrl = URL.createObjectURL(file);
                    console.log('파일이다 이자시가~ 파일 객체:' + file);
                    //파일 객체 콘솔에 잘 찍히는지 서버 연결 후 확인...
                    //파일 객체를 imageFiles[]등에 넣는 코드 필요...
                    //file 렌더링 후 생성된 mediaElement를 버튼과ㅏ 함께 listener달아 UI상에 출력할 것

                    //이미지 등 미디어 파일일 때..
                    if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) { // 이미지, 동영상, 오디오 파일일 경우
                        imagesDropped = true;  // 이미지 드롭 유무 설정
                        imageFiles.push(file);  // imageFiles 배열에 추가 

                        const mediaContainer = document.createElement('div'); // 미디어 파일을 담을 div 요소를 생성
                        mediaContainer.classList.add('media-container'); // media-container 클래스를 추가

                        let mediaElement;
                        if (file.type.startsWith('image/')) { // 이미지 파일인 경우
                            mediaElement = document.createElement('img'); // 이미지를 표시할 img 요소를 생성
                        } else if (file.type.startsWith('video/')) { // 비디오 파일인 경우
                            mediaElement = document.createElement('video'); // 동영상을 표시할 video 요소를 생성
                            mediaElement.controls = true; // 동영상 컨트롤 표시
                        } else if (file.type.startsWith('audio/')) { // 오디오 파일인 경우
                            mediaElement = document.createElement('audio'); // 오디오를 표시할 audio 요소를 생성
                            mediaElement.controls = true; // 오디오 컨트롤 표시
                        }
                        // file 렌더링
                        mediaElement.src = fileUrl; // FileReader가 읽어온 데이터를 소스로 설정
                        setupMediaElement(mediaElement); // 미디어 요소에 클릭 이벤트 리스너를 추가

                        const removeButton = document.createElement('button'); // 제거 버튼 생성
                        removeButton.textContent = 'X'; // 제거 버튼에 'X' 텍스트 추가
                        removeButton.classList.add('remove-btn'); // 제거 버튼에 클래스 추가
                        // X 버튼 클릭 시, 이벤트 리스너 추가
                        removeButton.addEventListener('click', () => {
                            // 클릭된 컨테이너에 대한 인덱스 찾기
                            const index = Array.from(imageDropZone.children).indexOf(mediaContainer);
                            console.log(imageDropZone.children);
                            console.log(index);
                            if (index > -1) {
                                // imageFiles 배열에서 해당 인덱스의 파일을 제거
                                imageFiles.splice(index - 1, 1);
                                console.log(`삭제된 파일: ${file.name}`); // 삭제된 파일 이름 출력
                                console.log(`삭제된 파일의 경로: ${getFilePathByMap(file)}`); //삭제된 파일의 경로 출력

                            }
                            mediaContainer.remove(); // DropZone 에서 mediaContainer 제거

                            if (imageDropZone.children.length === 1) { // 만약 imageDropZone에 자식 요소가 없으면,
                                imageDropZoneText.style.display = 'block'; // imageDropZoneText를 다시 표시
                                imageDropZone.style.display = 'none'; // imageDropZone 숨기기
                                imagesDropped = false; // 이미지 드롭 상태 초기화
                            }
                        });

                        const downloadButton = createDownloadButton(file); // 다운로드 버튼 생성

                        mediaContainer.appendChild(mediaElement); // 미디어 요소를 mediaContainer에 추가
                        mediaContainer.appendChild(removeButton); // 제거 버튼을 mediaContainer에 추가
                        mediaContainer.appendChild(downloadButton); // 다운로드 버튼을 mediaContainer에 추가
                        imageDropZone.appendChild(mediaContainer); // 완성된 mediaContainer를 imageDropZone에 추가

                        imageDropZoneText.style.display = 'none'; // 이미지 드롭 존의 텍스트 숨기기
                        //imageDropZone.style.display = 'flex'; // 이미지 드롭 존 표시

                        // 그리드 형식으로 배치
                        imageDropZone.style.display = 'grid'; //그리드 형식으로 배치하도록 설정
                        imageDropZone.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))'; //그리드의 열을 정의, 가능한 많은 열을 자동으로 채움
                        imageDropZone.style.gap = '5px'; //그리드 아이템 사이의 간격을 5px로 설정

                        // 메모장 프레임 크기에 따라 요소 크기 조절
                        const resizeObserver = new ResizeObserver(() => {
                            const mediaContainers = imageDropZone.querySelectorAll('.media-container'); //imageDropZone 내의 모든 .media-container 클래스를 가진 요소들을 선택, 이 요소들은 각 이미지나 미디어 파일을 담고 있는 컨테이너
                            const size = Math.min(imageDropZone.clientWidth / Math.floor(imageDropZone.clientWidth / 100), 150); //imageDropZone의 너비를 기준으로 각 미디어 컨테이너의 크기를 계산
                            mediaContainers.forEach(container => {
                                container.style.width = `${size}px`; // 요소 너비 조절
                                container.style.height = `${size}px`; // 요소 높이 조절
                                // 테두리 스타일 추가
                                container.style.border = '2px solid #E0E0E0'; // 테두리 색상과 두께 설정
                            });
                        });
                        resizeObserver.observe(container); // container 크기 변화를 감시하여 크기 조절 실행
                    }
                    else { // 기타 파일일 경우
                        otherFiles.push(file); // otherFiles 배열에 추가
                        let filesDropped = true; // 파일 드롭 유무를 파악하기 위한 변수

                        const fileContainer = document.createElement('div'); // 파일 정보를 담을 div 요소를 생성
                        fileContainer.classList.add('file-container'); // file-container 클래스를 추가

                        const fileInfo = document.createElement('p'); // 파일 이름과 해당 파일의 제거 및 다운로드 버튼을 표시할 p 요소를 생성
                        fileInfo.addEventListener('mouseover', () => {
                            fileInfo.style.cursor = 'pointer'; // 커서를 context-menu로 변경
                        });
                        //fileInfo.textContent = file.name; // p 요소에 파일 이름 추가

                        const fileLink = document.createElement('a');
                        fileLink.style.color = 'red'; // 파란색 글씨로 설정
                        const fileExtension = file.name.split('.').pop().toLowerCase(); //파일 이름에서 확장자 추출
                        console.log('파일 확장자' + fileExtension);

                        fileLink.textContent = `${file.name}`;
                        fileLink.target = '_blank'; // 새 탭에서 열기
                        fileLink.addEventListener('click', () => {
                            window.electron.runFile(getFilePath);
                        })
                        // <a> 태그를 <p> 요소에 추가합니다.
                        fileInfo.appendChild(fileLink);

                        const removeButton = document.createElement('button'); // 파일을 삭제할 버튼을 생성
                        removeButton.textContent = 'X'; // 버튼에 'X'라는 텍스트 추가
                        removeButton.classList.add('remove-btn'); // 버튼에 remove-btn 클래스를 추가

                        removeButton.addEventListener('click', () => { // X 버튼 클릭 시,
                            // 클릭된 컨테이너에 대한 인덱스 찾기
                            const index = Array.from(fileDropZone.children).indexOf(fileContainer);

                            if (index > -1) {
                                // otherFiles 배열에서 해당 인덱스의 파일을 제거
                                otherFiles.splice(index - 1, 1);
                                console.log(`삭제된 파일: ${file.name}`); // 삭제된 파일 이름 출력

                                // imagePaths 배열에서 해당 파일 경로를 제거
                                //     filePaths.splice(index, 1);
                                //     filePathString = filePaths.join(';'); // 경로 배열을 다시 문자열로 병합
                                //     console.log('업데이트된 기타 파일들의 경로:', filePathString); // 업데이트된 경로 출력
                            }
                            fileContainer.remove(); // fileContainer 제거

                            if (fileDropZone.children.length === 1) { // 만약 fileDropZone에 자식 요소가 없으면,
                                fileDropZoneText.style.display = 'block'; // fileDropZoneText를 다시 표시
                                fileDropZone.style.display = 'none'; // fileDropZone 숨기기
                                filesDropped = false; // 파일 드롭 상태 초기화
                            }
                        });

                        // 다운로드 버튼 생성 및 추가
                        const downloadButton = createDownloadButton(file);

                        fileInfo.appendChild(downloadButton); // fileInfo에 다운로드 버튼 추가
                        fileInfo.appendChild(removeButton); // fileInfo에 삭제 버튼 추가
                        fileContainer.appendChild(fileInfo); // fileContainer에 파일 이름, 다운로드 및 삭제 버튼을 포괄하는 fileInfo 추가
                        fileDropZone.appendChild(fileContainer); // fileContainer를 fileDropZone에 추가하여 파일 표시

                        fileDropZoneText.style.display = 'none'; // 파일 드롭 존의 텍스트 숨기기
                        fileDropZone.style.display = 'flex'; // 파일 드롭 존 나타내기
                    }
                }
                else {
                    console.error('파일 객체 생성 실패');
                }
            }
        }
        //메모삭제
        window.electron.deleteMemo(getMemoData.memo_id);
        memo_ID = await window.electron.createMemoId();
    } catch (error) {
        console.error('Error fetching memo data:', error);
    }
});

// 드롭 후 이미지 드롭 존 텍스트 및 표시 여부 업데이트
function imageDropZoneStateUpdate(imagesDropped) {
    if (imagesDropped) {
        imageDropZoneText.style.display = 'none'; // 이미지 드롭 존의 텍스트 숨기기
    } else {
        imageDropZoneText.style.display = 'flex'; // 이미지 드롭 존의 텍스트 표시
    }
}
// 드롭 후 파일 드롭 존 텍스트 및 표시 여부 업데이트
function fileDropZomeStateUpdate(filesDropped) {
    if (filesDropped) {
        fileDropZoneText.style.display = 'none'; // 파일 드롭 존의 텍스트 숨기기
    } else {
        fileDropZoneText.style.display = 'flex'; // 파일 드롭 존의 텍스트 표시
    }
}

// 모달 창을 여는 함수
function openModal(mediaElement) {
    modal.style.display = 'block';
    // 모달에 미디어 요소 추가
    modalContent.innerHTML = ''; // 기존 내용을 지우고
    const clonedElement = mediaElement.cloneNode(true); // 복제하여 추가
    clonedElement.style.width = '100%'; // 모달에 맞게 크기 조정
    clonedElement.style.height = 'auto'; // 비율 유지
    modalContent.appendChild(clonedElement); // 모달에 미디어 요소 추가
}

// 클릭 이벤트가 전파되도록 설정
function setupMediaElement(mediaElement) {
    mediaElement.style.cursor = 'pointer'; // 커서를 포인터로 변경하여 클릭 가능한 느낌을 줍니다.
    mediaElement.addEventListener('click', (event) => {
        // 이벤트 전파 방지
        event.stopPropagation();
        openModal(mediaElement);
    });
}

// 모달 창을 닫는 함수
function closeModal() {
    modal.style.display = 'none';
}

// 모달 창의 닫기 버튼 클릭 시 모달 닫기
closeBtn.addEventListener('click', closeModal);

// 모달 창 외부 클릭 시 모달 닫기
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// 다운로드 버튼 생성 메서드
function createDownloadButton(file, url) {
    const template = document.getElementById('download-button-template'); // 다운로드 버튼 템플릿 가져오기
    const downloadButton = template.content.cloneNode(true).querySelector('button'); // 템플릿에서 버튼 복제

    downloadButton.addEventListener('click', () => {
        const link = document.createElement('a'); // a 태그 생성
        link.href = url || URL.createObjectURL(file); // 파일 URL 설정
        link.download = file.name; // 다운로드할 파일 이름 설정
        link.click(); // 다운로드 실행
    });

    return downloadButton; // 생성된 다운로드 버튼 반환
}

// 프레임 focus 시, 메뉴를 표시하고 텍스트 필드의 높이를 조정
editor.addEventListener('focus', () => {
    closeHiddenMenu(); //히든 메뉴 숨기기
    isMemoMenuBtnClicked=0; //히든 메뉴 닫힘
    
    menu.style.display = 'block'; // 메뉴 표시
    container.style.setProperty('top', '110px', 'important'); // container 상단 높이 조정
    //container.style.setProperty('bottom', '50px', 'important'); // container 하단 높이 조정
});

// 프레임 focus가 해제될 시, 메뉴를 숨기고 container의 높이를 원래대로 복원
editor.addEventListener('blur', () => {
    setTimeout(() => {
        if (!editor.matches(':focus')) { // editor에 포커스가 없을 때
            menu.style.display = 'none'; // 메뉴 숨기기
            container.style.setProperty('top', '80px', 'important'); // container 상단 높이를 원래대로 복원
            //container.style.setProperty('bottom', '10px', 'important'); // container 하단 높이를 원래대로 복원
        }
    }, 200);
});

// 드래그 앤 드롭 이벤트 핸들러 - container
container.addEventListener('dragover', (event) => { // 사용자가 드래그한 항목이 container 영역 위를 지나갈 때,
    event.preventDefault(); // drag&drop의 기본 동작(브라우저에서의 파일 open or download) 방지
    if (!isDragging) {
        isDragging = true; // 드래그 상태를 true로 설정
        imageDropZone.style.display = 'flex'; // 이미지 드롭 존 표시
        fileDropZone.style.display = 'flex'; // 파일 드롭 존 표시
    }
});

container.addEventListener('dragleave', (event) => { // container 영역 위로 드래그 중이 아니라면,
    event.preventDefault();
    // dropZone이 갑자기 사라지는 것을 방지하기 위해, 1초의 시간 지연 후 dropZone 숨김
    setTimeout(() => {
        if (!imagesDropped && !imageDropZone.matches(':hover')) { // 이미지가 드롭되지 않았고, imageDropZone에 마우스가 위치하지 않으면,
            // imageDropZone.style.display = 'none'; // 이미지 드롭 존 숨기기
        }
        if (!filesDropped && !fileDropZone.matches(':hover')) { // 파일이 드롭되지 않았고, fileDropZone에 마우스가 위치하지 않으면,
            // fileDropZone.style.display = 'none'; // 파일 드롭 존 숨기기
        }
        isDragging = false; // 드래그 상태를 false로 설정
    }, 1000);
});

container.addEventListener('drop', (event) => { // container 영역에 드롭했을 때 발생하는 drop 이벤트 처리
    event.preventDefault();
    const files = event.dataTransfer.files; // files는 유사 배열인 fileList객체, drag&drop으로 전달된 파일 객체를 순서대로 files객체에 저장
    isDragging = false; // 드래그 상태 종료

    const getImageFilesArr = []; //파일을 새로 담아 imageFiles로 전달해주는 배열
    const getOtherFilesArr = []; //파일을 새로 담아 otherFiles로 전달해주는 배열

    if (files.length > 0) { // drop된 파일이 한 개 이상일 때,
        getImageFilesArr.splice(0, getImageFilesArr.length); //배열 초기화
        getOtherFilesArr.splice(0, getOtherFilesArr.length); //배열 초기화

        for (const file of files) { // 드롭된 파일 목록 순회
            if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) { // 이미지, 동영상, 오디오 파일일 경우
                getImageFilesArr.push(file); //새로 드롭된 파일 담기///////////
                //imageFiles.push(file); // imageFiles 배열에 추가 
                console.log(file.name + ' 추가'); // 드롭 순서대로 imageFiles배열에 추가되는지 확인
            } else { // 기타 파일일 경우
                getOtherFilesArr.push(file); //새로 드롭된 파일 담기 //////////////
                //otherFiles.push(file); // otherFiles 배열에 추가
                console.log(file.name + ' 추가'); // 드롭 순서대로 otherFiles배열에 추가되는지 확인
            }
        }

        // 이미지 및 미디어 파일 처리
        //if (imageFiles.length > 0) { ////////////////
        if (getImageFilesArr.length > 0) {
            imagesDropped = true; // 이미지 드롭 유무 설정

            const fileReaders = []; // FileReader를 저장할 배열

            //for (const file of imageFiles) { // 이미지 파일 목록 순회
            for (const file of getImageFilesArr) { // 이미지 파일 목록 순회 ///////////////
                imageFiles.push(file); // imageFiles 배열에 추가  //////////////////
                const reader = new FileReader(); // FileReader 객체를 생성하여 파일을 읽을 준비
                const readerPromise = new Promise((resolve) => { //비동기 처리로 인한 오류를 해결하기 위한 동기화, promise처리.
                    reader.onload = (e) => {
                        resolve({ result: e.target.result, file }); // 결과와 파일을 반환
                    };
                });

                fileReaders.push(readerPromise); // FileReader 프로미스를 배열에 추가
                reader.readAsDataURL(file); // FileReader를 사용해 파일을 읽기 시작
            }

            Promise.all(fileReaders).then((loadedFiles) => { // 모든 파일이 로드되면 처리
                loadedFiles.forEach(({ result, file }) => {
                    const mediaContainer = document.createElement('div'); // 미디어 파일을 담을 div 요소를 생성
                    mediaContainer.classList.add('media-container'); // media-container 클래스를 추가

                    let mediaElement;
                    if (file.type.startsWith('image/')) { // 이미지 파일인 경우
                        mediaElement = document.createElement('img'); // 이미지를 표시할 img 요소를 생성
                    } else if (file.type.startsWith('video/')) { // 비디오 파일인 경우
                        mediaElement = document.createElement('video'); // 동영상을 표시할 video 요소를 생성
                        mediaElement.controls = true; // 동영상 컨트롤 표시
                    } else if (file.type.startsWith('audio/')) { // 오디오 파일인 경우
                        mediaElement = document.createElement('audio'); // 오디오를 표시할 audio 요소를 생성
                        mediaElement.controls = true; // 오디오 컨트롤 표시
                    }

                    mediaElement.src = result; // FileReader가 읽어온 데이터를 소스로 설정
                    setupMediaElement(mediaElement); // 미디어 요소에 클릭 이벤트 리스너를 추가

                    const removeButton = document.createElement('button'); // 제거 버튼 생성
                    removeButton.textContent = 'X'; // 제거 버튼에 'X' 텍스트 추가
                    removeButton.classList.add('remove-btn'); // 제거 버튼에 클래스 추가
                    // X 버튼 클릭 시, 이벤트 리스너 추가
                    removeButton.addEventListener('click', () => {
                        // 클릭된 컨테이너에 대한 인덱스 찾기
                        const index = Array.from(imageDropZone.children).indexOf(mediaContainer);
                        console.log(imageDropZone.children);
                        console.log(index);
                        if (index > -1) {
                            // imageFiles 배열에서 해당 인덱스의 파일을 제거
                            imageFiles.splice(index - 1, 1);
                            console.log(`삭제된 파일: ${file.name}`); // 삭제된 파일 이름 출력

                            //imagePaths 배열에서 해당 파일 경로를 제거
                            //imagePaths.splice(index, 1);
                            //imagePathString = imagePaths.join(';'); // 경로 배열을 다시 문자열로 병합
                            //console.log('업데이트된 이미지 파일들의 경로:', imagePathString); // 업데이트된 경로 출력
                        }
                        mediaContainer.remove(); // DropZone 에서 mediaContainer 제거

                        if (imageDropZone.children.length === 1) { // 만약 imageDropZone에 자식 요소가 없으면,
                            imageDropZoneText.style.display = 'block'; // imageDropZoneText를 다시 표시
                            imageDropZone.style.display = 'none'; // imageDropZone 숨기기
                            imagesDropped = false; // 이미지 드롭 상태 초기화
                        }
                    });

                    const downloadButton = createDownloadButton(file); // 다운로드 버튼 생성

                    mediaContainer.appendChild(mediaElement); // 미디어 요소를 mediaContainer에 추가
                    mediaContainer.appendChild(removeButton); // 제거 버튼을 mediaContainer에 추가
                    mediaContainer.appendChild(downloadButton); // 다운로드 버튼을 mediaContainer에 추가

                    imageDropZone.appendChild(mediaContainer); // 완성된 mediaContainer를 imageDropZone에 추가

                    // 그리드 형식으로 배치
                    imageDropZone.style.display = 'grid'; //그리드 형식으로 배치하도록 설정
                    imageDropZone.style.gridTemplateColumns = 'repeat(auto-fill, minmax(100px, 1fr))'; //그리드의 열을 정의, 가능한 많은 열을 자동으로 채움
                    imageDropZone.style.gap = '5px'; //그리드 아이템 사이의 간격을 5px로 설정

                    // 메모장 프레임 크기에 따라 요소 크기 조절
                    const resizeObserver = new ResizeObserver(() => {
                        const mediaContainers = imageDropZone.querySelectorAll('.media-container'); //imageDropZone 내의 모든 .media-container 클래스를 가진 요소들을 선택, 이 요소들은 각 이미지나 미디어 파일을 담고 있는 컨테이너
                        const size = Math.min(imageDropZone.clientWidth / Math.floor(imageDropZone.clientWidth / 100), 150); //imageDropZone의 너비를 기준으로 각 미디어 컨테이너의 크기를 계산
                        mediaContainers.forEach(container => {
                            container.style.width = `${size}px`; // 요소 너비 조절
                            container.style.height = `${size}px`; // 요소 높이 조절
                            // 테두리 스타일 추가
                            container.style.border = '2px solid #E0E0E0'; // 테두리 색상과 두께 설정
                        });
                    });
                    resizeObserver.observe(container); // container 크기 변화를 감시하여 크기 조절 실행
                });
            });
        }

        // 기타 파일 처리
        //if (otherFiles.length > 0) {
        if (getOtherFilesArr.length > 0) {
            loadingScreen.style.display = 'flex'; // 로딩 화면 표시

            filesDropped = true; // 파일 드롭 유무 설정

            const fileReaders = []; // FileReader를 저장할 배열

            //for (const file of otherFiles) {// 기타 파일 목록 순회
            for (const file of getOtherFilesArr) {// 새로 드롭된 파일 목록 순회 ///////////////
                otherFiles.push(file); // otherFiles 배열에 추가  //////////////////
                const reader = new FileReader(); // FileReader 객체를 생성하여 파일을 읽을 준비
                const readerPromise = new Promise((resolve) => { //비동기 처리로 인한 오류를 해결하기 위한 promise처리.
                    reader.onload = (e) => {
                        resolve({ result: e.target.result, file }); // 결과와 파일을 반환
                    };
                });

                fileReaders.push(readerPromise); // FileReader 프로미스를 배열에 추가
                reader.readAsDataURL(file); // FileReader를 사용해 파일을 읽기 시작
            }

            Promise.all(fileReaders).then((loadedFiles) => { // 모든 파일이 로드되면 처리
                loadingScreen.style.display = 'none'; // 파일 불러오기 후 로딩 화면 제거
                
                loadedFiles.forEach(({ result, file }) => {
                    const fileContainer = document.createElement('div'); // 파일 정보를 담을 div 요소를 생성
                    fileContainer.classList.add('file-container'); // file-container 클래스를 추가


                    const fileInfo = document.createElement('p'); // 파일 이름과 해당 파일의 제거 및 다운로드 버튼을 표시할 p 요소를 생성
                    fileInfo.addEventListener('mouseover', () => {
                        fileInfo.style.cursor = 'pointer'; // 커서를 context-menu로 변경
                    });

                    const fileLink = document.createElement('a');
                    fileLink.style.color = 'red'; // 파란색 글씨로 설정
                    const fileExtension = file.name.split('.').pop().toLowerCase(); //파일 이름에서 확장자 추출

                    fileLink.textContent = `${file.name}`;
                    fileLink.target = '_blank'; // 새 탭에서 열기
                    fileLink.addEventListener('click', () => {
                        window.electron.runFile(getFilePath);
                    });
                    // <a> 태그를 <p> 요소에 추가합니다.
                    fileInfo.appendChild(fileLink);
                    console.log('파일 확장자' + fileExtension);

                    const removeButton = document.createElement('button'); // 파일을 삭제할 버튼을 생성
                    removeButton.textContent = 'X'; // 버튼에 'X'라는 텍스트 추가
                    removeButton.classList.add('remove-btn'); // 버튼에 remove-btn 클래스를 추가

                    removeButton.addEventListener('click', () => { // X 버튼 클릭 시,
                        // 클릭된 컨테이너에 대한 인덱스 찾기
                        const index = Array.from(fileDropZone.children).indexOf(fileContainer);

                        //fileInfo.textContent = file.name; // p 요소에 파일 이름 추가

                        if (index > -1) {
                            // otherFiles 배열에서 해당 인덱스의 파일을 제거
                            otherFiles.splice(index - 1, 1);
                            console.log(`삭제된 파일: ${file.name}`); // 삭제된 파일 이름 출력

                            // imagePaths 배열에서 해당 파일 경로를 제거
                            //     filePaths.splice(index, 1);
                            //     filePathString = filePaths.join(';'); // 경로 배열을 다시 문자열로 병합
                            //     console.log('업데이트된 기타 파일들의 경로:', filePathString); // 업데이트된 경로 출력
                        }
                        fileContainer.remove(); // fileContainer 제거

                        if (fileDropZone.children.length === 1) { // 만약 fileDropZone에 자식 요소가 없으면,
                            fileDropZoneText.style.display = 'block'; // fileDropZoneText를 다시 표시
                            fileDropZone.style.display = 'none'; // fileDropZone 숨기기
                            filesDropped = false; // 파일 드롭 상태 초기화
                        }
                    });

                    // 다운로드 버튼 생성 및 추가
                    const downloadButton = createDownloadButton(file);

                    fileInfo.appendChild(downloadButton); // fileInfo에 다운로드 버튼 추가
                    fileInfo.appendChild(removeButton); // fileInfo에 삭제 버튼 추가
                    fileContainer.appendChild(fileInfo); // fileContainer에 파일 이름, 다운로드 및 삭제 버튼을 포괄하는 fileInfo 추가
                    fileDropZone.appendChild(fileContainer); // fileContainer를 fileDropZone에 추가하여 파일 표시
                });
            });
        }
    }
    imageDropZoneStateUpdate(imagesDropped);
    fileDropZomeStateUpdate(filesDropped);
});


//숨겨진 메모의 메뉴들을 시각화하는 함수
function openHiddenMenu() {
    if (!isMemoMenuBtnClicked) {
        waveEffect.style.display="block"; //프레임 웨이브 표시

        deleteBtn.style.display = "block"; //삭제 버튼 표시
        recorderBtn.style.display = "block"; //녹음 버튼 표시
        inviteBtn.style.display = 'block'; // 초대 버튼 표시
        sendBtn.style.display = "block"; //전송 버튼 표시

        //memoMenuBtn.src = "../media/close-arrow-icon"; // 버튼 아이콘 변경
    }
}
//숨겨진 메모의 메뉴들을 안보이게 하는 함수
function closeHiddenMenu() {
    if (isMemoMenuBtnClicked) {
        waveEffect.style.display="none"; //프레임 웨이브 숨기기

        deleteBtn.style.display = "none"; //삭제 버튼 숨기기
        recorderBtn.style.display = "none"; //녹음 버튼 숨기기
        inviteBtn.style.display = 'none'; // 초대 버튼 숨기기
        sendBtn.style.display = "none"; //전송 버튼 숨기기

        //memoMenuBtn.src = "../media/open-arrow-icon"; // 버튼 아이콘 변경
    }
}

const deleteAllTempFiles = async () => {
    for (const filePath of tempPaths) {
        await window.electron.deleteTemp(filePath); // 각 파일 경로로 deleteTemp 호출
        console.log(`삭제된 파일: ${filePath}`);
    }
    tempPaths.length = 0; // 배열 비우기
};

// "닫기" 버튼 클릭 시, 메모 내용을 저장하고 창을 닫음
memoCloseBtn.addEventListener('click', async () => {
    //memo_ID = await window.electron.createMemoId();
    console.log(memo_ID);
    await saveAndClose(memo_ID);
    console.log('저장');
    deleteAllTempFiles();
    window.electron.closeMemoWindow();
});

// "메뉴 열기" 버튼 클릭 시, 추가 메뉴 시각화
memoMenuBtn.addEventListener('click', () => {
    openHiddenMenu(); //히든 메뉴 시각화
    isMemoMenuBtnClicked=1; //히든 메뉴 열림
});

// "추가" 버튼 클릭 시, 새 창을 열고 현재 창의 크기와 좌표를 출력
memoAddBtn.addEventListener('click', async () => {
    window.electron.addMemoWindow();
});

// 메모를 저장하고 메모 창을 닫는 함수 - 창을 닫을 때, 전송 버튼을 누를때 실행됨.
// 호출 직전에 memo_ID 생성해서 매개변수로 전달해줘야함.
async function saveAndClose(memo_ID) {
    //이미지 파일 경로 저장
    imagePaths.splice(0, imagePaths.length); //경로 배열 초기화
    for (const file of imageFiles) { // 이미지 파일 목록 순회
        //file의 경로가 없다면
        if (file.path === "") {
            imagePaths.push(getFilePathByMap(file));  //맵을 사용하여 파일의 경로 찾아 추가
        }
        //파일의 경로가 있다면
        else {
            imagePaths.push(file.path); // 파일의 전체 경로를 배열에 추가
        }
    }
    imagePathString = imagePaths.join(';'); // 이미지 파일 경로를 ';'으로 구분하여 연결
    console.log('이미지 파일들의 경로:', imagePathString); // 경로 출력

    //기타 파일 경로 저장
    filePaths.splice(0, filePaths.length); //경로 배열 초기화
    for (const file of otherFiles) { // 기타 파일 목록 순회
        //파일의 경로가 없다면
        if (file.path === "") {
            filePaths.push(getFilePathByMap(file)); // 맵을 통해 파일의 경로 찾아 추가
        }
        else {
            filePaths.push(file.path); // 파일의 전체 경로를 배열에 추가
        }
    }
    filePathString = filePaths.join(';'); // 기타 파일 경로를 ';'으로 구분하여 연결
    console.log('기타 파일들의 경로:', filePathString); // 경로 출력

    //프레임 크기,위치,데이터 저장
    const frameWidth = window.innerWidth;
    const frameHeight = window.innerHeight;
    const frameX = window.screenX;
    const frameY = window.screenY;
    const textData = editor.value; // textarea의 텍스트 가져오기
    let filesData = imagePathString + ';' + filePathString; // 드롭된 파일의 경로 합본
    if(filesData===';'){
        filesData=' ';
    }
    const textAndFilesData = textData + ' ' + filesData; // 텍스트와 파일 경로를 합칩니다
    const title = await window.electron.generateTitle(textAndFilesData); // 제목 요약 API 호출
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
        width: frameWidth,
        height: frameHeight,
        dataTxt: textData,
        filesToUpload: filesData,
        title: title,
        user_Id: userId,
        memo_id: memo_ID
    });
    //window.electron.closeMemoWindow();
}

// 아래는 전송과 관련된 코드
// 메모 창에서 "전송" 버튼 클릭 시, 친구 목록 가져오기
document.getElementById('send-button').addEventListener('click', async () => {
    sendModal.style.display = 'block';
    friendListSection.style.display = 'block';

    const data = await fetchUserData();
    friendIDSets = data.map(item => item.friend_id);
    friendNameSets = data.map(item => item.friend_name_set);

    console.log(friendNameSets); // ["강인한 고양이", "고요한 구름", "아린"]

    // 친구 목록 표시
    displayFriendList(friendNameSets, friendIDSets);
});

// 화상회의
document.getElementById('call-button').addEventListener('click', async () => {
    inviteModal.style.display = 'block';
    inviteListSection.style.display = 'block';

    const data = await fetchUserData();
    friendIDSets = data.map(item => item.friend_id);
    friendNameSets = data.map(item => item.friend_name_set);
    console.log(friendNameSets);

    // 친구 목록 표시
    displayInviteList(friendNameSets, friendIDSets);
});

// 친구 목록을 불러와 <ul>에 표시하는 함수
function displayFriendList(friends, ids) {
    friendList.innerHTML = ''; // 기존 목록 초기화

    friends.forEach((friendName, index) => {
        const newFriendItem = document.createElement('li');
        newFriendItem.classList.add('friend-item');
        newFriendItem.innerHTML = `
            <input type="checkbox" class="friend-checkbox" data-id="${ids[index]}">
            <span class="friend-name" contenteditable="false">${friendName}</span>
        `;
        console.log(ids[index]);
        friendList.appendChild(newFriendItem);
    });
}

// 초대목록을 <ul>에 표시하는 함수
function displayInviteList(friends, ids) {
    inviteList.innerHTML = ''; // 기존 목록 초기화
    friends.forEach((friendName, index) => {
        const newFriendItem = document.createElement('li');
        newFriendItem.classList.add('invite-item');
        newFriendItem.innerHTML = `
            <input type="checkbox" class="invite-checkbox" data-id="${ids[index]}">
            <span class="friend-name" contenteditable="false">${friendName}</span>
        `;
        console.log(ids[index]);
        inviteList.appendChild(newFriendItem);
    });
}


// 전송 모달 : x 버튼 클릭 시 모달 닫기
sendModalCloseBtn.addEventListener('click', function () {
    sendModal.style.display = 'none'; // 모달 숨기기
    searchFriendNameInput.value = ''; // 입력 필드 초기화
});

// 초대 모달 : x 버튼 클릭 시 모달 닫기
inviteModalCloseBtn.addEventListener('click', function () {
    inviteModal.style.display = 'none'; // 모달 숨기기
});

// 전송 모달 : 검색창에 전송할 친구 검색
searchFriendNameInput.addEventListener('input', function () {
    const searchQuery = this.value.toLowerCase(); // 입력된 검색어를 소문자로 변환
    const filteredFriends = friendNameSets.filter(name => name.toLowerCase().includes(searchQuery));
    displayFriendList(filteredFriends); // 검색어에 맞는 친구 목록 표시
});

// 전송할(체크된) 친구 ID를 가져오는 함수
function getCheckedFriendsIDs() {
    const checkedFriendsIDs = [];
    const friendCheckboxes = document.querySelectorAll('#friends .friend-checkbox');

    friendCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            // 체크된 친구의 ID를 가져옵니다.
            const friendID = checkbox.getAttribute('data-id');
            if (friendID) {
                checkedFriendsIDs.push(friendID);
                //console.log(friendID);
            }
        }
    });
    return checkedFriendsIDs;
}

// 체크된 친구 ID를 가져오는 함수2
function getCheckedFriendsIDs2() {
    const checkedFriendsIDs = [];
    const inviteCheckboxes = document.querySelectorAll('#invites .invite-checkbox');

    inviteCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            // 체크된 친구의 ID를 가져옵니다.
            const friendID = checkbox.getAttribute('data-id');
            if (friendID) {
                checkedFriendsIDs.push(friendID);
                //console.log(friendID);
            }
        }
    });
    return checkedFriendsIDs;
}

// 각 친구에게 메모를 전송하는 함수
async function sendMemo(targetUserId, memoId) {
    const userId = await window.electron.getUserId();
    console.log("userID 쵝" + userId);
    const response = await fetch(`${SERVER_URL}/send-memo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sourceUserId: userId,
            targetUserId: targetUserId,
            memoId: memoId,
        }),
    });

    if (response.ok) {
        console.log(`${targetUserId}에게 메모를 성공적으로 전송했습니다.`);
    } else {
        console.error(`${targetUserId}에게 메모 전송에 실패했습니다.`);
    }
};

const inviteMeeting = async (targetUserId) => {
    try {
        const userName = await window.electron.getUserName();

        // inviteURL을 비동기적으로 가져와야 한다면 await 추가
        const inviteURL = await window.electron.getInviteUrl(); // 수정: await 추가
        console.log('Generated inviteURL:', inviteURL); // inviteURL 값 확인

        const response = await fetch(`${SERVER_URL}/invite`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sourceUserName: userName,
                targetUserId: targetUserId,
                inviteUrl: inviteURL, // inviteURL 값을 전송
            }),
        });

        if (response.ok) {
            console.log(`${targetUserId}에게 초대 성공`);
        } else {
            const errorData = await response.json();
            console.error(
                `초대 전송 실패: ${errorData.error || response.statusText}`
            );
        }
    } catch (error) {
        console.error(`초대 중 오류 발생: ${error.message}`);
    }
};


// 전송 모달 : 전송 버튼 클릭 시 이벤트 핸들러
document.getElementById('send-friends-button').addEventListener('click', async () => {
    const checkedFriendsIDs = getCheckedFriendsIDs();  // 선택된 친구들의 ID 배열
    console.log('선택된 친구들 ID:', checkedFriendsIDs);

    // 메모 ID 생성 및 창 닫기
    //const memo_ID = await window.electron.createMemoId();  // 메모 ID를 생성하는 함수 (Electron API 가정)
    console.log('생성된 메모 ID:', memo_ID);
    await saveAndClose(memo_ID);  // 메모를 저장하고 창을 닫는 함수

    // 각 친구의 ID를 순회하며 메모 전송
    for (const targetUserId of checkedFriendsIDs) {
        await sendMemo(targetUserId, memo_ID);
    }
    window.electron.closeMemoWindow();
});

// 초대 버튼 클릭 시 이벤트 핸들러
document.getElementById('invite-friends-button').addEventListener('click', async () => {
    const checkedFriendsIDs = getCheckedFriendsIDs2();  // 선택된 친구들의 ID 배열
    console.log('선택된 친구들 ID:', checkedFriendsIDs);
    window.electron.addConferenceWindow();
    for (const targetUserId of checkedFriendsIDs) {
        await inviteMeeting(targetUserId);
    }
});

// 삭제 버튼 클릭 시 이벤트 핸들러
document.getElementById('delete-button').addEventListener('click', async () => {
    window.electron.closeMemoWindow();
});


// 음성에서 추출된 텍스트를 메모에 불러오기
function importText(text) {
    const currentText = editor.value;
    // editor 내용이 비어있지 않으면 줄바꿈 추가
    editor.value = currentText + (currentText ? '\n' : '') + text;
}