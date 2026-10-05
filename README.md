# PsikoTarama — Clinical Diagnosis Simulation

![JavaScript](https://img.shields.io/badge/javascript-ES6-yellow)
![PWA](https://img.shields.io/badge/PWA-offline-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)

<p align="center"><b><a href="#english">English</a></b> · <b><a href="#türkçe">Türkçe</a></b></p>

**Live demo:** https://psikoloji-app.vercel.app

---

## English

A browser game that puts you in the chair of a clinical psychologist. Each round generates a new patient; you interview them, run psychometric tests, take notes on DSM-5-style criteria and commit to a diagnosis before the session time runs out. Built with plain HTML, CSS and vanilla JavaScript — no framework, no backend, no build step.

> **Note:** This is an educational game. The cases, questions and scoring are simplified and it is not a diagnostic or medical tool.

### Features

- **Randomly generated cases:** each patient combines one real diagnosis with one or more "distractors" (somatic complaints, denial, family stress, hints of substance use) that produce genuine but diagnostically irrelevant symptoms.
- **8 diagnoses:** Major Depressive Disorder, Bipolar I, Generalized Anxiety, Panic Disorder, OCD, PTSD, Social Anxiety and Anorexia Nervosa.
- **64 interview questions** grouped by category (mood, physical, cognitive, behaviour, risk, psychosocial). Every question costs time and changes rapport.
- **Rapport and deception:** when rapport is low, the patient may lie in response to sensitive questions.
- **8 psychometric tests** (BDI, YMRS, GAD-7, PDSS, Y-BOCS, PCL-5, LSAS, EAT-26): expensive in time, but they bypass deception and reveal the true symptom level.
- **3 difficulty levels:**

  | Level | Time | Starting rapport | Extra rules |
  |---|---|---|---|
  | Easy | 60 min | 60 | — |
  | Normal | 45 min | 50 | — |
  | Hard | 30 min | 40 | Two distractors, tests cost 1.5×, results shown only as Low/Medium/High |

- **Scoring and feedback:** 60% for the correct diagnosis and 40% for criteria precision/recall. A correct diagnosis shows clinical next steps. A wrong one shows an error analysis: missed criteria, wrongly marked criteria and the diagnosis you most likely confused it with.
- **Case history:** your last 10 cases are saved in `localStorage`. You can delete them one by one or all at once.
- **PWA:** installable and works offline (cache-first service worker).
- **Accessibility:** keyboard shortcuts, ARIA live regions and focus management. Sound effects are synthesised with the WebAudio API, so the game ships no audio files.
- **Responsive:** three-panel layout on desktop and a tabbed single-panel layout on mobile.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `H` | Patient panel |
| `G` | Interview panel |
| `T` | Diagnosis panel |
| `Y` | New case |
| `M` | Mute / unmute |

### Running locally

The game loads its data with `fetch()`, so it has to be served over HTTP rather than opened as a `file://` URL:

```bash
git clone https://github.com/KaanTuran28/Psikoloji_App.git
cd Psikoloji_App
python -m http.server 8089
# open http://localhost:8089
```

### Project structure

```
Psikoloji_App/
├── index.html             # Single-page app shell
├── css/style.css          # Dark "slate + teal" theme, responsive layout
├── js/
│   ├── GameEngine.js      # ClinicalEngine class + difficulty settings
│   ├── app.js             # DOM rendering and event handling
│   └── sound.js           # WebAudio sound effects
├── data/patients.json     # Diagnoses, distractors, questions, tests
├── manifest.webmanifest   # PWA manifest
├── sw.js                  # Service worker (offline cache)
├── icons/                 # PWA icons
└── PROGRESS.md            # Development log (Turkish)
```

All case content lives in `data/patients.json`. To add a diagnosis, add it with its symptoms, questions and test, and the UI picks it up automatically.

### License

MIT — see [LICENSE](./LICENSE).

---

## Türkçe

Sizi bir klinik psikoloğun yerine koyan bir tarayıcı oyunu. Her turda yeni bir hasta oluşturulur: hastayla görüşür, psikometrik testler uygular, DSM-5 benzeri kriterleri not defterine işler ve seans süresi bitmeden bir tanı koyarsınız. Düz HTML, CSS ve vanilla JavaScript ile yazıldı; framework, sunucu veya derleme adımı yok.

> **Not:** Bu bir eğitim oyunudur. Vakalar, sorular ve puanlama basitleştirilmiştir; tanı koymak için veya tıbbi amaçla kullanılamaz.

### Özellikler

- **Rastgele vakalar:** her hasta bir gerçek tanı ile bir ya da daha fazla "dikkat dağıtıcı" unsuru (somatik şikâyet, inkâr, aile stresi, madde kullanımı ima) birleştirir. Bu unsurlar gerçek ama tanıyla ilgisiz belirtiler üretir.
- **8 tanı:** Majör Depresif Bozukluk, Bipolar I, Yaygın Anksiyete, Panik Bozukluk, OKB, TSSB, Sosyal Anksiyete ve Anoreksiya Nervoza.
- **64 görüşme sorusu**, kategorilere ayrılmış (duygudurum, bedensel, bilişsel, davranış, risk, psikososyal). Her soru süre harcar ve güveni (rapport) etkiler.
- **Güven ve yalan:** güven düşükken hasta hassas sorulara yalan cevap verebilir.
- **8 psikometrik test** (BDI, YMRS, GAD-7, PDSS, Y-BOCS, PCL-5, LSAS, EAT-26): çok süre harcar ama yalanı atlar ve gerçek belirti düzeyini gösterir.
- **3 zorluk seviyesi:**

  | Seviye | Süre | Başlangıç güveni | Ek kurallar |
  |---|---|---|---|
  | Kolay | 60 dk | 60 | — |
  | Normal | 45 dk | 50 | — |
  | Zor | 30 dk | 40 | İki dikkat dağıtıcı, testler 1,5 kat süre harcar, sonuçlar yalnızca Düşük/Orta/Yüksek |

- **Puanlama ve geri bildirim:** puanın %60'ı doğru tanıdan, %40'ı kriter isabetinden (precision/recall) gelir. Doğru tanıda klinik "sonraki adımlar" gösterilir. Yanlış tanıda hata analizi gelir: kaçırılan kriterler, yanlış işaretlenenler ve büyük olasılıkla karıştırdığınız tanı.
- **Vaka geçmişi:** son 10 vaka `localStorage`'da saklanır, tek tek ya da toptan silinebilir.
- **PWA:** cihaza kurulabilir ve çevrimdışı çalışır (cache-first service worker).
- **Erişilebilirlik:** klavye kısayolları, ARIA canlı bölgeleri ve odak yönetimi. Ses efektleri WebAudio API ile üretilir, oyunda ses dosyası yoktur.
- **Mobil uyum:** masaüstünde üç panel, mobilde sekmeli tek panel.

### Klavye kısayolları

| Tuş | İşlev |
|---|---|
| `H` | Hasta paneli |
| `G` | Görüşme paneli |
| `T` | Tanı paneli |
| `Y` | Yeni vaka |
| `M` | Sesi aç / kapat |

### Yerelde çalıştırma

Oyun verisini `fetch()` ile yüklediği için `file://` ile değil, bir HTTP sunucusu üzerinden açılmalıdır:

```bash
git clone https://github.com/KaanTuran28/Psikoloji_App.git
cd Psikoloji_App
python -m http.server 8089
# tarayıcıda http://localhost:8089 adresini açın
```

### Proje yapısı

```
Psikoloji_App/
├── index.html             # Tek sayfalık uygulama iskeleti
├── css/style.css          # Koyu "slate + teal" tema, mobil uyumlu düzen
├── js/
│   ├── GameEngine.js      # ClinicalEngine sınıfı + zorluk ayarları
│   ├── app.js             # Ekran çizimi ve olay yönetimi
│   └── sound.js           # WebAudio ses efektleri
├── data/patients.json     # Tanılar, dikkat dağıtıcılar, sorular, testler
├── manifest.webmanifest   # PWA manifest
├── sw.js                  # Service worker (çevrimdışı önbellek)
├── icons/                 # PWA ikonları
└── PROGRESS.md            # Geliştirme günlüğü
```

Tüm vaka içeriği `data/patients.json` dosyasındadır. Yeni bir tanı eklemek için onu belirtileri, soruları ve testiyle birlikte bu dosyaya eklemeniz yeterli; arayüz otomatik olarak gösterir.

### Lisans

MIT — bkz. [LICENSE](./LICENSE).
