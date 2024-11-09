const { openaiConfig, pineconeConfig } = require('./config');
const fetch = require('node-fetch');  // node-fetch 임포트

// 백오프 전략을 적용한 재시도 요청 함수 (지수 백오프)
async function retryRequestWithBackoff(url, data, retries = 5, delay = 1000, headers = {}) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const responseData = await response.json();
                return responseData;
            } else if (response.status === 429) {
                const backoffTime = delay * Math.pow(2, i);
                console.log(`429 오류 발생, ${backoffTime}ms 후 재시도`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            } else {
                throw new Error(`HTTP 오류: ${response.status}`);
            }
        } catch (err) {
            console.error(`요청 실패, 재시도 ${i + 1}/${retries}: ${err.message}`);
            if (!err.response) {
                if (i === retries - 1) throw new Error('최대 재시도 횟수 초과');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw new Error('최대 재시도 횟수 초과');
}

// 예시: OpenAI API를 사용하여 임베딩을 가져오는 함수
async function getEmbeddingWithBackoff(text) {
    const data = { model: 'text-embedding-ada-002', input: text };
    const url = openaiConfig.apiUrl;
    const headers = {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
    };
    
    try {
        const response = await retryRequestWithBackoff(url, data, 5, 1000, headers);
        if (response && response.data && response.data[0] && response.data[0].embedding) {
            return response.data[0].embedding;
        } else {
            throw new Error("임베딩 데이터를 찾을 수 없습니다.");
        }
    } catch (error) {
        console.error(`OpenAI 임베딩 API 호출 중 오류 발생: ${error.message}`);
        throw error;
    }
}

// Pinecone에 데이터 삽입하는 함수 (userId 네임스페이스 사용)
async function insertDataToPineconeWithBackoff(userId, embedding, metadata) {
    const url = `${pineconeConfig.apiUrl}?namespace=${userId}`;  // userId를 네임스페이스로 추가
    const data = { vectors: [{ id: metadata.id, values: embedding, metadata: metadata }] };
    const headers = {
        'Api-Key': pineconeConfig.apiKey,
        'Content-Type': 'application/json',
    };
    await retryRequestWithBackoff(url, data, 5, 1000, headers);
}

// 메모 저장 함수
async function saveMemoToPinecone(userId, memoText, memoId) {
    const embedding = await getEmbeddingWithBackoff(memoText);
    const metadata = { id: memoId, text: memoText };
    await insertDataToPineconeWithBackoff(userId, embedding, metadata);
}

// 검색 텍스트로 임베딩 생성 및 Pinecone에서 유사 메모 검색 (userId 네임스페이스 사용)
async function searchInPinecone(userId, queryText) {
    try {
        const embedding = await getEmbeddingWithBackoff(queryText);
        const url = `${pineconeConfig.apiUrlSearch}?namespace=${userId}`;  // userId 네임스페이스 추가
        const data = {
            topK: 3,
            vector: embedding,
            includeMetadata: true,
        };
        const headers = {
            'Api-Key': pineconeConfig.apiKey,
            'Content-Type': 'application/json',
        };

        const response = await retryRequestWithBackoff(url, data, 5, 1000, headers);
        // score가 0.8 이상인 match 필터링
        const filteredMatches = response.matches.filter(match => match.score >= 0.8);
        // 필터링된 결과에서 id만 추출
        const ids = filteredMatches.map(match => match.id);
        return ids;  // id 배열만 반환
    } catch (error) {
        console.error(`Pinecone 검색 오류: ${error.message}`);
        throw error;
    }
}

// Pinecone 벡터 삭제 함수
async function deleteMemoFromPinecone(memoId, userId) {
    const url = `${pineconeConfig.apiUrlDelete}?namespace=${userId}`;
    console.log(url);
    const data = { ids: [memoId] };
    const headers = {
        'Api-Key': pineconeConfig.apiKey,
    };
    try {
        const response = await retryRequestWithBackoff(url, data, 5, 1000, headers, 'DELETE');
        console.log(`Pinecone에서 memo_id ${memoId} 삭제 완료.`);
        return response;
    } catch (error) {
        console.error(`Pinecone 삭제 중 오류 발생: ${error.message}`);
        throw error;
    }
}

module.exports = { saveMemoToPinecone, searchInPinecone, deleteMemoFromPinecone };