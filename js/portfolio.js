(() => {
	const menuButton = document.querySelector(".menu-toggle");
	const navigation = document.querySelector(".site-nav");
	const questionForm = document.querySelector("#question-form");
	const verificationForm = document.querySelector("#verification-form");
	const verificationPanel = document.querySelector("#verification-panel");
	const questionStatus = document.querySelector("#question-status");
	let challengeId = "";

	if (menuButton && navigation) {
		const closeMenu = () => {
			menuButton.setAttribute("aria-expanded", "false");
			menuButton.setAttribute("aria-label", "Menüyü aç");
			navigation.classList.remove("is-open");
			document.body.classList.remove("menu-open");
		};

		menuButton.addEventListener("click", () => {
			const isOpen = menuButton.getAttribute("aria-expanded") === "true";
			menuButton.setAttribute("aria-expanded", String(!isOpen));
			menuButton.setAttribute("aria-label", isOpen ? "Menüyü aç" : "Menüyü kapat");
			navigation.classList.toggle("is-open", !isOpen);
			document.body.classList.toggle("menu-open", !isOpen);
		});

		navigation.querySelectorAll("a").forEach((link) => {
			link.addEventListener("click", closeMenu);
		});

		document.addEventListener("keydown", (event) => {
			if (event.key === "Escape") closeMenu();
		});

		window.addEventListener("resize", () => {
			if (window.innerWidth > 700) closeMenu();
		});
	}

	if (!questionForm || !verificationForm || !verificationPanel || !questionStatus) return;
	const apiBase = typeof window.PORTFOLIO_CONTACT_API_BASE === "string"
		? window.PORTFOLIO_CONTACT_API_BASE.trim().replace(/\/+$/, "")
		: "";
	const apiUrl = (path) => `${apiBase}${path}`;

	const message = (text, state = "") => {
		questionStatus.textContent = text;
		if (state) questionStatus.dataset.state = state;
		else delete questionStatus.dataset.state;
	};
	const requestButton = questionForm.querySelector("button[type='submit']");
	const serverUnavailableMessage = location.protocol === "file:"
		? "Soru formu şu anda kullanılamıyor. Siteyi sunucu üzerinden açtığında formu kullanabilirsin."
		: "Soru formu şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.";

	const setBusy = (button, busy, busyText) => {
		if (!button.dataset.idleText) button.dataset.idleText = button.firstChild.textContent.trim();
		button.disabled = busy;
		button.setAttribute("aria-busy", String(busy));
		button.firstChild.textContent = busy ? `${busyText} ` : `${button.dataset.idleText} `;
	};

	const post = async (url, payload) => {
		let response;
		try {
			response = await fetch(apiUrl(url), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
		} catch {
			throw new Error(serverUnavailableMessage);
		}

		const contentType = (response.headers.get("content-type") || "").toLowerCase();
		if (!contentType.includes("application/json")) throw new Error(serverUnavailableMessage);
		const result = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(result.message || "İşlem tamamlanamadı. Lütfen tekrar dene.");
		return result;
	};

	const checkContactService = async () => {
		if (location.protocol === "file:") {
			message(serverUnavailableMessage, "error");
			return;
		}

		try {
			const response = await fetch(apiUrl("/api/contact/status"), { headers: { Accept: "application/json" } });
			const contentType = (response.headers.get("content-type") || "").toLowerCase();
			if (!contentType.includes("application/json")) {
				message(serverUnavailableMessage, "error");
				return;
			}
			const status = await response.json();
			if (!response.ok) {
				message(serverUnavailableMessage, "error");
				return;
			}
			if (!status.configured) {
				message("Soru formu şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.", "error");
				return;
			}
			requestButton.disabled = false;
			message("");
		} catch {
			message(serverUnavailableMessage, "error");
		}
	};

	questionForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (!questionForm.reportValidity()) return;

		const form = new FormData(questionForm);
		const button = questionForm.querySelector("button[type='submit']");
		message("");
		setBusy(button, true, "İçerik kontrol ediliyor…");

		try {
			const result = await post("/api/contact/request-code", {
				name: form.get("name"),
				email: form.get("email"),
				question: form.get("question"),
				website: form.get("website"),
			});
			challengeId = result.challengeId;
			questionForm.hidden = true;
			verificationForm.reset();
			verificationForm.hidden = false;
			verificationPanel.hidden = false;
			document.querySelector("#new-question").hidden = true;
			document.querySelector("#verification-email").textContent = result.email;
			document.querySelector("#verification-code").focus();
			message("E-posta adresine doğrulama kodu gönderdik. Devam etmek için kodu gir.", "success");
		} catch (error) {
			message(error.message || "Şu anda işlem yapılamadı. Lütfen biraz sonra tekrar dene.", "error");
		} finally {
			setBusy(button, false);
		}
	});

	document.querySelector("#verification-code").addEventListener("input", (event) => {
		event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 6);
	});

	verificationForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (!verificationForm.reportValidity()) return;

		const button = verificationForm.querySelector("button[type='submit']");
		const code = new FormData(verificationForm).get("code");
		message("");
		setBusy(button, true, "Adres doğrulanıyor…");

		try {
			await post("/api/contact/verify-code", { challengeId, code });
			verificationForm.hidden = true;
			document.querySelector("#new-question").hidden = false;
			message("E-posta adresin doğrulandı. Sorun Emir'e iletildi, teşekkürler!", "success");
			questionForm.reset();
			challengeId = "";
		} catch (error) {
			message(error.message || "Kod doğrulanamadı. Lütfen tekrar dene.", "error");
		} finally {
			setBusy(button, false);
		}
	});

	document.querySelector("#edit-question").addEventListener("click", () => {
		verificationPanel.hidden = true;
		verificationForm.reset();
		questionForm.hidden = false;
		challengeId = "";
		document.querySelector("#new-question").hidden = true;
		message("Bilgilerini düzenleyebilirsin. Yeni bir kod göndereceğiz.");
		document.querySelector("#question-name").focus();
	});

	document.querySelector("#new-question").addEventListener("click", () => {
		verificationPanel.hidden = true;
		questionForm.hidden = false;
		verificationForm.reset();
		document.querySelector("#new-question").hidden = true;
		message("");
		document.querySelector("#question-name").focus();
	});

	void checkContactService();
})();
