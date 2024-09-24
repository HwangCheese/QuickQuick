const text = document.getElementById('editor').value;
const summaryButton = document.getElementById('summary-button');
const translateButton = document.getElementById('translate-button');
const resultElement = document.getElementById('result'); // 번역/요약 결과를 출력할 영역

let textToCheck = ""; // 요약 또는 번역할 텍스트

// 선택된 텍스트 또는 커서가 위치한 문단을 추출해 자동으로 번역 또는 요약할만한 텍스트인지 판단함
function checkText() { 
    const textarea = document.getElementById('editor');

    // textarea에서 선택된 텍스트를 추출
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();

    // 선택된 텍스트가 있을 경우 해당 텍스트 사용
    textToCheck = selectedText || "";

    // 선택된 텍스트가 없을 경우 커서 위치의 문단 추출
    if (!textToCheck) {
        const cursorPosition = textarea.selectionStart;
        const text = textarea.value;
        const lines = text.split('\n');
        let currentLine = '';
        let charCount = 0;

        // 커서가 위치한 문단을 찾음
        for (let i = 0; i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1은 줄바꿈 문자 포함
            if (cursorPosition < charCount) {
                currentLine = lines[i];
                break;
            }
        }
        textToCheck = currentLine.trim(); // 공백 제거
    }

    // 번역할 만한 영어 문장인지 판단하는 함수 (간단한 예로 영어 문장인지 확인)
    const isEnglish = (sentence) => /[a-zA-Z]/.test(sentence);

    function isMostlyEnglish(sentence) {
        // 영어 단어만 추출 (대소문자 포함)
        const englishWords = sentence.match(/\b[a-zA-Z]+\b/g) || [];

        // 전체 단어 추출 (스페이스바 기준)
        const totalWords = sentence.split(/\s+/).filter(word => word.length > 0);

        // 영어 단어 비율 계산
        const englishRatio = englishWords.length / totalWords.length;

        // 디버깅용: 콘솔에 비율 출력
        //console.log("영어 단어:", englishWords.length, "전체 단어:", totalWords.length, "영어 비율:", englishRatio);

        // 영어 단어가 전체의 30% 이상일 때 true 반환
        return englishRatio > 0.3;
    }

    function isTranslatable(sentence) {
        const minLength = 10; // 문장 길이가 10자 이상일 때
        return isMostlyEnglish(sentence) && sentence.length > minLength;
    }

    // 100자 이상인지 판단
    const isSummarizable = (sentence) => sentence.length >= 100;

    // 번역 버튼 처리
    if (isTranslatable(textToCheck)) {
        translateButton.style.display = 'block';  // 번역 버튼 보이기
    } else {
        translateButton.style.display = 'none';  // 번역 버튼 숨기기
    }

    // 요약 버튼 처리
    if (isSummarizable(textToCheck)) {
        summaryButton.style.display = 'block';  // 요약 버튼 보이기
    } else {
        summaryButton.style.display = 'none';  // 요약 버튼 숨기기
    }

    // 선택한 텍스트가 없거나 요약/번역 조건에 맞지 않는 경우 결과 영역 숨기기
    if (!isTranslatable(textToCheck) || !isSummarizable(textToCheck)) {
        resultElement.innerText = "";
        resultElement.style.border = "none";
    }
}

// 요약 버튼
summaryButton.addEventListener('click', async () => {
    try {
        resultElement.innerText = "요약중..." // 결과 분석 전, 로딩 안내 메시지 출력

        const summaryResult = await window.electron.summarizeText(textToCheck);
        resultElement.innerText = summaryResult;
        resultElement.style.border = "2px dashed #ADDCFF";
    } catch (error) {
        console.error('Error summarizing text or generating title:', error);
        resultElement.innerText = 'Error summarizing text or generating title: ' + error.message;
    }
});

// 번역 버튼
translateButton.addEventListener('click', async () => {
    try {
        resultElement.innerText = "번역중..."  // 결과 분석 전, 로딩 안내 메시지 출력

        const result = await window.electron.translateText(textToCheck, 'ko');
        resultElement.innerText = result.data.translations[0].translatedText;
        resultElement.style.border = "2px dashed #ADDCFF"; 
    } catch (error) {
        console.error('Error translating text:', error);
        resultElement.innerText = 'Error translating text: ' + error.message;
    }
});