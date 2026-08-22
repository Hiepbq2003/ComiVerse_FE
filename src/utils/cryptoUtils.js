/**
 * Utility functions for decrypting scrambled comic page mapping data using Web Crypto API.
 * Backend encrypts using AES-128-CBC with PKCS5/PKCS7 padding:
 * - Base64 encoded payload: [16-byte random IV] + [AES Ciphertext]
 * - Plaintext payload format: "[15,6,2,7,10,4,0,8,9,12,1,3,13,11,5,14]"
 */

const DEFAULT_SECRET_KEY = 'ComiVerseKey16B!';

/**
 * Decrypts Base64 AES-128-CBC encrypted mapping string into an integer array.
 * 
 * @param {string} encryptedBase64 The Base64 string from encryptedMapping
 * @param {string} [secretKey] Optional secret key (defaults to ComiVerseKey16B!)
 * @returns {Promise<number[]>} Array of original slice indices
 */
export async function decryptMappingAesCbc(encryptedBase64, secretKey = DEFAULT_SECRET_KEY) {
  if (!encryptedBase64) {
    return [];
  }

  try {
    // 1. Decode Base64 string to Uint8Array
    const binaryStr = atob(encryptedBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    if (bytes.length < 32) {
      throw new Error('Encrypted payload too short for AES-128-CBC');
    }

    // 2. Extract IV (first 16 bytes) and Ciphertext (remaining bytes)
    const iv = bytes.subarray(0, 16);
    const ciphertext = bytes.subarray(16);

    // 3. Prepare 16-byte Secret Key (UTF-8 encoded, zero-padded if length < 16)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey || DEFAULT_SECRET_KEY);
    const rawKey = new Uint8Array(16);
    rawKey.set(keyData.subarray(0, 16));

    // 4. Import Key into Web Crypto API
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    // 5. Perform AES-128-CBC Decryption
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      ciphertext
    );

    // 6. Decode UTF-8 string (e.g. "[15,6,2,7,10,4,0,8,9,12,1,3,13,11,5,14]")
    const decoder = new TextDecoder('utf-8');
    const decryptedText = decoder.decode(decryptedBuffer);

    // 7. Parse string into array of numbers
    const cleanStr = decryptedText.replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!cleanStr) {
      return [];
    }

    return cleanStr.split(',').map((val) => parseInt(val.trim(), 10));
  } catch (error) {
    console.error('Failed to decrypt mapping:', error);
    throw error;
  }
}
