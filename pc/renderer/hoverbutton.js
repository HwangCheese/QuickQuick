const sendBtnHover = document.getElementById('send-button');
const recorderBtnHover = document.getElementById('recorder-button');
const callBtnHover = document.getElementById('call-button');
const deleteBtnHover = document.getElementById('delete-button');

sendBtnHover.addEventListener('mouseover', () => {
    sendBtnHover.src = '../media/send-btn-hover.png';
});
sendBtnHover.addEventListener('mouseout', () => {
    sendBtnHover.src = '../media/send-btn.png';
});

recorderBtnHover.addEventListener('mouseover', () => {
    recorderBtnHover.src = '../media/mic-btn-hover.png';
});
recorderBtnHover.addEventListener('mouseout', () => {
    recorderBtnHover.src = '../media/mic-btn.png';
});

callBtnHover.addEventListener('mouseover', () => {
    callBtnHover.src = '../media/cam-btn-hover.png';
});
callBtnHover.addEventListener('mouseout', () => {
    callBtnHover.src = '../media/cam-btn.png';
});

deleteBtnHover.addEventListener('mouseover', () => {
    deleteBtnHover.src = '../media/delete-btn-hover.png';
});
deleteBtnHover.addEventListener('mouseout', () => {
    deleteBtnHover.src = '../media/delete-btn.png';
});