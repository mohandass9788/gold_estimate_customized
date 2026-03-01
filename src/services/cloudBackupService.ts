import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FS from 'expo-file-system';
const FileSystem = FS as any;
const { EncodingType, readAsStringAsync } = FileSystem;
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Google Client IDs - Updated for proper platform support
const GOOGLE_CLIENT_IDS = {
    web: '372914702820-43bo8au2brbhin5tuu8q473lmv893o9d.apps.googleusercontent.com', // For Expo Go
    android: '372914702820-43bo8au2brbhin5tuu8q473lmv893o9d.apps.googleusercontent.com', // User needs to replace
    ios: '372914702820-43bo8au2brbhin5tuu8q473lmv893o9d.apps.googleusercontent.com' // User needs to replace
};

const MICROSOFT_CLIENT_ID = 'YOUR_MICROSOFT_CLIENT_ID';

const REDIRECT_URI = AuthSession.makeRedirectUri({
    scheme: 'goldestimation',
    path: 'auth',
});

console.log('Redirect URI:', REDIRECT_URI);

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive.file'];
const MICROSOFT_SCOPES = ['files.readwrite.all', 'offline_access'];

export interface BackupFile {
    id: string;
    name: string;
    modifiedTime: string;
    size?: number;
}

export class CloudBackupService {
    private static instance: CloudBackupService;
    private googleToken: string | null = null;
    private microsoftToken: string | null = null;

    private constructor() { }

    public static getInstance(): CloudBackupService {
        if (!CloudBackupService.instance) {
            CloudBackupService.instance = new CloudBackupService();
        }
        return CloudBackupService.instance;
    }

    // --- Google Drive Logic ---

    public async loginGoogle(): Promise<boolean> {
        const discovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');

        const clientId = Platform.select({
            android: GOOGLE_CLIENT_IDS.android,
            ios: GOOGLE_CLIENT_IDS.ios,
            default: GOOGLE_CLIENT_IDS.web,
        });

        const request = new AuthSession.AuthRequest({
            clientId,
            scopes: GOOGLE_SCOPES,
            redirectUri: REDIRECT_URI,
        });

        const result = await request.promptAsync(discovery);
        if (result.type === 'success') {
            this.googleToken = result.authentication?.accessToken ?? null;
            return true;
        }
        return false;
    }

    public async uploadToGoogle(dbUri: string): Promise<boolean> {
        if (!this.googleToken) return false;

        try {
            const fileContent = await FileSystem.readAsStringAsync(dbUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const fileName = `gold_estimation_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;

            // Simplified multipart upload (metadata + content)
            const boundary = 'foo_bar_baz';
            const metadata = JSON.stringify({
                name: fileName,
                parents: ['appDataFolder'], // Store in hidden app data folder
            });

            const body = `--${boundary}\r\n` +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                `${metadata}\r\n` +
                `--${boundary}\r\n` +
                'Content-Type: application/octet-stream\r\n' +
                'Content-Transfer-Encoding: base64\r\n\r\n' +
                `${fileContent}\r\n` +
                `--${boundary}--`;

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.googleToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body,
            });

            return response.ok;
        } catch (error) {
            console.error('Google Backup Error:', error);
            return false;
        }
    }

    // --- Microsoft OneDrive Logic ---

    public async loginMicrosoft(): Promise<boolean> {
        const discovery = {
            authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        };

        const request = new AuthSession.AuthRequest({
            clientId: MICROSOFT_CLIENT_ID,
            scopes: MICROSOFT_SCOPES,
            redirectUri: REDIRECT_URI,
        });

        const result = await request.promptAsync(discovery);
        if (result.type === 'success') {
            this.microsoftToken = result.authentication?.accessToken ?? null;
            return true;
        }
        return false;
    }

    public async uploadToOneDrive(dbUri: string): Promise<boolean> {
        if (!this.microsoftToken) return false;

        try {
            const fileName = `gold_estimation_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
            const fileContent = await FileSystem.readAsStringAsync(dbUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // OneDrive simple upload for small files (< 4MB)
            const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/special/approot:/${fileName}:/content`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${this.microsoftToken}`,
                    'Content-Type': 'application/octet-stream',
                },
                body: Uint8Array.from(atob(fileContent), c => c.charCodeAt(0)),
            });

            return response.ok;
        } catch (error) {
            console.error('OneDrive Backup Error:', error);
            return false;
        }
    }

    public logout() {
        this.googleToken = null;
        this.microsoftToken = null;
    }
}

export const cloudBackup = CloudBackupService.getInstance();
