const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // IPC를 통한 비동기 통신
    ipcRenderer: {
        send: (channel, data) => ipcRenderer.send(channel, data),
        invoke: (channel, data) => ipcRenderer.invoke(channel, data),
        on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args))
    },

    // 초대 url
    getInviteUrl: () => ipcRenderer.invoke('invite-url'),

    //기존 메모 불러오기 관련 메서드
    openExistMemo: (memo_id) => ipcRenderer.send('open-exist-memo', memo_id), //open-exist-memo in main.js...
    getExistMemoData: () => ipcRenderer.invoke('get-exist-memo-data'), //get-exist-memo-data in existMemo.js..., use in existMemoRenderer.js
    getFileObjByPath: (filePath) => ipcRenderer.invoke('get-file-obj-by-path', filePath), // get-file-obj-by-path in memoPull.js..., use in existMemoRenderer.js

    //콕찌르기
    kockAction: (data) => ipcRenderer.invoke('kock-action', data),

    // 화상회의 윈도우
    addConferenceWindow: () => ipcRenderer.invoke('add-conference-window'),

    //화상회의초대
    inviteAction: (data) => ipcRenderer.invoke('invite-action', data),

    openExternal: (url) => ipcRenderer.send('open-external', url),

    // 지도
    checkLocation: (location) => ipcRenderer.invoke('check-location', location), // use in assistant.js (메모 분석 결과 창)

    // 메인 프로세스로부터 url 요약 결과를 받음
    requestSummary: () => ipcRenderer.invoke('summarize-url-content',),
    onSummaryReceived: (callback) => ipcRenderer.on('summary', (event, summary) => callback(summary)),
    onSummaryError: (callback) => ipcRenderer.on('summary-error', (event, error) => callback(error)),
    // 메인 프로세스로부터 url 문자열 그대로 받음
    onRealUrlRecieved: (callback) => ipcRenderer.on('real-url', (event, realUrl) => callback(realUrl)),
    summarizeUrlInRenderer: (urlText) => ipcRenderer.invoke('summarize-url', urlText),

    //onSummaryReceived: (callback) => ipcRenderer.on('summary', (event, summary) => callback(summary)), //define in mewMemo&ExistMemo.js...use in newMemoRenderer.js & existMemoRenderer.js,,, 

    // Users관련 메서드
    openUsersWindow: () => ipcRenderer.invoke('open-users-window'),
    closeUsersWindow: () => ipcRenderer.invoke('close-users-window'),
    resizeUsersWindow: (height) => ipcRenderer.invoke('resize-users-window', height),

    // 각종 윈도우 관련 메서드
    moveFloatingWindow: (x, y) => ipcRenderer.invoke('move-floating-window', { x, y }),

    //캘린더 관련 메서드
    openCalendarWindow: () => ipcRenderer.invoke('open-calendar-window'),
    closeCalendarWindow: () => ipcRenderer.send('close-calendar-window'),
    showDialog: (description) => ipcRenderer.invoke('show-dialog', description),
    loadEventsInServer: (userId) => ipcRenderer.invoke('load-events-in-server', userId), // loadEvents() in fullCalendarRenderer.js
    addEventInServer: (userId, date, description) => ipcRenderer.invoke('add-event-in-server', { // addEvent() in fullCalendarRenderer.js
        userId: userId,
        date: date,
        description: description
    }),
    deleteEventInServer: (scheduleId) => ipcRenderer.invoke('delete-event-in-server', scheduleId), //deleteEvent() in fullCalendarRenderer.js
    updateEventInServer: (eventId, date, description) => ipcRenderer.invoke('update-event-in-server', // addEvent() in fullCalendarRenderer.js
        eventId,
        date,
        description
    ),
    //getScheduleId:()=>ipcRenderer.invoke('get-schedule-id'),//getScheduleId() in fullCalendarRenderer.js

    // 파일 실행 코드
    runFile: (tempFilePath) => ipcRenderer.invoke('run-file', tempFilePath),  // memoPull.js

    // 추가 메모 관련 메서드
    closeMemoWindow: () => ipcRenderer.invoke('close-memo-window'),
    addMemoWindow: () => ipcRenderer.invoke('add-memo-window'),

    // 사용자 정보 관련 메서드
    getUserName: () => ipcRenderer.invoke('get-user-name'),
    getUserId: () => ipcRenderer.invoke('get-user-id'), //use in memoList.js
    getUserIdByName: (friendName) => ipcRenderer.invoke('get-user-id-By-Name', { friendNameSet: friendName }),  //친구관계 테이블에서 friend_user_id를 user_name과 friend_name_set으로 검색 

    // 데이터 삽입 관련 메서드
    pushData: (data) => ipcRenderer.invoke('insert-data', data),
    createMemoId: () => ipcRenderer.invoke('create-memo-id'),

    // 데이터 불러오기 관련 메서드
    getMemo: (userId) => ipcRenderer.invoke('get-memo', userId), //use in memoList.js
    getDatas: (memoId) => ipcRenderer.invoke('fetch-data-ids-for-memo', memoId), //use in existMemoRenderer.js, memoList.js
    getFile: (dataId, filename) => ipcRenderer.invoke('fetch-file-for-data', dataId, filename), //use in existMemoRenderer.js

    // 메모리스트 관련 메서드
    memoListWindow: (show) => ipcRenderer.invoke('memo-list-window', show),

    // 메모 삭제 관련 메서드
    deleteMemo: (memoId) => ipcRenderer.invoke('delete-memo', memoId),

    // tempfile 삭제
    deleteTemp: (filePath) => ipcRenderer.invoke('deleteTempFile', filePath),

    // 메모 검색
    searchMemo: (searchTerm) => ipcRenderer.invoke('search-memo', searchTerm),

    // 요약, 번역 관련 메서드
    analyzeText: (text) => ipcRenderer.invoke('analyze-text', text),
    translateText: (text, targetLanguage) => ipcRenderer.invoke('translate-text', text, targetLanguage),
    summarizeText: (text) => ipcRenderer.invoke('summarize-text', text),
    generateTitle: (text) => ipcRenderer.invoke('generate-title', text),
    detectLanguage: (text) => ipcRenderer.invoke('detect-language', text),
    // 메모 분석 관련 메서드
    analyzeMemo: (memo, files, memoID) => ipcRenderer.invoke('analysis-memo', memo, files, memoID), // analysis.js (메모에서 분석 요청)
    closeAssistantWindow: () => ipcRenderer.invoke('close-assistant-window'), // use in assistant.js (메모 분석 결과 창)

    resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height })
});