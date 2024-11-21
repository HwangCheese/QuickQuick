// "분류" 버튼 생성 및 삭제 처리 함수
function toggleAnalysisButton(text, fileCount) {
  const buttonsContainer = document.getElementById('buttons');
  let analysisBtn = document.getElementById('analysis-button'); // 기존 버튼이 있는지 확인

  if ((text.length > 1500) || (text.length > 100 && fileCount >= 2)) {
    // 버튼이 없으면 생성하여 추가
    if (!analysisBtn) {
      analysisBtn = document.createElement('button');
      analysisBtn.id = 'analysis-button';
      analysisBtn.classList.add('content-menu');
      analysisBtn.innerHTML = '<i class="fas fa-folder-tree"></i>'; // 아이콘 예시
      buttonsContainer.appendChild(analysisBtn);

      // 버튼에 클릭 이벤트 리스너 동적으로 추가
      analysisBtn.addEventListener('click', async () => {
        const memo = document.getElementById('editor').value;
        console.log("버튼 눌림");

        let files = []; // 모든 파일의 경로를 저장할 배열

        // 이미지 파일 목록 순회
        for (const file of imageFiles) {
          files.push({ type: 'image', path: file.path });
        }

        // 기타 파일 경로 저장
        for (const file of otherFiles) {
          files.push({ type: file.type, path: file.path });
        }

        // 메모와 파일을 분석하는 함수 호출
        window.electron.analyzeMemo(memo, files, memo_ID);
      });
    }
  } else {
    // 조건을 만족하지 않으면 버튼 삭제
    if (analysisBtn) {
      analysisBtn.remove();
    }
  }
}

// "editor" 영역의 입력 이벤트 처리
document.getElementById('editor').addEventListener('input', () => {
  const text = document.getElementById('editor').value;
  const fileCount = imageFiles.length + otherFiles.length;
  toggleAnalysisButton(text, fileCount); // 조건에 따라 버튼 생성/삭제 처리
});