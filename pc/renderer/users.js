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
        // frame 크기 변경
        window.electron.resizeUsersWindow(getProfileQrContainerSize());
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
            const newSize = getProfileQrContainerSize();
            window.electron.resizeUsersWindow(newSize);
        }, 5); // 5ms 후에 크기 변경 시도
    } catch (error) {
        console.error('QR 코드 요청 실패:', error);
    }
});

// 복사 버튼 이벤트 리스너
document.getElementById('copy-button').addEventListener('click', function () {
    navigator.clipboard.writeText(userName).then(function () {
    }, function (err) {
        console.error('복사 실패: ', err);
    });
});

document.getElementById('toggle-friend-list').addEventListener('click', async function () {
    const friendListSection = document.getElementById('friend-list-section');

    console.log(userName);
    const data = await fetchUserData();

    const friendNameSets = data.map(item => item.friend_name_set);
    console.log(friendNameSets); // ["강인한 고양이", "고요한 구름", "아린"]

    if (friendListSection.style.display === 'none') {
        friendListSection.style.display = 'block';
        this.textContent = '친구 목록 접기';

        // friendNameSets 배열을 순회하면서 각 친구 이름을 <li>로 추가
        const friendList = document.getElementById('friends');
        friendList.innerHTML = ''; // 기존 목록 초기화

        friendNameSets.forEach(friendName => {
            const newFriendItem = document.createElement('li');
            newFriendItem.classList.add('friend-item');
            newFriendItem.innerHTML = `
                 <span class="friend-name" contenteditable="false">${friendName}</span>
                 <button class="friend-action-button" id="edit-friend-button">수정</button>
                 <button class="friend-action-button" id="remove-friend-button">삭제</button>
                 <button class="friend-action-button" id="kock-button">콕!</button>
             `;
            friendList.appendChild(newFriendItem);
        });
    } else {
        friendListSection.style.display = 'none';
        this.textContent = '친구 목록 보기';
    }
    // frame 크기 변경
    await window.electron.resizeUsersWindow(getProfileQrContainerSize());
});

// 친구 검색 기능 (기본적인 예제)
document.getElementById('friend-search').addEventListener('input', function () {
    const searchValue = this.value.toLowerCase();
    const friends = document.querySelectorAll('#friends li');
    friends.forEach(friend => {
        if (friend.textContent.toLowerCase().includes(searchValue)) {
            friend.style.display = '';
        } else {
            friend.style.display = 'none';
        }
    });
});

// 이벤트 위임을 사용하여 friend-action-button에 대한 이벤트 처리
document.getElementById('friends').addEventListener('click', async function (event) {
    if (event.target.classList.contains('friend-action-button')) {
        const button = event.target;
        const item = button.closest('.friend-item');
        const nameElement = item.querySelector('.friend-name');
        const pre_name = nameElement.textContent.trim(); // 기존 이름 저장
        console.log(button);

        if (button.id=='edit-friend-button') {
            nameElement.contentEditable = 'true';
            nameElement.focus();

            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(nameElement);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);

            // 포커스가 다른 곳으로 이동할 때 자동 저장
            nameElement.addEventListener('blur', saveName, { once: true });

            nameElement.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    nameElement.blur(); // Enter 키를 눌렀을 때 blur 이벤트 발생
                }
            });

            // 모든 버튼에서 editing 클래스 제거
            item.querySelectorAll('.friend-action-button').forEach(btn => {
                btn.classList.add('editing');
            });

            // 수정 후 이름 저장
            function saveName() {
                nameElement.contentEditable = 'false';

                // 모든 버튼에서 editing 클래스 제거
                item.querySelectorAll('.friend-action-button').forEach(btn => {
                    btn.classList.remove('editing');
                });

                const newName = nameElement.textContent.trim(); // 변경된 이름 가져오기
                if (pre_name !== newName) { // 이름이 변경되었는지 확인
                    console.log('기존 이름:', pre_name);
                    console.log('변경된 이름:', newName);
                    updateFriendName(userName, pre_name, newName); // 서버에 업데이트 요청
                    showNotification('이름을 변경했습니다.');
                }
            }
        } else if (button.id=='remove-friend-button')  {
            item.remove();
            await deleteFriend(userName, nameElement.textContent);
            showNotification('친구를 삭제했습니다.');
        } else if(button.id=='kock-button') {
            await handleKockAction(userName, pre_name); 
        }
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
    let check = await window.electron.kockAction({userName,friendName});  // 사용자 접속 여부 확인
    if(check)
        showNotification('콕 찌르기 성공!');
    else
        showNotification('사용자가 접속 중이 아닙니다.');
}

// usersWindow 닫기
document.getElementById('close-button').addEventListener('click', function () {
   window.electron.closeUsersWindow();
});