//캘린더 타이틀바의 닫기 버튼 클릭 시, 캘린더 윈도우 닫기
document.getElementById('close-btn').addEventListener('click', () => {
  window.electron.closeCalendarWindow();
});

//캘린더 렌더링
document.addEventListener('DOMContentLoaded', async function () { //페이지의 모든 요소가 준비된 상태에서 캘린더를 렌더링하기 위해 DOMContentLoaded 이벤트를 사용
  var calendarEl = document.getElementById('calendar'); //id가 calendar인 HTML 요소를 선택하여 calendarEl 변수에 저장

  // 서버에서 유저 id에 해당하는 이벤트를 불러오고 캘린더에 반영
  const events = await loadEvents(); // 이미 정의한 loadEvents 호출

  // FullCalendar를 이용해 캘린더를 렌더링
  var calendar = new FullCalendar.Calendar(calendarEl, { //FullCalendar 라이브러리를 사용하여 캘린더 인스턴스를 생성
    initialView: 'dayGridMonth', //캘린더의 기본 뷰를 월별 보기(dayGridMonth)로 설정

    // 서버에서 불러온 이벤트 데이터를 FullCalendar 형식으로 변환
    events: events.map(event => ({
      id: event.event_id, // 이벤트 ID
      title: event.description, // 이벤트 설명 
      start: event.event_datetime // 이벤트 시작 시간
    })),
    dateClick: function (info) { //사용자가 날짜를 클릭했을 때 발생하는 이벤트를 정의, info는 클릭한 날짜에 대한 정보가 포함된 객체
      // 날짜 클릭 시 모달창 띄우기
      Swal.fire({
        title: '일정을 기록해보세요',
        html:
          '<input id="event-description" class="swal2-input" placeholder="일정 설명">' +
          '<input id="event-time" type="time" class="swal2-input" value="00:00">',
        showCancelButton: true,
        confirmButtonText: '일정 추가',
        cancelButtonText: '취소',
        background: '#FAFAFA', // 배경색 변경
        //color: '#333', // 텍스트 색상 변경
        customClass: {
          popup: 'my-custom-modal' // 커스텀 클래스 추가
        },
        preConfirm: () => {
          const description = document.getElementById('event-description').value;
          const time = document.getElementById('event-time').value;
          if (!description) {
            Swal.showValidationMessage('아무것도 입력하지 않았습니다!');
            return null;
          }
          return { description, time };
        }
      }).then((result) => {
        if (result.isConfirmed) {
          // 선택된 날짜 + 사용자가 입력한 시간 합치기
          const fullDateTime = `${info.dateStr}T${result.value.time}`;
          console.log('날짜 정보: ' + fullDateTime);
          console.log('decription: ' + result.value.description);

          // 서버에서 이벤트 추가하는 함수 호출
          addEvent(fullDateTime, result.value.description);

          // FullCalendar에 새로운 이벤트 추가
          calendar.addEvent({
            title: result.value.description,
            start: fullDateTime
          });
        }
      });
    },
    eventContent: function (arg) {
      const eventTime = new Date(arg.event.start).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // 24시간 형식으로 설정
      });
      return {
        html: `<div id="event-content">
                  <span id="event-circle"></span>
                  <div style="display: inline-block; vertical-align: top;">
                    ${arg.event.title}
                    <br>
                    <span id="event-time-for-calendar">${eventTime}</span>
                  </div>
                </div>`
      };
    },
    // 이벤트 클릭 시 발생하는 이벤트
    eventClick: function (info) {
      const event = info.event;

      // 이벤트의 시작 시간을 로컬 시간대로 변환
      const localStart = new Date(event.start.toISOString());

      // 모달창을 통해 이벤트 수정 또는 삭제
      Swal.fire({
        title: '일정을 수정하거나 삭제하세요',
        html:
          `<input id="event-description" class="swal2-input" value="${event.title}" placeholder="일정 설명">` +
          `<input id="event-time" type="time" class="swal2-input" value="${localStart.toTimeString().substr(0, 5)}">`,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '수정하기',
        denyButtonText: '삭제하기',
        cancelButtonText: '취소',
        customClass: {
          popup: 'my-custom-modal'
        },
        preConfirm: () => {
          const description = document.getElementById('event-description').value;
          const time = document.getElementById('event-time').value;
          if (!description) {
            Swal.showValidationMessage('아무것도 입력하지 않았습니다!');
            return null;
          }
          return { description, time };
        }
      }).then(async (result) => {
        if (result.isConfirmed) {
          // 새로 입력된 정보로 이벤트 수정
          const newDate = new Date(event.start);
          const [hours, minutes] = result.value.time.split(':');
          newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

          const fullDateTime = newDate.toISOString();

          // 서버에서 이벤트를 수정하는 함수 호출
          await updateEvent(event.id, fullDateTime, result.value.description);

          // FullCalendar의 이벤트 수정
          event.setProp('title', result.value.description); // 설명 수정
          event.setStart(newDate); // 시작 시간 수정

          // 종료 시간 설정 (옵션)
          const newEnd = new Date(newDate);
          newEnd.setHours(newEnd.getHours() + 1); // 기본적으로 1시간 후 종료로 설정
          event.setEnd(newEnd);
        }
        else if (result.isDenied) {
          // 삭제 확인
          Swal.fire({
            title: '정말로 삭제하시겠습니까?',
            text: '이 작업은 되돌릴 수 없습니다!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '삭제하기',
            cancelButtonText: '취소',
            customClass: {
              popup: 'my-custom-modal'
            }
          }).then(async (confirmResult) => {
            if (confirmResult.isConfirmed) {

              // 서버에서 이벤트 삭제하는 메서드 호출
              await deleteEvent(event.id);
              console.log(event.id);

              // FullCalendar에서 이벤트 삭제
              event.remove();
              Swal.fire('삭제 완료', '이벤트가 삭제되었습니다.', 'success');
            }
          });
        }
      });
    }
  });

  calendar.render();
});

// 서버에서 유저 id에 해당하는 이벤트를 모두 가져와 리턴하는 메서드
async function loadEvents() {
  try {
    const userId = await window.electron.getUserId();
    console.log('캘린더 정보 가져올 유저 아이디:' + userId);
    const events = await window.electron.loadEventsInServer(userId);
    console.log('아이디를 통해 가져온 캘린더 정보:' + events);

    if (events.error) {
      throw new Error(events.error);
    }
    return events || []; // 이벤트가 없으면 빈 배열 반환
  }
  catch (error) {
    console.error('이벤트를 가져오는 중 오류 발생:', error.message);
    return [];
  }
}

// 서버에 이벤트를 추가하는 메서드
async function addEvent(date, description) {
  try {
    const userId = await window.electron.getUserId();

    // 날짜 문자열을 Date 객체로 변환
    const eventDate = new Date(date);

    // ISO 8601 형식의 문자열로 변환 (시간대 정보 포함)
    const isoDate = eventDate.toISOString();

    const result = await window.electron.addEventInServer(userId, isoDate, description);

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.success) {
      console.log('Event added successfully');
    }
  } catch (error) {
    console.error('Failed to add event:', error.message);
  }
}

//서버에서 이벤트를 삭제하는 메서드
async function deleteEvent(scheduleId) {
  console.log('서버에서 삭제할 이벤트 id: ' + scheduleId);
  try {
    ///위 render코드에서 사용자가 캘린더에 적혀진 일정을 클릭했을 때, 해당 일정의 아이디를 가져오는 로직 필요
    const result = await window.electron.deleteEventInServer(scheduleId); //서버에 해당 일정의 스케줄 삭제 요청

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.success) {
      console.log('Event deleted successfully');
    }
  } catch (error) {
    console.error('Failed to delete event:', error.message);
  }
}

// 서버에서 이벤트를 수정하는 메서드
async function updateEvent(eventId, date, description) {
  try {
    // 날짜 문자열을 Date 객체로 변환
    const eventDate = new Date(date);

    // ISO 8601 형식의 문자열로 변환 (시간대 정보 포함)
    const isoDate = eventDate.toISOString();

    const result = await window.electron.updateEventInServer(eventId, isoDate, description);

    if (result.error) {
      throw new Error(result.error);
    }

    if (result.success) {
      console.log('Event updated successfully');
    }
  } catch (error) {
    console.error('Failed to update event:', error.message);
  }
}