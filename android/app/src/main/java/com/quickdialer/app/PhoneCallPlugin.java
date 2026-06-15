package com.quickdialer.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "PhoneCall",
        permissions = {@Permission(strings = {Manifest.permission.CALL_PHONE}, alias = "phone")}
)
public class PhoneCallPlugin extends Plugin {

    @PluginMethod
    public void checkCallPermission(PluginCall call) {
        PermissionState state = getPermissionState("phone");
        JSObject ret = new JSObject();
        ret.put("state", state.toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestCallPermission(PluginCall call) {
        if (getPermissionState("phone") == PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("state", "granted");
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("phone", call, "requestPermCallback");
    }

    @PermissionCallback
    private void requestPermCallback(PluginCall call) {
        JSObject ret = new JSObject();
        PermissionState ps = getPermissionState("phone");
        ret.put("state", ps == PermissionState.GRANTED ? "granted" : "denied");
        call.resolve(ret);
    }

    @PluginMethod
    public void placeCall(PluginCall call) {
        String number = call.getString("number");
        if (number == null || number.trim().isEmpty()) {
            call.reject("Missing number");
            return;
        }
        if (getPermissionState("phone") != PermissionState.GRANTED) {
            requestPermissionForAlias("phone", call, "placeCallPermCallback");
            return;
        }
        performCall(call, number.trim());
    }

    @PermissionCallback
    private void placeCallPermCallback(PluginCall call) {
        if (getPermissionState("phone") != PermissionState.GRANTED) {
            call.reject("Phone permission denied");
            return;
        }
        String number = call.getString("number");
        if (number == null || number.trim().isEmpty()) {
            call.reject("Missing number");
            return;
        }
        performCall(call, number.trim());
    }

    private void performCall(PluginCall call, String number) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("CALL_PHONE not granted");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_CALL);
            intent.setData(Uri.fromParts("tel", number, null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (SecurityException e) {
            call.reject("SecurityException: " + e.getMessage(), e);
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }
}
