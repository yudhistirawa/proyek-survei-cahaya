/**
 * Demo users for testing purpose.
 * These users should be created in Firebase Authentication manually or via Firebase Console.
 * Passwords are plain text for demo only.
 */

export const demoUsers = [
  {
    username: "admin",
    email: "admin@wahana.com",
    password: "admin12345",
    displayName: "Admin",
    role: "admin"
  },
  {
    username: "petugas_ukur",
    email: "user-measurement@example.com",
    password: "User123!",
    displayName: "Petugas Pengukuran",
    role: "petugas_pengukuran"
  },
  {
    username: "petugas_sinar",
    email: "user-uniformity@example.com",
    password: "User123!",
    displayName: "Petugas Kemerataan",
    role: "petugas_kemerataan"
  },
  {
    username: "petugas_surveyor",
    email: "surveyor@wahana.com",
    password: "Surveyor123!",
    displayName: "Petugas Surveyor",
    role: "petugas_surveyor"
  },
  {
    username: "demo_tester",
    email: "tester@demo.com",
    password: "Test123456",
    displayName: "Demo Tester",
    role: "petugas_pengukuran"
  }
];
