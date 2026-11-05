# Emir Yılmaz Portfolyo

GitHub Pages siteyi statik olarak yayınlar; `Bana soru sor` formunun API'si ayrıca Render üzerinde çalışan Node.js sunucusunu kullanır. E-posta doğrulama kodları ve sorular, sahibinin Gmail hesabından SMTP ile gönderilir. Soru metni istenmeyen içerik için OpenAI Moderation API ile kontrol edilir.

## Soru formunu canlıya alma

1. Google hesabında 2 Adımlı Doğrulamayı etkinleştir. Google Hesabı → Güvenlik → Uygulama şifreleri bölümünden bu uygulama için bir uygulama şifresi oluştur. Normal Google hesap şifreni kullanma. Uygulama şifreleri için 2 Adımlı Doğrulama gerekir ve bazı hesap türlerinde bu seçenek görünmeyebilir.
2. [OpenAI API anahtarını](https://platform.openai.com/api-keys) oluştur. Kullanılan moderasyon uç noktası OpenAI tarafından ücretsiz sunulur.
3. GitHub hesabını Render'a bağla ve depodaki `render.yaml` ile bir **Blueprint** oluştur. `main` dalını seç.
4. Render Blueprint kurulumunda şu iki gizli değişkene değer gir:
   - `OPENAI_API_KEY`: OpenAI'den oluşturduğun API anahtarı.
   - `SMTP_APP_PASSWORD`: Google'dan oluşturduğun 16 karakterli uygulama şifresi. Boşluklu gösterilirse boşlukları da yazabilirsin; sunucu temizler.
5. Render dağıtımı tamamlanınca servis adresini kopyala. `js/contact-config.js` dosyasındaki `PORTFOLIO_CONTACT_API_BASE` değerine ekle. Örnek: `https://emir-yilmaz-portfolio.onrender.com`.
6. Dosyayı GitHub `main` dalına gönder. GitHub Pages siteyi, Render da API sunucusunu dağıtır.

`SMTP_USER` ve `CONTACT_TO_EMAIL`, `emiryilmaz4144@gmail.com` olarak ayarlıdır. Doğrulama kodu bu Gmail hesabından soru soran kişiye gönderilir; doğrulanmış soru aynı hesaba iletilir. Gizli değerleri yalnızca Render'ın Environment alanına gir, repoya veya sohbete ekleme. Render kurulum ekranı gizli değişkenleri sormazsa servis içinden **Environment → Add Environment Variable** bölümüne ekleyip yeniden dağıt.

Ücretsiz Render servisi boşta kaldığında uykuya geçebilir ve ilk istekte gecikme yaşanabilir. Gmail, alışılmadık sunucu girişlerini güvenlik nedeniyle engelleyebilir; böyle bir durumda Google Hesabı güvenlik bildirimlerini kontrol et. Gmail SMTP düşük hacimli kişisel kullanım içindir.

## Yerelde çalıştırma

1. Node.js 20 veya üzeri kurulu olmalı.
2. `.env.example` dosyasını `.env` adıyla kopyala. `OPENAI_API_KEY` ve `SMTP_APP_PASSWORD` değerlerini ekle.
3. Proje klasöründe `npm install` ve ardından `npm start` çalıştır.
4. `http://localhost:3000` adresini aç.

Yerelde `js/contact-config.js` boş kalır; arayüz aynı origin'deki yerel API'yi kullanır. `.env` dosyası Git tarafından yok sayılır; anahtarları kaynak dosyalarına koyma.

## Form akışı

1. Sunucu ad, e-posta ve soru alanlarını doğrular, istek hızını sınırlar ve soruyu OpenAI Moderation API ile inceler. Bariz küfür ve spam örüntüleri ayrıca yerel olarak engellenir.
2. Uygun sorular için kullanıcıya 10 dakika geçerli, tek kullanımlık 6 haneli kod gönderilir.
3. E-posta kodu doğrulanınca soru `CONTACT_TO_EMAIL` adresine gönderilir. Yanıt adresi, doğrulanmış kullanıcının e-postası olur.

## Belgeler

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Render Blueprint kurulumu](https://render.com/docs/infrastructure-as-code)
- [Render gizli ortam değişkenleri](https://render.com/docs/configure-environment-variables)
- [Google uygulama şifreleri](https://support.google.com/accounts/answer/185833)
- [Nodemailer ile Gmail](https://nodemailer.com/guides/using-gmail)
- [OpenAI Moderation API](https://developers.openai.com/api/docs/guides/moderation)
