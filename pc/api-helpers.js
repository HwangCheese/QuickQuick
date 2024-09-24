const { ipcMain } = require('electron');
require('dotenv').config(); // .env 파일의 변수 로드
const { google } = require('googleapis');
const calendar = google.calendar('v3');
const apiKey = process.env.GOOGLE_API_KEY;
const config = require('./config.js');

const axios = require('axios');
const cheerio = require('cheerio');
const language = google.language('v1'); // Google Natural Language API 클라이언트 생성

const OpenAI = require('openai');
const url = 'https://api.openai.com/v1/chat/completions';
const openai = new OpenAI({
  apiKey: config.API_KEY
});

async function getFetch() {
  const fetchModule = await import('node-fetch');
  return fetchModule.default; // fetch를 기본 모듈로 가져옵니다.
}

// 날짜와 내용을 추출하는 함수
function parseDateAndContent(text) {
  const regex = /(\d{1,2})월 (\d{1,2})일 (.+)/;
  const match = text.match(regex);
  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const content = match[3];
    return { month, day, content };
  }
  return null;
}

// OAuth2 클라이언트 생성 및 인증
async function authorize() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oAuth2Client;
}

// Google Calendar에 이벤트 추가
async function addEventToCalendar(month, day, content) {
  const auth = await authorize();

  const event = {
    summary: content,
    start: {
      dateTime: `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00:00`,
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: `2024-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T10:00:00`,
      timeZone: 'Asia/Seoul',
    },
  };

  calendar.events.insert({
    auth,
    calendarId: 'primary',
    resource: event,
  }, (err, res) => {
    if (err) {
      console.error('Error adding event:', err);
    } else {
      console.log('Event added:', res.data.htmlLink);
    }
  });
}

// 텍스트 분석 API 호출
async function analyzeText(text) {
  try {
    const fetch = await getFetch(); // fetch 가져오기
    const response = await fetch(
      `https://language.googleapis.com/v1/documents:analyzeEntities?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: {
            type: 'PLAIN_TEXT',
            content: text,
          },
          encodingType: 'UTF8',
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Error analyzing text: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error analyzing text:', error.message);
    throw error;
  }
}

// 번역 API 호출
async function translateText(text, targetLanguage) {
  try {
    const fetch = await getFetch(); // fetch 가져오기
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          format: 'text',
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Error translating text: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error translating text:', error.message);
    throw error;
  }
}

// 요약 API 호출
async function summarizeText(text) {
  console.log("요약 API 호출됨");

  try {
    const response = await axios.post(url, {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '당신은 텍스트를 분석해 핵심만 요약하는 도움이 되는 어시스턴트입니다.' },
        { role: 'user', content: '다음 텍스트를 요약해 주세요 : ' + text }
      ],
      max_tokens: 2000, // 요약 길이 조정
      temperature: 0.7, // 생성 다양성 조정
    }, {
      headers: {
        'Authorization': `Bearer ${openai.apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    const result = response.data.choices[0].message.content.trim();
    console.log('텍스트 요약 결과:', result);

    return result;
  } catch (error) {
    console.error('Error occurred:', error);
    return '요약을 가져오는 중 오류 발생.';
  }
}

// 문법 기반 제목 생성
async function generateTitle(text) {
  console.log("제목 생성 API 호출됨");
  if (text.length < 15) return text; //text가 15자 이내면 제목 생성하지 않음
  try {
    const response = await axios.post(url, {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '당신은 텍스트를 분석해 15자 이내의 제목을 생성해주는 어시스턴트입니다.' },
        { role: 'user', content: '다음 텍스트를 보고 15자 이내의 제목을 생성해 주세요 : ' + text }
      ],
      max_tokens: 100, // 요약 길이 조정
      temperature: 0.7, // 생성 다양성 조정
    }, {
      headers: {
        'Authorization': `Bearer ${openai.apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    const result = response.data.choices[0].message.content.trim();
    console.log('제목 생성 결과:', result);

    return result;
  } catch (error) {
    console.error('Error occurred:', error);
    return '요약을 가져오는 중 오류 발생.';
  }
}


// 예시로 keyPhrases 추출 로직을 간단히 처리합니다.
async function extractKeyPhrases(text) {
  // 예시: 간단한 키워드 추출 (실제 로직은 더욱 복잡할 수 있습니다)
  const words = text.split(/\s+/);
  const keyPhrases = words.filter(word => word.length > 1); // 1글자 이상의 단어만 추출

  return keyPhrases;
}

// 언어 감지 API 호출
async function detectLanguage(text) {
  try {
    const fetch = await getFetch(); // fetch 가져오기
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`Error detecting language: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error detecting language:', error.message);
    throw error;
  }
}

// 사용 예시로 입력 처리 및 캘린더 이벤트 추가
async function processAndAddEvent(userInput) {
  const parsed = parseDateAndContent(userInput);
  if (parsed) {
    await addEventToCalendar(parsed.month, parsed.day, parsed.content);
  } else {
    console.error('Invalid input format');
  }
}

//url요약 관련 메서드
//url을 전달받아 url내의 텍스트를 얻어 리턴하는 메서드
async function fetchTextFromUrl(url) {
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const text = $('body').text();
    return text;
  } catch (error) {
    console.error('Error fetching text from URL:', error.message);
    throw error;
  }
}

//위의 두 메서드를 이용, 전달받은 url을 통해 텍스트 요약하여 리턴하는 메서드
async function summarizeUrl(url) {
  try {
    const text = await fetchTextFromUrl(url); //클립보드 내의 url에서 텍스트 추출
    const summary = await summarizeText(text); //추출된 텍스트 요약
    console.log('리턴값: '+summary);
    return summary;
  } catch (error) {
    console.error('Error summarizing URL:', error.message);
    throw error;
  }
}

// 카카오 맵 API를 통해 장소를 검색하는 함수
async function checkLocation(location) {
  const kakaoApiKey = '0aaf7d79ef71a4146de37014a099e57b'; // 발급받은 카카오 API 키
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(location)}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `KakaoAK ${kakaoApiKey}`,
        //'Kakao-API-Key': kakaoApiKey, // 이 줄을 추가하세요.
        os: 'pc', // 예: pc 또는 mobile
        origin: 'http://localhost' // 이 부분을 localhost로 설정
      }
    });

    const places = response.data.documents;

    if (places.length > 0) { // 장소가 있으면
      console.log(`Found ${places.length} place(s) for location: ${location}`);
      return true;
      // 장소 정보 표시 (예: 첫 번째 장소)
      //console.log('Place details:', places[0]);
    } else {
      console.log(`No places found for location: ${location}`);
      return false;
    }
  } catch (error) {
    console.error('Error fetching location from Kakao Map API:', error);
  }
}

// IPC 핸들러 등록
ipcMain.handle('analyze-text', async (event, text) => {
  return await analyzeText(text);
});

ipcMain.handle('translate-text', async (event, text, targetLanguage) => {
  return await translateText(text, targetLanguage);
});

ipcMain.handle('summarize-text', async (event, text) => {
  return await summarizeText(text);
});

ipcMain.handle('generate-title', async (event, text) => {
  return await generateTitle(text);
});

ipcMain.handle('detect-language', async (event, text) => {
  return await detectLanguage(text);
});

ipcMain.handle('summarize-url', async (event, url) => {
  return await summarizeUrl(url);
});

ipcMain.handle('check-location', async (event, location) => {
  return await checkLocation(location);
});

module.exports = {
  analyzeText,
  translateText,
  summarizeText,
  generateTitle,
  detectLanguage,
  processAndAddEvent,
  summarizeUrl, // url요약 기능 내보내기
};
