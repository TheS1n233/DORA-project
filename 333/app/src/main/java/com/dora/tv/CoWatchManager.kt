// app/src/main/java/com/dora/tv/CoWatchManager.kt
// Co-Watch for legacy LiveKit Android SDK using reflection to bind onDataReceived (no Observer/Listener APIs)

package com.dora.tv

import android.content.Context
import android.net.Uri
import android.util.Log
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem
import io.livekit.android.room.Room
import io.livekit.android.room.participant.RemoteParticipant
import io.livekit.android.room.track.DataPublishReliability
import kotlin.jvm.functions.Function3
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.abs

class CoWatchManager(
    private val context: Context,
    private val room: Room,
    private val role: String,         // "leader" | "follower" (TV usually "follower")
    private val identity: String,
    private val roomName: String
) {
    private val TAG = "CoWatchManager"
    private val uiScope = CoroutineScope(Dispatchers.Main)
    private var player: ExoPlayer? = null
    private val rtts = mutableListOf<Long>()
    private val driftThresholdSec = 0.3

    // Keep a strong reference so it won't be GC'ed
    private var legacyDataHandler: Function3<RemoteParticipant?, ByteArray, String?, Unit>? = null

    fun attachPlayer(player: ExoPlayer) {
        this.player = player
    }

    fun start() {
        // 1) Try bind legacy onDataReceived via reflection (covers multiple old SDK variants)
        bindLegacyOnDataReceived()

        // 2) Periodic ping for RTT measurement (optional)
        uiScope.launch {
            while (true) {
                delay(5000)
                sendPing()
            }
        }
    }

    fun stop() {
        // NOTE: Many legacy SDKs didn't expose a clear way to remove handler.
        // We just drop our strong reference and release the player.
        legacyDataHandler = null
        player?.release()
        player = null
    }

    // ---------------- Legacy binder ----------------

    private fun bindLegacyOnDataReceived() {
        try {
            // Build handler object implementing Kotlin Function3<RemoteParticipant?, ByteArray, String?, Unit>
            val handler = object : Function3<RemoteParticipant?, ByteArray, String?, Unit> {
                override fun invoke(p1: RemoteParticipant?, p2: ByteArray, p3: String?): Unit {
                    handleIncomingData(p2)
                    return Unit
                }
            }
            legacyDataHandler = handler

            val roomClazz = room.javaClass

            // Prefer calling a setter method: setOnDataReceived(Function3)
            val setter = roomClazz.methods.firstOrNull { m ->
                m.name == "setOnDataReceived" &&
                m.parameterTypes.size == 1 &&
                // Parameter is a Kotlin Function (erased type is kotlin.jvm.functions.Function3)
                Function3::class.java.isAssignableFrom(m.parameterTypes[0])
            }

            if (setter != null) {
                setter.isAccessible = true
                setter.invoke(room, handler)
                Log.i(TAG, "Bound onDataReceived via setOnDataReceived(Function3)")
                return
            }

            // Fallback: try writable field/property named "onDataReceived"
            val field = runCatching { roomClazz.getDeclaredField("onDataReceived") }.getOrNull()
            if (field != null) {
                field.isAccessible = true
                // Some SDKs store it as nullable Function3
                field.set(room, handler)
                Log.i(TAG, "Bound onDataReceived via room.onDataReceived field")
                return
            }

            Log.w(TAG, "onDataReceived binding not found on this SDK. Co-watch sync via DataTrack disabled.")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to bind legacy onDataReceived: ${e.message}")
        }
    }

    // ---------------- Incoming data → JSON protocol ----------------

    private fun handleIncomingData(data: ByteArray) {
        try {
            val msgStr = String(data, Charsets.UTF_8)
            val json = JSONObject(msgStr)
            if (json.optString("t") != "cowatch") {
                return
            }
            val cmd = json.optString("cmd")
            val url = json.optString("url", "")
            val pos = json.optDouble("pos", 0.0).toFloat()
            val at = json.optLong("at", System.currentTimeMillis())

            when (cmd) {
                "LOAD" -> if (role == "follower" && url.isNotEmpty()) loadUrl(url, pos)
                "PLAY" -> if (role == "follower") playAt(pos, at)
                "PAUSE" -> if (role == "follower") pauseAt(pos)
                "SEEK" -> if (role == "follower") seekTo(pos)
                "PING" -> sendPong(json.optString("nonce", ""))
                "PONG" -> handlePong(at)
                "STOP" -> player?.pause()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse cowatch message: ${e.message}")
        }
    }

    // ---------------- Media sync helpers ----------------

    private fun loadUrl(url: String, pos: Float) {
        val p = player ?: return
        val item = MediaItem.fromUri(Uri.parse(url))
        p.setMediaItem(item)
        p.prepare()
        p.seekTo((pos * 1000).toLong())
        // Wait PLAY command to start
    }

    private fun playAt(leaderPos: Float, leaderAtMs: Long) {
        val p = player ?: return
        val elapsedSec = (System.currentTimeMillis() - leaderAtMs) / 1000.0
        val targetSec = (leaderPos + elapsedSec).toFloat()
        val currentSec = p.currentPosition / 1000.0
        if (abs(currentSec - targetSec) > driftThresholdSec) {
            p.seekTo((targetSec * 1000).toLong())
        }
        p.play()
    }

    private fun pauseAt(pos: Float) {
        val p = player ?: return
        p.pause()
        p.seekTo((pos * 1000).toLong())
    }

    private fun seekTo(pos: Float) {
        val p = player ?: return
        p.seekTo((pos * 1000).toLong())
    }

    // ---------------- Data channel senders (works on legacy SDKs) ----------------

    private fun sendPing() {
        uiScope.launch {
            try {
                val payload = JSONObject()
                    .put("t", "cowatch")
                    .put("v", 1)
                    .put("cmd", "PING")
                    .put("at", System.currentTimeMillis())
                    .put("nonce", java.util.UUID.randomUUID().toString())
                    .put("from", identity)
                    .put("room", roomName)
                    .toString()

                room.localParticipant.publishData(
                    payload.toByteArray(Charsets.UTF_8),
                    DataPublishReliability.RELIABLE
                )
            } catch (e: Exception) {
                Log.w(TAG, "sendPing failed: ${e.message}")
            }
        }
    }

    private fun sendPong(nonce: String) {
        uiScope.launch {
            try {
                val payload = JSONObject()
                    .put("t", "cowatch")
                    .put("v", 1)
                    .put("cmd", "PONG")
                    .put("at", System.currentTimeMillis())
                    .put("nonce", nonce)
                    .put("from", identity)
                    .put("room", roomName)
                    .toString()

                room.localParticipant.publishData(
                    payload.toByteArray(Charsets.UTF_8),
                    DataPublishReliability.LOSSY
                )
            } catch (e: Exception) {
                Log.w(TAG, "sendPong failed: ${e.message}")
            }
        }
    }

    private fun handlePong(sentAt: Long) {
        val rtt = System.currentTimeMillis() - sentAt
        rtts.add(rtt)
        if (rtts.size > 10) rtts.removeAt(0)
        val avg = rtts.average()
        Log.d(TAG, "Avg RTT: ${"%.1f".format(avg)} ms")
    }
}