const { ipcMain } = require('electron');
const config = require('./config.js');

ipcMain.handle('delete-memo', async (event, memoId) => {
    try {
        const response = await fetch(`${config.SERVER_URL}/memo/${memoId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`서버 오류: ${response.statusText}`);
        }
        const data = await response.json();
        return { status: response.status, data: data };
    } catch (error) {
        console.error('메모 삭제 요청 중 오류 발생:', error.message);
        return { status: error.status || 500, error: error.message };
    }
});