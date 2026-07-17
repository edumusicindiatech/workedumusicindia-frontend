// excelDownloadHelper.js
// Drop this file in your utils/ or helpers/ folder.
// Both AdminAttendanceDetailsModal and ProgressReport should import from here.

import * as XLSX from 'xlsx-js-style';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

/**
 * On Android (Capacitor), we must:
 *  1. Request WRITE_EXTERNAL_STORAGE permission (Android < 10 needs it explicitly).
 *  2. Write to Directory.ExternalStorage (this lands in the root of internal storage,
 *     visible in the Files app) — NOT Directory.Documents (that goes to a private
 *     app sandbox on Android 10+ and users can never find it).
 *  3. Show the user the exact path so they know where to look.
 *
 * On iOS (Capacitor), Directory.Documents is fine and the file appears in the
 * Files app under "On My iPhone > <AppName>".
 *
 * On web, use the standard Blob / anchor approach.
 */

// ─── Permission helper (Android only) ───────────────────────────────────────
async function ensureStoragePermission() {
    // Only needed on native Android; Filesystem plugin handles iOS internally.
    if (Capacitor.getPlatform() !== 'android') return true;

    try {
        // Dynamically import so web builds don't fail if plugin isn't installed.
        const { Permissions } = await import('@capacitor/core');

        // On Android 13+ READ_MEDIA_* replaced WRITE_EXTERNAL_STORAGE,
        // but for writing files the Filesystem plugin handles it automatically
        // when using Directory.ExternalStorage — no manual request needed.
        // For Android 9 and below we request the old permission.
        const info = await Filesystem.checkPermissions();
        if (info.publicStorage === 'granted') return true;

        const req = await Filesystem.requestPermissions();
        return req.publicStorage === 'granted';
    } catch {
        // Plugin might not expose permissions API on all versions; proceed anyway.
        return true;
    }
}

// ─── Main export function ────────────────────────────────────────────────────
/**
 * @param {object} workbook   - An xlsx-js-style workbook object (already built)
 * @param {string} fileName   - e.g. "John_Doe_Records_May_2026.xlsx"
 * @param {object} toast      - react-hot-toast instance (pass the whole `toast` object)
 * @param {string} toastId    - existing loading toast id to update
 */
export async function downloadExcelWorkbook(workbook, fileName, toast, toastId) {
    try {
        if (Capacitor.isNativePlatform()) {
            // ── NATIVE PATH ──────────────────────────────────────────────────
            const granted = await ensureStoragePermission();
            if (!granted) {
                toast.error('Storage permission denied. Cannot save file.', { id: toastId });
                return;
            }

            const platform = Capacitor.getPlatform();
            const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

            if (platform === 'android') {
                // Directory.ExternalStorage → root of internal storage (/sdcard/)
                // Visible in "Files > Internal Storage" on every Android device.
                // We put it in a "Download" subfolder to match user expectations.
                const result = await Filesystem.writeFile({
                    path: `Download/${fileName}`,
                    data: base64Data,
                    directory: Directory.ExternalStorage,
                    recursive: true,        // creates "Download/" if it doesn't exist
                });

                toast.success(
                    `✅ Saved! Open your Files app → Internal Storage → Download → ${fileName}`,
                    { id: toastId, duration: 6000 }
                );

                // Optionally open the file immediately using the Share plugin.
                // Uncomment if @capacitor/share is installed in your project:
                //
                // try {
                //     const { Share } = await import('@capacitor/share');
                //     await Share.share({
                //         title: fileName,
                //         url: result.uri,
                //         dialogTitle: 'Open or share your report',
                //     });
                // } catch { /* user dismissed share sheet — that's fine */ }

            } else {
                // iOS: Directory.Documents shows up in Files app under app name
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true,
                });

                toast.success(
                    `✅ Saved to Files app → On My iPhone → [App Name] → ${fileName}`,
                    { id: toastId, duration: 6000 }
                );
            }

        } else {
            // ── WEB BROWSER PATH ─────────────────────────────────────────────
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob(
                [excelBuffer],
                { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }
            );

            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.style.display = 'none';
            anchor.href = url;
            anchor.setAttribute('download', fileName);

            if (typeof anchor.download === 'undefined') {
                anchor.setAttribute('target', '_blank');
            }

            document.body.appendChild(anchor);
            anchor.click();

            setTimeout(() => {
                document.body.removeChild(anchor);
                window.URL.revokeObjectURL(url);
            }, 1500);

            toast.success('Excel report downloaded!', { id: toastId });
        }

    } catch (error) {
        console.error('Excel download error:', error);

        // Give a more helpful message on Android permission failures.
        const msg = error?.message?.includes('permission')
            ? 'Permission denied. Please allow storage access in your device Settings.'
            : `Failed to save file: ${error?.message || 'Unknown error'}`;

        toast.error(msg, { id: toastId });
    }
}

export async function downloadExcelBlob(blob, fileName, toast, toastId) {
    try {
        if (Capacitor.isNativePlatform()) {
            // NATIVE PATH
            const granted = await ensureStoragePermission();
            if (!granted) {
                toast.error('Storage permission denied. Cannot save file.', { id: toastId });
                return;
            }

            // Convert Blob to Base64 for Capacitor Filesystem
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64Data = reader.result.split(',')[1];
                const platform = Capacitor.getPlatform();
                let writeResult;

                if (platform === 'android') {
                    writeResult = await Filesystem.writeFile({
                        path: `Download/${fileName}`,
                        data: base64Data,
                        directory: Directory.ExternalStorage,
                        recursive: true,
                    });
                } else {
                    writeResult = await Filesystem.writeFile({
                        path: fileName,
                        data: base64Data,
                        directory: Directory.Documents,
                        recursive: true,
                    });
                }

                toast.success(`Excel sheet downloaded successfully!`, { id: toastId, duration: 4000 });

                // IMMEDIATELY OPEN FILE
                try {
                    const { Share } = await import('@capacitor/share');
                    await Share.share({
                        title: fileName,
                        url: writeResult.uri,
                        dialogTitle: 'Open or share your report',
                    });
                } catch {
                    // User dismissed the share sheet, do nothing
                }
            };
        } else {
            // WEB BROWSER PATH
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.style.display = 'none';
            anchor.href = url;
            anchor.setAttribute('download', fileName);
            document.body.appendChild(anchor);
            anchor.click();
            setTimeout(() => {
                document.body.removeChild(anchor);
                window.URL.revokeObjectURL(url);
            }, 1500);

            toast.success('Excel sheet downloaded successfully!', { id: toastId });
        }
    } catch (error) {
        console.error('Excel blob download error:', error);
        toast.error(`Failed to save file: ${error?.message || 'Unknown error'}`, { id: toastId });
    }
}