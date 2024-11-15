const leftPupil = document.getElementById('left-pupil');
const rightPupil = document.getElementById('right-pupil');
const leftEye = document.querySelector('.eye:nth-child(1)');
const rightEye = document.querySelector('.eye:nth-child(2)');

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function setPupilToCenter() {
    leftPupil.style.transform = `translate(0px, 0px)`;
    rightPupil.style.transform = `translate(0px, 0px)`;
}

function calculatePupilPosition(mouseX, mouseY, eye) {
    const eyeRect = eye.getBoundingClientRect();
    const eyeCenterX = eyeRect.left + eyeRect.width / 2;
    const eyeCenterY = eyeRect.top + eyeRect.height / 2;

    const dx = mouseX - eyeCenterX;
    const dy = mouseY - eyeCenterY;

    const angle = Math.atan2(dy, dx);
    const maxRadius = Math.min(eyeRect.width, eyeRect.height) / 4;

    let targetX = maxRadius * Math.cos(angle);
    let targetY = maxRadius * Math.sin(angle);

    const distance = Math.sqrt(targetX ** 2 + targetY ** 2);
    if (distance > maxRadius) {
        const scale = maxRadius / distance;
        targetX *= scale;
        targetY *= scale;
    }

    return { targetX, targetY };
}

function movePupil(pupil, targetX, targetY) {
    const currentTransform = pupil.style.transform;
    const match = currentTransform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
    let currentX = 0, currentY = 0;

    if (match) {
        currentX = parseFloat(match[1]);
        currentY = parseFloat(match[2]);
    }

    const smoothX = lerp(currentX, targetX, 0.2);
    const smoothY = lerp(currentY, targetY, 0.2);

    pupil.style.transform = `translate(${smoothX}px, ${smoothY}px)`;
}

let isHovering = false;

[leftEye, rightEye].forEach((eye) => {
    eye.addEventListener('mouseenter', () => {
        isHovering = true;
        setPupilToCenter();
    });
    eye.addEventListener('mouseleave', () => {
        isHovering = false;
    });
});

window.electron.sendMousePositionToMoveEyes((event, mousePosition) => {
    if (isHovering) return;

    const { x: mouseX, y: mouseY } = mousePosition;

    const { targetX: leftTargetX, targetY: leftTargetY } = calculatePupilPosition(mouseX, mouseY, leftEye);
    const { targetX: rightTargetX, targetY: rightTargetY } = calculatePupilPosition(mouseX, mouseY, rightEye);

    const unifiedY = leftTargetY;

    movePupil(leftPupil, leftTargetX, unifiedY);
    movePupil(rightPupil, rightTargetX, unifiedY);
});
