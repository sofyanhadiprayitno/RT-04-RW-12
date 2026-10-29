/* ==========================================================
   RT 04 / RW 12 — Portal Layanan RT Terpadu
   Frontend logic
   ========================================================== */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal (${res.status})`);
  return data;
}

const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

function tanggalPendek(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tanggalPanjang(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function jamWaktu(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

let toastTimer;
function toast(pesan, isError = false) {
  const el = $('#toast');
  el.textContent = pesan;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

/* ---------- Navigasi ---------- */
$('#navToggle').addEventListener('click', () => $('#nav').classList.toggle('open'));
$$('#nav a').forEach((a) => a.addEventListener('click', () => $('#nav').classList.remove('open')));
$('#tahun').textContent = new Date().getFullYear();

/* ---------- Efek visual: header melayang & animasi masuk ---------- */
const headerEl = $('#header');
const onScrollHeader = () => headerEl.classList.toggle('scrolled', window.scrollY > 12);
window.addEventListener('scroll', onScrollHeader, { passive: true });
onScrollHeader();

const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!kurangiGerak && 'IntersectionObserver' in window) {
  document.body.classList.add('js-reveal');
  const revealTargets = $$(
    '.section-head, .service-card, .demo-card, .pengumuman-item, .kontak-item, ' +
    '.kontak-darurat, .iuran-info, .kas-report, .kontak-dua > .card, .profil-tabs'
  );
  const ro = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('reveal-in');
        obs.unobserve(e.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  revealTargets.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    el.classList.add('reveal');
    ro.observe(el);
  });
  // Jaring pengaman: semua konten tetap tampil walau observer gagal
  setTimeout(() => revealTargets.forEach((el) => el.classList.add('reveal-in')), 2500);
}

/* ---------- Muat informasi RT ---------- */
let waPelayanan = '';
let notifSetelan = { hp: true, wa_warga: true, wa_pengurus: true }; // hasil setelan panel pengurus

/* Kartu anggota organisasi (dipakai Pengurus RT, PKK, Karang Taruna) */
function kartuPengurus(p) {
  const inisial = (p.nama || '')
    .replace(/^(Bpk\.|Ibu|Ust\.|Hj\.|H\.)\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return `<div class="pengurus-card">
    <div class="avatar">${inisial || 'RT'}</div>
    <span class="jabatan">${esc(p.jabatan || '')}</span>
    <h4>${esc(p.nama || '')}</h4>
    ${p.hp ? `<small>📱 ${esc(p.hp)}</small>` : ''}
    ${p.periode ? `<small>Periode ${esc(p.periode)}</small>` : ''}
  </div>`;
}

function isiProker(list, el) {
  if (!el) return;
  const items = Array.isArray(list) ? list : [];
  el.innerHTML = items.length
    ? items
        .map(
          (x) => `<li class="proker-item">
            <strong>${esc(x.judul || '—')}</strong>
            ${x.keterangan ? `<span class="proker-ket">${esc(x.keterangan)}</span>` : ''}
            ${x.periode ? `<span class="proker-periode">${esc(x.periode)}</span>` : ''}
          </li>`
        )
        .join('')
    : '<li class="muted">Belum ada program kerja. Pengurus dapat mengisinya di menu Pengaturan panel pengurus.</li>';
}

/* ---------- Terapkan tema, warna, latar, logo & ikon dari pengaturan ---------- */
function shadeWarna(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)
  );
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('');
}

function pasangTema(info) {
  const tema = info.tema || {};
  const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
  const st = document.documentElement.style;
  if (isHex(tema.utama)) {
    st.setProperty('--green-900', shadeWarna(tema.utama, -0.4));
    st.setProperty('--green-800', shadeWarna(tema.utama, -0.25));
    st.setProperty('--green-700', tema.utama);
    st.setProperty('--green-600', shadeWarna(tema.utama, 0.15));
    st.setProperty('--green-100', shadeWarna(tema.utama, 0.85));
    st.setProperty('--green-50', shadeWarna(tema.utama, 0.93));
  }
  if (isHex(tema.latar)) st.setProperty('--bg', tema.latar);
  if (info.gambar_latar) {
    st.setProperty('--latar-img', `url("${info.gambar_latar}")`);
    document.body.classList.add('has-latar');
  }
  if (info.gambar_hero) {
    st.setProperty('--hero-img', `url("${info.gambar_hero}")`);
    const hero = document.querySelector('.hero');
    if (hero) hero.classList.add('has-hero-img');
  }
  if (info.logo && !document.querySelector('.brand .brand-logo')) {
    const badge = document.querySelector('.brand .brand-badge');
    if (badge) {
      const img = document.createElement('img');
      img.className = 'brand-logo';
      img.src = info.logo;
      img.alt = 'Logo RT 04 / RW 12';
      badge.replaceWith(img);
    }
  }
  if (info.icon_site) {
    let link = document.querySelector('link[rel~="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = info.icon_site;
  }
}

async function muatInfo() {
  try {
    const info = await api('/api/info');
    pasangTema(info);
    if (info.notifikasi && typeof info.notifikasi === 'object') notifSetelan = { ...notifSetelan, ...info.notifikasi };
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const { profil, pengurus, kontak, iuran } = info;

    const lokasi = [profil.perumahan, profil.kecamatan, profil.kabupaten].filter(Boolean).join(', ');
    if (profil.perumahan) document.title = `RT 04 / RW 12 — ${profil.perumahan} | Layanan RT Terpadu`;
    $('#profilLokasi').textContent = lokasi;

    $('#visiText').textContent = profil.visi || '—';
    const batas = profil.batas || {};
    $('#batasList').innerHTML = ['utara', 'selatan', 'timur', 'barat']
      .map(
        (arah) =>
          `<li><span>${arah.charAt(0).toUpperCase() + arah.slice(1)}</span><strong>${batas[arah] || '—'}</strong></li>`
      )
      .join('');
    $('#misiList').innerHTML = (profil.misi || []).map((m) => `<li>${m}</li>`).join('');

    if (pengurus.length) {
      $('#periodePengurus').textContent = pengurus[0].periode || '—';
      $('#pengurusGrid').innerHTML = pengurus.map(kartuPengurus).join('');
    } else {
      $('#pengurusGrid').innerHTML = '<p class="muted">Data pengurus belum tersedia.</p>';
    }

    const pkk = info.pengurus_pkk || [];
    $('#periodePkk').textContent = pkk[0]?.periode || '—';
    $('#pkkGrid').innerHTML = pkk.length
      ? pkk.map(kartuPengurus).join('')
      : '<p class="muted">Belum ada data pengurus Ibu PKK. Pengurus dapat mengisinya di menu Pengaturan panel pengurus.</p>';

    const karangTaruna = info.pengurus_karangtaruna || [];
    $('#periodeKt').textContent = karangTaruna[0]?.periode || '—';
    $('#ktGrid').innerHTML = karangTaruna.length
      ? karangTaruna.map(kartuPengurus).join('')
      : '<p class="muted">Belum ada data pengurus Karang Taruna. Pengurus dapat mengisinya di menu Pengaturan panel pengurus.</p>';

    isiProker(info.proker_pendek, $('#proker1List'));
    isiProker(info.proker_menengah, $('#proker2List'));
    isiProker(info.proker_panjang, $('#proker3List'));

    const aturan = info.aturan || [];
    $('#aturanList').innerHTML = aturan.length
      ? aturan.map((a) => `<li>${esc(a)}</li>`).join('')
      : '<li class="muted">Belum ada aturan. Pengurus dapat mengisinya di menu Pengaturan panel pengurus.</li>';

    $('#kontakPengurus').innerHTML = pengurus.length
      ? pengurus
          .map((p) => {
            const wa = waUrl(p.hp);
            return `<div class="kontak-pengurus-item">
            <div>
              <span class="jabatan">${esc(p.jabatan || 'Pengurus')}</span>
              <strong>${esc(p.nama || '')}</strong>
              <small>${p.hp ? '📱 ' + esc(p.hp) : 'Tanpa nomor'}</small>
            </div>
            ${wa ? `<a class="btn btn-outline btn-sm" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
          </div>`;
          })
          .join('')
      : '<p class="muted">Data pengurus belum tersedia.</p>';

    $('#kontakAlamat').textContent = kontak.alamat || '—';
    $('#kontakJam').textContent = kontak.jam_pelayanan || '—';
    $('#kontakEmail').textContent = kontak.email || '—';
    if (kontak.email) $('#kontakEmailLink').href = `mailto:${kontak.email}`;
    else $('#kontakEmailLink').classList.add('hidden');
    if (kontak.maps_url) $('#kontakMaps').href = kontak.maps_url;
    const darurat = info.darurat || [];
    $('#kontakDarurat').innerHTML = darurat.length
      ? darurat
          .map(
            (d) => `<a class="darurat-item" href="tel:${String(d.nomor || '').replace(/\s/g, '')}" target="_blank" rel="noopener">
              <span class="darurat-nama">${esc(d.layanan || 'Layanan')}</span>
              <strong>${esc(d.nomor || '')}</strong>
            </a>`
          )
          .join('')
      : '<p class="muted">Belum ada kontak darurat. Pengurus dapat menambahkannya di menu Pengaturan panel pengurus.</p>';

    if (kontak.wa_pelayanan) {
      waPelayanan = String(kontak.wa_pelayanan).replace(/\D/g, '');
      const wa = `https://wa.me/${kontak.wa_pelayanan}?text=${encodeURIComponent(
        'Assalamualaikum, saya warga RT 04 RW 12 ingin bertanya layanan RT.'
      )}`;
      $('#kontakWaLink').href = wa;
      $('#heroWaLink').href = wa;
      $('#kontakWa').textContent = '+' + kontak.wa_pelayanan.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, '$1 $2-$3-$4');
      $('#heroWa').textContent = 'Klik untuk chat pengurus';
    }
    $('#heroJam').textContent = kontak.jam_pelayanan || '—';

    $('#iuranNominal').textContent = rupiah(iuran.nominal) + ' / bulan';
    $('#iuranKeterangan').textContent = iuran.keterangan || '—';
    if (iuran.rekening) {
      $('#iuranRekText').textContent = iuran.rekening;
      $('#iuranRekening').textContent = iuran.rekening;
    }
    const inputNominal = $('#setoranForm [name="nominal"]');
    if (inputNominal && iuran.nominal && !inputNominal.value) inputNominal.value = iuran.nominal;
    const inputPeriode = $('#setoranForm [name="periode"]');
    if (inputPeriode && !inputPeriode.value) {
      inputPeriode.value = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------- Sub-menu Profil RT ---------- */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.profil-tab');
  if (!tab) return;
  $$('.profil-tab').forEach((t) => t.classList.toggle('active', t === tab));
  const nama = tab.dataset.profil;
  $$('.profil-panel').forEach((p) => p.classList.toggle('hidden', p.id !== `fp-${nama}`));
});

/* ---------- Kontak: pesan untuk pengurus ---------- */
function waUrl(nomor) {
  if (!nomor) return null;
  let n = String(nomor).replace(/\D/g, '');
  if (!n) return null;
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return `https://wa.me/${n}`;
}

$('#kontakForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const msg = $('#kontakFormMsg');
  btn.disabled = true;
  try {
    const body = Object.fromEntries(new FormData(e.target).entries());
    const res = await api('/api/kontak', { method: 'POST', body: JSON.stringify(body) });
    e.target.reset();
    msg.textContent = res.pesan || 'Pesan terkirim.';
    msg.classList.remove('hidden', 'error');
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.add('error');
    msg.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Pengumuman ---------- */
const KATEGORI_LABEL = {
  pengumuman: 'Pengumuman',
  agenda: 'Agenda',
  ronda: 'Ronda',
  kerja_bakti: 'Kerja Bakti',
};

async function muatPengumuman() {
  try {
    const { pengumuman } = await api('/api/pengumuman');
    const box = $('#pengumumanList');
    if (!pengumuman.length) {
      box.innerHTML = '<div class="card muted center">Belum ada pengumuman saat ini.</div>';
      return;
    }
    box.innerHTML = pengumuman
      .map((p) => {
        const d = p.tanggal ? new Date(p.tanggal) : null;
        const badge = d
          ? `<div class="date-badge"><strong>${d.getDate()}</strong><span>${d
              .toLocaleDateString('id-ID', { month: 'short' })
              .replace('.', '')}</span></div>`
          : '<div class="date-badge"><strong>•</strong><span>info</span></div>';
        return `<article class="pengumuman-item k-${p.kategori}">
          ${badge}
          <div class="pengumuman-body">
            <span class="kategori">${KATEGORI_LABEL[p.kategori] || 'Pengumuman'}</span>
            <h3>${p.judul}</h3>
            <p>${p.isi}</p>
            ${p.tanggal ? `<small class="muted">${tanggalPanjang(p.tanggal)}</small>` : ''}
          </div>
        </article>`;
      })
      .join('');
  } catch (e) {
    $('#pengumumanList').innerHTML = `<div class="card muted center">Gagal memuat: ${e.message}</div>`;
  }
}

/* ---------- Laporan kas (bulan berjalan + rekapitulasi tahunan) ---------- */
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function renderRekapTahunan(tahunan) {
  if (!tahunan || !Array.isArray(tahunan.per_bulan)) return;
  $('#rekapTahun').textContent = `· ${tahunan.tahun}`;
  $('#rekapTotal').textContent =
    `${tahunan.total_jumlah} transaksi · Masuk ${rupiah(tahunan.total_pemasukan)} · Keluar ${rupiah(tahunan.total_pengeluaran)}`;
  const maksM = Math.max(1, ...tahunan.per_bulan.map((b) => b.pemasukan));
  const maksK = Math.max(1, ...tahunan.per_bulan.map((b) => b.pengeluaran));
  const barW = (v, maks) => (v ? Math.max(3, Math.round((v / maks) * 100)) : 0);
  const porsi = (v, total) => (v && total ? Math.round((v / total) * 1000) / 10 : 0);
  $('#rekapBody').innerHTML = tahunan.per_bulan
    .map((b) => {
      const pm = porsi(b.pemasukan, tahunan.total_pemasukan);
      const pk = porsi(b.pengeluaran, tahunan.total_pengeluaran);
      return `<div class="rekap-row${b.jumlah ? '' : ' kosong'}">
        <span class="rekap-bulan">${NAMA_BULAN[b.bulan - 1]}</span>
        <div class="rekap-bars">
          <div class="rekap-bar masuk" title="Masuk ${rupiah(b.pemasukan)} — ${pm}% dari total tahun">
            <span class="rekap-track"><i style="width:${barW(b.pemasukan, maksM)}%"></i></span>
            <span class="rekap-label">${rupiah(b.pemasukan)} · <strong>${pm}%</strong></span>
          </div>
          <div class="rekap-bar keluar" title="Keluar ${rupiah(b.pengeluaran)} — ${pk}% dari total tahun">
            <span class="rekap-track"><i style="width:${barW(b.pengeluaran, maksK)}%"></i></span>
            <span class="rekap-label">${rupiah(b.pengeluaran)} · <strong>${pk}%</strong></span>
          </div>
        </div>
      </div>`;
    })
    .join('');
}

async function muatKas() {
  try {
    const d = await api('/api/kas');
    const bulan = d.bulan || {
      periode: '',
      transaksi: d.transaksi,
      pemasukan: d.pemasukan,
      pengeluaran: d.pengeluaran,
      saldo: d.saldo,
    };
    $('#kasMasuk').textContent = rupiah(bulan.pemasukan);
    $('#kasKeluar').textContent = rupiah(bulan.pengeluaran);
    $('#kasSaldo').textContent = rupiah(bulan.saldo);
    const labelPeriode = bulan.periode
      ? new Date(`${bulan.periode}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : tanggalPanjang(new Date().toISOString());
    $('#kasUpdated').textContent = `Periode ${labelPeriode} · Diperbarui ${tanggalPanjang(new Date().toISOString())}`;
    renderRekapTahunan(d.tahunan);
    const transaksi = bulan.transaksi || [];
    const body = $('#kasBody');
    if (!transaksi.length) {
      body.innerHTML = `<tr><td colspan="4" class="muted center">Belum ada transaksi pada ${labelPeriode}.</td></tr>`;
      return;
    }
    const tampil = transaksi.slice(0, 15);
    body.innerHTML = tampil
      .map(
        (t) => `<tr>
          <td>${tanggalPendek(t.tanggal)}</td>
          <td>${t.keterangan}</td>
          <td class="right td-masuk">${t.jenis === 'masuk' ? rupiah(t.nominal) : '—'}</td>
          <td class="right td-keluar">${t.jenis === 'keluar' ? rupiah(t.nominal) : '—'}</td>
        </tr>`
      )
      .join('');
    if (transaksi.length > tampil.length) {
      body.innerHTML += `<tr><td colspan="4" class="muted center">… menampilkan ${tampil.length} dari ${transaksi.length} transaksi bulan ini</td></tr>`;
    }
  } catch (e) {
    $('#kasBody').innerHTML = `<tr><td colspan="4" class="muted center">Gagal memuat: ${e.message}</td></tr>`;
  }
}

/* ---------- Tab formulir ---------- */
$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const nama = tab.dataset.tab;
    $$('[data-tab-panel]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.tabPanel !== nama));
    $('#formResult').classList.add('hidden');
    $('#form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

function bukaTab(nama) {
  const tab = $(`.tab[data-tab="${nama}"]`);
  if (tab) tab.click();
}

$('#bayarBtn').addEventListener('click', (e) => {
  e.preventDefault();
  bukaTab('setoran');
});

/* ---------- Kirim formulir ---------- */
function tampilkanHasil({ title, message, nomor }) {
  $('#resultTitle').textContent = title;
  $('#resultMessage').textContent = message;
  $('#resultNomor').textContent = nomor;
  $('#resultNotif').classList.add('hidden');
  $('#resultWaBtn').classList.add('hidden');
  $('#formResult').classList.remove('hidden');
  $$('.form[data-tab-panel]').forEach((f) => f.classList.add('hidden'));
  $('#formResult').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function bacaGambar(file, maks = 950 * 1024) {
  if (file.size > maks) {
    return Promise.reject(new Error(`Ukuran gambar maksimal ${Math.round(maks / 1024)} KB.`));
  }
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    r.readAsDataURL(file);
  });
}

async function kirimForm(form, endpoint, { title, message, kwitansi, waLabel = 'Kwitansi pengajuan', waBtn = '📲 Kirim Kwitansi ke WhatsApp' }) {
  const btn = form.querySelector('button[type="submit"]');
  const asli = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Mengirim…';
  // Buka jendela WhatsApp sekarang (masih dalam gestur klik) agar tidak diblokir browser
  const popup = window.open('about:blank', '_blank');
  try {
    const body = {};
    for (const [k, v] of new FormData(form).entries()) {
      if (v instanceof File) {
        if (v.size) body[k] = await bacaGambar(v);
        continue;
      }
      body[k] = v;
    }
    const res = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
    const nomor = res.nomor || '—';
    tampilkanHasil({ title, message: res.pesan || message, nomor });
    let terkirim = false;
    if (kwitansi) terkirim = bukaWaKwitansi(kwitansi(body, nomor), popup);
    $('#resultWaBtn').textContent = waBtn;
    tampilkanNotif(nomor, terkirim, waLabel, waBtn);
    form.reset();
    toast(terkirim ? `Terkirim — ${waLabel.toLowerCase()} siap dikirim via WhatsApp.` : 'Pengajuan berhasil dikirim.');
  } catch (e) {
    if (popup && popup !== window && !popup.closed) popup.close();
    toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = asli;
  }
}

/* Kwitansi pengajuan → teks WhatsApp */
function teksKwitansi({ judul, nomor, data, detail }) {
  const now = new Date();
  return [
    '🧾 *KWITANSI PENGAJUAN ONLINE*',
    'RT 04 / RW 12 — Perum Taman Buah Sukamantri',
    'Kec. Pasar Kemis, Kab. Tangerang',
    '————————————————',
    `Nomor: *${nomor}*`,
    `Jenis: ${judul}`,
    `Nama: ${data.nama || '—'}`,
    `Blok: ${data.blok || '—'}`,
    data.no_hp ? `No. HP: ${data.no_hp}` : null,
    detail ? `Detail: ${detail}` : null,
    `Waktu: ${tanggalPanjang(now.toISOString())}, ${jamWaktu(now)}`,
    'Status: Menunggu diproses pengurus RT',
    '————————————————',
    'Simpan nomor ini — pantau status lewat menu Lacak Pengajuan di website RT 04.',
  ]
    .filter(Boolean)
    .join('\n');
}

/* Notifikasi pengajuan surat pengantar → teks WhatsApp ke pengurus RT */
function teksNotifikasiSurat(nomor, data) {
  const now = new Date();
  return [
    '📨 *NOTIFIKASI PENGAJUAN SURAT PENGANTAR*',
    'RT 04 / RW 12 — Perum Taman Buah Sukamantri',
    'Kec. Pasar Kemis, Kab. Tangerang',
    '————————————————',
    `Nomor pengajuan: *${nomor}*`,
    `Nama: ${data.nama || '—'}`,
    `Blok / Rumah: ${data.blok || '—'}`,
    data.no_hp ? `No. HP: ${data.no_hp}` : null,
    `Jenis surat: ${data.jenis_surat || '—'}`,
    `Keperluan: ${data.keperluan || '—'}`,
    data.nik ? `NIK: ${data.nik}` : null,
    `Waktu: ${tanggalPanjang(now.toISOString())}, ${jamWaktu(now)}`,
    'Status: Menunggu diproses pengurus RT',
    '————————————————',
    'Mohon diproses. Warga dapat melacak statusnya lewat menu Lacak Pengajuan di website RT 04.',
  ]
    .filter(Boolean)
    .join('\n');
}

/* Buka WhatsApp (jendela hasil dari popup yang dibuka di awal) + tombol cadangan */
function bukaWaKwitansi(teks, popup) {
  const btn = $('#resultWaBtn');
  if (!waPelayanan) {
    btn.classList.add('hidden');
    if (popup && popup !== window && !popup.closed) popup.close();
    return false;
  }
  const url = `https://wa.me/${waPelayanan}?text=${encodeURIComponent(teks)}`;
  btn.href = url;
  btn.classList.remove('hidden');
  if (popup && popup !== window && !popup.closed) {
    try {
      popup.location.href = url;
      popup.focus();
      return true;
    } catch {
      /* jendela diblokir — gunakan tombol */
    }
  }
  return false;
}

function tampilkanNotif(nomor, terkirim, label = 'Kwitansi pengajuan', tombol = 'Kirim Kwitansi ke WhatsApp') {
  const box = $('#resultNotif');
  box.classList.remove('hidden', 'warn');
  if (terkirim) {
    box.innerHTML = `<strong>🔔 Notifikasi:</strong> ${label} <strong>${nomor}</strong> otomatis dibuka di WhatsApp pengurus RT 04 — tekan kirim di sana agar tercatat.`;
  } else {
    box.classList.add('warn');
    box.innerHTML = `<strong>🔔 Notifikasi:</strong> Pengajuan <strong>${nomor}</strong> berhasil tercatat. ${label} belum terbuka otomatis (popup diblokir browser) — klik tombol <em>${tombol}</em> di bawah.`;
  }
  if (notifSetelan.hp && awalanDari(nomor)) box.insertAdjacentHTML('beforeend', `<div class="notif-pantau">${tombolPantau(nomor, 'menunggu')}</div>`);
}

/* ---------- Notifikasi status pengajuan di HP warga (Android / iPhone) ---------- */
const KEY_PANTAU = 'rt04_notif_pantau';

function bacaPantau() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY_PANTAU) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function simpanPantau(list) {
  try {
    localStorage.setItem(KEY_PANTAU, JSON.stringify(list.slice(0, 10)));
  } catch {
    /* penyimpanan penuh — abaikan */
  }
}

async function tampilNotifBrowser(judul, isi, tag) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
    const opts = { body: isi, icon: '/icon.svg', badge: '/icon.svg', dir: 'ltr', lang: 'id' };
    if (tag) opts.tag = tag;
    if (reg && reg.showNotification) await reg.showNotification(judul, opts);
    else new Notification(judul, opts);
  } catch {
    /* browser menolak — abaikan */
  }
}

function tombolPantau(nomor, status, jenis = '') {
  const aktif = bacaPantau().some((x) => x.nomor === nomor);
  if (aktif) {
    return `<button type="button" class="btn btn-ghost btn-sm notif-stop" data-nomor="${esc(nomor)}">🔔 Notifikasi aktif — berhenti pantau</button>`;
  }
  return `<button type="button" class="btn btn-outline btn-sm notif-pantau-btn" data-nomor="${esc(nomor)}" data-status="${esc(status)}" data-jenis="${esc(jenis)}">🔔 Aktifkan notifikasi status di HP</button>`;
}

function panelPantau(d) {
  if (!notifSetelan.hp || !d.nomor) return '';
  return `<div class="track-notif">
    ${tombolPantau(d.nomor, d.status, d.jenis)}
    <small>Pemberitahuan otomatis saat pengajuan <strong>diterima (tanpa antre)</strong>, <strong>diproses</strong>, dan <strong>selesai</strong>.
    HP Android: buka lewat ikon <em>Tambahkan ke Layar Utama</em>; iPhone: Safari 16.4+ → <em>Bagikan → Tambahkan ke Layar Utama</em>. Notifikasi berbunyi selama halaman ini dibuka.</small>
  </div>`;
}

async function aktifkanPantau(nomor, status, jenis) {
  if (!nomor) return;
  if (!('Notification' in window)) return toast('Browser ini tidak mendukung notifikasi.', true);
  if (Notification.permission === 'denied') {
    return toast('Notifikasi diblokir — izinkan lewat pengaturan situs di browser Anda.', true);
  }
  if (Notification.permission === 'default') {
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return toast('Izin notifikasi belum diberikan.', true);
    } catch {
      return toast('Gagal meminta izin notifikasi.', true);
    }
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const list = bacaPantau().filter((x) => x.nomor !== nomor);
  list.unshift({ nomor, status: status || 'menunggu', jenis: jenis || '', waktu: Date.now() });
  simpanPantau(list);
  await tampilNotifBrowser(
    `🔔 ${nomor} — terdaftar`,
    'Pantauan notifikasi aktif. Anda akan diberitahu saat pengajuan diproses dan selesai.',
    `rt04-${nomor}`
  );
  toast(`Notifikasi status aktif untuk ${nomor}.`);
  muatUlangTombolPantau(nomor, status, jenis);
}

function hentikanPantau(nomor) {
  simpanPantau(bacaPantau().filter((x) => x.nomor !== nomor));
  toast(`Pantauan notifikasi ${nomor} dihentikan.`);
  const d = { nomor, status: '', jenis: '' };
  muatUlangTombolPantau(nomor, '', '');
}

function muatUlangTombolPantau(nomor, status, jenis) {
  $$('.notif-pantau-btn, .notif-stop').forEach((b) => {
    if (b.dataset.nomor !== nomor) return;
    b.outerHTML = tombolPantau(nomor, status || b.dataset.status, jenis || b.dataset.jenis);
  });
}

document.addEventListener('click', (e) => {
  const on = e.target.closest('.notif-pantau-btn');
  if (on) {
    aktifkanPantau(on.dataset.nomor, on.dataset.status, on.dataset.jenis);
    return;
  }
  const off = e.target.closest('.notif-stop');
  if (off) hentikanPantau(off.dataset.nomor);
});

/* Pemeriksaan berkala: bandingkan status tersimpan dengan server → beri tahu HP */
setInterval(async () => {
  const list = bacaPantau();
  if (!list.length || !('Notification' in window) || Notification.permission !== 'granted') return;
  let berubah = false;
  for (const item of list) {
    try {
      const d = await api('/api/lacak', { method: 'POST', body: JSON.stringify({ nomor: item.nomor }) });
      if (d.status && d.status !== item.status) {
        const lambang = { menunggu: '📨', diproses: '⚙️', selesai: '✅', ditolak: '⚠️', diverifikasi: '✅' }[d.status] || '📋';
        await tampilNotifBrowser(
          `${lambang} ${item.nomor} — ${STATUS_LABEL[d.status] || d.status}`,
          `${d.nama ? d.nama + ' — ' : ''}${d.jenis || 'Pengajuan'} kini ${STATUS_LABEL[d.status] || d.status}. Buka Lacak Pengajuan untuk detail.`,
          `rt04-${item.nomor}`
        );
        item.status = d.status;
        berubah = true;
      }
    } catch {
      /* nomor tidak ditemukan — hentikan pantauannya */
      item.hapus = true;
      berubah = true;
    }
  }
  if (berubah) simpanPantau(list.filter((x) => !x.hapus));
}, 60000);

$('#suratForm').addEventListener('submit', (e) => {
  e.preventDefault();
  kirimForm(e.target, '/api/surat', {
    title: 'Pengajuan surat diterima!',
    message: 'Pengurus RT akan memproses surat Anda.',
    waLabel: 'Notifikasi pengajuan surat',
    waBtn: '📲 Kirim Notifikasi ke WhatsApp',
    kwitansi: (b, nomor) => teksNotifikasiSurat(nomor, b),
  });
});

$('#aduanForm').addEventListener('submit', (e) => {
  e.preventDefault();
  kirimForm(e.target, '/api/aduan', {
    title: 'Aduan diterima!',
    message: 'Pengurus akan menindaklanjuti laporan Anda.',
    kwitansi: (b, nomor) =>
      teksKwitansi({
        judul: 'Aduan / Laporan Warga',
        nomor,
        data: b,
        detail: [b.kategori, (b.isi || '').slice(0, 150), b.lokasi ? `Lokasi: ${b.lokasi}` : null]
          .filter(Boolean)
          .join(' — '),
      }),
  });
});

$('#setoranForm').addEventListener('submit', (e) => {
  e.preventDefault();
  kirimForm(e.target, '/api/setoran', {
    title: 'Laporan setoran diterima!',
    message: 'Setoran tercatat setelah diverifikasi Bendahara.',
    kwitansi: (b, nomor) =>
      teksKwitansi({
        judul: 'Laporan Setoran Iuran',
        nomor,
        data: b,
        detail: [
          rupiah(b.nominal),
          b.metode,
          b.periode ? `Periode ${b.periode}` : null,
          b.catatan ? `Catatan: ${b.catatan}` : null,
        ]
          .filter(Boolean)
          .join(' — '),
      }),
  });
});

$('#newFormBtn').addEventListener('click', () => {
  $('#formResult').classList.add('hidden');
  $$('.form[data-tab-panel]').forEach((f) => f.classList.remove('hidden'));
});

$('#copyNomorBtn').addEventListener('click', async () => {
  const nomor = $('#resultNomor').textContent;
  try {
    await navigator.clipboard.writeText(nomor);
    toast('Nomor pengajuan disalin.');
  } catch {
    toast('Gagal menyalin. Salin manual: ' + nomor, true);
  }
});

/* ---------- QRIS iuran (dimuat saat bagian iuran terlihat) ---------- */
const qrisObserver = new IntersectionObserver(
  async (entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    qrisObserver.disconnect();
    try {
      const { qris_image } = await api('/api/qris');
      if (qris_image) {
        $('#iuranQrisImg').src = qris_image;
        $('#iuranQris').classList.remove('hidden');
      }
    } catch {
      /* QRIS belum dipasang — abaikan */
    }
  },
  { rootMargin: '200px' }
);
qrisObserver.observe($('#iuran'));

/* ---------- Lacak pengajuan ---------- */
const STATUS_LABEL = {
  menunggu: 'Menunggu',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
  diverifikasi: 'Terverifikasi',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const JENIS_ICON = { 'Surat Pengantar': '📄', 'Aduan Warga': '🛡️', 'Setoran Iuran': '💰', 'Tanda Terima Bansos': '🎁', 'Kejadian': '🚨' };

function renderTrack(d) {
  const buruk = d.status === 'ditolak';
  const setoran = d.jenis === 'Setoran Iuran';
  const tahap = setoran ? ['menunggu', 'diverifikasi'] : ['menunggu', 'diproses', 'selesai'];
  const labelLangkah = setoran
    ? ['Setoran dikirim warga', 'Diverifikasi bendahara']
    : ['Pengajuan diterima', 'Sedang diproses pengurus', 'Selesai diproses'];
  const idx = buruk ? tahap.indexOf('menunggu') : tahap.indexOf(d.status);
  const pct = Math.round(((Math.max(idx, 0) + 1) / tahap.length) * 100);
  const waktu = (iso) => `${tanggalPanjang(iso)} · ${jamWaktu(iso)}`;

  const icon = JENIS_ICON[d.jenis] || '📋';
  const kelasHero = buruk ? 'bad' : idx >= tahap.length - 1 ? 'done' : 'now';
  const labelHero = buruk ? 'Ditolak' : STATUS_LABEL[d.status] || d.status;

  const steps = tahap
    .map((s, i) => {
      const done = i < idx || (!buruk && idx === tahap.length - 1 && i === idx);
      const aktif = i === idx && !buruk;
      const waktuStep = i === 0 ? waktu(d.diajukan) : aktif ? `Diperbarui ${waktu(d.diperbarui)}` : '';
      return `<li class="step ${done ? 'done' : ''} ${aktif ? 'active' : ''} ${buruk ? 'faded' : ''}">
        <span class="step-dot">${done ? '✓' : i + 1}</span>
        <div class="step-body"><strong>${labelLangkah[i]}</strong>${waktuStep ? `<small>${waktuStep}</small>` : ''}</div>
      </li>`;
    })
    .join('');

  return `<div class="track-hero ${kelasHero}">
      <div class="track-hero-icon">${buruk ? '🚫' : kelasHero === 'done' ? '🎉' : '⏳'}</div>
      <div class="track-hero-text">
        <span class="track-jenis">${icon} ${esc(d.jenis)}</span>
        <h3 class="track-nomor">${esc(d.nomor)}</h3>
        <span class="track-badge">${labelHero}</span>
      </div>
    </div>
    ${
      buruk
        ? `<div class="track-reject"><strong>Pengajuan ini ditolak.</strong><p>${esc(d.catatan || 'Silakan hubungi pengurus RT untuk keterangan lebih lanjut.')}</p></div>`
        : `<div class="track-progress"><i style="width:${pct}%"></i></div>
    <ol class="track-steps">${steps}</ol>`
    }
    <div class="lacak-detail">
      <div><span>Nama</span><strong>${esc(d.nama)}</strong></div>
      <div><span>${setoran ? 'Rincian' : 'Jenis / Keterangan'}</span><strong>${esc(d.detail || '—')}</strong></div>
      ${d.nomor_surat ? `<div><span>Nomor Surat</span><strong>${esc(d.nomor_surat)}</strong></div>` : ''}
      <div><span>Diajukan</span><strong>${waktu(d.diajukan)}</strong></div>
      <div><span>Terakhir diperbarui</span><strong>${waktu(d.diperbarui)}</strong></div>
    </div>
    ${
      d.catatan && !buruk
        ? `<div class="track-note"><span class="track-note-icon">💬</span><div><strong>Catatan pengurus:</strong><p>${esc(d.catatan)}</p></div></div>`
        : ''
    }`;
}/* ---------- Lacak: interaksi (chip awalan, deteksi jenis, riwayat) ---------- */
const JENIS_AWALAN = {
  S: '📄 Pengajuan Surat Pengantar',
  A: '🛡️ Aduan / Laporan Warga',
  I: '💰 Setoran Iuran',
  BTS: '🎁 Tanda Terima Bansos',
  KJ: '🚨 Kejadian (dicek pengurus)',
};

function awalanDari(nomor) {
  const m = String(nomor || '').trim().toUpperCase().match(/^([A-Z]{1,3})/);
  if (!m) return null;
  if (m[1].startsWith('BTS')) return 'BTS';
  return ['S', 'A', 'I', 'KJ'].includes(m[1]) ? m[1] : null;
}

function formatNomorInput(v) {
  const x = v.toUpperCase().replace(/[^A-Z0-9]/g, ''); // buang spasi, dash, karakter aneh
  if (!x) return '';
  const p = ['BTS', 'KJ', 'S', 'A', 'I'].find((k) => x.startsWith(k) && (x.length === k.length || /[0-9]/.test(x[k.length])));
  if (!p) return x; // awalan belum dikenal — biarkan apa adanya
  const sisa = x.slice(p.length);
  if (!sisa) return `${p}-`;
  const tgl = sisa.slice(0, 6);      // YYMMDD
  const kode = sisa.slice(6, 10);    // 4 karakter kode unik
  return `${p}-${tgl}${kode ? `-${kode}` : ''}`;
}

function updateDetected() {
  const el = $('#lacakDetected');
  const nomor = $('#lacakNomor').value.trim();
  if (!nomor) {
    el.classList.add('hidden');
    return;
  }
  const p = awalanDari(nomor);
  const lengkap = (nomor.match(/-/g) || []).length >= 2 && nomor.length >= 13;
  el.classList.remove('hidden', 'warn');
  if (!p) {
    el.classList.add('warn');
    el.innerHTML = '⚠️ Awalan belum dikenal — klik salah satu chip di atas.';
  } else {
    el.innerHTML = `${JENIS_AWALAN[p]} — ${lengkap ? 'nomor siap dilacak ✓' : 'lanjutkan mengetik nomor lengkap…'}`;
  }
}

$('#lacakNomor').addEventListener('input', (e) => {
  const el = e.target;
  const posKursorAkhir = el.selectionStart === el.value.length;
  const baru = formatNomorInput(el.value);
  if (baru !== el.value) {
    el.value = baru;
    if (posKursorAkhir) el.setSelectionRange(baru.length, baru.length);
  }
  updateDetected();
});

/* Riwayat pemeriksaan terakhir (localStorage) */
const KEY_RIWAYAT = 'rt04_lacak_riwayat';
function bacaRiwayat() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY_RIWAYAT) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
function renderRiwayat() {
  const list = bacaRiwayat();
  const box = $('#lacakRiwayat');
  if (!list.length) {
    box.classList.add('hidden');
    return;
  }
  $('#lacakRiwayatChips').innerHTML = list
    .map(
      (x) => `<button type="button" class="chip riwayat-chip" data-nomor="${esc(x.nomor)}" title="${esc(x.jenis || '')} — ${STATUS_LABEL[x.status] || ''}">
        ${JENIS_ICON[x.jenis] || '📋'} ${esc(x.nomor)}</button>`
    )
    .join('');
  box.classList.remove('hidden');
}
function simpanRiwayat(nomor, d) {
  const lama = bacaRiwayat().filter((x) => x.nomor !== nomor);
  lama.unshift({ nomor, jenis: d.jenis, status: d.status, waktu: Date.now() });
  try {
    localStorage.setItem(KEY_RIWAYAT, JSON.stringify(lama.slice(0, 5)));
  } catch {
    /* penyimpanan penuh — abaikan */
  }
  renderRiwayat();
}

document.addEventListener('click', (e) => {
  const chipAwalan = e.target.closest('.lacak-chip');
  if (chipAwalan) {
    const inp = $('#lacakNomor');
    inp.value = chipAwalan.dataset.awalan + '-';
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    updateDetected();
    return;
  }
  const chipRiwayat = e.target.closest('.riwayat-chip');
  if (chipRiwayat) {
    $('#lacakNomor').value = chipRiwayat.dataset.nomor;
    updateDetected();
    $('#lacakForm').requestSubmit();
  }
});

$('#lacakForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nomor = $('#lacakNomor').value.trim().toUpperCase();
  if (!nomor) return;
  const btn = $('#lacakBtn');
  const teksBtn = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Mencari…';
  const box = $('#lacakResult');
  box.classList.remove('hidden');
  box.innerHTML = `<div class="track-skel" aria-label="Mencari pengajuan">
    <div class="skel skel-a"></div><div class="skel skel-b"></div><div class="skel skel-c"></div><div class="skel skel-d"></div>
    <div class="track-skel-text">Mencari pengajuan…</div>
  </div>`;
  try {
    const d = await api('/api/lacak', { method: 'POST', body: JSON.stringify({ nomor }) });
    box.innerHTML = renderTrack(d);
    box.insertAdjacentHTML('beforeend', panelPantau(d));
    simpanRiwayat(nomor, d);
  } catch (err) {
    box.innerHTML = `<div class="track-empty">
      <div class="track-empty-icon">🔎</div>
      <h4>Nomor tidak ditemukan</h4>
      <p>${esc(err.message)}</p>
      <p class="track-empty-hint">Contoh penulisan: <code>S-261024-1A2B</code> · awalan <strong>S</strong> surat, <strong>A</strong> aduan, <strong>I</strong> setoran, <strong>BTS</strong> tanda terima bansos.</p>
    </div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = teksBtn;
  }
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

renderRiwayat();
updateDetected();

/* ---------- Demografi warga & rumah ---------- */
function barisDemo(x, satuan = 'jiwa') {
  const p = Math.min(100, Number(x.persen) || 0);
  const pct = p.toLocaleString('id-ID', { maximumFractionDigits: 1 });
  return `<div class="demo-row">
    <div class="demo-row-top"><span>${esc(x.label)}</span><span><strong>${Number(x.jumlah || 0).toLocaleString('id-ID')}</strong> ${satuan} · ${pct}%</span></div>
    <div class="demo-bar"><i style="width:${p}%"></i></div>
  </div>`;
}

function isiDemo(sel, arr, satuan = 'jiwa') {
  const el = $(sel);
  if (!el) return;
  el.innerHTML = arr && arr.length
    ? arr.map((x) => barisDemo(x, satuan)).join('')
    : '<p class="muted">Belum ada data yang bisa ditampilkan.</p>';
}

/* Rekap warga: ringkasan jumlah kartu utama */
function renderRekap(d) {
  const el = $('#demoRekap');
  if (!el) return;
  const rows = [
    { label: 'Total Jiwa Warga', jumlah: Number(d.total_warga) || 0, satuan: 'jiwa' },
    { label: 'Rumah Terdata', jumlah: Number(d.total_rumah) || 0, satuan: 'unit' },
  ];
  const maks = Math.max(1, ...rows.map((r) => r.jumlah));
  el.innerHTML = rows.map((r) => barisDemo({ label: r.label, jumlah: r.jumlah, persen: (r.jumlah / maks) * 100 }, r.satuan)).join('');
}

/* Cashflow kas RT: pemasukan, pengeluaran, saldo */
function renderCashflow(cf) {
  const el = $('#demoCashflow');
  if (!el) return;
  if (!cf || (!cf.transaksi && !cf.pemasukan && !cf.pengeluaran)) {
    el.innerHTML = '<p class="muted">Belum ada transaksi kas yang tercatat.</p>';
    return;
  }
  const pctTeks = (p) => Math.min(100, Math.max(0, Number(p) || 0)).toLocaleString('id-ID', { maximumFractionDigits: 1 });
  const row = (label, nilai, persen, kelas) => `<div class="demo-row">
    <div class="demo-row-top"><span>${label}</span><span><strong>${rupiah(nilai)}</strong> · ${pctTeks(persen)}%</span></div>
    <div class="demo-bar ${kelas}"><i style="width:${Math.min(100, Math.max(0, Number(persen) || 0))}%"></i></div>
  </div>`;
  el.innerHTML =
    row('💰 Total Pemasukan', cf.pemasukan, 100, 'bar-masuk') +
    row('📤 Total Pengeluaran', cf.pengeluaran, cf.persen_pengeluaran, 'bar-keluar') +
    row('🏦 Saldo Kas', cf.saldo, cf.persen_saldo, 'bar-saldo') +
    `<p class="demo-cf-bulan">Bulan ini: <strong class="naik">+${rupiah(cf.bulan_ini_masuk)}</strong> masuk · <strong class="turun">−${rupiah(cf.bulan_ini_keluar)}</strong> keluar · ${Number(cf.transaksi || 0).toLocaleString('id-ID')} transaksi tercatat</p>`;
}

async function muatDemografi() {
  try {
    const d = await api('/api/demografi');
    const kosong = !d.total_warga && !d.total_rumah;
    $('#demografi').classList.remove('hidden');
    // Baris "jiwa" hanya untuk data penduduk; status rumah memakai "unit"
    isiDemo('#demoUsia', d.usia);
    isiDemo('#demoKelamin', d.kelamin);
    isiDemo('#demoDisabilitas', d.disabilitas);
    isiDemo('#demoPendidikan', d.pendidikan);
    isiDemo('#demoPekerjaan', d.pekerjaan);
    isiDemo('#demoPerkawinan', d.perkawinan);
    isiDemo('#demoTinggal', d.status_tinggal);
    isiDemo('#demoDomisili', d.domisili);
    isiDemo('#demoRumah', d.rumah, 'unit');
    // Kartu baru: agama, kendaraan, utilitas rumah, usaha, cctv, cashflow & perbandingan
    isiDemo('#demoAgama', d.agama);
    isiDemo('#demoKendaraan', d.kendaraan, 'rumah');
    isiDemo('#demoListrik', d.daya_listrik, 'rumah');
    isiDemo('#demoAir', d.sumber_air, 'rumah');
    isiDemo('#demoInternet', d.internet, 'rumah');
    isiDemo('#demoUsaha', d.usaha, 'rumah');
    isiDemo('#demoCctv', d.cctv, 'rumah');
    renderRekap(d);
    renderCashflow(d.cashflow);
    const cat = $('#demoCatatan');
    if (cat) {
      cat.textContent = kosong
        ? 'Belum ada data warga atau rumah. Angka dan persentase akan tampil otomatis setelah pengurus mengisi Data Warga & Rumah di panel pengurus.'
        : `Total ${Number(d.total_warga || 0).toLocaleString('id-ID')} jiwa warga dalam ${Number(d.total_rumah || 0).toLocaleString('id-ID')} rumah · diperbarui otomatis dari data pengurus.`;
    }
  } catch (e) {
    /* bagian demografi disembunyikan bila API gagal */
    const sec = $('#demografi');
    if (sec) sec.classList.add('hidden');
  }
}

/* ---------- Muat semua ---------- */
muatInfo();
muatPengumuman();
muatKas();
muatDemografi();

/* ---------- Interaktif: progres gulir, scrollspy, sorotan hero, tombol ke atas ---------- */
const progresEl = $('#scrollProgress');
const backTopEl = $('#backTop');
const navLinks = $$('#nav a');
const seksiNav = navLinks
  .map((a) => ({ a, el: document.querySelector(a.getAttribute('href') || '') }))
  .filter((x) => x.el);
let rafGulir = 0;
function perbaruiGulir() {
  rafGulir = 0;
  const doc = document.documentElement;
  const maks = doc.scrollHeight - window.innerHeight;
  const pct = maks > 0 ? Math.min(100, Math.max(0, (window.scrollY / maks) * 100)) : 0;
  if (progresEl) progresEl.style.width = `${pct}%`;
  if (backTopEl) backTopEl.classList.toggle('show', window.scrollY > 480);
  /* Scrollspy: sorot menu yang sedang terlihat */
  const batas = window.scrollY + 160;
  let aktif = seksiNav[0];
  for (const s of seksiNav) if (s.el.offsetTop <= batas) aktif = s;
  navLinks.forEach((a) => a.classList.toggle('active', !!aktif && a === aktif.a));
}
window.addEventListener(
  'scroll',
  () => {
    if (!rafGulir) rafGulir = requestAnimationFrame(perbaruiGulir);
  },
  { passive: true }
);
window.addEventListener('resize', perbaruiGulir, { passive: true });
perbaruiGulir();
if (backTopEl) backTopEl.addEventListener('click', () => window.scrollTo({ top: 0, behavior: kurangiGerak ? 'auto' : 'smooth' }));

/* Sorotan lampu mengikuti kursor pada hero (desktop dengan tetikus saja) */
const heroEl = document.querySelector('.hero');
const spotEl = $('#heroSpotlight');
if (heroEl && spotEl && !kurangiGerak && window.matchMedia('(pointer: fine)').matches) {
  let spotPertama = true;
  heroEl.addEventListener('pointermove', (e) => {
    const r = heroEl.getBoundingClientRect();
    spotEl.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
    if (spotPertama) {
      spotPertama = false;
      requestAnimationFrame(() => spotEl.classList.add('on'));
    }
  });
} else if (spotEl) {
  spotEl.classList.add('off');
}
