// Test script untuk format penamaan foto yang baru
console.log('🧪 Testing new photo naming format...');

// Test data
const testCases = [
  {
    namaJalan: 'Jl. Sudirman',
    namaPetugas: 'John Doe',
    expectedTinggiARM: 'foto_tinggi_arm_Jl_Sudirman_John_Doe.webp',
    expectedTitikAktual: 'foto_titik_aktual_Jl_Sudirman_John_Doe.webp'
  },
  {
    namaJalan: 'Gang Mawar No. 123',
    namaPetugas: 'Jane Smith',
    expectedTinggiARM: 'foto_tinggi_arm_Gang_Mawar_No_123_Jane_Smith.webp',
    expectedTitikAktual: 'foto_titik_aktual_Gang_Mawar_No_123_Jane_Smith.webp'
  },
  {
    namaJalan: 'Jl. Raya Bogor',
    namaPetugas: 'Ahmad Rahman',
    expectedTinggiARM: 'foto_tinggi_arm_Jl_Raya_Bogor_Ahmad_Rahman.webp',
    expectedTitikAktual: 'foto_titik_aktual_Jl_Raya_Bogor_Ahmad_Rahman.webp'
  },
  {
    namaJalan: '',
    namaPetugas: '',
    expectedTinggiARM: 'foto_tinggi_arm_jalan_tidak_diketahui_petugas_tidak_diketahui.webp',
    expectedTitikAktual: 'foto_titik_aktual_jalan_tidak_diketahui_petugas_tidak_diketahui.webp'
  }
];

// Function to generate filename (same logic as in SurveyARMPage.js)
function generatePhotoFilename(photoType, namaJalan, namaPetugas, fallbackJalan = 'jalan_tidak_diketahui', fallbackPetugas = 'petugas_tidak_diketahui') {
  const jalan = namaJalan || fallbackJalan;
  const petugas = namaPetugas || fallbackPetugas;
  
  // Replace special characters with underscores
  const cleanJalan = jalan.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPetugas = petugas.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${photoType}_${cleanJalan}_${cleanPetugas}.webp`;
}

// Test each case
testCases.forEach((testCase, index) => {
  console.log(`\n📝 Test Case ${index + 1}:`);
  console.log(`   Nama Jalan: "${testCase.namaJalan}"`);
  console.log(`   Nama Petugas: "${testCase.namaPetugas}"`);
  
  // Generate filenames
  const tinggiARMFilename = generatePhotoFilename('foto_tinggi_arm', testCase.namaJalan, testCase.namaPetugas);
  const titikAktualFilename = generatePhotoFilename('foto_titik_aktual', testCase.namaJalan, testCase.namaPetugas);
  
  // Check results
  const tinggiARMCorrect = tinggiARMFilename === testCase.expectedTinggiARM;
  const titikAktualCorrect = titikAktualFilename === testCase.expectedTitikAktual;
  
  console.log(`   ✅ Foto Tinggi ARM: ${tinggiARMFilename}`);
  console.log(`   ✅ Foto Titik Aktual: ${titikAktualFilename}`);
  
  if (tinggiARMCorrect && titikAktualCorrect) {
    console.log(`   🎯 PASSED - Format penamaan sesuai`);
  } else {
    console.log(`   ❌ FAILED - Format penamaan tidak sesuai`);
    if (!tinggiARMCorrect) {
      console.log(`      Expected: ${testCase.expectedTinggiARM}`);
      console.log(`      Got: ${tinggiARMFilename}`);
    }
    if (!titikAktualCorrect) {
      console.log(`      Expected: ${testCase.expectedTitikAktual}`);
      console.log(`      Got: ${titikAktualFilename}`);
    }
  }
});

// Test special characters handling
console.log('\n🔍 Testing special characters handling...');
const specialCases = [
  { input: 'Jl. Sudirman No. 123-A', expected: 'Jl_Sudirman_No_123_A' },
  { input: 'Gang Mawar (RT 001)', expected: 'Gang_Mawar_RT_001' },
  { input: 'Jl. Raya Bogor & Depok', expected: 'Jl_Raya_Bogor_Depok' },
  { input: 'Taman Sari 1/2', expected: 'Taman_Sari_1_2' }
];

specialCases.forEach((testCase, index) => {
  const cleaned = testCase.input.replace(/[^a-zA-Z0-9]/g, '_');
  const correct = cleaned === testCase.expected;
  
  console.log(`   ${correct ? '✅' : '❌'} "${testCase.input}" → "${cleaned}"`);
  if (!correct) {
    console.log(`      Expected: "${testCase.expected}"`);
  }
});

console.log('\n✅ Photo naming format tests completed!');
console.log('💡 Check the results above to verify the new naming convention');
