const USER_ROLES = {
  ADMIN: 'admin',
  ADMIN_SURVEY: 'admin_survey',
  SUPER_ADMIN: 'super_admin',
  PETUGAS_PENGUKURAN: 'petugas_pengukuran',
  PETUGAS_KEMERATAAN: 'petugas_kemerataan',
  PETUGAS_SURVEYOR: 'petugas_surveyor',
};

// Sample users with roles (for demo purposes)
// In real app, this should be fetched from Firebase or backend
const users = {
  'user1': USER_ROLES.PETUGAS_PENGUKURAN,
  'user2': USER_ROLES.PETUGAS_KEMERATAAN,
  'admin': USER_ROLES.ADMIN,
};

/**
 * Get role for a given username
 * @param {string} username 
 * @returns {string|null} role or null if not found
 */
export function getUserRole(username) {
  return users[username] || null;
}

/**
 * Get allowed dashboards based on role
 * @param {string} role
 * @returns {string|null} 'measurement', 'uniformity', 'surveyor', or null for admin (both)
 */
export function getDashboardAccess(role) {
  if (role === USER_ROLES.PETUGAS_PENGUKURAN) return 'measurement';
  if (role === USER_ROLES.PETUGAS_KEMERATAAN) return 'uniformity';
  if (role === USER_ROLES.PETUGAS_SURVEYOR) return 'surveyor';
  if (role === USER_ROLES.ADMIN) return null; // null means access to both dashboards
  if (role === USER_ROLES.ADMIN_SURVEY) return null; // handled by page routing
  if (role === USER_ROLES.SUPER_ADMIN) return null; // handled by page routing
  return null;
}

export { USER_ROLES };
