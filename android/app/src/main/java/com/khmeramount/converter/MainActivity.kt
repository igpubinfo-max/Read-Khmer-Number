package com.khmeramount.converter

import android.Manifest
import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.print.PrintHelper
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingImageBytes: ByteArray? = null
    private var pendingImageName: String? = null

    companion object {
        private const val REQ_STORAGE_PERMISSION = 1001
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                displayZoomControls = false
                builtInZoomControls = false
                mediaPlaybackRequiresUserGesture = false
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
            }
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()

            // Register native bridge for Print, Gallery Save, and Share
            addJavascriptInterface(AndroidBridge(this@MainActivity), "AndroidBridge")

            loadUrl("file:///android_asset/index.html")
        }

        setContentView(webView)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    inner class AndroidBridge(private val context: Context) {

        /**
         * Save Base64 JPG image directly into Android Gallery (Pictures/KhmerReceipt)
         */
        @JavascriptInterface
        fun saveImageToGallery(base64Data: String, filename: String) {
            runOnUiThread {
                try {
                    val cleanBase64 = if (base64Data.contains(",")) {
                        base64Data.substringAfter(",")
                    } else {
                        base64Data
                    }.trim()

                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val safeName = if (filename.endsWith(".jpg", ignoreCase = true) || filename.endsWith(".jpeg", ignoreCase = true)) {
                        filename
                    } else {
                        "$filename.jpg"
                    }

                    val success = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        saveToGalleryAndroidQ(bytes, safeName)
                    } else {
                        saveToGalleryLegacy(bytes, safeName)
                    }

                    if (success) {
                        Toast.makeText(
                            this@MainActivity,
                            "✅ បានរក្សាទុកក្នុង Gallery រួចរាល់!\nPictures/KhmerReceipt/$safeName",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(
                        this@MainActivity,
                        "កំហុសក្នុងការរក្សាទុករូបភាព: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }

        /**
         * Launch native Android Print Dialog (PrintManager + PrintHelper)
         */
        @JavascriptInterface
        fun printReceipt(base64Data: String?, jobName: String?) {
            runOnUiThread {
                try {
                    val safeJobName = jobName ?: "Khmer_Receipt_${System.currentTimeMillis()}"

                    // Method 1: Print high-resolution rendered bitmap via PrintHelper
                    if (!base64Data.isNullOrBlank()) {
                        val cleanBase64 = if (base64Data.contains(",")) {
                            base64Data.substringAfter(",")
                        } else {
                            base64Data
                        }.trim()

                        val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)

                        if (bitmap != null) {
                            val printHelper = PrintHelper(this@MainActivity).apply {
                                scaleMode = PrintHelper.SCALE_MODE_FIT
                                colorMode = PrintHelper.COLOR_MODE_COLOR
                            }
                            printHelper.printBitmap(safeJobName, bitmap)
                            return@runOnUiThread
                        }
                    }

                    // Method 2: Fallback to WebView PrintDocumentAdapter
                    val printManager = getSystemService(Context.PRINT_SERVICE) as? PrintManager
                    if (printManager != null) {
                        val printAdapter = webView.createPrintDocumentAdapter(safeJobName)
                        printManager.print(
                            safeJobName,
                            printAdapter,
                            PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                .build()
                        )
                    } else {
                        Toast.makeText(this@MainActivity, "ឧបករណ៍មិនគាំទ្រការ Print ទេ", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "កំហុស Print: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        /**
         * Share JPG receipt image to Telegram, Messenger, WhatsApp, etc.
         */
        @JavascriptInterface
        fun shareImage(base64Data: String, filename: String) {
            runOnUiThread {
                try {
                    val cleanBase64 = if (base64Data.contains(",")) {
                        base64Data.substringAfter(",")
                    } else {
                        base64Data
                    }.trim()

                    val bytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                    val shareDir = File(cacheDir, "receipt_shares").apply { mkdirs() }
                    val safeName = if (filename.endsWith(".jpg", ignoreCase = true)) filename else "$filename.jpg"
                    val shareFile = File(shareDir, safeName)
                    shareFile.writeBytes(bytes)

                    val uri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "${applicationContext.packageName}.fileprovider",
                        shareFile
                    )

                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "image/jpeg"
                        putExtra(Intent.EXTRA_STREAM, uri)
                        putExtra(Intent.EXTRA_SUBJECT, "បង្កាន់ដៃទូទាត់ប្រាក់")
                        putExtra(Intent.EXTRA_TEXT, "បង្កាន់ដៃទូទាត់ប្រាក់ជាអក្សរខ្មែរ")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    startActivity(Intent.createChooser(shareIntent, "ផ្ញើបង្កាន់ដៃទៅកាន់ Client"))
                } catch (e: Exception) {
                    Toast.makeText(this@MainActivity, "កំហុស Share: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Modern Android 10+ (API 29+) MediaStore API for saving pictures to Gallery without permissions
     */
    private fun saveToGalleryAndroidQ(bytes: ByteArray, filename: String): Boolean {
        val resolver = contentResolver
        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
            put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg")
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/KhmerReceipt")
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }

        val imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues) ?: return false

        try {
            resolver.openOutputStream(imageUri)?.use { outputStream ->
                outputStream.write(bytes)
                outputStream.flush()
            }

            contentValues.clear()
            contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
            resolver.update(imageUri, contentValues, null, null)

            // Trigger MediaScanner so Gallery indexes it immediately
            sendBroadcast(Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, imageUri))
            return true
        } catch (e: Exception) {
            resolver.delete(imageUri, null, null)
            throw e
        }
    }

    /**
     * Legacy Android 9 and below file saving with runtime permission check
     */
    private fun saveToGalleryLegacy(bytes: ByteArray, filename: String): Boolean {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
            != PackageManager.PERMISSION_GRANTED) {
            pendingImageBytes = bytes
            pendingImageName = filename
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE),
                REQ_STORAGE_PERMISSION
            )
            return false
        }

        val picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
        val receiptDir = File(picturesDir, "KhmerReceipt")
        if (!receiptDir.exists()) {
            receiptDir.mkdirs()
        }

        val file = File(receiptDir, filename)
        FileOutputStream(file).use { outputStream ->
            outputStream.write(bytes)
            outputStream.flush()
        }

        MediaScannerConnection.scanFile(
            this,
            arrayOf(file.absolutePath),
            arrayOf("image/jpeg")
        ) { _, _ -> }

        return true
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_STORAGE_PERMISSION) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                val bytes = pendingImageBytes
                val name = pendingImageName
                if (bytes != null && name != null) {
                    saveToGalleryLegacy(bytes, name)
                    Toast.makeText(
                        this,
                        "✅ បានរក្សាទុកក្នុង Gallery រួចរាល់!\nPictures/KhmerReceipt/$name",
                        Toast.LENGTH_LONG
                    ).show()
                }
            } else {
                Toast.makeText(this, "ត្រូវការសិទ្ធិផ្ទុកទិន្នន័យដើម្បីរក្សាទុករូបភាព", Toast.LENGTH_SHORT).show()
            }
            pendingImageBytes = null
            pendingImageName = null
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
