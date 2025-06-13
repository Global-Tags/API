import crypto from "crypto";
import { generateSecureCode } from "../routes/players/[uuid]/connections";
import Logger from "./Logger";

const publicKeyFile = Bun.file('./data/certificate/pubkey.pem');
const privateKeyFile = Bun.file('./data/certificate/privkey.pem');

export async function validateKeypair() {
    if(await publicKeyFile.exists() && await privateKeyFile.exists()) return;
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

    Bun.write(publicKeyFile, publicKey);
    Bun.write(privateKeyFile, privateKey);
}