const QR_URL = SERVER_URL + '/generate-qr/';
const QR_VALIDITY_PERIOD = 0.5 * 60 * 1000; // 3분 (밀리초)
let qrGenerationTime = null; // QR 코드 생성 시간을 저장할 변수

function getProfileQrContainerSize() {
    const containerElement = document.querySelector('.profile-qr-container');
    if (containerElement) {
        const rect = containerElement.getBoundingClientRect();
        return rect.height;
    }
}

// 타이머 업데이트 함수
function updateTimer(startTime) {
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = Math.max(0, QR_VALIDITY_PERIOD - elapsed);

    if (remaining === 0) {
        document.getElementById('timer').textContent = 'QR 코드의 유효 시간이 만료되었습니다.';
        document.getElementById('qrCodeContainer').style.display = 'none'; // QR 코드 숨김
        requestWindowResizeHeight(300);
        return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    document.getElementById('timer').textContent = `남은 시간: ${minutes}분 ${seconds}초`;

    setTimeout(() => updateTimer(startTime), 1000); // 1초마다 타이머 업데이트
}

// QR 코드 생성 및 타이머 시작 함수
document.getElementById('qr-link').addEventListener('click', async () => {
    const currentTime = Date.now();

    // QR 코드가 유효하면 (유효 시간이 경과되기 전에는 다시 생성할 수 없음) 
    if (qrGenerationTime && currentTime - qrGenerationTime < QR_VALIDITY_PERIOD) {
        return;
    }

    const userId = await window.electron.getUserId();
    console.log(userId);

    try {
        const qrResponse = await fetch(`${QR_URL}${userId}`);
        console.log(qrResponse);
        if (!qrResponse.ok) {
            throw new Error('네트워크 응답이 올바르지 않습니다.');
        }

        const qrCodeHtml = await qrResponse.text();
        document.getElementById('qrCodeContainer').innerHTML = qrCodeHtml;
        document.getElementById('qrCodeContainer').style.display = 'block'; // QR 코드 표시
        document.getElementById('timer').style.display = 'block'; // 타이머 표시
        showNotification('로그인 QR 생성 완료');

        qrGenerationTime = Date.now(); // QR 코드 생성 시간 기록
        updateTimer(qrGenerationTime); // 타이머 시작
        // QR 코드가 렌더링된 후 프레임 크기 변경
        setTimeout(() => {
            requestWindowResizeHeight(450);
        }, 5); // 5ms 후에 크기 변경 시도
    } catch (error) {
        console.error('QR 코드 요청 실패:', error);
    }
});

document.getElementById('toggle-friend-list').addEventListener('click', async function () {
    const friendListSection = document.getElementById('friend-list-section');
    friendListSection.classList.toggle('visible');

    console.log(userName);
    const data = await fetchUserData();

    const friendNameSets = data.map(item => item.friend_name_set);
    console.log(friendNameSets); // ["강인한 고양이", "고요한 구름", "아린"]

    if (friendListSection.classList.contains('active')) {

        // friendNameSets 배열을 순회하면서 각 친구 이름을 <li>로 추가
        const friendList = document.getElementById('friends');
        friendList.innerHTML = ''; // 기존 목록 초기화

        friendNameSets.forEach(friendName => {
            const newFriendItem = document.createElement('li');
            newFriendItem.classList.add('user-friend-item');
            newFriendItem.innerHTML = `
                    <span class="friend-connection"></span>
                    <span class="friend-name" contenteditable="false">${friendName}</span>
                    <button class="friend-action-button remove-friend-button">
                        <img src='../media/trash.png' alt='' style="user-select: none; pointer-events: auto; -webkit-user-drag: none;"></img>
                    </button>
                `;
            friendList.appendChild(newFriendItem);
        });
    } else {

    }
});

document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('mousedown', () => {
        input.focus();
    });
});

// 친구 검색 기능
document.getElementById('search-friend-name').addEventListener('input', function () {
    const searchedFriends = document.getElementById('searched-friends');
    const searchValue = this.value.toLowerCase();
    const friends = document.querySelectorAll('#friends li');

    // 검색 결과 초기화
    searchedFriends.innerHTML = '';

    // 친구 목록을 순회하며 검색어에 일치하는 친구를 찾기
    friends.forEach(friend => {
        if (friend.textContent.toLowerCase().includes(searchValue)) {
            // 일치하는 친구를 `searchedFriends`에 추가
            const friendName = friend.querySelector('.friend-name').textContent;
            const searchResultItem = document.createElement('div');
            searchResultItem.classList.add('search-result-item');
            searchResultItem.textContent = friendName;
            searchedFriends.appendChild(searchResultItem);
        }
    });
});

// 이벤트 위임을 사용하여 friend-action-button에 대한 이벤트 처리
document.getElementById('friends').addEventListener('click', async function (event) {
    if (event.target.classList.contains('friend-name')) {
        const nameElement = event.target;
        const pre_name = nameElement.textContent.trim(); // 기존 이름 저장
        nameElement.contentEditable = 'true';
        nameElement.focus();

        // 텍스트 커서를 끝으로 이동
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(nameElement);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // 포커스가 다른 곳으로 이동하거나 엔터 키 입력 시 수정 완료
        const saveName = async () => {
            nameElement.contentEditable = 'false';
            const newName = nameElement.textContent.trim();
            if (pre_name !== newName) {
                console.log('기존 이름:', pre_name);
                console.log('변경된 이름:', newName);
                await updateFriendName(userName, pre_name, newName); // 서버에 업데이트 요청
                showNotification('이름을 변경했습니다.');
            }
        };

        // 포커스를 잃거나 엔터 키를 누르면 수정 저장
        nameElement.addEventListener('blur', saveName, { once: true });
        nameElement.addEventListener('keydown', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                nameElement.blur(); // 엔터 키로 blur 이벤트 발생
            }
        });
    }
    else if (event.target.classList.contains('friend-connection')) {
        const button = event.target;
        const item = button.closest('.user-friend-item');
        const nameElement = item.querySelector('.friend-name');
        const friendName = nameElement.textContent.trim();

        // 콕! 동작 수행 함수 호출
        await handleKockAction(userName, friendName);
    }
    else if (event.target.closest('.remove-friend-button')) { // 클릭한 요소가 삭제 버튼일 때
        const button = event.target.closest('.remove-friend-button');
        const item = button.closest('.user-friend-item');
        const nameElement = item.querySelector('.friend-name');
        const friendName = nameElement.textContent.trim();

        item.remove();
        await deleteFriend(userName, friendName);
        showNotification('친구를 삭제했습니다.');
    }
});

function showNotification(message) {
    const notificationArea = document.getElementById('notificationArea');
    notificationArea.textContent = message;
    notificationArea.style.display = 'block';
    setTimeout(() => {
        notificationArea.style.display = 'none';
    }, 3000); // 3초 후에 알림 숨기기
}

// 'kock-button' 클릭 시 처리할 함수 정의
async function handleKockAction(userName, friendName) {
    console.log(friendName);
    let check = await window.electron.kockAction({ userName, friendName });  // 사용자 접속 여부 확인
    if (check)
        showNotification('콕 찌르기 성공!');
    else
        showNotification('사용자가 접속 중이 아닙니다.');
}

// usersWindow 닫기
document.getElementById('close-user-button').addEventListener('click', function () {
    window.electron.closeUsersWindow();
});