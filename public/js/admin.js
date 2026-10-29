/* ==========================================================
   RT 04 / RW 12 — Panel Pengurus (Admin)
   ========================================================== */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

let token = localStorage.getItem('rt04_token') || '';
let cache = { pengajuan: [], setoran: [], kas: [], info: null, settings: null };
let editCtx = null; // { jenis, id }
let qrisBaru = undefined; // undefined = tidak diubah; null = hapus; string = gambar baru
let logoBaru, logoLoginBaru, latarBaru, iconBaru, kopBaru, heroBaru; // sama: undefined = tak diubah
const tampilGambar = {}; // 'logo' | 'logoLogin' | 'latar' | 'icon' | 'kopSurat' → fn render pratinjau

const bacaFileData = (f) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error('Gagal membaca file.'));
    fr.readAsDataURL(f);
  });

function pasangFavicon(url) {
  if (!url) return;
  let l = document.querySelector('link[rel~="icon"]');
  if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
  l.href = url;
}

const rupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
function tanggalPendek(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
function tanggalPanjang(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
function toast(pesan, isError = false) {
  const el = $('#toast');
  el.textContent = pesan;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 401 && !path.endsWith('/login')) {
    logout(false);
    throw new Error('Sesi berakhir. Silakan masuk kembali.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Gagal (${res.status})`);
  return data;
}

/* ---------- Login / Logout ---------- */
function showApp() {
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  terapkanHak(hakSekarang());
  muatSemua();
}

function logout(notify = true) {
  token = '';
  localStorage.removeItem('rt04_token');
  localStorage.removeItem('rt04_user');
  $('#appView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
  if (notify) toast('Anda telah keluar.');
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#loginErr');
  err.classList.add('hidden');
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: $('#loginUser').value.trim(),
        password: $('#loginPass').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal masuk.');
    token = data.token;
    localStorage.setItem('rt04_token', token);
    localStorage.setItem('rt04_user', JSON.stringify(data.user || { nama: 'Admin Sistem', hak: HAK_SEMUA_UI }));
    if (data.peringatan) toast(data.peringatan);
    terapkanHak(hakSekarang());
    showApp();
  } catch (e2) {
    err.textContent = e2.message;
    err.classList.remove('hidden');
  }
});

$('#logoutBtn').addEventListener('click', () => logout());

/* ---------- Hak akses (otoritas pengguna panel) ---------- */
const HAK_SEMUA_UI = ['pengajuan', 'keuangan', 'data', 'bansos', 'inventaris', 'keamanan', 'pengumuman', 'laporan', 'pengaturan'];
const HAK_TAB = {
  pengajuan: 'pengajuan',
  keuangan: 'keuangan',
  data: 'data',
  denah: 'data',
  bansos: 'bansos',
  inventaris: 'inventaris',
  keamanan: 'keamanan',
  pengumuman: 'pengumuman',
  log: 'pengaturan',
  laporan: 'laporan',
  pengaturan: 'pengaturan',
};

function hakSekarang() {
  try {
    const u = JSON.parse(localStorage.getItem('rt04_user') || 'null');
    return Array.isArray(u?.hak) ? u.hak : HAK_SEMUA_UI;
  } catch {
    return HAK_SEMUA_UI;
  }
}

function terapkanHak(hak) {
  const daftar = Array.isArray(hak) ? hak : [];
  $$('.tab').forEach((t) => {
    const wajib = HAK_TAB[t.dataset.panel];
    if (wajib) t.classList.toggle('hidden', !daftar.includes(wajib));
  });
  const aktif = document.querySelector('.tab.active');
  if (aktif && aktif.classList.contains('hidden')) {
    const pertama = $$('.tab').find((t) => !t.classList.contains('hidden'));
    if (pertama) pertama.click();
  }
}

async function muatHak() {
  const { user } = await api('/api/admin/whoami');
  localStorage.setItem('rt04_user', JSON.stringify(user));
  terapkanHak(user.hak);
  return user;
}

/* ---------- Tab ---------- */
$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.panel').forEach((p) => p.classList.add('hidden'));
    $$('.panel-group').forEach((g) => g.classList.add('hidden'));
    $(`#panel-${tab.dataset.panel}`).classList.remove('hidden');
    if (tab.dataset.panel === 'pengaturan') {
      if (!cache.settings) muatSettings();
      if (!cache.users) muatUsers().catch((e) => toast(e.message, true));
    }
  });
});

/* ---------- Muat semua data ---------- */
async function muatSemua() {
  const hak = hakSekarang();
  try {
    const tugas = [muatInfo()];
    if (hak.includes('pengajuan')) tugas.push(muatPengajuan(), muatPesan());
    if (hak.includes('keuangan')) tugas.push(muatSetoran(), muatKasAdmin());
    await Promise.all(tugas);
    if (hak.includes('pengaturan') && !$('#pengurusRows').children.length) muatSettings();
  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------- Pengajuan ---------- */
const STATUS_LABEL = { menunggu: 'Menunggu', diproses: 'Diproses', selesai: 'Selesai', ditolak: 'Ditolak', diverifikasi: 'Terverifikasi' };

async function muatPengajuan() {
  const status = $('#filterStatus').value;
  const { pengajuan } = await api(`/api/admin/pengajuan${status ? `?status=${status}` : ''}`);
  cache.pengajuan = pengajuan;
  const body = $('#pengajuanBody');
  if (!pengajuan.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">Tidak ada pengajuan.</td></tr>';
  } else {
    body.innerHTML = pengajuan
      .map((p) => {
        const detail = p.jenis === 'surat' ? p.jenis_surat : p.kategori;
        const keperluan = p.jenis === 'surat' ? p.keperluan : p.isi;
        return `<tr>
          <td>${tanggalPendek(p.created_at)}</td>
          <td><strong>${esc(p.nomor)}</strong>${p.nomor_surat ? `<br /><small class="muted">${esc(p.nomor_surat)}</small>` : ''}</td>
          <td><span class="badge jenis">${p.jenis === 'surat' ? '📄 Surat' : '🛡️ Aduan'}</span></td>
          <td>${esc(p.nama)}<br /><small class="muted">${esc(p.blok)} · ${esc(p.no_hp)}</small></td>
          <td><strong>${esc(detail)}</strong><br /><small class="muted">${esc((keperluan || '').slice(0, 90))}${(keperluan || '').length > 90 ? '…' : ''}</small></td>
          <td><span class="badge ${p.status}">${STATUS_LABEL[p.status]}</span></td>
          <td class="aksi-pengajuan">
            <button class="btn btn-ghost btn-sm" data-edit="${p.jenis}:${p.id}" title="Edit pengajuan (status, catatan, nomor surat)" aria-label="Edit pengajuan">✏️</button>
            <button class="btn btn-ghost btn-sm" data-hapus-pengajuan="${p.jenis}:${p.id}" title="Hapus pengajuan ini" aria-label="Hapus pengajuan">🗑️</button>
            <button class="btn btn-ghost btn-sm" data-email-pengajuan="${p.jenis}:${p.id}" title="Kirim email ke warga pemohon" aria-label="Kirim email">✉️</button>
          </td>
        </tr>`;
      })
      .join('');
  }
  const menunggu = pengajuan.filter((p) => p.status === 'menunggu').length;
  $('#stMenunggu').textContent = menunggu;
  $('#stTotal').textContent = pengajuan.length;
}

$('#filterStatus').addEventListener('change', muatPengajuan.catch ? muatPengajuan : null);
$('#filterStatus').addEventListener('change', () => muatPengajuan().catch((e) => toast(e.message, true)));
$('#reloadPengajuan').addEventListener('click', () => muatPengajuan().then(() => toast('Data dimuat ulang.')).catch((e) => toast(e.message, true)));

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-edit]');
  if (!btn) return;
  const [jenis, id] = btn.dataset.edit.split(':');
  bukaEdit(jenis, Number(id));
});

/* Hapus pengajuan dari tabel */
document.addEventListener('click', async (e) => {
  const del = e.target.closest('[data-hapus-pengajuan]');
  if (!del) return;
  const [jenis, idStr] = del.dataset.hapusPengajuan.split(':');
  const p = (cache.pengajuan || []).find((x) => x.jenis === jenis && x.id === Number(idStr));
  if (!p) return;
  const jenisLabel = p.jenis === 'surat' ? 'pengajuan surat' : 'aduan warga';
  if (!confirm(`Hapus ${jenisLabel} ${p.nomor} atas nama ${p.nama}?\n\nData yang dihapus tidak dapat dikembalikan.`)) return;
  try {
    const res = await api(`/api/admin/pengajuan/${jenis}/${idStr}`, { method: 'DELETE' });
    toast(res.pesan || 'Pengajuan dihapus.');
    await muatPengajuan();
  } catch (err) {
    toast(err.message, true);
  }
});

/* Komposer Kirim Email pengajuan */
document.addEventListener('click', (e) => {
  const mail = e.target.closest('[data-email-pengajuan]');
  if (!mail) return;
  const [jenis, idStr] = mail.dataset.emailPengajuan.split(':');
  bukaEmailPengajuan(jenis, Number(idStr));
});

function bukaEmailPengajuan(jenis, id) {
  const p = (cache.pengajuan || []).find((x) => x.jenis === jenis && x.id === id);
  if (!p) return;
  const jenisLabel = jenis === 'surat' ? `Pengajuan Surat — ${p.jenis_surat}` : `Aduan Warga — ${p.kategori}`;
  const statusLabel = STATUS_LABEL[p.status] || p.status;
  const detail = jenis === 'surat'
    ? `Jenis surat : ${p.jenis_surat}\nKeperluan : ${p.keperluan}` + (p.nomor_surat ? `\nNomor surat resmi : ${p.nomor_surat}` : '')
    : `Kategori : ${p.kategori}\nLokasi : ${p.lokasi || '—'}\nIsi laporan : ${p.isi}`;
  const isi = [
    'Assalamualaikum warahmatullahi wabarakatuh / Salam sejahtera,',
    '',
    `Yth. Bapak/Ibu/Saudara/i ${p.nama}`,
    `Blok ${p.blok}`,
    '',
    'Bersama ini kami sampaikan informasi mengenai pengajuan Anda pada Layanan RT Terpadu RT 04 / RW 12 Perum Taman Buah Sukamantri:',
    '',
    `Nomor pengajuan : ${p.nomor}`,
    `Jenis : ${jenisLabel}`,
    `Tanggal pengajuan : ${tanggalPanjang(p.created_at)}`,
    detail,
    `Status saat ini : ${statusLabel}`,
    p.catatan_admin ? `Catatan pengurus : ${p.catatan_admin}` : '',
    '',
    'Untuk pertanyaan silakan membalas email ini atau menghubungi pengurus RT 04 / RW 12. Terima kasih atas kepercayaan Anda.',
    '',
    'Hormat kami,',
    'Pengurus RT 04 / RW 12',
    'Perum Taman Buah Sukamantri — Kec. Pasar Kemis, Kab. Tangerang',
  ].join('\n');
  $('#emailTitle').textContent = `✉️ Kirim Email — ${p.nomor}`;
  $('#emailTo').value = p.email || '';
  $('#emailSubject').value = `[${p.nomor}] ${jenisLabel} — Status: ${statusLabel}`;
  $('#emailBody').value = isi;
  $('#emailModal').classList.remove('hidden');
}

$('#emailClose').addEventListener('click', () => $('#emailModal').classList.add('hidden'));
$('#emailModal').addEventListener('click', (e) => {
  if (e.target.id === 'emailModal') $('#emailModal').classList.add('hidden');
});

$('#emailSend').addEventListener('click', () => {
  const to = $('#emailTo').value.trim();
  const sub = $('#emailSubject').value.trim();
  if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    toast('Alamat email tidak valid.', true);
    return;
  }
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent($('#emailBody').value)}`;
  toast('Aplikasi email dibuka dengan isi yang sudah tersusun — tinjau lalu tekan Kirim.');
});

$('#emailCopy').addEventListener('click', async () => {
  const text = `Kepada: ${$('#emailTo').value.trim()}\nPerihal: ${$('#emailSubject').value.trim()}\n\n${$('#emailBody').value}`;
  try {
    await navigator.clipboard.writeText(text);
    toast('Isi email disalin ke papan klip.');
    return;
  } catch {
    /* jatuh ke cara lama di bawah */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    toast(ok ? 'Isi email disalin ke papan klip.' : 'Gagal menyalin — pilih teks secara manual.', !ok);
  } catch {
    toast('Gagal menyalin — pilih teks secara manual.', true);
  }
});

function bukaEdit(jenis, id) {
  const p = cache.pengajuan.find((x) => x.jenis === jenis && x.id === id);
  if (!p) return;
  editCtx = { jenis, id };
  $('#editTitle').textContent = jenis === 'surat' ? `Pengajuan Surat — ${p.nomor}` : `Aduan Warga — ${p.nomor}`;
  $('#editStatus').value = p.status;
  $('#editCatatan').value = p.catatan_admin || '';
  $('#editNomorSuratField').classList.toggle('hidden', jenis !== 'surat');
  $('#editNomorSurat').value = p.nomor_surat || '';
  $('#editPrint').classList.toggle('hidden', jenis !== 'surat');
  $('#editDetail').innerHTML =
    (jenis === 'surat'
      ? `
        <div><span>Jenis Surat</span><strong>${esc(p.jenis_surat)}</strong></div>
        <div><span>Keperluan</span><strong>${esc(p.keperluan)}</strong></div>
        <div><span>NIK</span><strong>${esc(p.nik || '—')}</strong></div>`
      : `
        <div><span>Kategori</span><strong>${esc(p.kategori)}</strong></div>
        <div><span>Lokasi</span><strong>${esc(p.lokasi || '—')}</strong></div>
        <div><span>Isi Laporan</span><strong>${esc(p.isi)}</strong></div>`) +    `<div><span>Nama</span><strong>${esc(p.nama)}</strong></div>
    <div><span>Blok</span><strong>${esc(p.blok)}</strong></div>
    <div><span>No. HP</span><strong>${esc(p.no_hp)}</strong></div>
    <div><span>Diajukan</span><strong>${tanggalPanjang(p.created_at)}</strong></div>`;
  const waAktif = (() => {
    try { return JSON.parse(cache.settings?.notifikasi || '{}').wa_warga !== false; } catch { return true; }
  })();
  $('#editWa').classList.toggle('hidden', !(waAktif && normalisasiWa(p.no_hp)));
  $('#editModal').classList.remove('hidden');
}

/* Notifikasi status ke WhatsApp warga pemohon */
const STATUS_NOTIF = {
  menunggu: '📨 Pengajuan *diterima* dan sedang menunggu antrean proses pengurus (tanpa antre di loket).',
  diproses: '⚙️ Pengajuan Anda *sedang diproses* pengurus RT.',
  selesai: '✅ Pengajuan Anda *SELESAI* diproses. Terima kasih atas kesabarannya.',
  ditolak: '⚠️ Pengajuan Anda *ditolak* pengurus RT.',
  diverifikasi: '✅ Setoran Anda *sudah diverifikasi* bendahara RT.',
};

$('#editWa').addEventListener('click', () => {
  if (!editCtx) return;
  const p = cache.pengajuan.find((x) => x.jenis === editCtx.jenis && x.id === editCtx.id);
  if (!p) return;
  const target = normalisasiWa(p.no_hp);
  if (!target) return toast('Warga ini tidak punya nomor WhatsApp.', true);
  const status = $('#editStatus').value;
  const teks = [
    '📨 *NOTIFIKASI STATUS PENGAJUAN RT 04 / RW 12*',
    'Perum Taman Buah Sukamantri',
    '————————————————',
    `Nomor: *${p.nomor}*`,
    `Jenis: ${p.jenis === 'surat' ? p.jenis_surat : p.kategori || 'Aduan Warga'}`,
    `Nama: ${p.nama}`,
    STATUS_NOTIF[status] || `Status: ${STATUS_LABEL[status] || status}`,
    $('#editCatatan').value.trim() ? `Catatan pengurus: ${$('#editCatatan').value.trim()}` : null,
    '————————————————',
    'Lacak status kapan saja lewat menu Lacak Pengajuan di website RT 04 — urusan RT tanpa antre.',
  ]
    .filter(Boolean)
    .join('\n');
  window.open(`https://wa.me/${target}?text=${encodeURIComponent(teks)}`, '_blank', 'noopener');
  toast('Notifikasi WhatsApp siap dikirim ke warga.');
});

$('#editClose').addEventListener('click', () => $('#editModal').classList.add('hidden'));
$('#editModal').addEventListener('click', (e) => {
  if (e.target.id === 'editModal') $('#editModal').classList.add('hidden');
});

$('#editSave').addEventListener('click', async () => {
  if (!editCtx) return;
  try {
    const body = {
      status: $('#editStatus').value,
      catatan_admin: $('#editCatatan').value,
    };
    if (editCtx.jenis === 'surat' && $('#editNomorSurat').value.trim()) {
      body.nomor_surat = $('#editNomorSurat').value.trim();
    }
    await api(`/api/admin/pengajuan/${editCtx.jenis}/${editCtx.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    toast('Pengajuan diperbarui.');
    $('#editModal').classList.add('hidden');
    await muatPengajuan();
  } catch (e) {
    toast(e.message, true);
  }
});

/* ---------- Cetak Surat Pengantar ---------- */
async function muatInfo() {
  const res = await fetch('/api/info');
  cache.info = await res.json();
  const info = cache.info || {};
  if (info.logo_login) $('#loginBadge').innerHTML = `<img class="brand-logo" src="${info.logo_login}" alt="Logo RT 04" />`;
  if (info.icon_site) pasangFavicon(info.icon_site);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function nomorSuratOtomatis() {
  const d = new Date();
  return `${String(d.getDate()).padStart(3, '0')}/RT.04/RW.12/TBS/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

$('#editPrint').addEventListener('click', async () => {
  if (!editCtx || editCtx.jenis !== 'surat') return;
  const p = cache.pengajuan.find((x) => x.id === editCtx.id);
  if (!p) return;
  if (!cache.info) await muatInfo();
  const profil = cache.info?.profil || {};
  const kontak = cache.info?.kontak || {};
  const pengurus = cache.info?.pengurus || [];
  const ketua = pengurus.find((x) => /ketua/i.test(x.jabatan)) || pengurus[0] || { nama: '..............................' };
  const nomor = p.nomor_surat || nomorSuratOtomatis();
  const alamat = [profil.perumahan, `RT 04 / RW 12`, profil.desa, profil.kecamatan, profil.kabupaten].filter(Boolean).join(', ');

  $('#printArea').innerHTML = `
    <div class="surat">
      ${cache.settings?.kop_surat ? `<div class="surat-kop-gambar"><img src="${cache.settings.kop_surat}" alt="Kop Surat RT 04 / RW 12" /></div>` : ''}
      <div class="surat-kop">
        <h1>PEMERINTAH KABUPATEN TANGERANG</h1>
        <h2>KECAMATAN PASAR KEMIS · DESA ${esc((profil.desa || 'SUKAMANTRI').toUpperCase())}</h2>
        <h2>RUKUN TETANGGA 04 — RUKUN WARGA 12</h2>
        <p>${esc(alamat)}</p>
        <p>${kontak.email ? 'Email: ' + esc(kontak.email) : ''}</p>
      </div>
      <div class="surat-title">
        <h3>SURAT PENGANTAR</h3>
        <p>Nomor: ${esc(nomor)}</p>
      </div>
      <div class="surat-body">
        <p>Yang bertanda tangan di bawah ini, Ketua RT 04 / RW 12 ${esc(profil.perumahan || '')}, dengan ini menerangkan bahwa:</p>
        <ol>
          <li>Nama&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>${esc(p.nama)}</strong></li>
          <li>NIK&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${esc(p.nik || '....................................')}</li>
          <li>Alamat&nbsp;&nbsp;: ${esc(p.blok)}, ${esc(profil.perumahan || '')}, RT 04 / RW 12, ${esc(profil.desa || '')}, ${esc(profil.kecamatan || '')}, ${esc(profil.kabupaten || '')}</li>
        </ol>
        <p>Bahwa orang tersebut benar-benar merupakan warga kami dan berkepentingan untuk <strong>${esc(p.keperluan)}</strong> sehubungan dengan keperluan <strong>${esc(p.jenis_surat)}</strong>.</p>
        <p>Demikian surat pengantar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
      </div>
      <div class="surat-ttd">
        <div class="block">
          <p>${esc(profil.kabupaten || 'Kabupaten Tangerang')}, ${tanggalPanjang(new Date().toISOString())}</p>
          <p>Ketua RT 04 / RW 12</p>
          <p class="nama">${esc(ketua.nama)}</p>
        </div>
      </div>
    </div>`;
  $('#printArea').dataset.nomor = nomor;
  window.print();
  toast(`Surat dicetak dengan nomor ${nomor}.`);
});

/* ---------- Setoran ---------- */
async function muatSetoran() {
  const status = $('#filterSetoran').value;
  const { setoran } = await api(`/api/admin/setoran${status ? `?status=${status}` : ''}`);
  cache.setoran = setoran;
  const body = $('#setoranBody');
  if (!setoran.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">Tidak ada setoran.</td></tr>';
  } else {
    body.innerHTML = setoran
      .map((s) => {
        let aksi = '—';
        if (s.status === 'menunggu') {
          aksi = `<button class="btn btn-sm" data-verif="${s.id}">✔ Verifikasi</button>
                  <button class="btn btn-danger btn-sm" data-tolak-setoran="${s.id}">✕ Tolak</button>`;
        }
        return `<tr>
          <td>${tanggalPendek(s.created_at)}</td>
          <td><strong>${esc(s.nomor)}</strong></td>
          <td>${esc(s.nama)}</td>
          <td>${esc(s.blok)}</td>
          <td><strong>${rupiah(s.nominal)}</strong>${s.periode ? `<br /><small class="muted">${esc(s.periode)}</small>` : ''}</td>
          <td>${esc(s.metode)}${s.ada_bukti ? `<br /><button class="btn btn-sm" type="button" data-bukti="${s.id}">🧾 Bukti</button>` : ''}</td>
          <td><span class="badge ${s.status}">${STATUS_LABEL[s.status]}</span></td>
          <td style="white-space:nowrap">${aksi}</td>
        </tr>`;
      })
      .join('');
  }
  $('#stSetoran').textContent = setoran.filter((s) => s.status === 'menunggu').length;
}

$('#filterSetoran').addEventListener('change', () => muatSetoran().catch((e) => toast(e.message, true)));
$('#reloadSetoran').addEventListener('click', () => muatSetoran().then(() => toast('Data dimuat ulang.')).catch((e) => toast(e.message, true)));

document.addEventListener('click', async (e) => {
  const v = e.target.closest('[data-verif]');
  const t = e.target.closest('[data-tolak-setoran]');
  const bk = e.target.closest('[data-bukti]');
  if (bk) {
    try {
      const res = await fetch(`/api/admin/setoran/${bk.dataset.bukti}/bukti`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Bukti bayar tidak tersedia.');
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { toast(err.message, true); }
  }
  if (v) {
    try {
      await api(`/api/admin/setoran/${v.dataset.verif}`, { method: 'PATCH', body: JSON.stringify({ status: 'diverifikasi' }) });
      toast('Setoran diverifikasi & masuk buku kas.');
      await Promise.all([muatSetoran(), muatKasAdmin()]);
    } catch (err) { toast(err.message, true); }
  }
  if (t) {
    if (!confirm('Tandai setoran ini sebagai DITOLAK?')) return;
    try {
      await api(`/api/admin/setoran/${t.dataset.tolakSetoran}`, { method: 'PATCH', body: JSON.stringify({ status: 'ditolak' }) });
      toast('Setoran ditandai ditolak.');
      await muatSetoran();
    } catch (err) { toast(err.message, true); }
  }
});

/* ---------- Kas ---------- */
async function muatKasAdmin() {
  const [{ transaksi }] = await Promise.all([api('/api/admin/kas')]);
  cache.kas = transaksi;
  const masuk = transaksi.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.nominal, 0);
  const keluar = transaksi.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.nominal, 0);
  $('#kMasuk').textContent = rupiah(masuk);
  $('#kKeluar').textContent = rupiah(keluar);
  $('#kSaldo').textContent = rupiah(masuk - keluar);
  $('#stSaldo').textContent = rupiah(masuk - keluar);

  const body = $('#kasBodyAdmin');
  if (!transaksi.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Belum ada transaksi.</td></tr>';
    return;
  }
  body.innerHTML = transaksi
    .map(
      (t) => `<tr>
        <td>${tanggalPendek(t.tanggal)}</td>
        <td>${esc(t.keterangan)}${t.setoran_id ? ' <span class="badge jenis">setoran</span>' : ''}</td>
        <td class="right" style="color:var(--green-700);font-weight:700">${t.jenis === 'masuk' ? rupiah(t.nominal) : '—'}</td>
        <td class="right" style="color:var(--danger);font-weight:700">${t.jenis === 'keluar' ? rupiah(t.nominal) : '—'}</td>
        <td>${t.setoran_id ? '' : `<button class="btn btn-danger btn-sm" data-del-kas="${t.id}">Hapus</button>`}</td>
      </tr>`
    )
    .join('');
}

$('#reloadKas').addEventListener('click', () => muatKasAdmin().then(() => toast('Kas dimuat ulang.')).catch((e) => toast(e.message, true)));

$('#kasForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(e.target).entries());
    await api('/api/admin/kas', { method: 'POST', body: JSON.stringify(body) });
    e.target.reset();
    e.target.querySelector('[name="tanggal"]').value = new Date().toISOString().slice(0, 10);
    toast('Transaksi kas dicatat.');
    await muatKasAdmin();
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del-kas]');
  if (!b) return;
  if (!confirm('Hapus transaksi ini?')) return;
  try {
    await api(`/api/admin/kas/${b.dataset.delKas}`, { method: 'DELETE' });
    toast('Transaksi dihapus.');
    await muatKasAdmin();
  } catch (err) { toast(err.message, true); }
});

/* ---- Iuran Tahunan Warga ---- */
const IT_STATUS_LABEL = { lunas: 'Lunas', belum: 'Belum Bayar' };
const IT_METODE_LABEL = { tunai: 'Tunai', transfer: 'Transfer', qris: 'QRIS', setor_bank: 'Setor Bank' };
const itStatusLabel = (s) => IT_STATUS_LABEL[s] || s;
const itMetodeLabel = (m) => IT_METODE_LABEL[m] || m || '—';

async function muatPilihanWargaIuran() {
  await muatWarga(); // selalu muat ulang agar pilihan warga terkini
  const sel = $('#itWarga');
  const pilihan = sel.value;
  sel.innerHTML =
    '<option value="">— Pilih warga —</option>' +
    (cache.warga || [])
      .map((w) => `<option value="${w.id}">${esc(w.nama)} — ${esc(w.blok)}</option>`)
      .join('');
  if (pilihan) sel.value = pilihan;
}

async function muatIuranTahunan() {
  const params = new URLSearchParams();
  const tahun = $('#filterTahunIuran').value;
  const status = $('#filterIuranTahunan').value;
  const q = $('#cariIuranTahunan').value.trim();
  if (tahun) params.set('tahun', tahun);
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  const [res] = await Promise.all([api(`/api/admin/iuran-tahunan?${params}`), muatPilihanWargaIuran()]);
  cache.iuranTahunan = res.iuran;
  const r = res.ringkasan;

  // daftar pilihan tahun
  const selTahun = $('#filterTahunIuran');
  const daftar = [...new Set([...(res.tahun_daftar || []), new Date().getFullYear()])].sort((a, b) => b - a);
  selTahun.innerHTML = daftar.map((t) => `<option value="${t}">${t}</option>`).join('');
  selTahun.value = String(r.tahun);

  $('#itTerkumpul').textContent = rupiah(r.terkumpul);
  $('#itTarget').textContent = rupiah(r.target);
  $('#itLunasBelum').textContent = `${r.lunas} / ${r.belum}`;
  if (!$('#itGenTahun').value) $('#itGenTahun').value = String(r.tahun);
  if (!$('#itGenNominal').value) $('#itGenNominal').value = '150000';

  const body = $('#iuranTahunanBody');
  if (!res.iuran.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">Belum ada data iuran tahunan tahun ini. Gunakan <strong>Buat Daftar</strong> di atas atau catat pembayaran manual di formulir.</td></tr>';
  } else {
    body.innerHTML = res.iuran
      .map((i) => {
        const aksi = `<button class="btn btn-sm" data-it-toggle="${i.id}" data-status="${i.status === 'lunas' ? 'belum' : 'lunas'}">
            ${i.status === 'lunas' ? '↺ Tandai Belum' : '✔ Tandai Lunas'}</button>
          <button class="btn btn-danger btn-sm" data-it-hapus="${i.id}">Hapus</button>`;
        return `<tr>
          <td>${i.nama ? `<strong>${esc(i.nama)}</strong>` : '<span class="muted">Warga terhapus</span>'}</td>
          <td>${esc(i.blok || '—')}</td>
          <td>${i.tahun}</td>
          <td class="right"><strong>${rupiah(i.nominal)}</strong></td>
          <td>${i.tanggal ? tanggalPendek(i.tanggal) : '—'}</td>
          <td>${i.status === 'lunas' ? itMetodeLabel(i.metode) : '—'}${i.keterangan ? `<br /><small class="muted">${esc(i.keterangan)}</small>` : ''}</td>
          <td><span class="badge ${i.status}">${itStatusLabel(i.status)}</span></td>
          <td style="white-space:nowrap">${aksi}</td>
        </tr>`;
      })
      .join('');
  }
}

const itMuatUlang = () => muatIuranTahunan().catch((e) => toast(e.message, true));
$('#reloadIuranTahunan').addEventListener('click', () => itMuatUlang());
$('#filterIuranTahunan').addEventListener('change', itMuatUlang);
$('#filterTahunIuran').addEventListener('change', itMuatUlang);
let itTimer;
$('#cariIuranTahunan').addEventListener('input', () => {
  clearTimeout(itTimer);
  itTimer = setTimeout(itMuatUlang, 350);
});

// Buat daftar iuran tahunan untuk semua warga
$('#itGenerate').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/iuran-tahunan/generate', {
      method: 'POST',
      body: JSON.stringify({ tahun: Number($('#itGenTahun').value), nominal: Number($('#itGenNominal').value) }),
    });
    toast(res.pesan);
    await muatIuranTahunan();
  } catch (err) { toast(err.message, true); }
});

// Catat pembayaran (langsung lunas + masuk buku kas)
$('#iuranTahunanForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    const res = await api('/api/admin/iuran-tahunan', {
      method: 'POST',
      body: JSON.stringify({
        warga_id: Number(f.elements['warga_id'].value),
        tahun: Number(f.elements['tahun'].value),
        nominal: Number(f.elements['nominal'].value),
        metode: f.elements['metode'].value,
        tanggal: f.elements['tanggal'].value || undefined,
        keterangan: f.elements['keterangan'].value,
      }),
    });
    toast(res.pesan || 'Pembayaran iuran tahunan tercatat.');
    f.reset();
    await muatIuranTahunan();
  } catch (err) { toast(err.message, true); }
});

// Aksi baris: tandai lunas/belum & hapus
document.addEventListener('click', async (e) => {
  const tg = e.target.closest('[data-it-toggle]');
  if (tg) {
    try {
      const res = await api(`/api/admin/iuran-tahunan/${tg.dataset.itToggle}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: tg.dataset.status }),
      });
      toast(res.pesan);
      await muatIuranTahunan();
    } catch (err) { toast(err.message, true); }
    return;
  }
  const hp = e.target.closest('[data-it-hapus]');
  if (!hp) return;
  if (!confirm('Hapus data iuran tahunan ini? Catatan kasnya ikut dihapus.')) return;
  try {
    await api(`/api/admin/iuran-tahunan/${hp.dataset.itHapus}`, { method: 'DELETE' });
    toast('Data iuran tahunan dihapus.');
    await muatIuranTahunan();
  } catch (err) { toast(err.message, true); }
});

/* ---------- Pengumuman ---------- */
const KATEGORI_LABEL = { pengumuman: 'Pengumuman', agenda: 'Agenda', ronda: 'Ronda', kerja_bakti: 'Kerja Bakti' };

async function muatPengumumanAdmin() {
  const { pengumuman } = await api('/api/admin/pengumuman');
  const box = $('#pengumumanAdminList');
  if (!pengumuman.length) {
    box.innerHTML = '<div class="empty">Belum ada pengumuman.</div>';
    return;
  }
  box.innerHTML = pengumuman
    .map(
      (p) => `<div class="pengumuman-item ${p.published ? '' : 'off'}">
        <div>
          <span class="badge jenis">${KATEGORI_LABEL[p.kategori] || p.kategori}</span>
          <h4>${esc(p.judul)} ${p.published ? '' : '<span class="badge ditolak">disembunyikan</span>'}</h4>
          <p>${esc((p.isi || '').slice(0, 160))}${(p.isi || '').length > 160 ? '…' : ''}</p>
          ${p.tanggal ? `<small class="muted">📅 ${tanggalPanjang(p.tanggal)}</small>` : ''}
        </div>
        <div class="pengumuman-actions">
          <button class="btn btn-ghost btn-sm" data-toggle-peng="${p.id}" data-published="${p.published}">${p.published ? 'Sembunyikan' : 'Terbitkan'}</button>
          <button class="btn btn-danger btn-sm" data-del-peng="${p.id}">Hapus</button>
        </div>
      </div>`
    )
    .join('');
}

$('#pengumumanForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const body = Object.fromEntries(new FormData(e.target).entries());
    await api('/api/admin/pengumuman', { method: 'POST', body: JSON.stringify(body) });
    e.target.reset();
    toast('Pengumuman diterbitkan.');
    await muatPengumumanAdmin();
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const tog = e.target.closest('[data-toggle-peng]');
  const del = e.target.closest('[data-del-peng]');
  if (tog) {
    try {
      await api(`/api/admin/pengumuman/${tog.dataset.togglePeng}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: tog.dataset.published !== '1' && tog.dataset.published !== 'true' ? true : false }),
      });
      await muatPengumumanAdmin();
    } catch (err) { toast(err.message, true); }
  }
  if (del) {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
      await api(`/api/admin/pengumuman/${del.dataset.delPeng}`, { method: 'DELETE' });
      toast('Pengumuman dihapus.');
      await muatPengumumanAdmin();
    } catch (err) { toast(err.message, true); }
  }
});

/* ---------- Pengaturan ---------- */
function barisPengurus(p = {}) {
  const div = document.createElement('div');
  div.className = 'pengurus-row';
  div.innerHTML = `
    <div class="field"><label>Jabatan</label><input type="text" class="p-jab" value="${esc(p.jabatan || '')}" placeholder="Ketua RT" /></div>
    <div class="field"><label>Nama</label><input type="text" class="p-nama" value="${esc(p.nama || '')}" placeholder="Bpk. ..." /></div>
    <div class="field"><label>No. HP</label><input type="text" class="p-hp" value="${esc(p.hp || '')}" placeholder="08xx-xxxx-xxxx" /></div>
    <div class="field"><label>Periode</label><input type="text" class="p-per" value="${esc(p.periode || '')}" placeholder="2024–2027" /></div>
    <button class="btn btn-danger btn-sm" type="button" data-del-pengurus>Hapus</button>`;
  div.querySelector('[data-del-pengurus]').addEventListener('click', () => div.remove());
  return div;
}

/* ---------- QRIS ---------- */
function tampilkanQris(v) {
  const prev = $('#qrisPrev');
  if (v) {
    $('#qrisPrevImg').src = v;
    prev.classList.remove('hidden');
    $('#qrisRemove').classList.remove('hidden');
  } else {
    $('#qrisPrevImg').removeAttribute('src');
    prev.classList.add('hidden');
    $('#qrisRemove').classList.add('hidden');
  }
}

$('#setQris').addEventListener('change', async () => {
  const f = $('#setQris').files[0];
  if (!f) return;
  try {
    if (f.size > 580 * 1024) throw new Error('Ukuran gambar QRIS maksimal 580 KB.');
    qrisBaru = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Gagal membaca gambar.'));
      r.readAsDataURL(f);
    });
    tampilkanQris(qrisBaru);
  } catch (e) {
    toast(e.message, true);
    $('#setQris').value = '';
  }
});

$('#qrisRemove').addEventListener('click', () => {
  qrisBaru = null;
  tampilkanQris('');
  $('#setQris').value = '';
});

/* ---------- Tema, warna, latar, logo & ikon ---------- */
function hubungkanGambar(idInput, idPrev, idRemove, maksByte, setNilai) {
  const input = $(idInput);
  const prev = $(idPrev);
  const prevImg = prev.querySelector('img');
  const btn = $(idRemove);
  const tampil = (v) => {
    if (v) {
      prevImg.src = v;
      prev.classList.remove('hidden');
      btn.classList.remove('hidden');
    } else {
      prevImg.removeAttribute('src');
      prev.classList.add('hidden');
      btn.classList.add('hidden');
    }
  };
  input.addEventListener('change', async () => {
    const f = input.files[0];
    if (!f) return;
    try {
      if (f.size > maksByte) {
        throw new Error(`Ukuran gambar maksimal ${Math.round((maksByte * 3) / 4 / 1024)} KB.`);
      }
      const v = await bacaFileData(f);
      setNilai(v);
      tampil(v);
    } catch (e) {
      toast(e.message, true);
      input.value = '';
    }
  });
  btn.addEventListener('click', () => {
    setNilai(null);
    tampil('');
    input.value = '';
  });
  return tampil;
}

tampilGambar.logo = hubungkanGambar('#setLogo', '#logoPrev', '#logoRemove', 300 * 1024, (v) => (logoBaru = v));
tampilGambar.logoLogin = hubungkanGambar('#setLogoLogin', '#logoLoginPrev', '#logoLoginRemove', 300 * 1024, (v) => (logoLoginBaru = v));
tampilGambar.latar = hubungkanGambar('#setLatar', '#latarPrev', '#latarRemove', 525 * 1024, (v) => (latarBaru = v));
tampilGambar.icon = hubungkanGambar('#setIcon', '#iconPrev', '#iconRemove', 150 * 1024, (v) => (iconBaru = v));
tampilGambar.hero = hubungkanGambar('#setHero', '#heroPrev', '#heroRemove', 525 * 1024, (v) => (heroBaru = v));
tampilGambar.kopSurat = hubungkanGambar('#setKopSurat', '#kopSuratPrev', '#kopSuratRemove', 450 * 1024, (v) => (kopBaru = v));

async function muatSettings() {
  try {
    const { settings } = await api('/api/admin/settings');
    cache.settings = settings;
    const parse = (k, fb) => { try { return JSON.parse(settings[k]); } catch { return fb; } };
    const profil = parse('profil', {});
    const stats = parse('stats', {});
    const kontak = parse('kontak', {});
    const pengurus = parse('pengurus', []);

    $('#setPerum').value = profil.perumahan || '';
    $('#setDesa').value = profil.desa || '';
    $('#setKec').value = profil.kecamatan || '';
    $('#setKab').value = profil.kabupaten || '';
    $('#setPos').value = profil.kode_pos || '';
    $('#setRumah').value = stats.rumah || 0;
    $('#setWarga').value = stats.warga || 0;
    $('#setKK').value = stats.kk || 0;
    $('#setVisi').value = profil.visi || '';
    $('#setMisi').value = (profil.misi || []).join('\n');
    const batas = profil.batas || {};
    $('#setUtara').value = batas.utara || '';
    $('#setSelatan').value = batas.selatan || '';
    $('#setTimur').value = batas.timur || '';
    $('#setBarat').value = batas.barat || '';
    $('#setSejarah').value = profil.sejarah || '';

    $('#setAlamat').value = kontak.alamat || '';
    $('#setWa').value = kontak.wa_pelayanan || '';
    $('#setEmail').value = kontak.email || '';
    $('#setJam').value = kontak.jam_pelayanan || '';
    $('#setMaps').value = kontak.maps_url || '';
    const darurat = parse('darurat', []);
    $('#setDarurat').value = darurat
      .map((d) => `${d.layanan || ''} | ${d.nomor || ''}`)
      .join('\n');

    $('#setIuran').value = Number(settings.iuran_nominal || 0);
    $('#setRek').value = settings.iuran_rekening || '';
    $('#setIuranKet').value = settings.iuran_keterangan || '';
    tampilkanQris(settings.qris_image || '');

    let tema = {};
    try { tema = JSON.parse(settings.tema || '{}') || {}; } catch { tema = {}; }
    const hex = (v, fb) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : fb);
    $('#setWarnaTema').value = hex(tema.utama, '#0d63c4');
    $('#setWarnaLatar').value = hex(tema.latar, '#f6f9fe');
    tampilGambar.logo(settings.logo || '');
    tampilGambar.logoLogin(settings.logo_login || '');
    tampilGambar.latar(settings.gambar_latar || '');
    tampilGambar.icon(settings.icon_site || '');
    tampilGambar.kopSurat(settings.kop_surat || '');
    tampilGambar.hero(settings.gambar_hero || '');
    logoBaru = logoLoginBaru = latarBaru = iconBaru = kopBaru = heroBaru = undefined;

    let notif = { wa_warga: true, wa_pengurus: true, hp: true };
    try {
      const raw = JSON.parse(settings.notifikasi || '{}');
      if (raw && typeof raw === 'object') notif = { ...notif, ...raw };
    } catch { /* pakai default aktif */ }
    $('#notifStatus').checked = notif.hp !== false;
    $('#notifWaWarga').checked = notif.wa_warga !== false;
    $('#notifWaPengurus').checked = notif.wa_pengurus !== false;

    let pen = { mode: 'otomatis', awalan: 'S', urut: 1, digit: 4 };
    try {
      const raw = JSON.parse(settings.penomoran || '{}');
      if (raw && typeof raw === 'object') pen = { ...pen, ...raw };
    } catch { /* pakai default */ }
    $('#nomManual').checked = pen.mode === 'manual';
    $('#nomOtomatis').checked = pen.mode !== 'manual';
    $('#setNomAwalan').value = pen.awalan || 'S';
    $('#setNomUrut').value = pen.urut || 1;
    $('#setNomDigit').value = pen.digit || 4;
    modePenomoran();

    const rows = $('#pengurusRows');
    rows.innerHTML = '';
    (pengurus.length ? pengurus : [{}]).forEach((p) => rows.appendChild(barisPengurus(p)));

    const isiRows = (sel, arr) => {
      const el = $(sel);
      el.innerHTML = '';
      (arr && arr.length ? arr : [{}]).forEach((p) => el.appendChild(barisPengurus(p)));
    };
    isiRows('#pkkRows', parse('pengurus_pkk', []));
    isiRows('#ktRows', parse('pengurus_karangtaruna', []));

    const prokerKeTeks = (v) =>
      (Array.isArray(v) ? v : []).map((x) => [x.judul, x.keterangan, x.periode].filter(Boolean).join(' | ')).join('\n');
    $('#setProker1').value = prokerKeTeks(parse('proker_pendek', []));
    $('#setProker2').value = prokerKeTeks(parse('proker_menengah', []));
    $('#setProker3').value = prokerKeTeks(parse('proker_panjang', []));
    $('#setAturan').value = (parse('aturan', []) || []).join('\n');
  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------- Penomoran surat: mode otomatis / manual ---------- */
function previewNomor() {
  const manual = $('#nomManual').checked;
  const awalan = ($('#setNomAwalan').value || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 6) || 'S';
  const urut = Math.min(Math.max(Number($('#setNomUrut').value) || 1, 1), 999999);
  const digit = Math.max(Math.min(Math.max(Number($('#setNomDigit').value) || 4, 1), 8), String(urut).length);
  $('#nomorPreview').value = manual
    ? `${awalan}-${String(urut).padStart(digit, '0')}`
    : `Otomatis — contoh S-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-XXXX`;
}

function modePenomoran() {
  const manual = $('#nomManual').checked;
  ['#setNomAwalan', '#setNomUrut', '#setNomDigit'].forEach((s) => {
    $(s).disabled = !manual;
  });
  previewNomor();
}

$$('input[name="penomoranMode"]').forEach((r) => r.addEventListener('change', modePenomoran));
['#setNomAwalan', '#setNomUrut', '#setNomDigit'].forEach((s) => $(s).addEventListener('input', previewNomor));

/* ---------- Backup & Reset Data ---------- */
$('#resetKonfirmasi').addEventListener('input', (e) => {
  $('#btnReset').disabled = e.target.value.trim() !== 'RESET';
});

$('#btnBackup').addEventListener('click', async () => {
  const btn = $('#btnBackup');
  const asli = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Menyiapkan backup…';
  try {
    const dump = await api('/api/admin/backup');
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-rt04-rw12-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    const total = dump.ringkasan?.total_baris ?? 0;
    toast(`Backup berhasil diunduh (${total} baris data).`);
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = asli;
  }
});

$('#btnReset').addEventListener('click', async () => {
  if (!confirm('Kosongkan SEMUA data operasional RT?\n\nTindakan ini tidak bisa dibatalkan. Unduh backup terlebih dahulu jika perlu.')) return;
  const btn = $('#btnReset');
  const asli = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Mengosongkan data…';
  try {
    const res = await api('/api/admin/reset', {
      method: 'POST',
      body: JSON.stringify({ konfirmasi: $('#resetKonfirmasi').value.trim() }),
    });
    toast(res.pesan || 'Semua data operasional dikosongkan.');
    setTimeout(() => location.reload(), 1200);
  } catch (e) {
    toast(e.message, true);
    btn.disabled = false;
    btn.textContent = asli;
  }
});

$('#addPengurus').addEventListener('click', () => $('#pengurusRows').appendChild(barisPengurus()));
$('#addPkk').addEventListener('click', () => $('#pkkRows').appendChild(barisPengurus()));
$('#addKt').addEventListener('click', () => $('#ktRows').appendChild(barisPengurus()));

/* ---------- Pengaturan: sub-nav, kartu lipat, notifikasi HP ---------- */
const grupsPengaturan = () => $$('#panel-pengaturan .settings-group');

// Klik judul grup → buka/tutup (akordeon)
$$('#panel-pengaturan .settings-group h3').forEach((h) => {
  h.addEventListener('click', () => h.parentElement.classList.toggle('tertutup'));
});

// Sub-nav pil: lompat ke grup + sorot aktif
$$('#setNav button').forEach((b) => {
  b.addEventListener('click', () => {
    const g = grupsPengaturan()[Number(b.dataset.idx)];
    if (!g) return;
    g.classList.remove('tertutup');
    g.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $$('#setNav button').forEach((x) => x.classList.toggle('aktif', x === b));
  });
});

if ('IntersectionObserver' in window) {
  const ioNav = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const idx = grupsPengaturan().indexOf(e.target);
        $$('#setNav button').forEach((x) => x.classList.toggle('aktif', Number(x.dataset.idx) === idx));
      });
    },
    { rootMargin: '-12% 0px -72% 0px', threshold: 0 }
  );
  grupsPengaturan().forEach((g) => ioNav.observe(g));
}

/* Notifikasi HP per perangkat (izin browser) */
function perbaruiIzinNotif() {
  const el = $('#notifIzinState');
  if (!el) return;
  if (!('Notification' in window)) {
    el.textContent = '⛔ Tidak didukung browser ini';
    return;
  }
  const p = Notification.permission;
  el.textContent = p === 'granted' ? '✅ Diizinkan' : p === 'denied' ? '⛔ Ditolak — izinkan lewat pengaturan situs browser' : '⏳ Belum diminta';
  $('#notifUji').classList.toggle('hidden', p !== 'granted');
  $('#notifIzin').classList.toggle('hidden', p === 'granted');
}

async function kirimNotifJudul(judul, isi) {
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready.catch(() => null) : null;
    if (reg && reg.showNotification) {
      reg.showNotification(judul, { body: isi, icon: '/icon.svg', badge: '/icon.svg', tag: 'rt04' });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(judul, { body: isi });
    }
  } catch { /* ditolak browser — abaikan */ }
}

$('#notifIzin').addEventListener('click', async () => {
  if (!('Notification' in window)) return toast('Browser ini tidak mendukung notifikasi.', true);
  try {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.register('/sw.js').catch(() => {});
    const p = await Notification.requestPermission();
    perbaruiIzinNotif();
    if (p === 'granted') {
      toast('Notifikasi HP aktif di perangkat ini.');
      kirimNotifJudul('🔔 Notifikasi RT 04 aktif', 'Anda akan menerima pemberitahuan status pengajuan surat RT.');
    } else {
      toast('Izin notifikasi: ' + p, p !== 'granted');
    }
  } catch (e) {
    toast(e.message, true);
  }
});

$('#notifUji').addEventListener('click', () => {
  kirimNotifJudul('🧪 Notifikasi uji — RT 04', 'Berhasil! Notifikasi status pengajuan akan muncul seperti ini.');
});

perbaruiIzinNotif();

$('#saveSettings').addEventListener('click', async () => {
  try {
    const oldProfil = (() => { try { return JSON.parse(cache.settings?.profil || '{}'); } catch { return {}; } })();
    const oldKontak = (() => { try { return JSON.parse(cache.settings?.kontak || '{}'); } catch { return {}; } })();

    const profil = {
      ...oldProfil,
      nama_rt: 'RT 04',
      nama_rw: 'RW 12',
      perumahan: $('#setPerum').value.trim(),
      desa: $('#setDesa').value.trim(),
      kecamatan: $('#setKec').value.trim(),
      kabupaten: $('#setKab').value.trim(),
      kode_pos: $('#setPos').value.trim(),
      visi: $('#setVisi').value.trim(),
      misi: $('#setMisi').value.split('\n').map((s) => s.trim()).filter(Boolean),
      batas: {
        utara: $('#setUtara').value.trim(),
        selatan: $('#setSelatan').value.trim(),
        timur: $('#setTimur').value.trim(),
        barat: $('#setBarat').value.trim(),
      },
      sejarah: $('#setSejarah').value.trim(),
    };
    const kontak = {
      ...oldKontak,
      alamat: $('#setAlamat').value.trim(),
      wa_pelayanan: $('#setWa').value.trim().replace(/\D/g, ''),
      email: $('#setEmail').value.trim(),
      jam_pelayanan: $('#setJam').value.trim(),
      maps_url: $('#setMaps').value.trim(),
    };
    const kumpulPengurus = (sel) =>
      $$('.pengurus-row', $(sel))
        .map((r) => ({
          jabatan: r.querySelector('.p-jab').value.trim(),
          nama: r.querySelector('.p-nama').value.trim(),
          hp: r.querySelector('.p-hp').value.trim(),
          periode: r.querySelector('.p-per').value.trim(),
        }))
        .filter((p) => p.nama);
    const pengurus = kumpulPengurus('#pengurusRows');
    const pengurusPkk = kumpulPengurus('#pkkRows');
    const pengurusKt = kumpulPengurus('#ktRows');
    const teksKeProker = (sel) =>
      $(sel).value
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => {
          const [judul, keterangan, periode] = b.split('|').map((s) => (s || '').trim());
          return { judul, keterangan, periode };
        })
        .filter((x) => x.judul);
    const darurat = $('#setDarurat').value
      .split('\n')
      .map((baris) => {
        const [layanan, nomor] = baris.split('|');
        return { layanan: (layanan || '').trim(), nomor: (nomor || '').trim().replace(/\s/g, '') };
      })
      .filter((d) => d.layanan && d.nomor);

    await api('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        profil,
        kontak,
        pengurus,
        stats: {
          rumah: Number($('#setRumah').value) || 0,
          warga: Number($('#setWarga').value) || 0,
          kk: Number($('#setKK').value) || 0,
        },
        iuran_nominal: String(Number($('#setIuran').value) || 0),
        iuran_rekening: $('#setRek').value.trim(),
        iuran_keterangan: $('#setIuranKet').value.trim(),
        darurat,
        pengurus_pkk: pengurusPkk,
        pengurus_karangtaruna: pengurusKt,
        proker_pendek: teksKeProker('#setProker1'),
        proker_menengah: teksKeProker('#setProker2'),
        proker_panjang: teksKeProker('#setProker3'),
        aturan: $('#setAturan').value.split('\n').map((s) => s.trim()).filter(Boolean),
        ...(qrisBaru === undefined ? {} : { qris_image: qrisBaru }),
        tema: {
          utama: $('#setWarnaTema').value,
          latar: $('#setWarnaLatar').value,
        },
        ...(logoBaru === undefined ? {} : { logo: logoBaru }),
        ...(logoLoginBaru === undefined ? {} : { logo_login: logoLoginBaru }),
        ...(latarBaru === undefined ? {} : { gambar_latar: latarBaru }),
        ...(iconBaru === undefined ? {} : { icon_site: iconBaru }),
        ...(kopBaru === undefined ? {} : { kop_surat: kopBaru }),
        ...(heroBaru === undefined ? {} : { gambar_hero: heroBaru }),
        notifikasi: {
          hp: $('#notifStatus').checked,
          wa_warga: $('#notifWaWarga').checked,
          wa_pengurus: $('#notifWaPengurus').checked,
        },
        penomoran: {
          mode: $('#nomManual').checked ? 'manual' : 'otomatis',
          awalan: ($('#setNomAwalan').value || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 6) || 'S',
          urut: Math.min(Math.max(Number($('#setNomUrut').value) || 1, 1), 999999),
          digit: (() => {
            const u = Math.min(Math.max(Number($('#setNomUrut').value) || 1, 1), 999999);
            const d = Math.min(Math.max(Number($('#setNomDigit').value) || 4, 1), 8);
            return Math.max(d, String(u).length);
          })(),
        },
      }),
    });
    qrisBaru = undefined;
    logoBaru = logoLoginBaru = latarBaru = iconBaru = kopBaru = heroBaru = undefined;
    toast('Pengaturan tersimpan. Segarkan website utama untuk melihat perubahan.');
    cache.settings = null;
    await muatSettings();
  } catch (e) {
    toast(e.message, true);
  }
});

/* ==========================================================
   LAPORAN & GRAFIK (SVG murni — tanpa pustaka luar)
   ========================================================== */
const LAP_WARNA = ['#0d63c4', '#1a7fe0', '#f5b301', '#0e7490', '#d64545', '#7b4bbf', '#0aa2a2', '#e07a2c', '#5b6e85', '#4d9fe8'];
const LAP_LABEL = {
  menunggu: 'Menunggu', diproses: 'Diproses', selesai: 'Selesai', ditolak: 'Ditolak', diverifikasi: 'Terverifikasi',
  tetap: 'Tetap', kontrak: 'Kontrak', pendatang: 'Pendatang', dihuni: 'Dihuni', kosong: 'Kosong',
  milik: 'Milik', lainnya: 'Lainnya', baik: 'Baik', perlu_perawatan: 'Perlu Perawatan',
  rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat', terdaftar: 'Terdaftar', disalurkan: 'Disalurkan',
  dipinjam: 'Dipinjam', kembali: 'Kembali', terjadwal: 'Terjadwal', batal: 'Batal',
  pengumuman: 'Pengumuman', agenda: 'Agenda', ronda: 'Ronda', kerja_bakti: 'Kerja Bakti',
  L: 'Laki-laki', P: 'Perempuan', sembako: 'Sembako', uang_tunai: 'Uang Tunai', obat: 'Obat',
  pakaian: 'Pakaian', layanan: 'Layanan', elektronik: 'Elektronik', perkakas: 'Perkakas',
  furniture: 'Furniture', olahraga: 'Olahraga', kebersihan: 'Kebersihan', dokumen: 'Dokumen',
  kuliner: 'Kuliner', kerajinan: 'Kerajinan', jasa: 'Jasa', pertanian: 'Pertanian', perdagangan: 'Perdagangan',
  pencurian: 'Pencurian', kecelakaan: 'Kecelakaan', kebakaran: 'Kebakaran', perselisihan: 'Perselisihan',
  keamanan: 'Keamanan', fasilitas: 'Fasilitas', sosial: 'Sosial', drainase: 'Drainase', ibadah: 'Ibadah',
};
const BULAN_NAMA = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const labLap = (v) => LAP_LABEL[v] || v || '—';
const fmtRp = (n) => `Rp${(Number(n) || 0).toLocaleString('id-ID')}`;
const fmtNum = (n) => (Number(n) || 0).toLocaleString('id-ID');
const bulanLap = (b) => {
  if (!b || !/^-?\d{4}-\d{2}$/.test(b)) return '—';
  const [y, m] = b.split('-');
  return `${BULAN_NAMA[Number(m) - 1] || m} ${y}`;
};
const bulanPendek = (b) => (b && /^\d{4}-\d{2}$/.test(b) ? `${BULAN_NAMA[Number(b.slice(5)) - 1] || ''} ${b.slice(2, 4)}` : b || '');
const ambilJumlah = (arr, key) => Number((arr || []).find((x) => x.label === key)?.jumlah) || 0;

function kosongChart(el, teks = 'Belum ada data pada periode ini.') {
  if (el) el.innerHTML = `<div class="lap-empty">${teks}</div>`;
}

// Lengkapi bulan yang kosong agar grafik menampilkan rentang penuh
function isiBulanLap(list) {
  if (!Array.isArray(list) || !list.length) return [];
  const map = new Map(list.map((x) => [x.bulan, x]));
  const kunci = [...map.keys()].sort();
  const [y1, m1] = kunci[0].split('-').map(Number);
  const [y2, m2] = kunci[kunci.length - 1].split('-').map(Number);
  const out = [];
  let y = y1, m = m1;
  while ((y < y2 || (y === y2 && m <= m2)) && out.length < 72) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    out.push(map.get(k) || { bulan: k, nilai: 0, jumlah: 0, masuk: 0, keluar: 0 });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function statLap(label, nilai, sub) {
  return `<div class="lap-stat"><span>${label}</span><strong>${nilai}</strong>${sub ? `<small>${sub}</small>` : ''}</div>`;
}

function porsiLap(n, total) {
  const p = total > 0 ? Math.round((Number(n) / total) * 100) : 0;
  return `<div class="lap-porsi"><i style="width:${p}%"></i></div><small class="muted">${p}%</small>`;
}

function barisKosongLap(td = 7) {
  return `<tr><td colspan="${td}" class="empty">Belum ada data pada periode ini.</td></tr>`;
}

/* Grafik batang tunggal — items: [{label, nilai}] */
function grafikBatang(el, items, opts = {}) {
  if (!el) return;
  const data = (items || []).filter((d) => d && (Number(d.nilai) !== 0 || opts.tampilkanNol));
  if (!data.length) return kosongChart(el);
  const W = 560, H = 230, padL = 52, padR = 12, padT = 26, padB = 46;
  const iw = W - padL - padR, ih = H - padT - padB;
  const fmt = opts.format || fmtNum;
  const maks = Math.max(1, ...data.map((d) => Number(d.nilai) || 0));
  const slot = iw / data.length;
  const bw = Math.max(5, Math.min(46, slot - 8));
  let grid = '';
  for (let g = 0; g <= 3; g++) {
    const y = padT + (ih / 3) * g;        grid += `<line x1="${padL}" x2="${W - padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#dee8f4" stroke-dasharray="3 3" />`;
    grid += `<text x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#8a9a91">${fmt(Math.round((maks * (3 - g)) / 3))}</text>`;
  }
  let bars = '', labels = '';
  data.forEach((d, i) => {
    const v = Number(d.nilai) || 0;
    const x = padL + slot * (i + 0.5);
    const h = (v / maks) * ih;
    const y = padT + ih - h;
    const warna = opts.warna || LAP_WARNA[i % LAP_WARNA.length];
    bars += `<rect x="${(x - bw / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="4" fill="${warna}"><title>${esc(String(d.label))}: ${fmt(v)}</title></rect>`;      if (v > 0) bars += `<text x="${x.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="#5b6e85">${fmt(v)}</text>`;
      labels += `<text x="${x.toFixed(1)}" y="${H - 26}" text-anchor="middle" font-size="9.5" fill="#5b6e85">${esc(String(d.label).slice(0, 13))}</text>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">${grid}${bars}${labels}</svg>`;
}

/* Grafik batang majemuk (perbandingan antar seri per bulan) */
function grafikBatangMajemuk(el, items, seri, opts = {}) {
  if (!el) return;
  const data = (items || []).slice(-24);
  if (!data.length) return kosongChart(el);
  const W = 560, H = 240, padL = 52, padR = 12, padT = 24, padB = 52;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maks = Math.max(1, ...data.flatMap((d) => seri.map((s) => Number(d[s.k]) || 0)));
  const slot = iw / data.length;
  const gw = Math.max(6, slot - 6);
  const bw = Math.max(3, (gw / seri.length) - 1.5);
  let grid = '';
  for (let g = 0; g <= 3; g++) {
    const y = padT + (ih / 3) * g;        grid += `<line x1="${padL}" x2="${W - padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#dee8f4" stroke-dasharray="3 3" />`;
    grid += `<text x="${padL - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#8a9a91">${fmtNum(Math.round((maks * (3 - g)) / 3))}</text>`;
  }
  let bars = '', labels = '';
  data.forEach((d, i) => {
    const gx = padL + slot * i + (slot - gw) / 2;
    seri.forEach((s, j) => {
      const v = Number(d[s.k]) || 0;
      const h = (v / maks) * ih;
      const y = padT + ih - h;
      const x = gx + j * (bw + 1.5);
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="3" fill="${s.warna}"><title>${esc(d.label || bulanLap(d.bulan))} · ${esc(s.label)}: ${fmtNum(v)}</title></rect>`;
    });        labels += `<text x="${(padL + slot * (i + 0.5)).toFixed(1)}" y="${H - 32}" text-anchor="middle" font-size="9" fill="#5b6e85">${esc(String(d.label || bulanPendek(d.bulan)))}</text>`;
  });
  const legenda = seri
    .map((s) => `<span><i style="background:${s.warna}"></i>${esc(s.label)}</span>`)
    .join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">${grid}${bars}${labels}</svg><div class="lap-legend">${legenda}</div>`;
}

/* Grafik donat — items: [{label, nilai}] */
function grafikDonat(el, items, opts = {}) {
  if (!el) return;
  const data = (items || []).filter((d) => d && Number(d.nilai) > 0);
  if (!data.length) return kosongChart(el);
  const total = data.reduce((a, b) => a + (Number(b.nilai) || 0), 0);
  if (!total) return kosongChart(el);
  const fmt = opts.format || fmtNum;
  const R = 58, C = 2 * Math.PI * R;
  let off = 0;
  const potongan = data
    .map((d, i) => {
      const p = (Number(d.nilai) || 0) / total;
      const seg = `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${LAP_WARNA[i % LAP_WARNA.length]}" stroke-width="30"
        stroke-dasharray="${(p * C).toFixed(2)} ${(C - p * C).toFixed(2)}" stroke-dashoffset="${(-off * C).toFixed(2)}"
        transform="rotate(-90 90 90)"><title>${esc(String(d.label))}: ${fmt(d.nilai)} (${Math.round(p * 100)}%)</title></circle>`;
      off += p;
      return seg;
    })
    .join('');
  const legenda = data
    .map((d, i) => `<span><i style="background:${LAP_WARNA[i % LAP_WARNA.length]}"></i>${esc(String(d.label))} · ${fmt(d.nilai)}</span>`)
    .join('');
  el.innerHTML =
    `<svg viewBox="0 0 180 180" role="img">${potongan}
      <text x="90" y="86" text-anchor="middle" font-size="20" font-weight="700" fill="#062a52">${fmt(total)}</text>
      <text x="90" y="104" text-anchor="middle" font-size="9" fill="#5b6e85">${esc(opts.tengah || 'Total')}</text>
    </svg><div class="lap-legend">${legenda}</div>`;
}

/* Pengambilan & render laporan */
let cacheLaporan = null;

async function muatLaporan(paksa = false) {
  const dari = $('#lapDari').value;
  const sampai = $('#lapSampai').value;
  const kunci = `${dari}|${sampai}`;
  if (!paksa && cacheLaporan && cacheLaporan.kunci === kunci) return;
  if (!cacheLaporan) {
    document.querySelectorAll('.lap-chart').forEach((el) => (el.innerHTML = '<div class="lap-empty">Memuat laporan…</div>'));
  }
  const qs = new URLSearchParams();
  if (dari) qs.set('dari', dari);
  if (sampai) qs.set('sampai', sampai);
  const data = await api(`/api/admin/laporan${qs.toString() ? `?${qs}` : ''}`);
  cacheLaporan = { kunci, data };
  renderLaporan(data);
  const rentang = dari || sampai ? `${dari || 'awal data'} s/d ${sampai || 'hari ini'}` : 'semua waktu';
  $('#lapPeriode').textContent = `Periode: ${rentang} · diperbarui ${new Date().toLocaleString('id-ID')}`;
}

function renderLaporan(d) {
  const p = d.pengajuan;

  /* ---- 1. Pengajuan ---- */
  const selesaiSurat = ambilJumlah(p.surat.by_status, 'selesai');
  const menungguSurat = ambilJumlah(p.surat.by_status, 'menunggu');
  const aduanSelesai = ambilJumlah(p.aduan.by_status, 'selesai');
  const rasio = p.total ? Math.round(((selesaiSurat + aduanSelesai) / p.total) * 100) : 0;
  $('#lpPengStats').innerHTML = [
    statLap('Total Pengajuan', fmtNum(p.total), `${fmtNum(p.surat.total)} surat · ${fmtNum(p.aduan.total)} aduan`),
    statLap('Surat Selesai', fmtNum(selesaiSurat), `${p.surat.total ? Math.round((selesaiSurat / p.surat.total) * 100) : 0}% dari surat`),
    statLap('Surat Menunggu', fmtNum(menungguSurat), 'perlu tindakan pengurus'),
    statLap('Aduan Selesai', fmtNum(aduanSelesai), `${fmtNum(p.aduan.total)} total aduan`),
    statLap('Rasio Penyelesaian', `${rasio}%`, 'surat + aduan selesai'),
  ].join('');
  const gabungBulan = isiBulanLap(
    [...new Set([...p.surat.per_bulan.map((x) => x.bulan), ...p.aduan.per_bulan.map((x) => x.bulan)])]
      .sort()
      .map((b) => ({
        bulan: b,
        surat: Number(p.surat.per_bulan.find((x) => x.bulan === b)?.nilai) || 0,
        aduan: Number(p.aduan.per_bulan.find((x) => x.bulan === b)?.nilai) || 0,
      }))
  );
  grafikBatangMajemuk($('#lpPengBulan'), gabungBulan, [
    { k: 'surat', label: '📄 Surat', warna: '#0d63c4' },
    { k: 'aduan', label: '🛡️ Aduan', warna: '#f5b301' },
  ]);
  grafikDonat($('#lpPengStatus'), p.surat.by_status.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Surat' });
  grafikBatang($('#lpPengJenis'), p.surat.by_jenis.map((x) => ({ label: x.label, nilai: x.jumlah })));
  grafikDonat($('#lpPengAduanKat'), p.aduan.by_kategori.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Aduan' });
  $('#lpPengJenisBody').innerHTML = p.surat.by_jenis.length
    ? p.surat.by_jenis
        .map((x) => `<tr><td>${esc(x.label)}</td><td><strong>${fmtNum(x.jumlah)}</strong></td><td>${porsiLap(x.jumlah, p.surat.total)}</td></tr>`)
        .join('')
    : barisKosongLap(3);

  /* ---- 2. Keuangan, iuran & kas ---- */
  const k = d.keuangan.kas;
  const i = d.keuangan.iuran;
  $('#lpKasStats').innerHTML = [
    statLap('Saldo Kas', fmtRp(k.saldo), `${fmtNum(k.jumlah_transaksi)} transaksi`),
    statLap('Kas Masuk', fmtRp(k.masuk), 'pemasukan tercatat'),
    statLap('Kas Keluar', fmtRp(k.keluar), 'pengeluaran tercatat'),
    statLap('Setoran Iuran', fmtNum(i.jumlah_setoran), `${i.jumlah_setoran ? Math.round((i.terverifikasi / i.jumlah_setoran) * 100) : 0}% terverifikasi`),
    statLap('Iuran Terverifikasi', fmtRp(i.nominal_terverifikasi), `${fmtNum(i.terverifikasi)} setoran valid`),
  ].join('');
  grafikBatangMajemuk($('#lpKasBulan'), isiBulanLap(k.per_bulan), [
    { k: 'masuk', label: 'Masuk', warna: '#0d63c4' },
    { k: 'keluar', label: 'Keluar', warna: '#d64545' },
  ]);
  grafikBatang($('#lpIuranBulan'), isiBulanLap(i.per_bulan).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nominal })), {
    format: (v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : fmtNum(v)),      warna: '#1a7fe0',
  });
  $('#lpIuranStats').innerHTML = [
    statLap('Total Setoran', fmtRp(i.nominal_total), `${fmtNum(i.jumlah_setoran)} transaksi`),
    statLap('Menunggu Verifikasi', fmtRp(i.nominal_total - i.nominal_terverifikasi), 'perlu cek bendahara'),
    statLap('Jenis Metode', fmtNum(i.by_metode.length), 'cara pembayaran dipakai'),
  ].join('');
  grafikDonat($('#lpIuranMetode'), i.by_metode.map((x) => ({ label: x.label, nilai: x.nominal })), { format: fmtRp, tengah: 'Nominal' });
  grafikDonat($('#lpIuranStatus'), i.by_status.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Setoran' });
  $('#lpIuranMetodeBody').innerHTML = i.by_metode.length
    ? i.by_metode
        .map((x) => `<tr><td>${esc(x.label)}</td><td>${fmtNum(x.jumlah)}</td><td><strong>${fmtRp(x.nominal)}</strong></td></tr>`)
        .join('')
    : barisKosongLap(3);

  /* ---- 2b. Iuran tahunan: perbandingan antar tahun ---- */
  const it = d.keuangan.iuran_tahunan || { per_tahun: [] };
  const itPersen = it.total_tagihan ? Math.round((it.total_terkumpul / it.total_tagihan) * 100) : 0;
  $('#lpITStats').innerHTML = [
    statLap('Tahun Iuran', fmtNum(it.tahun), 'tahun terdata'),
    statLap('Total Tagihan', fmtRp(it.total_tagihan), `kewajiban ${fmtNum(it.total_jumlah)} baris`),
    statLap('Total Terkumpul', fmtRp(it.total_terkumpul), `${itPersen}% realisasi`),
    statLap('Belum Bayar', fmtNum(it.total_belum), `dari ${fmtNum(it.total_jumlah)} kewajiban`),
  ].join('');
  const itPerTahun = (it.per_tahun || []).map((t) => ({
    bulan: String(t.tahun), label: String(t.tahun),
    tagihan: t.tagihan, terkumpul: t.terkumpul, lunas: t.lunas, belum: t.belum,
  }));
  grafikBatangMajemuk($('#lpITBanding'), itPerTahun, [
    { k: 'tagihan', label: '🧾 Tagihan', warna: '#9fb8ad' },
    { k: 'terkumpul', label: '💰 Terkumpul', warna: '#1a7fe0' },
  ]);
  grafikBatangMajemuk($('#lpITLunas'), itPerTahun, [
    { k: 'lunas', label: '✅ Lunas', warna: '#0d63c4' },
    { k: 'belum', label: '⏳ Belum', warna: '#f5b301' },
  ]);
  $('#lpITBody').innerHTML = (it.per_tahun || []).length
    ? [...it.per_tahun]
        .reverse()
        .map(
          (t) =>
            `<tr><td><strong>${t.tahun}</strong></td><td class="right">${fmtRp(t.tagihan)}</td><td class="right">${fmtNum(t.lunas)}</td><td class="right">${fmtNum(t.belum)}</td><td class="right"><strong>${fmtRp(t.terkumpul)}</strong></td><td>${porsiLap(t.lunas, t.jumlah)}</td></tr>`
        )
        .join('')
    : barisKosongLap(6);

  /* ---- 3. Data warga, KK, rumah & fasilitas ---- */
  const w = d.data.warga, kk = d.data.kk, r = d.data.rumah, f = d.data.fasilitas;
  $('#lpDataStats').innerHTML = [
    statLap('Warga', fmtNum(w.total), `${ambilJumlah(w.by_kelamin, 'L')} L · ${ambilJumlah(w.by_kelamin, 'P')} P`),
    statLap('Kartu Keluarga', fmtNum(kk.total), `${fmtNum(kk.anggota)} anggota · rerata ${kk.rerata}`),
    statLap('Rumah', fmtNum(r.total), `${ambilJumlah(r.by_huni, 'dihuni')} dihuni · ${ambilJumlah(r.by_huni, 'kosong')} kosong`),
    statLap('Fasilitas', fmtNum(f.total), `${ambilJumlah(f.by_kondisi, 'baik')} dalam kondisi baik`),
    statLap('Perlu Perawatan', fmtNum(ambilJumlah(f.by_kondisi, 'perlu_perawatan') + ambilJumlah(f.by_kondisi, 'rusak_ringan') + ambilJumlah(f.by_kondisi, 'rusak_berat')), 'fasilitas bermasalah'),
  ].join('');
  grafikDonat($('#lpWargaKelamin'), w.by_kelamin.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Warga' });
  grafikDonat($('#lpWargaStatus'), w.by_status.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Warga' });
  grafikBatang($('#lpWargaBlok'), w.top_blok.map((x) => ({ label: x.label, nilai: x.jumlah })));
  grafikDonat($('#lpRumahHuni'), r.by_huni.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Rumah' });
  grafikDonat($('#lpFasKondisi'), f.by_kondisi.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Fasilitas' });
  grafikDonat($('#lpRumahMilik'), r.by_kepemilikan.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Rumah' });
  $('#lpFasKatBody').innerHTML = f.by_kategori.length
    ? f.by_kategori.map((x) => `<tr><td>${esc(labLap(x.label))}</td><td>${fmtNum(x.jumlah)}</td></tr>`).join('')
    : barisKosongLap(2);

  /* ---- 4. Usaha warga ---- */
  const us = d.usaha;
  $('#lpUsahaStats').innerHTML = [
    statLap('Total Usaha', fmtNum(us.total), 'UMKM terdaftar'),
    statLap('Jumlah Kategori', fmtNum(us.by_kategori.length), 'jenis usaha warga'),
    statLap('Kategori Teratas', us.by_kategori[0] ? esc(us.by_kategori[0].label) : '—', us.by_kategori[0] ? `${fmtNum(us.by_kategori[0].jumlah)} usaha` : 'belum ada data'),
  ].join('');
  grafikBatang($('#lpUsahaKat'), us.by_kategori.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })));
  grafikDonat($('#lpUsahaDonat'), us.by_kategori.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Usaha' });
  $('#lpUsahaBody').innerHTML = us.by_kategori.length
    ? us.by_kategori
        .map((x) => `<tr><td>${esc(labLap(x.label))}</td><td><strong>${fmtNum(x.jumlah)}</strong></td><td>${porsiLap(x.jumlah, us.total)}</td></tr>`)
        .join('')
    : barisKosongLap(3);

  /* ---- 5. Bansos ---- */
  const bn = d.bansos;
  const disalurkan = ambilJumlah(bn.penerima.by_status, 'disalurkan');
  $('#lpBansosStats').innerHTML = [
    statLap('Program Bansos', fmtNum(bn.program.total), `${fmtNum(bn.program.by_jenis.length)} jenis bantuan`),
    statLap('Total Penerima', fmtNum(bn.penerima.total), 'entri pendistribusian'),
    statLap('Sudah Disalurkan', fmtNum(disalurkan), `${bn.penerima.total ? Math.round((disalurkan / bn.penerima.total) * 100) : 0}% tersalur`),
    statLap('Kelompok / Program', fmtNum(bn.penerima.by_kelompok.filter((x) => x.jumlah > 0).length), 'kelompok penerima'),
    statLap('Nominal Tersalur', fmtRp(bn.penerima.by_kelompok.reduce((a, x) => a + (Number(x.nominal) || 0), 0)), 'seluruh program'),
  ].join('');
  grafikBatang($('#lpBansosBulan'), isiBulanLap(bn.per_bulan).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nilai })), { warna: '#e07a2c' });
  grafikDonat($('#lpBansosStatus'), bn.penerima.by_status.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Penerima' });
  grafikDonat($('#lpBansosJenis'), bn.program.by_jenis.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Program' });
  grafikBatang($('#lpBansosKelompok'), bn.penerima.by_kelompok.slice(0, 10).map((x) => ({ label: x.nama, nilai: x.jumlah })));
  $('#lpBansosKelompokBody').innerHTML = bn.penerima.by_kelompok.length
    ? bn.penerima.by_kelompok
        .map(
          (x) =>
            `<tr><td><strong>${esc(x.nama || '—')}</strong></td><td>${esc(labLap(x.jenis))}</td><td>${fmtNum(x.jumlah)}</td><td><strong>${fmtRp(x.nominal)}</strong></td></tr>`
        )
        .join('')
    : barisKosongLap(4);

  /* ---- 6. Inventaris ---- */
  const inv = d.inventaris;
  $('#lpInvStats').innerHTML = [
    statLap('Jenis Barang', fmtNum(inv.barang.total), `${fmtNum(inv.barang.unit)} total unit`),
    statLap('Total Peminjaman', fmtNum(inv.pinjaman.total), `${fmtNum(inv.pinjaman.dipinjam)} masih dipinjam`),
    statLap('Sudah Kembali', fmtNum(inv.pinjaman.kembali), `${inv.pinjaman.total ? Math.round((inv.pinjaman.kembali / inv.pinjaman.total) * 100) : 0}% pengembalian`),
    statLap('Belum Kembali', fmtNum(inv.pinjaman.dipinjam), 'perlu ditagih'),
    statLap('Buku Peminjaman', fmtRp(inv.pinjaman.biaya_total), 'total biaya tercatat'),
  ].join('');
  grafikBatang($('#lpBarangKat'), inv.barang.by_kategori.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })));
  grafikDonat($('#lpBarangKondisi'), inv.barang.by_kondisi.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Barang' });
  grafikBatangMajemuk($('#lpPinjamBulan'), isiBulanLap(inv.pinjaman.per_bulan), [{ k: 'nilai', label: 'Peminjaman', warna: '#1d6fb8' }]);
  grafikDonat($('#lpPinjamStatus'), [
    { label: 'Masih Dipinjam', nilai: inv.pinjaman.dipinjam },
    { label: 'Sudah Kembali', nilai: inv.pinjaman.kembali },
  ], { tengah: 'Peminjaman' });
  $('#lpPinjamBody').innerHTML = inv.pinjaman.daftar.length
    ? inv.pinjaman.daftar
        .map(
          (x) => `<tr>
            <td><strong>${esc(x.nama_peminjam || '—')}</strong><br /><small class="muted">${esc(x.blok || '')}${x.no_hp ? ` · ${esc(x.no_hp)}` : ''}</small></td>
            <td>${esc(x.barang)} <span class="muted">×${fmtNum(x.jumlah)}</span></td>
            <td>${esc(x.tanggal_pinjam || '—')}</td>
            <td>${esc(x.tanggal_target || '—')}</td>
            <td>${esc(x.tanggal_kembali || '—')}</td>
            <td><span class="badge ${x.status === 'kembali' ? 'selesai' : 'diproses'}">${esc(labLap(x.status))}</span></td>
            <td>${fmtRp(x.biaya)}</td>
          </tr>`
        )
        .join('')
    : barisKosongLap(7);

  /* ---- 7. Keamanan ---- */
  const km = d.keamanan;
  $('#lpKeamStats').innerHTML = [
    statLap('Jadwal Ronda', fmtNum(km.ronda.total), `${ambilJumlah(km.ronda.by_status, 'selesai')} selesai`),
    statLap('Laporan Kejadian', fmtNum(km.kejadian.total), `${ambilJumlah(km.kejadian.by_status, 'selesai')} selesai ditangani`),
    statLap('Buku Tamu', fmtNum(km.tamu.total), 'kunjungan tercatat'),
    statLap('Masih di Dalam', fmtNum(km.tamu.didalam), 'tamu belum keluar'),
    statLap('Kejadian Belum Selesai', fmtNum(km.kejadian.total - ambilJumlah(km.kejadian.by_status, 'selesai')), 'perlu tindak lanjut'),
  ].join('');
  grafikBatang($('#lpRondaBulan'), isiBulanLap(km.ronda.per_bulan).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nilai })), { warna: '#1d6fb8' });
  grafikDonat($('#lpRondaStatus'), km.ronda.by_status.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Ronda' });
  grafikBatang($('#lpKejBulan'), isiBulanLap(km.kejadian.per_bulan).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nilai })), { warna: '#d64545' });
  grafikDonat($('#lpKejJenis'), km.kejadian.by_jenis.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Kejadian' });
  grafikBatang($('#lpTamuBulan'), isiBulanLap(km.tamu.per_bulan).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nilai })), { warna: '#7b4bbf' });
  grafikDonat($('#lpKejStatus'), km.kejadian.by_status.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })), { tengah: 'Status' });
  $('#lpRondaBody').innerHTML = km.ronda.daftar.length
    ? km.ronda.daftar
        .map(
          (x) => `<tr><td>${esc(x.tanggal)}</td><td><strong>${esc(x.regu)}</strong></td><td>${esc(x.petugas || '—')}</td><td>${esc(x.pos || '—')}</td><td><span class="badge ${x.status === 'selesai' ? 'selesai' : x.status === 'batal' ? 'ditolak' : 'diproses'}">${esc(labLap(x.status))}</span></td></tr>`
        )
        .join('')
    : barisKosongLap(5);
  $('#lpKejadianBody').innerHTML = km.kejadian.daftar.length
    ? km.kejadian.daftar
        .map(
          (x) => `<tr><td>${esc(x.tanggal)}</td><td><strong>${esc(x.nomor)}</strong></td><td>${esc(labLap(x.jenis))}</td><td>${esc(x.lokasi || '—')}</td><td>${esc(x.pelapor || '—')}</td><td><span class="badge ${x.status === 'selesai' ? 'selesai' : x.status === 'diproses' ? 'diproses' : 'menunggu'}">${esc(labLap(x.status))}</span></td></tr>`
        )
        .join('')
    : barisKosongLap(6);

  /* ---- 8. Pengumuman ---- */
  const pg = d.pengumuman;
  $('#lpPengumStats').innerHTML = [
    statLap('Total Pengumuman', fmtNum(pg.total), 'terbit di website'),
    statLap('Jumlah Kategori', fmtNum(pg.by_kategori.length), 'jenis informasi warga'),
    statLap('Kategori Teratas', pg.by_kategori[0] ? esc(labLap(pg.by_kategori[0].label)) : '—', pg.by_kategori[0] ? `${fmtNum(pg.by_kategori[0].jumlah)} item` : 'belum ada data'),
  ].join('');
  grafikBatang($('#lpPengumKat'), pg.by_kategori.map((x) => ({ label: labLap(x.label), nilai: x.jumlah })));
  grafikBatang($('#lpPengumBulan'), isiBulanLap(pg.per_bulan).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nilai })), { warna: '#0aa2a2' });
  $('#lpPengumBody').innerHTML = pg.by_kategori.length
    ? pg.by_kategori
        .map((x) => `<tr><td>${esc(labLap(x.label))}</td><td><strong>${fmtNum(x.jumlah)}</strong></td><td>${porsiLap(x.jumlah, pg.total)}</td></tr>`)
        .join('')
    : barisKosongLap(3);

  /* ---- 9. Demografi & Kependudukan ---- */
  const dg = d.demografi || {};
  const dgl = (arr) => (arr || []).map((x) => ({ label: x.label, nilai: x.jumlah }));
  $('#lpDemogStats').innerHTML = [
    statLap('Total Warga', fmtNum(dg.total_warga), `${fmtNum(ambilJumlah(dg.kelamin, 'Laki-Laki'))} L · ${fmtNum(ambilJumlah(dg.kelamin, 'Perempuan'))} P`),
    statLap('Total Rumah', fmtNum(dg.total_rumah), `${fmtNum(ambilJumlah(dg.rumah, 'Rumah Dihuni'))} dihuni`),
    statLap('Rumah Kosong', fmtNum(ambilJumlah(dg.rumah, 'Rumah Kosong')), 'unit tidak berpenghuni'),
    statLap('Ber-UMKM', fmtNum(ambilJumlah(dg.usaha, 'Rumah dengan Usaha / UMKM')), 'rumah punya usaha'),
    statLap('Disabilitas', fmtNum(ambilJumlah(dg.disabilitas, 'Disabilitas')), 'warga perlu pendampingan'),
  ].join('');
  grafikDonat($('#lpDemogUsia'), dgl(dg.usia), { tengah: 'Warga' });
  grafikDonat($('#lpDemogKelamin'), dgl(dg.kelamin), { tengah: 'Warga' });
  grafikBatang($('#lpDemogPendidikan'), dgl(dg.pendidikan));
  grafikBatang($('#lpDemogPekerjaan'), dgl(dg.pekerjaan));
  grafikDonat($('#lpDemogPerkawinan'), dgl(dg.perkawinan), { tengah: 'Warga' });
  grafikBatang($('#lpDemogAgama'), dgl(dg.agama));
  grafikDonat($('#lpDemogTinggal'), dgl(dg.status_tinggal), { tengah: 'Warga' });
  grafikDonat($('#lpDemogDomisili'), dgl(dg.domisili), { tengah: 'Warga' });
  grafikBatang($('#lpDemogRumah'), [...dgl(dg.rumah), ...dgl(dg.usaha)]);
  grafikBatang($('#lpDemogKendaraan'), dgl(dg.kendaraan));
  grafikDonat($('#lpDemogListrik'), dgl(dg.daya_listrik), { tengah: 'Rumah' });
  grafikDonat($('#lpDemogAir'), dgl(dg.sumber_air), { tengah: 'Rumah' });
  grafikDonat($('#lpDemogInternet'), dgl(dg.internet), { tengah: 'Rumah' });
  grafikDonat($('#lpDemogCctv'), dgl(dg.cctv), { tengah: 'Rumah' });
  grafikDonat($('#lpDemogDisabilitas'), dgl(dg.disabilitas), { tengah: 'Warga' });
  grafikBatang($('#lpDemogRekapChart'), [
    { label: 'Warga', nilai: Number(dg.total_warga) || 0 },
    { label: 'Rumah', nilai: Number(dg.total_rumah) || 0 },
    { label: 'Rumah + Mobil', nilai: ambilJumlah(dg.kendaraan, 'Rumah dengan Mobil') },
    { label: 'Rumah + Motor', nilai: ambilJumlah(dg.kendaraan, 'Rumah dengan Motor') },
    { label: 'Ber-UMKM', nilai: ambilJumlah(dg.usaha, 'Rumah dengan Usaha / UMKM') },
  ]);
  const rekapBaris = (pos, list) =>
    (list || [])
      .map((x) => `<tr><td>${esc(x.label)}</td><td>${esc(pos)}</td><td class="right"><strong>${fmtNum(x.jumlah)}</strong></td><td class="right">${fmtNum(x.persen)}%</td></tr>`)
      .join('');
  $('#lpDemogBody').innerHTML = [
    rekapBaris('Kelompok Usia', dg.usia), rekapBaris('Jenis Kelamin', dg.kelamin), rekapBaris('Disabilitas', dg.disabilitas),
    rekapBaris('Pendidikan', dg.pendidikan), rekapBaris('Pekerjaan', dg.pekerjaan), rekapBaris('Perkawinan', dg.perkawinan),
    rekapBaris('Status Tinggal', dg.status_tinggal), rekapBaris('Domisili', dg.domisili), rekapBaris('Agama', dg.agama),
    rekapBaris('Rumah', dg.rumah), rekapBaris('Usaha / UMKM', dg.usaha), rekapBaris('Kendaraan', dg.kendaraan),
    rekapBaris('Daya Listrik', dg.daya_listrik), rekapBaris('Sumber Air', dg.sumber_air),
    rekapBaris('Jaringan Internet', dg.internet), rekapBaris('CCTV', dg.cctv),
  ].join('') || barisKosongLap(4);

  /* ---- 10. Denah RT ---- */
  const dn = d.denah || {};
  const stDn = dn.statistik || {};
  const klasterDn = dn.klaster || [];
  $('#lpDenahStats').innerHTML = [
    statLap('Total Rumah', fmtNum(stDn.total), `${fmtNum(stDn.blok)} blok terdata`),
    statLap('Dihuni', fmtNum(stDn.dihuni), `${fmtNum(stDn.persen_terisi)}% terisi`),
    statLap('Kosong', fmtNum(stDn.kosong), 'rumah kosong'),
    statLap('Fasilitas Umum', fmtNum(stDn.fasilitas), `${fmtNum(stDn.fasilitas_baik)} kondisi baik`),
    statLap('Perlu Perbaikan', fmtNum((Number(stDn.fasilitas_perlu) || 0) + (Number(stDn.fasilitas_rusak) || 0)), 'fasilitas bermasalah'),
  ].join('');
  grafikBatangMajemuk(
    $('#lpDenahBlok'),
    klasterDn.map((k) => ({ label: String(k.label || '').replace('Blok ', ''), dihuni: k.dihuni, kosong: k.kosong })),
    [
      { k: 'dihuni', label: '🏠 Dihuni', warna: '#0d63c4' },
      { k: 'kosong', label: ' vacant Kosong', warna: '#f5b301' },
    ]
  );
  const milikDn = klasterDn.reduce((s, k) => s + (Number(k.milik) || 0), 0);
  const kontrakDn = klasterDn.reduce((s, k) => s + (Number(k.kontrak) || 0), 0);
  grafikDonat(
    $('#lpDenahHuni'),
    [
      { label: 'Milik Sendiri', nilai: milikDn },
      { label: 'Kontrak', nilai: kontrakDn },
      { label: 'Lainnya', nilai: Math.max(0, (Number(stDn.total) || 0) - milikDn - kontrakDn) },
    ],
    { tengah: 'Rumah' }
  );
  grafikBatang($('#lpDenahFas'), (dn.fasilitas_by_kategori || []).map((x) => ({ label: labLap(x.label), nilai: x.jumlah })));
  grafikDonat(
    $('#lpDenahKondisi'),
    [
      { label: 'Baik', nilai: Number(stDn.fasilitas_baik) || 0 },
      { label: 'Perlu Perawatan', nilai: Number(stDn.fasilitas_perlu) || 0 },
      { label: 'Rusak Berat', nilai: Number(stDn.fasilitas_rusak) || 0 },
    ],
    { tengah: 'Fasilitas' }
  );
  $('#lpDenahBody').innerHTML = klasterDn.length
    ? klasterDn
        .map(
          (k) => `<tr>
            <td><strong>${esc(k.label)}</strong></td>
            <td class="right">${fmtNum(k.jumlah)}</td>
            <td class="right">${fmtNum(k.dihuni)}</td>
            <td class="right">${fmtNum(k.kosong)}</td>
            <td class="right">${fmtNum(k.milik)}</td>
            <td class="right">${fmtNum(k.kontrak)}</td>
            <td>${porsiLap(k.dihuni, k.jumlah)}</td>
          </tr>`
        )
        .join('')
    : barisKosongLap(7);

  /* ---- 11. Pesan Kontak Warga ---- */
  const ps = d.pesan || {};
  const psBaru = Number(ps.by_status?.[0]?.jumlah) || 0;
  const psDibaca = Number(ps.by_status?.[1]?.jumlah) || 0;
  $('#lpPesanStats').innerHTML = [
    statLap('Total Pesan', fmtNum(ps.total), 'pesan masuk dari warga'),
    statLap('Belum Dibaca', fmtNum(psBaru), 'perlu tindak lanjut'),
    statLap('Sudah Dibaca', fmtNum(psDibaca), 'selesai ditangani'),
    statLap('Bulan Tercatat', fmtNum((ps.per_bulan || []).length), 'periode aktif'),
    statLap('Rasio Dibaca', `${ps.total ? Math.round((psDibaca / ps.total) * 100) : 0}%`, 'dari seluruh pesan'),
  ].join('');
  grafikBatang($('#lpPesanBulan'), isiBulanLap(ps.per_bulan || []).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nilai || 0 })), { warna: '#0aa2a2' });
  grafikDonat($('#lpPesanStatus'), (ps.by_status || []).map((x) => ({ label: x.label, nilai: x.jumlah })), { tengah: 'Pesan' });
  $('#lpPesanBody').innerHTML = (ps.daftar || []).length
    ? ps.daftar
        .map(
          (p) => `<tr>
            <td><strong>${esc(p.nama)}</strong></td>
            <td>${esc(p.kontak || '—')}</td>
            <td>${esc(p.pesan)}</td>
            <td>${p.status === 'baru' ? '<strong>Baru</strong>' : 'Dibaca'}</td>
            <td>${esc(String(p.created_at || '').replace('T', ' ').slice(0, 16))}</td>
          </tr>`
        )
        .join('')
    : barisKosongLap(5);

  /* ---- 12. Log Aktivitas ---- */
  const lg = d.log || {};
  $('#lpLogStats').innerHTML = [
    statLap('Total Aktivitas', fmtNum(lg.total), 'pada periode ini'),
    statLap('Berhasil', fmtNum(lg.sukses), 'respons di bawah 400'),
    statLap('Ditolak / Gagal', fmtNum(lg.ditolak), 'respons 400 ke atas'),
    statLap('Modul Terpantau', fmtNum((lg.by_modul || []).length), 'modul panel tercatat'),
    statLap('Rasio Keberhasilan', `${lg.total ? Math.round(((lg.total - (Number(lg.ditolak) || 0)) / lg.total) * 100) : 0}%`, 'aksi berhasil'),
  ].join('');
  grafikBatang($('#lpLogBulan'), isiBulanLap(lg.per_bulan || []).map((x) => ({ label: bulanPendek(x.bulan), nilai: x.nilai || 0 })), { warna: '#7b4bbf' });
  grafikBatang($('#lpLogModul'), (lg.by_modul || []).slice(0, 10).map((x) => ({ label: labLap(x.label), nilai: x.jumlah })));
  $('#lpLogBody').innerHTML = (lg.daftar || []).length
    ? lg.daftar
        .map(
          (l) => `<tr>
            <td>${esc(String(l.waktu || '').replace('T', ' ').slice(0, 16))}</td>
            <td>${esc(l.user_nama || '—')}</td>
            <td>${esc(l.modul)}</td>
            <td>${esc(l.aksi)}</td>
            <td class="right">${fmtNum(l.status)}</td>
            <td>${esc(l.keterangan || '—')}</td>
          </tr>`
        )
        .join('')
    : barisKosongLap(6);
}

$('#lapTerapkan').addEventListener('click', () =>
  muatLaporan(true).catch((e) => toast(e.message, true))
);
$('#lapReset').addEventListener('click', () => {
  $('#lapDari').value = '';
  $('#lapSampai').value = '';
  muatLaporan(true).catch((e) => toast(e.message, true));
});
/* ---------- Cetak panel data (Warga, KK, Rumah, Usaha, Denah, Laporan) ---------- */
async function ambilKopUntukCetak() {
  if (cache.settings && 'kop_surat' in cache.settings) return cache.settings.kop_surat || '';
  try {
    const { settings } = await api('/api/admin/settings');
    cache.settings = settings;
    return settings.kop_surat || '';
  } catch {
    return ''; // tanpa hak pengaturan — cetak tanpa gambar kop
  }
}

async function cetakPanel(target, opsi = {}) {
  const panel = typeof target === 'string' ? document.querySelector(target) : target;
  if (!panel) {
    toast('Bagian yang akan dicetak tidak ditemukan.', true);
    return;
  }
  const judul = opsi.judul || panel.querySelector('h2')?.textContent.trim() || 'Laporan RT 04 / RW 12';
  const clone = panel.cloneNode(true);
  clone.classList.remove('hidden');
  clone
    .querySelectorAll('button, input, select, textarea, .filters, .panel-head, .lap-toolbar, .sub-tabs, .no-print, script')
    .forEach((el) => el.remove());
  const judulModal = clone.matches('.modal') ? clone.querySelector(':scope > h3') : null;
  if (judulModal) judulModal.remove();
  const kop = await ambilKopUntukCetak();
  const waktu = new Date().toLocaleString('id-ID');
  $('#printArea').innerHTML = `
    <div class="cetak-panel">
      ${kop ? `<div class="cetak-kop"><img src="${kop}" alt="Kop Surat RT 04" /></div>` : ''}
      <div class="cetak-judul">
        <h3>${esc(judul)}</h3>
        <p>RT 04 / RW 12 — Perum Taman Buah Sukamantri · Dicetak ${waktu}</p>
      </div>
      ${clone.innerHTML}
    </div>`;
  window.print();
  toast(`${judul} dikirim ke pencetak.`);
}

[
  ['#printWarga', '#panel-warga', 'Data Warga RT 04 / RW 12'],
  ['#printKK', '#panel-kk', 'Data Kartu Keluarga (KK) RT 04 / RW 12'],
  ['#printRumah', '#panel-rumah', 'Rumah & Fasilitas RT 04 / RW 12'],
  ['#printUsaha', '#panel-usaha', 'Usaha Warga (UMKM) RT 04 / RW 12'],
  ['#printDenah', '#panel-denah', 'Denah RT 04 / RW 12'],
].forEach(([btn, sel, judul]) => {
  const el = $(btn);
  if (el) el.addEventListener('click', () => cetakPanel(sel, { judul }).catch((e) => toast(e.message, true)));
});

$('#lapCetak').addEventListener('click', () => {
  const aktif = document.querySelector('#panel-laporan .lap-sub:not(.hidden)');
  if (!aktif) {
    toast('Buka dulu submenu laporan yang ingin dicetak.', true);
    return;
  }
  const judul = aktif.querySelector('h2')?.textContent.trim() || 'Laporan RT 04 / RW 12';
  cetakPanel(aktif, { judul }).catch((e) => toast(e.message, true));
});

/* ---------- Init ---------- */
/* Topbar memberi bayangan saat digulir (konsisten dgn situs publik) */
const topbarEl = document.querySelector('.topbar');
if (topbarEl) {
  const onScrollTopbar = () => topbarEl.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScrollTopbar, { passive: true });
  onScrollTopbar();
}

$('#kasForm').querySelector('[name="tanggal"]').value = new Date().toISOString().slice(0, 10);

(async function init() {
  // Tautan WhatsApp admin dari pengaturan kontak
  muatInfo()
    .then(() => {
      const wa = String(cache.info?.kontak?.wa_pelayanan || '').replace(/\D/g, '');
      if (wa) $('#loginWa').href = `https://wa.me/${wa}`;
    })
    .catch(() => {});

  if (token) {
    try {
      const user = await muatHak();
      showApp();
      if (user.hak.includes('pengumuman')) muatPengumumanAdmin().catch(() => {});
      return;
    } catch {
      /* token kedaluwarsa — tampilkan login */
    }
  }
  $('#loginView').classList.remove('hidden');
})();

/* Muat pengumuman admin saat tab diklik */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab && tab.dataset.panel === 'pengumuman') muatPengumumanAdmin().catch((err) => toast(err.message, true));
});

/* Muat Bansos, Inventaris & Log saat tab dibuka (selalu segar) */
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  if (tab.dataset.panel === 'bansos') muatBansos().catch((err) => toast(err.message, true));
  if (tab.dataset.panel === 'denah') muatDenah().catch((err) => toast(err.message, true));
  if (tab.dataset.panel === 'inventaris') {
    muatBarang().catch((err) => toast(err.message, true));
    muatPinjaman().catch((err) => toast(err.message, true));
  }
  if (tab.dataset.panel === 'log') muatLog().catch((err) => toast(err.message, true));
});

/* ==========================================================
   Data Warga, Data KK, Rumah & Fasilitas
   ========================================================== */

const sudahDimuat = { warga: false, kk: false, rumah: false, fas: false, usaha: false };
const editId = { warga: null, kk: null, rumah: null, fas: null, usaha: null, bansos: null, penerima: null, barang: null, pinjaman: null };

function debounce(fn, ms = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const STATUS_WARGA_LABEL = { tetap: 'Tetap', kontrak: 'Kontrak', pendatang: 'Pendatang' };
const KONDISI_LABEL = { baik: 'Baik', perlu_perawatan: 'Perlu Perawatan', rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat' };
const KATEGORI_FAS_LABEL = { keamanan: 'Keamanan', kebersihan: 'Kebersihan', drainase: 'Drainase', sosial: 'Sosial', ibadah: 'Ibadah', olahraga: 'Olahraga', lainnya: 'Lainnya' };
const HUNI_LABEL = { dihuni: 'Dihuni', kosong: 'Kosong' };
const MILIK_LABEL = { milik: 'Milik Sendiri', kontrak: 'Kontrak', lainnya: 'Lainnya' };
const DAYA_LABEL = { '450': '450 VA', '900': '900 VA', '1300': '1300 VA', '2200': '2200 VA', diatas_2200: '> 2200 VA' };
const AIR_LABEL = { pipa: 'PDAM / Aertra', tanah: 'Sumur (Bor / Gali)', isi_ulang: 'Isi Ulang / Kemasan' };
const NET_LABEL = { kabel: 'Internet Kabel', seluler: 'Data Seluler', tidak_ada: 'Tanpa Internet' };
const PROV_LABEL = { indihome: 'Indihome', firstmedia: 'Firstmedia / XL Satu', biznet: 'Biznet', tbsnet: 'TBS Net', lainnya: 'Lainnya' };
const DASAWISMA_LABEL = { abu_bakar: 'Abu Bakar', umar: 'Umar', utsman: 'Utsman', ali: 'Ali' };

/* Chip utilitas rumah (daya, air, internet, provider, CCTV) untuk tabel */
function utilChips(r) {
  const items = [];
  if (r.daya_listrik) items.push(`⚡ ${esc(DAYA_LABEL[r.daya_listrik] || r.daya_listrik)}`);
  if (r.sumber_air) items.push(`💧 ${esc(AIR_LABEL[r.sumber_air] || r.sumber_air)}`);
  if (r.jaringan_internet) {
    let net = NET_LABEL[r.jaringan_internet] || r.jaringan_internet;
    if (r.jaringan_internet === 'kabel' && r.provider_internet) net += ` — ${PROV_LABEL[r.provider_internet] || r.provider_internet}`;
    items.push(`🌐 ${esc(net)}`);
  }
  if (r.cctv) items.push(r.cctv === 'ya' ? '📹 CCTV Ada' : '📹 Tanpa CCTV');
  if (r.dasawisma) items.push(`👥 Dasawisma ${esc(DASAWISMA_LABEL[r.dasawisma] || r.dasawisma)}`);
  if (Number(r.jumlah_mobil) > 0) {
    let mobil = `🚗 ${Number(r.jumlah_mobil)} mobil`;
    if (r.plat_mobil) mobil += ` — ${esc(r.plat_mobil)}`;
    items.push(mobil);
  }
  if (Number(r.jumlah_motor) > 0) {
    let motor = `🏍️ ${Number(r.jumlah_motor)} motor`;
    if (r.plat_motor) motor += ` — ${esc(r.plat_motor)}`;
    items.push(motor);
  }
  return items.length
    ? `<div class="util-chips">${items.map((x) => `<span class="util-chip">${x}</span>`).join('')}</div>`
    : '<span class="muted">—</span>';
}

/* Render chip tag (dipisah koma di database) */
function tagChips(v) {
  const tags = String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!tags.length) return '<span class="muted">—</span>';
  return tags.map((t) => `<span class="tag-chip">${esc(t)}</span>`).join('');
}

const barisKosong = (pesan, colspan) => `<tr><td colspan="${colspan}" class="empty">${pesan}</td></tr>`;

/* Pilihan warga untuk mengisi form rumah & KK secara otomatis */
async function isiPilihanWarga(selId) {
  const sel = $(selId);
  if (!cache.warga || !sudahDimuat.warga) {
    try {
      await muatWarga();
      sudahDimuat.warga = true;
    } catch {
      /* data warga gagal dimuat — form tetap bisa diisi manual */
    }
  }
  const pilihan = sel.value;
  sel.innerHTML =
    '<option value="">— Isi manual —</option>' +
    (cache.warga || [])
      .map((w) => `<option value="${w.id}">${esc(w.nama)} — ${esc(w.blok)}${w.no_hp ? ' · ' + esc(w.no_hp) : ''}</option>`)
      .join('');
  sel.value = pilihan || '';
  if (!cache.warga || !cache.warga.length) toast('Belum ada data warga — isi form secara manual.');
}

function wargaDipilih(selId) {
  return (cache.warga || []).find((x) => x.id === Number($(selId).value)) || null;
}

$('#rumahWarga').addEventListener('change', () => {
  const w = wargaDipilih('#rumahWarga');
  if (!w) return;
  const f = $('#rumahForm');
  if (w.blok) f.elements['kode'].value = w.blok;
  if (w.nama) f.elements['kepala_keluarga'].value = w.nama;
  if (w.no_hp) f.elements['no_hp'].value = w.no_hp;
  toast('Form diisi otomatis dari data warga.');
});

$('#kkWarga').addEventListener('change', () => {
  const w = wargaDipilih('#kkWarga');
  if (!w) return;
  const f = $('#kkForm');
  if (w.nama) f.elements['kepala_keluarga'].value = w.nama;
  if (w.blok) f.elements['blok'].value = w.blok;
  if (w.no_hp) f.elements['no_hp'].value = w.no_hp;
  toast('Form diisi otomatis dari data warga.');
});

$('#usahaWarga').addEventListener('change', () => {
  const w = wargaDipilih('#usahaWarga');
  if (!w) return;
  const f = $('#usahaForm');
  if (w.nama) f.elements['pemilik'].value = w.nama;
  if (w.blok) f.elements['blok'].value = w.blok;
  if (w.no_hp) f.elements['no_hp'].value = w.no_hp;
  toast('Form diisi otomatis dari data warga.');
});

/* Lazy-load sub-menu untuk semua grup menu induk (data & keuangan) */
const GRUP_SUB = {
  data: ['warga', 'kk', 'rumah', 'usaha'],
  keuangan: ['setoran', 'iuran-tahunan', 'kas', 'kartu'],
  keamanan: ['ronda', 'kejadian', 'tamu'],
  laporan: ['lap-pengajuan', 'lap-keuangan', 'lap-data', 'lap-usaha', 'lap-bansos', 'lap-inventaris', 'lap-keamanan', 'lap-pengumuman', 'lap-demografi', 'lap-denah', 'lap-pesan', 'lap-log'],
};

function muatSub(sub) {
  const aman = (p) => p.catch((err) => toast(err.message, true));
  if (sub && sub.startsWith('lap-')) {
    aman(muatLaporan());
    return;
  }
  if (sub === 'rumah') {
    if (!sudahDimuat.rumah) {
      aman(muatRumah());
      aman(muatFasilitas());
    }
    return;
  }
  if (sub === 'setoran' || sub === 'kas' || sub === 'kartu' || sub === 'iuran-tahunan') {
    // selalu muat ulang agar status & saldo terkini
    aman({ setoran: muatSetoran, kas: muatKasAdmin, kartu: muatPilihanKartu, 'iuran-tahunan': muatIuranTahunan }[sub]());
    return;
  }
  if (sub === 'ronda' || sub === 'kejadian' || sub === 'tamu') {
    aman({ ronda: muatRonda, kejadian: muatKejadian, tamu: muatTamu }[sub]());
    return;
  }
  if (sub === 'warga' && sudahDimuat.warga) return;
  if (sub === 'kk' && sudahDimuat.kk) return;
  if (sub === 'usaha' && sudahDimuat.usaha) return;
  aman({ warga: muatWarga, kk: muatKK, usaha: muatUsaha }[sub]());
}

function subAktif(grup) {
  return document.querySelector(`#panel-${grup} .sub-tab.active`)?.dataset.sub || GRUP_SUB[grup][0];
}

function bukaSub(grup, sub) {
  document.querySelectorAll(`#panel-${grup} .sub-tab`).forEach((b) =>
    b.classList.toggle('active', b.dataset.sub === sub)
  );
  for (const k of GRUP_SUB[grup]) $(`#panel-${k}`).classList.toggle('hidden', k !== sub);
  muatSub(sub);
}

document.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab && GRUP_SUB[tab.dataset.panel]) bukaSub(tab.dataset.panel, subAktif(tab.dataset.panel));

  const sub = e.target.closest('.sub-tab');
  if (!sub) return;
  const grup = (sub.closest('[id^="panel-"]')?.id || '').replace('panel-', '');
  if (GRUP_SUB[grup]) bukaSub(grup, sub.dataset.sub);
}, false);

/* ---------- Data Warga ---------- */
async function muatWarga() {
  const params = new URLSearchParams();
  const q = $('#cariWarga').value.trim();
  const status = $('#filterWarga').value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const res = await api(`/api/admin/warga?${params}`);
  cache.warga = res.warga;
  sudahDimuat.warga = true;
  $('#wTotal').textContent = res.total;
  $('#wLaki').textContent = res.laki;
  $('#wPerempuan').textContent = res.perempuan;
  const body = $('#wargaBody');
  if (!res.warga.length) {
    body.innerHTML = barisKosong(q ? 'Data tidak ditemukan.' : 'Belum ada data warga. Klik "+ Tambah Warga" untuk mulai.', 9);
    return;
  }
  body.innerHTML = res.warga
    .map(
      (w) => `<tr>
        <td><strong>${esc(w.nama)}</strong>${w.tanggal_lahir ? `<br /><small class="muted">Lahir ${tanggalPendek(w.tanggal_lahir)}${w.tempat_lahir ? ' · ' + esc(w.tempat_lahir) : ''}</small>` : ''}</td>
        <td>${esc(w.nik || '—')}</td>
        <td>${esc(w.jenis_kelamin || '—')}</td>
        <td>${esc(w.blok)}</td>
        <td>${esc(w.no_hp || '—')}</td>
        <td>${esc(w.pekerjaan || '—')}</td>
        <td><span class="badge ${esc(w.status)}">${STATUS_WARGA_LABEL[w.status] || esc(w.status)}</span></td>
        <td>${w.kk_kepala ? `${esc(w.kk_kepala)}<br /><small class="muted">${esc(w.kk_nomor || '')}</small>` : '<span class="muted">—</span>'}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-warga="${w.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-warga="${w.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#cariWarga').addEventListener('input', debounce(() => muatWarga().catch((e) => toast(e.message, true))));
$('#filterWarga').addEventListener('change', () => muatWarga().catch((e) => toast(e.message, true)));
$('#reloadWarga').addEventListener('click', () => muatWarga().then(() => toast('Data warga dimuat ulang.')).catch((e) => toast(e.message, true)));

async function isiOpsiKK(nilaiTerpilih) {
  const { kk } = await api('/api/admin/kk');
  cache.kk = kk;
  $('#wargaKKSelect').innerHTML =
    '<option value="">— Tidak terkait —</option>' +
    kk
      .map(
        (k) => `<option value="${k.id}">${esc(k.kepala_keluarga)} — ${esc(k.blok)}${k.nomor_kk ? ` (KK ${esc(k.nomor_kk)})` : ''}</option>`
      )
      .join('');
  if (nilaiTerpilih) $('#wargaKKSelect').value = String(nilaiTerpilih);
}

$('#tambahWarga').addEventListener('click', async () => {
  try {
    editId.warga = null;
    $('#wargaModalTitle').textContent = 'Tambah Data Warga';
    $('#wargaForm').reset();
    $('#wargaForm').querySelector('[name="status"]').value = 'tetap';
    sinkronPendidikanPekerjaan();
    await isiOpsiKK('');
    $('#wargaModal').classList.remove('hidden');
  } catch (e) { toast(e.message, true); }
});

/* Tampilkan/sembunyikan isian pendidikan & pekerjaan sesuai pilihan centang */
function sinkronPendidikanPekerjaan(resetTersembunyi = false) {
  const f = $('#wargaForm');
  if (!f) return;
  const pdk = f.elements['pendidikan_status']?.value || '';
  const pkr = f.elements['pekerjaan_status']?.value || '';
  const tampil = (el, on) => el.classList.toggle('hidden', !on);
  f.querySelectorAll('.pdk-lulus').forEach((el) => {
    tampil(el, pdk === 'lulus');
    if (resetTersembunyi && pdk !== 'lulus') kosongkan(el);
  });
  f.querySelectorAll('.pdk-belum').forEach((el) => {
    tampil(el, pdk === 'belum_lulus');
    if (resetTersembunyi && pdk !== 'belum_lulus') kosongkan(el);
  });
  f.querySelectorAll('.pkr-kerja').forEach((el) => {
    tampil(el, pkr === 'bekerja');
    if (resetTersembunyi && pkr !== 'bekerja') kosongkan(el);
  });
}

function kosongkan(el) {
  const inputs = el.matches('input, select, textarea') ? [el] : el.querySelectorAll('input, select, textarea');
  inputs.forEach((i) => { i.value = ''; });
}

$('#wargaForm').addEventListener('change', (e) => {
  if (e.target.name === 'pendidikan_status' || e.target.name === 'pekerjaan_status') {
    sinkronPendidikanPekerjaan(true);
  }
});

function isiFormWarga(w) {
  const f = $('#wargaForm');
  f.reset();
  const isi = {
    nama: w.nama, nik: w.nik, blok: w.blok, jenis_kelamin: w.jenis_kelamin, status: w.status,
    perkawinan: w.perkawinan || '', disabilitas: w.disabilitas || '', domisili: w.domisili || '',
    agama: w.agama || '',
    tempat_lahir: w.tempat_lahir, tanggal_lahir: w.tanggal_lahir, no_hp: w.no_hp,
    pekerjaan: w.pekerjaan, keterangan: w.keterangan,
    pendidikan_status: w.pendidikan_status || '', pendidikan_jenjang: w.pendidikan_jenjang,
    pendidikan_jenis: w.pendidikan_jenis, pendidikan_sekolah: w.pendidikan_sekolah,
    pendidikan_alamat_sekolah: w.pendidikan_alamat_sekolah, pendidikan_kelas: w.pendidikan_kelas,
    pendidikan_jenis_sekolah: w.pendidikan_jenis_sekolah,
    pekerjaan_status: w.pekerjaan_status || (w.pekerjaan ? 'bekerja' : ''),
    nama_perusahaan: w.nama_perusahaan, alamat_perusahaan: w.alamat_perusahaan, jabatan: w.jabatan,
  };
  for (const [k, v] of Object.entries(isi)) {
    if (f.elements[k] && v !== null && v !== undefined) {
      try { f.elements[k].value = v ?? ''; } catch { /* radio tanpa opsi cocok */ }
    }
  }
  sinkronPendidikanPekerjaan();
}

$('#wargaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.warga) {
      await api(`/api/admin/warga/${editId.warga}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Data warga diperbarui.');
    } else {
      await api('/api/admin/warga', { method: 'POST', body: JSON.stringify(body) });
      toast('Data warga ditambahkan.');
    }
    $('#wargaModal').classList.add('hidden');
    await muatWarga();
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-warga]');
  const del = e.target.closest('[data-del-warga]');
  if (ed) {
    const w = (cache.warga || []).find((x) => x.id === Number(ed.dataset.editWarga));
    if (!w) return;
    try {
      editId.warga = w.id;
      $('#wargaModalTitle').textContent = `Ubah Data Warga — ${w.nama}`;
      isiFormWarga(w);
      await isiOpsiKK(w.kk_id || '');
      $('#wargaModal').classList.remove('hidden');
    } catch (err) { toast(err.message, true); }
  }
  if (del) {
    if (!confirm('Hapus data warga ini?')) return;
    try {
      await api(`/api/admin/warga/${del.dataset.delWarga}`, { method: 'DELETE' });
      toast('Data warga dihapus.');
      await muatWarga();
    } catch (err) { toast(err.message, true); }
  }
});

/* ---------- Data KK ---------- */
async function muatKK() {
  const params = new URLSearchParams();
  const q = $('#cariKK').value.trim();
  if (q) params.set('q', q);
  const res = await api(`/api/admin/kk?${params}`);
  cache.kk = res.kk;
  sudahDimuat.kk = true;
  $('#kkTotal').textContent = res.total;
  const body = $('#kkBody');
  if (!res.kk.length) {
    body.innerHTML = barisKosong(q ? 'Data tidak ditemukan.' : 'Belum ada data KK. Klik "+ Tambah KK" untuk mulai.', 7);
    return;
  }
  body.innerHTML = res.kk
    .map(
      (k) => `<tr>
        <td>${k.nomor_kk ? `<strong>${esc(k.nomor_kk)}</strong>` : '<span class="muted">—</span>'}</td>
        <td><strong>${esc(k.kepala_keluarga)}</strong>${k.keterangan ? `<br /><small class="muted">${esc(k.keterangan)}</small>` : ''}</td>
        <td>${esc(k.blok)}</td>
        <td>${k.jumlah_anggota ?? '—'}${k.jml_tercatat ? ` <small class="muted">(${k.jml_tercatat} tercatat di Data Warga)</small>` : ''}</td>
        <td>${esc(k.no_hp || '—')}</td>
        <td>${esc(k.alamat || '—')}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-view-kk="${k.id}">👁️ Lihat</button>
          <button class="btn btn-ghost btn-sm" data-edit-kk="${k.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-kk="${k.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#cariKK').addEventListener('input', debounce(() => muatKK().catch((e) => toast(e.message, true))));
$('#reloadKK').addEventListener('click', () => muatKK().then(() => toast('Data KK dimuat ulang.')).catch((e) => toast(e.message, true)));

/* ---------- Tinjauan (View) Kartu Keluarga ---------- */
let kkDetailTerakhir = null;
const usiaWarga = (tgl) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl || '')) return '—';
  const [y, m, d] = tgl.split('-').map(Number);
  const kini = new Date();
  let u = kini.getFullYear() - y;
  if (kini.getMonth() + 1 < m || (kini.getMonth() + 1 === m && kini.getDate() < d)) u--;
  return u >= 0 && u <= 130 ? `${u} th` : '—';
};

async function bukaViewKK(id) {
  const res = await api(`/api/admin/kk/${id}`);
  kkDetailTerakhir = res;
  const k = res.kk;
  $('#kkViewTitle').textContent = `Kartu Keluarga — ${k.kepala_keluarga}`;
  $('#kkViewHead').innerHTML = [
    ['Nomor KK', k.nomor_kk || '—'],
    ['Kepala Keluarga', k.kepala_keluarga],
    ['Blok / Rumah', k.blok || '—'],
    ['Alamat', k.alamat || '—'],
    ['No. HP', k.no_hp || '—'],
    ['Keterangan', k.keterangan || '—'],
  ]
    .map(([l, v]) => `<div><span>${l}</span><strong>${esc(v)}</strong></div>`)
    .join('');
  const selisih = Math.max(0, (Number(res.jumlah_dinyatakan) || 0) - (Number(res.jumlah_tercatat) || 0));
  $('#kkViewStats').innerHTML = [
    `<div class="kas-box m"><span>Jumlah Anggota</span><strong>${fmtNum(res.jumlah_dinyatakan)}</strong></div>`,
    `<div class="kas-box s"><span>Tercatat di Data Warga</span><strong>${fmtNum(res.jumlah_tercatat)}</strong></div>`,
    `<div class="kas-box k"><span>Belum Tercatat</span><strong>${fmtNum(selisih)}</strong></div>`,
  ].join('');
  const STATUS_WG = { tetap: 'Warga Tetap', kontrak: 'Kontrak', pendatang: 'Pendatang' };
  const body = $('#kkViewBody');
  body.innerHTML = res.anggota.length
    ? res.anggota
        .map((a) => `<tr>
          <td><strong>${esc(a.nama)}</strong></td>
          <td>${esc(a.nik || '—')}</td>
          <td>${a.jenis_kelamin === 'L' ? 'Laki-laki' : a.jenis_kelamin === 'P' ? 'Perempuan' : '—'}</td>
          <td>${usiaWarga(a.tanggal_lahir)}</td>
          <td>${esc(a.pekerjaan || (a.pekerjaan_status === 'belum_bekerja' ? 'Belum Bekerja' : a.pekerjaan_status === 'tidak_bekerja' ? 'Tidak Bekerja' : '—'))}</td>
          <td>${esc(STATUS_WG[a.status] || a.status || '—')}</td>
          <td>${esc(a.no_hp || '—')}</td>
        </tr>`)
        .join('')
    : '<tr><td colspan="7" class="empty">Belum ada anggota KK ini yang terdaftar di Data Warga.</td></tr>';
  $('#kkViewModal').classList.remove('hidden');
}

document.addEventListener('click', (e) => {
  const v = e.target.closest('[data-view-kk]');
  if (!v) return;
  bukaViewKK(Number(v.dataset.viewKk)).catch((err) => toast(err.message, true));
});

$('#kkViewPrint').addEventListener('click', () => {
  if (!kkDetailTerakhir) return;
  cetakPanel('#kkViewModal .modal', { judul: `Kartu Keluarga — ${kkDetailTerakhir.kk.kepala_keluarga}` }).catch((e) => toast(e.message, true));
});

$('#tambahKK').addEventListener('click', async () => {
  editId.kk = null;
  $('#kkModalTitle').textContent = 'Tambah Data KK';
  $('#kkForm').reset();
  $('#kkWargaPick').classList.remove('hidden');
  await isiPilihanWarga('#kkWarga');
  $('#kkModal').classList.remove('hidden');
});

function isiFormKK(k) {
  const f = $('#kkForm');
  f.reset();
  const isi = {
    nomor_kk: k.nomor_kk, kepala_keluarga: k.kepala_keluarga, blok: k.blok, no_hp: k.no_hp,
    jumlah_anggota: k.jumlah_anggota, alamat: k.alamat, keterangan: k.keterangan,
  };
  for (const [key, v] of Object.entries(isi)) {
    if (f.elements[key] && v !== null && v !== undefined) f.elements[key].value = v;
  }
}

$('#kkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.kk) {
      await api(`/api/admin/kk/${editId.kk}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Data KK diperbarui.');
    } else {
      await api('/api/admin/kk', { method: 'POST', body: JSON.stringify(body) });
      toast('Data KK ditambahkan.');
    }
    $('#kkModal').classList.add('hidden');
    await muatKK();
    if (sudahDimuat.warga) await muatWarga();
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-kk]');
  const del = e.target.closest('[data-del-kk]');
  if (ed) {
    const k = (cache.kk || []).find((x) => x.id === Number(ed.dataset.editKk));
    if (!k) return;
    editId.kk = k.id;
    $('#kkModalTitle').textContent = `Ubah Data KK — ${k.kepala_keluarga}`;
    isiFormKK(k);
    $('#kkWargaPick').classList.add('hidden');
    $('#kkModal').classList.remove('hidden');
  }
  if (del) {
    const k = (cache.kk || []).find((x) => x.id === Number(del.dataset.delKk));
    if (!confirm(`Hapus data KK ${k ? k.kepala_keluarga : ''}?
Warga yang terkait akan dilepas dari KK ini (data warga tidak ikut terhapus).`)) return;
    try {
      await api(`/api/admin/kk/${del.dataset.delKk}`, { method: 'DELETE' });
      toast('Data KK dihapus. Warga terkait dilepas dari KK ini.');
      await muatKK();
      if (sudahDimuat.warga) await muatWarga();
    } catch (err) { toast(err.message, true); }
  }
});

/* ---------- Rumah ---------- */
async function muatRumah() {
  const params = new URLSearchParams();
  const q = $('#cariRumah').value.trim();
  const status = $('#filterRumah').value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const res = await api(`/api/admin/rumah?${params}`);
  cache.rumah = res.rumah;
  sudahDimuat.rumah = true;
  $('#rTotal').textContent = res.total;
  $('#rDihuni').textContent = res.dihuni;
  $('#rKosong').textContent = res.kosong;
  const body = $('#rumahBody');
  if (!res.rumah.length) {
    body.innerHTML = barisKosong(q ? 'Rumah tidak ditemukan.' : 'Belum ada data rumah. Klik "+ Tambah Rumah" untuk mulai.', 9);
    return;
  }
  body.innerHTML = res.rumah
    .map(
      (r) => `<tr>
        <td><strong>${esc(r.kode)}</strong></td>
        <td>${r.kepala_keluarga ? esc(r.kepala_keluarga) : '<span class="muted">—</span>'}</td>
        <td><span class="badge ${esc(r.status_huni)}">${HUNI_LABEL[r.status_huni] || esc(r.status_huni)}</span></td>
        <td>${r.kepemilikan ? MILIK_LABEL[r.kepemilikan] || esc(r.kepemilikan) : '—'}</td>
        <td>${esc(r.no_hp || '—')}</td>
        <td>${utilChips(r)}</td>
        <td>${tagChips(r.tags)}</td>
        <td>${esc(r.keterangan || '—')}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-rumah="${r.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-rumah="${r.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#cariRumah').addEventListener('input', debounce(() => muatRumah().catch((e) => toast(e.message, true))));
$('#filterRumah').addEventListener('change', () => muatRumah().catch((e) => toast(e.message, true)));
$('#reloadRumah').addEventListener('click', () =>
  Promise.all([muatRumah(), muatFasilitas()]).then(() => toast('Data rumah & fasilitas dimuat ulang.')).catch((e) => toast(e.message, true))
);

/* Provider internet kabel hanya relevan bila jaringan = kabel */
function sinkronProviderInternet(resetTersembunyi = false) {
  const f = $('#rumahForm');
  if (!f) return;
  const kabel = f.elements['jaringan_internet']?.value === 'kabel';
  f.querySelectorAll('.net-kabel').forEach((el) => {
    el.classList.toggle('hidden', !kabel);
    if (resetTersembunyi && !kabel) {
      const inputs = el.matches('select, input') ? [el] : el.querySelectorAll('select, input');
      inputs.forEach((i) => { i.value = ''; });
    }
  });
}

$('#rumahForm').addEventListener('change', (e) => {
  if (e.target.name === 'jaringan_internet') sinkronProviderInternet(true);
  if (e.target.name === 'jumlah_mobil' || e.target.name === 'jumlah_motor') sinkronKendaraan(true, e.target.name);
});

/* Kolom nomor plat muncul otomatis begitu jumlah mobil / motor > 0 */
function sinkronKendaraan(resetTersembunyi = false, pengubah = '') {
  const f = $('#rumahForm');
  if (!f) return;
  for (const jenis of ['jumlah_mobil', 'jumlah_motor']) {
    const jumlah = Number(f.elements[jenis]?.value || 0);
    const ada = jumlah > 0;
    const wrap = f.querySelector(`[data-plat-for="${jenis}"]`);
    if (!wrap) continue;
    wrap.classList.toggle('hidden', !ada);
    if (!ada) {
      const input = wrap.querySelector('input');
      if (input && (resetTersembunyi || pengubah === jenis)) input.value = '';
    }
  }
}

$('#tambahRumah').addEventListener('click', async () => {
  editId.rumah = null;
  $('#rumahModalTitle').textContent = 'Tambah Rumah';
  $('#rumahForm').reset();
  $('#rumahForm').querySelector('[name="status_huni"]').value = 'dihuni';
  sinkronProviderInternet();
  sinkronKendaraan();
  $('#rumahWargaPick').classList.remove('hidden');
  await isiPilihanWarga('#rumahWarga');
  $('#rumahModal').classList.remove('hidden');
});

$('#rumahForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.rumah) {
      await api(`/api/admin/rumah/${editId.rumah}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Data rumah diperbarui.');
    } else {
      await api('/api/admin/rumah', { method: 'POST', body: JSON.stringify(body) });
      toast('Rumah ditambahkan.');
    }
    $('#rumahModal').classList.add('hidden');
    await muatRumah();
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-rumah]');
  const del = e.target.closest('[data-del-rumah]');
  if (ed) {
    const r = (cache.rumah || []).find((x) => x.id === Number(ed.dataset.editRumah));
    if (!r) return;
    editId.rumah = r.id;
    $('#rumahModalTitle').textContent = `Ubah Rumah — ${r.kode}`;
    const f = $('#rumahForm');
    f.reset();
    const isi = {
      kode: r.kode, status_huni: r.status_huni, kepala_keluarga: r.kepala_keluarga, kepemilikan: r.kepemilikan,
      no_hp: r.no_hp, keterangan: r.keterangan, tags: r.tags,
      daya_listrik: r.daya_listrik || '', sumber_air: r.sumber_air || '', jaringan_internet: r.jaringan_internet || '',
      provider_internet: r.provider_internet || '', cctv: r.cctv || '', dasawisma: r.dasawisma || '',
      jumlah_mobil: r.jumlah_mobil ?? '', plat_mobil: r.plat_mobil || '',
      jumlah_motor: r.jumlah_motor ?? '', plat_motor: r.plat_motor || '',
    };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    sinkronProviderInternet();
    sinkronKendaraan();
    $('#rumahWargaPick').classList.add('hidden');
    $('#rumahModal').classList.remove('hidden');
  }
  if (del) {
    if (!confirm('Hapus data rumah ini?')) return;
    try {
      await api(`/api/admin/rumah/${del.dataset.delRumah}`, { method: 'DELETE' });
      toast('Data rumah dihapus.');
      await muatRumah();
    } catch (err) { toast(err.message, true); }
  }
});

/* ---------- Fasilitas ---------- */
async function muatFasilitas() {
  const params = new URLSearchParams();
  const q = $('#cariFasilitas').value.trim();
  const kondisi = $('#filterFasKondisi').value;
  if (q) params.set('q', q);
  if (kondisi) params.set('kondisi', kondisi);
  const res = await api(`/api/admin/fasilitas?${params}`);
  cache.fasilitas = res.fasilitas;
  sudahDimuat.fas = true;
  $('#fasTotal').textContent = res.total ? `(${res.total} terdaftar)` : '';
  const body = $('#fasBody');
  if (!res.fasilitas.length) {
    body.innerHTML = barisKosong(q ? 'Fasilitas tidak ditemukan.' : 'Belum ada data fasilitas. Klik "+ Tambah Fasilitas" untuk mulai.', 8);
    return;
  }
  body.innerHTML = res.fasilitas
    .map(
      (f) => `<tr>
        <td><strong>${esc(f.nama)}</strong>${f.keterangan ? `<br /><small class="muted">${esc(f.keterangan)}</small>` : ''}</td>
        <td><span class="badge jenis">${KATEGORI_FAS_LABEL[f.kategori] || esc(f.kategori)}</span></td>
        <td>${esc(f.lokasi || '—')}</td>
        <td>${f.jumlah ?? '—'}</td>
        <td><span class="badge ${esc(f.kondisi)}">${KONDISI_LABEL[f.kondisi] || esc(f.kondisi)}</span></td>
        <td>${tagChips(f.tags)}</td>
        <td>${f.diperiksa_pada ? tanggalPendek(f.diperiksa_pada) : '<span class="muted">—</span>'}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-fas="${f.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-fas="${f.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#cariFasilitas').addEventListener('input', debounce(() => muatFasilitas().catch((e) => toast(e.message, true))));
$('#filterFasKondisi').addEventListener('change', () => muatFasilitas().catch((e) => toast(e.message, true)));

$('#tambahFasilitas').addEventListener('click', () => {
  editId.fas = null;
  $('#fasModalTitle').textContent = 'Tambah Fasilitas';
  $('#fasForm').reset();
  $('#fasModal').classList.remove('hidden');
});

$('#fasForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.fas) {
      await api(`/api/admin/fasilitas/${editId.fas}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Data fasilitas diperbarui.');
    } else {
      await api('/api/admin/fasilitas', { method: 'POST', body: JSON.stringify(body) });
      toast('Fasilitas ditambahkan.');
    }
    $('#fasModal').classList.add('hidden');
    await muatFasilitas();
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-fas]');
  const del = e.target.closest('[data-del-fas]');
  if (ed) {
    const f = (cache.fasilitas || []).find((x) => x.id === Number(ed.dataset.editFas));
    if (!f) return;
    editId.fas = f.id;
    $('#fasModalTitle').textContent = `Ubah Fasilitas — ${f.nama}`;
    const form = $('#fasForm');
    form.reset();
    const isi = { nama: f.nama, kategori: f.kategori, kondisi: f.kondisi, lokasi: f.lokasi, jumlah: f.jumlah, diperiksa_pada: f.diperiksa_pada, keterangan: f.keterangan, tags: f.tags };
    for (const [k, v] of Object.entries(isi)) {
      if (form.elements[k] && v !== null && v !== undefined) form.elements[k].value = v;
    }
    $('#fasModal').classList.remove('hidden');
  }
  if (del) {
    if (!confirm('Hapus fasilitas ini?')) return;
    try {
      await api(`/api/admin/fasilitas/${del.dataset.delFas}`, { method: 'DELETE' });
      toast('Fasilitas dihapus.');
      await muatFasilitas();
    } catch (err) { toast(err.message, true); }
  }
});

/* ==========================================================
   Denah RT — peta otomatis dari data rumah & fasilitas
   ========================================================== */
let denahData = null;      // cache hasil GET /api/admin/denah
let denahFilterStatus = '';

async function muatDenah(force = false) {
  if (!denahData || force) denahData = await api('/api/admin/denah');
  renderDenah(true);
}

/* Angka menghitung naik saat denah dimuat (hormati preferensi kurangi-gerak) */
function setAngka(el, target, akhiran = '', animasi = false) {
  const tujuan = Number(target) || 0;
  const bulat = Number.isInteger(tujuan);
  const akhir = (v) => `${bulat ? Math.round(v) : v.toFixed(1)}${akhiran}`;
  if (el._animRaf) { cancelAnimationFrame(el._animRaf); el._animRaf = null; }
  const hormat = !animasi || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hormat || tujuan === 0) { el.textContent = akhir(tujuan); return; }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / 700);
    el.textContent = akhir(tujuan * (1 - Math.pow(1 - p, 3)));
    if (p < 1) el._animRaf = requestAnimationFrame(step);
    else el._animRaf = null;
  };
  el._animRaf = requestAnimationFrame(step);
}

function renderDenah(animasi = false) {
  const d = denahData;
  if (!d) return;
  const s = d.statistik || {};
  setAngka($('#dnTotal'), s.total ?? 0, '', animasi);
  setAngka($('#dnDihuni'), s.dihuni ?? 0, '', animasi);
  setAngka($('#dnKosong'), s.kosong ?? 0, '', animasi);
  setAngka($('#dnPersen'), s.persen_terisi ?? 0, '%', animasi);
  const diUpdate = d.diperbarui ? tanggalPendek(d.diperbarui) : '—';
  $('#denahFasInfo').textContent =
    `${s.fasilitas ?? 0} tercatat · ${s.fasilitas_baik ?? 0} baik · ${s.fasilitas_perlu ?? 0} perlu perawatan · ${s.fasilitas_rusak ?? 0} rusak · Diperbarui ${diUpdate}`;

  /* Peta per blok (klaster otomatis di server) */
  const q = ($('#denahCari').value || '').trim().toLowerCase();
  const cocok = (r) =>
    (!denahFilterStatus || r.status_huni === denahFilterStatus) &&
    (!q || String(r.kode || '').toLowerCase().includes(q) || String(r.kepala_keluarga || '').toLowerCase().includes(q));

  const area = $('#denahArea');
  const klaster = (d.klaster || []).map((k) => ({ ...k, rumah: k.rumah.filter(cocok) })).filter((k) => k.rumah.length);
  if (!klaster.length) {
    area.innerHTML = `<p class="denah-kosong-pesan">${
      (d.klaster || []).length
        ? 'Tidak ada rumah yang cocok dengan filter / pencarian.'
        : 'Belum ada data rumah. Tambahkan rumah di menu 🗂️ Data Warga & Fasilitas → Rumah, denah terisi otomatis.'
    }</p>`;
  } else {
    area.innerHTML = klaster
      .map((k, i) => {
        const tiles = k.rumah
          .map((r) => {
            const huni = r.status_huni === 'dihuni';
            return `<button type="button" class="denah-rumah ${huni ? 'dihuni' : 'kosong'}" data-denah-id="${r.id}" title="${esc(r.kepala_keluarga || r.kode)} — ${HUNI_LABEL[r.status_huni] || esc(r.status_huni)}">
              <span class="ikon">${huni ? '🏠' : '🔑'}</span>
              <span class="kode">${esc(r.kode)}</span>
              <span class="kk">${r.kepala_keluarga ? esc(r.kepala_keluarga) : '—'}</span>
            </button>`;
          })
          .join('');
        const dihuniK = k.rumah.filter((r) => r.status_huni === 'dihuni').length;
        return `<div class="denah-klaster" style="animation-delay:${i * 60}ms">
          <h4>🏬 ${esc(k.label)} <span>${k.rumah.length} rumah · ${dihuniK} dihuni</span></h4>
          <div class="denah-grid">${tiles}</div>
        </div>`;
      })
      .join('');
  }

  /* Fasilitas lingkungan */
  const fas = d.fasilitas || [];
  const IKON_FAS = { keamanan: '🛡️', kebersihan: '🧹', drainase: '🌊', sosial: '🤝', ibadah: '🕌', olahraga: '⚽', lainnya: '📍' };
  const KONDISI_FAS = { baik: '✅ Baik', perlu_perawatan: '🛠️ Perlu Perawatan', rusak_ringan: '⚠️ Rusak Ringan', rusak_berat: '🚨 Rusak Berat' };
  $('#denahFas').innerHTML = fas.length
    ? fas
        .map(
          (f) => `<div class="denah-fas-item">
            <span class="ikon">${IKON_FAS[f.kategori] || '📍'}</span>
            <div><strong>${esc(f.nama)}</strong>
              <small>${KONDISI_FAS[f.kondisi] || esc(f.kondisi)} · ${esc(f.lokasi || 'Lokasi belum dicatat')}${f.jumlah ? ` · ${f.jumlah} unit` : ''}</small>
            </div>
          </div>`
        )
        .join('')
    : '<p class="muted" style="font-size:.88rem">Belum ada fasilitas tercatat. Tambahkan di menu 🗂️ Rumah &amp; Fasilitas → Fasilitas.</p>';
}

/* Filter status + pencarian (client-side, data sudah di-cache) */
$('#denahFilter').addEventListener('click', (e) => {
  const chip = e.target.closest('.denah-chip');
  if (!chip) return;
  $$('#denahFilter .denah-chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  denahFilterStatus = chip.dataset.status || '';
  renderDenah();
});
$('#denahCari').addEventListener('input', debounce(() => renderDenah()));
$('#denahSegar').addEventListener('click', () =>
  muatDenah(true)
    .then(() => toast('Denah disegarkan dari data terkini.'))
    .catch((e) => toast(e.message, true))
);

/* Klik rumah → detail penghuni & utilitas */
function normalisasiWa(no) {
  const d = String(no || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) return `62${d.slice(1)}`;
  if (d.startsWith('8')) return `62${d}`;
  return d;
}

document.addEventListener('click', (e) => {
  const tile = e.target.closest('[data-denah-id]');
  if (!tile || !denahData) return;
  const r = [...(denahData.klaster || []).flatMap((k) => k.rumah)].find((x) => x.id === Number(tile.dataset.denahId));
  if (!r) return;
  $$('.denah-rumah').forEach((el) => el.classList.remove('fokus'));
  tile.classList.add('fokus');

  const baris = [];
  baris.push(['Status Huni', HUNI_LABEL[r.status_huni] || r.status_huni]);
  if (r.kepala_keluarga) baris.push(['Kepala Keluarga', r.kepala_keluarga]);
  if (r.kepemilikan) baris.push(['Kepemilikan', MILIK_LABEL[r.kepemilikan] || r.kepemilikan]);
  if (r.dasawisma) baris.push(['Dasawisma', DASAWISMA_LABEL[r.dasawisma] || r.dasawisma]);
  if (r.no_hp) baris.push(['No. HP', r.no_hp]);
  if (r.daya_listrik) baris.push(['⚡ Daya Listrik', DAYA_LABEL[r.daya_listrik] || r.daya_listrik]);
  if (r.sumber_air) baris.push(['💧 Sumber Air', AIR_LABEL[r.sumber_air] || r.sumber_air]);
  if (r.jaringan_internet) {
    let net = NET_LABEL[r.jaringan_internet] || r.jaringan_internet;
    if (r.jaringan_internet === 'kabel' && r.provider_internet) net += ` — ${PROV_LABEL[r.provider_internet] || r.provider_internet}`;
    baris.push(['🌐 Jaringan Internet', net]);
  }
  if (r.cctv) baris.push(['📹 Kamera Pengawas', r.cctv === 'ya' ? 'Ada' : 'Tidak']);
  if (Number(r.jumlah_mobil) > 0) baris.push(['🚗 Mobil', `${r.jumlah_mobil} unit${r.plat_mobil ? ` · Plat ${esc(r.plat_mobil)}` : ''}`]);
  if (Number(r.jumlah_motor) > 0) baris.push(['🏍️ Motor', `${r.jumlah_motor} unit${r.plat_motor ? ` · Plat ${esc(r.plat_motor)}` : ''}`]);
  if (r.keterangan) baris.push(['Keterangan', r.keterangan]);

  $('#denahModalTitle').textContent = `🏠 Rumah ${r.kode}`;
  $('#denahDetail').innerHTML = baris
    .map(([k, v]) => `<p><strong>${esc(k)}</strong><br>${esc(v)}</p>`)
    .join('');

  const wa = $('#denahWa');
  const target = normalisasiWa(r.no_hp);
  wa.classList.toggle('hidden', !target);
  if (target) wa.href = `https://wa.me/${target}`;
  $('#denahModal').classList.remove('hidden');
});

$('#denahKeRumah').addEventListener('click', () => {
  $('#denahModal').classList.add('hidden');
  const tab = $$('.tab').find((t) => t.dataset.panel === 'data');
  if (tab) tab.click();
});

/* Tutup modal (tombol Batal / klik area luar) */
document.addEventListener('click', (e) => {
  const closer = e.target.closest('[data-close-modal]');
  if (closer) {
    const back = closer.closest('.modal-back');
    if (back) back.classList.add('hidden');
    return;
  }
  if (e.target.classList && e.target.classList.contains('modal-back')) e.target.classList.add('hidden');
});

/* ==========================================================
   Usaha Warga (UMKM)
   ========================================================== */

const KATEGORI_USAHA_LABEL = {
  kuliner: 'Kuliner', kerajinan: 'Kerajinan', jasa: 'Jasa', pertanian: 'Pertanian',
  perdagangan: 'Perdagangan', elektronik: 'Elektronik', lainnya: 'Lainnya',
};

async function muatUsaha() {
  const params = new URLSearchParams();
  const q = $('#cariUsaha').value.trim();
  const kategori = $('#filterUsaha').value;
  if (q) params.set('q', q);
  if (kategori) params.set('kategori', kategori);
  const res = await api(`/api/admin/usaha?${params}`);
  cache.usaha = res.usaha;
  sudahDimuat.usaha = true;
  $('#usahaTotal').textContent = res.total ? `(${res.total} terdaftar)` : '';
  const body = $('#usahaBody');
  if (!res.usaha.length) {
    body.innerHTML = barisKosong(q ? 'Usaha tidak ditemukan.' : 'Belum ada usaha terdaftar. Klik "+ Tambah Usaha" untuk mulai.', 7);
    return;
  }
  body.innerHTML = res.usaha
    .map(
      (u) => `<tr>
        <td><strong>${esc(u.nama_usaha)}</strong></td>
        <td>${esc(u.pemilik)}</td>
        <td><span class="badge jenis">${KATEGORI_USAHA_LABEL[u.kategori] || esc(u.kategori)}</span></td>
        <td>${esc(u.blok || '—')}</td>
        <td>${esc(u.no_hp || '—')}</td>
        <td>${esc(u.deskripsi || '—')}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-usaha="${u.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-usaha="${u.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#cariUsaha').addEventListener('input', debounce(() => muatUsaha().catch((e) => toast(e.message, true))));
$('#filterUsaha').addEventListener('change', () => muatUsaha().catch((e) => toast(e.message, true)));

$('#tambahUsaha').addEventListener('click', async () => {
  editId.usaha = null;
  $('#usahaModalTitle').textContent = 'Tambah Usaha Warga';
  $('#usahaForm').reset();
  $('#usahaWargaPick').classList.remove('hidden');
  await isiPilihanWarga('#usahaWarga');
  $('#usahaModal').classList.remove('hidden');
});

$('#usahaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.usaha) {
      await api(`/api/admin/usaha/${editId.usaha}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Data usaha diperbarui.');
    } else {
      await api('/api/admin/usaha', { method: 'POST', body: JSON.stringify(body) });
      toast('Usaha warga ditambahkan.');
    }
    $('#usahaModal').classList.add('hidden');
    await muatUsaha();
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-usaha]');
  const del = e.target.closest('[data-del-usaha]');
  if (ed) {
    const u = (cache.usaha || []).find((x) => x.id === Number(ed.dataset.editUsaha));
    if (!u) return;
    editId.usaha = u.id;
    $('#usahaModalTitle').textContent = `Ubah Usaha — ${u.nama_usaha}`;
    const f = $('#usahaForm');
    f.reset();
    const isi = { nama_usaha: u.nama_usaha, pemilik: u.pemilik, kategori: u.kategori, blok: u.blok, no_hp: u.no_hp, deskripsi: u.deskripsi };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    $('#usahaWargaPick').classList.add('hidden');
    $('#usahaModal').classList.remove('hidden');
  }
  if (del) {
    if (!confirm('Hapus data usaha ini?')) return;
    try {
      await api(`/api/admin/usaha/${del.dataset.delUsaha}`, { method: 'DELETE' });
      toast('Data usaha dihapus.');
      await muatUsaha();
    } catch (err) { toast(err.message, true); }
  }
});

/* ==========================================================
   Kartu Iuran Warga
   ========================================================== */

let kartuTerakhir = null; // { html }

async function muatPilihanKartu() {
  if (!cache.warga || !sudahDimuat.warga) {
    await muatWarga();
    sudahDimuat.warga = true;
  }
  const sel = $('#kartuWarga');
  const pilihan = sel.value;
  sel.innerHTML =
    '<option value="">— Pilih warga —</option>' +
    (cache.warga || [])
      .map((w) => `<option value="${w.id}">${esc(w.nama)} — ${esc(w.blok)}</option>`)
      .join('');
  if (pilihan) sel.value = pilihan;
  if (!cache.warga || !cache.warga.length) {
    $('#kartuArea').innerHTML = '<div class="empty">Belum ada data warga. Tambahkan warga terlebih dahulu di sub-menu Data Warga.</div>';
    $('#cetakKartu').classList.add('hidden');
    kartuTerakhir = null;
  }
}

function kartuHTML(k) {
  const w = k.warga;
  const barisRiwayat = k.riwayat.length
    ? k.riwayat
        .map(
          (r) => `<tr>
            <td>${tanggalPendek(r.created_at)}</td>
            <td>${esc(r.nomor)}</td>
            <td>${esc(r.periode || '—')}</td>
            <td>${esc(r.metode)}</td>
            <td class="right">${rupiah(r.nominal)}</td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5" class="empty">Belum ada setoran terverifikasi.</td></tr>';
  return `<div class="kartu-iuran">
    <div class="kartu-head">
      <div>
        <h4>KARTU IURAN WARGA</h4>
        <small>RT 04 / RW 12 · Perum Taman Buah Sukamantri</small>
        <small>Kec. Pasar Kemis, Kab. Tangerang</small>
      </div>
      <div class="kartu-logo">RT<br />04</div>
    </div>
    <div class="kartu-body">
      <div class="kartu-ident">
        <div><span>Nama</span><strong>${esc(w.nama)}</strong></div>
        <div><span>Blok / Rumah</span><strong>${esc(w.blok)}</strong></div>
        <div><span>NIK</span><strong>${esc(w.nik || '—')}</strong></div>
        <div><span>No. HP</span><strong>${esc(w.no_hp || '—')}</strong></div>
        <div><span>Status Warga</span><strong>${STATUS_WARGA_LABEL[w.status] || esc(w.status)}</strong></div>
        <div><span>Kepala Keluarga (KK)</span><strong>${esc(w.kk_kepala || '—')}</strong></div>
      </div>
      <table class="kartu-riwayat">
        <thead><tr><th>Tanggal</th><th>Nomor</th><th>Periode</th><th>Metode</th><th class="right">Nominal</th></tr></thead>
        <tbody>${barisRiwayat}</tbody>
      </table>
    </div>
    <div class="kartu-foot">
      <span>Total tercatat: <strong>${rupiah(k.total)}</strong> · ${k.riwayat.length} setoran</span>
      <span>Iuran bulanan: <strong>${rupiah(k.iuran_bulanan)}</strong></span>
      <span>Terbit: ${tanggalPanjang(new Date().toISOString())}</span>
    </div>
  </div>`;
}

$('#tampilkanKartu').addEventListener('click', async () => {
  const id = $('#kartuWarga').value;
  if (!id) {
    toast('Pilih warga terlebih dahulu.', true);
    return;
  }
  const box = $('#kartuArea');
  box.innerHTML = '<div class="empty">Memuat kartu…</div>';
  try {
    const k = await api(`/api/admin/kartu-iuran?warga_id=${id}`);
    kartuTerakhir = kartuHTML(k);
    box.innerHTML = `<div class="kartu-wrap">${kartuTerakhir}</div>`;
    $('#cetakKartu').classList.remove('hidden');
  } catch (err) {
    kartuTerakhir = null;
    $('#cetakKartu').classList.add('hidden');
    box.innerHTML = `<div class="empty">${esc(err.message)}</div>`;
  }
});

$('#cetakKartu').addEventListener('click', () => {
  if (!kartuTerakhir) return;
  $('#printArea').innerHTML = kartuTerakhir;
  window.print();
  toast('Kartu iuran dikirim ke pencetak.');
});

/* ==========================================================
   Pengguna Panel & Hak Otoritas
   ========================================================== */

const HAK_UI = [
  { v: 'pengajuan', label: 'Pengajuan' },
  { v: 'keuangan', label: 'Keuangan' },
  { v: 'data', label: 'Data Warga' },
  { v: 'bansos', label: 'Bansos' },
  { v: 'inventaris', label: 'Inventaris' },
  { v: 'pengumuman', label: 'Pengumuman' },
  { v: 'laporan', label: 'Laporan' },
  { v: 'pengaturan', label: 'Pengaturan' },
];
let userEditId = null;

async function muatUsers() {
  const { users } = await api('/api/admin/users');
  cache.users = users;
  const body = $('#usersBody');
  if (!users.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Belum ada pengguna panel. Kata sandi utama tetap berlaku sebagai admin sistem dengan akses penuh.</td></tr>';
    return;
  }
  body.innerHTML = users
    .map(
      (u) => `<tr>
        <td><strong>${esc(u.nama)}</strong></td>
        <td>${esc(u.username)}</td>
        <td>${HAK_UI.map((h) => `<span class="hak-chip ${u.hak.includes(h.v) ? '' : 'off'}">${h.label}</span>`).join('')}</td>
        <td><span class="badge ${u.aktif ? 'selesai' : 'ditolak'}">${u.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-user="${u.id}">Ubah</button>
          <button class="btn btn-ghost btn-sm" data-toggle-user="${u.id}">${u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>
          <button class="btn btn-danger btn-sm" data-del-user="${u.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

function isiFormUser(u, modeEdit) {
  const f = $('#userForm');
  f.reset();
  f.elements['username'].disabled = modeEdit;
  $('#userPassReq').classList.toggle('hidden', modeEdit);
  $('#userPassNote').textContent = modeEdit ? 'Kosongkan jika sandi tidak diubah.' : 'Minimal 6 karakter.';
  $('#userAktif').checked = modeEdit ? !!u.aktif : true;
  if (modeEdit) {
    f.elements['nama'].value = u.nama || '';
    f.elements['username'].value = u.username || '';
  }
  const hak = modeEdit ? u.hak || [] : HAK_SEMUA_UI;
  f.querySelectorAll('[name="hak"]').forEach((cb) => {
    cb.checked = hak.includes(cb.value);
  });
}

$('#tambahUser').addEventListener('click', () => {
  userEditId = null;
  $('#userModalTitle').textContent = 'Tambah Pengguna Panel';
  isiFormUser(null, false);
  $('#userModal').classList.remove('hidden');
});

$('#userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const hak = [...f.querySelectorAll('[name="hak"]:checked')].map((cb) => cb.value);
  const body = {
    nama: f.elements['nama'].value,
    hak,
    aktif: $('#userAktif').checked,
  };
  if (userEditId) {
    const pass = f.elements['password'].value;
    if (pass) body.password = pass;
    try {
      await api(`/api/admin/users/${userEditId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Pengguna diperbarui.');
    } catch (err) { toast(err.message, true); return; }
  } else {
    body.username = f.elements['username'].value.trim();
    body.password = f.elements['password'].value;
    try {
      await api('/api/admin/users', { method: 'POST', body: JSON.stringify(body) });
      toast('Pengguna panel ditambahkan.');
    } catch (err) { toast(err.message, true); return; }
  }
  $('#userModal').classList.add('hidden');
  await muatUsers();
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-user]');
  const tog = e.target.closest('[data-toggle-user]');
  const del = e.target.closest('[data-del-user]');
  if (ed) {
    const u = (cache.users || []).find((x) => x.id === Number(ed.dataset.editUser));
    if (!u) return;
    userEditId = u.id;
    $('#userModalTitle').textContent = `Ubah Pengguna — ${u.nama}`;
    isiFormUser(u, true);
    $('#userModal').classList.remove('hidden');
  }
  if (tog) {
    const u = (cache.users || []).find((x) => x.id === Number(tog.dataset.toggleUser));
    if (!u) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ aktif: !u.aktif }) });
      toast(u.aktif ? 'Akun dinonaktifkan.' : 'Akun diaktifkan kembali.');
      await muatUsers();
    } catch (err) { toast(err.message, true); }
  }
  if (del) {
    const u = (cache.users || []).find((x) => x.id === Number(del.dataset.delUser));
    if (!u) return;
    if (!confirm(`Hapus pengguna ${u.nama} (${u.username})?`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      toast('Pengguna dihapus.');
      await muatUsers();
    } catch (err) { toast(err.message, true); }
  }
});

/* ==========================================================
   Bansos — program, penerima & tanda terima digital
   ========================================================== */

const JENIS_BANSOS_LABEL = {
  sembako: 'Sembako', uang_tunai: 'Uang Tunai', obat: 'Obat / Kesehatan',
  pakaian: 'Pakaian', layanan: 'Layanan', lainnya: 'Lainnya',
};
let bansosAktif = null;

async function muatBansos() {
  const { bansos } = await api('/api/admin/bansos');
  cache.bansos = bansos;
  const box = $('#bansosList');
  const pilih = $('#bansosPilih');
  const sebelum = bansosAktif;
  pilih.innerHTML =
    '<option value="">— Pilih program —</option>' +
    bansos.map((b) => `<option value="${b.id}">${esc(b.nama_program)}</option>`).join('');
  if (sebelum && bansos.some((b) => b.id === sebelum)) {
    pilih.value = String(sebelum);
  } else {
    bansosAktif = null;
  }
  if (!bansos.length) {
    box.innerHTML = '<div class="empty">Belum ada program bantuan. Klik "+ Program Baru" untuk memulai.</div>';
  } else {
    box.innerHTML = bansos
      .map(
        (b) => `<div class="pengumuman-item">
        <div>
          <span class="badge jenis">${JENIS_BANSOS_LABEL[b.jenis] || esc(b.jenis)}</span>
          <h4>${esc(b.nama_program)}</h4>
          ${b.deskripsi ? `<p>${esc(b.deskripsi)}</p>` : ''}
          <small class="muted">${b.tanggal ? `📅 ${tanggalPanjang(b.tanggal)} · ` : ''}Penerima <strong>${b.jml_penerima}</strong> · Disalurkan <strong>${b.jml_disalurkan}</strong>${b.nominal_total ? ` · Nilai ${rupiah(b.nominal_total)}` : ''}</small>
        </div>
        <div class="pengumuman-actions">
          <button class="btn btn-ghost btn-sm" data-pilih-bansos="${b.id}">Kelola Penerima</button>
          <button class="btn btn-ghost btn-sm" data-edit-bansos="${b.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-bansos="${b.id}">Hapus</button>
        </div>
      </div>`
      )
      .join('');
  }
  if (bansosAktif) await muatPenerima(bansosAktif);
  else $('#penerimaBody').innerHTML = '<tr><td colspan="7" class="empty">Pilih program bantuan untuk melihat penerima.</td></tr>';
}

async function muatPenerima(id) {
  const { penerima } = await api(`/api/admin/bansos/${id}/penerima`);
  cache.penerima = penerima;
  bansosAktif = Number(id);
  $('#bansosPilih').value = String(id);
  const body = $('#penerimaBody');
  if (!penerima.length) {
    body.innerHTML = barisKosong('Belum ada penerima pada program ini.', 7);
    return;
  }
  body.innerHTML = penerima
    .map((p) => {
      const aksi =
        (p.status === 'terdaftar'
          ? `<button class="btn btn-sm" data-terima="${p.id}">✅ Salurkan</button>
             <button class="btn btn-ghost btn-sm" data-edit-penerima="${p.id}">Ubah</button>`
          : `<button class="btn btn-ghost btn-sm" data-cetak-terima="${p.id}">🖨️ Cetak</button>`) +
        ` <button class="btn btn-danger btn-sm" data-del-penerima="${p.id}">Hapus</button>`;
      return `<tr>
        <td><strong>${esc(p.nama)}</strong></td>
        <td>${esc(p.blok)}</td>
        <td>${esc(p.no_hp || '—')}</td>
        <td>${p.nominal ? rupiah(p.nominal) : '—'}</td>
        <td>${esc(p.keterangan || '—')}</td>
        <td><span class="badge ${p.status === 'disalurkan' ? 'selesai' : 'menunggu'}">${p.status === 'disalurkan' ? 'Disalurkan' : 'Terdaftar'}</span>${p.nomor_terima ? `<br /><small class="muted">${esc(p.nomor_terima)}</small>` : ''}</td>
        <td class="row-actions">${aksi}</td>
      </tr>`;
    })
    .join('');
}

$('#bansosPilih').addEventListener('change', (e) => {
  const id = Number(e.target.value);
  if (!id) {
    bansosAktif = null;
    $('#penerimaBody').innerHTML = '<tr><td colspan="7" class="empty">Pilih program bantuan untuk melihat penerima.</td></tr>';
    return;
  }
  muatPenerima(id).catch((err) => toast(err.message, true));
});
$('#reloadBansos').addEventListener('click', () => muatBansos().then(() => toast('Data bansos dimuat ulang.')).catch((e) => toast(e.message, true)));
$('#reloadPenerima').addEventListener('click', () => {
  if (!bansosAktif) return toast('Pilih program terlebih dahulu.', true);
  muatPenerima(bansosAktif).then(() => toast('Daftar penerima dimuat ulang.')).catch((e) => toast(e.message, true));
});

$('#tambahBansos').addEventListener('click', () => {
  editId.bansos = null;
  $('#bansosModalTitle').textContent = 'Program Bantuan Baru';
  $('#bansosForm').reset();
  $('#bansosModal').classList.remove('hidden');
});

$('#bansosForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.bansos) {
      await api(`/api/admin/bansos/${editId.bansos}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Program bantuan diperbarui.');
    } else {
      await api('/api/admin/bansos', { method: 'POST', body: JSON.stringify(body) });
      toast('Program bantuan dibuat.');
    }
    $('#bansosModal').classList.add('hidden');
    await muatBansos();
  } catch (err) { toast(err.message, true); }
});

$('#tambahPenerima').addEventListener('click', () => {
  if (!bansosAktif) return toast('Pilih program bantuan terlebih dahulu.', true);
  editId.penerima = null;
  $('#penerimaModalTitle').textContent = 'Tambah Penerima';
  $('#penerimaForm').reset();
  $('#penerimaModal').classList.remove('hidden');
});

$('#penerimaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.penerima) {
      await api(`/api/admin/bansos/penerima/${editId.penerima}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Data penerima diperbarui.');
    } else {
      await api(`/api/admin/bansos/${bansosAktif}/penerima`, { method: 'POST', body: JSON.stringify(body) });
      toast('Penerima ditambahkan.');
    }
    $('#penerimaModal').classList.add('hidden');
    await Promise.all([muatPenerima(bansosAktif), muatBansos()]);
  } catch (err) { toast(err.message, true); }
});

/* Terbitkan tanda terima */
let terimaId = null;
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-terima]');
  if (!t) return;
  const p = (cache.penerima || []).find((x) => x.id === Number(t.dataset.terima));
  if (!p) return;
  terimaId = p.id;
  const prog = (cache.bansos || []).find((b) => b.id === bansosAktif) || {};
  $('#terimaDetail').innerHTML = `
    <div><span>Program</span><strong>${esc(prog.nama_program || '—')}</strong></div>
    <div><span>Nama Penerima</span><strong>${esc(p.nama)}</strong></div>
    <div><span>Blok</span><strong>${esc(p.blok)}</strong></div>
    <div><span>Nominal</span><strong>${p.nominal ? rupiah(p.nominal) : '—'}</strong></div>`;
  $('#terimaTtd').value = p.nama;
  $('#terimaModal').classList.remove('hidden');
});

$('#terimaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!terimaId) return;
  try {
    const res = await api(`/api/admin/bansos/penerima/${terimaId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'disalurkan', tanda_tangan: $('#terimaTtd').value }),
    });
    toast(res.pesan || 'Tanda terima diterbitkan.');
    $('#terimaModal').classList.add('hidden');
    await Promise.all([muatPenerima(bansosAktif), muatBansos()]);
  } catch (err) { toast(err.message, true); }
});

function terimaHTML(p) {
  const prog = (cache.bansos || []).find((b) => b.id === p.bansos_id) || {};
  return `<div class="terima-card">
    <div class="terima-kop">
      <h4>TANDA TERIMA BANTUAN SOSIAL</h4>
      <small>RT 04 / RW 12 · Perum Taman Buah Sukamantri</small>
      <small>Kec. Pasar Kemis, Kab. Tangerang</small>
    </div>
    <div class="terima-body">
      <div class="terima-nomor">${esc(p.nomor_terima || '—')}</div>
      <div class="kartu-ident">
        <div><span>Nama Penerima</span><strong>${esc(p.nama)}</strong></div>
        <div><span>Blok / Rumah</span><strong>${esc(p.blok)}</strong></div>
        <div><span>Program</span><strong>${esc(prog.nama_program || 'Bantuan Sosial')}</strong></div>
        <div><span>Jenis</span><strong>${JENIS_BANSOS_LABEL[prog.jenis] || '—'}</strong></div>
        <div><span>Nominal</span><strong>${p.nominal ? rupiah(p.nominal) : '—'}</strong></div>
        <div><span>Tanggal Terima</span><strong>${tanggalPanjang(p.diterima_at || p.created_at)}</strong></div>
        ${p.keterangan ? `<div><span>Keterangan</span><strong>${esc(p.keterangan)}</strong></div>` : ''}
      </div>
      <div class="terima-ttd">
        <div>Penerima,</div>
        <div class="ttd-box"><div class="ttd-nama">${esc(p.tanda_tangan || p.nama)}</div></div>
      </div>
      <div class="terima-catatan">Diterbitkan secara digital oleh sistem layanan RT 04 / RW 12. Dapat diverifikasi warga melalui menu Lacak Pengajuan di website RT dengan nomor tanda terima tersebut.</div>
    </div>
  </div>`;
}

document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-cetak-terima]');
  if (c) {
    const p = (cache.penerima || []).find((x) => x.id === Number(c.dataset.cetakTerima));
    if (!p) return;
    $('#printArea').innerHTML = terimaHTML(p);
    window.print();
    toast('Tanda terima dikirim ke pencetak.');
    return;
  }
  const ed = e.target.closest('[data-edit-bansos]');
  if (ed) {
    const b = (cache.bansos || []).find((x) => x.id === Number(ed.dataset.editBansos));
    if (!b) return;
    editId.bansos = b.id;
    $('#bansosModalTitle').textContent = `Ubah Program — ${b.nama_program}`;
    const f = $('#bansosForm');
    f.reset();
    const isi = { nama_program: b.nama_program, jenis: b.jenis, tanggal: b.tanggal, deskripsi: b.deskripsi };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    $('#bansosModal').classList.remove('hidden');
  }
  const del = e.target.closest('[data-del-bansos]');
  if (del) {
    if (!confirm('Hapus program bantuan beserta daftar penerimanya?')) return;
    api(`/api/admin/bansos/${del.dataset.delBansos}`, { method: 'DELETE' })
      .then(async () => {
        toast('Program bantuan dihapus.');
        if (bansosAktif === Number(del.dataset.delBansos)) bansosAktif = null;
        await muatBansos();
      })
      .catch((err) => toast(err.message, true));
  }
  const pilih = e.target.closest('[data-pilih-bansos]');
  if (pilih) {
    muatPenerima(Number(pilih.dataset.pilihBansos)).catch((err) => toast(err.message, true));
  }
});

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-penerima]');
  const del = e.target.closest('[data-del-penerima]');
  if (ed) {
    const p = (cache.penerima || []).find((x) => x.id === Number(ed.dataset.editPenerima));
    if (!p) return;
    editId.penerima = p.id;
    $('#penerimaModalTitle').textContent = `Ubah Penerima — ${p.nama}`;
    const f = $('#penerimaForm');
    f.reset();
    const isi = { nama: p.nama, blok: p.blok, no_hp: p.no_hp, nominal: p.nominal, keterangan: p.keterangan };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    $('#penerimaModal').classList.remove('hidden');
  }
  if (del) {
    if (!confirm('Hapus data penerima ini?')) return;
    try {
      await api(`/api/admin/bansos/penerima/${del.dataset.delPenerima}`, { method: 'DELETE' });
      toast('Penerima dihapus.');
      await Promise.all([muatPenerima(bansosAktif), muatBansos()]);
    } catch (err) { toast(err.message, true); }
  }
});

/* ==========================================================
   Inventaris — barang, peminjaman/pengembalian & buku keuangan
   ========================================================== */

const KATEGORI_BARANG_LABEL = {
  elektronik: 'Elektronik', perkakas: 'Perkakas', furniture: 'Furniture',
  olahraga: 'Olahraga', kebersihan: 'Kebersihan', dokumen: 'Dokumen', lainnya: 'Lainnya',
};
const KONDISI_BARANG_LABEL = { baik: 'Baik', rusak_ringan: 'Rusak Ringan', rusak_berat: 'Rusak Berat' };

async function muatBarang() {
  const params = new URLSearchParams();
  const q = $('#cariBarang').value.trim();
  const kat = $('#filterBarang').value;
  if (q) params.set('q', q);
  if (kat) params.set('kategori', kat);
  const res = await api(`/api/admin/barang?${params}`);
  cache.barang = res.barang;
  $('#invTotal').textContent = res.total;
  $('#invDipinjam').textContent = res.dipinjam;
  $('#invTersedia').textContent = res.tersedia;
  const body = $('#barangBody');
  if (!res.barang.length) {
    body.innerHTML = barisKosong(q ? 'Barang tidak ditemukan.' : 'Belum ada barang. Klik "+ Tambah Barang" untuk memulai.', 6);
    return;
  }
  body.innerHTML = res.barang
    .map(
      (b) => `<tr>
        <td><strong>${esc(b.nama)}</strong>${b.keterangan ? `<br /><small class="muted">${esc(b.keterangan)}</small>` : ''}</td>
        <td><span class="badge jenis">${KATEGORI_BARANG_LABEL[b.kategori] || esc(b.kategori)}</span></td>
        <td><strong>${b.tersedia}</strong> / ${b.jumlah} unit${b.dipinjam ? ` <small class="muted">(${b.dipinjam} dipinjam)</small>` : ''}</td>
        <td><span class="badge ${b.kondisi === 'baik' ? 'selesai' : b.kondisi === 'rusak_berat' ? 'ditolak' : 'menunggu'}">${KONDISI_BARANG_LABEL[b.kondisi] || esc(b.kondisi)}</span></td>
        <td>${esc(b.lokasi || '—')}</td>
        <td class="row-actions">
          <button class="btn btn-sm" data-pinjam="${b.id}" ${b.tersedia < 1 ? 'disabled' : ''}>Pinjam</button>
          <button class="btn btn-ghost btn-sm" data-edit-barang="${b.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-barang="${b.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

async function muatPinjaman() {
  const status = $('#filterPinjaman').value;
  const res = await api(`/api/admin/pinjaman${status ? `?status=${status}` : ''}`);
  cache.pinjaman = res.pinjaman;
  const bk = res.buku_keuangan;
  $('#bkTotal').textContent = rupiah(bk.total_biaya);
  $('#bkLunas').textContent = rupiah(bk.total_lunas);
  $('#bkBelum').textContent = rupiah(bk.total_belum_lunas);

  const body = $('#pinjamanBody');
  if (!res.pinjaman.length) {
    body.innerHTML = barisKosong('Belum ada peminjaman.', 8);
  } else {
    body.innerHTML = res.pinjaman
      .map(
        (p) => `<tr>
          <td><strong>${esc(p.barang_nama || '—')}</strong></td>
          <td>${esc(p.nama_peminjam)}<br /><small class="muted">${esc(p.blok || '')}${p.no_hp ? ' · ' + esc(p.no_hp) : ''}</small></td>
          <td>${p.jumlah}</td>
          <td>${tanggalPendek(p.tanggal_pinjam)}</td>
          <td>${p.tanggal_target ? tanggalPendek(p.tanggal_target) : '—'}</td>
          <td>${p.biaya ? rupiah(p.biaya) : '—'}</td>
          <td><span class="badge ${p.status === 'kembali' ? 'selesai' : 'diproses'}">${p.status === 'kembali' ? 'Kembali' : 'Dipinjam'}</span>${p.status === 'kembali' && p.tanggal_kembali ? `<br /><small class="muted">${tanggalPendek(p.tanggal_kembali)}</small>` : ''}</td>
          <td class="row-actions">
            ${
              p.status === 'dipinjam'
                ? `<button class="btn btn-sm" data-kembali="${p.id}">↩ Kembalikan</button>
                   <button class="btn btn-ghost btn-sm" data-edit-pinjaman="${p.id}">Ubah</button>`
                : `<button class="btn btn-danger btn-sm" data-del-pinjaman="${p.id}">Hapus</button>`
            }
          </td>
        </tr>`
      )
      .join('');
  }

  const biayaRows = res.pinjaman.filter((p) => (p.biaya || 0) > 0);
  const bkBody = $('#bukuBody');
  if (!biayaRows.length) {
    bkBody.innerHTML = barisKosong('Belum ada transaksi biaya peminjaman.', 5);
  } else {
    bkBody.innerHTML = biayaRows
      .map(
        (p) => `<tr>
          <td>${tanggalPendek(p.tanggal_pinjam)}</td>
          <td>${esc(p.nama_peminjam)}</td>
          <td>${esc(p.barang_nama || '—')}</td>
          <td class="right" style="font-weight:700">${rupiah(p.biaya)}</td>
          <td><span class="badge ${p.status === 'kembali' ? 'selesai' : 'diproses'}">${p.status === 'kembali' ? 'Lunas' : 'Belum Lunas'}</span></td>
        </tr>`
      )
      .join('');
  }
}

$('#cariBarang').addEventListener('input', debounce(() => muatBarang().catch((e) => toast(e.message, true))));
$('#filterBarang').addEventListener('change', () => muatBarang().catch((e) => toast(e.message, true)));
$('#filterPinjaman').addEventListener('change', () => muatPinjaman().catch((e) => toast(e.message, true)));
$('#reloadBarang').addEventListener('click', () =>
  Promise.all([muatBarang(), muatPinjaman()]).then(() => toast('Data inventaris dimuat ulang.')).catch((e) => toast(e.message, true))
);

$('#tambahBarang').addEventListener('click', () => {
  editId.barang = null;
  $('#barangModalTitle').textContent = 'Tambah Barang';
  $('#barangForm').reset();
  $('#barangForm').elements['jumlah'].value = 1;
  $('#barangModal').classList.remove('hidden');
});

$('#barangForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.barang) {
      await api(`/api/admin/barang/${editId.barang}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Data barang diperbarui.');
    } else {
      await api('/api/admin/barang', { method: 'POST', body: JSON.stringify(body) });
      toast('Barang ditambahkan ke inventaris.');
    }
    $('#barangModal').classList.add('hidden');
    await muatBarang();
  } catch (err) { toast(err.message, true); }
});

async function isiOpsiBarang(nilai) {
  if (!cache.barang || !cache.barang.length) await muatBarang();
  $('#pinjamBarang').innerHTML =
    '<option value="">— Pilih barang —</option>' +
    (cache.barang || [])
      .map((b) => `<option value="${b.id}" ${b.tersedia < 1 ? 'disabled' : ''}>${esc(b.nama)} — tersedia ${b.tersedia}/${b.jumlah}</option>`)
      .join('');
  if (nilai) $('#pinjamBarang').value = String(nilai);
}

$('#tambahPinjaman').addEventListener('click', async () => {
  try {
    editId.pinjaman = null;
    $('#pinjamanModalTitle').textContent = 'Catat Peminjaman';
    const f = $('#pinjamanForm');
    f.reset();
    f.elements['jumlah'].value = 1;
    f.elements['biaya'].value = 0;
    f.elements['tanggal_pinjam'].value = new Date().toISOString().slice(0, 10);
    f.elements['barang_id'].disabled = false;
    await isiOpsiBarang('');
    $('#pinjamanModal').classList.remove('hidden');
  } catch (err) { toast(err.message, true); }
});

$('#pinjamanForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.pinjaman) {
      await api(`/api/admin/pinjaman/${editId.pinjaman}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Peminjaman diperbarui.');
    } else {
      await api('/api/admin/pinjaman', { method: 'POST', body: JSON.stringify(body) });
      toast('Peminjaman dicatat.');
    }
    $('#pinjamanModal').classList.add('hidden');
    await Promise.all([muatPinjaman(), muatBarang()]);
  } catch (err) { toast(err.message, true); }
});

document.addEventListener('click', async (e) => {
  const pinjam = e.target.closest('[data-pinjam]');
  const kembali = e.target.closest('[data-kembali]');
  const edB = e.target.closest('[data-edit-barang]');
  const delB = e.target.closest('[data-del-barang]');
  const edP = e.target.closest('[data-edit-pinjaman]');
  const delP = e.target.closest('[data-del-pinjaman]');

  if (pinjam) {
    editId.pinjaman = null;
    $('#pinjamanModalTitle').textContent = 'Catat Peminjaman';
    const f = $('#pinjamanForm');
    f.reset();
    f.elements['jumlah'].value = 1;
    f.elements['biaya'].value = 0;
    f.elements['tanggal_pinjam'].value = new Date().toISOString().slice(0, 10);
    f.elements['barang_id'].disabled = false;
    try {
      await isiOpsiBarang(Number(pinjam.dataset.pinjam));
      $('#pinjamanModal').classList.remove('hidden');
    } catch (err) { toast(err.message, true); }
  }
  if (kembali) {
    if (!confirm('Catat pengembalian barang ini? Stok akan kembali tersedia.')) return;
    try {
      await api(`/api/admin/pinjaman/${kembali.dataset.kembali}`, { method: 'PATCH', body: JSON.stringify({ status: 'kembali' }) });
      toast('Pengembalian dicatat. Terima kasih!');
      await Promise.all([muatPinjaman(), muatBarang()]);
    } catch (err) { toast(err.message, true); }
  }
  if (edB) {
    const b = (cache.barang || []).find((x) => x.id === Number(edB.dataset.editBarang));
    if (!b) return;
    editId.barang = b.id;
    $('#barangModalTitle').textContent = `Ubah Barang — ${b.nama}`;
    const f = $('#barangForm');
    f.reset();
    const isi = { nama: b.nama, kategori: b.kategori, jumlah: b.jumlah, kondisi: b.kondisi, lokasi: b.lokasi, keterangan: b.keterangan };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    $('#barangModal').classList.remove('hidden');
  }
  if (delB) {
    if (!confirm('Hapus barang ini dari inventaris?')) return;
    try {
      await api(`/api/admin/barang/${delB.dataset.delBarang}`, { method: 'DELETE' });
      toast('Barang dihapus.');
      await muatBarang();
    } catch (err) { toast(err.message, true); }
  }
  if (edP) {
    const p = (cache.pinjaman || []).find((x) => x.id === Number(edP.dataset.editPinjaman));
    if (!p) return;
    editId.pinjaman = p.id;
    $('#pinjamanModalTitle').textContent = `Ubah Peminjaman — ${p.barang_nama || ''}`;
    const f = $('#pinjamanForm');
    f.reset();
    const isi = {
      nama_peminjam: p.nama_peminjam, blok: p.blok, no_hp: p.no_hp, jumlah: p.jumlah,
      tanggal_pinjam: p.tanggal_pinjam, tanggal_target: p.tanggal_target, biaya: p.biaya, keterangan: p.keterangan,
    };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    isiOpsiBarang(p.barang_id);
    f.elements['barang_id'].disabled = true; // barang tidak bisa dipindah
    $('#pinjamanModal').classList.remove('hidden');
  }
  if (delP) {
    if (!confirm('Hapus riwayat peminjaman ini?')) return;
    try {
      await api(`/api/admin/pinjaman/${delP.dataset.delPinjaman}`, { method: 'DELETE' });
      toast('Riwayat peminjaman dihapus.');
      await muatPinjaman();
    } catch (err) { toast(err.message, true); }
  }
});

/* ==========================================================
   Import CSV & Pindai Identitas (AI) — halaman Data Warga
   ========================================================== */

function barisCsv(teksBaris) {
  const hasil = [];
  let cur = '';
  let q = false;
  for (const ch of teksBaris) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { hasil.push(cur); cur = ''; }
    else cur += ch;
  }
  hasil.push(cur);
  return hasil.map((s) => s.trim().replace(/^"|"$/g, ''));
}

/* ---- Pembaca berkas Excel (.xlsx) tanpa pustaka eksternal ----
   XLSX adalah zip: daftar entri dibaca dari End Of Central Directory,
   isi lembar didekompresi dengan DecompressionStream('deflate-raw'). ---- */
async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function bacaXlsx(buf) {
  const bytes = new Uint8Array(buf);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Bukan berkas Excel (.xlsx) yang valid.');
  const jumlah = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const entri = new Map();
  for (let n = 0; n < jumlah; n++) {
    if (p + 46 > bytes.length || dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const namaLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const komentarLen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const nama = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + namaLen));
    entri.set(nama, { method, csize, lho });
    p += 46 + namaLen + extraLen + komentarLen;
  }
  async function isi(nama) {
    const e = entri.get(nama);
    if (!e) return null;
    if (dv.getUint32(e.lho, true) !== 0x04034b50) throw new Error('Struktur berkas Excel rusak.');
    const namaLen = dv.getUint16(e.lho + 26, true);
    const extraLen = dv.getUint16(e.lho + 28, true);
    const data = bytes.subarray(e.lho + 30 + namaLen + extraLen, e.lho + 30 + namaLen + extraLen + e.csize);
    if (e.method === 0) return data;
    if (e.method === 8) return inflateRaw(data);
    throw new Error('Metode kompresi Excel tidak didukung.');
  }
  const txt = async (nama) => { const b = await isi(nama); return b ? new TextDecoder().decode(b) : null; };
  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');

  // Nama lembar pertama → berkas sheet (target relasi workbook)
  const wbXml = (await txt('xl/workbook.xml')) || '';
  const relXml = (await txt('xl/_rels/workbook.xml.rels')) || '';
  let target = 'worksheets/sheet1.xml';
  const sheetEl = wbXml ? xml(wbXml).getElementsByTagName('sheet')[0] : null;
  const rid = sheetEl && (sheetEl.getAttribute('r:id') || sheetEl.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
  if (rid && relXml) {
    for (const rel of xml(relXml).getElementsByTagName('Relationship')) {
      if (rel.getAttribute('Id') === rid) { target = rel.getAttribute('Target'); break; }
    }
  }
  if (target.startsWith('/')) target = target.slice(1);
  else if (!target.startsWith('xl/')) target = 'xl/' + target;
  const sheetText = await txt(target);
  if (!sheetText) throw new Error('Lembar isi tidak ditemukan di berkas Excel.');

  // Kamus string bersama
  const shared = [];
  const ssText = await txt('xl/sharedStrings.xml');
  if (ssText) {
    for (const si of xml(ssText).getElementsByTagName('si')) {
      let s = '';
      for (const t of si.getElementsByTagName('t')) s += t.textContent;
      shared.push(s);
    }
  }

  const kolomDariRef = (ref) => {
    let n = 0;
    for (const ch of ref || '') {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) n = n * 26 + (c - 64);
      else break;
    }
    return n - 1;
  };
  const isiSel = (c) => {
    const t = c.getAttribute('t');
    if (t === 'inlineStr') { let s = ''; for (const x of c.getElementsByTagName('t')) s += x.textContent; return s.trim(); }
    const v = c.getElementsByTagName('v')[0];
    if (!v) return '';
    const teksNilai = v.textContent.trim();
    if (t === 's') return (shared[Number(teksNilai)] ?? '').trim();
    return teksNilai; // angka/string/boolean dipakai apa adanya (NIK utuh, tanpa notasi ilmiah)
  };

  const rows = [];
  for (const row of xml(sheetText).getElementsByTagName('row')) {
    const sel = [];
    for (const c of row.getElementsByTagName('c')) {
      const i = kolomDariRef(c.getAttribute('r'));
      if (i >= 0) sel[i] = isiSel(c);
      else sel.push(isiSel(c));
    }
    rows.push(sel.map((x) => (x === undefined || x === null ? '' : String(x).trim())));
  }
  return rows.filter((r) => r.some((x) => x !== ''));
}

function keCsvBaris(rows) {
  return rows
    .map((r) =>
      r
        .map((v) => { v = String(v ?? '').trim(); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; })
        .join(',')
    )
    .join('\n');
}

function parseImport() {
  const teks = $('#importCsv').value.trim();
  if (!teks) return [];
  const lines = teks.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let kolom = ['nama', 'blok', 'nik', 'jenis_kelamin', 'no_hp', 'pekerjaan', 'status'];
  let start = 0;
  const first = barisCsv(lines[0]).map((s) => s.toLowerCase().replace(/[^a-z_]/g, '').trim());
  if (first.includes('nama')) { kolom = first; start = 1; }
  return lines
    .slice(start)
    .map((line) => {
      const sel = barisCsv(line);
      const obj = {};
      kolom.forEach((k, i) => {
        if (sel[i] !== undefined && sel[i] !== '' && k) obj[k] = sel[i];
      });
      return obj;
    })
    .filter((o) => o.nama);
}

function hitungImport() {
  const rows = parseImport();
  $('#importInfo').textContent = rows.length ? `${rows.length} baris siap diimpor.` : 'Belum ada baris yang bisa dibaca.';
}

$('#importWarga').addEventListener('click', () => {
  $('#importCsv').value = '';
  $('#importFile').value = '';
  $('#importInfo').textContent = '';
  $('#importHasil').innerHTML = '';
  $('#importModal').classList.remove('hidden');
});
$('#importCsv').addEventListener('input', debounce(hitungImport, 400));
$('#importFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const nama = f.name.toLowerCase();
  if (nama.endsWith('.xlsx') || nama.endsWith('.xlsm')) {
    try {
      const rows = await bacaXlsx(await f.arrayBuffer());
      if (!rows.length) {
        toast('Tidak ada baris yang bisa dibaca dari berkas Excel.', true);
        e.target.value = '';
        return;
      }
      $('#importCsv').value = keCsvBaris(rows);
      hitungImport();
      toast(`Berhasil membaca ${rows.length} baris dari ${f.name}. Periksa pratinjau lalu klik Import.`);
    } catch (err) {
      toast(err.message || 'Berkas Excel tidak bisa dibaca.', true);
      e.target.value = '';
    }
  } else {
    $('#importCsv').value = await f.text();
    hitungImport();
  }
});
$('#jalankanImport').addEventListener('click', async () => {
  const rows = parseImport();
  if (!rows.length) return toast('Tidak ada baris untuk diimpor.', true);
  try {
    const res = await api('/api/admin/warga/import', { method: 'POST', body: JSON.stringify({ rows }) });
    toast(res.pesan);
    $('#importHasil').innerHTML = res.gagal.length
      ? `<div class="detail-box">${res.gagal
          .map((g) => `<div><span>Baris ${g.baris} — ${esc(g.nama)}</span><strong>${esc(g.error)}</strong></div>`)
          .join('')}</div>`
      : `<p style="color:var(--green-700);font-weight:700">Semua ${res.ditambahkan} baris berhasil diimpor.</p>`;
    if (sudahDimuat.warga) await muatWarga();
  } catch (err) { toast(err.message, true); }
});

let scanDataUrl = null;
$('#scanWarga').addEventListener('click', () => {
  scanDataUrl = null;
  $('#scanJenis').value = 'ktp';
  $('#scanFile').value = '';
  $('#scanHasil').innerHTML = '';
  $('#scanPreview').classList.add('hidden');
  $('#scanModal').classList.remove('hidden');
});
$('#scanFile').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 3 * 1024 * 1024) {
    toast('Ukuran foto maksimal 3 MB.', true);
    e.target.value = '';
    return;
  }
  const fr = new FileReader();
  fr.onload = () => {
    scanDataUrl = fr.result;
    $('#scanPreviewImg').src = scanDataUrl;
    $('#scanPreview').classList.remove('hidden');
  };
  fr.readAsDataURL(f);
});
$('#jalankanScan').addEventListener('click', async () => {
  if (!scanDataUrl) return toast('Pilih foto dokumen terlebih dahulu.', true);
  const btn = $('#jalankanScan');
  const asli = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Membaca dokumen…';
  $('#scanHasil').innerHTML = '<div class="muted">AI sedang membaca dokumen (bisa sampai ±15 detik)…</div>';
  try {
    const jenis = $('#scanJenis').value;
    const res = await api('/api/admin/scan-identitas', {
      method: 'POST',
      body: JSON.stringify({ jenis, image: scanDataUrl }),
    });
    $('#scanModal').classList.add('hidden');
    toast(res.pesan || 'Data terbaca. Periksa sebelum menyimpan.');
    if (jenis === 'ktp') await bukaWargaDariScan(res.data);
    else await bukaKKDariScan(res.data);
  } catch (err) {
    $('#scanHasil').innerHTML = `<div class="detail-box" style="background:var(--danger-soft);border-color:#f3c6c6;color:#8a1f1f"><strong>Gagal memindai:</strong><br />${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = asli;
  }
});

async function bukaWargaDariScan(d) {
  editId.warga = null;
  $('#wargaModalTitle').textContent = 'Tambah Data Warga (hasil pindai AI)';
  const f = $('#wargaForm');
  f.reset();
  f.elements['status'].value = 'tetap';
  const isi = { nama: d.nama, nik: d.nik, tempat_lahir: d.tempat_lahir, tanggal_lahir: d.tanggal_lahir, jenis_kelamin: d.jenis_kelamin, pekerjaan: d.pekerjaan };
  for (const [k, v] of Object.entries(isi)) {
    if (f.elements[k] && v) f.elements[k].value = v;
  }
  if (d.pekerjaan) {
    const r = f.querySelector('input[name="pekerjaan_status"][value="bekerja"]');
    if (r) r.checked = true;
  }
  sinkronPendidikanPekerjaan();
  await isiOpsiKK('');
  $('#wargaModal').classList.remove('hidden');
  if (!d.nama) toast('Sebagian data belum terbaca — lengkapi manual.', true);
}

async function bukaKKDariScan(d) {
  editId.kk = null;
  $('#kkModalTitle').textContent = 'Tambah Data KK (hasil pindai AI)';
  const f = $('#kkForm');
  f.reset();
  const isi = { nomor_kk: d.nomor_kk, kepala_keluarga: d.kepala_keluarga, alamat: d.alamat, jumlah_anggota: d.jumlah_anggota };
  for (const [k, v] of Object.entries(isi)) {
    if (f.elements[k] && v !== '' && v !== null && v !== undefined) f.elements[k].value = v;
  }
  $('#kkWargaPick').classList.remove('hidden');
  await isiPilihanWarga('#kkWarga');
  $('#kkModal').classList.remove('hidden');
  if (!d.kepala_keluarga) toast('Sebagian data belum terbaca — lengkapi manual.', true);
}

/* ==========================================================
   Pesan dari Halaman Kontak
   ========================================================== */
const PESAN_STATUS_LABEL = { baru: 'Belum Dibaca', dibaca: 'Sudah Dibaca' };

async function muatPesan() {
  const status = $('#filterPesan').value;
  const res = await api(`/api/admin/pesan${status ? `?status=${status}` : ''}`);
  cache.pesan = res.pesan;
  $('#pesanBaruLabel').textContent = res.baru ? `(${res.baru} belum dibaca)` : '';
  const body = $('#pesanBody');
  if (!res.pesan.length) {
    body.innerHTML = barisKosong('Belum ada pesan dari halaman kontak.', 6);
    return;
  }
  body.innerHTML = res.pesan
    .map(
      (p) => `<tr>
        <td>${tanggalPendek(p.created_at)}</td>
        <td><strong>${esc(p.nama)}</strong></td>
        <td>${esc(p.kontak || '—')}</td>
        <td style="max-width:22rem">${esc(p.pesan)}</td>
        <td><span class="badge ${esc(p.status)}">${PESAN_STATUS_LABEL[p.status] || esc(p.status)}</span></td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-toggle-pesan="${p.id}">${p.status === 'baru' ? 'Tandai Dibaca' : 'Tandai Belum'}</button>
          <button class="btn btn-danger btn-sm" data-del-pesan="${p.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#filterPesan').addEventListener('change', () => muatPesan().catch((e) => toast(e.message, true)));
$('#reloadPesan').addEventListener('click', () => muatPesan().then(() => toast('Pesan dimuat ulang.')).catch((e) => toast(e.message, true)));

document.addEventListener('click', async (e) => {
  const tog = e.target.closest('[data-toggle-pesan]');
  const del = e.target.closest('[data-del-pesan]');
  if (tog) {
    const p = (cache.pesan || []).find((x) => x.id === Number(tog.dataset.togglePesan));
    if (!p) return;
    try {
      await api(`/api/admin/pesan/${p.id}`, { method: 'PATCH', body: JSON.stringify({ status: p.status === 'baru' ? 'dibaca' : 'baru' }) });
      await muatPesan();
    } catch (err) { toast(err.message, true); }
  }
  if (del) {
    if (!confirm('Hapus pesan ini?')) return;
    try {
      await api(`/api/admin/pesan/${del.dataset.delPesan}`, { method: 'DELETE' });
      toast('Pesan dihapus.');
      await muatPesan();
    } catch (err) { toast(err.message, true); }
  }
});

/* ==========================================================
   Keamanan — Jadwal Ronda
   ========================================================== */
const RONDA_STATUS_LABEL = { terjadwal: 'Terjadwal', selesai: 'Selesai', batal: 'Batal' };
const KEJADIAN_STATUS_LABEL = { dilaporkan: 'Dilaporkan', diproses: 'Diproses', selesai: 'Selesai' };
const KEJADIAN_JENIS_LABEL = { pencurian: 'Pencurian', kecelakaan: 'Kecelakaan', kebakaran: 'Kebakaran', perselisihan: 'Perselisihan', lainnya: 'Lainnya' };

async function muatRonda() {
  const params = new URLSearchParams();
  const q = $('#cariRonda').value.trim();
  const status = $('#filterRonda').value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const res = await api(`/api/admin/ronda?${params}`);
  cache.ronda = res.ronda;
  $('#roTotal').textContent = res.total;
  $('#roMendatang').textContent = res.mendatang;
  $('#roSelesai').textContent = res.selesai;
  const body = $('#rondaBody');
  if (!res.ronda.length) {
    body.innerHTML = barisKosong(q ? 'Jadwal ronda tidak ditemukan.' : 'Belum ada jadwal ronda. Isi formulir di atas untuk menambah.', 7);
    return;
  }
  body.innerHTML = res.ronda
    .map(
      (r) => `<tr>
        <td><strong>${tanggalPendek(r.tanggal)}</strong></td>
        <td>${esc(r.regu)}</td>
        <td>${esc(r.petugas || '—')}</td>
        <td>${esc(r.pos || '—')}</td>
        <td><span class="badge ${esc(r.status)}">${RONDA_STATUS_LABEL[r.status] || esc(r.status)}</span></td>
        <td>${esc(r.catatan || '—')}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-ronda="${r.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-ronda="${r.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#cariRonda').addEventListener('input', debounce(() => muatRonda().catch((e) => toast(e.message, true))));
$('#filterRonda').addEventListener('change', () => muatRonda().catch((e) => toast(e.message, true)));
$('#reloadRonda').addEventListener('click', () => muatRonda().then(() => toast('Jadwal ronda dimuat ulang.')).catch((e) => toast(e.message, true)));

$('#rondaForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.ronda) {
      await api(`/api/admin/ronda/${editId.ronda}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Jadwal ronda diperbarui.');
    } else {
      await api('/api/admin/ronda', { method: 'POST', body: JSON.stringify(body) });
      toast('Jadwal ronda ditambahkan.');
    }
    resetFormRonda();
    await muatRonda();
  } catch (err) { toast(err.message, true); }
});

function resetFormRonda() {
  editId.ronda = null;
  $('#rondaForm').reset();
  $('#rondaSubmit').textContent = '+ Tambah Jadwal';
  $('#rondaBatal').classList.add('hidden');
}
$('#rondaBatal').addEventListener('click', resetFormRonda);

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-ronda]');
  const del = e.target.closest('[data-del-ronda]');
  if (ed) {
    const r = (cache.ronda || []).find((x) => x.id === Number(ed.dataset.editRonda));
    if (!r) return;
    editId.ronda = r.id;
    const f = $('#rondaForm');
    f.reset();
    const isi = { tanggal: r.tanggal, regu: r.regu, pos: r.pos, status: r.status, petugas: r.petugas, catatan: r.catatan };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    $('#rondaSubmit').textContent = '💾 Simpan Perubahan';
    $('#rondaBatal').classList.remove('hidden');
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (del) {
    if (!confirm('Hapus jadwal ronda ini?')) return;
    try {
      await api(`/api/admin/ronda/${del.dataset.delRonda}`, { method: 'DELETE' });
      toast('Jadwal ronda dihapus.');
      if (editId.ronda === Number(del.dataset.delRonda)) resetFormRonda();
      await muatRonda();
    } catch (err) { toast(err.message, true); }
  }
});

/* ---------- Keamanan — Laporan Kejadian ---------- */
async function muatKejadian() {
  const params = new URLSearchParams();
  const q = $('#cariKejadian').value.trim();
  const status = $('#filterKejStatus').value;
  const jenis = $('#filterKejJenis').value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  if (jenis) params.set('jenis', jenis);
  const res = await api(`/api/admin/kejadian?${params}`);
  cache.kejadian = res.kejadian;
  $('#kjTotal').textContent = res.total;
  $('#kjTerbuka').textContent = res.terbuka;
  $('#kjBulan').textContent = res.bulan_ini;
  const body = $('#kejadianBody');
  if (!res.kejadian.length) {
    body.innerHTML = barisKosong(q || status || jenis ? 'Laporan kejadian tidak ditemukan.' : 'Belum ada laporan kejadian. Semoga lingkungan tetap aman.', 8);
    return;
  }
  body.innerHTML = res.kejadian
    .map(
      (k) => `<tr>
        <td>${tanggalPendek(k.tanggal)}</td>
        <td><strong>${esc(k.nomor)}</strong></td>
        <td><span class="badge jenis">${KEJADIAN_JENIS_LABEL[k.jenis] || esc(k.jenis)}</span></td>
        <td>${esc(k.lokasi || '—')}</td>
        <td>${esc(k.pelapor || '—')}</td>
        <td style="max-width:24rem">${esc(k.kronologi.slice(0, 120))}${k.kronologi.length > 120 ? '…' : ''}${k.penanganan ? `<br /><small class="muted">Penanganan: ${esc(k.penanganan)}</small>` : ''}</td>
        <td><span class="badge ${esc(k.status)}">${KEJADIAN_STATUS_LABEL[k.status] || esc(k.status)}</span></td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-edit-kejadian="${k.id}">Kelola</button>
          <button class="btn btn-danger btn-sm" data-del-kejadian="${k.id}">Hapus</button>
        </td>
      </tr>`
    )
    .join('');
}

$('#cariKejadian').addEventListener('input', debounce(() => muatKejadian().catch((e) => toast(e.message, true))));
$('#filterKejStatus').addEventListener('change', () => muatKejadian().catch((e) => toast(e.message, true)));
$('#filterKejJenis').addEventListener('change', () => muatKejadian().catch((e) => toast(e.message, true)));
$('#reloadKejadian').addEventListener('click', () => muatKejadian().then(() => toast('Laporan kejadian dimuat ulang.')).catch((e) => toast(e.message, true)));

$('#kejadianForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.kejadian) {
      await api(`/api/admin/kejadian/${editId.kejadian}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Laporan kejadian diperbarui.');
    } else {
      const res = await api('/api/admin/kejadian', { method: 'POST', body: JSON.stringify(body) });
      toast(`Kejadian dicatat — nomor ${res.nomor}`);
    }
    resetFormKejadian();
    await muatKejadian();
  } catch (err) { toast(err.message, true); }
});

function resetFormKejadian() {
  editId.kejadian = null;
  $('#kejadianForm').reset();
  $('#kejadianSubmit').textContent = '+ Catat Kejadian';
  $('#kejadianBatal').classList.add('hidden');
}
$('#kejadianBatal').addEventListener('click', resetFormKejadian);

document.addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit-kejadian]');
  const del = e.target.closest('[data-del-kejadian]');
  if (ed) {
    const k = (cache.kejadian || []).find((x) => x.id === Number(ed.dataset.editKejadian));
    if (!k) return;
    editId.kejadian = k.id;
    const f = $('#kejadianForm');
    f.reset();
    const isi = { tanggal: k.tanggal, jenis: k.jenis, lokasi: k.lokasi, pelapor: k.pelapor, kronologi: k.kronologi, penanganan: k.penanganan, status: k.status };
    for (const [key, v] of Object.entries(isi)) {
      if (f.elements[key] && v !== null && v !== undefined) f.elements[key].value = v;
    }
    $('#kejadianSubmit').textContent = '💾 Simpan Perubahan';
    $('#kejadianBatal').classList.remove('hidden');
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (del) {
    if (!confirm('Hapus laporan kejadian ini?')) return;
    try {
      await api(`/api/admin/kejadian/${del.dataset.delKejadian}`, { method: 'DELETE' });
      toast('Laporan kejadian dihapus.');
      if (editId.kejadian === Number(del.dataset.delKejadian)) resetFormKejadian();
      await muatKejadian();
    } catch (err) { toast(err.message, true); }
  }
});

/* ==========================================================
   Log Aktivitas
   ========================================================== */
const AKSI_LOG_BADGE = (status) => (status >= 400 ? 'ditolak' : 'selesai');

function waktuLog(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const jam = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  return `${tanggalPendek(iso)} ${jam}`;
}

async function muatLog() {
  const params = new URLSearchParams();
  const q = $('#cariLog').value.trim();
  const modul = $('#filterLogModul').value;
  if (q) params.set('q', q);
  if (modul) params.set('modul', modul);
  const res = await api(`/api/admin/log?${params}`);
  cache.log = res.log;
  $('#lgTotal').textContent = res.total;
  $('#lgHari').textContent = res.hari_ini;
  $('#lgGagal').textContent = res.gagal;

  const sel = $('#filterLogModul');
  const dipilih = sel.value;
  const opsi = new Set(res.modul || []);
  if (dipilih) opsi.add(dipilih);
  sel.innerHTML = '<option value="">Semua modul</option>' +
    [...opsi].map((m) => `<option value="${esc(m)}"${m === dipilih ? ' selected' : ''}>${esc(m)}</option>`).join('');

  const body = $('#logBody');
  if (!res.log.length) {
    body.innerHTML = barisKosong(q || modul ? 'Log tidak ditemukan.' : 'Belum ada aktivitas tercatat.', 6);
    return;
  }
  body.innerHTML = res.log
    .map((l) => `<tr>
      <td style="white-space:nowrap"><strong>${waktuLog(l.waktu)}</strong></td>
      <td>${esc(l.user_nama || 'Pengunjung')}</td>
      <td><span class="badge jenis">${esc(l.modul)}</span></td>
      <td><span class="badge ${AKSI_LOG_BADGE(l.status)}">${esc(l.aksi)}</span></td>
      <td style="max-width:24rem">${esc(l.keterangan || '—')}${l.status ? `<br /><small class="muted">HTTP ${l.status}</small>` : ''}</td>
      <td><small class="muted">${esc(l.ip || '—')}</small></td>
    </tr>`)
    .join('');
}

$('#cariLog').addEventListener('input', debounce(() => muatLog().catch((e) => toast(e.message, true))));
$('#filterLogModul').addEventListener('change', () => muatLog().catch((e) => toast(e.message, true)));
$('#reloadLog').addEventListener('click', () => muatLog().then(() => toast('Log dimuat ulang.')).catch((e) => toast(e.message, true)));
$('#bersihkanLog').addEventListener('click', async () => {
  if (!confirm('Bersihkan seluruh log aktivitas? Tindakan ini tidak bisa dibatalkan.')) return;
  try {
    const res = await api('/api/admin/log', { method: 'DELETE' });
    toast(res.pesan || 'Log dibersihkan.');
    await muatLog();
  } catch (err) { toast(err.message, true); }
});

/* ==========================================================
   Keamanan — Buku Tamu
   ========================================================== */
function jamJam(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const jam = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${jam}`;
}

async function muatTamu() {
  const params = new URLSearchParams();
  const q = $('#cariTamu').value.trim();
  const status = $('#filterTamu').value;
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const res = await api(`/api/admin/buku-tamu?${params}`);
  cache.tamu = res.tamu;
  $('#btTotal').textContent = res.total;
  $('#btDalam').textContent = res.di_dalam;
  $('#btHari').textContent = res.hari_ini;
  const body = $('#tamuBody');
  if (!res.tamu.length) {
    body.innerHTML = barisKosong(q || status ? 'Tamu tidak ditemukan.' : 'Belum ada tamu tercatat hari ini.', 8);
    return;
  }
  body.innerHTML = res.tamu
    .map((t) => {
      const diDalam = !t.jam_keluar;
      return `<tr>
        <td><strong>${jamJam(t.jam_masuk) || '—'}</strong></td>
        <td>${esc(t.nama)}</td>
        <td>${esc(t.asal || '—')}</td>
        <td>${esc(t.no_hp || '—')}</td>
        <td>${esc(t.keperluan)}${t.catatan ? `<br /><small class="muted">${esc(t.catatan)}</small>` : ''}</td>
        <td>${esc(t.petugas || '—')}</td>
        <td>${diDalam ? '<span class="badge baru">Di Dalam</span>' : `<span class="badge selesai">${jamJam(t.jam_keluar)}</span>`}</td>
        <td class="row-actions">
          <button class="btn btn-ghost btn-sm" data-toggle-tamu="${t.id}">${diDalam ? '↩ Tandai Keluar' : '↩ Buka Kembali'}</button>
          <button class="btn btn-ghost btn-sm" data-edit-tamu="${t.id}">Ubah</button>
          <button class="btn btn-danger btn-sm" data-del-tamu="${t.id}">Hapus</button>
        </td>
      </tr>`;
    })
    .join('');
}

$('#cariTamu').addEventListener('input', debounce(() => muatTamu().catch((e) => toast(e.message, true))));
$('#filterTamu').addEventListener('change', () => muatTamu().catch((e) => toast(e.message, true)));
$('#reloadTamu').addEventListener('click', () => muatTamu().then(() => toast('Buku tamu dimuat ulang.')).catch((e) => toast(e.message, true)));

$('#tamuForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (editId.tamu) {
      await api(`/api/admin/buku-tamu/${editId.tamu}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Entri buku tamu diperbarui.');
    } else {
      await api('/api/admin/buku-tamu', { method: 'POST', body: JSON.stringify(body) });
      toast('Tamu tercatat masuk.');
    }
    resetFormTamu();
    await muatTamu();
  } catch (err) { toast(err.message, true); }
});

function resetFormTamu() {
  editId.tamu = null;
  $('#tamuForm').reset();
  $('#tamuSubmit').textContent = '+ Catat Tamu Masuk';
  $('#tamuBatal').classList.add('hidden');
}
$('#tamuBatal').addEventListener('click', resetFormTamu);

document.addEventListener('click', async (e) => {
  const tog = e.target.closest('[data-toggle-tamu]');
  const ed = e.target.closest('[data-edit-tamu]');
  const del = e.target.closest('[data-del-tamu]');
  if (tog) {
    const t = (cache.tamu || []).find((x) => x.id === Number(tog.dataset.toggleTamu));
    if (!t) return;
    try {
      await api(`/api/admin/buku-tamu/${t.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ jam_keluar: t.jam_keluar ? null : new Date().toISOString() }),
      });
      toast(t.jam_keluar ? 'Tamu dibuka kembali (masih di dalam).' : 'Tamu ditandai keluar.');
      await muatTamu();
    } catch (err) { toast(err.message, true); }
  }
  if (ed) {
    const t = (cache.tamu || []).find((x) => x.id === Number(ed.dataset.editTamu));
    if (!t) return;
    editId.tamu = t.id;
    const f = $('#tamuForm');
    f.reset();
    const isi = { nama: t.nama, asal: t.asal, no_hp: t.no_hp, petugas: t.petugas, keperluan: t.keperluan, catatan: t.catatan };
    for (const [k, v] of Object.entries(isi)) {
      if (f.elements[k] && v !== null && v !== undefined) f.elements[k].value = v;
    }
    $('#tamuSubmit').textContent = '💾 Simpan Perubahan';
    $('#tamuBatal').classList.remove('hidden');
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  if (del) {
    if (!confirm('Hapus entri buku tamu ini?')) return;
    try {
      await api(`/api/admin/buku-tamu/${del.dataset.delTamu}`, { method: 'DELETE' });
      toast('Entri buku tamu dihapus.');
      if (editId.tamu === Number(del.dataset.delTamu)) resetFormTamu();
      await muatTamu();
    } catch (err) { toast(err.message, true); }
  }
});
