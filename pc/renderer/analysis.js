const analysisBtn = document.getElementById('analysis-button');

// "분류" 버튼 생성 기준
document.getElementById('editor').addEventListener('input', async () => {
  const text = document.getElementById('editor').value;
  const fileCount = imageFiles.length + otherFiles.length;

  // 버튼을 표시할 조건
  if ((text.length > 300) || (text.length > 100 && fileCount >= 2)) {
    analysisBtn.style.display = 'block'; // 요약 버튼 표시
  } else {
    analysisBtn.style.display = 'none'; // 요약 버튼 숨기기
  }
});


// 파일의 확장자에 따라 type 설정
// 필요 없을수도...
function getFileType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    // case 'jpg':
    // case 'jpeg':
    // case 'png':
    // case 'gif':
    //     return 'image';
    case 'txt':
      return 'text';
    case 'doc':
    case 'docx':
      return 'document';
    case 'xls':
    case 'xlsx':
      return 'spreadsheet';
    case 'csv':
      return 'csv';
    default:
      return 'other';
  }
}

// "분석" 버튼 클릭 시
analysisBtn.addEventListener('click', async () => {
  const memo = editor.value;
  console.log("버튼눌림");

  let files = []; // 모든 파일의 경로를 저장할 배열

  // 파일 목록 순회
  for (const file of imageFiles) { // 이미지 파일 목록 순회
    files.push({ type: 'image', path: file.path });
  }

  //기타 파일 경로 저장
  for (const file of otherFiles) { // 기타 파일 목록 순회
    //const type = getFileType(file.path);
    files.push({ type: file.type, path: file.path });
  }
  window.electron.analyzeMemo(memo, files, memo_ID)
});