package com.dvlce.claudeisland;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.View;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.nio.charset.StandardCharsets;
import java.io.OutputStream;

/** Offline game shell: HTTPS local assets, hardware WebGL, persistent saves and native file export. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int EXPORT = 100, IMPORT = 101;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingSave;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        web = new WebView(this);
        web.setBackgroundColor(0xff89c9df);
        setContentView(web);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri.toString().startsWith(ORIGIN + "/assets/game/")) return false;
                if ("https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("application/json");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(intent, IMPORT); return true; }
                catch (Exception error) { fileCallback = null; return false; }
            }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, android.os.Message result) {
                return false;
            }
        });
        web.addJavascriptInterface(new SaveBridge(), "AndroidIsland");
        web.loadUrl(ORIGIN + "/assets/game/index.html");
    }

    private final class SaveBridge {
        @JavascriptInterface public void exportSave(String json) {
            runOnUiThread(() -> {
                pendingSave = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_TITLE, "claude-island-progressi.json");
                try { startActivityForResult(intent, EXPORT); }
                catch (Exception error) { Toast.makeText(MainActivity.this, "Impossibile aprire i file", Toast.LENGTH_SHORT).show(); }
            });
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == IMPORT && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        } else if (request == EXPORT && result == RESULT_OK && data != null && pendingSave != null) {
            try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                out.write(pendingSave.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, "Progressi salvati", Toast.LENGTH_SHORT).show();
            } catch (Exception error) { Toast.makeText(this, "Salvataggio non riuscito", Toast.LENGTH_SHORT).show(); }
            pendingSave = null;
        }
    }

    @Override protected void onPause() {
        web.evaluateJavascript("window.dispatchEvent(new Event('islandpause'));", null);
        web.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.evaluateJavascript("window.dispatchEvent(new Event('islandresume'));", null);
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true}return false})()", result -> {
            if (!"true".equals(result)) super.onBackPressed();
        });
    }
    @Override protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }
}
