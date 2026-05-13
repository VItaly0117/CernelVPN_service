package com.personalvpn.vpn

import android.util.Log

/**
 * CoreManager — Stub for future Xray/sing-box core integration.
 *
 * This class will eventually manage the lifecycle of the proxy core process.
 * For the MVP, it is a no-op placeholder.
 */
class CoreManager {

    companion object {
        private const val TAG = "CoreManager"
    }

    @Volatile
    private var running = false

    @Volatile
    private var lastError: String? = null

    /**
     * Start the proxy core with the given profile and TUN file descriptor.
     *
     * TODO: Integrate sing-box or Xray core:
     *   1. Write config via ConfigWriter
     *   2. Launch core process / native library
     *   3. Pass TUN fd to core
     *   4. Monitor core health
     */
    fun start(profileJson: String, tunFd: Int?): Result<Unit> {
        Log.i(TAG, "start() called — stub, no real core running")
        Log.d(TAG, "Profile JSON length: ${profileJson.length}")
        Log.d(TAG, "TUN fd: $tunFd")

        // Simulate successful start
        running = true
        lastError = null

        // TODO: Replace with actual core start logic
        // try {
        //     val configFile = ConfigWriter(context).writeSingBoxConfig(profileJson)
        //     singBoxCore.start(configFile.absolutePath, tunFd)
        //     running = true
        // } catch (e: Exception) {
        //     lastError = e.message
        //     running = false
        //     return Result.failure(e)
        // }

        return Result.success(Unit)
    }

    /**
     * Stop the proxy core.
     */
    fun stop(): Result<Unit> {
        Log.i(TAG, "stop() called — stub")
        running = false
        lastError = null
        return Result.success(Unit)
    }

    /**
     * Check if the core is currently running.
     */
    fun isRunning(): Boolean = running

    /**
     * Get the last error message, if any.
     */
    fun getLastError(): String? = lastError
}
