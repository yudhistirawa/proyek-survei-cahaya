const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Path to your Firebase service account key JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

const demoUsers = [
  {
    email: "admin-demo@example.com",
    password: "Admin123!",
    displayName: "Admin Demo",
    role: "admin"
  },
  {
    email: "user-measurement@example.com",
    password: "User123!",
    displayName: "User Measurement",
    role: "petugas_pengukuran"
  },
  {
    email: "user-uniformity@example.com",
    password: "User123!",
    displayName: "User Uniformity",
    role: "petugas_kemerataan"
  }
];

async function createUsers() {
  for (const user of demoUsers) {
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        emailVerified: false,
        password: user.password,
        displayName: user.displayName,
        disabled: false,
      });
      console.log(`Created user: ${userRecord.uid}`);

      // Set custom claims for role
      await auth.setCustomUserClaims(userRecord.uid, { role: user.role });
      console.log(`Set role claim for user ${userRecord.uid}: ${user.role}`);

    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`User with email ${user.email} already exists.`);
      } else {
        console.error('Error creating user:', error);
      }
    }
  }
}

createUsers().then(() => {
  console.log('Demo users creation script finished.');
  process.exit(0);
}).catch((error) => {
  console.error('Error in demo users creation script:', error);
  process.exit(1);
});
