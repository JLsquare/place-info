let cursor = document.getElementById("cursor");
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.msImageSmoothingEnabled = false;

const maxZoom = 128;
const minZoom = 0.75;
let currentZoom = 1;

let isDragging = false;
let recentlyDragged = false;
let lastPosition = { x: 0, y: 0 };
let offset = { x: 0, y: 0 };
let pixel = { x: 0, y: 0 };

let colors;
let selectedColor = -1;

let socket;
let localCooldown = 0;

function initSocket() {
    socket = new WebSocket(`ws://${window.location.host}/api/ws`);

    socket.onmessage = function(event) {
        let data = JSON.parse(event.data);
        ctx.fillStyle = colors[data.color];
        ctx.fillRect(data.x, data.y, 1, 1);
    }

    socket.onerror = function(error) {
        console.log(`[error] ${error.message}`);
    }
}

function sendPixel() {
    if(selectedColor === -1) return;

    let token = localStorage.getItem("token");

    fetch('/api/draw', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({
            x: pixel.x,
            y: pixel.y,
            user: 0,
            color: selectedColor
        })
    }).then(async response => {
        if(response.ok){
            localCooldown = await response.json()
            deselectColor();
            updateCooldownDisplay();
        } else {
            console.log(await response.text());
        }
    });
}

async function getGrid() {
    try {
        const sizeResponse = await fetch('/api/size');
        const sizeData = await sizeResponse.json();
        canvas.width = sizeData[0];
        canvas.height = sizeData[1];

        const pngResponse = await fetch('/api/png', {
            method: 'GET',
            headers: {
                'Accept': 'image/png'
            }
        });
        const blob = await pngResponse.blob();
        const imageUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.src = imageUrl;
        img.onload = function () {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(img.src);
        };

    } catch (error) {
        console.error('Error loading grid:', error);
    }

    try {
        const updatesResponse = await fetch('/api/updates');
        const updates = await updatesResponse.json();
        const ctx = canvas.getContext('2d');
        updates.forEach(update => {
            ctx.fillStyle = colors[update.color];
            ctx.fillRect(update.x, update.y, 1, 1);
        });

    } catch (error) {
        console.error('Error loading updates:', error);
    }
}

function cursorPosition(event){
    const canvasBounds = canvas.getBoundingClientRect();

    let x = Math.floor((event.clientX - canvasBounds.left) / currentZoom);
    let y = Math.floor((event.clientY - canvasBounds.top) / currentZoom);
    pixel = { x, y };

    cursor.style.left = `${canvasBounds.left + x * currentZoom - currentZoom * 0.1}px`;
    cursor.style.top = `${canvasBounds.top + y * currentZoom - currentZoom * 0.1}px`;
    cursor.style.width = `${currentZoom * 1.2}px`;
    cursor.style.height = `${currentZoom * 1.2}px`;
}

canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    let prevZoom = currentZoom;
    currentZoom = event.wheelDelta > 0 ? currentZoom * 1.1 : currentZoom / 1.1;
    currentZoom = Math.min(Math.max(currentZoom, minZoom), maxZoom);

    offset.x -= (canvas.width / 2 - offset.x) * (currentZoom - prevZoom) / prevZoom;
    offset.y -= (canvas.height / 2 - offset.y) * (currentZoom - prevZoom) / prevZoom;

    canvas.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${currentZoom})`;

    cursorPosition(event);
});

canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    lastPosition.x = event.clientX;
    lastPosition.y = event.clientY;
});

canvas.addEventListener('mouseup', () => {
    if (isDragging) {
        setTimeout(() => {
            recentlyDragged = false;
        }, 100);
    }
    isDragging = false;
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
        recentlyDragged = true;

        const dx = event.clientX - lastPosition.x;
        const dy = event.clientY - lastPosition.y;

        offset.x += dx;
        offset.y += dy;

        canvas.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${currentZoom})`;

        lastPosition.x = event.clientX;
        lastPosition.y = event.clientY;
    }

    cursorPosition(event);
});

canvas.addEventListener('click', () => {
    if (!recentlyDragged) {
        updatePixelInfo();
        sendPixel();
    }
});

initPalette();
getCooldown();
getGrid();
initSocket();