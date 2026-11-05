# Emir Yılmaz Portfolyo

GitHub Pages siteyi statik olarak yayınlar; `Bana soru sor` formunun API'si Render Free üzerinde çalışan Node.js sunucusunu kullanır. Sunucu e-postaları Gmail'e SMTP ile değil, HTTPS üzerinden EmailJS aracılığıyla gönderir. Bu yöntem Render Free ile uyumludur ve alan adı gerektirmez. EmailJS'in ücretsiz planı ayda 200 gönderim isteği içerir; soru formu başarılı bir gönderimde iki e-posta kullandığından yaklaşık 100 soru için yeterlidir.

## Ücretsiz kurulum

1. [EmailJS](https://www.emailjs.com/) hesabı oluştur, **Email Services** bölümünden Gmail hesabını bağla ve test e-postası gönder. Alan adı eklemen gerekmez.
2. EmailJS'te iki e-posta şablonu oluştur. Her ikisinin **To Email** alanı `{{to_email}}`, **Reply To** alanı `{{reply_to}}` olsun.
   - **Doğrulama şablonu:** Subject `E-posta doğrulama kodu`; içerikte `{{name}}` ve `{{code}}` alanlarını kullan.
   - **Soru şablonu:** Subject `Portfolyo üzerinden yeni soru — {{name}}`; içerikte `{{name}}`, `{{email}}` ve `{{question}}` alanlarını kullan.
3. EmailJS **Account → Security** bölümünden API isteklerinde private key kullanımını aç ve Public Key, Private Key, Service ID ile iki şablonun ID'sini not et.
4. [OpenAI API anahtarı](https://platform.openai.com/api-keys) oluştur. Soru moderasyon uç noktası ücretsizdir.
5. GitHub deposundaki `render.yaml` ile Render'da **Blueprint** oluştur veya **New Web Service** seç. `main` dalını, `npm install` build komutunu ve `npm start` start komutunu kullan. Compute plan olarak özellikle **Free** seç; 7 dolarlık Starter planı gerekli değil.
6. Render servisinin Environment bölümüne `OPENAI_API_KEY`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_VERIFICATION_TEMPLATE_ID` ve `EMAILJS_QUESTION_TEMPLATE_ID` değerlerini ekle. Diğer ayarlar `render.yaml` içinde tanımlıdır.
7. Dağıtım bitince Render servis adresini `js/contact-config.js` içindeki `PORTFOLIO_CONTACT_API_BASE` alanına yaz ve değişikliği GitHub `main` dalına gönder.

Gizli anahtarları yalnızca Render Environment alanına yaz; repoya veya sohbete ekleme. Render Free 15 dakika istek almazsa uyur ve ilk istek yaklaşık bir dakika gecikebilir. Free hizmetlerin dış SMTP portları kapalıdır; bu uygulama e-postayı EmailJS'in HTTPS API'si üzerinden gönderir.

## Yerelde çalıştırma

1. Node.js 20 veya üzerini kur.
2. `.env.example` dosyasını `.env` adıyla kopyalayıp `OPENAI_API_KEY` ve EmailJS değişkenlerini doldur.
3. Proje klasöründe `npm install` ve `npm start` çalıştır.
4. `http://localhost:3000` adresini aç.

Yerelde `js/contact-config.js` boş kalır; arayüz aynı origin'deki API'yi kullanır. `.env` dosyası Git tarafından yok sayılır.

## Form akışı

1. Sunucu ad, e-posta ve soru alanlarını doğrular, istek hızını sınırlar ve soruyu OpenAI Moderation API ile inceler. Bariz küfür ve spam örüntüleri ayrıca yerel olarak engellenir.
2. Uygun sorular için kullanıcıya 10 dakika geçerli, tek kullanımlık 6 haneli kod gönderilir.
3. Kod doğrulanınca soru `CONTACT_TO_EMAIL` adresine gönderilir; yanıt adresi doğrulanmış kullanıcının e-postası olur.

## Belgeler

- [Render Free hizmetleri](https://render.com/docs/free)
- [Render Blueprint kurulumu](https://render.com/docs/infrastructure-as-code)
- [Render ortam değişkenleri](https://render.com/docs/configure-environment-variables)
- [EmailJS Gmail bağlantısı](https://www.emailjs.com/docs/tutorial/adding-email-service/)
- [EmailJS REST API](https://www.emailjs.com/docs/rest-api/send/)
- [EmailJS fiyatlandırması](https://www.emailjs.com/pricing/)
- [OpenAI Moderation API](https://developers.openai.com/api/docs/guides/moderation)
