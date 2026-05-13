package com.personalvpn.vpn

/**
 * VPN connection status enum.
 * Maps to the TypeScript VpnStatus type.
 */
enum class VpnStatus(val value: String) {
    DISCONNECTED("disconnected"),
    PERMISSION_REQUIRED("permission_required"),
    CONNECTING("connecting"),
    CONNECTED("connected"),
    DISCONNECTING("disconnecting"),
    ERROR("error");

    companion object {
        fun fromString(value: String): VpnStatus {
            return entries.find { it.value == value } ?: DISCONNECTED
        }
    }
}
