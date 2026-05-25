package com.personalvpn.utils

import android.content.ComponentName
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AppIconManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppIconManager"
    }

    @ReactMethod
    fun changeIcon(aliasName: String, promise: Promise) {
        val pm = reactApplicationContext.packageManager
        val packageName = reactApplicationContext.packageName

        // In this setup, we assume MainActivity is the default, and we have one alias: MainActivityCalculator
        val defaultComponent = ComponentName(packageName, "$packageName.MainActivity")
        val calculatorComponent = ComponentName(packageName, "$packageName.MainActivityCalculator")

        try {
            if (aliasName == "Calculator") {
                pm.setComponentEnabledSetting(
                    defaultComponent,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP
                )
                pm.setComponentEnabledSetting(
                    calculatorComponent,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                )
            } else {
                // Restore Default
                pm.setComponentEnabledSetting(
                    calculatorComponent,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP
                )
                pm.setComponentEnabledSetting(
                    defaultComponent,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP
                )
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ICON_CHANGE_FAILED", e)
        }
    }
}
