document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') { // Enter 키 감지
        const textArea = document.getElementById('editor');
        const text = textArea.value.trim().split('\n').pop(); // textArea의 마지막 줄 가져오기

        let location = null;

        // '장소:한성대학교' 또는 '장소-한성대학교' 형태 추출
        const locationPatternPrefix = /(?:장소[:\-]?\s*)([가-힣]+)/;
        const locationMatchPrefix = text.match(locationPatternPrefix);

        // '~에서'가 붙은 경우 추출 (예: '한성대학교에서')
        const locationPatternSuffix = /([가-힣]+)에서/;
        const locationMatchSuffix = text.match(locationPatternSuffix);

        // 장소가 '장소:' 또는 '장소-'로 시작하는 경우
        if (locationMatchPrefix) {
            location = locationMatchPrefix[1].trim();
        }
        // '한성대학교에서'와 같이 '~에서'로 끝나는 경우
        else if (locationMatchSuffix) {
            location = locationMatchSuffix[1].trim();
        }

        if (location) {
            console.log('Detected Location:', location);
            const locationExists = await window.electron.checkLocation(location);
            if (locationExists) { // 실제로 있는 장소라면
                const mapUrl = `https://map.kakao.com/?q=${encodeURIComponent(location)}`;
                console.log(mapUrl);

                // 결과 div에서 기존 링크 확인
                const resultDiv = document.getElementById('map-url-zone');
                if (!resultDiv) {
                    console.error('Element with ID "map-url-zone" not found.');
                    return;
                }

                const existingLink = Array.from(resultDiv.getElementsByTagName('a')).find(link => link.textContent === `지도 : ${location}`);

                if (!existingLink) { // 중복이 아닌 경우에만 추가
                    // 새로운 a 태그 생성
                    const locationLink = document.createElement('a');
                    locationLink.classList.add('map-url'); // 클래스 지정
                    locationLink.href = mapUrl; // 링크 주소 설정
                    locationLink.textContent = `지도 : ${location}`; // 링크 텍스트 설정
                    locationLink.target = '_blank'; // 새 창에서 열기

                    // 우클릭 시 a 태그 삭제 이벤트 리스너 추가
                    locationLink.addEventListener('contextmenu', (event) => {
                        event.preventDefault(); // 기본 우클릭 메뉴 방지
                        locationLink.remove(); // a 태그 삭제
                    });

                    // a 태그를 결과 div에 추가
                    resultDiv.appendChild(locationLink);
                } else {
                    console.log('This location link already exists.');
                }
            } else {
                console.log('No location detected.');
            }

            // textArea에 포커스 유지
            textArea.focus();
        }
    }
});
