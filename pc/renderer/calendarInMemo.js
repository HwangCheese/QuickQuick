const calendarModal = document.getElementById('calendar-modal'); // 일정 삽입 유무를 확인하기 위한 모달창
let isProcessing = false; // 현재 이벤트 처리 중인지 확인하는 변수

document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' && !isProcessing) { // Enter 키 감지 및 중복 실행 방지
        isProcessing = true; // 처리 시작
        try {
            // textArea에서 마지막 줄을 추출
            const text = document.getElementById('editor').value.trim().split('\n').pop();
            const currentYear = new Date().getFullYear(); // 현재 연도

            // 날짜 변환 로직
            const datePattern = /\b\d{4}[./-]\d{2}[./-]\d{2}\b|\b\d{2}[./-]\d{2}[./-]\d{4}\b|\b\d{2}\/\d{2}\b/g;
            const shortDatePattern = /\b(\d{1,2})[./-](\d{1,2})\b/g;
            const koreanDatePattern = /(\d{1,2})월\s*(\d{1,2})일/;

            let formattedText = text;

            // 7/12 -> 07/12 형식으로 변환
            formattedText = formattedText.replace(shortDatePattern, (match, p1, p2) => {
                const month = p1.padStart(2, '0');
                const day = p2.padStart(2, '0');
                return `${month}/${day}`;
            });

            // 7월 12일 -> 07/12 형식으로 변환
            formattedText = formattedText.replace(koreanDatePattern, (match, p1, p2) => {
                const month = p1.padStart(2, '0');
                const day = p2.padStart(2, '0');
                return `${month}/${day}`;
            });

            // MM/DD 형식에 현재 연도 추가 (연도가 없는 경우)
            formattedText = formattedText.replace(/\b(\d{2})\/(\d{2})\b/g, (match, month, day) => {
                return `${currentYear}-${month}-${day}`; // 현재 연도 추가
            });

            // 기존 정규 표현식으로 날짜 찾기
            const dates = formattedText.match(datePattern);
            const textWithoutDates = formattedText.replace(datePattern, '').trim();

            console.log('Detected Dates:', dates);
            console.log('Text without Dates:', textWithoutDates);

            // 문장에 날짜가 있을 때만 서버로 일정 추가
            if (dates && dates.length > 0) {
                calendarModal.style.display = "flex"; // 모달창 show

                // 모달에서 '예' 또는 '아니오'가 클릭될 때까지 기다림
                const userConfirmedPromise = new Promise((resolve) => {
                    const confirmHandler = () => {
                        resolve(true);
                        cleanupModalEvents();
                        closeModal();
                    };
                    const cancelHandler = () => {
                        resolve(false);
                        cleanupModalEvents();
                        closeModal();
                    };

                    document.getElementById('confirm-btn').addEventListener('click', confirmHandler);
                    document.getElementById('cancel-btn').addEventListener('click', cancelHandler);
                    document.getElementById('calendar-modal-close-button').addEventListener('click', cancelHandler);

                    // 모달 이벤트 정리 함수
                    function cleanupModalEvents() {
                        document.getElementById('confirm-btn').removeEventListener('click', confirmHandler);
                        document.getElementById('cancel-btn').removeEventListener('click', cancelHandler);
                        document.getElementById('calendar-modal-close-button').removeEventListener('click', cancelHandler);
                    }
                });

                const userConfirmed = await userConfirmedPromise;

                if (userConfirmed) {
                    const userId = await window.electron.getUserId();

                    // 여러 날짜가 있을 경우 각 날짜에 대해 개별 일정 추가
                    for (const date of dates) {
                        const fullDateTime = `${date}T00:00`; // 시간을 입력하지 않았을 경우 00:00으로 설정
                        await window.electron.addEventInServer(userId, fullDateTime, textWithoutDates); // 서버에 일정 저장
                    }
                } else {
                    console.log('User canceled the event addition.');
                }
            } else {
                console.log('No dates detected. Event not added.');
            }

            // textArea에 포커스 주기
            document.getElementById('editor').focus();
        } finally {
            isProcessing = false; // 처리 완료 후 상태 초기화
        }
    }
});

// 모달 닫기
function closeModal() {
    calendarModal.style.display = 'none';
}
