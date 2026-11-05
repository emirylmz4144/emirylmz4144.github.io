# Emir Yılmaz Portfolyo

Portfolyo arayüzü GitHub Pages üzerinde statik olarak yayınlanabilir. `Bana soru sor` formunun e-posta doğrulaması ve içerik denetimi için ayrıca Node.js API sunucusu gerekir. GitHub Pages `server.js` dosyasını çalıştırmadığı için API, Render Web Service üzerinde yayınlanır; form arayüzü GitHub Pages'te kalabilir.

## Soru formunu canlıya alma

1. GitHub hesabını Render'a bağla ve bu depoyu seçerek yeni bir **Blueprint** oluştur. Depodaki `render.yaml`, Node.js web service ayarlarını hazırlar.
2. Blueprint kurulumu sırasında şu üç gizli değişkeni Render'a gir:
   - `OPENAI_API_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
3. `RESEND_FROM_EMAIL`, Resend hesabında doğrulanmış bir gönderici adresi olmalı. Soru e-postaları `CONTACT_TO_EMAIL` ayarındaki adrese gider.
4. Render dağıtımı tamamlandığında servis adresini kopyala. `js/contact-config.js` dosyasındaki `PORTFOLIO_CONTACT_API_BASE` değerine bu adresi yaz. Örnek: `https://emir-yilmaz-portfolio.onrender.com`.
5. Bu dosya değişikliğini `main` dalına gönder. GitHub Pages arayüzü yeni API adresini kullanır; Render da `main` dalındaki sunucu kodunu otomatik dağıtır.

`render.yaml`, GitHub Pages adresini API çağrısı yapmaya yetkili kaynak olarak ayarlar. Siteyi özel bir alan adında yayınlarsan Render'daki `CONTACT_ALLOWED_ORIGINS` değişkenine o adresi de ekle. API anahtarlarını GitHub'a, `index.html` veya JavaScript dosyalarına koyma; yalnızca Render gizli değişkenlerinde tut.

Render'ın ücretsiz Web Service planı 15 dakika boşta kaldığında uykuya geçebilir; ilk isteğin yanıtı gecikebilir. Doğrulama oturumları şu anda sunucu belleğinde tutulduğu için sunucu yeniden başlarsa bekleyen kodlar geçersiz olur. Daha yüksek erişilebilirlik veya birden fazla sunucu örneği için doğrulama kodları ve hız limitleri ortak, kalıcı bir depoya taşınmalıdır.

## Yerelde çalıştırma

1. Node.js 20 veya üzeri kurulu olmalı.
2. `.env.example` dosyasını `.env` adıyla kopyala ve `OPENAI_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` değerlerini ekle.
3. Proje klasöründe `npm start` çalıştır.
4. `http://localhost:3000` adresini aç.

Yerelde `js/contact-config.js` boş kalır; arayüz aynı origin'deki yerel API'yi kullanır. `CONTACT_ALLOWED_ORIGINS` yerelde GitHub Pages adresini belirtir; `TRUST_PROXY` yerel geliştirmede `false` kalır.

## Form akışı

1. Sunucu ad, e-posta ve soru alanlarını doğrular, istek hızını sınırlar ve soruyu OpenAI Moderation API ile inceler. Bariz küfür ve spam örüntüleri ayrıca yerel olarak engellenir.
2. Uygun sorular için kullanıcıya 10 dakika geçerli, tek kullanımlık 6 haneli kod gönderilir. Kod doğrulanmadan soru sahibine e-posta iletilmez.
3. Kod doğrulandığında soru `CONTACT_TO_EMAIL` adresine gönderilir. Yanıt adresi, doğrulanmış kullanıcının e-posta adresi olur.

E-posta doğrulaması, kullanıcının o posta kutusuna erişebildiğini gösterir; kimliğini veya adresin kalıcı olacağını kanıtlamaz.

## Servis belgeleri

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Render Web Services](https://render.com/docs/web-services)
- [Render ortam değişkenleri](https://render.com/docs/configure-environment-variables)
- [OpenAI Moderation API](https://platform.openai.com/docs/guides/moderation)
- [Resend e-posta gönderme API'si](https://resend.com/docs/api-reference/emails/send-email)
