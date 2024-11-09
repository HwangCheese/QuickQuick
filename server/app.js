const express = require("express");
// 파일 시스템 사용
const fs = require('fs');
const http = require('http');
// 랜덤 문자열 data_id 생성
const { v4: uuidv4 } = require('uuid');
// 이미지 파일 처리
const multer = require('multer');
// 암호화 관련 
const crypto = require('crypto');
// 주기적으로 만료된 토큰 삭제
const cron = require('node-cron');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const app = express();
const port = 3000;
const socketIo = require('socket.io');
const mysql = require('mysql2');
const { exec } = require('child_process'); // child_process 모듈 불러오기
const { saveMemoToPinecone, searchInPinecone, deleteMemoFromPinecone } = require('./pinecone');  // pineCone db 연결
app.use(express.json());


const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/roomId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.use(cors());
app.use(express.static('public'));

const users = {};           // 사용자 ID -> 소켓 ID 매핑
const userSocketMap = {};   // 사용자 이름 -> 소켓 ID 매핑
const usersSocketId = {};

io.on('connection', (socket) => {
    // 클라이언트가 방에 참여할 때 호출
    socket.on('join-room', (user) => {
        const [userId, name, room] = user.split(';');
        const roomId = room;
    
        //console.log(`사용자 ${userId}(${name})가 방 ${roomId}에 참여했습니다.`);
    
        // 사용자의 소켓 ID와 이름을 저장
        users[socket.id] = { userId, username: name };
        usersSocketId[userId]=socket.id;
        userSocketMap[name] = socket.id;
        socket.join(roomId);
        socket.roomId = roomId;
    
        // 기존 클라이언트 정보(이름 포함)를 전송
        const clientsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
        const clients = Array.from(clientsInRoom).filter(id => id !== socket.id);
        const existingClientsInfo = clients.map(clientId => ({
            clientId: clientId,
            username: users[clientId]?.username || 'Anonymous'
        }));
    
        socket.emit('existing_clients', existingClientsInfo);
    
        // 새로운 클라이언트가 입장했음을 다른 클라이언트들에게 알림
        socket.to(roomId).emit('new_client', { clientId: socket.id, username: name });
    });
    

    // 친구 추가 요청 처리
    socket.on('add-friend', (data) => {
        const { requesterId, receiverId, requesterName } = data;
        console.log(`친구 추가 요청: ${requesterName}(${requesterId}) -> ${receiverId}`);

        // 수신자 소켓 ID를 가져와서 친구 추가 요청을 전송
        const receiverSocketId = usersSocketId[receiverId];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('friend-request', {
                requesterId,
                requesterName,
                receiverId
            });
        } else {
            console.log(`받는 사람의 소켓 ID를 찾을 수 없습니다. 사용자 ID: ${receiverId}`);
        }
    });

    socket.on('webrtc_offer', (data) => {
        socket.to(data.targetId).emit('webrtc_offer', {
            sdp: data.sdp,
            senderId: socket.id
        });
    });

    socket.on('webrtc_answer', (data) => {
        socket.to(data.targetId).emit('webrtc_answer', {
            sdp: data.sdp,
            senderId: socket.id
        });
    });

    socket.on('webrtc_ice_candidate', (data) => {
        socket.to(data.targetId).emit('webrtc_ice_candidate', {
            candidate: data.candidate,
            senderId: socket.id
        });
    });

    socket.on('chat_message', (data) => {
        if (data.roomId) {
            io.in(data.roomId).emit('chat_message', {
                sender: data.sender,  // 사용자 이름 포함
                message: data.message
            });
        }
    });    

    socket.on('start-conference', (roomId) => {
        socket.join(roomId); // 방에 참여
    
        setTimeout(() => {
            const clientsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
            const clients = Array.from(clientsInRoom).filter(id => id !== socket.id);
    
            if (clients.length > 0) {
                socket.emit('existing_clients', clients);
                clients.forEach(clientId => {
                    const clientSocket = io.sockets.sockets.get(clientId);
                    if (clientSocket) {
                        console.log(`Sending new_client event with username: ${clientSocket.username}`);
                        socket.emit('new_client', {
                            clientId: clientSocket.id,
                            username: clientSocket.username  // 닉네임 전송
                        });
                    }
                });
            }
        }, 100);
    });    

    socket.on('transcription', (data) => {
        const { roomId, senderId, senderName, transcript } = data;

        if (roomId) {
            socket.to(roomId).emit('transcription', {
                senderId: senderId,
                senderName: senderName,
                transcript: transcript
            });
        }
    });

    socket.on('leave-room', (roomId) => {
        if (roomId) {
            console.log(`클라이언트 ${socket.id}가 방 ${roomId}에서 나갔습니다.`);
            socket.leave(roomId); // 클라이언트를 방에서 제거
            
            // 방의 다른 클라이언트들에게 해당 클라이언트가 방을 떠났음을 알림
            socket.to(roomId).emit('client_left', socket.id);

            // 방 ID 초기화
            roomId = null;
        }
    });

    // 클라이언트가 연결을 끊을 때 처리
    socket.on('disconnect', () => {
        console.log('클라이언트 연결 종료:', socket.id);
        
        // 클라이언트가 방에 있을 경우, 방에서 나가게 처리
        const roomId = socket.roomId;
        if (roomId) {
            socket.to(roomId).emit('client_left', socket.id);
            socket.leave(roomId);
        }
        
        // 연결 종료된 소켓의 사용자 정보를 삭제
        if (socket.userId && users[socket.userId]) {
            delete users[socket.userId];
        }

        // 사용자 이름과 소켓 ID 매핑에서 삭제
        if (socket.username && userSocketMap[socket.username]) {
            delete userSocketMap[socket.username];
        }

        // 클라이언트가 방에 있을 경우, 방에서 나가게 처리
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomId => {
            socket.to(roomId).emit('client_left', socket.id);
            socket.leave(roomId);
        });
    });
});

// MySQL 데이터베이스 연결 설정
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',  // MySQL 사용자명
    password: 'dkdk0625',  // MySQL 비밀번호
    database: 'memoapp',  // 사용할 데이터베이스명
    charset: 'utf8mb4'   // 문자 집합 설정
});

// 데이터베이스 연결
db.connect((err) => {
    if (err) {
        console.error('데이터베이스 연결 실패', err.message);
    } else {
        console.log('데이터베이스 연결 성공');
    }
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userDir = path.join(__dirname, 'Users', req.body.userId, 'Memo', 'media');
        fs.mkdir(userDir, { recursive: true }, (err) => {
            if (err) return cb(err);
            cb(null, userDir);
        });
    },
    filename: function (req, file, cb) {
        // `dataIds` 배열을 요청 객체에 저장하여 나중에 사용할 수 있도록 함
        if (!req.dataIds) {
            req.dataIds = [];
        }
        // 새로운 dataId 생성 및 저장
        const dataId = uuidv4();
        req.dataIds.push({ dataId, file });
        // 파일 이름을 dataId로 설정
        const uniqueName = `${dataId}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// 미들웨어 설정 -> json 형태 데이터 허용
app.use(bodyParser.json());

// 50MB로 설정 (필요에 따라 조정)
app.use(bodyParser.json({ limit: '1024mb' }));  

// QR 코드 생성 함수
function generateQRCode(id) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(id, (err, url) => {
            if (err) reject(err);
            resolve(url);
        });
    });
}

// 임시 토큰 생성 함수
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

cron.schedule('0 0 * * *', () => {
    // 매일 자정에 실행
    db.query('DELETE FROM Tokens WHERE expiryTime < ?', [Date.now()], (err, result) => {
        if (err) {
            console.error('만료된 토큰 삭제 오류:', err);
        } else {
            console.log('만료된 토큰 삭제 완료');
        }
    });
});

// QR코드 제공 (PC에서 모바일로도 접속 가능한 QR을 제공)
app.get('/generate-qr/:userId', async (req, res) => {
    const userId = req.params.userId;
    console.log(`(mobile) ${userId}: 로그인 QR코드 생성`);
    try {
        const token = generateToken();  // 임시 토큰 생성
        const expiryTime = Date.now() + 10 * 60 * 1000;  // 토큰 만료 시간 10분
        // 생성된 토큰을 데이터베이스에 저장
        db.query('INSERT INTO Tokens (token, userId, expiryTime) VALUES (?, ?, ?)', 
            [token, userId, expiryTime], 
            (err, result) => {
                if (err) {
                    console.error('토큰 저장 오류:', err);
                    return res.status(500).send('서버 오류로 QR 코드를 생성할 수 없습니다.');
                }
                generateQRCode(token)
                    .then(qrCodeDataUrl => {
                        res.send(`<img src="${qrCodeDataUrl}" alt="QR Code">`);
                    })
                    .catch(err => {
                        res.status(500).send('QR 코드 생성 실패');
                    });
            });
    } catch (err) {
        res.status(500).send('QR 코드 생성 실패');
    }
});


// QR 로그인 (모바일 전용)
app.post('/login-mobile', (req, res) => {
    const { token } = req.body;
    db.query('SELECT userId, expiryTime FROM Tokens WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: '유효하지 않은 토큰' });
        }
        const { userId, expiryTime } = results[0];
        if (Date.now() > expiryTime) {
            return res.status(401).json({ error: '토큰이 만료되었습니다.' });
        }
        // 토큰이 유효하면 토큰을 삭제
        //db.query('DELETE FROM Tokens WHERE token = ?', [token], (err) => {
            //if (err) {
                //return res.status(500).json({ error: '토큰 삭제 오류' });
            //}
            // 사용자 정보 조회
            db.query('SELECT * FROM User WHERE id = ?', [userId], (err, results) => {
                if (err || results.length === 0) {
                    return res.status(401).json({ error: '해당 전화번호의 유저가 없습니다.' });
                }
                // 로그인 성공
                res.status(200).json({ message: '(mobile) 로그인 성공' });
                console.log(`(mobile) user:${userId} 님이 접속 했습니다.`);
            });
        
    });
});

app.get('/get-userid', (req, res) => {
    const token = req.query.token;  // 쿼리 파라미터로 토큰을 받음
    if (!token) {
        return res.status(400).json({ error: '토큰이 필요합니다.' });
    }
    // 데이터베이스에서 해당 토큰으로 유저 조회
    db.query('SELECT userId, expiryTime FROM Tokens WHERE token = ?', [token], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: '유효하지 않은 토큰' });
        }
        const { userId, expiryTime } = results[0];
        // 토큰 만료 여부 확인
        if (Date.now() > expiryTime) {
            return res.status(401).json({ error: '토큰이 만료되었습니다.' });
        }
        // 유저 정보 조회
        db.query('SELECT id, name FROM User WHERE id = ?', [userId], (err, results) => {
            if (err || results.length === 0) {
                return res.status(500).json({ error: '유저 정보를 가져오는 데 실패했습니다.' });
            }
            const { id, name } = results[0];
            // 유효한 토큰인 경우 id와 name 반환
            res.status(200).json({ id, name });
        });
    });
});

//id로 이름리턴
app.get('/get-username', (req, res) => {
    const userId = req.query.userId; // 쿼리 파라미터로 userId를 받음
    if (!userId) {
        return res.status(400).json({ error: 'userId가 필요합니다.' });
    }

    // 데이터베이스에서 userId로 사용자 조회
    db.query('SELECT name FROM User WHERE id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: '유저를 찾을 수 없습니다.' });
        }

        // 조회된 사용자 이름 반환
        const { name } = results[0];
        res.status(200).json({ name });

    });
});

// 내이름과 친구 이름으로 friend_user_Id를 반환하는 API
app.get('/get-friend-user-id', (req, res) => {
    const userName = req.query.userName; // 쿼리 파라미터로 userName을 받음
    const friendNameSet = req.query.friendNameSet; // 쿼리 파라미터로 friendNameSet을 받음
    if (!userName || !friendNameSet) {
        return res.status(400).json({ error: 'userName과 friendNameSet이 필요합니다.' });
    }
    // 데이터베이스에서 friend_user_id 조회
    db.query(
        'SELECT friend_user_id FROM Friend WHERE user_name = ? AND friend_name_set = ?',
        [userName, friendNameSet],
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 오류가 발생했습니다.' });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: '친구를 찾을 수 없습니다.' });
            }
            // 조회된 friend_user_id 반환
            const { friend_user_id } = results[0];
            res.status(200).json({ friendUserId: friend_user_id });
        }
    );
});


// 사용자 정보 확인 API (회원가입 여부 체크)
app.get('/check-user/:userId', (req, res) => {
    const userId = req.params.userId;
    db.query('SELECT * FROM User WHERE id = ?', [userId], (err, results) => {
        if (err) {
            console.error('데이터베이스 쿼리 오류:', err);
            return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
        }
        if (results.length > 0) {
            const user = results[0];
            res.status(200).json(user);  // 사용자 정보를 모두 포함한 JSON 응답
        } else {
            res.status(404).json({ error: '가입되지 않은 사용자입니다.' });
        }
    });
});

// 회원가입 API
app.post('/signup', (req, res) => {
    const { user_id, user_name } = req.body;
    if (!user_id || !user_name) {
        return res.status(400).json({ error: '전화번호, 이름이 비어있음.' });
    }
    // 중복 사용자 체크 (id)
    db.query('SELECT id FROM User WHERE id = ?', [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
        }
        if (results.length > 0) {
            return res.status(409).json({ error: '이미 존재하는 id 입니다.' });
        }
        // 중복 이름 체크
        db.query('SELECT name FROM User WHERE name = ?', [user_name], (err, results) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
            }
            let finalUserName = user_name;
            if (results.length > 0) {
                // 이름 중복 -> 이름 뒤에 랜덤 숫자(최대 4자리) 추가
                const randomNumber = Math.floor(Math.random() * 10000);
                finalUserName = `${user_name}${randomNumber}`;
            }
            // 데이터베이스에 사용자 정보 저장
            db.query('INSERT INTO User (id, name) VALUES (?, ?)', [user_id, finalUserName], (err) => {
                if (err) {
                    return res.status(500).json({ error: '데이터베이스 삽입 오류' });
                }
                // 디렉토리 생성
                const userDir = path.join(__dirname, 'Users', user_id);
                const dataDir = path.join(userDir, 'Memo');
                const mediaDir = path.join(dataDir, 'media');
                const txtDir = path.join(dataDir, 'txt');
                fs.mkdir(userDir, { recursive: true }, (err) => {
                    if (err) return res.status(500).json({ error: '디렉토리 생성 오류' });
                    fs.mkdir(dataDir, { recursive: true }, (err) => {
                        if (err) return res.status(500).json({ error: 'Memo 디렉토리 생성 오류' });
                        fs.mkdir(mediaDir, { recursive: true }, (err) => {
                            if (err) return res.status(500).json({ error: 'media 디렉토리 생성 오류' });
                            fs.mkdir(txtDir, { recursive: true }, (err) => {
                                if (err) return res.status(500).json({ error: 'txt 디렉토리 생성 오류' });
                                res.status(201).json({ message: '회원가입 성공', finalUserName });
                                console.log(`user_id:${user_id}, user_name:${finalUserName} 님이 회원가입 했습니다.`);
                            });
                        });
                    });
                });
            });
        });
    });
});


// ISO 8601 형식을 MySQL의 DATETIME 형식으로 변환하는 함수
function formatDateForMySQL(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// 메모 (텍스트 + 파일 최디 10개 업로드) api
app.post('/memo', upload.array('files', 10), async (req, res) => {
    const { userId, theme, posX, posY, width, height, data_txt, memo_id, title } = req.body;
    const files = req.files;
    if (!userId) {
        return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }
    const date = formatDateForMySQL(new Date());
    const memoId = memo_id;  // 클라이언트 쪽에서 랜덤 아이디값 만든후 보내줄 것임.
    const senderUserId = userId; // 처음 생성 시 메모의 소유자는 userId
    const isRead = true; // 새로 생성된 메모는 읽음 상태로 저장
    
    const memoQuery = `
        INSERT INTO Memo (memo_id, user_id, date, theme, posX, posY, width, height, title, is_read, sender_user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await query(memoQuery, [memoId, userId, date, theme, posX, posY, width, height, title, isRead, senderUserId]);
        const insertData = [];
        // txt 데이터 처리
        const dataId = uuidv4();  // Data UUID 생성
        const userDir = path.join(__dirname, 'Users', userId, 'Memo', 'txt');
        const filePath = path.join(userDir, `${dataId}.txt`);
        const fileName = `data.txt`;

        await fs.promises.mkdir(userDir, { recursive: true });
        await fs.promises.writeFile(filePath, data_txt);

        insertData.push({
            dataId: dataId,
            memoId: memoId,
            filePath: filePath,
            format: 'txt',
            contentType: 'txt',
            fileName: fileName
        });
        

        // 여러 개의 media 파일 처리
        if (files.length > 0) {
            for (const { dataId, file } of req.dataIds) {
                const filePath = path.join(__dirname, 'Users', userId, 'Memo', 'media', `${dataId}${path.extname(file.originalname)}`);
                const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');  // UTF-8로 변환

                insertData.push({
                    dataId: dataId,
                    memoId: memoId,
                    filePath: filePath,
                    format: path.extname(file.originalname).substring(1),
                    contentType: 'media',
                    fileName: fileName
                });
            }
        }
        console.log(`내용:${data_txt}, id:${memoId}`);
        await saveMemoToPinecone(userId, data_txt, memoId);  // Pinecone 저장
        await insertDataToDB(res, insertData);

    } catch (err) {
        console.error('서버 오류:', err.message);
        if (!res.headersSent) {
            return res.status(500).json({ error: '서버 오류', message: err.message });
        }
    }
});

// 데이터베이스에 삽입
async function insertDataToDB(res, insertData) {
    const insertQuery = `
        INSERT INTO Data (data_id, memo_id, path, format, content_type, file_name) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const updateQuery = `
        UPDATE Data 
        SET memo_id = ?, path = ?, format = ?, content_type = ?, file_name = ? 
        WHERE data_id = ?
    `;

    for (const data of insertData) {
        try {
            // 중복 데이터 확인
            const result = await query('SELECT COUNT(*) AS count FROM Data WHERE data_id = ?', [data.dataId]);
            const count = result?.[0]?.count || 0;

            if (count > 0) {
                // 중복된 data_id가 있으면 해당 데이터 업데이트
                console.log('중복된 data_id:', data.dataId, '업데이트 중...');
                await query(updateQuery, [data.memoId, data.filePath, data.format, data.contentType, data.fileName, data.dataId]);
            } else {
                // 중복되지 않으면 새 데이터 삽입
                await query(insertQuery, [data.dataId, data.memoId, data.filePath, data.format, data.contentType, data.fileName]);
            }
        } catch (err) {
            console.error('Data 데이터베이스 처리 오류:', err.message);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Data 데이터베이스 처리 오류', message: err.message });
            }
        }
    }

    if (!res.headersSent) {
        console.log("메모 및 데이터 저장 완료");
        res.status(201).json({ message: 'Memo 및 데이터가 성공적으로 저장되었습니다.' });
    }
}

function query(sql, params) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// 메모 의미적 검색
app.post('/search-memos', async (req, res) => {
    const { queryText, userId } = req.body;
    if (!queryText) {
        return res.status(400).json({ error: '검색 텍스트를 입력해주세요.' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'userId가 필요합니다.' });
    }
    try {
        console.log('결과 나오기 전 검색 텍스트:', queryText);
        const results = await searchInPinecone(userId, queryText);
        console.log("유사한 메모 검색 결과:", results);

        res.json({ success: true, data: results });
    } catch (error) {
        console.error(`검색 API 오류: ${error.message}`);
        res.status(500).json({ success: false, error: '검색 중 오류가 발생했습니다.' });
    }
});

// userId로 모든 가진 메모를 가져오는 API 
app.get('/memo/:id', (req, res) => {
    const userId = req.params.id;

    // Memo 테이블에서 해당 userId의 모든 메모를 date 순으로 가져오는 쿼리
    const memoQuery = `
        SELECT memo_id, user_id, date, theme, posX, posY, width, height, title, is_read, sender_user_id
        FROM Memo 
        WHERE user_id = ?
        ORDER BY date DESC;  -- date 컬럼을 기준으로 내림차순 정렬 (최신 메모가 가장 위에 오도록)
    `;

    db.query(memoQuery, [userId], (err, memoRows) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류', message: err.message });
        }
        if (memoRows.length === 0) {
            return res.status(404).json({ message: '해당 사용자의 메모를 찾을 수 없습니다.' });
        }
        // 결과를 클라이언트로 전송
        console.log(`${userId}: 메모를 모두 불러옵니다.`);
        res.status(200).json(memoRows);
    });
});


// 메모 ID로 메모객체를 가져오는 API
app.get('/memoID/:id', (req, res) => {
    const memo_id = req.params.id; // URL에서 memo_id를 받아옴
    db.query('SELECT * FROM memo WHERE memo_id = ?', [memo_id], (err, row) => {
        if (err) {
            console.error('메모 조회 중 오류:', err.message);
            res.status(500).json({ error: '메모 조회 실패' });
        } else if (!row) {
            res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
        } else {
            res.json(row); // 메모 객체 반환
        }
    });
});

// 메모 ID로 모든 데이터 ID를 가져오는 API
app.get('/memo/:memoId/data', (req, res) => {
    const memoId = req.params.memoId;

    // 특정 메모 ID에 해당하는 모든 data_id를 가져오는 쿼리
    const dataQuery = `
        SELECT data_id, memo_id, path, format, content_type, file_name 
        FROM Data 
        WHERE memo_id = ?
    `;

    db.query(dataQuery, [memoId], (err, dataRows) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류', message: err.message });
        }
        if (dataRows.length === 0) {
            return res.status(404).json({ message: '해당 메모에 연결된 데이터를 찾을 수 없습니다.' });
        }

        // 결과를 클라이언트로 전송
        res.status(200).json(dataRows);
    });
});

// data_id로 파일을 전송하는 API
app.get('/data/:dataId/file', (req, res) => {
    const dataId = req.params.dataId;

    // 데이터베이스 쿼리
    const dataQuery = `
        SELECT path, content_type 
        FROM Data 
        WHERE data_id = ?
    `;
    db.query(dataQuery, [dataId], (err, dataRows) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류', message: err.message });
        }
        if (dataRows.length === 0) {
            return res.status(404).json({ message: '해당 data_id에 대한 파일을 찾을 수 없습니다.' });
        }

        const { path: filePath, content_type } = dataRows[0];
        // 파일의 실제 경로 설정
        const fullPath = path.resolve(filePath);
        // 파일 존재 여부 확인
        fs.access(fullPath, fs.constants.F_OK, (err) => {
            if (err) {
                return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
            }
            // data_id를 파일 이름으로 사용
            const fileName = `${dataId}`;
            // Content-Type과 Content-Disposition 헤더 설정
            res.setHeader('Content-Type', content_type);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

            // 파일 전송
            res.sendFile(fullPath, (err) => {
                if (err) {
                    return res.status(500).json({ error: '파일 전송 오류', message: err.message });
                }
            });
        });
    });
});

// memo_id에 해당하는 데이터 모두 삭제
app.delete('/memo/:memo_id', async (req, res) => {
    const memo_id = req.params.memo_id;

    // 1. memo_id에 해당하는 user_id를 Memo 테이블에서 가져옵니다.
    db.query('SELECT user_id FROM Memo WHERE memo_id = ?', [memo_id], async (err, rows) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
        }
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
        }

        const user_id = rows[0].user_id;

        // 2. memo_id에 해당하는 파일 경로들을 가져옵니다.
        db.query('SELECT path FROM Data WHERE memo_id = ?', [memo_id], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
            }
            if (!rows || rows.length === 0) {
                return res.status(404).json({ error: '관련 파일을 찾을 수 없습니다.' });
            }

            // 3. 파일들을 비동기적으로 삭제합니다.
            const deleteFilesPromises = rows.map(row => {
                return new Promise((resolve, reject) => {
                    fs.unlink(row.path, (err) => {
                        if (err) {
                            console.error('파일 삭제 오류:', err);
                            reject(err);
                        } else {
                            console.log('파일 삭제 성공:', row.path);
                            resolve();
                        }
                    });
                });
            });

            // 4. 모든 파일 삭제가 완료되면 데이터베이스에서 데이터를 삭제합니다.
            Promise.all(deleteFilesPromises)
                .then(() => {
                    db.query('DELETE FROM Data WHERE memo_id = ?', [memo_id], function(err) {
                        if (err) {
                            return res.status(500).json({ error: 'Data 테이블 데이터베이스 삭제 오류' });
                        }

                        db.query('DELETE FROM Memo WHERE memo_id = ?', [memo_id], function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Memo 테이블 데이터베이스 삭제 오류' });
                            }

                            // 5. Pinecone에서 memo_id에 해당하는 벡터 삭제
                            deleteMemoFromPinecone(memo_id, user_id)
                                .then(() => {
                                    console.log("Pinecone에서 벡터 삭제 성공:", memo_id);
                                    res.status(200).json({ message: '메모와 관련된 모든 데이터와 파일이 성공적으로 삭제되었습니다.' });
                                })
                                .catch(error => {
                                    return res.status(500).json({ error: 'Pinecone 삭제 중 오류가 발생했습니다.', message: error.message });
                                });
                        });
                    });
                })
                .catch(err => {
                    res.status(500).json({ error: '파일 삭제 중 오류가 발생했습니다.', message: err.message });
                });
        });
    });
});

// 콕 API
app.post('/kock', async (req, res) => {
    const { sourceUserName, targetUserName } = req.body;
    const friendNameQuery = `
        SELECT friend_user_name 
        FROM Friend 
        WHERE user_name = ? AND friend_name_set = ?`;
    const friendNameResult = await query(friendNameQuery, [sourceUserName, targetUserName]);
    const targetUserDisplayName = friendNameResult[0].friend_user_name;

    console.log(targetUserDisplayName);
    const friendNameQuery2 = `
        SELECT friend_name_set 
        FROM Friend 
        WHERE user_name = ? AND friend_user_name = ?`;
    const friendNameResult2 = await query(friendNameQuery2, [targetUserDisplayName, sourceUserName]);
    const targetUserDisplayName2 = friendNameResult2.length > 0 
    ? friendNameResult2[0].friend_name_set
    : sourceUserName;

    const targetSocketId = userSocketMap[targetUserDisplayName];  //소켓 ID 찾기

    console.log('소켓아이디: ' + targetSocketId);
    if (targetSocketId) {
        io.to(targetSocketId).emit('kock', `${targetUserDisplayName2}님이 당신을 콕 찔렀어요!`);
        console.log(sourceUserName+'님이 '+ targetUserDisplayName+'님을 콕 찔렀네요.');
        res.status(200).json({ message:  '콕이 성공적으로 전송되었습니다.' });
    } else {
        console.log(`대상 사용자 ${targetUserName} 님이 접속 중이 아닙니다!`);
        return res.status(404).json({ message: '콕 전송 실패. 사용자가 접속중이 아닙니다.' });
    }
});

// 메모 전송 API
app.post('/send-memo', async (req, res) => {
    const { sourceUserId, targetUserId, memoId } = req.body;
    console.log(sourceUserId);
    console.log(targetUserId);
    console.log(memoId);
    if (!sourceUserId || !targetUserId || !memoId) {
        return res.status(400).json({ error: '필수 데이터가 누락되었습니다.' });
    }

    try {
        // 1. 메모 정보를 데이터베이스에서 가져오기
        const memoQuery = 'SELECT * FROM Memo WHERE memo_id = ? AND user_id = ?';
        const memo = await query(memoQuery, [memoId, sourceUserId]);

        if (memo.length === 0) {
            return res.status(404).json({ error: '해당 메모를 찾을 수 없습니다.' });
        }

        // 2. 메모 데이터를 새로운 사용자에게 추가하기
        const newMemoId = uuidv4();  // 새로운 메모 ID 생성
        const newMemoQuery = `
            INSERT INTO Memo (memo_id, user_id, date, theme, posX, posY, width, height, title, is_read, sender_user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
       // 여기서, VALUES의 매개변수 개수와 전달할 값의 개수를 맞춤
        await query(newMemoQuery, [
            newMemoId,
            targetUserId,
            memo[0].date,
            memo[0].theme,
            memo[0].posX,
            memo[0].posY,
            memo[0].width,
            memo[0].height,
            memo[0].title, // title을 올바른 위치에 추가
            false,  // is_read는 받는 사람 입장에서 false로 설정
            sourceUserId // sender_user_id는 메모를 보낸 사람의 ID
        ]);

        // 3. 해당 메모에 관련된 모든 데이터 가져오기
        const dataQuery = 'SELECT * FROM Data WHERE memo_id = ?';
        const data = await query(dataQuery, [memoId]);

        // 4. 데이터 파일 복사 및 데이터베이스 업데이트
        if (data.length > 0) {
            for (const item of data) {
                const newDataId = uuidv4();  // 새로운 데이터 ID 생성
                const oldFilePath = item.path;
                const fileExtension = path.extname(item.file_name);
                if (fileExtension === '.txt') {
                    continue; // 텍스트 파일은 나중에 처리
                }
                const newFilePath = path.join(__dirname, 'Users', targetUserId, 'Memo', 'media', `${newDataId}${fileExtension}`);
                //console.log('서버 경로: ' + newFilePath);
                //console.log('원래 경로: ' + oldFilePath);
                // 파일 복사
                try {
                    // 대상 경로의 디렉토리가 존재하지 않으면 생성
                    await fs.promises.mkdir(path.dirname(newFilePath), { recursive: true });
                    // 파일 복사
                    await fs.promises.copyFile(oldFilePath, newFilePath);
                    console.log('파일 복사 성공');
                    // 데이터베이스에 새로운 데이터 추가
                    const newDataQuery = `INSERT INTO Data (data_id, memo_id, path, format, content_type, file_name) 
                                          VALUES (?, ?, ?, ?, ?, ?)`;
                    await query(newDataQuery, [newDataId, newMemoId, newFilePath, item.format, item.content_type, item.file_name]);
                } catch (copyErr) {
                    console.error('파일 복사 중 오류:', copyErr.message);
                }
            }
        }

        // 5. 텍스트 파일 디렉터리 생성 및 복사
        const txtDir = path.join(__dirname, 'Users', targetUserId, 'Memo', 'txt');
        await fs.promises.mkdir(txtDir, { recursive: true }); // 디렉터리 생성

        const txtFileQuery = 'SELECT * FROM Data WHERE memo_id = ? AND format = "txt"';
        const txtFile = await query(txtFileQuery, [memoId]);

        if (txtFile.length > 0) {
            const txtItem = txtFile[0];
            const newTxtDataId = uuidv4();  // 새로운 데이터 ID 생성
            const oldTxtFilePath = txtItem.path;
            const newTxtFilePath = path.join(txtDir, `${newTxtDataId}.txt`);

            // 텍스트 파일 복사
            await fs.promises.copyFile(oldTxtFilePath, newTxtFilePath);

            // 데이터베이스에 새로운 텍스트 데이터 추가
            const newTxtDataQuery = `INSERT INTO Data (data_id, memo_id, path, format, content_type, file_name) 
                                     VALUES (?, ?, ?, ?, ?, ?)`;
            await query(newTxtDataQuery, [newTxtDataId, newMemoId, newTxtFilePath, 'txt', 'txt', 'data.txt']);
        }
    
       // 6. 보내는 사람의 이름과 받는 사람의 원래 이름 조회
       const sourceUserNameQuery = 'SELECT name FROM user WHERE id = ?';
       const sourceUser = await query(sourceUserNameQuery, [sourceUserId]);
       if (sourceUser.length === 0) {
           return res.status(404).json({ error: '보내는 사용자를 찾을 수 없습니다.' });
       }
       const sourceUserName = sourceUser[0].name;

       const targetUserNameQuery = 'SELECT name FROM user WHERE id = ?';
       const targetUser = await query(targetUserNameQuery, [targetUserId]);
       if (targetUser.length === 0) {
           return res.status(404).json({ error: '대상 사용자를 찾을 수 없습니다.' });
       }
       const targetUserName = targetUser[0].name;

       const friendNameQuery = `
            SELECT friend_name_set 
            FROM Friend 
            WHERE user_name = ? AND friend_user_name = ?`;
        const friendNameResult = await query(friendNameQuery, [targetUserName,sourceUserName]);

        const targetUserDisplayName = friendNameResult.length > 0 
            ? friendNameResult[0].friend_name_set 
            : sourceUserName;

       // 7. 알림을 전송하기 위해 targetUserId로 소켓 ID 찾기
       const targetSocketId = usersSocketId[targetUserId];  // users 객체에서 소켓 ID 찾기

        //    let targetSocketId;
        //     for (const [socketId, user] of Object.entries(users)) {
        //         if (user.userId === targetUserId) {
        //             targetSocketId = socketId;
        //             break;
        //         }
        //     }
        //    console.log('소켓아이디: ' + targetSocketId);

        console.log(sourceUserId+'가 '+targetUserId+'에게 메모'+memoId+'를 보냈다,');
       if (targetSocketId) {
           io.to(targetSocketId).emit('new-memo', `${targetUserDisplayName}님이 당신에게 메모를 전송했습니다.`,`${newMemoId}`);
       } else {
           console.log(`대상 사용자 ${targetUserId}의 소켓 ID를 찾을 수 없습니다.`);
       }
       res.status(200).json({ message: '메모가 성공적으로 전송되었습니다.' });
   } catch (err) {
       console.error('서버 오류:', err.message);
       if (!res.headersSent) {
           res.status(500).json({ error: '서버 오류', message: err.message });
       }
   }
});

// 친구 추가 API
app.post('/friend', (req, res) => {
    const { user_name, friend_user_name } = req.body;

    // 입력 검증
    if (!user_name || !friend_user_name) {
        return res.status(400).json({ error: 'user_name과 friend_user_name을 입력하세요.' });
    }
    
    // 자기 자신을 친구로 추가할 수 없음
    if (user_name === friend_user_name) {
        return res.status(400).json({ error: '자기 자신을 친구로 추가할 수 없습니다.' });
    }
    
    // user_name과 friend_user_name으로 각각의 id 조회
    db.query('SELECT id FROM User WHERE name = ?', [user_name], (err, userResults) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
        }
        if (userResults.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        const user_id = userResults[0].id;
        
        db.query('SELECT id FROM User WHERE name = ?', [friend_user_name], (err, friendResults) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
            }
            if (friendResults.length === 0) {
                return res.status(404).json({ error: '친구를 찾을 수 없습니다.' });
            }
            const friend_id = friendResults[0].id;
            
            // 친구 관계 존재 여부 확인
            db.query('SELECT * FROM Friend WHERE user_name = ? AND friend_user_name = ?', [user_name, friend_user_name], (err, results) => {
                if (err) {
                    return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
                }
                if (results.length > 0) {
                    return res.status(409).json({ error: '이미 친구 관계입니다.' });
                }
                
                // 친구 관계 추가
                db.query('INSERT INTO Friend (user_name, friend_user_name, friend_name_set, friend_user_id) VALUES (?, ?, ?, ?)', [user_name, friend_user_name, friend_user_name, friend_id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: '친구 추가 실패' });
                    }
                    res.status(201).json({ message: '친구 추가 성공' });
                    // 메모 전송 성공 후 알림 전송
                    const friendSocketId = userSocketMap[friend_user_name];
                    if (friendSocketId) {
                        io.to(friendSocketId).emit('add-friend', `${user_name}님이 당신을 친구로 추가했습니다.`);
                        console.log(`${user_name} 님이 ${friend_user_name} 님을 친구로 추가했습니다.`);
                    } else {
                        console.log(`친구 ${friend_user_name}의 소켓 ID를 찾을 수 없습니다.`);
                    }
                });
            });
        });
    });
});


// 친구 목록 조회 API => user의 친구 name과 friend_name_set을 쿼리로 가져옴
app.get('/friends/:user_name', (req, res) => {
    const user_name = req.params.user_name;
    const query = `
        SELECT u.id AS friend_id, 
               u.name AS friend_name, 
               f.friend_name_set AS friend_name_set
        FROM Friend f
        JOIN User u ON f.friend_user_name = u.name
        WHERE f.user_name = ?
    `;
    
    db.query(query, [user_name], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류', message: err.message });
        }
        res.status(200).json(results);
    });
});

// 친구 삭제 API (friend_name_set을 사용하여 삭제)
app.delete('/friend', (req, res) => {
    const { user_name, friend_name_set } = req.body;

    if (!user_name || !friend_name_set) {
        return res.status(400).json({ error: 'user_name 그리고 friend_name_set을 입력하세요.' });
    }

    // 친구 관계 존재 여부 확인 (friend_name_set으로 검색)
    db.query('SELECT * FROM Friend WHERE user_name = ? AND friend_name_set = ?', [user_name, friend_name_set], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '친구 관계가 존재하지 않거나 이름이 일치하지 않습니다.' });
        }

        // 친구 관계 삭제
        db.query('DELETE FROM Friend WHERE user_name = ? AND friend_name_set = ?', [user_name, friend_name_set], (err) => {
            if (err) {
                return res.status(500).json({ error: '데이터베이스 삭제 오류' });
            }
            res.status(200).json({ message: '친구 삭제 성공' });
            console.log(`${user_name} 님이(${friend_name_set})으로 설정된 친구를 삭제했습니다.`);
        });
    });
});


// 친구 이름 변경 API
app.put('/friend/name', (req, res) => {
    const { user_name, friend_user_name, new_friend_name } = req.body;

    // 입력 검증
    if (!user_name || !friend_user_name || !new_friend_name) {
        return res.status(400).json({ error: 'user_name, friend_user_name, 그리고 new_friend_name을 입력하세요.' });
    }

    // 친구 관계 존재 여부 확인
    db.query('SELECT * FROM Friend WHERE user_name = ? AND friend_name_set = ?', [user_name, friend_user_name], (err, results) => {
        if (err) {
            return res.status(500).json({ error: '데이터베이스 쿼리 오류' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: '친구 관계가 존재하지 않습니다.' });
        }

        // 친구 이름 변경
        db.query('UPDATE Friend SET friend_name_set = ? WHERE user_name = ? AND friend_name_set = ?', [new_friend_name, user_name, friend_user_name], (err) => {
            if (err) {
                return res.status(500).json({ error: '친구 이름 변경 실패' });
            }
            res.status(200).json({ message: '친구 이름 변경 성공' });
            console.log(`${user_name} 님이 ${friend_user_name} 님의 이름을 ${new_friend_name}으로 변경했습니다.`);
        });
    });
});

// 이벤트 등록
app.post('/events', (req, res) => {
    const { user_id, event_datetime, description } = req.body;
    if (!user_id || !event_datetime || !description) {
      return res.status(400).send('Missing required fields');
    }
    const event_id = uuidv4(); // 고유 이벤트 ID 생성
    const query = 'INSERT INTO event (event_id, user_id, event_datetime, description) VALUES (?, ?, ?, ?)';
    db.query(query, [event_id, user_id, event_datetime, description], (error) => {
      if (error) {
        console.error('Error inserting event:', error);
        return res.status(500).send('Failed to add event');
      }
      res.status(201).send('Event added');
    });
});
  
  // GET 요청 처리: 이벤트 조회
app.get('/events/:user_id', (req, res) => {
    const userId = req.params.user_id; // URL에서 user_id를 가져옵니다.
    const query = 'SELECT * FROM event WHERE user_id = ?'; // user_id에 해당하는 이벤트만 조회
    
    db.query(query, [userId], (error, results) => {
      if (error) {
        console.error('Error fetching events:', error);
        return res.status(500).send('Failed to fetch events');
      }
      res.json(results);
    });
});

  // 이벤트 삭제
app.delete('/events/:event_id', (req, res) => {
    const eventId = req.params.event_id; // URL에서 event_id를 가져옵니다.
    const query = 'DELETE FROM event WHERE event_id = ?'; // event_id에 해당하는 이벤트 삭제
    
    db.query(query, [eventId], (error, results) => {
        if (error) {
            console.error('Error deleting event:', error);
            return res.status(500).send('Failed to delete event');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('Event not found');
        }
        res.status(200).send('Event deleted');
    });
});

// 이벤트 수정
app.put('/events/:event_id', (req, res) => {
    const eventId = req.params.event_id; // URL에서 event_id를 가져옵니다.
    const { event_datetime, description } = req.body; // 요청 본문에서 새로운 값들을 가져옵니다.

    if (!event_datetime || !description) {
        return res.status(400).send('Missing required fields');
    }

    const query = 'UPDATE event SET event_datetime = ?, description = ? WHERE event_id = ?';

    db.query(query, [event_datetime, description, eventId], (error, results) => {
        if (error) {
            console.error('Error updating event:', error);
            return res.status(500).send('Failed to update event');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('Event not found');
        }
        res.status(200).send('Event updated');
    });
});

// 화상회의 초대
app.post('/invite', async (req, res) => {
    const { sourceUserName, targetUserId, inviteUrl } = req.body;
    const friendNameQuery = `
        SELECT friend_user_name 
        FROM Friend 
        WHERE user_name = ? AND friend_user_id = ?`;
    const friendNameResult = await query(friendNameQuery, [sourceUserName, targetUserId]);
    let targetUserDisplayName;

    if (friendNameResult && friendNameResult.length > 0) {
        targetUserDisplayName = friendNameResult[0].friend_user_name;
        // 나머지 코드
    } else {
        console.error("friendNameResult가 비어 있습니다.");
    }
    
    const targetSocketId = userSocketMap[targetUserDisplayName];
    console.log('초대할 사람의 소켓아이디: ' + targetSocketId);
    if (targetSocketId) {
        io.to(targetSocketId).emit('invite', inviteUrl); // `${inviteUrl}`을 `inviteUrl`로 수정
        console.log(sourceUserName+'님이 '+ targetUserDisplayName+'님 초대!');
        res.status(200).json({ message: '초대 성공' });
    } else {
        console.log(`대상 사용자 ${targetUserDisplayName} 님이 접속 중이 아닙니다!`);
    }
});

const ngrokPath = "C:\\ngrok\\ngrok.exe"; // ngrok의 정확한 경로
const ngrokCommand = `${ngrokPath} http 3000 --domain=vervet-sacred-needlessly.ngrok-free.app`;

server.listen(port, () => {
    console.log(`서버 오픈 포트번호:${port}`);
    // ngrok 명령어 실행
    exec(ngrokCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`ngrok 실행 중 오류가 발생했습니다: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`ngrok stderr: ${stderr}`);
            return;
        }
        console.log(`ngrok stdout: ${stdout}`);
    });
});