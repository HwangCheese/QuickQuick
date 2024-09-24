const { ipcMain } = require('electron');
const fs = require('fs').promises; // promises로 가져옴
const os = require('os');
const path = require('path');

const tempDir = os.tmpdir(); // 임시 파일 디렉토리 경로

// 임시 파일 정리 함수
async function cleanTempFiles() {
    try {
        const files = await fs.readdir(tempDir);
        const deletePromises = files.map(async (file) => {
            const filePath = path.join(tempDir, file);
            try {
                await fs.unlink(filePath); // 파일 삭제
                console.log(`삭제됨: ${filePath}`);
            } catch (error) {
                console.error(`파일 삭제 중 오류 발생: ${error.message} - ${filePath}`);
                // 삭제할 수 없으면 건너뜁니다.
            }
        });
        await Promise.all(deletePromises);
        console.log('모든 임시 파일 정리 완료.');
    } catch (error) {
        console.error('임시 파일 정리 중 오류 발생:', error);
    }
}

ipcMain.handle('deleteTempFile', async (event, filePath) => {
    try {
        if (typeof filePath !== 'string') {
            throw new TypeError('filePath는 문자열이어야 합니다.');
        }
        await fs.unlink(filePath); // 비동기적으로 파일 삭제
        console.log(`파일 삭제됨: ${filePath}`);
    } catch (error) {
        console.error('파일 삭제 실패:', error);
    }
});

module.exports = { cleanTempFiles };