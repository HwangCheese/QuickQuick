const meetingModal = document.getElementById('meeting-modal'); // 화상회의 초대 모달창
const meetingQuestion = document.getElementById('meeting-question'); // 화상회의 질문 텍스트
let processing2=false;

// 메모 작성 시, 캘린더 일정 자동 삽입 및 화상회의 초대 관련 이벤트
document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') { // Enter 키 감지
        if (processing2) return; // 이미 처리 중이면 중복 실행 방지
        processing2 = true; // 처리 시작

        const text = document.getElementById('editor').value.trim().split('\n').pop(); // textArea의 마지막 줄 가져오기

        // 문장에 'meeting' 또는 '화상회의' 단어 감지
        const meetingPattern = /(meeting|화상회의|회의|미팅|통화)/i;
        const isMeetingDetected = meetingPattern.test(text);

        if (isMeetingDetected) {
            meetingModal.style.display = "flex"; // 화상회의 초대 모달창 show

            // 문장에서 모든 단어 추출
            const words = text.trim().split(/\s+/); // 공백으로 단어 분리
            const candidatesToCheck = words.filter(word => word !== 'meeting' && word !== '화상회의' && word !== '미팅' && word !== '회의' && word !== '통화');

            const confirmedFriends = []; // 실제 친구로 확인된 이름들을 저장할 배열

            // 각 단어에 대해 친구 이름 여부 확인 및 실시간 업데이트
            for (const candidate of candidatesToCheck) {
                const targetUserId = await window.electron.getUserIdByName(candidate);
                if (targetUserId) {
                    confirmedFriends.push(candidate); // 친구로 확인된 이름만 저장

                    // 확인된 친구 이름들로 질문 텍스트를 실시간으로 업데이트
                    meetingQuestion.innerHTML = `화상회의를 시작하시겠습니까?<br>초대할 친구: ${confirmedFriends.join(', ')}`;
                }
            }

            // 만약 친구가 없을 경우, 기본 텍스트로 변경
            if (confirmedFriends.length === 0) {
                meetingQuestion.textContent = "화상회의를 시작하시겠습니까?";
            }

            const userConfirmedMeeting = await new Promise((resolve) => {
                document.getElementById('meeting-confirm-btn').addEventListener('click', () => {
                    resolve(true); // '예' 선택
                    closeMeetingModal();
                });

                document.getElementById('meeting-cancel-btn').addEventListener('click', () => {
                    resolve(false); // '아니오' 선택
                    closeMeetingModal();
                });

                document.getElementById('meeting-modal-close-button').addEventListener('click', () => {
                    resolve(false); // 모달 창 닫기(X) 클릭
                    closeMeetingModal();
                });
            });

            if (userConfirmedMeeting) {
                console.log('User confirmed the meeting invitation.');
                window.electron.addConferenceWindow();
                // 각 친구 이름에 대해 초대 링크 보내기
                for (const friendName of confirmedFriends) {
                    const targetUserId = await window.electron.getUserIdByName(friendName);

                    if (targetUserId) {
                        await sendInviteMeeting(targetUserId);
                    } else {
                        console.error(`User ID를 찾을 수 없습니다: ${friendName}`);
                    }
                }
            } else {
                console.log('User canceled the meeting invitation.');
            }
        }

        // textArea에 포커스 주기
        document.getElementById('editor').focus();
        processing2 = false; // 처리 완료
    }
});


// 모달 닫기
function closeMeetingModal() {
    meetingModal.style.display = 'none';
    meetingQuestion.textContent = "화상회의를 시작하시겠습니까?"; // 초기 상태로 복구
}

// 화상회의 초대 링크 전송 함수
const sendInviteMeeting = async (targetUserId) => {
    try {
        const userName = await window.electron.getUserName();
        const inviteURL = await window.electron.getInviteUrl();
        console.log('Generated inviteURL:', inviteURL);

        const response = await fetch(`${SERVER_URL}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sourceUserName: userName,
                targetUserId: targetUserId,
                inviteUrl: inviteURL,
            }),
        });

        if (response.ok) {
            console.log(`${targetUserId}에게 초대 성공`);
        } else {
            const errorData = await response.json();
            console.error(`초대 전송 실패: ${errorData.error || response.statusText}`);
        }
    } catch (error) {
        console.error(`초대 중 오류 발생: ${error.message}`);
    }
};
