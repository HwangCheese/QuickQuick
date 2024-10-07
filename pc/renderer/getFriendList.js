let userName;
// 로드 되자마자 사용자 이름 받아옴
document.addEventListener('DOMContentLoaded', async function () {
    try {
        userName = await window.electron.getUserName();
        const usernameElement = document.getElementById('username');
        if (usernameElement && userName) {
            usernameElement.textContent = userName; // 사용자 이름 설정
        }
    } catch (error) {
        console.error('사용자 이름 로딩 오류:', error);
    }
});

// 친구 목록 불러오기
async function fetchUserData() {
    try {
        const encodedName = encodeURIComponent(userName); // URL 인코딩
        const response = await fetch(`${SERVER_URL}/friends/${encodedName}`);

        if (!response.ok) {
            throw new Error('네트워크 응답이 실패했습니다.');
        }

        const data = await response.json(); // JSON 형식으로 응답 받기
        console.log('응답 데이터:', data);
        // 응답 데이터를 사용하여 추가 작업 수행
        return data;
    } catch (error) {
        console.error('HTTP 요청 오류:', error);
    }
}

// 친구 이름 수정하기
async function updateFriendName(userName, friendUserName, newFriendName) {
    const url = `${SERVER_URL}/friend/name`; // 올바른 URL로 수정
    const requestData = {
        user_name: userName,
        friend_user_name: friendUserName,
        new_friend_name: newFriendName
    };
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error('네트워크 응답이 올바르지 않습니다.');
        }

        const data = await response.json(); // JSON 형식으로 응답 받기
        console.log('응답 데이터:', data);
    } catch (error) {
        console.error('HTTP 요청 오류:', error);
    }
}

// 친구 삭제하기
async function deleteFriend(userName, friendName) {
    const url = `${SERVER_URL}/friend`;
    const requestData = {
        user_name: userName,
        friend_name_set: friendName
    };

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error('네트워크 응답이 올바르지 않습니다.');
        }

        const data = await response.json(); // JSON 형식으로 응답 받기
        console.log('응답 데이터:', data);
        // 추가적인 응답 데이터 처리 로직을 여기에 추가할 수 있습니다.
    } catch (error) {
        console.error('HTTP 요청 오류:', error);
    }
}