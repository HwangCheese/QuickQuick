const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const config = require('./config');  // 서버 URL 설정

let calendarWindow;

// 동적 import를 위한 함수 정의
async function importFetch() {
    return (await import('node-fetch')).default;
}

// 캘린더 윈도우 생성
function createCalendarWindow() {
    const newWindow = new BrowserWindow({
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    newWindow.loadFile('templates/fullCalendar.html');

    newWindow.once('ready-to-show', () => {
        newWindow.show();
    });

    newWindow.on('closed', () => {
        calendarWindow = null;
    });

    calendarWindow = newWindow;

    return newWindow;
}

//캘린더 윈도우 생성
ipcMain.handle('open-calendar-window', () => {
    console.log('open calendar');
    if (!calendarWindow) {
        calendarWindow = createCalendarWindow();
    } else {
        calendarWindow.focus();
    }
});

// 캘린더 윈도우 닫기
ipcMain.on('close-calendar-window', () => {
    if (calendarWindow) {  // calendarWindow가 존재하는지 확인
        calendarWindow.close();
        calendarWindow = null;  // 창을 닫은 후 변수 초기화
    } else {
        console.log("캘린더 창이 이미 닫혀 있습니다.");
    }
});


//이벤트 불러오기
ipcMain.handle('load-events-in-server', async (event, userId) => {
    console.log('유저 아이디 이거임:' + userId);
    try {
        const fetch = await importFetch();
        const response = await fetch(`${config.SERVER_URL}/events/${userId}`); //fetch 요청을 GET 메서드로 사용
        if (!response.ok) {
            throw new Error(`서버 응답 상태: ${response.status}`);
        }

        const events = await response.json();
        return events;  // fullCalendarRenderer.js로 이벤트 목록 반환
    } catch (error) {
        console.error(`유저 ID ${userId}의 이벤트를 가져오는 중 오류 발생:`, error.message);
        return { error: error.message };
    }
});

//이벤트 삽입
ipcMain.handle('add-event-in-server', async (event, { userId, date, description }) => {
    try {
        // 'date'를 MySQL DATETIME 형식으로 변환
        const dateObject = new Date(date);
        const kstDate = dateObject.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }); // 'YYYY-MM-DDTHH:MM:SS' 형식
        const mysqlDate = kstDate.replace('T', ' ').slice(0, 19); // 'YYYY-MM-DD HH:MM:SS' 형식으로 변환

        console.log('Sending data to server:', {
            user_id: userId,
            event_datetime: mysqlDate, // MySQL DATETIME 형식으로 변환된 날짜
            description: description
        });

        const fetch = await importFetch();
        const response = await fetch(`${config.SERVER_URL}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                event_datetime: mysqlDate, // 서버에서 기대하는 형식으로 변환된 날짜
                description: description,
            })
        });

        if (!response.ok) {
            const errorMessage = await response.text(); // 서버로부터 에러 메시지 받기
            throw new Error(`Failed to add event: ${errorMessage}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Event 추가 실패:', error.message);
        return { error: error.message };
    }
});

//이벤트 삭제
ipcMain.handle('delete-event-in-server', async (event, scheduleId) => {
    console.log('삭제할 이벤트 아이디: ' + scheduleId);
    try {
        const fetch = await importFetch();
        const response = await fetch(`${config.SERVER_URL}/events/${scheduleId}`, {
            method: 'DELETE',  // DELETE 메서드 사용
        });
        if (!response.ok) {
            throw new Error(`서버 응답 상태: ${response.status}`);
        }
        // 서버가 JSON 대신 단순 텍스트("Event deleted")를 반환하는 경우 처리
        const resultText = await response.text();  // JSON 대신 텍스트로 처리
        console.log(resultText);

        return { success: true, message: resultText };  // 클라이언트에 성공 응답 반환
    }
    catch (error) {
        console.error(`삭제할 일정 ID ${scheduleId}의 이벤트를 가져오는 중 오류 발생:`, error.message);
        return { error: error.message };
    }
});

// 이벤트 수정
ipcMain.handle('update-event-in-server', async (event, scheduleId, event_datetime, description) => {
    console.log('수정할 이벤트 아이디: ' + scheduleId);
    console.log('수정할 데이터: ' + description + ' : ' + event_datetime);

    // 'event_datetime'을 MySQL DATETIME 형식으로 변환
    const dateObject = new Date(event_datetime);
    const kstDate = dateObject.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }); // 'YYYY-MM-DDTHH:MM:SS' 형식
    const mysqlDate = kstDate.replace('T', ' ').slice(0, 19); // 'YYYY-MM-DD HH:MM:SS' 형식으로 변환

    console.log('MySQL DATETIME 형식: ' + mysqlDate);

    try {
        const fetch = await importFetch();
        const response = await fetch(`${config.SERVER_URL}/events/${scheduleId}`, {
            method: 'PUT',  // PUT 메서드 사용
            headers: {
                'Content-Type': 'application/json'  // JSON 형식으로 보낸다는 것을 명시
            },
            body: JSON.stringify({
                event_datetime: mysqlDate,
                description: description
            })
        });

        if (!response.ok) {
            throw new Error(`서버 응답 상태: ${response.status}`);
        }

        // 서버가 JSON 대신 텍스트("Event updated")를 반환하는 경우 처리
        const resultText = await response.text();  // 응답을 텍스트로 처리
        console.log('수정 결과: ' + resultText);

        return { success: true, message: resultText };  // 클라이언트에 성공 응답 반환
    } catch (error) {
        console.error(`수정할 일정 ID ${scheduleId}의 이벤트를 수정하는 중 오류 발생:`, error.message);
        return { error: error.message };
    }
});


// //Schedule ID 반환
// ipcMain.handle('get-schedule-id', () => {
//     return scheduleId; // 일정의 ID 반환
// });




module.exports = { createCalendarWindow };