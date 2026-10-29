import json, os, datetime

os.makedirs("data", exist_ok=True)

# Load base seed data from earlier fetch
with open('/tmp/seed_data.json') as f:
    remote_seed = json.load(f)

info = remote_seed.get('/api/info', {})
profil = info.get('profil', {})
pengurus = info.get('pengurus', [])
kontak = info.get('kontak', {})
darurat = info.get('darurat', [])
pengurus_pkk = info.get('pengurus_pkk', [])
pengurus_karangtaruna = info.get('pengurus_karangtaruna', [])
proker_pendek = info.get('proker_pendek', [])
proker_menengah = info.get('proker_menengah', [])
proker_panjang = info.get('proker_panjang', [])
aturan = info.get('aturan', [])

rumah_list = []
blocks = [
    ('Blok Jambu 1', 12),
    ('Blok Jambu 2', 12),
    ('Blok Mangga', 14),
    ('Blok Sawo', 12),
    ('Blok Durian', 10),
]

rid = 1
for bname, count in blocks:
    for num in range(1, count + 1):
        status = 'dihuni' if num % 6 != 0 else 'kosong'
        tipe_huni = 'milik' if num % 3 != 0 else 'kontrak'
        rumah_list.append({
            'id': rid,
            'blok': bname,
            'nomor': f"No. {num:02d}",
            'alamat_lengkap': f"{bname} No. {num:02d}, RT 04 / RW 12",
            'status_huni': status,
            'tipe_huni': tipe_huni if status == 'dihuni' else '-',
            'daya_listrik': '1300VA' if num % 2 == 0 else ('2200VA' if num % 5 == 0 else '900VA'),
            'sumber_air': 'PDAM' if num % 2 == 0 else 'Sumur Bor',
            'internet': 'IndiHome' if num % 3 == 0 else ('Biznet' if num % 4 == 0 else 'FirstMedia'),
            'cctv': num % 4 == 0,
            'kendaraan': '1 Mobil, 2 Motor' if num % 2 == 0 else '2 Motor',
            'catatan': ''
        })
        rid += 1

# KK list
kk_list = [
    {'id': 1, 'no_kk': '3671012304890001', 'kepala_keluarga': 'Ahmad Suryana', 'rumah_id': 1, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 01', 'telepon': '081234567890', 'anggota_count': 4},
    {'id': 2, 'no_kk': '3671012304890002', 'kepala_keluarga': 'Bambang Setiawan', 'rumah_id': 2, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 02', 'telepon': '081234567893', 'anggota_count': 3},
    {'id': 3, 'no_kk': '3671012304890003', 'kepala_keluarga': 'Joko Prasetyo', 'rumah_id': 3, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 03', 'telepon': '081234567894', 'anggota_count': 4},
    {'id': 4, 'no_kk': '3671012304890004', 'kepala_keluarga': 'Hilmi Hakim', 'rumah_id': 4, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 04', 'telepon': '081234567895', 'anggota_count': 5},
    {'id': 5, 'no_kk': '3671012304890005', 'kepala_keluarga': 'Rudi Hermawan', 'rumah_id': 5, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 05', 'telepon': '081398765401', 'anggota_count': 3},
    {'id': 6, 'no_kk': '3671012304890006', 'kepala_keluarga': 'Eko Saputro', 'rumah_id': 7, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 07', 'telepon': '081398765402', 'anggota_count': 4},
    {'id': 7, 'no_kk': '3671012304890007', 'kepala_keluarga': 'Hendra Wijaya', 'rumah_id': 8, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 08', 'telepon': '081398765403', 'anggota_count': 2},
    {'id': 8, 'no_kk': '3671012304890008', 'kepala_keluarga': 'Dedi Suhendar', 'rumah_id': 9, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 09', 'telepon': '081398765404', 'anggota_count': 4},
    {'id': 9, 'no_kk': '3671012304890009', 'kepala_keluarga': 'Samsul Arifin', 'rumah_id': 10, 'blok': 'Blok Jambu 1', 'nomor_rumah': 'No. 10', 'telepon': '081398765405', 'anggota_count': 3},
    {'id': 10, 'no_kk': '3671012304890010', 'kepala_keluarga': 'Agus Purnomo', 'rumah_id': 13, 'blok': 'Blok Jambu 2', 'nomor_rumah': 'No. 01', 'telepon': '081398765406', 'anggota_count': 4},
    {'id': 11, 'no_kk': '3671012304890011', 'kepala_keluarga': 'Wawan Setiawan', 'rumah_id': 14, 'blok': 'Blok Jambu 2', 'nomor_rumah': 'No. 02', 'telepon': '081398765407', 'anggota_count': 3},
    {'id': 12, 'no_kk': '3671012304890012', 'kepala_keluarga': 'Sugeng Riyadi', 'rumah_id': 15, 'blok': 'Blok Jambu 2', 'nomor_rumah': 'No. 03', 'telepon': '081398765408', 'anggota_count': 4},
    {'id': 13, 'no_kk': '3671012304890013', 'kepala_keluarga': 'Irwan Hidayat', 'rumah_id': 25, 'blok': 'Blok Mangga', 'nomor_rumah': 'No. 01', 'telepon': '081398765409', 'anggota_count': 4},
    {'id': 14, 'no_kk': '3671012304890014', 'kepala_keluarga': 'Teguh Prakoso', 'rumah_id': 26, 'blok': 'Blok Mangga', 'nomor_rumah': 'No. 02', 'telepon': '081398765410', 'anggota_count': 3},
    {'id': 15, 'no_kk': '3671012304890015', 'kepala_keluarga': 'Budi Santoso', 'rumah_id': 39, 'blok': 'Blok Sawo', 'nomor_rumah': 'No. 01', 'telepon': '081398765411', 'anggota_count': 4},
    {'id': 16, 'no_kk': '3671012304890016', 'kepala_keluarga': 'Darmawan', 'rumah_id': 51, 'blok': 'Blok Durian', 'nomor_rumah': 'No. 01', 'telepon': '081398765412', 'anggota_count': 3},
]

# Warga list
warga_list = [
    {'id': 1, 'kk_id': 1, 'nik': '3671011508800001', 'nama': 'Ahmad Suryana', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '1980-08-15', 'agama': 'Islam', 'pendidikan': 'S1', 'pekerjaan': 'Karyawan Swasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Kepala Keluarga', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567890', 'email': 'ahmad.suryana@gmail.com', 'rumah_id': 1, 'alamat': 'Blok Jambu 1 No. 01'},
    {'id': 2, 'kk_id': 1, 'nik': '3671015204850002', 'nama': 'Siti Nurhaliza', 'jenis_kelamin': 'P', 'tempat_lahir': 'Jakarta', 'tanggal_lahir': '1985-04-12', 'agama': 'Islam', 'pendidikan': 'S1', 'pekerjaan': 'Ibu Rumah Tangga', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Istri', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567891', 'email': 'siti.nurhaliza@gmail.com', 'rumah_id': 1, 'alamat': 'Blok Jambu 1 No. 01'},
    {'id': 3, 'kk_id': 1, 'nik': '3671011005100003', 'nama': 'Rizky Pratama Suryana', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2005-05-10', 'agama': 'Islam', 'pendidikan': 'SMA/SMK', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567897', 'email': 'rizky.suryana@gmail.com', 'rumah_id': 1, 'alamat': 'Blok Jambu 1 No. 01'},
    {'id': 4, 'kk_id': 1, 'nik': '3671016008140004', 'nama': 'Nabila Zahra Suryana', 'jenis_kelamin': 'P', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2014-08-20', 'agama': 'Islam', 'pendidikan': 'SD', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '', 'email': '', 'rumah_id': 1, 'alamat': 'Blok Jambu 1 No. 01'},

    {'id': 5, 'kk_id': 2, 'nik': '3671011202820001', 'nama': 'Bambang Setiawan', 'jenis_kelamin': 'L', 'tempat_lahir': 'Semarang', 'tanggal_lahir': '1982-02-12', 'agama': 'Islam', 'pendidikan': 'D3', 'pekerjaan': 'Wiraswasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Kepala Keluarga', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567893', 'email': 'bambang.setiawan@gmail.com', 'rumah_id': 2, 'alamat': 'Blok Jambu 1 No. 02'},
    {'id': 6, 'kk_id': 2, 'nik': '3671014506840002', 'nama': 'Dewi Lestari', 'jenis_kelamin': 'P', 'tempat_lahir': 'Solo', 'tanggal_lahir': '1984-06-05', 'agama': 'Islam', 'pendidikan': 'S1', 'pekerjaan': 'Wiraswasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Istri', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567892', 'email': 'dewi.lestari@gmail.com', 'rumah_id': 2, 'alamat': 'Blok Jambu 1 No. 02'},
    {'id': 7, 'kk_id': 2, 'nik': '3671011809120003', 'nama': 'Dimas Bagus Setiawan', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2012-09-18', 'agama': 'Islam', 'pendidikan': 'SMP', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '', 'email': '', 'rumah_id': 2, 'alamat': 'Blok Jambu 1 No. 02'},

    {'id': 8, 'kk_id': 3, 'nik': '3671012501780001', 'nama': 'Joko Prasetyo', 'jenis_kelamin': 'L', 'tempat_lahir': 'Klaten', 'tanggal_lahir': '1978-01-25', 'agama': 'Islam', 'pendidikan': 'SMA/SMK', 'pekerjaan': 'Wiraswasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Kepala Keluarga', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567894', 'email': 'joko.prasetyo@gmail.com', 'rumah_id': 3, 'alamat': 'Blok Jambu 1 No. 03'},
    {'id': 9, 'kk_id': 3, 'nik': '3671015011800002', 'nama': 'Ratna Sari', 'jenis_kelamin': 'P', 'tempat_lahir': 'Yogyakarta', 'tanggal_lahir': '1980-11-10', 'agama': 'Islam', 'pendidikan': 'D3', 'pekerjaan': 'Ibu Rumah Tangga', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Istri', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567896', 'email': 'ratna.sari@gmail.com', 'rumah_id': 3, 'alamat': 'Blok Jambu 1 No. 03'},
    {'id': 10, 'kk_id': 3, 'nik': '3671011503080003', 'nama': 'Fajar Nugraha Prasetyo', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2008-03-15', 'agama': 'Islam', 'pendidikan': 'SMA/SMK', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567899', 'email': 'fajar.prasetyo@gmail.com', 'rumah_id': 3, 'alamat': 'Blok Jambu 1 No. 03'},
    {'id': 11, 'kk_id': 3, 'nik': '3671015509170004', 'nama': 'Aisyah Putri Prasetyo', 'jenis_kelamin': 'P', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2017-09-15', 'agama': 'Islam', 'pendidikan': 'SD', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '', 'email': '', 'rumah_id': 3, 'alamat': 'Blok Jambu 1 No. 03'},

    {'id': 12, 'kk_id': 4, 'nik': '3671010107750001', 'nama': 'Ust. Hilmi Hakim', 'jenis_kelamin': 'L', 'tempat_lahir': 'Serang', 'tanggal_lahir': '1975-07-01', 'agama': 'Islam', 'pendidikan': 'S1', 'pekerjaan': 'Guru / Pengajar', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Kepala Keluarga', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081234567895', 'email': 'hilmi.hakim@gmail.com', 'rumah_id': 4, 'alamat': 'Blok Jambu 1 No. 04'},
    {'id': 13, 'kk_id': 4, 'nik': '3671014408790002', 'nama': 'Umi Kulsum', 'jenis_kelamin': 'P', 'tempat_lahir': 'Cilegon', 'tanggal_lahir': '1979-08-04', 'agama': 'Islam', 'pendidikan': 'S1', 'pekerjaan': 'Guru / Pengajar', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Istri', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765415', 'email': 'umi.kulsum@gmail.com', 'rumah_id': 4, 'alamat': 'Blok Jambu 1 No. 04'},
    {'id': 14, 'kk_id': 4, 'nik': '3671011402060003', 'nama': 'Ahmad Fauzan Hakim', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2006-02-14', 'agama': 'Islam', 'pendidikan': 'SMA/SMK', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765416', 'email': 'fauzan.hakim@gmail.com', 'rumah_id': 4, 'alamat': 'Blok Jambu 1 No. 04'},
    {'id': 15, 'kk_id': 4, 'nik': '3671015606110004', 'nama': 'Zahra Salima Hakim', 'jenis_kelamin': 'P', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2011-06-16', 'agama': 'Islam', 'pendidikan': 'SMP', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '', 'email': '', 'rumah_id': 4, 'alamat': 'Blok Jambu 1 No. 04'},
    {'id': 16, 'kk_id': 4, 'nik': '3671012012190005', 'nama': 'Muhammad Ali Hakim', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2019-12-20', 'agama': 'Islam', 'pendidikan': 'Belum Sekolah', 'pekerjaan': 'Belum / Tidak Bekerja', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '', 'email': '', 'rumah_id': 4, 'alamat': 'Blok Jambu 1 No. 04'},

    {'id': 17, 'kk_id': 5, 'nik': '3671011004860001', 'nama': 'Rudi Hermawan', 'jenis_kelamin': 'L', 'tempat_lahir': 'Bandung', 'tanggal_lahir': '1986-04-10', 'agama': 'Islam', 'pendidikan': 'S1', 'pekerjaan': 'PNS / ASN', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Kepala Keluarga', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765401', 'email': 'rudi.hermawan@gmail.com', 'rumah_id': 5, 'alamat': 'Blok Jambu 1 No. 05'},
    {'id': 18, 'kk_id': 5, 'nik': '3671014811880002', 'nama': 'Maya Agustina', 'jenis_kelamin': 'P', 'tempat_lahir': 'Bogor', 'tanggal_lahir': '1988-11-08', 'agama': 'Islam', 'pendidikan': 'S1', 'pekerjaan': 'Karyawan Swasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Istri', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765417', 'email': 'maya.agustina@gmail.com', 'rumah_id': 5, 'alamat': 'Blok Jambu 1 No. 05'},
    {'id': 19, 'kk_id': 5, 'nik': '3671011208180003', 'nama': 'Kenzo Hermawan', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2018-08-12', 'agama': 'Islam', 'pendidikan': 'Belum Sekolah', 'pekerjaan': 'Belum / Tidak Bekerja', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '', 'email': '', 'rumah_id': 5, 'alamat': 'Blok Jambu 1 No. 05'},

    {'id': 20, 'kk_id': 6, 'nik': '3671011803730001', 'nama': 'Eko Saputro', 'jenis_kelamin': 'L', 'tempat_lahir': 'Magelang', 'tanggal_lahir': '1973-03-18', 'agama': 'Kristen', 'pendidikan': 'S1', 'pekerjaan': 'Karyawan Swasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Kepala Keluarga', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765402', 'email': 'eko.saputro@gmail.com', 'rumah_id': 7, 'alamat': 'Blok Jambu 1 No. 07'},
    {'id': 21, 'kk_id': 6, 'nik': '3671015009770002', 'nama': 'Maria Christina', 'jenis_kelamin': 'P', 'tempat_lahir': 'Semarang', 'tanggal_lahir': '1977-09-10', 'agama': 'Kristen', 'pendidikan': 'S1', 'pekerjaan': 'Guru / Pengajar', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Istri', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765418', 'email': 'maria.christina@gmail.com', 'rumah_id': 7, 'alamat': 'Blok Jambu 1 No. 07'},
    {'id': 22, 'kk_id': 6, 'nik': '3671011405070003', 'nama': 'Daniel Saputro', 'jenis_kelamin': 'L', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2007-05-14', 'agama': 'Kristen', 'pendidikan': 'SMA/SMK', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765419', 'email': 'daniel.saputro@gmail.com', 'rumah_id': 7, 'alamat': 'Blok Jambu 1 No. 07'},
    {'id': 23, 'kk_id': 6, 'nik': '3671015810130004', 'nama': 'Grace Saputro', 'jenis_kelamin': 'P', 'tempat_lahir': 'Tangerang', 'tanggal_lahir': '2013-10-18', 'agama': 'Kristen', 'pendidikan': 'SD', 'pekerjaan': 'Pelajar/Mahasiswa', 'status_perkawinan': 'Belum Kawin', 'status_hubungan': 'Anak', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '', 'email': '', 'rumah_id': 7, 'alamat': 'Blok Jambu 1 No. 07'},

    {'id': 24, 'kk_id': 7, 'nik': '3671012211920001', 'nama': 'Hendra Wijaya', 'jenis_kelamin': 'L', 'tempat_lahir': 'Medan', 'tanggal_lahir': '1992-11-22', 'agama': 'Buddha', 'pendidikan': 'S1', 'pekerjaan': 'Wiraswasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Kepala Keluarga', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765403', 'email': 'hendra.wijaya@gmail.com', 'rumah_id': 8, 'alamat': 'Blok Jambu 1 No. 08'},
    {'id': 25, 'kk_id': 7, 'nik': '3671016503950002', 'nama': 'Jessica Tan', 'jenis_kelamin': 'P', 'tempat_lahir': 'Jakarta', 'tanggal_lahir': '1995-03-25', 'agama': 'Buddha', 'pendidikan': 'S1', 'pekerjaan': 'Karyawan Swasta', 'status_perkawinan': 'Kawin', 'status_hubungan': 'Istri', 'status_tinggal': 'Tetap', 'disabilitas': 'Tidak', 'telepon': '081398765420', 'email': 'jessica.tan@gmail.com', 'rumah_id': 8, 'alamat': 'Blok Jambu 1 No. 08'},
]

fasilitas_list = [
    {'id': 1, 'nama': 'Pos Ronda Utama RT 04', 'kategori': 'Keamanan', 'lokasi': 'Gerbang Utama RT 04 Sukamantri', 'kondisi': 'baik', 'keterangan': 'Pusat jaga malam, dilengkapi radio HT, senter patroli, dan kotak P3K.'},
    {'id': 2, 'nama': 'CCTV Gerbang Masuk Lingkungan', 'kategori': 'Keamanan', 'lokasi': 'Pintu Masuk Blok Jambu 1', 'kondisi': 'baik', 'keterangan': 'Kamera pengawas 4 channel aktif 24 jam dengan rekaman DVR 30 hari.'},
    {'id': 3, 'nama': 'Lampu Penerangan Jalan Umum (PJU) Blok Mangga', 'kategori': 'Penerangan', 'lokasi': 'Pertigaan Blok Mangga & Sawo', 'kondisi': 'baik', 'keterangan': 'PJU LED hemat energi 50W solar otomatis menyala malam hari.'},
    {'id': 4, 'nama': 'Saluran Drainase Utama Blok Jambu', 'kategori': 'Kebersihan', 'lokasi': 'Sepanjang Saluran Blok Jambu 1 & 2', 'kondisi': 'perlu', 'keterangan': 'Perlu pembersihan endapan lumpur berkala saat kerja bakti bulan depan.'},
    {'id': 5, 'nama': 'Taman Bermain & Gazebo RT 04', 'kategori': 'Fasum', 'lokasi': 'Lahan Fasum Blok Durian', 'kondisi': 'baik', 'keterangan': 'Area bermain anak, ayunan, perosotan, dan tempat senam ibu-ibu PKK.'},
    {'id': 6, 'nama': 'Tempat Penampungan Sampah Terpadu', 'kategori': 'Kebersihan', 'lokasi': 'Ujung Selatan Blok Sawo', 'kondisi': 'baik', 'keterangan': 'Dibersihkan dan diangkut armada sampah Pemda setiap Selasa, Kamis, Sabtu.'},
]

usaha_list = [
    {'id': 1, 'nama_usaha': 'Warung Berkah Bu Siti', 'kategori': 'Kuliner / Sembako', 'pemilik': 'Ibu Siti Nurhaliza', 'alamat': 'Blok Jambu 1 No. 01', 'telepon': '081234567891', 'keterangan': 'Menyediakan aneka sembako, sayur segar, lauk pauk harian, dan frozen food.'},
    {'id': 2, 'nama_usaha': 'Laundry Bersih Wangi', 'kategori': 'Jasa', 'pemilik': 'Ibu Dewi Lestari', 'alamat': 'Blok Jambu 1 No. 02', 'telepon': '081234567892', 'keterangan': 'Laundry kiloan dan satuan, cuci bedcover, helm, dan sepatu. Antar jemput gratis se-RT.'},
    {'id': 3, 'nama_usaha': 'Bengkel Motor Barokah', 'kategori': 'Otomotif', 'pemilik': 'Bpk. Joko Prasetyo', 'alamat': 'Blok Jambu 1 No. 03', 'telepon': '081234567894', 'keterangan': 'Servis motor berkala, ganti oli, tambal ban tubeless, tune-up injeksi dan karbu.'},
    {'id': 4, 'nama_usaha': 'Dapur Katering Bu Dewi', 'kategori': 'Kuliner', 'pemilik': 'Ibu Dewi Lestari', 'alamat': 'Blok Jambu 1 No. 02', 'telepon': '081234567892', 'keterangan': 'Nasi box syukuran, snack box rapat, tumpeng mini, prasmanan acara keluarga.'},
    {'id': 5, 'nama_usaha': 'Jasa Servis AC Sukamantri', 'kategori': 'Jasa Teknik', 'pemilik': 'Bpk. Bambang Setiawan', 'alamat': 'Blok Jambu 1 No. 02', 'telepon': '081234567893', 'keterangan': 'Cuci AC inverter/standar, tambah freon, instalasi AC baru/pindah unit garansi rapi.'},
]

bansos_list = [
    {'id': 1, 'nama_program': 'Bantuan Sembako Beras RT 04 Peduli', 'sumber_dana': 'Kas Sosial RT 04', 'periode': 'Oktober 2026', 'keterangan': 'Penyaluran beras 10kg dan sembako untuk keluarga berpenghasilan harian dan lansia.'},
    {'id': 2, 'nama_program': 'Bansos PKH & BPNT Kemensos RI', 'sumber_dana': 'Pemerintah Pusat', 'periode': 'Tahap IV 2026', 'keterangan': 'Penyaluran melalui rekening KKS Bank Himbara untuk penerima manfaat terdaftar.'},
    {'id': 3, 'nama_program': 'BLT Dana Desa Sukamantri', 'sumber_dana': 'Pemerintah Desa', 'periode': 'Triwulan III 2026', 'keterangan': 'Bantuan langsung tunai desa untuk warga prasejahtera.'},
]

penerima_bansos = [
    {'id': 1, 'bansos_id': 1, 'nama': 'Samsul Arifin', 'nik': '3671012304890009', 'blok_rumah': 'Blok Jambu 1 No. 10', 'status': 'tersalurkan', 'tanggal': '2026-10-15', 'catatan': 'Diterima langsung kepala keluarga'},
    {'id': 2, 'bansos_id': 1, 'nama': 'Ibu Sumiati (Lansia)', 'nik': '3671015011450001', 'blok_rumah': 'Blok Sawo No. 04', 'status': 'tersalurkan', 'tanggal': '2026-10-15', 'catatan': 'Diserahkan oleh Pengurus PKK'},
    {'id': 3, 'bansos_id': 2, 'nama': 'Agus Purnomo', 'nik': '3671012304890010', 'blok_rumah': 'Blok Jambu 2 No. 01', 'status': 'tersalurkan', 'tanggal': '2026-10-20', 'catatan': 'Verifikasi pencairan kantor pos'},
    {'id': 4, 'bansos_id': 3, 'nama': 'Darmawan', 'nik': '3671012304890016', 'blok_rumah': 'Blok Durian No. 01', 'status': 'terdaftar', 'tanggal': '', 'catatan': 'Jadwal penyaluran pekan depan'},
]

barang_list = [
    {'id': 1, 'nama_barang': 'Tenda Tratag Pesta 4x6 Meter', 'kategori': 'Peralatan Acara', 'jumlah_total': 2, 'jumlah_tersedia': 2, 'kondisi': 'baik', 'lokasi': 'Gudang Pos RT 04'},
    {'id': 2, 'nama_barang': 'Kursi Plastik Chitose', 'kategori': 'Peralatan Acara', 'jumlah_total': 100, 'jumlah_tersedia': 80, 'kondisi': 'baik', 'lokasi': 'Gudang Pos RT 04'},
    {'id': 3, 'nama_barang': 'Sound System Portable + 2 Mic Wireless', 'kategori': 'Elektronik', 'jumlah_total': 1, 'jumlah_tersedia': 1, 'kondisi': 'baik', 'lokasi': 'Pos RT 04'},
    {'id': 4, 'nama_barang': 'Mesin Pemotong Rumput Honda 4-Tak', 'kategori': 'Alat Kebersihan', 'jumlah_total': 1, 'jumlah_tersedia': 1, 'kondisi': 'baik', 'lokasi': 'Pos RT 04'},
    {'id': 5, 'nama_barang': 'Proyektor Epson + Layar Tripod 70 inch', 'kategori': 'Elektronik', 'jumlah_total': 1, 'jumlah_tersedia': 1, 'kondisi': 'baik', 'lokasi': 'Rumah Sekretaris'},
    {'id': 6, 'nama_barang': 'Terpal Biru Tebal 6x8 Meter', 'kategori': 'Peralatan', 'jumlah_total': 3, 'jumlah_tersedia': 3, 'kondisi': 'baik', 'lokasi': 'Gudang Pos RT 04'},
]

pinjaman_list = [
    {'id': 1, 'barang_id': 2, 'nama_peminjam': 'Rudi Hermawan', 'blok_rumah': 'Blok Jambu 1 No. 05', 'telepon': '081398765401', 'jumlah': 20, 'keperluan': 'Acara syukuran aqiqah putra ketiga', 'tgl_pinjam': '2026-10-27', 'tgl_kembali': '2026-10-30', 'status': 'dipinjam'},
    {'id': 2, 'barang_id': 3, 'nama_peminjam': 'Ust. Hilmi Hakim', 'blok_rumah': 'Blok Jambu 1 No. 04', 'telepon': '081234567895', 'jumlah': 1, 'keperluan': 'Kajian rutin bulanan majelis taklim', 'tgl_pinjam': '2026-10-20', 'tgl_kembali': '2026-10-21', 'status': 'kembali'},
]

ronda_list = [
    {'id': 1, 'hari': 'Senin', 'regu': 'Regu I (Blok Jambu 1)', 'koordinator': 'Bpk. Bambang Setiawan', 'anggota': 'Ahmad Suryana, Bambang Setiawan, Rudi Hermawan, Samsul Arifin', 'jam_mulai': '22:00', 'jam_selesai': '04:00', 'status': 'aktif'},
    {'id': 2, 'hari': 'Selasa', 'regu': 'Regu II (Blok Jambu 2)', 'koordinator': 'Bpk. Joko Prasetyo', 'anggota': 'Joko Prasetyo, Agus Purnomo, Wawan Setiawan, Sugeng Riyadi', 'jam_mulai': '22:00', 'jam_selesai': '04:00', 'status': 'aktif'},
    {'id': 3, 'hari': 'Rabu', 'regu': 'Regu III (Blok Mangga Ganjil)', 'koordinator': 'Bpk. Hendra Wijaya', 'anggota': 'Hendra Wijaya, Irwan Hidayat, M. Yusuf, Ridwan', 'jam_mulai': '22:00', 'jam_selesai': '04:00', 'status': 'aktif'},
    {'id': 4, 'hari': 'Kamis', 'regu': 'Regu IV (Blok Mangga Genap)', 'koordinator': 'Bpk. Teguh Prakoso', 'anggota': 'Teguh Prakoso, Sukirno, Dedi Suhendar, Arif Budiman', 'jam_mulai': '22:00', 'jam_selesai': '04:00', 'status': 'aktif'},
    {'id': 5, 'hari': 'Jumat', 'regu': 'Regu V (Blok Sawo)', 'koordinator': 'Bpk. Budi Santoso', 'anggota': 'Budi Santoso, Eko Saputro, Hilmi Hakim, Deni Kurniawan', 'jam_mulai': '22:00', 'jam_selesai': '04:00', 'status': 'aktif'},
    {'id': 6, 'hari': 'Sabtu', 'regu': 'Regu VI (Blok Durian & Pemuda)', 'koordinator': 'Rizky Pratama', 'anggota': 'Rizky Pratama, Fajar Nugraha, Daniel Saputro, Fauzan Hakim', 'jam_mulai': '22:00', 'jam_selesai': '04:30', 'status': 'aktif'},
    {'id': 7, 'hari': 'Minggu', 'regu': 'Regu VII (Regu Gabungan & Satpam)', 'koordinator': 'Bpk. Ahmad Suryana', 'anggota': 'Bambang Setiawan, Joko Prasetyo, Hendra Wijaya + Satpam Perum', 'jam_mulai': '22:00', 'jam_selesai': '04:00', 'status': 'aktif'},
]

kejadian_list = [
    {'id': 1, 'tanggal': '2026-10-27', 'jam': '23:30', 'judul': 'Patroli Regu I Aman Terkendali', 'lokasi': 'Keliling Blok Jambu & Mangga', 'tingkat': 'Info', 'keterangan': 'Seluruh portal gerbang malam ditutup pukul 23:00. Kendaraan tamu tercatat di pos ronda.', 'tindakan': 'Patroli rutin tiap 1 jam bersama satpam.', 'status': 'selesai'},
    {'id': 2, 'tanggal': '2026-10-24', 'jam': '20:15', 'judul': 'Lampu PJU Blok Mangga Padam', 'lokasi': 'Tiang PJU No. 4 Blok Mangga', 'tingkat': 'Sedang', 'keterangan': 'Kabel sambungan saklar otomatis longgar akibat terpaan angin hujan lebat.', 'tindakan': 'Diperbaiki oleh seksi keamanan dan lampu menyala normal kembali.', 'status': 'selesai'},
]

buku_tamu_list = [
    {'id': 1, 'nama': 'Bayu Wicaksono', 'asal': 'Jakarta Barat', 'keperluan': 'Kunjungan silaturahmi keluarga', 'tujuan_warga': 'Ahmad Suryana', 'blok_rumah': 'Blok Jambu 1 No. 01', 'no_hp': '081298877665', 'tgl_masuk': '2026-10-28 14:00', 'tgl_keluar': '2026-10-28 18:30', 'status': 'sudah_keluar'},
    {'id': 2, 'nama': 'Surya Darma (Teknisi Indihome)', 'asal': 'Telkom Tangerang', 'keperluan': 'Perbaikan jalur fiber optik wifi', 'tujuan_warga': 'Rudi Hermawan', 'blok_rumah': 'Blok Jambu 1 No. 05', 'no_hp': '085711223344', 'tgl_masuk': '2026-10-29 09:30', 'tgl_keluar': '', 'status': 'di_dalam'},
]

pengumuman_list = remote_seed.get('/api/pengumuman', {}).get('pengumuman', [])

# Kas transactions
transaksi_kas = [
    {'id': 1, 'tanggal': '2026-10-01', 'jenis': 'masuk', 'kategori': 'Saldo Awal', 'nominal': 14850000, 'keterangan': 'Saldo kas RT per 1 Oktober 2026', 'pj': 'Bendahara RT'},
    {'id': 2, 'tanggal': '2026-10-05', 'jenis': 'masuk', 'kategori': 'Iuran Warga', 'nominal': 5700000, 'keterangan': 'Penerimaan iuran bulanan warga termin 1 (38 rumah)', 'pj': 'Bendahara RT'},
    {'id': 3, 'tanggal': '2026-10-10', 'jenis': 'masuk', 'kategori': 'Iuran Warga', 'nominal': 4950000, 'keterangan': 'Penerimaan iuran bulanan warga termin 2 (33 rumah)', 'pj': 'Bendahara RT'},
    {'id': 4, 'tanggal': '2026-10-12', 'jenis': 'keluar', 'kategori': 'Kebersihan', 'nominal': 2400000, 'keterangan': 'Biaya angkutan sampah lingkungan Pemda Tangerang (Oktober)', 'pj': 'Koord. Kebersihan'},
    {'id': 5, 'tanggal': '2026-10-15', 'jenis': 'keluar', 'kategori': 'Keamanan', 'nominal': 1800000, 'keterangan': 'Honor satpam perumahan shift malam & kopi patroli pos', 'pj': 'Koord. Keamanan'},
    {'id': 6, 'tanggal': '2026-10-18', 'jenis': 'masuk', 'kategori': 'Donasi / Sumbangan', 'nominal': 1000000, 'keterangan': 'Sumbangan warga H. Samsul untuk peremajaan PJU', 'pj': 'Bendahara RT'},
    {'id': 7, 'tanggal': '2026-10-20', 'jenis': 'keluar', 'kategori': 'Perawatan Lingkungan', 'nominal': 850000, 'keterangan': 'Pembelian sparepart PJU LED 50W dan kabel instalasi', 'pj': 'Koord. Kebersihan'},
    {'id': 8, 'tanggal': '2026-10-24', 'jenis': 'keluar', 'kategori': 'Sosial', 'nominal': 500000, 'keterangan': 'Tali asih warga sakit rawat inap RSUD Tangerang', 'pj': 'Koord. Sosial'},
]

# Yearly matrix
iuran_tahunan = []
bulan_names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
for r in rumah_list[:30]:
    paid_months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] if r['id'] % 5 != 0 else [1, 2, 3, 4, 5, 6]
    iuran_tahunan.append({
        'id': r['id'],
        'rumah_id': r['id'],
        'blok': r['blok'],
        'nomor': r['nomor'],
        'nama_kepala': next((k['kepala_keluarga'] for k in kk_list if k['rumah_id'] == r['id']), f"Keluarga {r['nomor']}"),
        'tahun': 2026,
        'nominal': 150000,
        'bulan': {str(m): (m in paid_months) for m in range(1, 13)},
        'total_lunas': len(paid_months),
        'sisa_bulan': 12 - len(paid_months),
    })

# Sample Pengajuan
pengajuan_list = [
    {
        'id': 1,
        'nomor': 'SRT-202610-001',
        'jenis': 'surat',
        'jenis_surat': 'Surat Pengantar SKCK',
        'nama': 'Rizky Pratama Suryana',
        'nik': '3671011005100003',
        'blok_rumah': 'Blok Jambu 1 No. 01',
        'no_hp': '081234567897',
        'keperluan': 'Persyaratan melamar pekerjaan BUMN',
        'tanggal': '2026-10-25',
        'status': 'selesai',
        'catatan_admin': 'Surat telah ditandatangani Ketua RT. Nomor Surat: 04/SKCK/RT04-RW12/X/2026. File PDF dapat diunduh.',
        'nomor_surat_resmi': '04/SKCK/RT04-RW12/X/2026',
    },
    {
        'id': 2,
        'nomor': 'SRT-202610-002',
        'jenis': 'surat',
        'jenis_surat': 'Surat Keterangan Domisili',
        'nama': 'Hendra Wijaya',
        'nik': '3671012211920001',
        'blok_rumah': 'Blok Jambu 1 No. 08',
        'no_hp': '081398765403',
        'keperluan': 'Pembukaan rekening bank kantor cabang Tangerang',
        'tanggal': '2026-10-28',
        'status': 'diproses',
        'catatan_admin': 'Sedang diverifikasi Sekretaris RT.',
        'nomor_surat_resmi': '',
    },
    {
        'id': 3,
        'nomor': 'ADN-202610-001',
        'jenis': 'aduan',
        'judul': 'Lampu PJU Tikungan Blok Sawo Berkedip',
        'kategori': 'Fasilitas & PJU',
        'nama': 'Budi Santoso',
        'blok_rumah': 'Blok Sawo No. 01',
        'no_hp': '081398765411',
        'isi_laporan': 'Lampu jalan di tikungan Blok Sawo sering berkedip redup sejak 2 hari lalu. Mohon bantuan teknisi pos ronda untuk dicek.',
        'tanggal': '2026-10-27',
        'status': 'diproses',
        'catatan_admin': 'Sudah dijadwalkan perbaikan bersama tim PJU.',
    },
    {
        'id': 4,
        'nomor': 'STR-202610-001',
        'jenis': 'setoran',
        'nama_warga': 'Rudi Hermawan',
        'blok_rumah': 'Blok Jambu 1 No. 05',
        'no_hp': '081398765401',
        'bulan': 'Oktober 2026',
        'nominal': 150000,
        'metode': 'Transfer BSI',
        'tanggal': '2026-10-26',
        'status': 'terverifikasi',
        'catatan_admin': 'Pembayaran lunas via transfer BSI. Kwitansi digital terbit.',
    }
]

setoran_list = [
    {
        'id': 1,
        'nomor': 'STR-202610-001',
        'nama_warga': 'Rudi Hermawan',
        'blok_rumah': 'Blok Jambu 1 No. 05',
        'no_hp': '081398765401',
        'bulan': 'Oktober 2026',
        'nominal': 150000,
        'metode': 'Transfer BSI',
        'tanggal': '2026-10-26',
        'status': 'terverifikasi',
        'bukti': '',
        'catatan': 'Iuran bulanan Oktober 2026',
        'kwitansi_nomor': 'KWT/RT04/202610/001'
    },
    {
        'id': 2,
        'nomor': 'STR-202610-002',
        'nama_warga': 'Bambang Setiawan',
        'blok_rumah': 'Blok Jambu 1 No. 02',
        'no_hp': '081234567893',
        'bulan': 'Oktober 2026',
        'nominal': 150000,
        'metode': 'QRIS',
        'tanggal': '2026-10-28',
        'status': 'menunggu',
        'bukti': '',
        'catatan': 'Scan QRIS Kas RT',
        'kwitansi_nomor': ''
    }
]

pesan_list = [
    {
        'id': 1,
        'nama': 'Wawan Setiawan',
        'kontak': '081398765407',
        'pesan': 'Pak Ketua, apakah untuk kegiatan kerja bakti pekan depan ada pembagian zona per blok atau serempak dari gerbang utama?',
        'tanggal': '2026-10-28',
        'status': 'baru'
    }
]

log_list = [
    {'id': 1, 'waktu': '2026-10-29 09:15:00', 'modul': 'Sistem', 'user': 'Admin Sistem', 'aktivitas': 'Inisialisasi sistem database RT 04 / RW 12 Sukamantri', 'status': 'sukses'},
    {'id': 2, 'waktu': '2026-10-28 16:45:00', 'modul': 'Pengajuan', 'user': 'Ketua RT', 'aktivitas': 'Verifikasi & pengesahan Surat Pengantar SKCK No. 04/SKCK/RT04-RW12/X/2026 a.n. Rizky Pratama', 'status': 'sukses'},
    {'id': 3, 'waktu': '2026-10-27 10:20:00', 'modul': 'Keuangan', 'user': 'Bendahara RT', 'aktivitas': 'Verifikasi setoran iuran Rp150.000 Blok Jambu 1 No. 05', 'status': 'sukses'},
]

users_list = [
    {
        'id': 1,
        'username': 'admin',
        'password': 'admin',
        'nama': 'Admin Sistem RT',
        'role': 'superadmin',
        'jabatan': 'Pengelola Portal',
        'hp': '0812-3456-7890',
        'hak': ['pengajuan', 'keuangan', 'data', 'keamanan', 'pengumuman', 'pengaturan', 'laporan', 'users'],
        'aktif': True
    },
    {
        'id': 2,
        'username': 'ketua',
        'password': 'rt04',
        'nama': 'Bpk. Ahmad Suryana',
        'role': 'ketua',
        'jabatan': 'Ketua RT 04',
        'hp': '0812-3456-7890',
        'hak': ['pengajuan', 'keuangan', 'data', 'keamanan', 'pengumuman', 'pengaturan', 'laporan', 'users'],
        'aktif': True
    },
    {
        'id': 3,
        'username': 'bendahara',
        'password': 'rt04',
        'nama': 'Ibu Dewi Lestari',
        'role': 'bendahara',
        'jabatan': 'Bendahara RT 04',
        'hp': '0812-3456-7892',
        'hak': ['keuangan', 'laporan'],
        'aktif': True
    },
    {
        'id': 4,
        'username': 'sekretaris',
        'password': 'rt04',
        'nama': 'Ibu Siti Nurhaliza',
        'role': 'sekretaris',
        'jabatan': 'Sekretaris RT 04',
        'hp': '0812-3456-7891',
        'hak': ['pengajuan', 'data', 'pengumuman', 'laporan'],
        'aktif': True
    }
]

db = {
    'info': {
        'profil': profil,
        'pengurus': pengurus,
        'kontak': kontak,
        'darurat': darurat,
        'pengurus_pkk': pengurus_pkk,
        'pengurus_karangtaruna': pengurus_karangtaruna,
        'proker_pendek': proker_pendek,
        'proker_menengah': proker_menengah,
        'proker_panjang': proker_panjang,
        'aturan': aturan,
        'tema': info.get('tema', {}),
        'logo': info.get('logo', ''),
        'logo_login': info.get('logo_login', ''),
        'gambar_latar': info.get('gambar_latar', ''),
        'icon_site': info.get('icon_site', ''),
        'gambar_hero': info.get('gambar_hero', ''),
        'notifikasi': info.get('notifikasi', {'wa_warga': True, 'wa_pengurus': True, 'hp': True}),
        'stats': {'rumah': len(rumah_list), 'warga': len(warga_list), 'kk': len(kk_list)},
        'iuran': info.get('iuran', {'nominal': 150000, 'keterangan': 'Iuran bulanan Rp150.000 per rumah...', 'rekening': 'BSI 7123456789 a.n. Kas RT 04 RW 12 Taman Buah'})
    },
    'warga': warga_list,
    'kk': kk_list,
    'rumah': rumah_list,
    'fasilitas': fasilitas_list,
    'usaha': usaha_list,
    'bansos': bansos_list,
    'penerima_bansos': penerima_bansos,
    'barang': barang_list,
    'pinjaman': pinjaman_list,
    'ronda': ronda_list,
    'kejadian': kejadian_list,
    'buku_tamu': buku_tamu_list,
    'pengumuman': pengumuman_list,
    'transaksi_kas': transaksi_kas,
    'iuran_tahunan': iuran_tahunan,
    'pengajuan': pengajuan_list,
    'setoran': setoran_list,
    'pesan': pesan_list,
    'log': log_list,
    'users': users_list,
    'qris_image': None,
}

with open("data/database.json", "w") as f:
    json.dump(db, f, indent=2)

print("Generated data/database.json with full rich neighborhood records!")
