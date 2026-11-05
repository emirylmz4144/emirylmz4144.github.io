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
	if (!widget || !toggle || !panel || !closeButton || !canvas || !startButton) return;

	const context = canvas.getContext("2d");
	if (!context) return;

	const width = canvas.width;
	const height = canvas.height;
	const groundY = 195;
	const playerX = 178;
	const playerFace = new Image();
	playerFace.src = canvas.dataset.face;

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
		obstacles: [],
		groundShift: 0,
	};

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
		context.arc(535, 43, 24, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "rgba(214, 228, 202, 0.9)";
		context.beginPath();
		context.arc(535, 43, 15, 0, Math.PI * 2);
		context.fill();

		const cloudShift = (time / 85) % 760;
		for (let index = 0; index < 3; index += 1) {
			const x = (index * 245 + 80 - cloudShift + 760) % 760 - 50;
			context.fillStyle = "rgba(255, 255, 255, 0.66)";
			context.beginPath();
			context.ellipse(x, 47 + index % 2 * 17, 25, 7, 0, 0, Math.PI * 2);
			context.ellipse(x + 15, 44 + index % 2 * 17, 13, 9, 0, 0, Math.PI * 2);
			context.fill();
		}

		context.fillStyle = "#e2eadc";
		context.beginPath();
		context.moveTo(0, 156);
		context.bezierCurveTo(90, 115, 145, 150, 230, 135);
		context.bezierCurveTo(332, 111, 390, 155, 488, 131);
		context.bezierCurveTo(550, 117, 605, 127, 640, 115);
		context.lineTo(640, groundY);
		context.lineTo(0, groundY);
		context.closePath();
		context.fill();

		context.fillStyle = "#dde6d6";
		for (let index = 0; index < 7; index += 1) {
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
		for (let index = 0; index < 19; index += 1) {
			const x = (index * 47 - game.groundShift % 47 + width) % width;
			context.fillRect(x, groundY + 15 + (index % 2) * 12, 13, 2);
		}
	}

	function drawGirl(x, phase, dressColor, time) {
		const step = Math.sin(time / 78 + phase);
		const bob = Math.max(0, Math.sin(time / 78 + phase)) * 2;
		const headY = groundY - 48 + bob;

		context.save();
		context.lineCap = "round";
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
		context.ellipse(x, headY, 9, 10, 0, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#edc7ad";
		context.beginPath();
		context.arc(x + 1, headY + 1, 6.5, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#795348";
		context.beginPath();
		context.arc(x - 1, headY - 5, 8, Math.PI, Math.PI * 2);
		context.fill();
		context.beginPath();
		context.arc(x + 7, headY - 3, 3, 0, Math.PI * 2);
		context.fill();

		drawHeart(x + Math.sin(time / 210 + phase) * 3, headY - 25 - Math.sin(time / 180 + phase) * 3, 13, 0.86);
		context.restore();
	}

	function drawPlayer(time) {
		const bottom = groundY - game.jumpHeight;
		const step = game.jumpHeight > 2 ? 0 : Math.sin(time / 55) * 8;
		const shadowScale = Math.max(0.45, 1 - game.jumpHeight / 120);

		context.fillStyle = `rgba(63, 78, 57, ${0.15 * shadowScale})`;
		context.beginPath();
		context.ellipse(playerX, groundY + 3, 19 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
		context.fill();

		context.lineCap = "round";
		context.strokeStyle = "#293444";
		context.lineWidth = 5;
		context.beginPath();
		context.moveTo(playerX - 3, bottom - 16);
		context.lineTo(playerX - 7 + step, bottom - 3);
		context.moveTo(playerX + 3, bottom - 16);
		context.lineTo(playerX + 8 - step, bottom - 3);
		context.stroke();

		context.fillStyle = "#5368d5";
		roundedRect(playerX - 10, bottom - 39, 20, 25, 7);
		context.fill();

		context.strokeStyle = "#f0c9ad";
		context.lineWidth = 4;
		context.beginPath();
		context.moveTo(playerX - 8, bottom - 33);
		context.lineTo(playerX - 15 - step * 0.35, bottom - 24);
		context.moveTo(playerX + 8, bottom - 33);
		context.lineTo(playerX + 14 + step * 0.35, bottom - 25);
		context.stroke();

		const headRadius = 17;
		const headY = bottom - 56;
		context.save();
		context.beginPath();
		context.arc(playerX, headY, headRadius, 0, Math.PI * 2);
		context.clip();
		if (playerFace.complete && playerFace.naturalWidth > 0) {
		const sourceSize = Math.min(playerFace.naturalWidth, playerFace.naturalHeight) * 0.68;
			const sourceX = (playerFace.naturalWidth - sourceSize) * 0.5;
		const sourceY = playerFace.naturalHeight * 0.13;
			context.drawImage(playerFace, sourceX, sourceY, sourceSize, sourceSize, playerX - headRadius, headY - headRadius, headRadius * 2, headRadius * 2);
		} else {
			context.fillStyle = "#edc7ad";
			context.fillRect(playerX - headRadius, headY - headRadius, headRadius * 2, headRadius * 2);
		}
		context.restore();
		context.strokeStyle = "#fff";
		context.lineWidth = 3;
		context.beginPath();
		context.arc(playerX, headY, headRadius, 0, Math.PI * 2);
		context.stroke();
	}

	function drawObstacle(obstacle) {
		const top = groundY - obstacle.height;
		context.fillStyle = obstacle.type === "flower" ? "#d28b72" : "#667d53";
		roundedRect(obstacle.x, top, obstacle.width, obstacle.height, 5);
		context.fill();
		context.fillStyle = obstacle.type === "flower" ? "#e3a985" : "#91a67a";
		roundedRect(obstacle.x + 4, top + 5, obstacle.width - 8, 5, 2);
		context.fill();
		if (obstacle.type === "flower") {
			context.strokeStyle = "#849c67";
			context.lineWidth = 3;
			context.beginPath();
			context.moveTo(obstacle.x + obstacle.width / 2, top + obstacle.height);
			context.lineTo(obstacle.x + obstacle.width / 2, groundY);
			context.stroke();
		}
	}

	function drawScene(time = 0) {
		drawBackground(time);
		drawGirl(playerX - 91, 1.8, "#d997a7", time);
		drawGirl(playerX - 51, 0.3, "#a9a2d5", time);
		game.obstacles.forEach(drawObstacle);
		drawPlayer(time);
	}

	function updateScore() {
		scoreLabel.textContent = `${Math.floor(game.distance)} m`;
	}

	function stopGame() {
		game.running = false;
		if (game.frame) window.cancelAnimationFrame(game.frame);
	}

	function finishGame() {
		stopGame();
		message.textContent = `Yakalandın! ${Math.floor(game.distance)} metre kaçtın. Bir tur daha?`;
		startButton.innerHTML = 'Tekrar dene <span aria-hidden="true">↻</span>';
		startScreen.hidden = false;
	}

	function startGame() {
		stopGame();
		game.running = true;
		game.lastTime = performance.now();
		game.elapsed = 0;
		game.distance = 0;
		game.speed = 282;
		game.spawnIn = 0.8;
		game.jumpHeight = 0;
		game.jumpVelocity = 0;
		game.obstacles = [];
		game.groundShift = 0;
		updateScore();
		startScreen.hidden = true;
		game.frame = window.requestAnimationFrame(loop);
	}

	function jump() {
		if (!game.running || game.jumpHeight > 1) return;
		game.jumpVelocity = 535;
	}

	function update(delta) {
		game.elapsed += delta;
		game.distance += delta * (game.speed / 55);
		game.speed = Math.min(430, 282 + game.distance * 1.25);
		game.groundShift = (game.groundShift + game.speed * delta) % 47;

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
			const type = Math.random() > 0.45 ? "crate" : "flower";
			game.obstacles.push({
				x: width + 18,
				width: type === "crate" ? 25 : 22,
				height: type === "crate" ? 30 + Math.random() * 6 : 26,
				type,
			});
			game.spawnIn = Math.max(0.92, 1.38 + Math.random() * 0.72 - game.distance / 900);
		}

		game.obstacles.forEach((obstacle) => {
			obstacle.x -= game.speed * delta;
		});
		game.obstacles = game.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);

		const collided = game.obstacles.some((obstacle) => (
			obstacle.x < playerX + 11
			&& obstacle.x + obstacle.width > playerX - 11
			&& game.jumpHeight < obstacle.height - 2
		));
		if (collided) finishGame();
		updateScore();
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
		panel.hidden = false;
		toggle.setAttribute("aria-expanded", "true");
		toggle.setAttribute("aria-label", "Oyunu kapat");
		drawScene(performance.now());
	}

	function closeGame() {
		game.open = false;
		stopGame();
		panel.hidden = true;
		toggle.setAttribute("aria-expanded", "false");
		toggle.setAttribute("aria-label", "Oyun oyna");
		startScreen.hidden = false;
		message.textContent = "Engellerden kaç, kalpleri geride bırak! 💕";
		startButton.innerHTML = 'Oyuna başla <span aria-hidden="true">→</span>';
		game.distance = 0;
		game.jumpHeight = 0;
		game.jumpVelocity = 0;
		game.obstacles = [];
		updateScore();
		toggle.focus();
	}

	toggle.addEventListener("click", () => {
		if (game.open) closeGame();
		else openGame();
	});
	closeButton.addEventListener("click", closeGame);
	startButton.addEventListener("click", startGame);
	canvas.addEventListener("pointerdown", jump);
	window.addEventListener("keydown", (event) => {
		if (!game.open) return;
		if (event.key === "Escape") {
			closeGame();
			return;
		}
		if ((event.code === "Space" || event.key === "ArrowUp") && game.running) {
			event.preventDefault();
			jump();
		}
	});

	drawScene(0);
})();
