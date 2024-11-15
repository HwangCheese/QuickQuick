let map, infowindow;
let markers = [];
let locations = [];
let mapButton;
const mapFrame = document.getElementById('map-frame');

// 맵 보기 버튼 토글 함수
function toggleButton(buttonId, iconClass, isVisible, clickHandler) {
    const buttonsContainer = document.getElementById('buttons');
    mapButton = document.getElementById(buttonId);

    if (isVisible) {
        if (!mapButton) { // 버튼이 존재하지 않으면 생성 후 추가
            mapButton = document.createElement('button');
            mapButton.classList.add('content-menu');
            mapButton.id = buttonId;
            mapButton.innerHTML = `<i class="${iconClass}"></i>`;
            buttonsContainer.appendChild(mapButton);

            // 클릭 이벤트 리스너 추가
            mapButton.addEventListener('click', () => {
                eval(clickHandler);  // 문자열로 전달된 함수 호출
            });
        }
        mapButton.classList.add('bounce');  // 바운스 애니메이션 추가
        mapButton.classList.remove('hide'); // 숨기기 애니메이션 제거
    } else if (mapButton) { // 버튼이 존재하면 숨기기 애니메이션 후 제거
        mapButton.classList.add('hide'); // 숨기기 애니메이션 추가
        setTimeout(() => {
            mapButton.remove();
        }, 500); // 애니메이션 후 버튼 제거
    }    
}

// 맵 토글 함수 (맵 표시/숨기기)
function toggleMap() {
    if (mapFrame.style.display === 'none' || mapFrame.style.display === '') {
        mapFrame.style.display = 'block';
    } else {
        mapFrame.style.display = 'none';
    }

}

function filterLocationsAndMarkers(editor) {
    const editorContent = editor.value;  // editor의 텍스트 내용 가져오기

    // locations 배열을 필터링하여 editorContent에 포함된 장소만 남깁니다.
    const filteredLocations = locations.filter(location => {
        const isIncluded = editorContent.includes(location);
        // console.log(`Checking location "${location}" in editorContent: ${isIncluded}`);
        return isIncluded;
    });

    // markers 배열을 필터링하여 locations 배열에 포함된 장소에 해당하는 마커만 남기고,
    // 포함되지 않은 마커는 지도에서 제거합니다.
    const filteredMarkers = markers.filter(marker => {
        const isIncluded = editorContent.includes(marker.title);
        // console.log(`Checking marker "${marker.title}" in editorContent: ${isIncluded}`);
        if (!isIncluded) {
            marker.setMap(null); // locations에 포함되지 않은 마커는 지도에서 제거
        }
        return isIncluded;
    });

    // 업데이트된 값을 locations와 markers에 반영
    locations = filteredLocations;
    markers = filteredMarkers;

    // console.log("Filtered locations:", locations);  // 필터링된 locations 출력
    // console.log("Filtered markers:", markers);      // 필터링된 markers 출력
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map-frame'), {
        center: { lat: 37.5665, lng: 126.9780 }, // 기본 위치 서울
        zoom: 13,
        mapTypeControl: false,      // 지도 타입 선택 메뉴 숨기기
        streetViewControl: false,   // 거리뷰 아이콘 숨기기
    });

    infowindow = new google.maps.InfoWindow();
}

// 입력한 장소를 구글 맵에 마커로 추가
function addMarkerForLocation(location) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'address': location }, function (results, status) {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            map.setCenter(location);

            // 장소 ID를 가져와서 Place Details API 호출
            const placeId = results[0].place_id;
            getPlaceDetails(placeId, location);
        } else {
            alert('주소를 찾을 수 없습니다: ' + status);
        }
    });
}

// 구글 Places API를 사용하여 장소 상세 정보 가져오기
function getPlaceDetails(placeId, location) {
    const service = new google.maps.places.PlacesService(map);

    service.getDetails({ placeId: placeId }, function (place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // 장소 상세 정보가 성공적으로 반환된 경우
            addMarkerFromLocation(location, place);
        } else {
            alert('장소 정보를 불러올 수 없습니다: ' + status);
        }
    });
}

let customPopup = null; // 현재 열린 팝업을 추적할 변수

// 마커를 추가하고 호버 이벤트를 등록하는 함수
function addMarkerFromLocation(location, place) {
    const marker = new google.maps.Marker({
        map: map,
        position: location,
        title: place.name || '이름 없음',
    });

    // // 커스텀 팝업을 위한 DIV 생성 함수
    // function createPopupContent() {
    //     const popupDiv = document.createElement('div');
    //     popupDiv.style.position = 'absolute';
    //     popupDiv.style.backgroundColor = 'white';
    //     popupDiv.style.padding = '10px';
    //     popupDiv.style.borderRadius = '5px';
    //     popupDiv.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    //     popupDiv.style.fontFamily = 'Arial, sans-serif';
    //     popupDiv.style.fontSize = '14px';
    //     popupDiv.style.display = 'none'; // 처음에는 숨기기

    //     popupDiv.innerHTML = `
    //         <strong>${place.name || '이름 없음'}</strong> 
    //     `;

    //     return popupDiv;
    // }

    // // 마커에 마우스 오버 시 커스텀 팝업 열기
    // marker.addListener('mouseover', function () {
    //     if (customPopup) {
    //         customPopup.style.display = 'none'; // 기존 팝업이 있으면 숨기기
    //     }

    //     // 커스텀 팝업 생성
    //     customPopup = createPopupContent();
        
    //    // 마커 위치로부터 팝업 위치 계산
    //    const projection = map.getProjection();
    //    const point = projection.fromLatLngToPoint(location);

    //    // 팝업 위치 조정 (마커 바로 위에)
    //    const popupWidth = customPopup.offsetWidth;
    //    const popupHeight = customPopup.offsetHeight;

    //    customPopup.style.left = `${point.x - popupWidth / 2}px`; // 팝업 가로 중앙 정렬
    //    customPopup.style.top = `${point.y - popupHeight - 10}px`; // 마커 위치 바로 위

    //     // 지도에 팝업 추가
    //     map.getDiv().appendChild(customPopup);
    //     customPopup.style.display = 'block'; // 팝업 표시
    // });

    // // 마커에서 마우스가 나가면 커스텀 팝업 닫기
    // marker.addListener('mouseout', function () {
    //     if (customPopup) {
    //         customPopup.style.display = 'none'; // 팝업 숨기기
    //     }
    // });

    // 마커 클릭 시 구글 맵 하이퍼링크로 이동
    marker.addListener('click', function () {
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
        window.open(googleMapsUrl, '_blank'); // 새 탭에서 열기
    });

    markers.push(marker); // 마커 배열에 저장
}

// 텍스트 입력 후 '장소' 추출 시 맵에 추가
document.getElementById('editor').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        const textArea = document.getElementById('editor');
        const text = textArea.value.trim().split('\n').pop();

        let location = null;

        // '장소:한성대학교' 또는 '장소-한성대학교' 형태 추출
        const locationPatternPrefix = /(?:장소[:\-]?\s*)([가-힣]+)/;
        const locationMatchPrefix = text.match(locationPatternPrefix);

        // '~에서'가 붙은 경우 추출 (예: '한성대학교에서')
        const locationPatternSuffix = /([가-힣]+)에서/;
        const locationMatchSuffix = text.match(locationPatternSuffix);

        if (locationMatchPrefix) {
            location = locationMatchPrefix[1].trim();
        } else if (locationMatchSuffix) {
            location = locationMatchSuffix[1].trim();
        }

        if (location) {
            console.log('Detected Location:', location);

            // 중복 확인: 이미 있는 경우 추가하지 않음
            if (locations.includes(location)) {
                console.log('Location already exists:', location);
                return;
            }

            // 구글 맵에 장소를 추가
            addMarkerForLocation(location);
            locations.push(location);

            // 지도 버튼 표시
            toggleButton(
                'map-button',
                'fas fa-location-dot',
                true, // 버튼을 보여줄지 결정
                'toggleMap()'  // clickHandler는 함수 이름 문자열로 전달
            );
        }

        // 필터링 및 버튼 처리
        filterLocationsAndMarkers(editor);
        if (locations.length === 0) {
            // 지도 열려 있으면 닫고, 버튼 숨기기
            if (mapFrame.style.display === 'block' || mapFrame.style.display === '') {
                toggleMap();  // 맵 숨기기
            } mapButton.classList.add('hide'); // 숨기기 애니메이션 추가
            setTimeout(() => {
                mapButton.remove();
            }, 500); // 애니메이션 후 버튼 제거
        }

        // textArea에 포커스 유지
        textArea.focus();
    }
});

function loadMapScript() {
    const script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyBNgGFJtwilxa44_RZVFKyM9L09Jcgy7xQ&callback=initMap&libraries=places";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
}

// 페이지 로드 시 구글 맵 스크립트 로드
window.onload = loadMapScript;