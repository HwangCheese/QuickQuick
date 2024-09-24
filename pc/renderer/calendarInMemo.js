const calendarModal = document.getElementById('calendar-modal'); //일정 삽입 유무를 확인하기 위한 모달창
let userConfirmed = false; // 모달에서 선택한 값 저장

//메모 작성 시, 캘린더 일정 자동 삽입 관련 이벤트
//사용자가 textArea에 내용 작성 도중 enter 입력 시,
document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') { // Enter 키 감지

        // textArea에서 마지막 줄을 추출
        const text = document.getElementById('editor').value.trim().split('\n').pop(); // textArea의 마지막 줄 가져오기
        const currentYear = new Date().getFullYear(); // 시스템의 현재 연도, 사용자가 년도 입력 없을 시, 디폴트로 올해 년도로 설정

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
        const dates = formattedText.match(datePattern); //해당 문장에서 찾아낸 날짜
        const textWithoutDates = formattedText.replace(datePattern, '').trim(); //해당 문장에서 날짜가 아닌 텍스트-> 일정 타이틀로 사용

        console.log('Detected Dates:', dates);
        console.log('Text without Dates:', textWithoutDates);

        // 문장에 날짜가 있을 때만 서버로 일정 추가
        if (dates && dates.length > 0) {
            calendarModal.style.display = "flex"; //모달창 show
            // 모달에서 '예' 또는 '아니오'가 클릭될 때까지 기다림
            const userConfirmedPromise = new Promise((resolve) => {
                document.getElementById('confirm-btn').addEventListener('click', () => {
                    resolve(true); // '예' 선택
                    closeModal();
                });

                document.getElementById('cancel-btn').addEventListener('click', () => {
                    resolve(false); // '아니오' 선택
                    closeModal();
                });

                document.getElementById('calendar-modal-close-button').addEventListener('click',()=>{
                    resolve(false); // 모달 창 닫기(X) 클릭
                    closeModal();
                });
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
        //textArea에 포커스 주기
        document.getElementById('editor').focus();
    }
});

// 모달 닫기
function closeModal() {
    calendarModal.style.display = 'none';
}