
const { ipcMain,BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const OpenAI = require('openai');
const cheerio = require('cheerio');
const url = 'https://api.openai.com/v1/chat/completions';
const config = require('./config.js'); 
const openai = new OpenAI({
    apiKey: config.API_KEY,
});

let abortController = null;// GPT 요청 중단을 위한 AbortController
let tesseractWorker = null; // Tesseract 작업 인스턴스

let windows = {}; // memoID를 키로 하는 창 객체 관리
let win = null;
let memoData;

// URL 내용 정리 함수
async function fetchPageContent(url) {
    try {
        // 웹 페이지 요청
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // 페이지 제목 추출
        const title = $('title').text();
        let content = '';
        $('div.main-content, article').each((index, element) => {
            content += $(element).text() + ' ';
        });

        return { url, title, content: content.trim() };
    } catch (error) {
        console.error('페이지 내용 가져오기 오류:', error);
        return { url, title: '알 수 없음', content: '내용 가져오기 오류' };
    }
}

// GPT로 메모와 URL 내용 분류
async function classifyMemo(memo) {
    console.log('원본 메모 출력 :',memo);
    abortController = new AbortController();
    
    let updatedMemo = memo;
    const urls = memo.match(/https?:\/\/[^\s]+/g);  // URL 추출

    if (urls) {
        // URL에 대한 내용 분석
        const urlContents = await Promise.all(urls.map(async (url) => {
            const content = await fetchPageContent(url);
            return { url, analysis: `URL: ${content.url}\n 제목: ${content.title}\n 내용: ${content.content}` };
        }));

        // 원래 메모의 URL을 분석된 내용으로 대체
        urlContents.forEach(({ url, analysis }) => {
            const regex = new RegExp(url, 'g');
            updatedMemo = updatedMemo.replace(regex, analysis);
        });
    }

    try {
        //console.log("분석전:"+enrichedMemos);
        const response = await axios.post(url, {
            model: 'gpt-3.5-turbo',
            //model: 'gpt-4',
            messages: [
                { role: "system", 
                    content: `너는 사용자가 작성한 메모의 내용을 분석하고 관련된 내용끼리 그룹화하는 AI 비서야. 
                    url 내용을 제외하고, 절대 메모 내용을 요약하거나 삭제해서는 안 돼. 원본 그대로 유지해야 해.` },
                {
                    role: "user",
                    content: `
            다음은 사용자가 작성한 메모 내용입니다. 각 메모의 내용을 분석하고, 관련된 내용끼리 그룹화하되, 메모의 원본 내용은 그대로 유지해야 합니다.
            
            메모 내용:
            ${updatedMemo}
            
            URL 분석 내용이 포함된 경우, URL 주소와 URL에 대한 설명은 매우 간단하게 작성하되, 관련된 메모와 함께 분석해 주세요.

              분석 결과를 다음과 같은 포맷으로 나누어 반환해 주세요:
            [
                {
                    "index": 1,
                    "title": "제목",
                    "content": "메모 원본 내용"
                },
                ...
            ]`
                }
            ],
            max_tokens: 2000,
            temperature: 0.5,
        }, {
            headers: {
                'Authorization': `Bearer ${openai.apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: abortController.signal  // 요청에 신호 추가
        });
 
        const formatResponse = (response) => {
            // 응답 문자열을 파싱하여 원하는 포맷으로 변환
            try {
                const parsed = JSON.parse(response);
                return parsed.map(note => ({
                    index: note.index,
                    title: note.title,
                    content: note.content
                }));
            } catch (error) {
                console.error('응답 파싱 오류:', error);
                return [];
            }
        };       

        const result = response.data.choices[0].message.content;
        console.log('메모 분류 결과:', result);
        memoData =  formatResponse(result);
        return memoData;  // 수정된 부분
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    } finally {
        // 요청 완료 후 abortController 초기화
        abortController = null;
    }
}

async function extractFirstNPages(filePath) {
    console.log('기타파일경로: '+filePath);
    const existingPdfBytes = fs.readFileSync(filePath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const totalPages = pdfDoc.getPageCount();

    if (totalPages <= 5) {
        // 페이지 수가 10페이지 이하인 경우, 원본 PDF를 그대로 반환
        return filePath;
    }

    // 새 PDF 문서를 생성합니다.
    const newPdfDoc = await PDFDocument.create();

    // 기존 PDF에서 첫 10페이지를 복사하여 새 PDF 문서에 추가합니다.
    for (let i = 0; i < 5; i++) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
        newPdfDoc.addPage(copiedPage);
    }

    // 새 PDF 문서를 버퍼로 저장합니다.
    const pdfBytes = await newPdfDoc.save();

    // 새 PDF를 임시 파일로 저장합니다.
    const tempFilePath = path.join(__dirname, 'first-5-pages.pdf');
    fs.writeFileSync(tempFilePath, pdfBytes);

    return tempFilePath;
}

// PDF에서 텍스트 추출
async function extractTextFromPDF(filePath) {
    console.log('pdf파일경로: '+filePath);
    const fileToProcess = await extractFirstNPages(filePath);

    // pdf-parse 라이브러리로 PDF 텍스트 추출
    const dataBuffer = fs.readFileSync(fileToProcess);
    const data = await pdf(dataBuffer);

    // 임시 PDF 파일 삭제 (복사된 파일일 경우)
    if (fileToProcess !== filePath) {
        fs.unlinkSync(fileToProcess);
    }

    return data.text;
}

// 이미지에서 텍스트 추출 함수 (OCR)
async function extractTextFromImage(filePath) {
    try {
        console.log('이미지파일경로: '+filePath);
        const { data: { text } } = await Tesseract.recognize(filePath, 'kor');
        console.log('이미지 파일 텍스트 변환 결과:', text);
        return text;
    } catch (error) {
        console.error('OCR 에러:', error.message);
    } finally {
        if (tesseractWorker) {
            await tesseractWorker.terminate();
            tesseractWorker = null;
        }
    }
}

async function matchFilesToMemo(classifiedMemo, files) {
    // const testClassifiedMemo = [
    //     {
    //         "index": 1,
    //         "title": "코딩라운지 스케줄",
    //         "content": "코딩라운지 스케줄\n월 : 아린\n화 : 은비\n수 : 여린\n목 : 단비\n금 : 미정\n시간 - 14시~16시\n급한일 있으면 바꿀수 있음",
    //         "files": []
    //     },
    //     {
    //         "index": 2,
    //         "title": "운영방안",
    //         "content": "운영방안\n이번 학기엔 동일하게, 대면 방식으로 운영됩니다. (자세한  사항은 추후 공지 예정)\n코치는 매주 활동보고서와 활동 증빙자료를 업로드해야 합니다.\n코딩라운지 활동종료 후 활동후기 및 만족도조사에 참여해야 합니다.",
    //         "files": []
    //     },
    //     {
    //         "index": 3,
    //         "title": "일정 안내",
    //         "content": "9월 14일 > 2시 약속\n9월 17일 > 추석 당일 전체 휴가\n9월 21-22 > 학교에서 미팅",
    //         "files": []
    //     }
    // ];

    // const testFiles = [
    //     {
    //       type: 'image',
    //       path: 'C:\\Users\\user\\Pictures\\Screenshots\\스크린샷 1.png'
    //     },
    //     {
    //       type: 'image',
    //       path: 'C:\\Users\\user\\Pictures\\Screenshots\\스크린샷 0.png'
    //     }
    // ];

    await Promise.all(files.map(async (file) => {
        let text = '';
        if (file.type === 'pdf') {
            text = await extractTextFromPDF(file.path);
        } else if (file.type === 'image') {
            text = await extractTextFromImage(file.path);
        }  else if (file.type === 'text') { // 텍스트 파일인 경우
            text = fs.readFileSync(file.path, 'utf-8');
        } else { // 다른 파일의 경우 파일명만 남김
            text = file.path.split('\\').pop();
        }
        // 이미지나 PDF가 아닌 경우 바로 새로운 항목 추가
        // if (file.type !== 'pdf' && file.type !== 'image') {
        //     classifiedMemo.push({
        //         index: classifiedMemo.length + 1,
        //         title: file.path.split('\\').pop(),
        //         content: "",
        //         files: [{ filePath: file.path, displayName: file.path.split('\\').pop() }]
        //     });
        //     return; // 분석 없이 바로 다음 파일로 넘어감
        // }

        // 파일의 텍스트와 분류된 메모를 GPT로 분석
        const analysisResult = await analyzeFileWithGPT(text, classifiedMemo);

        // 분석 결과를 기반으로 메모 수정
        if (!Array.isArray(analysisResult)) {
            console.error('분석 결과가 배열이 아닙니다:', analysisResult);
            return;
        }

        for (const result of analysisResult) {
            if (result === 0) {
                // 결과가 0일 경우, 새로운 항목 추가
                classifiedMemo.push({
                    index: classifiedMemo.length + 1,
                    title: file.path.split('\\').pop(),
                    content: "",
                    files: [{ filePath: file.path, displayName: file.path.split('\\').pop() }]
                });
            } else {
                // 관련이 있는 메모의 files 배열 업데이트
                const memoIndex = classifiedMemo.findIndex(memo => memo.index === result);
                if (memoIndex !== -1) {
                    // files 배열이 undefined일 경우 빈 배열로 초기화
                    if (!classifiedMemo[memoIndex].files) {
                        classifiedMemo[memoIndex].files = [];
                    }
                    
                    classifiedMemo[memoIndex].files.push({
                        filePath: file.path,
                        displayName: file.path.split('\\').pop()
                    });
                }
            }            
        }
    }));

    // classifiedMemo 배열의 각 메모 중 files가 없는 메모에 빈 배열 추가
    classifiedMemo.forEach(memo => {
        if (!memo.files) {
            memo.files = []; 
        }
    });
    
    const analyzedMemoData = JSON.stringify(classifiedMemo, null, 2);
    console.log("업데이트된 메모 목록:", analyzedMemoData);
     // 데이터 전송
     if (win) {
        console.log("window로 보낸다아");
        win.webContents.send('matched-indexes', analyzedMemoData);
     }
}

async function analyzeFileWithGPT(fileText, classifiedMemo) {
    console.time('analyzeFile');
    abortController = new AbortController();

   // 파일 텍스트의 길이를 제한
   const maxFileTextLength = 3000; // 최대 길이 설정 (예: 3000자)
   const truncatedFileText = fileText.length > maxFileTextLength
       ? fileText.substring(0, maxFileTextLength)
       : fileText;

    // 한 번에 모든 메모와 파일 텍스트를 분석하는 프롬프트 생성
    const prompt = `
    다음은 여러 개의 메모입니다:
    ${classifiedMemo.map(memo => `메모 ${memo.index}: ${memo.title}\n내용: ${memo.content}`).join('\n\n')}

    파일 내용:
    ${truncatedFileText}

    이 파일의 내용이 위 메모 중 어떤 것과 관련이 있는지 분석해 주세요. 관련이 있는 메모가 있다면 그 메모의 번호를 말해 주세요. 여러 개의 메모와 관련이 있을 경우, 번호를 모두 말해 주세요. 관련이 없는 경우에는 0을 반환해 주세요.
    예시 답변: 1, 2, 3 또는 0
    `;

    try {
        const response = await axios.post(url, {
            model: 'gpt-4',
            messages: [
                { role: "system", content: "너는 파일이 어떤 메모와 관련이 있는지 분석해, 관련된 메모의 번호만 반환해주는 AI 비서야. 관련이 없는 경우에는 0을 반환해." },
                { role: "user", content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.2,
        }, {
            headers: {
                'Authorization': `Bearer ${openai.apiKey}`,
                'Content-Type': 'application/json',
            },
            signal: abortController.signal  // 요청에 신호 추가
        });

        const result = response.data.choices[0].message.content.trim();
        console.log('GPT 분석 결과:', result);

        // 결과가 숫자만 나오도록 처리
        const matchedIndexes = result.split(',').map(index => parseInt(index.trim()));

        return matchedIndexes;
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        return [];
    } finally {
        // 요청 완료 후 abortController 초기화
        abortController = null;
    }
}

// matchFilesToMemo 함수 실행
// matchFilesToMemo().then(() => {
//     console.log("파일 매칭이 완료되었습니다.");
// }).catch((error) => {
//     console.error("파일 매칭 중 오류가 발생했습니다:", error);
// });

const createAssistantWindow = (memoId) => {
    if (windows[memoId]) {
        console.log(`Memo ID ${memoId}에 해당하는 창이 이미 열려 있습니다.`);
        windows[memoId].focus(); // 창을 활성화
        return false;
    }

    win = new BrowserWindow({
    width: 747,
      height: 543,
      frame: false,  // 본 타이틀바 제거
      transparent: true, // 프레임을 투명하게 설정
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        enableRemoteModule: false,
        nodeIntegration: false
      }
    });      
    win.loadFile('templates/assistant.html');
    windows[memoId] = win; // memoId로 창을 저장

    // 창이 로드 완료된 후에 데이터를 전송
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('original-memo-id', memoId);
    });

    // 창이 닫힐 때 창 관리에서 제거
    win.on('closed', () => {
        delete windows[memoId];
    });
    return true;
};

ipcMain.handle('analysis-memo', async (event, memo, files, memoID) => {
    console.time('analyzeFile');
    console.log('Received IPC message for analysis-memo');
    try {
        if (createAssistantWindow(memoID)) {
            const classifiedMemo = await classifyMemo(memo);
            console.log(classifiedMemo);
            await matchFilesToMemo(classifiedMemo, files);
            //matchFilesToMemo();
        }
    }
    catch (error) {
        console.error('Error in analysis-memo handler:', error);
    }
    finally {
        console.timeEnd('analyzeFile');
    }
});

// ipcMain.handle('close-assistant-window', async (event) => {
//     // 창을 닫을 때 GPT 요청 중단
//     if (abortController) {
//         abortController.abort();  // 요청 중단
//         console.log("GPT 분석 요청 중단됨.");
//         abortController = null;
//     }
//     // 창을 닫을 때 Tesseract 중단
//     if (tesseractWorker) {
//         tesseractWorker.terminate();  // Tesseract 작업 중단
//         console.log("Tesseract 작업 중단됨.");
//         tesseractWorker = null;
//     }
//     if (win) {
//         win.close();
//         win = null;
//     }
// });

//창닫기 버튼, 메세지 채널 이름 close-window

ipcMain.handle('close-assistant-window', () => {
    console.log('close-assistant-window event received');
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.close();
    }
    //창을 닫을 때 GPT 요청 중단
    if (abortController) {
        abortController.abort();  // 요청 중단
        console.log("GPT 분석 요청 중단됨.");
        abortController = null;
    }
    // 창을 닫을 때 Tesseract 중단
    if (tesseractWorker) {
        tesseractWorker.terminate();  // Tesseract 작업 중단
        console.log("Tesseract 작업 중단됨.");
        tesseractWorker = null;
    }
});

// 실행
//(async () => {
//    const classifiedMemo = await classifyNotes(memos);
//    await matchFilesToMemo(classifiedMemo, files);
//})();