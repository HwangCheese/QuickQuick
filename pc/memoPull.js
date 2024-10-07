const { ipcMain, shell } = require('electron');
const config = require('./config.js');
const fs = require('fs').promises;  // fs 모듈을 promises API로 가져옵니다.
const os = require('os');
const path = require('path');
const mime = require('mime-types'); // npm install mime-types

let userId = '';
let originalFilePath;
let tempFilePath;

// 서버에서 메모 데이터를 가져오는 함수
async function fetchUserMemos(userId) {
    try {
        const response = await fetch(`${config.SERVER_URL}/memo/${userId}`);

        if (!response.ok) {
            if (response.status === 404) { // 메모가 없을 경우 빈 배열을 반환
                console.log(`User ID ${userId}에 대한 메모가 없습니다.`);
                return [];
            } else if (response.status === 500) {  // 사용자 없음
                console.log(`User ID ${userId}에 해당하는 사용자가 존재하지 않습니다.`);
                return 'User not found';
            } else {
                throw new Error(`서버 응답 상태: ${response.status}`);
            }
        }
        const memoDatas = await response.json();
        return memoDatas;
    } catch (error) {
        console.error('메모 데이터를 가져오는 중 오류 발생:', error.message);
        return null;
    }
}

// 메모 ID에 해당하는 데이터ID를 모두 가져오는 함수 
async function fetchDataIdsForMemo(memoId) {
    try {
        const response = await fetch(`${config.SERVER_URL}/memo/${memoId}/data`);
        if (!response.ok) {
            throw new Error(`서버 응답 상태: ${response.status}`);
        }
        const dataIds = await response.json();
        return dataIds;
    } catch (error) {
        console.error(`메모 ID ${memoId}의 데이터 ID를 가져오는 중 오류 발생:`, error.message);
        return null;
    }
}

// userId로 해당하는 모든 memoId를 받아오는 함수를 실행합니다.
ipcMain.handle('get-memo', async (_, user_id) => {
    userId = user_id;
    console.log(userId);
    return await fetchUserMemos(userId);
});

// memoId로 해당하는 모든 dataId를 받아오는 함수를 실행합니다.
ipcMain.handle('fetch-data-ids-for-memo', async (_, memoId) => {
    return await fetchDataIdsForMemo(memoId);
});

// renderer에서 파일 실행하는 함수
ipcMain.handle('run-file', async (_, tempFilePath)=>{
    try {
        const result = await shell.openPath(tempFilePath);
        if (result) {
            console.error('파일 열기 오류:', result); // 에러가 발생하면 result에 메시지가 담김
        }
    } catch (error) {
        console.error('파일 탐색기 열기 실패:', error);
    }
    // 파일이 존재하면 경로 반환
})

// DataId에 해당하는 파일을 URL을 통해서 다운로드 받습니다.
// 다운로드 받는 파일의 경로는 C:/Users/사용자명/Appdata/Local/Temp/'파일이름'  에 있습니다.
// 결과적으로 이 함수는 위의 경로를 return 해줍니다. renderer는 이 경로를 통해서 파일을 열어서 사용하면 됩니다.
ipcMain.handle('fetch-file-for-data', async (_, dataId, filename) => {
    const fileExtension = path.extname(filename);  // filename에서 확장자 추출

    if (filename.includes('&tQ9')) {
        // filename에 '&tQ9'가 있으면, 그 이전의 파일명만 사용
        const newFileName = path.basename(filename).split('&tQ9')[0];
        originalFilePath = path.join(os.tmpdir(), `${newFileName}`); // 임시 파일 경로
        tempFilePath = path.join(os.tmpdir(), `${newFileName}&tQ9${dataId}${fileExtension}`); // 임시 파일 경로
    } else {
        // filename에 '&tQ9'가 없으면 기존 filename 사용
        originalFilePath = path.join(os.tmpdir(), `${filename}`); // 임시 파일 경로
        tempFilePath = path.join(os.tmpdir(), `${filename}&tQ9${dataId}${fileExtension}`); // 임시 파일 경로
    }
    try {
        // tempFilePath가 이미 존재하는지 확인
        try {
            await fs.access(tempFilePath);
            console.log("tempFilePath가 이미 있습니다.");
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err; // 다른 오류 처리
            }
        }
        // 서버로부터 파일 데이터 가져오기
        const response = await fetch(`${config.SERVER_URL}/data/${dataId}/file`, {
            method: 'GET',
            headers: { 'Accept': 'application/octet-stream' }
        });
        if (!response.ok) {
            throw new Error(`서버 응답 상태: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        // 비동기 방식으로 파일 저장
        await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));
        // 저장 후 파일 경로 반환
        return tempFilePath;
    } catch (error) {
        console.error('Failed to fetch file:', error);
        throw new Error('파일 다운로드 오류');
    }
});


// filePath를 받아 파일 객체를 생성하기 위한 데이터를 리턴
ipcMain.handle('get-file-obj-by-path', async (_, filePath) => {
    try {
        // 비동기 방식으로 파일 읽기
        const fileBuffer = await fs.readFile(filePath); // 콜백 대신 프로미스 사용
        const fileType = mime.lookup(filePath) || 'application/octet-stream';
        const fileName = path.basename(filePath).split('&tQ9')[0];
        console.log(fileName);
        return {
            path: filePath, // 파일 경로 포함
            buffer: fileBuffer,
            name: fileName,
            type: fileType,
            size: fileBuffer.length
        };
    } catch (error) {
        console.error('파일을 읽는 도중 오류가 발생했습니다:', error);
        throw error;
    }
});

module.exports = { fetchUserMemos, fetchDataIdsForMemo };