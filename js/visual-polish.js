(() => {
	const progress = document.querySelector("#scroll-progress-fill");
	const header = document.querySelector(".site-header");
	if (!progress && !header) return;

	let scheduled = false;
	const update = () => {
		const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
		const amount = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
		if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, amount))})`;
		if (header) header.classList.toggle("is-raised", window.scrollY > 8);
		scheduled = false;
	};
	const scheduleUpdate = () => {
		if (scheduled) return;
		scheduled = true;
		window.requestAnimationFrame(update);
	};

	window.addEventListener("scroll", scheduleUpdate, { passive: true });
	window.addEventListener("resize", scheduleUpdate);
	update();
})();
