const urlSummaryModal = document.getElementById('url-summary-modal'); // 전송 모달창
const loadingScreen = document.getElementById('loading-screen'); 

document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') { // Enter 키 감지
        const urlText = document.getElementById('editor').value.trim().split('\n').pop(); // textArea의 마지막 줄 가져오기

        const urlPattern = /(https)/i; // URL 패턴 설정
        // URL 형식 검사
        const isUrlDetected = urlPattern.test(urlText);
        
        if (isUrlDetected) {
            urlSummaryModal.style.display = "flex"; // 모달창 show

            // 모달에서 '예' 또는 '아니오'가 클릭될 때까지 기다림
            const userUrlConfirmedPromise = new Promise((resolve) => {
                document.getElementById('confirm-url-summary-btn').addEventListener('click', () => {
                    resolve(true); // '예' 선택
                    closeUrlSummaryModal();
                    cleanupListeners();
                });

                document.getElementById('cancel-url-summary-btn').addEventListener('click', () => {
                    resolve(false); // '아니오' 선택
                    closeUrlSummaryModal();
                    cleanupListeners();
                });

                document.getElementById('url-summary-modal-close-button').addEventListener('click', () => {
                    resolve(false); // 모달 창 닫기(X) 클릭
                    closeUrlSummaryModal();
                    cleanupListeners();
                });

                function cleanupListeners() {
                    document.getElementById('confirm-url-summary-btn').removeEventListener('click', confirmHandler);
                    document.getElementById('cancel-url-summary-btn').removeEventListener('click', cancelHandler);
                    document.getElementById('url-summary-modal-close-button').removeEventListener('click', closeHandler);
                }
            });

            const userUrlSummaryConfirmed = await userUrlConfirmedPromise;

            if (userUrlSummaryConfirmed) { // 예를 선택했을 때 발생하는 이벤트 처리
                loadingScreen.style.display = 'flex'; // 로딩 화면 표시
                const summary = await window.electron.summarizeUrlInRenderer(urlText); // apihelper.js의 summarizeUrl ipc 호출
                console.log('Summary:', summary);
                loadingScreen.style.display = 'none'; // 로딩 화면 제거
                editor.value += `\n요약:\n${summary}\n\n`; // 기존 내용에 요약된 내용을 추가
            } else {
                console.log('User canceled the event addition.');
            }
        } else {
            console.log('No valid URL detected.');
        }
        
        // textArea에 포커스 주기
        document.getElementById('editor').focus();
    }
});

// 모달 닫기
function closeUrlSummaryModal() {
    urlSummaryModal.style.display = 'none';
}
