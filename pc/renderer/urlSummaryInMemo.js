const urlSummaryModal = document.getElementById('url-summary-modal'); // 전송 모달창
let processing3 = false; // 중복 처리 방지 변수

document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') { // Enter 키 감지
        if (processing3) return; // 이미 처리 중이면 중복 실행 방지
        processing3 = true; // 처리 시작

        const urlText = document.getElementById('editor').value.trim().split('\n').pop(); // textArea의 마지막 줄 가져오기

        const urlPattern = /(https?:\/\/[^\s]+)/i; // URL 패턴 설정
        // URL 형식 검사
        const isUrlDetected = urlPattern.test(urlText);

        if (isUrlDetected) {
            urlSummaryModal.style.display = "flex"; // 모달창 show

            // 모달에서 '예' 또는 '아니오'가 클릭될 때까지 기다림
            const userUrlSummaryConfirmed = await new Promise((resolve) => {
                const confirmHandler = () => {
                    resolve(true); // '예' 선택
                    cleanupListeners();
                    closeUrlSummaryModal();
                };

                const cancelHandler = () => {
                    resolve(false); // '아니오' 선택
                    cleanupListeners();
                    closeUrlSummaryModal();
                };

                const closeHandler = () => {
                    resolve(false); // 모달 창 닫기(X) 클릭
                    cleanupListeners();
                    closeUrlSummaryModal();
                };

                // 이벤트 리스너 추가
                document.getElementById('confirm-url-summary-btn').addEventListener('click', confirmHandler);
                document.getElementById('cancel-url-summary-btn').addEventListener('click', cancelHandler);
                document.getElementById('url-summary-modal-close-button').addEventListener('click', closeHandler);

                // 리스너 정리 함수
                function cleanupListeners() {
                    document.getElementById('confirm-url-summary-btn').removeEventListener('click', confirmHandler);
                    document.getElementById('cancel-url-summary-btn').removeEventListener('click', cancelHandler);
                    document.getElementById('url-summary-modal-close-button').removeEventListener('click', closeHandler);
                }
            });

            if (userUrlSummaryConfirmed) { // 예를 선택했을 때 발생하는 이벤트 처리
                const editor = document.getElementById('editor');
                const loadingMessage = "\n[요약 중...]\n"; // 로딩 중 메시지

                // const loadingScreen = document.getElementById('loading-screen'); // 로딩 화면
                // loadingScreen.style.display = 'flex'; // 로딩 화면 표시
                try {
                    // 에디터에 로딩 메시지 추가
                    editor.value += loadingMessage;
                    
                    const summary = await window.electron.summarizeUrlInRenderer(urlText); // summarizeUrl ipc 호출
                    console.log('Summary:', summary);

                    // 로딩 메시지를 제거하고 요약된 내용을 추가
                    editor.value = editor.value.replace(loadingMessage, ''); 
                    editor.value += `\n요약:\n${summary}\n\n`; 

                } catch (error) {
                    console.error('Error summarizing URL:', error);

                    // 로딩 메시지를 제거하고 오류 메시지 추가
                    editor.value = editor.value.replace(loadingMessage, '');
                    editor.value += "\n[요약 생성 중 오류 발생]\n\n";
                } finally {
                    // loadingScreen.style.display = 'none'; // 로딩 화면 제거
                }
            } else {
                console.log('User canceled the URL summary.');
            }
        } else {
            console.log('No valid URL detected.');
        }

        // textArea에 포커스 주기
        document.getElementById('editor').focus();
        processing3 = false; // 처리 완료
    }
});

// 모달 닫기
function closeUrlSummaryModal() {
    urlSummaryModal.style.display = 'none';
}
