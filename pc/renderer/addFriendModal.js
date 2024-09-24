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

const addFriendButton = document.getElementById('add-friend-button');
const friendModal = document.getElementById('friend-modal');
const closeButton = document.getElementById('friend-modal-close-button'); // x 버튼 선택
const friendList = document.getElementById('friends');
const newFriendNameInput = document.getElementById('new-friend-name');
const errorMessageDiv = document.getElementById('error-message');

// 친구 추가 버튼 클릭 시 모달 표시
addFriendButton.addEventListener('click', function () {
    friendModal.style.display = 'flex';
});

// 저장 버튼 클릭 시 새로운 친구 추가하고 모달 닫기
async function saveFriend() {
    const friendName = newFriendNameInput.value.trim();
    if (friendName) {
        try {
            await addFriend(userName, friendName);

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
            friendModal.style.display = 'none'; // 모달 숨기기
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

// x 버튼 클릭 시 모달 닫기
closeButton.addEventListener('click', function () {
    friendModal.style.display = 'none'; // 모달 숨기기
    newFriendNameInput.value = ''; // 입력 필드 초기화
    errorMessageDiv.style.display = 'none'; // 에러 메시지 숨기기
});
/*
// 모달 외부 클릭 시 모달 닫기 (선택 사항)
window.addEventListener('click', function (event) {
    if (event.target === modal) {
        friendModal.style.display = 'none';
        newFriendNameInput.value = ''; // 입력 필드 초기화
        errorMessageDiv.style.display = 'none'; // 에러 메시지 숨기기
    }
});
*/