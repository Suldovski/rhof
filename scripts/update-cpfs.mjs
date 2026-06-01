import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// Firebase config copied from src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyD_vtTquXKQBX1J7fzPUGTCuuJxriQyUfw",
  authDomain: "rhger-b7349.firebaseapp.com",
  projectId: "rhger-b7349",
  storageBucket: "rhger-b7349.firebasestorage.app",
  messagingSenderId: "532374444546",
  appId: "1:532374444546:web:007f09554624bd4a4b251b",
};

function formatCpf(d) {
  const digits = String(d ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return String(d ?? '');
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const col = collection(db, 'employees');
  console.log('Fetching employees...');
  const snap = await getDocs(col);
  console.log(`Found ${snap.size} employees.`);
  let updated = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const cpf = data.cpf ?? '';
    const formatted = formatCpf(cpf);
    if (formatted !== (cpf ?? '')) {
      const ref = doc(db, 'employees', docSnap.id);
      try {
        await updateDoc(ref, { cpf: formatted });
        console.log(`Updated ${docSnap.id}: ${cpf} -> ${formatted}`);
        updated++;
      } catch (err) {
        console.error('Failed to update', docSnap.id, err.message || err);
      }
    }
  }
  console.log(`Done. Updated ${updated} documents.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
