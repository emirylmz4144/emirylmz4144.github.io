'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = __dirname;
loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const CONTACT_TO_EMAIL = (process.env.CONTACT_TO_EMAIL || 'emiryilmaz4144@gmail.com').trim().toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODERATION_MODEL || 'omni-moderation-latest';
const CONTACT_ALLOWED_ORIGINS = new Set(
	(process.env.CONTACT_ALLOWED_ORIGINS || '')
		.split(',')
		.map((origin) => {
			try {
				return new URL(origin.trim()).origin;
			} catch {
				return '';
			}
		})
		.filter(Boolean),
);
const MAX_BODY_BYTES = 12 * 1024;
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const challenges = new Map();
const rateLimits = new Map();

function loadEnvFile() {
	const envPath = path.join(ROOT, '.env');
	if (!fs.existsSync(envPath)) return;

	for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separator = trimmed.indexOf('=');
		if (separator < 1) continue;

		const key = trimmed.slice(0, separator).trim();
		let value = trimmed.slice(separator + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		if (!Object.hasOwn(process.env, key)) process.env[key] = value;
	}
}

class HttpError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

function sendJson(response, status, payload) {
	response.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store',
		'X-Content-Type-Options': 'nosniff',
	});
	response.end(JSON.stringify(payload));
}

function setSecurityHeaders(response) {
	const connectSources = ["'self'", ...CONTACT_ALLOWED_ORIGINS].join(' ');
	response.setHeader('X-Content-Type-Options', 'nosniff');
	response.setHeader('X-Frame-Options', 'DENY');
	response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.setHeader(
		'Content-Security-Policy',
		`default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src ${connectSources}`,
	);
}

function ensureAllowedOrigin(request) {
	const origin = request.headers.origin;
	if (!origin) return;

	let parsedOrigin;
	try {
		parsedOrigin = new URL(origin);
	} catch {
		throw new HttpError(403, 'Bu istek kabul edilmedi.');
	}

	const trustProxy = String(process.env.TRUST_PROXY).toLowerCase() === 'true';
	const forwardedProtocol = trustProxy && typeof request.headers['x-forwarded-proto'] === 'string'
		? request.headers['x-forwarded-proto'].split(',')[0].trim()
		: '';
	const protocol = forwardedProtocol || (request.socket.encrypted ? 'https' : 'http');
	const expectedOrigin = request.headers.host ? `${protocol}://${request.headers.host}` : '';
	const normalizedOrigin = parsedOrigin.origin.toLowerCase();
	if (normalizedOrigin !== expectedOrigin.toLowerCase() && !CONTACT_ALLOWED_ORIGINS.has(normalizedOrigin)) {
		throw new HttpError(403, 'Bu istek kabul edilmedi.');
	}
}

function setCorsHeaders(request, response) {
	const origin = request.headers.origin;
	if (!origin) return;
	const normalizedOrigin = new URL(origin).origin;
	response.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
	response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
	response.setHeader('Access-Control-Max-Age', '600');
	response.setHeader('Vary', 'Origin');
}

async function readJson(request) {
	const contentType = String(request.headers['content-type'] || '').toLowerCase();
	if (!contentType.startsWith('application/json')) {
		throw new HttpError(415, 'Bu istek kabul edilmedi.');
	}

	const chunks = [];
	let size = 0;
	for await (const chunk of request) {
		size += chunk.length;
		if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Gönderilen içerik çok uzun.');
		chunks.push(chunk);
	}

	let data;
	try {
		data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} catch {
		throw new HttpError(400, 'Form bilgileri okunamadı. Lütfen tekrar dene.');
	}

	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		throw new HttpError(400, 'Form bilgileri okunamadı. Lütfen tekrar dene.');
	}
	return data;
}

function cleanName(value) {
	if (typeof value !== 'string') return '';
	return value.trim().replace(/\s+/gu, ' ');
}

function cleanEmail(value) {
	if (typeof value !== 'string') return '';
	return value.trim().toLowerCase();
}

function cleanQuestion(value) {
	if (typeof value !== 'string') return '';
	return value.replace(/\r\n?/gu, '\n').trim();
}

function validateContact(name, email, question) {
	const validName = /^[\p{L}\p{M} .'-]{2,80}$/u.test(name);
	const validEmail = email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email);
	if (!validName) throw new HttpError(400, 'Adını ve soyadını kontrol edip tekrar dene.');
	if (!validEmail) throw new HttpError(400, 'Geçerli bir e-posta adresi yaz.');
	if (question.length < 10 || question.length > 2000) {
		throw new HttpError(400, 'Sorun 10 ile 2000 karakter arasında olmalı.');
	}
}

function normalizeForModeration(value) {
	return value
		.toLocaleLowerCase('tr-TR')
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.replace(/ı/gu, 'i')
		.replace(/[^a-z0-9\s]/gu, ' ')
		.replace(/\s+/gu, ' ')
		.trim();
}

const blockedWords = new Set([
	'amk', 'aq', 'amina', 'aminakoyim', 'anan', 'ananin', 'anasini', 'siker', 'sikerim', 'sikeyim', 'sikim', 'siktir', 'siktirdim', 'siktirdin', 'siktim',
	'oruspu', 'orospu', 'pic', 'yarrak', 'yarak', 'kahpe', 'ibne', 'fuck', 'fucking', 'motherfucker',
	'shit', 'bullshit', 'bitch', 'asshole', 'bastard', 'cunt',
]);

function containsProfanity(question) {
	const words = question.split(/\s+/u).map((part) => normalizeForModeration(part).replace(/\s/gu, ''));
	return words.some((word) => blockedWords.has(word));
}

function looksLikeSpam(question) {
	const urls = question.match(/(?:https?:\/\/|www\.)/giu) || [];
	if (urls.length > 2) return true;
	if (/(.)\1{10,}/u.test(question)) return true;

	const normalized = normalizeForModeration(question);
	const words = normalized.split(' ').filter(Boolean);
	if (!/[\p{L}]{3,}/u.test(normalized)) return true;
	if (words.length >= 24 && new Set(words).size / words.length < 0.28) return true;
	if (/(?:takipçi satın al|garantili kazanç|ücretsiz kripto|online casino|para kazanma fırsatı|yatırım fırsatı|whatsapp.?tan yaz)/u.test(normalized)) {
		return true;
	}
	return false;
}

function contactServicesReady() {
	const openAiKey = process.env.OPENAI_API_KEY || '';
	const resendKey = process.env.RESEND_API_KEY || '';
	const fromEmail = process.env.RESEND_FROM_EMAIL || '';
	return Boolean(
		openAiKey && !openAiKey.startsWith('your-')
		&& resendKey && !resendKey.startsWith('your-')
		&& fromEmail && !fromEmail.includes('your-verified-domain.com')
		&& CONTACT_TO_EMAIL,
	);
}

function requireConfiguredServices() {
	if (!contactServicesReady()) {
		throw new HttpError(503, 'Soru gönderme sistemi henüz etkin değil. Bana e-posta üzerinden ulaşabilirsin.');
	}
	if (/[\r\n]/u.test(process.env.RESEND_FROM_EMAIL)) {
		throw new HttpError(503, 'Soru gönderme sistemi şu anda kullanılamıyor.');
	}
}

async function moderateQuestion(question) {
	let response;
	try {
		response = await fetch('https://api.openai.com/v1/moderations', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ model: OPENAI_MODEL, input: question }),
			signal: AbortSignal.timeout(10000),
		});
	} catch {
		throw new HttpError(503, 'İçerik kontrolü şu anda yapılamıyor. Biraz sonra tekrar dene.');
	}

	if (!response.ok) {
		throw new HttpError(503, 'İçerik kontrolü şu anda yapılamıyor. Biraz sonra tekrar dene.');
	}

	let result;
	try {
		result = await response.json();
	} catch {
		throw new HttpError(503, 'İçerik kontrolü şu anda yapılamıyor. Biraz sonra tekrar dene.');
	}

	if (typeof result?.results?.[0]?.flagged !== 'boolean') {
		throw new HttpError(503, 'İçerik kontrolü şu anda yapılamıyor. Biraz sonra tekrar dene.');
	}
	return result.results[0].flagged;
}

async function sendEmail({ to, subject, text, replyTo, idempotencyKey }) {
	let response;
	try {
		response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
				'Content-Type': 'application/json',
				'Idempotency-Key': idempotencyKey,
			},
			body: JSON.stringify({
				from: process.env.RESEND_FROM_EMAIL,
				to: [to],
				subject,
				text,
				...(replyTo ? { reply_to: replyTo } : {}),
			}),
			signal: AbortSignal.timeout(15000),
		});
	} catch {
		throw new HttpError(502, 'E-posta gönderilemedi. Biraz sonra tekrar dene.');
	}

	if (!response.ok) {
		throw new HttpError(502, 'E-posta gönderilemedi. Biraz sonra tekrar dene.');
	}
}

function clientIp(request) {
	if (String(process.env.TRUST_PROXY).toLowerCase() === 'true') {
		const forwarded = request.headers['x-forwarded-for'];
		if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
	}
	return request.socket.remoteAddress || 'unknown';
}

function consumeRateLimit(key, limit, windowMs) {
	const now = Date.now();
	const entry = rateLimits.get(key);
	if (!entry || entry.resetAt <= now) {
		rateLimits.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	if (entry.count >= limit) return false;
	entry.count += 1;
	return true;
}

function removeExpiredChallenges() {
	const now = Date.now();
	for (const [id, challenge] of challenges) {
		if (challenge.expiresAt <= now) challenges.delete(id);
	}
	for (const [key, entry] of rateLimits) {
		if (entry.resetAt <= now) rateLimits.delete(key);
	}
}

function codeHash(challengeId, code) {
	return crypto.createHash('sha256').update(`${challengeId}:${code}`).digest();
}

function safeHashEqual(expected, actual) {
	const expectedBuffer = Buffer.from(expected);
	const actualBuffer = Buffer.from(actual);
	return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function checkSameSiteAndMethod(request) {
	if (request.method !== 'POST') throw new HttpError(405, 'Bu işlem desteklenmiyor.');
	ensureAllowedOrigin(request);
}

async function requestVerificationCode(request, response) {
	checkSameSiteAndMethod(request);
	requireConfiguredServices();
	const body = await readJson(request);
	if (typeof body.website === 'string' && body.website.trim()) {
		throw new HttpError(422, 'Soru spam içerik olarak algılandığı için gönderilemedi.');
	}

	const name = cleanName(body.name);
	const email = cleanEmail(body.email);
	const question = cleanQuestion(body.question);
	validateContact(name, email, question);

	const ip = clientIp(request);
	if (!consumeRateLimit(`request-ip:${ip}`, 5, 60 * 60 * 1000)
		|| !consumeRateLimit(`request-email:${email}`, 3, 60 * 60 * 1000)) {
		throw new HttpError(429, 'Çok fazla kod isteği gönderildi. Bir saat sonra tekrar dene.');
	}

	const flagged = await moderateQuestion(question);
	if (flagged || containsProfanity(question) || looksLikeSpam(question)) {
		throw new HttpError(422, 'Sorun uygunsuz dil veya spam içerdiği için gönderilemedi.');
	}

	removeExpiredChallenges();
	for (const [id, previous] of challenges) {
		if (previous.email === email) challenges.delete(id);
	}

	const challengeId = crypto.randomUUID();
	const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
	const challenge = {
		id: challengeId,
		name,
		email,
		question,
		codeHash: codeHash(challengeId, code),
		attempts: 0,
		expiresAt: Date.now() + CHALLENGE_TTL_MS,
		sending: false,
	};
	challenges.set(challengeId, challenge);

	try {
		await sendEmail({
			to: email,
			subject: 'Portfolyo soru formu — e-posta doğrulama kodu',
			text: `Merhaba ${name},\n\nPortfolyo üzerinden soru göndermek için e-posta adresini doğrula.\n\nDoğrulama kodun: ${code}\n\nKod 10 dakika içinde geçerliliğini yitirir. Bu isteği sen başlatmadıysan bu e-postayı yok sayabilirsin.`,
			idempotencyKey: `portfolio-verification/${challengeId}`,
		});
	} catch (error) {
		challenges.delete(challengeId);
		throw error;
	}

	sendJson(response, 200, { challengeId, email, expiresInSeconds: CHALLENGE_TTL_MS / 1000 });
}

async function verifyEmailAndSendQuestion(request, response) {
	checkSameSiteAndMethod(request);
	requireConfiguredServices();
	const body = await readJson(request);
	const challengeId = typeof body.challengeId === 'string' ? body.challengeId : '';
	const code = typeof body.code === 'string' ? body.code.trim() : '';
	if (!/^[0-9a-f-]{36}$/iu.test(challengeId) || !/^\d{6}$/u.test(code)) {
		throw new HttpError(400, 'Doğrulama kodunu kontrol edip tekrar dene.');
	}

	const ip = clientIp(request);
	if (!consumeRateLimit(`verify-ip:${ip}`, 30, 15 * 60 * 1000)) {
		throw new HttpError(429, 'Çok fazla kod denemesi yapıldı. Biraz sonra tekrar dene.');
	}

	removeExpiredChallenges();
	const challenge = challenges.get(challengeId);
	if (!challenge) {
		throw new HttpError(410, 'Doğrulama kodunun süresi doldu. Bilgilerini yeniden gönder.');
	}
	if (challenge.sending) throw new HttpError(409, 'Sorun şu anda iletiliyor. Lütfen bekle.');

	challenge.attempts += 1;
	if (challenge.attempts > 5) {
		challenges.delete(challengeId);
		throw new HttpError(429, 'Çok fazla hatalı kod girildi. Yeni bir doğrulama kodu iste.');
	}

	const submittedHash = codeHash(challengeId, code);
	if (!safeHashEqual(challenge.codeHash, submittedHash)) {
		throw new HttpError(400, 'Kod eşleşmedi. E-postandaki 6 haneli kodu kontrol et.');
	}

	challenge.sending = true;
	try {
		await sendEmail({
			to: CONTACT_TO_EMAIL,
			replyTo: challenge.email,
			subject: `Portfolyo üzerinden yeni soru — ${challenge.name}`,
			text: `Yeni bir soru geldi.\n\nAd Soyad: ${challenge.name}\nE-posta: ${challenge.email}\n\nSoru:\n${challenge.question}\n`,
			idempotencyKey: `portfolio-question/${challenge.id}`,
		});
		challenges.delete(challengeId);
		sendJson(response, 200, { message: 'E-posta doğrulandı ve soru iletildi.' });
	} catch (error) {
		challenge.sending = false;
		throw error;
	}
}

function publicFilePath(urlPath) {
	let decodedPath;
	try {
		decodedPath = decodeURIComponent(urlPath);
	} catch {
		return null;
	}
	if (decodedPath.includes('\\') || decodedPath.includes('\0')) return null;
	if (decodedPath === '/' || decodedPath === '/index.html') return path.join(ROOT, 'index.html');

	const parts = decodedPath.split('/').filter(Boolean);
	if (!parts.length || parts.some((part) => part === '.' || part === '..' || part.startsWith('.'))) return null;
	if (!['css', 'js', 'images'].includes(parts[0])) return null;
	return path.join(ROOT, ...parts);
}

const contentTypes = {
	'.css': 'text/css; charset=utf-8',
	'.gif': 'image/gif',
	'.html': 'text/html; charset=utf-8',
	'.jpeg': 'image/jpeg',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript; charset=utf-8',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
};

async function serveStatic(request, response, urlPath) {
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		response.writeHead(405, { Allow: 'GET, HEAD' });
		response.end('Method not allowed');
		return;
	}

	const filePath = publicFilePath(urlPath);
	if (!filePath) {
		response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
		response.end('Not found');
		return;
	}

	let file;
	try {
		file = await fs.promises.readFile(filePath);
	} catch {
		response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
		response.end('Not found');
		return;
	}

	const extension = path.extname(filePath).toLowerCase();
	response.writeHead(200, {
		'Content-Type': contentTypes[extension] || 'application/octet-stream',
		'Cache-Control': ['.html', '.css', '.js'].includes(extension) ? 'no-cache' : 'public, max-age=3600',
		'Content-Length': file.length,
	});
	response.end(request.method === 'HEAD' ? undefined : file);
}

async function handleRequest(request, response) {
	setSecurityHeaders(response);
	const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
	try {
		if (url.pathname.startsWith('/api/')) {
			ensureAllowedOrigin(request);
			setCorsHeaders(request, response);
			if (request.method === 'OPTIONS') {
				response.writeHead(204, { 'Cache-Control': 'no-store' });
				response.end();
				return;
			}
		}

		if (url.pathname === '/api/contact/status') {
			if (request.method !== 'GET') throw new HttpError(405, 'Bu işlem desteklenmiyor.');
			sendJson(response, 200, { configured: contactServicesReady() });
			return;
		}
		if (url.pathname === '/api/contact/request-code') {
			await requestVerificationCode(request, response);
			return;
		}
		if (url.pathname === '/api/contact/verify-code') {
			await verifyEmailAndSendQuestion(request, response);
			return;
		}
		if (url.pathname.startsWith('/api/')) {
			sendJson(response, 404, { message: 'İstenen işlem bulunamadı.' });
			return;
		}
		await serveStatic(request, response, url.pathname);
	} catch (error) {
		const status = error instanceof HttpError ? error.status : 500;
		const message = error instanceof HttpError ? error.message : 'İşlem tamamlanamadı. Lütfen daha sonra tekrar dene.';
		if (!(error instanceof HttpError)) console.error('İstek işlenemedi.');
		if (!response.headersSent) sendJson(response, status, { message });
		else response.destroy();
	}
}

const server = http.createServer((request, response) => {
	void handleRequest(request, response);
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Portfolyo sunucusu http://localhost:${PORT} adresinde hazır.`);
});

const cleanupTimer = setInterval(removeExpiredChallenges, 60 * 1000);
cleanupTimer.unref();

server.on('error', (error) => {
	if (error.code === 'EADDRINUSE') {
		console.error(`Port ${PORT} kullanımda. PORT değişkeniyle başka bir port seçebilirsin.`);
		process.exitCode = 1;
		return;
	}
	console.error('Sunucu başlatılamadı.');
	process.exitCode = 1;
});
