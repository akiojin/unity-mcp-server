/**
 * SECURITY PATCH DEMONSTRATION
 * This script shows how to properly implement secure blacklist checking
 * to prevent the 16 critical vulnerabilities discovered in chaos testing.
 */

// VULNERABLE CODE (Current Implementation)
function vulnerableBlacklistCheck(menuPath, blacklistedMenus) {
  return blacklistedMenus.has(menuPath);
}

// SECURE CODE (Recommended Fix)
function secureBlacklistCheck(menuPath, blacklistedMenus) {
  // Input validation
  if (typeof menuPath !== 'string') {
    throw new Error('menuPath must be a string');
  }
  
  if (menuPath.length > 200) {
    throw new Error('menuPath too long');
  }
  
  // Normalize the input to prevent bypass attempts
  const normalized = menuPath
    .toLowerCase()                    // Case insensitive matching
    .trim()                          // Remove leading/trailing whitespace
    .replace(/\s+/g, '')            // Remove all whitespace characters
    .replace(/[\\\/]+/g, '/')       // Normalize path separators
    .normalize('NFKC');             // Unicode normalization (critical!)
  
  // Remove zero-width and control characters
  const cleaned = normalized.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, '');
  
  // Reject dangerous patterns
  const dangerousPatterns = [
    /[;&|`$(){}[\]<>]/,             // Command injection characters
    /\.\./,                         // Path traversal
    /\x00/,                         // Null bytes
    /[\x00-\x1F\x7F-\x9F]/         // Control characters
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(cleaned)) {
      throw new Error('menuPath contains dangerous characters');
    }
  }
  
  // Create normalized blacklist for comparison
  const normalizedBlacklist = Array.from(blacklistedMenus).map(item => 
    item.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[\\\/]+/g, '/')
        .normalize('NFKC')
  );
  
  return normalizedBlacklist.includes(cleaned);
}

// TEST DEMONSTRATION
console.log('🚨 SECURITY VULNERABILITY DEMONSTRATION');
console.log('==========================================\n');

const blacklistedMenus = new Set(['File/Quit', 'Assets/Delete', 'File/Build And Run']);

const attackVectors = [
  'file/quit',           // Case bypass
  'FILE/QUIT',          // Case bypass
  'File/quit',          // Mixed case bypass  
  ' File/Quit ',        // Whitespace padding
  'File/Quit\t',        // Tab character
  'File/Quit\n',        // Newline character
  'File/ Quit',         // Space in path
  'File / Quit',        // Spaces around slash
  'File//Quit',         // Double slash
  'File\\Quit',         // Backslash
  'Fіle/Quit',          // Unicode homograph (Cyrillic і)
  'File/Quіt',          // Unicode homograph (Cyrillic і)
  'Filе/Quit',          // Unicode homograph (Cyrillic е)
  'File\u200B/Quit',    // Zero-width space
  'File\uFEFF/Quit',    // Byte order mark
  'Fi\u200Ble/Quit'     // Zero-width space in middle
];

console.log('VULNERABLE IMPLEMENTATION RESULTS:');
console.log('----------------------------------');
attackVectors.forEach((attack, index) => {
  const isBlocked = vulnerableBlacklistCheck(attack, blacklistedMenus);
  const status = isBlocked ? '❌ BLOCKED' : '✅ BYPASSED';
  const severity = isBlocked ? '' : ' - CRITICAL VULNERABILITY!';
  console.log(`${(index + 1).toString().padStart(2)}. ${status}: "${attack}"${severity}`);
});

console.log('\nSECURE IMPLEMENTATION RESULTS:');
console.log('------------------------------');
attackVectors.forEach((attack, index) => {
  try {
    const isBlocked = secureBlacklistCheck(attack, blacklistedMenus);
    const status = isBlocked ? '❌ BLOCKED' : '✅ ALLOWED';
    console.log(`${(index + 1).toString().padStart(2)}. ${status}: "${attack}"`);
  } catch (error) {
    console.log(`${(index + 1).toString().padStart(2)}. ❌ REJECTED: "${attack}" - ${error.message}`);
  }
});

console.log('\n📊 VULNERABILITY SUMMARY:');
console.log('=========================');

const vulnerableBypassCount = attackVectors.filter(attack => 
  !vulnerableBlacklistCheck(attack, blacklistedMenus)
).length;

const secureBypassCount = attackVectors.filter(attack => {
  try {
    return !secureBlacklistCheck(attack, blacklistedMenus);
  } catch {
    return false; // Rejected inputs don't count as bypasses
  }
}).length;

console.log(`Vulnerable Implementation: ${vulnerableBypassCount}/${attackVectors.length} bypasses succeeded`);
console.log(`Secure Implementation: ${secureBypassCount}/${attackVectors.length} bypasses succeeded`);
console.log();

if (vulnerableBypassCount > 0) {
  console.log('🚨 CRITICAL: Current implementation has security vulnerabilities!');
  console.log('   Attackers can bypass safety restrictions and execute dangerous operations.');
  console.log('   IMMEDIATE PATCHING REQUIRED!');
} else {
  console.log('✅ Current implementation is secure against tested attack vectors.');
}

if (secureBypassCount === 0) {
  console.log('✅ Proposed secure implementation blocks all tested attack vectors.');
} else {
  console.log('⚠️  Proposed implementation may need additional hardening.');
}

console.log('\n🔧 NEXT STEPS:');
console.log('==============');
console.log('1. Replace vulnerable blacklist checking with secure implementation');
console.log('2. Add comprehensive input validation and sanitization');
console.log('3. Implement Unicode normalization for all string inputs');
console.log('4. Add automated security testing to CI/CD pipeline');
console.log('5. Conduct regular security audits of the menu system');