const text = document.getElementById('editor').value;
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
    // 요약/번역 조건을 검사해 버튼을 생성하고 표시/숨김 처리하는 함수
    function toggleButton(buttonId, iconClass, isVisible, clickHandler) {
        const buttonsContainer = document.getElementById('buttons');
        let button = document.getElementById(buttonId);
    
        if (isVisible) {
            if (!button) { // 버튼이 존재하지 않으면 생성 후 추가
                button = document.createElement('button');
                button.classList.add('content-menu');
                button.id = buttonId;
                button.innerHTML = `<i class="${iconClass}"></i>`;
                buttonsContainer.appendChild(button);
                
                // 클릭 이벤트 리스너 추가
                button.addEventListener('click', clickHandler);
            }
            button.classList.add('bounce');  // 바운스 애니메이션 추가
            button.classList.remove('hide'); // 숨기기 애니메이션 제거
        } else if (button) { // 버튼이 존재하면 숨기기 애니메이션 후 제거
            button.classList.add('hide'); // 숨기기 애니메이션 추가
            setTimeout(() => {
                button.remove();
            }, 500); // 애니메이션 후 버튼 제거
        }
    }
    
    // 텍스트에 따른 버튼 표시 여부 설정
    toggleButton(
        'translate-button', 
        'fas fa-language', 
        isTranslatable(textToCheck), 
        async () => {
            try {
                resultElement.innerText = "번역중...";  // 결과 분석 전, 로딩 안내 메시지 출력
                const result = await window.electron.translateText(textToCheck, 'ko');
                resultElement.innerText = result.data.translations[0].translatedText;
                resultElement.style.border = "1.5px dashed #E48758";
            } catch (error) {
                console.error('Error translating text:', error);
                resultElement.innerText = 'Error translating text: ' + error.message;
            }
        }
    );
    
    toggleButton(
        'summary-button', 
        'fas fa-file-alt', 
        isSummarizable(textToCheck), 
        async () => {
            try {
                resultElement.innerText = "요약중..."; // 결과 분석 전, 로딩 안내 메시지 출력
                const summaryResult = await window.electron.summarizeText(textToCheck);
                resultElement.innerText = summaryResult;
                resultElement.style.border = "1.5px dashed #E48758";
            } catch (error) {
                console.error('Error summarizing text:', error);
                resultElement.innerText = 'Error summarizing text or generating title: ' + error.message;
            }
        }
    );
    
    // 선택한 텍스트가 없거나 요약/번역 조건에 맞지 않는 경우 결과 영역 숨기기
    if (!isTranslatable(textToCheck) || !isSummarizable(textToCheck)) {
        resultElement.innerText = "";
        resultElement.style.border = "none";
    }
}    