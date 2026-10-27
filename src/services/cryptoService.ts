/**
 * ========================================================
 * FarmPro Security & Cryptography Service
 * تصميم وتطوير المهندس مالك حريبات | 0594345464
 *
 * يوفر هذا الملف:
 * 1. تشفير وتجزئة كلمات المرور ورموز الـ PIN باستخدام Web Crypto API (PBKDF2-HMAC-SHA256) مع Salt.
 * 2. قراءة/ترحيل البيانات القديمة المشفّرة بصيغة AES القديمة فقط.
 * 3. حماية وتشفير ملفات النسخ الاحتياطي (JSON Backup) بكلمة مرور.
 * ========================================================
 */

// Prefix to distinguish encrypted entries in storage
const ENCRYPTED_PREFIX = 'ENC_v1:';

// مفتاح قديم: يُستخدم فقط لقراءة بيانات مخزّنة بالصيغة القديمة وترحيلها (انظر migrateLegacyStorage).
// لا يُستخدم لتشفير أي بيانات جديدة لأنه مكشوف في الكود ولا يوفّر حماية.
const LEGACY_STORAGE_KEY_MATERIAL = 'FarmPro_SecureStorage_MalikHraibat_2026';

/**
 * تحويل مصفوفة بايت إلى تمثيل Hex
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * تحويل Hex إلى مصفوفة بايت
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

export class CryptoService {
  /**
   * توليد Salt عشوائي مشفر
   */
  static generateSalt(byteLength: number = 16): string {
    const array = new Uint8Array(byteLength);
    if ((globalThis as any).crypto?.getRandomValues) {
      (globalThis as any).crypto.getRandomValues(array);
    } else {
      // Fallback for non-browser environment
      for (let i = 0; i < byteLength; i++) {
        array[i] = Math.floor(Math.random() * 256); // احتياطي فقط عند غياب crypto
      }
    }
    return bufferToHex(array.buffer);
  }

  /**
   * تجزئة كلمة المرور أو رمز الـ PIN باستخدام PBKDF2-HMAC-SHA256 مع Salt
   * لا يتم تخزين أي كلمة مرور أو PIN كنص صريح
   */
  static async hashSecret(
    secret: string,
    customSalt?: string,
    iterations: number = 100000
  ): Promise<{ hash: string; salt: string }> {
    const webCrypto: Crypto | undefined = (globalThis as any).crypto;
    if (!webCrypto || !webCrypto.subtle) {
      throw new Error('المتصفح لا يدعم التشفير الآمن. افتح البرنامج عبر رابط https.');
    }
    const saltHex = customSalt || this.generateSalt(16);
    const saltBytes = hexToBytes(saltHex);
    const secretBytes = new TextEncoder().encode(secret);

    const keyMaterial = await webCrypto.subtle.importKey('raw', secretBytes, { name: 'PBKDF2' }, false, [
      'deriveBits',
    ]);
    const derivedBits = await webCrypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: saltBytes as any, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    );
    // الصيغة الجديدة تحمل عدد التكرارات: pbkdf2$<iterations>$<hex>
    return { hash: `pbkdf2$${iterations}$${bufferToHex(derivedBits)}`, salt: saltHex };
  }

  /** كلمات المرور: 600 ألف تكرار (توصية OWASP). رموز PIN تبقى 100 ألف حتى لا يتأخر لوح الأرقام. */
  static async hashPassword(secret: string): Promise<{ hash: string; salt: string }> {
    return this.hashSecret(secret, undefined, 600000);
  }

  /**
   * التحقق من تطابق كلمة المرور أو الـ PIN مع الـ Hash والـ Salt المخزنين
   */
  static async verifySecret(secret: string, storedHash: string, storedSalt: string): Promise<boolean> {
    if (!secret || !storedHash || !storedSalt) return false;
    try {
      let iterations = 100000;
      let expectedHex = storedHash;
      const m = /^pbkdf2\$(\d+)\$([0-9a-f]+)$/i.exec(storedHash);
      if (m) {
        iterations = parseInt(m[1], 10);
        expectedHex = m[2];
      }
      const result = await this.hashSecret(secret, storedSalt, iterations);
      const got = result.hash.replace(/^pbkdf2\$\d+\$/, '').toLowerCase();
      const exp = expectedHex.toLowerCase();
      if (got.length !== exp.length) return false;
      let diff = 0;
      for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ exp.charCodeAt(i);
      return diff === 0;
    } catch (e) {
      console.error('Password verification error:', e);
      return false;
    }
  }

  /**
   * اشتقاق مفتاح AES-GCM من عبارة سرية
   */
  private static async getStorageCryptoKey(): Promise<CryptoKey | null> {
    const webCrypto: Crypto | undefined = (globalThis as any).crypto;
    if (!webCrypto || !webCrypto.subtle) {
      return null;
    }
    try {
      const enc = new TextEncoder();
      const rawKey = enc.encode(LEGACY_STORAGE_KEY_MATERIAL);
      const hash = await window.crypto.subtle.digest('SHA-256', rawKey);
      return await window.crypto.subtle.importKey(
        'raw',
        hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    } catch {
      return null;
    }
  }

  /**
   * فك تشفير البيانات الحساسة عند القراءة فقط من localStorage
   */
  static async decryptLegacyData(storedValue: string): Promise<string> {
    if (!storedValue) return '';
    // If not encrypted, return as is (for backwards-compatibility and migration)
    if (!storedValue.startsWith(ENCRYPTED_PREFIX)) {
      return storedValue;
    }

    const payload = storedValue.substring(ENCRYPTED_PREFIX.length);

    // Fallback base64 decoding
    if (payload.startsWith('B64:')) {
      try {
        return decodeURIComponent(escape(atob(payload.substring(4))));
      } catch {
        return storedValue;
      }
    }

    // AES-GCM Decryption
    try {
      const key = await this.getStorageCryptoKey();
      if (key && window.crypto && window.crypto.subtle) {
        const [ivHex, ctHex] = payload.split(':');
        if (!ivHex || !ctHex) return storedValue;

        const iv = hexToBytes(ivHex);
        const ciphertext = hexToBytes(ctHex);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv as any },
          key,
          ciphertext as any
        );

        const dec = new TextDecoder();
        return dec.decode(decryptedBuffer);
      }
    } catch (e) {
      console.warn('CryptoService.decryptData failed:', e);
    }

    return storedValue;
  }

  /**
   * تشفير كامل لملف النسخ الاحتياطي مع كلمة مرور مخصصة
   */
  static async exportEncryptedBackup(jsonPayload: string, password?: string): Promise<string> {
    const exportData = {
      app: 'FarmPro',
      designer: 'مالك حريبات',
      createdAt: new Date().toISOString(),
      payload: jsonPayload,
    };

    if (!password || password.length < 6) {
      throw new Error('PASSWORD_REQUIRED');
    }

    // Password-based PBKDF2 + AES-GCM export
    try {
      const salt = hexToBytes(this.generateSalt(16));
      const iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);

      const enc = new TextEncoder();
      const pwBytes = enc.encode(password);

      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        pwBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const aesKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt as any,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const dataBytes = enc.encode(JSON.stringify(exportData));
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as any },
        aesKey,
        dataBytes
      );

      const packageObj = {
        type: 'FarmPro_Encrypted_Backup_v2',
        salt: bufferToHex(salt.buffer as ArrayBuffer),
        iv: bufferToHex(iv.buffer as ArrayBuffer),
        ciphertext: bufferToHex(ciphertext),
      };

      return JSON.stringify(packageObj, null, 2);
    } catch (e) {
      console.error('Password backup export error:', e);
      throw e;
    }
  }

  /**
   * فك تشفير واستيراد النسخ الاحتياطي مع كلمة المرور
   */
  static async importEncryptedBackup(fileContent: string, password?: string): Promise<string | null> {
    try {
      // Check if it's a password-packaged backup
      if (fileContent.trim().startsWith('{')) {
        const parsed = JSON.parse(fileContent);
        if (parsed.type === 'FarmPro_Encrypted_Backup_v2') {
          if (!password) {
            throw new Error('PASSWORD_REQUIRED');
          }

          const salt = hexToBytes(parsed.salt);
          const iv = hexToBytes(parsed.iv);
          const ciphertext = hexToBytes(parsed.ciphertext);

          const enc = new TextEncoder();
          const pwBytes = enc.encode(password);

          const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            pwBytes,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
          );

          const aesKey = await window.crypto.subtle.deriveKey(
            {
              name: 'PBKDF2',
              salt: salt as any,
              iterations: 100000,
              hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
          );

          const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as any },
            aesKey,
            ciphertext as any
          );

          const dec = new TextDecoder();
          const decryptedJson = dec.decode(decryptedBuffer);
          const decryptedObj = JSON.parse(decryptedJson);
          return decryptedObj.payload || decryptedJson;
        }
      }

      // Try regular decryptData
      const decrypted = await this.decryptLegacyData(fileContent);
      if (decrypted.trim().startsWith('{')) {
        const obj = JSON.parse(decrypted);
        return obj.payload || decrypted;
      }
      return decrypted;
    } catch (err: any) {
      if (err?.message === 'PASSWORD_REQUIRED') {
        throw err;
      }
      console.error('Import backup decrypt error:', err);
      return null;
    }
  }
}
