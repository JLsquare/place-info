let pixelInfo = document.getElementById("pixelInfo");

let oldPixel = { x: 0, y: 0 };

async function updatePixelInfo() {
    if (pixel.x !== oldPixel.x || pixel.y !== oldPixel.y) {
        let response = await fetch(`/api/username/${pixel.x}/${pixel.y}`)
        if (response.ok) {
            let username = await response.text();
            pixelInfo.innerHTML = `(${pixel.x}, ${pixel.y}) ${username}`;
        }
    }
}