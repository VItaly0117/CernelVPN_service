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
    private var lastError: String? = "Core is not integrated yet"

    /** Whether the real proxy core is integrated. */
    fun isCoreIntegrated(): Boolean = false

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

        // In skeleton mode, we return success so the VPN lifecycle can proceed
        // but the core is NOT actually running.
        return Result.success(Unit)
    }

    /**
     * Stop the proxy core.
     */
    fun stop(): Result<Unit> {
        Log.i(TAG, "stop() called — stub")
        return Result.success(Unit)
    }

    /**
     * Check if the core is currently running.
     */
    fun isRunning(): Boolean = false

    /**
     * Get the last error message, if any.
     */
    fun getLastError(): String? = lastError
}
