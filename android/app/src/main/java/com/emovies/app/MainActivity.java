package com.emovies.app;

import android.os.Bundle;
import android.os.Message;
import android.webkit.ConsoleMessage;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.app.DownloadManager;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.view.ViewGroup;
import android.os.Environment;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import android.webkit.URLUtil;
import android.webkit.CookieManager;
import android.widget.Toast;
import android.util.Base64;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import android.os.Build;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;

public class MainActivity extends BridgeActivity {

    private String pendingFileContent = "";
    private String pendingFileName = "";
    private SwipeRefreshLayout swipeRefreshLayout;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        // Make sure the content draws behind the status bar and nav bar
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
        
        // This ensures the WebView's background is transparent if needed
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setBackgroundColor(android.graphics.Color.TRANSPARENT);
        }
    }

    public class WebAppInterface {
        Activity mContext;
        WebAppInterface(Activity c) {
            mContext = c;
        }

        @JavascriptInterface
        public void setSwipeRefreshEnabled(final boolean enabled) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (swipeRefreshLayout != null) {
                        swipeRefreshLayout.setEnabled(enabled);
                    }
                }
            });
        }

        @JavascriptInterface
        public void setKeepScreenOn(final boolean keepOn) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        if (keepOn) {
                            MainActivity.this.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                            if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                                MainActivity.this.bridge.getWebView().setKeepScreenOn(true);
                            }
                            if (swipeRefreshLayout != null) {
                                swipeRefreshLayout.setKeepScreenOn(true);
                            }
                        } else {
                            MainActivity.this.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                            if (MainActivity.this.bridge != null && MainActivity.this.bridge.getWebView() != null) {
                                MainActivity.this.bridge.getWebView().setKeepScreenOn(false);
                            }
                            if (swipeRefreshLayout != null) {
                                swipeRefreshLayout.setKeepScreenOn(false);
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        @JavascriptInterface
        public void saveFile(String filename, String base64Content) {
            pendingFileName = filename;
            pendingFileContent = base64Content;
            
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/octet-stream");
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            mContext.startActivityForResult(intent, 112233);
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 112233 && resultCode == Activity.RESULT_OK) {
            if (data != null && data.getData() != null) {
                try {
                    Uri uri = data.getData();
                    OutputStream outputStream = getContentResolver().openOutputStream(uri);
                    byte[] decodedBytes = Base64.decode(pendingFileContent, Base64.DEFAULT);
                    outputStream.write(decodedBytes);
                    outputStream.close();
                    Toast.makeText(this, "File berhasil disimpan!", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Gagal menyimpan file", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        
        WebView webView = this.bridge.getWebView();

        if (swipeRefreshLayout == null) {
            swipeRefreshLayout = new SwipeRefreshLayout(this);
            ViewGroup parent = (ViewGroup) webView.getParent();
            parent.removeView(webView);
            swipeRefreshLayout.addView(webView);
            parent.addView(swipeRefreshLayout);

            // Warna spinner loading menjadi hijau khas Emovies
            swipeRefreshLayout.setColorSchemeColors(android.graphics.Color.parseColor("#22c55e"));

            swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
                @Override
                public void onRefresh() {
                    webView.reload();
                }
            });
        }

        WebSettings settings = webView.getSettings();
        
        // Add Javascript Interface for Save As Dialog
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");

        // Hide native Android scrollbars
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

        // Enable multiple windows so onCreateWindow is called when window.open() happens
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // --- Handle File Downloads (e.g. Subtitles) ---
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimetype);
                String cookies = CookieManager.getInstance().getCookie(url);
                request.addRequestHeader("cookie", cookies);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file...");
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype));
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, contentDisposition, mimetype));
                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                dm.enqueue(request);
                Toast.makeText(getApplicationContext(), "Downloading file...", Toast.LENGTH_LONG).show();
            }
        });

        // Keep the original Capacitor WebChromeClient to delegate other methods
        final WebChromeClient capClient = webView.getWebChromeClient();

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                // BLOCK all popup ads / window.open() from video iframes
                return false;
            }

            // --- Delegate all other methods back to Capacitor's original client ---
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                if (capClient != null) return capClient.onJsAlert(view, url, message, result);
                return super.onJsAlert(view, url, message, result);
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                if (capClient != null) return capClient.onJsConfirm(view, url, message, result);
                return super.onJsConfirm(view, url, message, result);
            }

            @Override
            public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, JsPromptResult result) {
                if (capClient != null) return capClient.onJsPrompt(view, url, message, defaultValue, result);
                return super.onJsPrompt(view, url, message, defaultValue, result);
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                if (capClient != null) return capClient.onConsoleMessage(consoleMessage);
                return super.onConsoleMessage(consoleMessage);
            }

            @Override
            public boolean onShowFileChooser(WebView webView, android.webkit.ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
                if (capClient != null) return capClient.onShowFileChooser(webView, filePathCallback, params);
                return super.onShowFileChooser(webView, filePathCallback, params);
            }

            @Override
            public void onPermissionRequest(android.webkit.PermissionRequest request) {
                if (capClient != null) capClient.onPermissionRequest(request);
                else super.onPermissionRequest(request);
            }

            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                try {
                    MainActivity.this.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    if (view != null) {
                        view.setKeepScreenOn(true);
                    }
                } catch (Exception ignored) {}
                if (capClient != null) capClient.onShowCustomView(view, callback);
                else super.onShowCustomView(view, callback);
            }

            @Override
            public void onHideCustomView() {
                if (capClient != null) capClient.onHideCustomView();
                else super.onHideCustomView();
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                if (capClient != null) capClient.onGeolocationPermissionsShowPrompt(origin, callback);
                else super.onGeolocationPermissionsShowPrompt(origin, callback);
            }
        });

        // Our previous AdBlock URL Interceptor
        webView.setWebViewClient(new BridgeWebViewClient(this.bridge) {
            private final String[] AD_HOSTS = {
                "googleads", "doubleclick.net", "pagead2", "pubmatic", "criteo", "taboola", 
                "outbrain", "adsystem", "bet365", "1xbet", "sbobet", "slot", "judi", "poker", 
                "casino", "popads", "popcash", "onclickads", "exoclick", "admeira", "admob", 
                "adsense", "adsterra", "highcpm", "profitabledisplay", "propellerads", 
                "bidgear", "mgid", "adskeeper", "adxad", "ad-delivery", "adserver", 
                "betwinner", "melbet", "888", "12bet", "w88", "m88", "dafabet", "bk8",
                "histats.com", "track", "analytics", "pixel", "runative", "hilltopads",
                "adcash", "juicyads", "trafficstars", "plugrush", "clickadu", "monetag",
                "awin1", "ad-center", "a-ads", "realsrv", "magsrv", "tsyndicate"
            };

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString().toLowerCase();
                
                for (String host : AD_HOSTS) {
                    if (url.contains(host)) {
                        return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream("".getBytes()));
                    }
                }
                
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (swipeRefreshLayout != null) {
                    swipeRefreshLayout.setRefreshing(false);
                }
            }

            // Mencegah redirect yang membuka browser eksternal (Intent Chrome dll)
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                String lowerUrl = url.toLowerCase();

                // Selalu izinkan URL internal (localhost)
                if (url.startsWith("http://localhost") || url.startsWith("https://localhost") || url.startsWith("capacitor://localhost")) {
                    return super.shouldOverrideUrlLoading(view, request);
                }

                // Jika iframe mencoba me-redirect Main Frame (Membajak aplikasi secara keseluruhan) -> BLOKIR
                if (request.isForMainFrame()) {
                    return true;
                }

                // Blokir jika url mengandung host iklan meskipun di dalam iframe
                for (String host : AD_HOSTS) {
                    if (lowerUrl.contains(host)) {
                        return true;
                    }
                }

                // Biarkan navigasi normal di dalam iframe (contoh: video player load stream)
                return super.shouldOverrideUrlLoading(view, request);
            }

            // Untuk Android versi lama
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http://localhost") || url.startsWith("https://localhost") || url.startsWith("capacitor://localhost")) {
                    return super.shouldOverrideUrlLoading(view, url);
                }
                // Blokir semua navigasi lain di versi lama untuk keamanan dari Iklan
                return true; 
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().setKeepScreenOn(false);
            }
        } catch (Exception ignored) {
        }
    }
}
