import crypto, { randomBytes } from "crypto";
import Logger from "./Logger";
import { CertificateFiles } from "./data-accessor";

export async function validateKeypair() {
    if(await CertificateFiles.publicKeyFile.exists() && await CertificateFiles.privateKeyFile.exists()) return;
    Logger.info('Generating new RSA keypair for JWT signing...');
    await generateKeypair();
}

async function generateKeypair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: generateSecureCode(32),
        }
    });

    Bun.write(CertificateFiles.publicKeyFile, publicKey);
    Bun.write(CertificateFiles.privateKeyFile, privateKey);
}

/**
 * Generates a hopefully unique document ID for MongoDB documents. This is not guaranteed to be unique, but the chances of a collision are extremely low.
 * @returns A random string of 10 characters that can be used as a document ID.
 */
export function generateDocumentId(): string {
    return generateSecureCode(10);
}

/**
 * Generates a secure random code of the specified length.
 * @param length The length of the secure code
 * @returns A random hexadecimal string of the specified length.
 */
export function generateSecureCode(length: number): string {
    return randomBytes(length).toString('hex').slice(0, length);
}