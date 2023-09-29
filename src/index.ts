const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;

let userFunc = (
	t: number,
	x: number,
	y: number,
	mx: number,
	my: number
) => 0;

let TIME_START = 0;
const codeInput = document.querySelector<HTMLInputElement>("#code")!;
const MathDestructure = `const {${Object.getOwnPropertyNames(Math).join(",")}} = Math`;
const setFunc = () => {
	try {
		// @ts-ignore
		userFunc = new Function("t", "x", "y", "mx", "my", `${MathDestructure};try{return ${codeInput.value};}catch (e){return 0;}`);
	} catch (e) {
		userFunc = () => 0;
	}

	TIME_START = performance.now();
};

codeInput.addEventListener("input", setFunc, { passive: true });
setFunc();

const circleToPixelColor = (v: number): `rgb(${number} ${number} ${number})` => {
	const r = Math.max(0, Math.min((201.24 * v * v), 255));
	if (v > 0) return `rgb(${r} ${r} ${r})`;
	const g = Math.max(0, Math.min((26.82 * v * v), 255));
	const b = Math.max(0, Math.min((53.66 * v * v), 255));
	return `rgb(${r} ${g} ${b})`;
};

const START_X = -15.5;
const START_Y = -8.5;
const START_SCALE = canvas.height / 18;

const camera = { x: START_X, y: START_Y, scale: START_SCALE };

let mouseDown = false;
let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousedown", () => { mouseDown = true; }, { passive: true });
window.addEventListener("mouseup", () => { mouseDown = false; }, { passive: true });
window.addEventListener("mousemove", ({ movementX, movementY, clientX, clientY }) => {
	const { width, height, top, left } = canvas.getBoundingClientRect();
	const widthRatio = width / canvas.width;
	const heightRatio = height / canvas.height;
	mouseX = Math.max(0, Math.min((clientX - left) / widthRatio, canvas.width));
	mouseY = Math.max(0, Math.min((clientY - top) / heightRatio, canvas.height));

	if (mouseDown) {
		camera.x -= movementX / camera.scale / widthRatio;
		camera.y -= movementY / camera.scale / heightRatio;
	}
}, { passive: true });

canvas.addEventListener("wheel", ({ deltaY }) => {
	const oldScale = camera.scale;
	const zoomFactor = 0.1; // Adjust this value as needed for the zoom speed
	const newScale = Math.min(1000, Math.max(10, camera.scale * (1 + (deltaY > 0 ? -zoomFactor : zoomFactor))));


	// Calculate the center point in canvas coordinates
	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2;

	// Convert the center point to function space coordinates
	const centerFnSpaceX = (centerX / oldScale) + camera.x;
	const centerFnSpaceY = (centerY / oldScale) + camera.y;

	// Update the camera scale
	camera.scale = newScale;

	// Adjust camera position to keep the center fixed
	camera.x = centerFnSpaceX - (centerX / newScale);
	camera.y = centerFnSpaceY - (centerY / newScale);
}, { passive: true });

ctx.font = '24px JetBrains Mono';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

const FRAME_TIMES = Array.from({ length: 30 }, () => 16.666);
let lastFrameTime = performance.now();

const getFramesPerSecond = (): number => 1000 / (FRAME_TIMES.reduce((a, b) => a + b) / FRAME_TIMES.length);

/** Marks the end of a frame (for averaging) */
const logFrame = (NOW: number) => {
	FRAME_TIMES.shift();
	FRAME_TIMES.push(NOW - lastFrameTime);
	lastFrameTime = NOW;
};

/** Draws an FPS counter to the canvas */
const drawCounter = () => {
	const fps = getFramesPerSecond();

	ctx.strokeStyle = "#000";
	ctx.fillStyle = "#fff";
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = '900 24px JetBrains Mono, monospace';
	ctx.lineWidth = 3;

	const MSG = `${fps.toFixed(0)} FPS`;
	ctx.strokeText(MSG, 10, 10);
	ctx.fillText(MSG, 10, 10);
};

const settings = {
	useCircles: true,
	clampValues: true,
	cartesian: true,
	showFPS: false,
	debug: false
};

const checkboxes: Record<keyof typeof settings, HTMLInputElement> = {
	useCircles: document.querySelector("#circles")!,
	clampValues: document.querySelector("#clamp")!,
	cartesian: document.querySelector("#cartesian")!,
	showFPS: document.querySelector("#fps")!,
	debug: document.querySelector("#debug")!
};

for (const [key, element] of Object.entries(checkboxes) as Array<[keyof typeof settings, HTMLInputElement]>) {
	element.checked = settings[key];
	element.addEventListener("click", () => {
		settings[key] = element.checked;
	}, { passive: true });
}

document.querySelector("#resetCamera")!.addEventListener("click", () => {
	camera.x = START_X;
	camera.y = START_Y;
	camera.scale = START_SCALE;
}, { passive: true });

document.querySelector("#fullscreen")!.addEventListener("click", () => {
	canvas.requestFullscreen();
}, { passive: true });

const redraw = () => {
	const time = (performance.now() - TIME_START) / 1000;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const fnSpaceLeft = Math.floor(camera.x);
	const fnSpaceTop = Math.floor(camera.y);
	const fnSpaceRight = Math.ceil(camera.x + (canvas.width / camera.scale));
	const fnSpaceBottom = Math.ceil(camera.y + (canvas.height / camera.scale));


	for (let y = fnSpaceTop; y < fnSpaceBottom; y++) {
		for (let x = fnSpaceLeft; x < fnSpaceRight; x++) {
			const fnSpaceX = x;
			const fnSpaceY = settings.cartesian ? -y : y;

			const rectX = (x * camera.scale) - (camera.scale * camera.x);
			const rectY = (y * camera.scale) - (camera.scale * camera.y);
			let tixyColor = userFunc(
				time,
				fnSpaceX,
				fnSpaceY,
				mouseX,
				mouseY
			);

			if (settings.clampValues) tixyColor = Math.max(-1, Math.min(tixyColor, 1));

			if (settings.useCircles) {
				ctx.fillStyle = tixyColor < 0 ? `#F24` : `#FFF`;
				ctx.beginPath();
				ctx.arc(rectX + camera.scale / 2, rectY + camera.scale / 2, Math.abs(tixyColor) * (camera.scale / 2), 0, 2 * Math.PI);
				ctx.fill();
			} else {
				ctx.fillStyle = circleToPixelColor(tixyColor);
				ctx.fillRect(rectX, rectY, camera.scale + 1, camera.scale + 1);
			}


			if (settings.debug) {
				ctx.strokeStyle = '#0FF';
				ctx.strokeRect(rectX, rectY, camera.scale + 1, camera.scale + 1);
			}
		}
	}

	if (settings.debug) {
		ctx.fillStyle = '#F0F';
		ctx.fillRect(0, canvas.height / 2, canvas.width, 1);
		ctx.fillRect(canvas.width / 2, 0, 1, canvas.height);
	}
};

requestAnimationFrame(function loop(now) {
	requestAnimationFrame(loop);
	logFrame(now);
	redraw();
	if (settings.showFPS) drawCounter();
});