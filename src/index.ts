const canvas = document.querySelector("canvas")!;
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

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

const camera = {
	x: START_X,
	y: START_Y,
	scale: START_SCALE,
	scaleVelocity: 0,
	target: { x: START_X, y: START_Y }
};

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
		camera.target.x -= movementX / camera.scale / widthRatio;
		camera.target.y -= movementY / camera.scale / heightRatio;
	}
}, { passive: true });

canvas.addEventListener("wheel", ({ deltaY }) => {
	camera.scaleVelocity += deltaY;
}, { passive: true });

const lerp = (start: number, end: number, t: number): number => (1 - t) * start + t * end;

const fixPositionForZoom = (oldScale: number, newScale: number, container: { x: number, y: number }) => {
	// Convert the center point to function space coordinates
	const centerFnSpaceX = (centerX / oldScale) + container.x;
	const centerFnSpaceY = (centerY / oldScale) + container.y;

	// Adjust camera position to keep the center fixed
	container.x = centerFnSpaceX - (centerX / newScale);
	container.y = centerFnSpaceY - (centerY / newScale);
};

const updateCamera = () => {
	camera.x = lerp(camera.x, camera.target.x, 0.2);
	camera.y = lerp(camera.y, camera.target.y, 0.2);

	camera.scaleVelocity *= 0.8;
	const zoomFactor = camera.scaleVelocity / -4000;
	const newScale = Math.min(1000, Math.max(10, camera.scale * (1 + zoomFactor)));
	fixPositionForZoom(camera.scale, newScale, camera);
	fixPositionForZoom(camera.scale, newScale, camera.target);
	camera.scale = newScale;
};

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
	grid: false,
	showFPS: false
};

const checkboxes: Record<keyof typeof settings, HTMLInputElement> = {
	useCircles: document.querySelector("#circles")!,
	clampValues: document.querySelector("#clamp")!,
	cartesian: document.querySelector("#cartesian")!,
	grid: document.querySelector("#grid")!,
	showFPS: document.querySelector("#fps")!
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
	updateCamera();

	const time = (performance.now() - TIME_START) / 1000;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const fnSpaceLeft = Math.floor(camera.x);
	const fnSpaceTop = Math.floor(camera.y);
	const fnSpaceRight = Math.ceil(camera.x + (canvas.width / camera.scale));
	const fnSpaceBottom = Math.ceil(camera.y + (canvas.height / camera.scale));

	ctx.font = `${camera.scale / 8}px Computer Modern Serif, serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

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

			if (settings.grid) {
				ctx.fillStyle = '#0008';
				ctx.fillRect(rectX, rectY, camera.scale, camera.scale);
				ctx.strokeStyle = '#222';
				ctx.beginPath();
				ctx.moveTo(rectX, 0);
				ctx.lineTo(rectX, canvas.height);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, rectY);
				ctx.lineTo(canvas.width, rectY);
				ctx.stroke();

				ctx.shadowColor = "#000";
				ctx.shadowBlur = 5;
				ctx.fillStyle = fnSpaceY === 0 || fnSpaceX === 0 ? '#FF0' : '#EEE';
				ctx.fillText(`(${fnSpaceX.toLocaleString()}, ${fnSpaceY.toLocaleString()})`, rectX + camera.scale / 2, rectY + camera.scale / 2);
				ctx.shadowColor = "#0000";
			}
		}
	}
};

requestAnimationFrame(function loop(now) {
	requestAnimationFrame(loop);
	logFrame(now);
	redraw();
	if (settings.showFPS) drawCounter();
});