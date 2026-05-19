package com.personalvpn.vpn

import android.content.Context
import android.net.ConnectivityManager
import android.net.IpPrefix
import android.net.LinkProperties
import android.net.Network
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.system.OsConstants
import android.util.Log
import com.personalvpn.BuildConfig
import io.nekohasekai.libbox.CommandServer
import io.nekohasekai.libbox.CommandServerHandler
import io.nekohasekai.libbox.ConnectionOwner
import io.nekohasekai.libbox.InterfaceUpdateListener
import io.nekohasekai.libbox.Libbox
import io.nekohasekai.libbox.LocalDNSTransport
import io.nekohasekai.libbox.NetworkInterface as BoxNetworkInterface
import io.nekohasekai.libbox.NetworkInterfaceIterator
import io.nekohasekai.libbox.Notification
import io.nekohasekai.libbox.OverrideOptions
import io.nekohasekai.libbox.PlatformInterface
import io.nekohasekai.libbox.RoutePrefix
import io.nekohasekai.libbox.RoutePrefixIterator
import io.nekohasekai.libbox.SetupOptions
import io.nekohasekai.libbox.StringIterator
import io.nekohasekai.libbox.SystemProxyStatus
import io.nekohasekai.libbox.TunOptions
import io.nekohasekai.libbox.WIFIState
import java.io.File
import java.net.InetAddress
import java.net.InterfaceAddress
import java.net.NetworkInterface as JavaNetworkInterface
import java.util.Collections

/**
 * Runs the embedded sing-box/libbox core and bridges its TUN requests to Android VpnService.
 */
class CoreManager(private val service: PersonalVpnService) :
    CommandServerHandler,
    PlatformInterface {

    companion object {
        private const val TAG = "CoreManager"
        private const val MAX_LOG_LINES = 500L

        @Volatile
        private var libboxReady = false

        @Volatile
        private var libboxSetupError: String? = null

        fun isLibboxAvailable(): Boolean = libboxSetupError == null

        fun getLibboxSetupError(): String? = libboxSetupError

        @Synchronized
        private fun setupLibbox(service: PersonalVpnService) {
            if (libboxReady || libboxSetupError != null) {
                return
            }

            try {
                val workingDir = File(service.filesDir, "libbox").apply { mkdirs() }
                val tempDir = File(service.cacheDir, "libbox").apply { mkdirs() }
                val options = SetupOptions().apply {
                    setBasePath(service.filesDir.absolutePath)
                    setWorkingPath(workingDir.absolutePath)
                    setTempPath(tempDir.absolutePath)
                    setFixAndroidStack(true)
                    setDebug(BuildConfig.DEBUG)
                    setLogMaxLines(MAX_LOG_LINES)
                }

                Libbox.touch()
                Libbox.setDefaultAppId(service.packageName)
                Libbox.setup(options)
                Libbox.setMemoryLimit(true)
                libboxReady = true
                libboxSetupError = null
                Log.i(TAG, "libbox ${Libbox.version()} initialized")
            } catch (e: Exception) {
                libboxSetupError = e.message ?: e.javaClass.simpleName
                Log.e(TAG, "Failed to initialize libbox", e)
            }
        }
    }

    @Volatile
    private var commandServer: CommandServer? = null

    @Volatile
    private var tunInterface: ParcelFileDescriptor? = null

    @Volatile
    private var running = false

    @Volatile
    private var lastError: String? = null

    @Volatile
    private var defaultNetworkCallback: ConnectivityManager.NetworkCallback? = null

    private val connectivityManager: ConnectivityManager by lazy {
        service.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }

    init {
        setupLibbox(service)
    }

    fun isCoreIntegrated(): Boolean = libboxSetupError == null

    @Synchronized
    fun start(coreConfigJson: String): Result<Unit> {
        if (coreConfigJson.isBlank()) {
            return fail("Missing sing-box core config")
        }

        libboxSetupError?.let { error ->
            return fail("libbox setup failed: $error")
        }

        return runCatching {
            stopLocked()

            val server = Libbox.newCommandServer(this, this)
            try {
                server.checkConfig(coreConfigJson)
                server.start()
                server.startOrReloadService(coreConfigJson, OverrideOptions())
                commandServer = server
                running = true
                lastError = null
                Log.i(TAG, "sing-box core started")
                Unit
            } catch (e: Exception) {
                runCatching { server.closeService() }
                runCatching { server.close() }
                closeTun()
                throw e
            }
        }.onFailure { error ->
            running = false
            lastError = error.message ?: error.javaClass.simpleName
            Log.e(TAG, "Failed to start sing-box core", error)
        }
    }

    @Synchronized
    fun stop(): Result<Unit> {
        return runCatching {
            stopLocked()
            Log.i(TAG, "sing-box core stopped")
            Unit
        }.onFailure { error ->
            lastError = error.message ?: error.javaClass.simpleName
            Log.w(TAG, "Failed to stop sing-box core cleanly", error)
        }
    }

    fun isRunning(): Boolean = running

    fun getLastError(): String? = lastError ?: libboxSetupError

    override fun getSystemProxyStatus(): SystemProxyStatus {
        return SystemProxyStatus().apply {
            setAvailable(false)
            setEnabled(false)
        }
    }

    override fun serviceReload() {
        Log.i(TAG, "libbox requested service reload")
    }

    override fun serviceStop() {
        Log.i(TAG, "libbox requested service stop")
        running = false
        closeTun()
        service.stopSelf()
    }

    override fun setSystemProxyEnabled(enabled: Boolean) {
        Log.d(TAG, "Ignoring system proxy toggle request: enabled=$enabled")
    }

    override fun writeDebugMessage(message: String) {
        Log.d(TAG, sanitizeLogLine(message))
    }

    override fun autoDetectInterfaceControl(fd: Int) {
        if (!service.protect(fd)) {
            throw IllegalStateException("Android VpnService.protect() failed for core socket")
        }
    }

    override fun clearDNSCache() {
        // Android DNS cache is system-managed for this app-level VPN service.
    }

    override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
        clearDefaultInterfaceMonitor()
    }

    override fun findConnectionOwner(
        ipProtocol: Int,
        sourceAddress: String,
        sourcePort: Int,
        destinationAddress: String,
        destinationPort: Int
    ): ConnectionOwner {
        return ConnectionOwner()
    }

    @Suppress("DEPRECATION")
    override fun getInterfaces(): NetworkInterfaceIterator {
        val javaInterfaces = runCatching {
            Collections.list(JavaNetworkInterface.getNetworkInterfaces())
        }.getOrDefault(emptyList())

        val androidInterfaces = runCatching {
            connectivityManager.allNetworks.mapNotNull { network ->
                val capabilities = connectivityManager.getNetworkCapabilities(network)
                    ?: return@mapNotNull null
                if (!capabilities.isUsableUnderlyingNetwork()) {
                    return@mapNotNull null
                }

                val linkProperties = connectivityManager.getLinkProperties(network)
                    ?: return@mapNotNull null
                val interfaceName = linkProperties.interfaceName ?: return@mapNotNull null
                val javaInterface = javaInterfaces.firstOrNull { it.name == interfaceName }
                    ?: return@mapNotNull null

                javaInterface.toBoxInterface(linkProperties, capabilities)
            }
        }.getOrElse { error ->
            Log.w(TAG, "Falling back to java.net network interfaces", error)
            emptyList()
        }

        val boxInterfaces = androidInterfaces.ifEmpty {
            javaInterfaces.mapNotNull { javaInterface ->
                runCatching { javaInterface.toFallbackBoxInterface() }.getOrNull()
            }
        }

        Log.d(TAG, "Providing ${boxInterfaces.size} Android network interfaces to libbox")
        return ListNetworkInterfaceIterator(boxInterfaces)
    }

    override fun includeAllNetworks(): Boolean = false

    override fun localDNSTransport(): LocalDNSTransport? = null

    override fun openTun(options: TunOptions): Int {
        return synchronized(this) {
            closeTun()

            val builder = service.Builder()
                .setSession("KernelVPN")

            val mtu = options.getMTU()
            if (mtu > 0) {
                builder.setMtu(mtu)
            }

            addTunAddresses(builder, options.getInet4Address())
            addTunAddresses(builder, options.getInet6Address())
            addDnsServers(builder, options.getDNSServerAddress().getValue())

            if (options.getAutoRoute()) {
                addRoutes(builder, options.getInet4RouteAddress())
                addRoutes(builder, options.getInet4RouteRange())
                addRoutes(builder, options.getInet6RouteAddress())
                addRoutes(builder, options.getInet6RouteRange())
                addExcludedRoutes(builder, options.getInet4RouteExcludeAddress())
                addExcludedRoutes(builder, options.getInet6RouteExcludeAddress())
            }

            applyPackageRules(
                builder = builder,
                includePackages = options.getIncludePackage().toList(),
                excludePackages = options.getExcludePackage().toList()
            )
            applyUnderlyingNetworks(builder)

            tunInterface = builder.establish()
                ?: throw IllegalStateException("Android VpnService.Builder.establish() returned null")

            val fd = tunInterface?.fd
                ?: throw IllegalStateException("Android TUN fd is unavailable")
            Log.i(TAG, "Android TUN established for libbox, fd=$fd")
            fd
        }
    }

    override fun readWIFIState(): WIFIState = WIFIState("", "")

    override fun sendNotification(notification: Notification) {
        Log.d(TAG, "Ignoring libbox notification: ${notification.getTitle()}")
    }

    override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
        defaultNetworkCallback?.let { existingCallback ->
            runCatching { connectivityManager.unregisterNetworkCallback(existingCallback) }
        }

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                notifyDefaultInterface(listener, network)
            }

            override fun onCapabilitiesChanged(
                network: Network,
                networkCapabilities: NetworkCapabilities
            ) {
                notifyDefaultInterface(listener, network)
            }

            override fun onLinkPropertiesChanged(
                network: Network,
                linkProperties: LinkProperties
            ) {
                notifyDefaultInterface(listener, network)
            }
        }

        defaultNetworkCallback = callback
        runCatching {
            connectivityManager.registerDefaultNetworkCallback(callback)
            notifyDefaultInterface(listener, null)
        }.onFailure { error ->
            defaultNetworkCallback = null
            Log.w(TAG, "Failed to start default interface monitor", error)
        }
    }

    override fun systemCertificates(): StringIterator = EmptyStringIterator

    override fun underNetworkExtension(): Boolean = false

    override fun usePlatformAutoDetectInterfaceControl(): Boolean = true

    override fun useProcFS(): Boolean = false

    @Synchronized
    private fun stopLocked() {
        running = false
        clearDefaultInterfaceMonitor()
        commandServer?.let { server ->
            runCatching { server.closeService() }
                .onFailure { Log.w(TAG, "closeService failed", it) }
            runCatching { server.close() }
                .onFailure { Log.w(TAG, "close failed", it) }
        }
        commandServer = null
        closeTun()
    }

    @Synchronized
    private fun closeTun() {
        runCatching { tunInterface?.close() }
            .onFailure { Log.w(TAG, "Failed to close TUN interface", it) }
        tunInterface = null
    }

    private fun fail(message: String): Result<Unit> {
        lastError = message
        running = false
        Log.e(TAG, message)
        return Result.failure(IllegalStateException(message))
    }

    private fun clearDefaultInterfaceMonitor() {
        defaultNetworkCallback?.let { callback ->
            runCatching { connectivityManager.unregisterNetworkCallback(callback) }
                .onFailure { Log.w(TAG, "Failed to unregister default network callback", it) }
        }
        defaultNetworkCallback = null
    }

    private fun addTunAddresses(
        builder: VpnService.Builder,
        iterator: RoutePrefixIterator
    ) {
        while (iterator.hasNext()) {
            val prefix = iterator.next()
            builder.addAddress(prefix.address(), prefix.prefix())
        }
    }

    private fun addRoutes(
        builder: VpnService.Builder,
        iterator: RoutePrefixIterator
    ) {
        while (iterator.hasNext()) {
            val prefix = iterator.next()
            builder.addRoute(prefix.address(), prefix.prefix())
        }
    }

    private fun addExcludedRoutes(
        builder: VpnService.Builder,
        iterator: RoutePrefixIterator
    ) {
        while (iterator.hasNext()) {
            val prefix = iterator.next()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                builder.excludeRoute(IpPrefix(InetAddress.getByName(prefix.address()), prefix.prefix()))
            } else {
                Log.d(TAG, "Route exclusion requires Android 13+: ${prefix.string()}")
            }
        }
    }

    private fun addDnsServers(builder: VpnService.Builder, rawValue: String?) {
        rawValue
            ?.split(',', ';', ' ', '\n', '\t')
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?.forEach { builder.addDnsServer(it) }
    }

    private fun applyPackageRules(
        builder: VpnService.Builder,
        includePackages: List<String>,
        excludePackages: List<String>
    ) {
        if (includePackages.isNotEmpty()) {
            includePackages.forEach { packageName ->
                runCatching { builder.addAllowedApplication(packageName) }
                    .onFailure { Log.w(TAG, "Failed to allow package $packageName", it) }
            }
            return
        }

        excludePackages.forEach { packageName ->
            runCatching { builder.addDisallowedApplication(packageName) }
                .onFailure { Log.w(TAG, "Failed to exclude package $packageName", it) }
        }
    }

    private fun applyUnderlyingNetworks(builder: VpnService.Builder) {
        val underlyingNetworks = findUnderlyingNetworks()
        if (underlyingNetworks.isEmpty()) {
            Log.w(TAG, "No underlying Wi-Fi/cellular network found for Android VPN builder")
            return
        }

        builder.setUnderlyingNetworks(underlyingNetworks.toTypedArray())
    }

    @Suppress("DEPRECATION")
    private fun findUnderlyingNetworks(): List<Network> {
        return runCatching {
            connectivityManager.allNetworks.filter { network ->
                connectivityManager.getNetworkCapabilities(network)
                    ?.isUsableUnderlyingNetwork() == true
            }
        }.getOrDefault(emptyList())
    }

    private fun notifyDefaultInterface(
        listener: InterfaceUpdateListener,
        preferredNetwork: Network?
    ) {
        val network = preferredNetwork?.takeIf { candidate ->
            connectivityManager.getNetworkCapabilities(candidate)
                ?.isUsableUnderlyingNetwork() == true
        } ?: findUnderlyingNetworks().firstOrNull()
            ?: return

        val linkProperties = connectivityManager.getLinkProperties(network) ?: return
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return
        val interfaceName = linkProperties.interfaceName ?: return
        val mtu = linkProperties.mtu.takeIf { it > 0 } ?: 1500
        val isWifi = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
        val isCellular = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)

        listener.updateDefaultInterface(interfaceName, mtu, isWifi, isCellular)
        Log.d(
            TAG,
            "Default interface for libbox: $interfaceName mtu=$mtu wifi=$isWifi cellular=$isCellular"
        )
    }

    private fun NetworkCapabilities.isUsableUnderlyingNetwork(): Boolean {
        return hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            !hasTransport(NetworkCapabilities.TRANSPORT_VPN)
    }

    private fun JavaNetworkInterface.toBoxInterface(
        linkProperties: LinkProperties,
        capabilities: NetworkCapabilities
    ): BoxNetworkInterface {
        val boxInterface = BoxNetworkInterface()
        boxInterface.setIndex(index)
        boxInterface.setName(linkProperties.interfaceName ?: name ?: "")
        boxInterface.setMTU(linkProperties.mtu.takeIf { it > 0 } ?: runCatching { mtu }.getOrDefault(1500))
        boxInterface.setType(detectInterfaceType(capabilities, name ?: ""))
        boxInterface.setMetered(!capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED))
        boxInterface.setFlags(buildInterfaceFlags(this))
        boxInterface.setAddresses(ListStringIterator(interfaceAddresses.mapNotNull { it.toPrefixString() }))
        boxInterface.setDNSServer(
            ListStringIterator(
                linkProperties.dnsServers.mapNotNull { address ->
                    address.hostAddress?.substringBefore('%')
                }
            )
        )
        return boxInterface
    }

    private fun JavaNetworkInterface.toFallbackBoxInterface(): BoxNetworkInterface {
        val boxInterface = BoxNetworkInterface()
        boxInterface.setIndex(index)
        boxInterface.setName(name ?: "")
        boxInterface.setMTU(runCatching { mtu }.getOrDefault(1500))
        boxInterface.setType(detectInterfaceType(name ?: ""))
        boxInterface.setMetered(false)
        boxInterface.setFlags(buildInterfaceFlags(this))
        boxInterface.setAddresses(
            ListStringIterator(
                interfaceAddresses.mapNotNull { address -> address.toPrefixString() }
            )
        )
        boxInterface.setDNSServer(EmptyStringIterator)
        return boxInterface
    }

    private fun detectInterfaceType(capabilities: NetworkCapabilities, fallbackName: String): Int {
        return when {
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> Libbox.InterfaceTypeWIFI
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> Libbox.InterfaceTypeCellular
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> Libbox.InterfaceTypeEthernet
            else -> detectInterfaceType(fallbackName)
        }
    }

    private fun detectInterfaceType(name: String): Int {
        return when {
            name.startsWith("wlan", ignoreCase = true) -> Libbox.InterfaceTypeWIFI
            name.startsWith("rmnet", ignoreCase = true) ||
                name.startsWith("ccmni", ignoreCase = true) ||
                name.startsWith("cell", ignoreCase = true) -> Libbox.InterfaceTypeCellular
            name.startsWith("eth", ignoreCase = true) -> Libbox.InterfaceTypeEthernet
            else -> Libbox.InterfaceTypeOther
        }
    }

    private fun buildInterfaceFlags(javaInterface: JavaNetworkInterface): Int {
        var flags = 0
        if (runCatching { javaInterface.isUp }.getOrDefault(false)) {
            flags = flags or OsConstants.IFF_UP or OsConstants.IFF_RUNNING
        }
        if (runCatching { javaInterface.isLoopback }.getOrDefault(false)) {
            flags = flags or OsConstants.IFF_LOOPBACK
        }
        if (runCatching { javaInterface.isPointToPoint }.getOrDefault(false)) {
            flags = flags or OsConstants.IFF_POINTOPOINT
        }
        if (runCatching { javaInterface.supportsMulticast() }.getOrDefault(false)) {
            flags = flags or OsConstants.IFF_MULTICAST
        }
        return flags
    }

    private fun InterfaceAddress.toPrefixString(): String? {
        val hostAddress = address?.hostAddress?.substringBefore('%') ?: return null
        return "$hostAddress/$networkPrefixLength"
    }

    private fun StringIterator.toList(): List<String> {
        val values = mutableListOf<String>()
        while (hasNext()) {
            val value = next()
            if (value.isNotBlank()) {
                values += value
            }
        }
        return values
    }

    private fun sanitizeLogLine(message: String): String {
        return message
            .replace(Regex("\"uuid\"\\s*:\\s*\"[^\"]+\""), "\"uuid\":\"<redacted>\"")
            .replace(Regex("\"password\"\\s*:\\s*\"[^\"]+\""), "\"password\":\"<redacted>\"")
            .replace(Regex("\"server\"\\s*:\\s*\"[^\"]+\""), "\"server\":\"<redacted>\"")
    }

    private object EmptyStringIterator : StringIterator {
        override fun hasNext(): Boolean = false
        override fun len(): Int = 0
        override fun next(): String = ""
    }

    private class ListStringIterator(private val values: List<String>) : StringIterator {
        private var index = 0
        override fun hasNext(): Boolean = index < values.size
        override fun len(): Int = values.size
        override fun next(): String = values[index++]
    }

    private class ListNetworkInterfaceIterator(
        private val values: List<BoxNetworkInterface>
    ) : NetworkInterfaceIterator {
        private var index = 0
        override fun hasNext(): Boolean = index < values.size
        override fun next(): BoxNetworkInterface = values[index++]
    }
}
