import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import { format } from 'date-fns';

const DB_NAME = 'gold_estimation.db';
const DB_PATH = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

export const backupDatabaseLocal = async (deviceName: string = 'device', t: (key: string) => string = (k) => k) => {
    try {
        const info = await FileSystem.getInfoAsync(DB_PATH);
        if (!info.exists) {
            Alert.alert(t('error'), t('db_not_found'));
            return false;
        }

        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
        const cleanDeviceName = deviceName.replace(/[^a-z0-9_-]/gi, '_');
        const backupFileName = `gold_estimation_backup_${cleanDeviceName}_${timestamp}.db`;
        const backupUri = `${FileSystem.cacheDirectory}${backupFileName}`;

        // Copy to cache directory so we can share/save it
        await FileSystem.copyAsync({
            from: DB_PATH,
            to: backupUri
        });

        if (Platform.OS === 'android') {
            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const base64 = await FileSystem.readAsStringAsync(backupUri, { encoding: FileSystem.EncodingType.Base64 });
                await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, backupFileName, 'application/octet-stream')
                    .then(async (uri) => {
                        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
                        Alert.alert(t('success'), t('local_backup_success_saf'));
                    })
                    .catch(e => {
                        console.error('SAF error:', e);
                        Alert.alert(t('error'), t('failed_save_folder'));
                    });
                return true;
            }
        }

        // Fallback or iOS: Use sharing sheet (which includes "Save to Files")
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(backupUri, {
                mimeType: 'application/octet-stream',
                dialogTitle: t('local_backup'),
                UTI: 'public.database'
            });
            return true;
        } else {
            Alert.alert(t('error'), t('sharing_not_available'));
            return false;
        }
    } catch (error) {
        console.error('Local Backup Error:', error);
        Alert.alert(t('error'), t('local_backup_failed'));
        return false;
    }
};

export const restoreDatabaseLocal = async (t: (key: string) => string = (k) => k) => {
    try {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/x-sqlite3', 'application/octet-stream', 'application/sql', 'application/db'],
            copyToCacheDirectory: true
        });

        if (result.canceled) return false;

        const asset = result.assets[0];
        if (!asset.name.toLowerCase().endsWith('.db')) {
            Alert.alert(t('error'), t('invalid_db_file'));
            return false;
        }

        // Create SQLite directory if it doesn't exist (safety)
        const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
        const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
        }

        // Delete existing DB if it exists
        const dbInfo = await FileSystem.getInfoAsync(DB_PATH);
        if (dbInfo.exists) {
            await FileSystem.deleteAsync(DB_PATH);
        }

        // Copy new DB
        await FileSystem.copyAsync({
            from: asset.uri,
            to: DB_PATH
        });

        Alert.alert(
            t('success'),
            t('restore_success') + ' ' + t('restart_for_changes'),
            [{ text: 'OK' }]
        );
        return true;
    } catch (error) {
        console.error('Local Restore Error:', error);
        Alert.alert(t('error'), t('local_restore_failed'));
        return false;
    }
};
