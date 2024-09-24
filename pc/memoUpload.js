const { ipcMain } = require('electron');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const config = require('./config.js');

async function importFetch() {
    return (await import('node-fetch')).default;
}

// 메모를 서버에 저장하는 함수
async function insertMemoWithData(data) {
    try {
        const { posX, posY, width, height, dataTxt, filesToUpload, title, user_Id, memo_id } = data;
        const fetch = await importFetch();
        //const memoId = uuidv4();  // memoId는 랜덤 난수
        console.log('userid: ' + user_Id);
        const memoData = {
            memo_id: memo_id,  // 랜덤 난수
            userId: user_Id,   // 현재 유저아이디 
            theme: 'white',  // PC에서 저장하는 색(테마)는 흰색 디폴트로
            posX: posX,     // 메모의 왼쪽 위 X 좌표
            posY: posY,     // 메모의 왼쪽 위 Y 좌표
            width: width,   // 메모의 너비(가로)
            height: height,   // 메모의 높이(세로)
            title: title,  // 메모의 제목 
            data_txt: dataTxt,  // 메모에 저장된 텍스트
            is_read: 'true',   // 기본값: true
            sender_user_id: user_Id // 보낸 사람은 본인 ID
        };

        console.log(memoData);

        // memoData 객체의 모든 키-값 쌍을 FormData 객체에 추가
        const formData = new FormData();
        for (const [key, value] of Object.entries(memoData)) {
            formData.append(key, value);
        }

        const filePaths = filesToUpload
            ? filesToUpload.split(';').map(filePath => filePath.trim()).filter(Boolean)
            : [];

        console.log('filesToUpload:', filePaths);

        if ((!dataTxt || dataTxt.trim() === '') && filePaths.length === 0) {
            console.log("메모에 내용이 없고 첨부된 파일도 없어서 저장하지 않습니다.");
            return null; // 저장하지 않고 함수 종료
        }
        
        // 파일 업로드 부분
        if (filePaths.length > 0) {
            for (const filePath of filePaths) {
                if(filePath==='undefined')
                    continue;
                console.log('확인할 파일 경로:', filePath);  // 파일 경로 로그 출력
                if (filePath && typeof filePath === 'string') {
                    if (fs.existsSync(filePath)) {
                        const fileName = path.basename(filePath);
                        formData.append('files', fs.createReadStream(filePath), fileName);
                    } else {
                        console.warn(`파일을 찾을 수 없습니다 또는 잘못된 파일 경로입니다: ${filePath}`);
                    }
                } else {
                    console.warn(`파일 경로가 잘못되었습니다: ${filePath}`);
                }
            }
        } else {
            console.log('업로드할 파일이 없습니다.');
        }
        const response = await fetch(`${config.SERVER_URL}/memo`, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        if (!response.ok) {
            throw new Error(`서버 응답 상태: ${response.status}`);
        }
        const responseData = await response.json();
        console.log('메모와 파일 업로드 완료:', responseData);
        return responseData;

    } catch (error) {
        console.error('Error inserting data:', error.message);
    }
}

//사용자가 작성한 메모를 파일 데이터와 함께 서버로 insert
ipcMain.handle('insert-data', async (event, data) => {
    console.log(data);
    await insertMemoWithData(data);
});

ipcMain.handle('create-memo-id', () => {
    return uuidv4();
});

module.exports={insertMemoWithData};