# Emir Yılmaz Portfolyo

Portfolyo statik dosyalar ve Node.js sunucusuyla çalışır. `Bana soru sor` formu e-posta kodu doğrulaması, spam/uygunsuz içerik kontrolü ve e-posta iletimi için sunucu tarafı anahtarlar gerektirir.

## Yerelde çalıştırma

1. Node.js 20 veya üzeri kurulu olmalı.
2. `.env.example` dosyasını `.env` adıyla kopyala.
3. `.env` içindeki `OPENAI_API_KEY`, `RESEND_API_KEY` ve `RESEND_FROM_EMAIL` değerlerini kendi servis bilgilerinle doldur. `CONTACT_TO_EMAIL` varsayılan olarak portfolyo sahibinin adresidir.
4. Proje klasöründe `npm start` komutunu çalıştır.
5. Siteyi `http://localhost:3000` adresinde aç.

`index.html` dosyasını çift tıklayarak veya yalnızca statik dosya sunan bir önizlemeyle açma. Bu yöntemler API sunucusunu çalıştırmaz; soru formu çalışması için Node.js sunucusu açık olmalı ve sayfa `http://localhost:3000` üzerinden görüntülenmeli. Form, sayfa açılırken sunucu durumunu kontrol eder ve bağlantı yoksa `Failed to fetch` yerine ne yapılacağını açıklar.

`RESEND_FROM_EMAIL`, Resend hesabında doğrulanmış bir alan adını kullanmalı. Anahtarları HTML veya JavaScript dosyalarına ekleme; yalnızca sunucunun `.env` dosyasında tut. OpenAI anahtarı eksik ya da moderasyon servisi erişilemez durumdaysa form güvenli biçimde gönderimi durdurur.

## Soru formu nasıl çalışır?

1. Sunucu ad, e-posta ve soru uzunluğunu kontrol eder, istek hızını sınırlar ve soruyu OpenAI Moderation API ile inceler. Bariz küfür ve spam örüntüleri ayrıca yerel olarak engellenir.
2. Uygun görünen sorular için kullanıcıya 10 dakika geçerli, tek kullanımlık 6 haneli kod gönderilir. Kod doğrulanmadan soru sahibine e-posta gönderilmez.
3. Kod doğrulandıktan sonra soru, `CONTACT_TO_EMAIL` adresine iletilir. Gelen e-postayı yanıtlarken kullanıcının doğrulanmış adresi yanıt adresi olarak ayarlanır.

Doğrulama, kullanıcının o e-posta kutusuna erişebildiğini gösterir; kimliğini veya adresin kalıcı olacağını kanıtlamaz. Açık internet sitesinde birden fazla sunucu örneği kullanılacaksa geçici doğrulama kayıtları ve hız sınırları bellekte tutulduğu için bunlar Redis gibi ortak bir depoya taşınmalıdır.

## Servis belgeleri

- [OpenAI Moderation API](https://platform.openai.com/docs/guides/moderation)
- [Resend e-posta gönderme API'si](https://resend.com/docs/api-reference/emails/send-email)
