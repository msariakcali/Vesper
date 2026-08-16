# worldinpdf

Tarayıcı içinde çalışan, dosyaları sunucuya göndermeden PDF düzenleme ve okuma uygulaması.
worldinpdf.com için hazırlanan arayüz, deniz haritası görsel diliyle kurulur: buff harita
kağıdı, patina turkuazı vurgu ve haritalarda uyarıların basıldığı macenta.

## Akış

1. PDF dosyasını yükle veya sayfaya sürükle.
2. Sayfaları düzenle, birleştir, böl, oku ya da içerik ekle.
3. Hazırlanan PDF'i doğrudan cihazına indir.

## Geliştirme

```bash
pnpm install
pnpm dev
```

Üretim çıktısı `pnpm build` ile `dist` klasörüne hazırlanır.

Arayüz yazı tipleri (Bodoni Moda, IBM Plex Sans/Mono) `public/fonts/` altında kendi
sunucumuzdan servis edilir — dosyaların cihazdan çıkmadığı bir uygulamanın font için
üçüncü partiye istek atmaması gerekir.
