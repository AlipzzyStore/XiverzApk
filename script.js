// Import modul Firebase yang diperlukan. Ini adalah cara yang benar untuk memuat Firebase dari CDN.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables yang disediakan oleh lingkungan Canvas. Ini harus digunakan.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Mendapatkan referensi ke elemen-elemen DOM
const loadingOverlay = document.getElementById('loadingOverlay');
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginMessage = document.getElementById('login-message');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const sidebar = document.getElementById('sidebar');
const closeMenuBtn = document.getElementById('close-menu-btn');
const resellerMenuBtn = document.getElementById('reseller-menu-btn');
const ownerMenuBtn = document.getElementById('owner-menu-btn');
const resellerModal = document.getElementById('reseller-modal');
const ownerModal = document.getElementById('owner-modal');
const closeModals = document.querySelectorAll('.close-modal-btn');
const resellerActionSelect = document.getElementById('reseller-action-select');
const ownerActionSelect = document.getElementById('owner-action-select');
const resellerFormContainer = document.getElementById('reseller-form-container');
const ownerFormContainer = document.getElementById('owner-form-container');
const whatsappNumberInput = document.getElementById('whatsapp-number-input');
const sendBtn = document.getElementById('send-btn');
const statusMessage = document.getElementById('status-message');
const optionSelect = document.getElementById('option-select');
const userInfoDisplay = document.getElementById('user-info-display');
const sendStatusModal = document.getElementById('send-status-modal');
const statusSpinner = document.getElementById('status-spinner');
const statusTitle = document.getElementById('status-title');
const statusTimer = document.getElementById('status-timer');
const statusBody = document.getElementById('status-body');
const accountList = document.getElementById('account-list');

let app, auth, db, userRole;
const accountsCollectionPath = `artifacts/${appId}/public/data/accounts`;
let authReady = false;

// Inisialisasi Firebase dan autentikasi
const initFirebase = async () => {
    try {
        loadingOverlay.classList.remove('hidden');
        
        if (Object.keys(firebaseConfig).length === 0) {
            loginMessage.textContent = "Error: Konfigurasi Firebase tidak ditemukan.";
            loadingOverlay.classList.add('hidden');
            return;
        }
        
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Menggunakan token autentikasi yang disediakan oleh Canvas
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }
        
        authReady = true;
        loadingOverlay.classList.add('hidden');

        // Memastikan akun 'admin' awal ada. Ini hanya akan dijalankan satu kali.
        const adminRef = doc(db, accountsCollectionPath, 'admin');
        const adminDoc = await getDoc(adminRef);
        if (!adminDoc.exists()) {
            await setDoc(adminRef, {
                username: 'admin',
                password: 'admin123',
                role: 'owner'
            });
        }
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        loginMessage.textContent = "Terjadi kesalahan saat memulai aplikasi. Periksa konsol untuk detail.";
        loadingOverlay.classList.add('hidden');
    }
};

// Memeriksa kredensial login
const checkLogin = async (username, password) => {
    if (!db || !authReady) {
        loginMessage.textContent = "Aplikasi belum siap. Mohon coba lagi.";
        return;
    }

    loadingOverlay.classList.remove('hidden');

    try {
        const trimmedUsername = username.trim();
        const accountsCollectionRef = collection(db, accountsCollectionPath);
        // Menggunakan query untuk mencari username dan password
        const q = query(accountsCollectionRef, where("username", "==", trimmedUsername), where("password", "==", password));
        const accountsSnapshot = await getDocs(q);

        if (!accountsSnapshot.empty) {
            const userData = accountsSnapshot.docs[0].data();
            userRole = userData.role;
            loginScreen.classList.add('hidden');
            mainScreen.classList.remove('hidden');
            updateUIForRole();
        } else {
            loginMessage.textContent = "Username atau password salah.";
        }
    } catch (error) {
        console.error("Error checking login:", error);
        loginMessage.textContent = "Terjadi kesalahan saat mencoba login.";
    } finally {
        loadingOverlay.classList.add('hidden');
    }
};

// Memperbarui UI berdasarkan peran pengguna
const updateUIForRole = () => {
    resellerMenuBtn.classList.add('hidden');
    ownerMenuBtn.classList.add('hidden');
    if (userRole === 'owner') {
        resellerMenuBtn.classList.remove('hidden');
        ownerMenuBtn.classList.remove('hidden');
    } else if (userRole === 'reseller') {
        resellerMenuBtn.classList.remove('hidden');
    }
};

// Mengambil dan menampilkan daftar akun
const fetchAndDisplayAccounts = async () => {
    accountList.innerHTML = '<li class="text-gray-500 text-center">Memuat akun...</li>';
    try {
        const accountsCollectionRef = collection(db, accountsCollectionPath);
        const querySnapshot = await getDocs(accountsCollectionRef);
        const accounts = [];
        querySnapshot.forEach(doc => {
            accounts.push(doc.data());
        });

        accountList.innerHTML = '';
        if (accounts.length > 0) {
            accounts.sort((a, b) => a.username.localeCompare(b.username)).forEach(account => {
                const li = document.createElement('li');
                li.textContent = `Username: ${account.username} - Role: ${account.role}`;
                li.className = "p-2 border-b border-gray-700 last:border-0";
                accountList.appendChild(li);
            });
        } else {
            accountList.innerHTML = '<li class="text-gray-500 text-center">Tidak ada akun ditemukan.</li>';
        }
    } catch (error) {
        console.error("Error fetching accounts:", error);
        accountList.innerHTML = '<li class="text-red-400 text-center">Gagal memuat akun.</li>';
    }
};

// Merender formulir untuk menambah/menghapus akun
const renderForm = (container, action, targetRole) => {
    let formHtml = '';
    if (action === 'add') {
        formHtml = `
            <input type="text" id="new-username" placeholder="Username" class="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400">
            <input type="password" id="new-password" placeholder="Password" class="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400">
            <button id="submit-form-btn" class="gradient-btn w-full py-3 rounded-lg font-bold">Buat</button>
        `;
    } else if (action === 'delete') {
        formHtml = `
            <p class="text-gray-400 text-center">Masukkan username akun ${targetRole} yang ingin dihapus.</p>
            <input type="text" id="delete-username" placeholder="Username" class="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400">
            <button id="submit-form-btn" class="logout-btn w-full py-3 rounded-lg font-bold">Hapus</button>
        `;
    }
    container.innerHTML = formHtml;
    const submitBtn = document.getElementById('submit-form-btn');
    const formMessage = document.createElement('div');
    formMessage.className = "text-center text-sm mt-2";
    container.appendChild(formMessage);

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const username = (action === 'add' ? document.getElementById('new-username').value : document.getElementById('delete-username').value).trim();
            if (!username) {
                formMessage.textContent = "Username tidak boleh kosong.";
                formMessage.className = "text-center text-sm text-red-400 mt-2";
                return;
            }
            
            loadingOverlay.classList.remove('hidden');
            try {
                const accountsRef = collection(db, accountsCollectionPath);
                const q = query(accountsRef, where("username", "==", username));
                const querySnapshot = await getDocs(q);

                if (action === 'add') {
                    if (querySnapshot.empty) {
                        const newPassword = document.getElementById('new-password').value;
                        await setDoc(doc(accountsRef, username), {
                            username: username,
                            password: newPassword,
                            role: targetRole
                        });
                        formMessage.textContent = `Akun ${username} (${targetRole}) berhasil ditambahkan!`;
                        formMessage.className = "text-center text-sm text-green-400 mt-2";
                    } else {
                        formMessage.textContent = "Username sudah ada.";
                        formMessage.className = "text-center text-sm text-red-400 mt-2";
                    }
                } else { // 'delete'
                    if (!querySnapshot.empty) {
                        const accountToDelete = querySnapshot.docs[0].data();
                        if (accountToDelete.role === 'owner') {
                            formMessage.textContent = "Akun Owner tidak bisa dihapus.";
                            formMessage.className = "text-center text-sm text-red-400 mt-2";
                            return;
                        }
                        if(accountToDelete.role !== targetRole) {
                            formMessage.textContent = `Error: Tidak dapat menghapus akun dengan peran ${accountToDelete.role}. Anda hanya dapat menghapus akun ${targetRole}.`;
                            formMessage.className = "text-center text-sm text-red-400 mt-2";
                            return;
                        }

                        await deleteDoc(doc(accountsRef, username));
                        formMessage.textContent = `Akun ${username} berhasil dihapus!`;
                        formMessage.className = "text-center text-sm text-green-400 mt-2";
                    } else {
                        formMessage.textContent = "Username tidak ditemukan.";
                        formMessage.className = "text-center text-sm text-red-400 mt-2";
                    }
                }
                // Memuat ulang daftar akun setelah operasi berhasil
                fetchAndDisplayAccounts();
            } catch (error) {
                console.error("Error managing account:", error);
                formMessage.textContent = `Error: ${error.message}`;
                formMessage.className = "text-center text-sm text-red-400 mt-2";
            } finally {
                loadingOverlay.classList.add('hidden');
            }
        });
    }
};

// Merender formulir untuk Owner
const renderOwnerForm = (action) => {
    const container = ownerFormContainer;
    if (action === 'add') {
        container.innerHTML = `
            <select id="role-select" class="w-full px-4 py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="" disabled selected>Pilih Role</option>
                <option value="reseller">Reseller</option>
                <option value="user">User</option>
            </select>
            <div id="add-form-sub-container"></div>
        `;
        const roleSelect = document.getElementById('role-select');
        roleSelect.addEventListener('change', (e) => {
            const selectedRole = e.target.value;
            const subContainer = document.getElementById('add-form-sub-container');
            if (selectedRole) {
                renderForm(subContainer, 'add', selectedRole);
            } else {
                subContainer.innerHTML = '';
            }
        });
    } else if (action === 'delete') {
        container.innerHTML = `
            <select id="role-select" class="w-full px-4 py-3 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="" disabled selected>Pilih Role</option>
                <option value="reseller">Reseller</option>
                <option value="user">User</option>
            </select>
            <div id="delete-form-sub-container"></div>
        `;
        const roleSelect = document.getElementById('role-select');
        roleSelect.addEventListener('change', (e) => {
            const selectedRole = e.target.value;
            const subContainer = document.getElementById('delete-form-sub-container');
            if (selectedRole) {
                renderForm(subContainer, 'delete', selectedRole);
            } else {
                subContainer.innerHTML = '';
            }
        });
    }
};

// Event listener untuk tombol Login
loginBtn.addEventListener('click', () => {
    const user = usernameInput.value;
    const pass = passwordInput.value;
    if (user && pass) {
        checkLogin(user, pass);
    } else {
        loginMessage.textContent = "Username dan password tidak boleh kosong.";
    }
});

// Event listener untuk tombol Logout
logoutBtn.addEventListener('click', () => {
    loginScreen.classList.remove('hidden');
    mainScreen.classList.add('hidden');
    sidebar.classList.remove('open');
    usernameInput.value = '';
    passwordInput.value = '';
    loginMessage.textContent = '';
    statusMessage.textContent = '';
    userRole = null;
});

// Event listener untuk tombol buka menu sidebar
menuToggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

// Event listener untuk tombol tutup menu sidebar
closeMenuBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

// Event listener untuk tombol Menu Reseller
resellerMenuBtn.addEventListener('click', () => {
    if (userRole === 'reseller' || userRole === 'owner') {
        resellerModal.classList.remove('hidden');
        sidebar.classList.remove('open');
        resellerActionSelect.value = "";
        resellerFormContainer.innerHTML = '';
    }
});

// Event listener untuk tombol Menu Owner
ownerMenuBtn.addEventListener('click', () => {
    if (userRole === 'owner') {
        ownerModal.classList.remove('hidden');
        sidebar.classList.remove('open');
        ownerActionSelect.value = "";
        ownerFormContainer.innerHTML = '';
        fetchAndDisplayAccounts();
    }
});

// Event listener untuk tombol tutup modal
closeModals.forEach(btn => {
    btn.addEventListener('click', () => {
        resellerModal.classList.add('hidden');
        ownerModal.classList.add('hidden');
    });
});

// Event listener saat opsi Reseller berubah
resellerActionSelect.addEventListener('change', (e) => {
    const selectedAction = e.target.value;
    if (selectedAction) {
        renderForm(resellerFormContainer, selectedAction, 'user');
    } else {
        resellerFormContainer.innerHTML = '';
    }
});

// Event listener saat opsi Owner berubah
ownerActionSelect.addEventListener('change', (e) => {
    const selectedAction = e.target.value;
    if (selectedAction) {
        renderOwnerForm(selectedAction);
    } else {
        ownerFormContainer.innerHTML = '';
    }
});

// Event listener untuk tombol Kirim
// CATATAN PENTING: Fungsi ini hanya simulasi. Untuk fungsionalitas nyata, Anda perlu membuat layanan backend (misalnya, menggunakan Cloud Functions) yang dapat mengirim bug ini secara real-time.
sendBtn.addEventListener('click', () => {
    const whatsappNumber = whatsappNumberInput.value;
    const selectedOption = optionSelect.value;
    if (!whatsappNumber || !selectedOption) {
        statusMessage.textContent = "Gagal Mengirim Ke Bot: Nomor WhatsApp dan opsi harus diisi.";
        statusMessage.className = "text-center text-sm text-red-400 mt-2";
        return;
    }

    statusMessage.textContent = '';
    sendStatusModal.classList.remove('hidden');
    statusSpinner.classList.remove('hidden');
    statusTitle.textContent = "Proses Mengirim Bug";
    statusBody.textContent = '';
    
    let timeElapsed = 0;
    const timerInterval = setInterval(() => {
        timeElapsed++;
        statusTimer.textContent = `Waktu: ${timeElapsed} detik`;
    }, 1000);

    setTimeout(() => {
        clearInterval(timerInterval);
        statusSpinner.classList.add('hidden');
        statusTitle.textContent = "Berhasil!";
        statusBody.textContent = `Berhasil Mengirim Bug ke ${whatsappNumber}`;
        statusTimer.textContent = ``;
        setTimeout(() => {
            sendStatusModal.classList.add('hidden');
        }, 2000);
    }, 3000);
});

// Memulai aplikasi saat halaman dimuat
initFirebase();
