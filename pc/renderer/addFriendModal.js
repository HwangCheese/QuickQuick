async function addFriend(userName, friendUserName) {
    const url = `${SERVER_URL}/friend`;
    const requestData = {
        user_name: userName,
        friend_user_name: friendUserName
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorResponse = await response.json(); // 서버에서 반환된 오류 메시지 JSON으로 파싱
            const errorMessage = errorResponse.error || `네트워크 응답 오류: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage); // 오류 메시지만 반환
        }

        const data = await response.json(); // JSON 형식으로 응답 받기
        return data; // 성공 시 데이터 반환
    } catch (error) {
        throw new Error(error.message); // 오류 메시지 반환
    }
}

const friendList = document.getElementById('friends');
const newFriendNameInput = document.getElementById('new-friend-name');
const errorMessageDiv = document.getElementById('error-message');

// 저장 버튼 클릭 시 새로운 친구 추가하고 영역 닫기
async function saveFriend() {
    const friendName = newFriendNameInput.value.trim();
    if (friendName) {
        try {
            await addFriend(userName, friendName);

            // 친구 추가 후, 리스트에 추가
            const newFriendItem = document.createElement('li');
            newFriendItem.classList.add('friend-item');
            newFriendItem.innerHTML = `
                <span class="friend-name" contenteditable="false">${friendName}</span>
                <button class="friend-action-button" id="edit-friend-button">수정</button>
                <button class="friend-action-button" id="remove-friend-button">삭제</button>
                <button class="friend-action-button" id="kock-button">콕!</button>
            `;
            friendList.appendChild(newFriendItem);
            newFriendNameInput.value = ''; // 입력 필드 초기화
            friendAddSection.style.display = 'none'; // 친구 추가 영역 숨기기
            errorMessageDiv.style.display = 'none'; // 에러 메시지 숨기기
        } catch (error) {
            // 에러 발생 시 처리
            errorMessageDiv.textContent = error.message; // 에러 메시지 표시
            errorMessageDiv.style.display = 'block'; // 에러 메시지 표시
        }
    } else {
        errorMessageDiv.textContent = '친구 이름을 입력해주세요.'; // 빈 입력 필드에 대한 에러 메시지
        errorMessageDiv.style.display = 'block'; // 에러 메시지 표시
    }
}

// Enter 키를 눌렀을 때 친구 추가 처리
newFriendNameInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Enter 키의 기본 동작 방지
        saveFriend(); // 친구 추가 처리
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const toggleFriendListButton = document.getElementById('toggle-friend-list');
    const friendListSection = document.getElementById('friend-list-section');
    const friendSearchSection = document.getElementById('friend-search-section');
    const rightColumn = document.querySelector('.right-column');
    const verticalLine = document.querySelector('.vertical-line');  // 세로 구분선
    const addFriendButton = document.getElementById('add-friend-button');
    const friendAddSection = document.getElementById('friend-add-section');

    // 친구 목록 토글 버튼 클릭 시
    toggleFriendListButton.addEventListener('click', function () {
        // 친구 목록의 display 상태를 토글
        friendListSection.classList.toggle('active');  // 'active' 클래스 추가/제거로 보이게/숨기게 설정

        // 친구 검색 섹션 숨김
        friendAddSection.classList.remove('active');  // 검색창이 보이면 숨기기

        // 오른쪽 영역 확장 여부 결정
        toggleRightColumn(friendListSection.classList.contains('active'));
    });

    // 친구 추가 버튼 클릭 시 친구 추가 영역 표시
    addFriendButton.addEventListener('click', function () {
        friendAddSection.classList.toggle('active');
        // 필요하다면 다른 섹션을 숨기기
        friendListSection.classList.remove('active');
        toggleRightColumn(friendAddSection.classList.contains('active'));
    });

    // 오른쪽 영역 확장/축소 함수
    function toggleRightColumn(isExpand) {
        if (isExpand) {
            rightColumn.classList.add('active');  // 오른쪽 영역 확장
            verticalLine.classList.add('active'); // 세로 구분선 활성화
        } else {
            rightColumn.classList.remove('active');  // 오른쪽 영역 축소
            verticalLine.classList.remove('active'); // 세로 구분선 비활성화
        }
    }
});