const canvas = document.querySelector("canvas")!;
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;

const ctx = canvas.getContext("2d")!;

let userFunc = (
	t: number,
	i: number,
	x: number,
	y: number,
	mx: number,
	my: number,
	c: number
) => 0;

let TIME_START = 0;
const codeInput = document.querySelector<HTMLInputElement>("#code")!;
const MathDestructure = `const {${Object.getOwnPropertyNames(Math).join(",")}} = Math`;
const setFunc = () => {
	try {
		// @ts-ignore
		userFunc = new Function("t", "i", "x", "y", "mx", "my", "c", `${MathDestructure};try{return ${codeInput.value};}catch (e){return 0;}`);
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

const settings = {
	useCircles: true,
	cartesian: true,
	grid: false,
	tixyEmulator: false,
	smoothZoom: true,
	smoothPan: true,
	showFPS: false
};

const checkboxes: Record<keyof typeof settings, HTMLInputElement> = {
	useCircles: document.querySelector("#circles")!,
	cartesian: document.querySelector("#cartesian")!,
	grid: document.querySelector("#grid")!,
	tixyEmulator: document.querySelector("#tixy-emulator")!,
	smoothZoom: document.querySelector("#smooth-zoom")!,
	smoothPan: document.querySelector("#smooth-pan")!,
	showFPS: document.querySelector("#fps")!
};

for (const [key, element] of Object.entries(checkboxes) as Array<[keyof typeof settings, HTMLInputElement]>) {
	element.checked = settings[key];
	element.addEventListener("input", () => {
		settings[key] = element.checked;
	}, { passive: true });
}

let camera = { x: NaN, y: NaN, scale: NaN, scaleVelocity: NaN, target: { x: NaN, y: NaN } };
const centerCamera = (cx: number, cy: number, scale: number) => {
	const x = -(centerX / scale) + cx;
	const y = -(centerY / scale) + cy;

	camera = {
		x, y,
		scale: scale, scaleVelocity: 0,
		target: { x, y }
	};
};

const resetCamera = () => {
	if (settings.tixyEmulator) {
		centerCamera(8, 8, canvas.height / 17);
	} else {
		centerCamera(0.5, 0.5, canvas.height / 18);
	}
};

resetCamera();

document.querySelector("#resetCamera")!.addEventListener("click", resetCamera, { passive: true });

checkboxes.tixyEmulator.addEventListener("input", () => {
	resetCamera();
	checkboxes.cartesian.disabled = checkboxes.tixyEmulator.checked;
}, { passive: true });

document.querySelector("#fullscreen")!.addEventListener("click", () => canvas.requestFullscreen(), { passive: true });

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
	if (settings.smoothZoom) {
		camera.scaleVelocity += deltaY;
	} else {
		zoomBy(0.1 * (deltaY > 0 ? -1 : 1));
	}
}, { passive: true });

const lerp = (start: number, end: number, t: number): number => (1 - t) * start + t * end;

const fixPositionForZoom = (oldScale: number, newScale: number, container: { x: number, y: number; }) => {
	// Convert the center point to function space coordinates
	const centerFnSpaceX = (centerX / oldScale) + container.x;
	const centerFnSpaceY = (centerY / oldScale) + container.y;

	// Adjust camera position to keep the center fixed
	container.x = centerFnSpaceX - (centerX / newScale);
	container.y = centerFnSpaceY - (centerY / newScale);
};

const zoomBy = (zoomFactor: number) => {
	const newScale = Math.min(1000, Math.max(10, camera.scale * (1 + zoomFactor)));
	fixPositionForZoom(camera.scale, newScale, camera);
	fixPositionForZoom(camera.scale, newScale, camera.target);
	camera.scale = newScale;
};

const updateCamera = () => {
	if (settings.smoothPan) {
		camera.x = lerp(camera.x, camera.target.x, 0.2);
		camera.y = lerp(camera.y, camera.target.y, 0.2);
	} else {
		camera.x = camera.target.x;
		camera.y = camera.target.y;
	}

	if (settings.smoothZoom) {
		camera.scaleVelocity *= 0.8;
		zoomBy(camera.scaleVelocity / -4000);
	}
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

const fixCartesianality = (y: number) => {
	if (settings.tixyEmulator) return y;
	return settings.cartesian ? -y + 0.0 : y;
};

const canvasSpaceToFnSpace = (x: number, y: number) => {
	const fnSpaceX = ((x - camera.scale / 2) + (camera.scale * camera.x)) / camera.scale;
	const fnSpaceY = ((y - camera.scale / 2) + (camera.scale * camera.y)) / camera.scale;
	return [fnSpaceX, fixCartesianality(fnSpaceY)] as const;
};

// Assumes cartesian = false
const fnSpaceToCanvasSpace = (x: number, y: number) => {
	const canvasSpaceX = camera.scale * (x - camera.x);
	const canvasSpaceY = camera.scale * (y - camera.y);
	return [canvasSpaceX, canvasSpaceY] as const;
};

const redraw = () => {
	const time = (performance.now() - TIME_START) / 1000;
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const [fnSpaceMouseX, fnSpaceMouseY] = canvasSpaceToFnSpace(mouseX, mouseY);

	const fnSpaceLeft = settings.tixyEmulator ? 0 : Math.floor(camera.x);
	const fnSpaceTop = settings.tixyEmulator ? 0 : Math.floor(camera.y);
	const fnSpaceRight = settings.tixyEmulator ? 16 : Math.ceil(camera.x + (canvas.width / camera.scale));
	const fnSpaceBottom = settings.tixyEmulator ? 16 : Math.ceil(camera.y + (canvas.height / camera.scale));

	let gridX1 = 0;
	let gridX2 = canvas.width;
	let gridY1 = 0;
	let gridY2 = canvas.height;
	if (settings.tixyEmulator) {
		const [x1, y1] = fnSpaceToCanvasSpace(0, 0);
		const [x2, y2] = fnSpaceToCanvasSpace(16, 16);
		gridX1 = x1;
		gridX2 = x2;
		gridY1 = y1;
		gridY2 = y2;
	}

	ctx.font = `${camera.scale / 8}px Computer Modern Serif, serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	const screenCount = (fnSpaceBottom - fnSpaceTop) * (fnSpaceRight - fnSpaceLeft);
	let screenIndex = 0;
	for (let y = fnSpaceTop; y < fnSpaceBottom; y++) {
		for (let x = fnSpaceLeft; x < fnSpaceRight; x++) {
			screenIndex++;
			const fnSpaceX = x;
			const fnSpaceY = fixCartesianality(y);

			const rectX = (x * camera.scale) - (camera.scale * camera.x);
			const rectY = (y * camera.scale) - (camera.scale * camera.y);

			let tixyColor = userFunc(
				time,
				screenIndex,
				fnSpaceX,
				fnSpaceY,
				fnSpaceMouseX,
				fnSpaceMouseY,
				screenCount
			);

			tixyColor = Math.max(-1, Math.min(tixyColor, 1));

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
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.moveTo(rectX, gridY1);
				ctx.lineTo(rectX, gridY2);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(gridX1, rectY);
				ctx.lineTo(gridX2, rectY);
				ctx.stroke();

				ctx.shadowColor = "#000";
				ctx.shadowBlur = 5;
				ctx.fillStyle = (fnSpaceY === 0 || fnSpaceX === 0) && !settings.tixyEmulator ? '#FF0' : '#EEE';
				ctx.fillText(`(${fnSpaceX.toLocaleString()}, ${fnSpaceY.toLocaleString()})`, rectX + camera.scale / 2, rectY + camera.scale / 2);
				ctx.shadowColor = "#0000";
			}
		}
	}

	if (settings.tixyEmulator) {
		ctx.lineWidth = camera.scale / 3;
		ctx.strokeStyle = '#F24';
		ctx.strokeRect(
			gridX1 - ctx.lineWidth / 2,
			gridY1 - ctx.lineWidth / 2,
			gridX2 - gridX1 + ctx.lineWidth,
			gridY2 - gridY1 + ctx.lineWidth
		);
	}
};

requestAnimationFrame(function loop(now) {
	requestAnimationFrame(loop);
	logFrame(now);
	updateCamera();
	redraw();
	if (settings.showFPS) drawCounter();
});