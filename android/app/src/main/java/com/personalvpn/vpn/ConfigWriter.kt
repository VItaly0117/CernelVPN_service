package com.personalvpn.vpn

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.File

/**
 * ConfigWriter — Writes proxy core configuration files.
 *
 * Stub implementation that writes minimal/mock config files.
 * Will be extended to produce real sing-box or Xray configs.
 */
class ConfigWriter(private val context: Context) {

    companion object {
        private const val TAG = "ConfigWriter"
        private const val SINGBOX_CONFIG_FILENAME = "singbox_config.json"
        private const val XRAY_CONFIG_FILENAME = "xray_config.json"
    }

    /**
     * Write a sing-box compatible config file.
     *
     * TODO: Generate a real sing-box config from the profile JSON.
     * Reference: https://sing-box.sagernet.org/configuration/
     */
    fun writeSingBoxConfig(profileJson: String): File {
        Log.i(TAG, "writeSingBoxConfig() — writing stub config")

        val config = JSONObject().apply {
            put("log", JSONObject().apply {
                put("level", "info")
                put("timestamp", true)
            })
            put("dns", JSONObject().apply {
                // Placeholder DNS config
            })
            // TODO: Parse profileJson and generate proper inbounds/outbounds
            put("_stub", true)
            put("_profileLength", profileJson.length)
        }

        val file = File(context.filesDir, SINGBOX_CONFIG_FILENAME)
        file.writeText(config.toString(2))
        Log.d(TAG, "Config written to ${file.absolutePath}")
        return file
    }

    /**
     * Write an Xray compatible config file.
     *
     * TODO: Generate a real Xray config from the profile JSON.
     * Reference: https://xtls.github.io/config/
     */
    fun writeXrayConfig(profileJson: String): File {
        Log.i(TAG, "writeXrayConfig() — writing stub config")

        val config = JSONObject().apply {
            put("log", JSONObject().apply {
                put("loglevel", "info")
            })
            // TODO: Parse profileJson and generate proper config
            put("_stub", true)
            put("_profileLength", profileJson.length)
        }

        val file = File(context.filesDir, XRAY_CONFIG_FILENAME)
        file.writeText(config.toString(2))
        Log.d(TAG, "Config written to ${file.absolutePath}")
        return file
    }
}
