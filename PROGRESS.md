# PsikoTarama-Simülasyon — İlerleme Kaydı

Bu dosya, projenin nerede kaldığını takip etmek için kullanılır. Yeni bir oturuma
başlarken önce bu dosyayı oku, kaldığımız yerden devam et.

## Proje Tanımı

Klinik psikoloji tanı simülasyonu — SPA (Single Page Application).
**Teknoloji kısıtı:** Sadece HTML, CSS, Vanilla JS (ES6) ve statik JSON.
Veritabanı, Node.js, React veya başka bir framework KULLANILMAYACAK.

## Klasör Yapısı (mevcut durum)

```
/index.html
/css/style.css
/js/GameEngine.js     -> ClinicalEngine sınıfı
/js/app.js             -> DOM bağlama / render mantığı
/data/patients.json     -> RootDiagnosis / Distractors / Questions / Tests
/PROGRESS.md            -> bu dosya
```

## Durum: AŞAMA 1 TAMAMLANDI ✅ (2026-07-01)

İlk iskelet ve oynanabilir temel döngü kuruldu ve uçtan uca doğrulandı.

### Tamamlananlar

1. **Klasör/dosya iskeleti** oluşturuldu (index.html, css/, js/, data/).
2. **data/patients.json** tasarlandı:
   - `patientNames`: 12 isim
   - `rootDiagnosis`: 4 tanı (MDD, Bipolar I, GAD, Panik Bozukluk), her biri 6-8
     DSM-5 benzeri kriter (symptomPool) içeriyor
   - `distractors`: 5 dikkat dağıtıcı unsur (somatik şikayetler, inkâr, aile
     stresi, madde kullanımı ima)
   - `questions`: ~30 diyalog sorusu, her biri `targetSymptom`, `timeCost`,
     `rapportEffect`, `sensitive`, `truthfulResponse`, `deceptiveResponse`,
     `absentResponse` alanlarına sahip
   - `tests`: 4 psikometrik test (BDI, YMRS, GAD-7, PDSS) — yalan söylemeyi
     by-pass eder, daha fazla zaman maliyeti karşılığında gerçek veriyi açığa
     çıkarır
   - Tüm metinler Türkçe.
3. **js/GameEngine.js** — `ClinicalEngine` ES6 sınıfı:
   - `generateCase()`: 1 RootDiagnosis + 1 Distractor rastgele kombinasyonu,
     state reset
   - `askQuestion(id)`: süre düşürme (varsayılan 5 dk), rapport güncelleme,
     rapport düşükse + soru "sensitive" ise hastanın yalan söyleme ihtimali
   - `runTest(id)`: psikometrik test, 10 dk maliyet, gerçek semptom oranını
     yüzde olarak açığa çıkarır (Düşük/Orta/Yüksek)
   - `toggleNotepad(id)` / `getAllCriteria()`: tanı not defteri durumu
   - `submitDiagnosis(id)`: doğru tanı + precision/recall bazlı puanlama
     (toplam 100 puan: %60 doğru tanı, %40 kriter isabeti)
   - Zaman 0'a inince `gameOver=true` (soru/test butonları kilitlenir, ama
     tanı koyma paneli açık kalır)
4. **js/app.js** — motoru DOM'a bağlıyor:
   - `fetch('data/patients.json')` ile veri yükleme
   - Sol panel: hasta kartı, test butonları, test sonuçları
   - Orta panel: diyalog log'u + soru butonları (grid)
   - Sağ panel: DSM-5 kriter checkbox listesi (tanıya göre gruplu) + tanı
     radio seçimi + "Tanıyı Onayla"
   - Üst bar: kalan süre, rapport bar, "Yeni Vaka Başlat"
   - Sonuç overlay'i: doğru/yanlış tanı, precision/recall, puan
5. **css/style.css** — koyu "Slate + Teal" klinik tema:
   - 3 sütunlu grid layout (sidebar / interview / notepad)
   - CSS custom properties ile renk paleti
   - Responsive fallback (tek sütun, <1000px)

### Doğrulama (headless Chrome + CDP ile uçtan uca test edildi)

Akışın tamamı simüle edildi: vaka başlatma → 2 soru sorma → 1 test uygulama →
1 kriter işaretleme → tanı onaylama → sonuç ekranı. Süre/rapport hesaplamaları
doğru, UI tüm panellerde doğru render ediliyor. Ekran görüntüleri ile
görsel olarak da teyit edildi (koyu slate+teal tema, 3 panel düzeni planlandığı
gibi çalışıyor).

## Durum: AŞAMA 2 TAMAMLANDI ✅ (2026-07-01)

Proje analiz edilip AŞAMA 1'in "bilinen sınırlamalar" listesinden dört madde
uygulandı, ayrıca bir veri eksikliği (bug) düzeltildi.

### Tamamlananlar

1. **Eksik distractor soruları düzeltildi (veri hatası).** `data/patients.json`
   içinde `nausea`, `minimization`, `financial_stress`, `dizziness`,
   `sleep_hygiene` semptomlarının hiç sorusu yoktu — bu yüzden bu semptomlar
   oyunda hiçbir zaman diyalogda ortaya çıkamıyordu. 5 yeni soru eklendi
   (`q_nausea`, `q_minimization`, `q_financial`, `q_dizziness`,
   `q_sleep_hygiene`); toplam soru sayısı 30 → 36.
2. **Süre doldu banner'ı.** `gameOver && !diagnosisSubmitted` durumunda
   görüşme panelinin üstünde kırmızı, nabız gibi yanıp sönen bir uyarı
   banner'ı beliriyor ("Süre doldu! ... tanınızı koyun"). `index.html`'e
   `#time-up-banner`, `style.css`'e `.time-up-banner` + `banner-pulse`
   animasyonu, `app.js`'e `renderTimeUpBanner()` eklendi (her `renderVitals()`
   çağrısında tetikleniyor).
3. **Vaka geçmişi (localStorage).** Sol panelde "Vaka Geçmişi" bölümü
   eklendi; her tanı onayından sonra `{date, diagnosisCorrect, score,
   correctDiagnosisLabel, chosenDiagnosisLabel}` `localStorage`'a
   (`psikotarama_case_history` anahtarı, en fazla son 10 vaka) kaydediliyor
   ve liste halinde gösteriliyor (doğru/yanlış renk kodlu).
4. **Hasta avatarı.** Hasta kartına isimden türetilen baş harfli, teal
   gradyan arka planlı dairesel bir avatar eklendi (`getInitials()`,
   `.patient-avatar`).
5. **Kritik bug düzeltildi: `start-overlay` hiç gizlenmiyordu.**
   `loadData()` veriyi başarıyla çektikten sonra sadece
   `btnNewCase.disabled = false` yapıyordu ama `#start-overlay`'i
   (`position:fixed; inset:0; z-index:50`) hiç gizlemiyordu — bu da
   "Yeni Vaka Başlat" düğmesinin (topbar'da, overlay'in altında kalan)
   tıklanamaz olmasına yol açıyordu. Uygulama gerçek bir tarayıcıda/
   kullanıcı tıklamasıyla test edilene kadar fark edilmemişti. Playwright
   ile gerçek `click()` denemesi bunu ortaya çıkardı. `loadData()` içine
   başarı durumunda `hide(els.startOverlay)` eklendi.

### Doğrulama

Yerel sunucu üzerinden tarayıcıda uçtan uca test edildi: yeni sorular
diyalogda göründü, süre 0'a indiğinde banner belirdi, tanı onaylandıktan
sonra geçmiş listesine satır eklendi, avatar baş harfleri doğru render
edildi.

## Durum: AŞAMA 3 TAMAMLANDI ✅ (2026-07-01)

Kullanıcı isteği: tanı çeşitliliğini artır, vakalar biraz daha "hikayeli"
olsun. Tanı sayısı 4 → 6'ya çıkarıldı ve her vakaya bağlamsal bir "vaka notu"
eklendi.

### Tamamlananlar

1. **2 yeni tanı eklendi:**
   - **Obsesif Kompulsif Bozukluk (OKB)** — 7 semptom (obsesyonlar,
     kompulsiyonlar, kirlenme korkusu, kontrol etme, simetri ihtiyacı,
     zaman kaybı, içgörü sıkıntısı) + Y-BOCS testi.
   - **Travma Sonrası Stres Bozukluğu (TSSB)** — 7 semptom (flashback,
     kâbuslar, kaçınma, olumsuz biliş, aşırı tetikte olma, irkilme,
     duygusal hissizleşme) + PCL-5 testi.
   - Her iki tanı için 7'şer yeni diyalog sorusu eklendi (toplam 14).
   - Not: UI tarafı (tanı seçenekleri, kriter listesi, test butonları)
     zaten `gameData` üzerinden dinamik render edildiği için yeni
     tanılar otomatik olarak tüm panellerde göründü, ek kod
     gerekmedi — bu, `getAllCriteria()` / `renderDiagnosisOptions()` /
     `renderTests()`'in veri-güdümlü tasarımının bir kazanımı.
2. **Vaka notu (caseBrief) — hikaye katmanı.** Her yeni vakada artık
   hastanın adı + yaşı + rastgele seçilen bir mesleği (`occupations`
   havuzu, 10 meslek) + **distractor'a bağlı bir "sevk nedeni"**
   (`referralReason`) birleştirilerek anlatı tadında bir vaka notu
   oluşturuluyor (`GameEngine.js` → `generateCase()`). Bu metin sol
   panelde hasta kartının altında italik bir alıntı kutusunda
   gösteriliyor (`#case-brief`). **Önemli:** `referralReason` sadece
   distractor'dan geliyor, gerçek tanıdan asla — yoksa oyun spoiler
   verirdi.
3. **Veri eksiklikleri düzeltildi:** `distractibility` (Bipolar I)
   semptomunun de hiç sorusu yokmuş (AŞAMA 2'de bulunan diğer 5 tanesi
   gibi); `q_distractibility` eklendi. Toplam soru sayısı 36 → 51.

### Doğrulama

Yerel sunucu üzerinden Playwright ile uçtan uca test edildi: yeni
tanılar (OKB/TSSB) tanı seçeneklerinde ve not defteri kriterlerinde
göründü, yeni testler (Y-BOCS, PCL-5) çalıştırılabildi, vaka notu her
yeni vakada değişen içerikle render edildi, konsolda hata yok.

## Durum: AŞAMA 4 TAMAMLANDI ✅ (2026-07-01)

Kullanıcı isteği: tanı koyduktan sonra doğruysa "sonraki adımlar / gelişim
önerileri" gösterilsin; yanlışsa hatalar, odaklanılması gereken noktalar ve
öneriler sunulsun. Sonuç ekranı buna göre genişletildi.

### Tamamlananlar

1. **`nextSteps` alanı.** Her 6 rootDiagnosis'e kısa, klinik tarzda bir
   "sonraki adımlar" metni eklendi (ör. MDD için BDT/farmakoterapi ve
   intihar riski takibi notu).
2. **`GameEngine.js` → `_buildFeedback()`.** `submitDiagnosis()` artık
   `finalResult.feedback` alanında zengin bir geri bildirim objesi
   döndürüyor:
   - **Doğru tanıda:** `nextSteps` (tanıya özel klinik öneri),
     `growthTips` (hiç sorulmamış kriterler / sorulup işaretlenmemiş
     kriterler / gereksiz işaretlenen kriterler varsa), `rapportNote`
     (görüşmede hasta yalan söylemiş olabilirse uyarı).
   - **Yanlış tanıda:** `neverAsked` (asıl tanının hiç sorulmamış
     kriterleri — "odaklanmanız gereken noktalar"), `askedNotMarked`
     (soruldu ama not defterine işaretlenmedi), `falsePositiveCriteria`
     (yanlışlıkla işaretlenen kriterler + hangi tanıya ait oldukları),
     `confusedWithLabel` (yanlış işaretlerin en çok ait olduğu tanı —
     "muhtemelen X ile karıştırdınız" ipucu), `distractorLabel`,
     `rapportNote`.
   - Yeni `_wasSymptomAsked()` yardımcı metodu, bir kriterin hiç
     sorulup sorulmadığını (`askedQuestionIds`) kontrol ediyor.
3. **Sonuç ekranı UI'sı genişletildi** (`app.js` → `renderFeedback()`):
   doğru tanıda yeşil çerçeveli "Sonraki Adımlar" kutusu, yanlış tanıda
   kırmızı çerçeveli "Hata Analizi" kutusu (kaçırılan kriterler, yanlış
   işaretlenenler, karıştırılan tanı, dikkat dağıtıcı unsur notu).
   `index.html`'de `overlay-card` artık `max-height:88vh` +
   `overflow-y:auto` ile taşan içeriği kaydırılabilir yapıyor.

### Doğrulama

Playwright ile hem doğru hem yanlış tanı senaryosu zorlanarak test
edildi: doğru tanıda "Sonraki Adımlar" + gelişim önerileri, yanlış
tanıda "Hata Analizi" (kaçırılan/yanlış kriterler, karıştırılan tanı
etiketi) doğru render edildi, konsolda hata yok.

## Durum: AŞAMA 5 TAMAMLANDI ✅ (2026-07-01)

Kullanıcı isteği: daha etkin/kullanıcı dostu bir tasarım, vaka geçmişinden
silme imkânı, daha güçlü hikaye vurgusu; tanı sonucu bildirimi zaten AŞAMA
4'te eklenmişti, bu aşamada görsel olarak belirginleştirildi.

### Tamamlananlar

1. **Karşılama (onboarding) ekranı.** `start-overlay` artık veri
   yüklendikten sonra otomatik kapanmıyor; bunun yerine kısa oyun
   talimatlarını (4 adımlı: Görüşün / Test Uygulayın / Not Alın / Tanı
   Koyun) ve büyük bir "İlk Vakayı Başlat" CTA'sı gösteren bir karşılama
   ekranına dönüşüyor (`#start-loading` → `#start-welcome`). Bu, yeni
   kullanıcı için oyunun nasıl oynanacağını anlatan tek, net bir giriş
   noktası sağlıyor.
2. **Vaka geçmişinde silme.** Her satırda tekli bir "×" silme butonu
   (`deleteHistoryEntry(id)`), bölüm başlığında "Temizle" (tümünü sil,
   `confirm()` onaylı) butonu eklendi. Geçmiş kayıtlarına artık bir `id`
   atanıyor (`generateHistoryId()`); eski (id'siz) kayıtlar `loadHistory()`
   içinde otomatik migrate ediliyor, böylece önceki oturumlardan kalan
   kayıtlar da tek tek silinebiliyor.
3. **Hikaye vurgusu.** Tüm panel başlıklarına tematik ikonlar eklendi
   (🩺 Hasta Bilgisi, 🧪 Testler, 📊 Sonuçlar, 📜 Geçmiş, 💬 Görüşme,
   📝 Not Defteri, 🎯 Tanı Koy, 🗂 Soru Seçenekleri). Vaka notu kutusuna
   "📁 VAKA NOTU" etiketi eklendi (`::before`) — böylece bu kutunun bir
   "vaka dosyası" olduğu daha net anlaşılıyor.
4. **Buton/etkileşim cilası.** `.btn` hover'da hafif yukarı kalkma +
   teal gölge, `:active`'de geri dönüş; geçişler yumuşatıldı.
5. **Sonuç bildirimi belirginleştirildi.** "Doğru Tanı"/"Yanlış Tanı"
   banner'ına ✅/❌ ikonu eklendi, `result-pop` keyframe animasyonuyla
   overlay açıldığında hafif büyüyerek beliriyor (zaten AŞAMA 4'te
   eklenen doğru/yanlış geri bildirim mantığının üstüne görsel katman).

### Doğrulama

Playwright ile: karşılama ekranı akışı (yükleniyor → hoş geldiniz →
"İlk Vakayı Başlat"), vaka geçmişinde tekli silme ve "Temizle" (confirm
dialog kabul edilerek), yeni ikonlu başlıklar ve sonuç banner'ı ikonu
uçtan uca test edildi; konsolda hata yok.

## Bilinen Sınırlamalar / Sonraki Adaylar (henüz yapılmadı)

Bunlar kullanıcı tarafından istenmedi ama doğal sonraki adımlar olabilir:

- [ ] Sürükle-bırak (drag & drop) ile not defteri etkileşimi — şu an
      checkbox tabanlı (spec'te "Drag & Drop OR Selectable" deniyordu,
      selectable seçildi).
- [ ] Zorluk seviyesi (ör. daha az zaman, daha fazla distractor) eklenebilir.
- [ ] Vaka notları şu an tek şablon (`isim, yaş, meslek. sevk nedeni`) —
      birden fazla cümle varyasyonu/şablonu ile daha da zenginleştirilebilir.

## Nasıl Çalıştırılır

Tarayıcı güvenlik politikaları nedeniyle `fetch()` ile JSON yüklemek için
dosyayı bir local server üzerinden açmak gerekir (file:// üzerinden CORS
hatası verebilir):

```bash
# Proje klasöründe:
python -m http.server 8089
# Tarayıcıda: http://localhost:8089/index.html
```

## Önemli Tasarım Kararları (gelecekte hatırlamak için)

- Hasta her zaman RootDiagnosis'in TÜM semptomlarına ve Distractor'ün TÜM
  semptomlarına "sahip" — yani distractor semptomları gerçek ama tanısal
  olarak alakasız gürültü. Bu, oyuncunun "hangi belirtiler asıl tanıya ait,
  hangileri dikkat dağıtıcı" ayrımını yapmasını sağlıyor.
- Yalan söyleme sadece `sensitive:true` işaretli sorularda ve rapport < 40
  iken olası; rapport ne kadar düşükse yalan ihtimali o kadar artıyor
  (lineer: `(40 - rapport) * 1.5`).
- Testler rapport/yalan mekanizmasını tamamen by-pass eder — bu onları
  "pahalı ama güvenilir" yapan tasarım gerekçesi.
