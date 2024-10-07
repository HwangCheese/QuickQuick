const { ipcMain } = require('electron');
const crypto = require('crypto');
const config = require('./config.js'); // Ensure this path is correct
let userId = '';
let userName = '';

// 동적 import를 위한 함수 정의
async function importFetch() {
    return (await import('node-fetch')).default;
}

const { machineIdSync } = require('node-machine-id');
function generateUniqueId() {
    const id = machineIdSync({ original: true }); // 고유한 머신 ID를 얻음
    return id;
}

function generateId() {
    const id = generateUniqueId();
    if (!id) {
        throw new Error('Machine ID를 얻을 수 없습니다.');
    }
    const hash = crypto.createHash('sha256').update(id).digest('hex');
    userId = hash.substring(0, 12); // 12자리 ID
    return userId;
}

// 사용자 가입 확인 및 처리 함수
async function checkAndSignUpUser(userId) {
    try {
        const fetch = await importFetch();
        const checkResponse = await fetch(`${config.SERVER_URL}/check-user/${userId}`);
        // 사용자가 이미 가입된 경우
        if (checkResponse.status === 200) {
            console.log('사용자가 이미 가입되어 있습니다.');
            const userData = await checkResponse.json();
            if (userData && userData.name) {
                userName = userData.name;  // 사용자 이름 기억
            } else {
                console.error('서버 응답에 사용자 이름이 없습니다.');
            }
        }
        // 사용자가 가입되지 않은 경우, 랜덤 사용자 이름 생성 및 회원가입 처리 
        else if (checkResponse.status === 404) {
            userName = generateUserName();
            console.log('main 프로세스에서 생성된 사용자 이름:', userName);
            const signupResponse = await fetch(`${config.SERVER_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId, user_name: userName })
            });
            const signupData = await signupResponse.json();
            if (signupResponse.ok) {
                console.log('회원가입 성공:', signupData.message);
            } else {
                console.error('(main) 회원가입 오류:', signupData.error);
            }
        } else {
            console.error('서버 오류:', await checkResponse.json());
        }
    } catch (error) {
        console.error('회원가입 확인 및 처리 오류:', error);
    }
}


// 형용사와 주어 목록 제어판
const adjectives = [
    '사랑스러운', '멋진', '예쁜', '강력한', '기쁜', '손을 번쩍 든',
    '우아한', '활발한', '신비로운', '재미있는', '조용한', '슬픈',
    '빠른', '기묘한', '맛있는', '귀여운', '아름다운', '정직한',
    '고요한', '용감한', '독특한', '빛나는', '행복한', '진지한',
    '친절한', '멍청한', '강인한'
];

const subjects = [
    '자두', '사과', '호랑이', '나무', '사슴', '바다', '고양이',
    '어피치', '라이언', '무지', '꽃', '강아지', '곰', '호수',
    '구름', '책', '공원', '열쇠', '장미', '인형', '차',
    '비행기', '마법사', '용', '연필', '사탕', '음악',
    '미술관', '산', '캔버스'
];

// 배열에서 랜덤하게 요소를 선택하는 함수
function getRandomElement(array) {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

// 사용자 이름을 생성하는 함수
function generateUserName() {
    const adjective = getRandomElement(adjectives);
    const subject = getRandomElement(subjects);
    return `${adjective} ${subject}`;
}

function getUserName() {
    return userName;
}

// 전역변수로 설정된 사용자 ID 반환
ipcMain.handle('get-user-id', () => {
    return userId; // 전역변수로 설정된 사용자 ID 반환
});

// 전역변수로 설정된 사용자 이름 반환
ipcMain.handle('get-user-name', () => {
    return userName; 
});

ipcMain.handle('get-user-id-By-Name', async (event, { friendNameSet }) => {
    try {
        // userId를 가져오는 API 호출
        const userIdResponse = await fetch(`${config.SERVER_URL}/get-friend-user-id?userName=${encodeURIComponent(userName)}&friendNameSet=${encodeURIComponent(friendNameSet)}`);
        // API 응답 확인
        if (userIdResponse.ok) {
            const data = await userIdResponse.json();
            if (data.friendUserId) {
                return data.friendUserId; // friend_user_id 반환
            } else {
                return null; // 없는 경우 null 반환
            }
        } else {
            return null; // API 응답 실패 시 null 반환
        }
    } catch (error) {
        return null; // 데이터베이스 오류 시 null 반환
    }
});

module.exports={ generateId, checkAndSignUpUser, getUserName};