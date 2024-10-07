const sendShowModal = document.getElementById('send-modal'); // 전송 모달창
const sendQuestion = document.getElementById('send-question'); // 전송 질문 텍스트

// 메모 작성 시, 전송 관련 이벤트
document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') { // Enter 키 감지

        const textEditor = document.getElementById('editor'); // editor 객체 참조
        const text = document.getElementById('editor').value.trim().split('\n').pop(); // textArea의 마지막 줄 가져오기

        const sendPattern = /(send|전송|발송|공유)/i;
        const isSendDetected = sendPattern.test(text);

        if (isSendDetected) {
            sendShowModal.style.display = "flex"; // 전송 모달창 show

            // 문장에서 모든 단어 추출
            const words = text.trim().split(/\s+/); // 공백으로 단어 분리
            const candidatesToCheck = words.filter(word => word !== 'send' && word !== '전송' && word !== '발송' && word !== '공유');

            const confirmedFriends = []; // 실제 친구로 확인된 이름들을 저장할 배열

            // 각 단어에 대해 친구 이름 여부 확인 및 실시간 업데이트
            for (const candidate of candidatesToCheck) {
                const targetUserId = await window.electron.getUserIdByName(candidate);
                if (targetUserId) {
                    confirmedFriends.push(candidate); // 친구로 확인된 이름만 저장

                    // 확인된 친구 이름들로 질문 텍스트를 실시간으로 업데이트
                    sendQuestion.innerHTML = `메모를 전송하시겠습니까?<br>전송할 친구: ${confirmedFriends.join(', ')}`;

                }
            }

            // 만약 친구가 없을 경우, 기본 텍스트로 변경
            if (confirmedFriends.length === 0) {
                sendQuestion.textContent = "메모를 전송하시겠습니까?";
            }

            const userConfirmedSend = await new Promise((resolve) => {
                document.getElementById('send-confirm-btn').addEventListener('click', () => {
                    resolve(true); // '예' 선택
                    closeSendModal();
                });

                document.getElementById('send-cancel-btn').addEventListener('click', () => {
                    resolve(false); // '아니오' 선택
                    closeSendModal();
                });

                document.getElementById('send-modal-close-button').addEventListener('click', () => {
                    resolve(false); // 모달 창 닫기(X) 클릭
                    closeSendModal();
                });
            });

            if (userConfirmedSend) {
                console.log('전송시작');
                 // 전송 라인을 editor에서 삭제
                 const lines = editor.value.split('\n'); // 텍스트를 라인으로 분리
                 lines.pop(); // 마지막 라인(전송 라인) 삭제
                 editor.value = lines.join('\n'); // 남은 라인들을 다시 editor에 설정
                // 각 친구 이름에 대해 메모 전송
                await saveAndClose(memo_ID);  // 메모를 저장하고 창을 닫는 함수
                for (const friendName of confirmedFriends) {
                    const targetUserId = await window.electron.getUserIdByName(friendName);
                    if (targetUserId) {
                        await sendInMemo(targetUserId);
                    } else {
                        console.error(`User ID를 찾을 수 없습니다: ${friendName}`);
                    }
                }
                window.electron.deleteMemo(memo_ID);
            } else {
                console.log('User canceled the send invitation.');
            }
        }
        // textArea에 포커스 주기
        document.getElementById('editor').focus();
    }
});

// 모달 닫기
function closeSendModal() {
    sendShowModal.style.display = 'none';
    sendQuestion.textContent = "메모를 전송 하시겠습니까?"; // 초기 상태로 복구
}

// 메모 전송 함수 (전송할 메모 ID와 친구 ID)
async function sendInMemo(targetUserId) {
    try {
        const userId = await window.electron.getUserId();
        console.log("전송한다잉: " + userId + ' ' + targetUserId + ' ' +memo_ID);
        const response = await fetch(`${SERVER_URL}/send-memo`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sourceUserId: userId,
                targetUserId: targetUserId,
                memoId: memo_ID,
            }),
        });

        if (response.ok) {
            console.log(`${targetUserId}에게 메모를 성공적으로 전송했습니다.`);
        } else {
            console.error(`${targetUserId}에게 메모 전송에 실패했습니다.`);
        }
    } catch (error) {
        console.error(`메모 전송 중 오류 발생: ${error.message}`);
    }
}