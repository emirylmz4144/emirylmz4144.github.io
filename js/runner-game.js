(() => {
	const widget = document.querySelector("#runner-game");
	const toggle = document.querySelector("#runner-toggle");
	const panel = document.querySelector("#runner-panel");
	const closeButton = document.querySelector("#runner-close");
	const canvas = document.querySelector("#runner-canvas");
	const startScreen = document.querySelector("#runner-start-screen");
	const message = document.querySelector("#runner-message");
	const startButton = document.querySelector("#runner-start");
	const scoreLabel = document.querySelector("#runner-score");
	const bombLabel = document.querySelector("#runner-bombs");
	const bombButton = document.querySelector("#runner-bomb-button");
	const girlCountLabel = document.querySelector("#runner-girl-count");
	if (!widget || !toggle || !panel || !closeButton || !canvas || !startButton) return;

	const context = canvas.getContext("2d");
	if (!context) return;

	let width = canvas.width;
	let height = canvas.height;
	let groundY = 195;
	let playerX = 178;
	let unitScale = 1;
	const playerFace = new Image();
	playerFace.src = canvas.dataset.face;
	const dressColors = ["#d997a7", "#a9a2d5", "#e0a96c", "#83b8ae", "#d78579"];

	const game = {
		open: false,
		running: false,
		frame: 0,
		lastTime: 0,
		elapsed: 0,
		distance: 0,
		speed: 282,
		spawnIn: 0.9,
		jumpHeight: 0,
		jumpVelocity: 0,
		ducking: false,
		captured: false,
		captureProgress: 0,
		obstacles: [],
		balloons: [],
		bombs: [],
		bombCount: 0,
		effects: [],
		girls: [
			{ gap: 72, targetGap: 72, catching: false, phase: 0.4, color: dressColors[0] },
			{ gap: 120, targetGap: 120, catching: false, phase: 1.8, color: dressColors[1] },
		],
		nextGirlAt: 50,
		nextBalloonAt: 60,
		groundShift: 0,
	};

	function resizeCanvas() {
		const stage = canvas.closest(".runner-stage");
		const rect = stage?.getBoundingClientRect();
		if (!rect?.width || !rect.height) return false;

		const previousWidth = width;
		unitScale = Math.min(rect.width / 640, rect.height / 240);
		width = rect.width / unitScale;
		height = rect.height / unitScale;
		groundY = height * 0.81;
		playerX = width * 0.38;
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(rect.width * pixelRatio);
		canvas.height = Math.round(rect.height * pixelRatio);
		context.setTransform(pixelRatio * unitScale, 0, 0, pixelRatio * unitScale, 0, 0);

		if (previousWidth > 0 && previousWidth !== width) {
			const ratio = width / previousWidth;
			game.obstacles.forEach((item) => { item.x *= ratio; });
			game.balloons.forEach((item) => { item.x *= ratio; });
			game.bombs.forEach((item) => { item.x *= ratio; });
		}
		return true;
	}

	function drawHeart(x, y, size, alpha) {
		context.save();
		context.globalAlpha = alpha;
		context.font = `${size}px "Segoe UI Emoji", sans-serif`;
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText("💖", x, y);
		context.restore();
	}

	function roundedRect(x, y, rectWidth, rectHeight, radius) {
		const r = Math.min(radius, rectWidth / 2, rectHeight / 2);
		context.beginPath();
		context.moveTo(x + r, y);
		context.lineTo(x + rectWidth - r, y);
		context.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + r);
		context.lineTo(x + rectWidth, y + rectHeight - r);
		context.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - r, y + rectHeight);
		context.lineTo(x + r, y + rectHeight);
		context.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - r);
		context.lineTo(x, y + r);
		context.quadraticCurveTo(x, y, x + r, y);
		context.closePath();
	}

	function drawBackground(time) {
		context.fillStyle = "#edf2e8";
		context.fillRect(0, 0, width, height);

		context.fillStyle = "rgba(255, 255, 255, 0.56)";
		context.beginPath();
		context.arc(width * 0.84, height * 0.18, 24, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "rgba(214, 228, 202, 0.9)";
		context.beginPath();
		context.arc(width * 0.84, height * 0.18, 15, 0, Math.PI * 2);
		context.fill();

		const cloudShift = (time / 85) % (width + 100);
		for (let index = 0; index < 3; index += 1) {
			const x = (index * width / 3 + 80 - cloudShift + width + 100) % (width + 100) - 50;
			context.fillStyle = "rgba(255, 255, 255, 0.66)";
			context.beginPath();
			context.ellipse(x, 47 + index % 2 * 17, 25, 7, 0, 0, Math.PI * 2);
			context.ellipse(x + 15, 44 + index % 2 * 17, 13, 9, 0, 0, Math.PI * 2);
			context.fill();
		}

		context.fillStyle = "#e2eadc";
		context.beginPath();
		context.moveTo(0, groundY - 39);
		for (let index = 0; index < 3; index += 1) {
			const left = index * width / 3;
			const segment = width / 3;
			context.bezierCurveTo(left + segment * 0.38, groundY - 82, left + segment * 0.62, groundY - 42, left + segment, groundY - 59);
		}
		context.lineTo(width, groundY);
		context.lineTo(0, groundY);
		context.closePath();
		context.fill();

		context.fillStyle = "#dde6d6";
		for (let index = 0; index < Math.ceil(width / 99) + 1; index += 1) {
			const buildingX = 12 + index * 99;
			const buildingHeight = 22 + (index % 3) * 10;
			context.fillRect(buildingX, groundY - buildingHeight - 4, 26, buildingHeight);
			context.fillStyle = "rgba(255,255,255,0.72)";
			context.fillRect(buildingX + 6, groundY - buildingHeight + 4, 3, 4);
			context.fillRect(buildingX + 16, groundY - buildingHeight + 4, 3, 4);
			context.fillStyle = "#dde6d6";
		}

		context.fillStyle = "#d4dfca";
		context.fillRect(0, groundY, width, height - groundY);
		context.fillStyle = "#8ca56d";
		context.fillRect(0, groundY, width, 2);
		context.fillStyle = "rgba(113, 137, 88, 0.36)";
		for (let index = 0; index < Math.ceil(width / 47) + 1; index += 1) {
			const x = (index * 47 - game.groundShift % 47 + width) % width;
			context.fillRect(x, groundY + 15 + (index % 2) * 12, 13, 2);
		}
	}

	function drawGirl(x, phase, dressColor, time, { catching = false, kissing = false } = {}) {
		const step = kissing ? 0 : Math.sin(time / (catching ? 34 : 78) + phase);
		const bob = kissing ? 0 : Math.max(0, Math.sin(time / (catching ? 34 : 78) + phase)) * 2;
		const headX = x + (kissing ? (x < playerX ? 7 : -7) : 0);
		const headY = groundY - (kissing ? 55 : 48) + bob;

		context.save();
		context.lineCap = "round";
		if (catching) {
			context.strokeStyle = "rgba(255,255,255,0.72)";
			context.lineWidth = 2;
			context.beginPath();
			context.moveTo(x - 27, groundY - 33);
			context.lineTo(x - 15, groundY - 33);
			context.moveTo(x - 24, groundY - 25);
			context.lineTo(x - 14, groundY - 25);
			context.stroke();
		}
		context.strokeStyle = "#605454";
		context.lineWidth = 4;
		context.beginPath();
		context.moveTo(x - 3, groundY - 15 + bob);
		context.lineTo(x - 8 + step * 5, groundY - 3);
		context.moveTo(x + 4, groundY - 15 + bob);
		context.lineTo(x + 10 - step * 5, groundY - 3);
		context.stroke();

		context.fillStyle = dressColor;
		context.beginPath();
		context.moveTo(x - 8, groundY - 38 + bob);
		context.lineTo(x + 8, groundY - 38 + bob);
		context.lineTo(x + 13, groundY - 14 + bob);
		context.lineTo(x - 12, groundY - 14 + bob);
		context.closePath();
		context.fill();

		context.strokeStyle = "#f0c9b3";
		context.lineWidth = 3.5;
		context.beginPath();
		context.moveTo(x - 7, groundY - 33 + bob);
		context.lineTo(x - 14 - step * 3, groundY - 23 + bob);
		context.moveTo(x + 7, groundY - 33 + bob);
		context.lineTo(x + 13 + step * 3, groundY - 26 + bob);
		context.stroke();

		context.fillStyle = "#795348";
		context.beginPath();
		context.ellipse(headX, headY, 9, 10, 0, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#edc7ad";
		context.beginPath();
		context.arc(headX + (kissing ? (x < playerX ? 1 : -1) : 1), headY + 1, 6.5, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#795348";
		context.beginPath();
		context.arc(headX - 1, headY - 5, 8, Math.PI, Math.PI * 2);
		context.fill();
		context.beginPath();
		context.arc(headX + 7, headY - 3, 3, 0, Math.PI * 2);
		context.fill();

		drawHeart(headX + Math.sin(time / 210 + phase) * 3, headY - 25 - Math.sin(time / 180 + phase) * 3, 13, 0.86);
		context.restore();
	}

	function drawPlayer(time) {
		const bottom = groundY - game.jumpHeight;
		const crouching = game.ducking && game.jumpHeight < 3;
		const step = game.captured || crouching || game.jumpHeight > 2 ? 0 : Math.sin(time / 55) * 8;
		const shadowScale = Math.max(0.45, 1 - game.jumpHeight / 120);
		const torsoTop = bottom - (crouching ? 30 : 41);
		const torsoBottom = bottom - (crouching ? 10 : 13);
		const headRadiusX = 18;
		const headRadiusY = crouching ? 18 : 22;
		const headY = bottom - (crouching ? 36 : 62);

		context.fillStyle = `rgba(63, 78, 57, ${0.15 * shadowScale})`;
		context.beginPath();
		context.ellipse(playerX, groundY + 3, 19 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
		context.fill();

		context.lineCap = "round";
		context.strokeStyle = "#293444";
		context.lineWidth = 5;
		context.beginPath();
		if (crouching) {
			context.moveTo(playerX - 4, bottom - 13);
			context.lineTo(playerX - 17, bottom - 5);
			context.moveTo(playerX + 4, bottom - 13);
			context.lineTo(playerX + 16, bottom - 5);
		} else {
			context.moveTo(playerX - 3, bottom - 16);
			context.lineTo(playerX - 7 + step, bottom - 3);
			context.moveTo(playerX + 3, bottom - 16);
			context.lineTo(playerX + 8 - step, bottom - 3);
		}
		context.stroke();

		context.fillStyle = "#edc7ad";
		roundedRect(playerX - 5, headY + headRadiusY - 5, 10, 15, 4);
		context.fill();

		context.fillStyle = "#5368d5";
		roundedRect(playerX - (crouching ? 15 : 12), torsoTop, crouching ? 30 : 24, torsoBottom - torsoTop, 8);
		context.fill();
		context.fillStyle = "#8290e6";
		context.beginPath();
		context.moveTo(playerX - 7, torsoTop + 1);
		context.lineTo(playerX, torsoTop + 7);
		context.lineTo(playerX + 7, torsoTop + 1);
		context.closePath();
		context.fill();

		context.strokeStyle = "#f0c9ad";
		context.lineWidth = 4;
		context.beginPath();
		context.moveTo(playerX - 10, torsoTop + 7);
		context.lineTo(playerX - (crouching ? 23 : 15) - step * 0.35, torsoTop + 16);
		context.moveTo(playerX + 10, torsoTop + 7);
		context.lineTo(playerX + (crouching ? 23 : 14) + step * 0.35, torsoTop + 16);
		context.stroke();

		context.save();
		context.shadowColor = "rgba(47, 47, 52, 0.2)";
		context.shadowBlur = 5;
		context.fillStyle = "#664e49";
		context.beginPath();
		context.ellipse(playerX, headY, headRadiusX + 1, headRadiusY + 1, 0, 0, Math.PI * 2);
		context.fill();
		context.restore();

		context.save();
		context.beginPath();
		context.ellipse(playerX, headY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
		context.clip();
		if (playerFace.complete && playerFace.naturalWidth > 0) {
			const sourceWidth = Math.min(playerFace.naturalWidth, playerFace.naturalHeight) * 0.64;
			const sourceHeight = Math.min(playerFace.naturalWidth, playerFace.naturalHeight) * 0.78;
			const sourceX = (playerFace.naturalWidth - sourceWidth) * 0.5;
			const sourceY = playerFace.naturalHeight * 0.04;
			context.drawImage(playerFace, sourceX, sourceY, sourceWidth, sourceHeight, playerX - headRadiusX, headY - headRadiusY, headRadiusX * 2, headRadiusY * 2);
		} else {
			context.fillStyle = "#edc7ad";
			context.fillRect(playerX - headRadiusX, headY - headRadiusY, headRadiusX * 2, headRadiusY * 2);
		}
		context.restore();
		context.strokeStyle = "rgba(69, 53, 48, 0.38)";
		context.lineWidth = 1.2;
		context.beginPath();
		context.ellipse(playerX, headY, headRadiusX, headRadiusY, 0, 0, Math.PI * 2);
		context.stroke();
	}

	function drawObstacle(obstacle) {
		const top = groundY - obstacle.height - (obstacle.type === "low" ? 54 : 0);
		context.fillStyle = obstacle.type === "flower" ? "#d28b72" : obstacle.type === "low" ? "#b47d54" : "#667d53";
		roundedRect(obstacle.x, top, obstacle.width, obstacle.height, 5);
		context.fill();
		context.fillStyle = obstacle.type === "flower" ? "#e3a985" : obstacle.type === "low" ? "#dfab7e" : "#91a67a";
		roundedRect(obstacle.x + 4, top + 5, obstacle.width - 8, 5, 2);
		context.fill();
		if (obstacle.type === "low") {
			context.fillStyle = "#8b664d";
			context.fillRect(obstacle.x + 2, top + obstacle.height, 4, 54);
			context.fillRect(obstacle.x + obstacle.width - 6, top + obstacle.height, 4, 54);
			return;
		}
		if (obstacle.type === "flower") {
			context.strokeStyle = "#849c67";
			context.lineWidth = 3;
			context.beginPath();
			context.moveTo(obstacle.x + obstacle.width / 2, top + obstacle.height);
			context.lineTo(obstacle.x + obstacle.width / 2, groundY);
			context.stroke();
		}
	}

	function drawBalloon(balloon, time) {
		const y = balloon.y + Math.sin(time / 190 + balloon.phase) * 4;
		context.strokeStyle = "rgba(91, 103, 142, 0.7)";
		context.lineWidth = 1.2;
		context.beginPath();
		context.moveTo(balloon.x, y + 14);
		context.quadraticCurveTo(balloon.x + 5, y + 22, balloon.x - 1, y + 29);
		context.stroke();

		const shine = context.createRadialGradient(balloon.x - 5, y - 6, 1, balloon.x, y, 17);
		shine.addColorStop(0, "#f4f1ff");
		shine.addColorStop(0.35, "#aeb7f2");
		shine.addColorStop(1, "#6978d7");
		context.fillStyle = shine;
		context.beginPath();
		context.ellipse(balloon.x, y, 13, 17, -0.12, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "rgba(255,255,255,0.82)";
		context.beginPath();
		context.ellipse(balloon.x - 5, y - 6, 2.6, 4.2, -0.35, 0, Math.PI * 2);
		context.fill();
		context.font = '10px "Segoe UI Emoji", sans-serif';
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText("💣", balloon.x + 1, y + 2);
	}

	function drawBomb(bomb, time) {
		context.save();
		context.translate(bomb.x, bomb.y);
		context.rotate(Math.sin(time / 42) * 0.16);
		context.fillStyle = "#333943";
		context.beginPath();
		context.arc(0, 0, 9, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#68727e";
		context.beginPath();
		context.arc(-3, -3, 3, 0, Math.PI * 2);
		context.fill();
		context.strokeStyle = "#9b7355";
		context.lineWidth = 2.2;
		context.beginPath();
		context.moveTo(2, -7);
		context.quadraticCurveTo(5, -13, 10, -10);
		context.stroke();
		context.fillStyle = "#f4c06a";
		context.beginPath();
		context.arc(10, -10, 2, 0, Math.PI * 2);
		context.fill();
		context.restore();
	}

	function drawEffects() {
		game.effects.forEach((effect) => {
			context.save();
			context.globalAlpha = Math.max(0, effect.life / 0.5);
			context.font = '20px "Segoe UI Emoji", sans-serif';
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillText("💨", effect.x, effect.y - (0.5 - effect.life) * 38);
			context.restore();
		});
	}

	function drawScene(time = 0) {
		const progress = game.captured ? Math.min(1, game.captureProgress) : 0;
		const ease = progress * progress * (3 - 2 * progress);
		const cameraScale = 1 + ease * 1.38;
		const focusX = width / 2 + (playerX - width / 2) * ease;
		const focusY = height / 2 + (groundY - 62 - height / 2) * ease;
		const farthestFirst = [...game.girls].sort((first, second) => second.gap - first.gap);

		context.save();
		context.translate(width / 2, height / 2);
		context.scale(cameraScale, cameraScale);
		context.translate(-focusX, -focusY);
		drawBackground(time);
		if (progress > 0) {
			drawPlayer(time);
			farthestFirst.slice(0, -2).forEach((girl) => {
				drawGirl(playerX - girl.gap, girl.phase, girl.color, time, { catching: girl.catching });
			});
			const nearestGirls = [...game.girls].sort((first, second) => first.gap - second.gap).slice(0, 2);
			nearestGirls.forEach((girl, index) => {
				const currentX = playerX - girl.gap;
				const targetX = playerX + (index === 0 ? -25 : 25);
				const x = currentX + (targetX - currentX) * ease;
				drawGirl(x, girl.phase, girl.color, time, { kissing: progress > 0.72 });
			});
			if (progress > 0.78) {
				context.save();
				context.globalAlpha = Math.min(1, (progress - 0.78) * 4.5);
				context.font = '15px "Segoe UI Emoji", sans-serif';
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.fillText("💋", playerX - 18, groundY - 62);
				context.fillText("💋", playerX + 18, groundY - 62);
				context.restore();
			}
		} else {
			farthestFirst.forEach((girl) => {
				drawGirl(playerX - girl.gap, girl.phase, girl.color, time, { catching: girl.catching });
			});
			game.obstacles.forEach(drawObstacle);
			game.balloons.forEach((balloon) => drawBalloon(balloon, time));
			game.bombs.forEach((bomb) => drawBomb(bomb, time));
			drawEffects();
			drawPlayer(time);
		}
		context.restore();
	}

	function updateScore() {
		const value = `${Math.floor(game.distance)} m`;
		if (scoreLabel && scoreLabel.textContent !== value) scoreLabel.textContent = value;
	}

	function updateHud() {
		updateScore();
		const girlValue = `💕 ${game.girls.length}`;
		const bombValue = String(game.bombCount);
		if (girlCountLabel && girlCountLabel.textContent !== girlValue) girlCountLabel.textContent = girlValue;
		if (bombLabel && bombLabel.textContent !== bombValue) bombLabel.textContent = bombValue;
		if (bombButton) bombButton.disabled = !game.running || game.captured || game.bombCount < 1;
	}

	function resetGirls() {
		game.girls = [
			{ gap: 72, targetGap: 72, catching: false, phase: 0.4, color: dressColors[0] },
			{ gap: 120, targetGap: 120, catching: false, phase: 1.8, color: dressColors[1] },
		];
	}

	function addGirl() {
		if (game.girls.length >= 10) return;
		const farthestGap = game.girls.reduce((current, girl) => Math.max(current, girl.gap), 40);
		const gap = farthestGap + 118;
		game.girls.push({
			gap,
			targetGap: farthestGap + 58,
			catching: true,
			phase: Math.random() * Math.PI * 2,
			color: dressColors[game.girls.length % dressColors.length],
		});
	}

	function throwBomb() {
		if (!game.running || game.captured || game.bombCount < 1) return;
		game.bombCount -= 1;
		game.bombs.push({ x: playerX - 19, y: groundY - 32, age: 0 });
		updateHud();
	}

	function setDucking(ducking) {
		game.ducking = Boolean(ducking) && game.running && game.jumpHeight < 3;
	}

	function setGameSpeed() {
		const normalizedSpeed = Math.min(430, 282 + game.distance * 1.25);
		const viewportScale = width * unitScale / 640;
		game.speed = normalizedSpeed * viewportScale / unitScale;
		return normalizedSpeed;
	}

	function stopGame() {
		game.running = false;
		if (game.frame) window.cancelAnimationFrame(game.frame);
	}

	function finishGame() {
		stopGame();
		message.textContent = `Yakalandın! ${Math.floor(game.distance)} metre kaçtın. Öpücük yağmuru başladı! 💋💕`;
		startButton.innerHTML = 'Bir daha kaç <span aria-hidden="true">↻</span>';
		startScreen.hidden = false;
		updateHud();
	}

	function beginCapture() {
		game.captured = true;
		game.captureProgress = 0;
		game.jumpHeight = 0;
		game.jumpVelocity = 0;
		game.ducking = false;
		game.obstacles = [];
		game.spawnIn = Infinity;
	}

	function startGame() {
		stopGame();
		resizeCanvas();
		game.running = true;
		game.lastTime = performance.now();
		game.elapsed = 0;
		game.distance = 0;
		setGameSpeed();
		game.spawnIn = 0.8;
		game.jumpHeight = 0;
		game.jumpVelocity = 0;
		game.ducking = false;
		game.captured = false;
		game.captureProgress = 0;
		game.bombCount = 0;
		game.obstacles = [];
		game.balloons = [];
		game.bombs = [];
		game.effects = [];
		resetGirls();
		game.nextGirlAt = 50;
		game.nextBalloonAt = 60;
		game.groundShift = 0;
		updateHud();
		startScreen.hidden = true;
		game.frame = window.requestAnimationFrame(loop);
	}

	function jump() {
		if (!game.running || game.jumpHeight > 1) return;
		game.ducking = false;
		game.jumpVelocity = 535;
	}

	function update(delta) {
		game.elapsed += delta;
		if (game.captured) {
			game.captureProgress = Math.min(1, game.captureProgress + delta / 1.75);
			if (game.captureProgress >= 1) finishGame();
			return;
		}

		const normalizedSpeed = setGameSpeed();
		game.distance += delta * (normalizedSpeed / 55);
		setGameSpeed();
		game.groundShift = (game.groundShift + game.speed * delta) % 47;

		while (game.distance >= game.nextGirlAt) {
			if (game.girls.length < 10) addGirl();
			game.nextGirlAt += 50;
		}
		while (game.distance >= game.nextBalloonAt) {
			game.balloons.push({
				x: width + 24,
				y: groundY - 84,
				phase: Math.random() * Math.PI * 2,
			});
			game.nextBalloonAt += 60;
		}

		game.girls.forEach((girl) => {
			if (!girl.catching) return;
			girl.gap = Math.max(girl.targetGap, girl.gap - 155 * delta);
			if (girl.gap <= girl.targetGap) girl.catching = false;
		});

		if (game.jumpVelocity > 0 || game.jumpHeight > 0) {
			game.jumpHeight += game.jumpVelocity * delta;
			game.jumpVelocity -= 1420 * delta;
			if (game.jumpHeight <= 0) {
				game.jumpHeight = 0;
				game.jumpVelocity = 0;
			}
		}

		game.spawnIn -= delta;
		if (game.spawnIn <= 0) {
			const roll = Math.random();
			const type = roll < 0.25 ? "low" : roll < 0.46 ? "flower" : "crate";
			game.obstacles.push({
				x: width + 18,
				width: type === "low" ? 72 : type === "crate" ? 25 : 22,
				height: type === "low" ? 16 : type === "crate" ? 30 + Math.random() * 6 : 26,
				type,
			});
			game.spawnIn = Math.max(0.92, 1.38 + Math.random() * 0.72 - game.distance / 1500);
		}

		game.obstacles.forEach((obstacle) => {
			obstacle.previousX = obstacle.x;
			obstacle.x -= game.speed * delta;
		});
		game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);

		game.balloons.forEach((balloon) => {
			balloon.previousX = balloon.x;
			balloon.x -= game.speed * delta;
		});
		for (let index = game.balloons.length - 1; index >= 0; index -= 1) {
			const balloon = game.balloons[index];
			const balloonY = balloon.y + Math.sin(game.elapsed * 1000 / 190 + balloon.phase) * 4;
			const playerCenterY = groundY - game.jumpHeight - (game.ducking ? 28 : 46);
			const collected = !game.ducking
				&& game.jumpHeight > 14
				&& Math.abs(playerCenterY - balloonY) < 38
				&& balloon.previousX > playerX - 22
				&& balloon.x < playerX + 22;
			if (collected) {
				game.bombCount += 1;
				game.effects.push({ x: playerX, y: balloon.y, life: 0.5 });
				game.balloons.splice(index, 1);
			} else if (balloon.x < -30) {
				game.balloons.splice(index, 1);
			}
		}

		for (let index = game.bombs.length - 1; index >= 0; index -= 1) {
			const bomb = game.bombs[index];
			const previousX = bomb.x;
			bomb.x -= game.speed * 1.4 * delta;
			bomb.age += delta;
			const girlIndex = game.girls.findIndex((girl) => {
				const girlX = playerX - girl.gap;
				return previousX >= girlX - 21
					&& bomb.x <= girlX + 18
					&& Math.abs(bomb.y - (groundY - 27)) < 48;
			});
			if (girlIndex >= 0) {
				const girl = game.girls.splice(girlIndex, 1)[0];
				game.effects.push({ x: playerX - girl.gap, y: groundY - 35, life: 0.5 });
				game.bombs.splice(index, 1);
			} else if (bomb.x < -30) {
				game.bombs.splice(index, 1);
			}
		}

		game.effects.forEach((effect) => { effect.life -= delta; });
		game.effects = game.effects.filter((effect) => effect.life > 0);

		const playerTop = groundY - game.jumpHeight - (game.ducking ? 50 : 84);
		const playerBottom = groundY - game.jumpHeight - 2;
		const collided = game.obstacles.some((obstacle) => {
			const obstacleTop = groundY - obstacle.height - (obstacle.type === "low" ? 54 : 0);
			const obstacleBottom = obstacleTop + obstacle.height;
			const obstacleLeft = Math.min(obstacle.previousX ?? obstacle.x, obstacle.x);
			const obstacleRight = Math.max(obstacle.previousX ?? obstacle.x, obstacle.x) + obstacle.width;
			const overlapsHorizontally = obstacleLeft < playerX + 12 && obstacleRight > playerX - 12;
			const overlapsVertically = playerTop < obstacleBottom && playerBottom > obstacleTop;
			return overlapsHorizontally && overlapsVertically;
		});
		if (collided) beginCapture();
		updateHud();
	}

	function loop(time) {
		if (!game.running || !game.open) return;
		const delta = Math.min((time - game.lastTime) / 1000, 0.035);
		game.lastTime = time;
		update(delta);
		drawScene(time);
		if (game.running) game.frame = window.requestAnimationFrame(loop);
	}

	function openGame() {
		game.open = true;
		widget.classList.add("is-open");
		panel.hidden = false;
		toggle.setAttribute("aria-expanded", "true");
		toggle.setAttribute("aria-label", "Oyunu kapat");
		resizeCanvas();
		drawScene(performance.now());
	}

	function closeGame() {
		game.open = false;
		stopGame();
		widget.classList.remove("is-open");
		panel.hidden = true;
		toggle.setAttribute("aria-expanded", "false");
		toggle.setAttribute("aria-label", "Oyun oyna");
		startScreen.hidden = false;
		message.textContent = "Engellerden zıpla, peşindeki kalpleri geride bırak! 💕";
		startButton.innerHTML = 'Aşktan kaç <span aria-hidden="true">→</span>';
		game.distance = 0;
		game.jumpHeight = 0;
		game.jumpVelocity = 0;
		game.captured = false;
		game.captureProgress = 0;
		game.obstacles = [];
		game.balloons = [];
		game.bombs = [];
		game.effects = [];
		game.bombCount = 0;
		resetGirls();
		game.nextGirlAt = 50;
		game.nextBalloonAt = 60;
		updateHud();
		toggle.focus();
	}

	toggle.addEventListener("click", () => {
		if (game.open) closeGame();
		else openGame();
	});
	closeButton.addEventListener("click", closeGame);
	startButton.addEventListener("click", startGame);
	if (bombButton) bombButton.addEventListener("click", throwBomb);

	let pointerStart = null;
	canvas.addEventListener("pointerdown", (event) => {
		if (!game.running) return;
		pointerStart = { x: event.clientX, y: event.clientY };
		canvas.setPointerCapture?.(event.pointerId);
	});
	canvas.addEventListener("pointerup", (event) => {
		if (!pointerStart || !game.running) return;
		const deltaX = event.clientX - pointerStart.x;
		const deltaY = event.clientY - pointerStart.y;
		pointerStart = null;
		if (deltaY > 24) {
			setDucking(true);
			window.setTimeout(() => setDucking(false), 550);
		} else if (deltaX < -28) {
			throwBomb();
		} else {
			jump();
		}
	});
	canvas.addEventListener("pointercancel", () => { pointerStart = null; });
	window.addEventListener("keydown", (event) => {
		if (!game.open) return;
		if (event.key === "Escape") {
			closeGame();
			return;
		}
		if (!game.running) return;
		if ((event.code === "Space" || event.key === "ArrowUp") && game.running) {
			event.preventDefault();
			jump();
		} else if (event.key === "ArrowDown" || event.code === "KeyS") {
			event.preventDefault();
			setDucking(true);
		} else if (!event.repeat && (event.code === "KeyX" || event.code === "KeyB")) {
			throwBomb();
		}
	});
	window.addEventListener("keyup", (event) => {
		if (event.key === "ArrowDown" || event.code === "KeyS") setDucking(false);
	});
	window.addEventListener("blur", () => setDucking(false));

	const stageElement = canvas.closest(".runner-stage");
	if (stageElement && "ResizeObserver" in window) {
		const stageObserver = new ResizeObserver(() => {
			if (resizeCanvas()) drawScene(performance.now());
		});
		stageObserver.observe(stageElement);
	} else {
		window.addEventListener("resize", () => {
			if (resizeCanvas()) drawScene(performance.now());
		});
	}

	drawScene(0);
})();
