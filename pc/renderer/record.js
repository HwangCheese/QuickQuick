// 음성 분석
const recorderBtn = document.getElementById('recorder-button');
const recorderModal = document.getElementById('recorder-modal');
const recorderModalCloseBtn = document.getElementById('recorder-modal-close-button');

let mediaRecorder;
let recordedChunks = [];
let audioBlob = null;
const recordBtn = document.getElementById('record-btn');
const audioPlayer = document.querySelector('.audio-player');
const transcriptionContainer = document.getElementById('transcriptionContainer');
const transcriptionEl = document.getElementById('transcription');
const loadingEl = document.getElementById('loading');
const actionBtn = document.querySelector('.action-buttons');
const downloadBtn = document.getElementById('download-btn');
const exportBtn = document.getElementById('export-btn');
const rerecordBtn = document.getElementById('rerecord-btn');

let isRecording = false;

function closeRecorderModal() {
    // 녹음 중지
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        isRecording = false;
    }

    // 모달 숨기기
    recorderModal.style.display = 'none';
}

// "녹음" 버튼 클릭 시, 녹음 모달창
recorderBtn.addEventListener('click', async () => {
    recorderModal.style.display = 'flex';

    // 녹음 버튼 초기화
    recordBtn.style.display = 'block';
    recordBtn.style.backgroundImage = 'url(../media/record.png)';

    // UI 요소 초기화
    audioPlayer.style.display = 'none';
    transcriptionContainer.style.display = 'none'; // 결과 숨김
    actionBtn.style.display = 'none'; // 버튼 숨김
    loadingEl.style.display = 'none'; // 로딩 숨김
    transcriptionEl.value = ''; // 텍스트 필드 초기화
    transcriptionEl.placeholder = "결과를 수정하세요";
    recordedChunks = []; // 녹음 데이터 초기화
    audioBlob = null; // 오디오 데이터 초기화
});

recorderModalCloseBtn.addEventListener('click', () => {
    closeRecorderModal();
});


// 녹음 시작 및 중지 버튼 클릭 이벤트 처리
recordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioPlayer.style.display = 'none';
            transcriptionContainer.style.display = 'none'; // 결과 숨김
            actionBtn.style.display = 'none'; // 버튼 숨김

            mediaRecorder.ondataavailable = event => {
                recordedChunks.push(event.data);
            };

            // 녹음 중지 시 자동 분석 진행
            mediaRecorder.onstop = () => {
                audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                const audioURL = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioURL;
                audioPlayer.style.display = 'block';
                recordedChunks = [];
                analyzeAudio(); // 녹음 후 즉시 분석 함수 호출

                // 중지 버튼을 다운로드 버튼으로 변경
                recordBtn.style.display = 'none'; // 기존 녹음 버튼 숨기기
                downloadBtn.style.display = 'block'; // 다운로드 버튼 보이게 하기
            };

            mediaRecorder.start();
            recordBtn.style.backgroundImage = 'url(../media/pause.png)';
            isRecording = true;
        } catch (error) {
            console.error('Error accessing media devices.', error);
        }
    }
    else {
        mediaRecorder.stop();
        // recordBtn.style.backgroundImage = 'url(../media/re-record.png)';
        isRecording = false;
    }
});

rerecordBtn.addEventListener('click', async () => {
    if (!isRecording) {
        recordBtn.style.display = 'block';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioPlayer.style.display = 'none';
            transcriptionContainer.style.display = 'none'; // 결과 숨김
            actionBtn.style.display = 'none'; // 버튼 숨김

            mediaRecorder.ondataavailable = event => {
                recordedChunks.push(event.data);
            };

            // 녹음 중지 시 자동 분석 진행
            mediaRecorder.onstop = () => {
                audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                const audioURL = URL.createObjectURL(audioBlob);
                audioPlayer.src = audioURL;
                audioPlayer.style.display = 'block';
                recordedChunks = [];
                analyzeAudio(); // 녹음 후 즉시 분석 함수 호출

                // 중지 버튼을 다운로드 버튼으로 변경
                recordBtn.style.display = 'none'; // 기존 녹음 버튼 숨기기
                downloadBtn.style.display = 'block'; // 다운로드 버튼 보이게 하기
            };

            mediaRecorder.start();
            recordBtn.style.backgroundImage = 'url(../media/pause.png)';
            isRecording = true;
        } catch (error) {
            console.error('Error accessing media devices.', error);
        }
    }
    else {
        mediaRecorder.stop();
        // recordBtn.style.backgroundImage = 'url(../media/re-record.png)';
        isRecording = false;
    }
});

// 음성 파일 분석 함수
async function analyzeAudio() {
    const apiKey = GOOGLE_API;
    const url = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;

    loadingEl.style.display = 'block'; // 로딩 화면 표시

    try {
        const reader = new FileReader();
        reader.readAsArrayBuffer(audioBlob);
        reader.onloadend = async function () {
            const arrayBuffer = reader.result;
            const base64Audio = btoa(
                new Uint8Array(arrayBuffer).reduce(
                    (data, byte) => data + String.fromCharCode(byte),
                    ''
                )
            );

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    config: {
                        encoding: 'WEBM_OPUS',
                        sampleRateHertz: 48000,
                        languageCode: 'ko-KR',
                    },
                    audio: {
                        content: base64Audio,
                    },
                }),
            });

            const result = await response.json();
            console.log(result);

            if (result.results && result.results.length > 0) {
                const transcript = result.results[0].alternatives[0].transcript;
                transcriptionEl.value = transcript;
                transcriptionEl.placeholder = '결과를 수정하세요';
            } else {
                transcriptionEl.placeholder = '텍스트 변환 실패';
            }

            loadingEl.style.display = 'none'; // 로딩 화면 숨기기
            transcriptionContainer.style.display = 'block'; // 결과 표시
            actionBtn.style.display = 'block'; // 버튼 표시
        };
    } catch (e) {
        console.error('텍스트 변환 중 오류 발생:', e);
        transcriptionEl.value = '텍스트 변환 중 오류 발생';
        loadingEl.style.display = 'none';
        transcriptionContainer.style.display = 'block';
    }
}

downloadBtn.addEventListener('click', () => {
    if (audioBlob) {
        // 오디오 파일 다운로드 처리
        const audioURL = URL.createObjectURL(audioBlob);

        // 다운로드를 위한 링크 생성
        const downloadLink = document.createElement('a');
        downloadLink.href = audioURL;
        downloadLink.download = 'quick-audio.webm'; // 다운로드할 파일 이름
        document.body.appendChild(downloadLink); // 링크를 DOM에 추가
        downloadLink.click(); // 링크 클릭하여 다운로드 시작
        document.body.removeChild(downloadLink); // 링크를 DOM에서 제거

    } else {
        console.error('No audio file available for export.');
    }
});

exportBtn.addEventListener('click', () => {
    closeRecorderModal();
    importText(transcriptionEl.value);
});

