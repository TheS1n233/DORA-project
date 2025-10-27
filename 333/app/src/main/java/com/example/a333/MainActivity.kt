package com.example.a333

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.SurfaceView
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import io.livekit.android.LiveKit
import io.livekit.android.room.Room
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var weekRv: RecyclerView
    private lateinit var monthTitle: TextView
    private val handler = Handler(Looper.getMainLooper())
    private val elderId = "elder-001" // elder ID; in production load from config/login
    private var callCheckRunnable: Runnable? = null

    // LiveKit room management
    private lateinit var room: Room
    private var isInCall = false
    private val coroutineScope = CoroutineScope(Dispatchers.Main)
    private var currentCallDialog: AlertDialog? = null // current incoming-call dialog
    private var lastProcessedCallId: String? = null // last handled call id
    private var currentRoomId: String? = null // current room id for end notification

    // Video views
    private lateinit var videoCallContainer: FrameLayout
    private lateinit var remoteVideoView: SurfaceView
    private lateinit var localVideoView: SurfaceView
    private lateinit var callStatusText: TextView
    private lateinit var btnMute: Button
    private lateinit var btnCamera: Button

    // In-call status polling task
    private var callStatusPollingRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize LiveKit and create Room correctly
        // ✅ Correct way: create Room with proper LiveKit API
        room = LiveKit.create(applicationContext)

        weekRv = findViewById(R.id.weekRecycler)
        monthTitle = findViewById(R.id.tvMonthTitle)

        // Initialize video views
        videoCallContainer = findViewById<FrameLayout>(R.id.videoCallContainer)
        remoteVideoView = findViewById<SurfaceView>(R.id.remoteVideoView)
        localVideoView = findViewById<SurfaceView>(R.id.localVideoView)
        callStatusText = findViewById<TextView>(R.id.callStatusText)
        btnMute = findViewById<Button>(R.id.btnMute)
        btnCamera = findViewById<Button>(R.id.btnCamera)

        weekRv.layoutManager = GridLayoutManager(this, 7, RecyclerView.VERTICAL, false)

        val today = Calendar.getInstance()
        monthTitle.text = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(today.time)

        weekRv.adapter = WeekAdapter(buildWeek(today)) { /* on day clicked - keep empty */ }

        // Bind layout buttons
        findViewById<Button>(R.id.btnStartCall)?.setOnClickListener {
            requestLiveKitToken()
        }

        findViewById<Button>(R.id.btnEndCall)?.setOnClickListener {
            endCall()
        }

        // Test: manual pending-call check
        findViewById<Button>(R.id.btnTestCall)?.setOnClickListener {
            Log.i("DORA/TV", "🧪 Trigger pending-call check manually")
            Toast.makeText(this, "Checking calls...", Toast.LENGTH_SHORT).show()
            checkPendingCalls()
        }

        // Simple controls
        btnMute.setOnClickListener {
            Toast.makeText(this, "Mute is not implemented", Toast.LENGTH_SHORT).show()
        }

        btnCamera.setOnClickListener {
            Toast.makeText(this, "Camera control is not implemented", Toast.LENGTH_SHORT).show()
        }

        // Start polling incoming calls
        startCallCheck()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCallCheck()
        stopInCallStatusPolling() // stop in-call polling
        // Clean up LiveKit resources
        if (isInCall) {
            endCall()
        }
    }

    // Build a week list starting from Monday
    private fun buildWeek(ref: Calendar): MutableList<Day> {
        val start = ref.clone() as Calendar
        start.firstDayOfWeek = Calendar.MONDAY
        val diff = (7 + (start.get(Calendar.DAY_OF_WEEK) - Calendar.MONDAY)) % 7
        start.add(Calendar.DAY_OF_MONTH, -diff)

        val list = mutableListOf<Day>()
        repeat(7) {
            val c = start.clone() as Calendar
            val now = Calendar.getInstance()
            val isToday = now.get(Calendar.YEAR) == c.get(Calendar.YEAR) &&
                    now.get(Calendar.DAY_OF_YEAR) == c.get(Calendar.DAY_OF_YEAR)
            list += Day(c, isToday)
            start.add(Calendar.DAY_OF_MONTH, 1)
        }
        return list
    }

    // Request a token from tele-assist-svc and connect to LiveKit room
    private fun requestLiveKitToken(roomId: String = "dora-demo") {
        val url =
            "http://10.0.2.2:8300/tele/livekit/token?room=$roomId&identity=tv-333&role=participant"

        Log.i("DORA/TV", "Requesting LiveKit token from: $url")

        Thread {
            try {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 10000
                    readTimeout = 10000
                }
                val code = conn.responseCode
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                conn.disconnect()

                Log.i("DORA/TV", "Token API response - Code: $code, Body: $body")

                if (code == 200) {
                    val tokenData = JSONObject(body)
                    val livekitUrl = tokenData.getString("url")
                    val token = tokenData.getString("token")

                    Log.i("DORA/TV", "Token received - URL: $livekitUrl, Token: ${token.take(20)}...")

                    // ✅ Only map localhost/127.0.0.1 to Android emulator gateway.
                    // ❌ Do NOT force replace cloud wss URL to local ws.
                    val fixedUrl = livekitUrl
                        .replace("127.0.0.1", "10.0.2.2")
                        .replace("localhost", "10.0.2.2")

                    Log.i("DORA/TV", "Fixed URL for Android: $fixedUrl")

                    runOnUiThread {
                        Toast.makeText(this, "Connecting call...", Toast.LENGTH_SHORT).show()
                        connectToLiveKitRoom(fixedUrl, token)
                    }
                } else {
                    Log.e("DORA/TV", "Token request failed with code: $code")
                    runOnUiThread {
                        Toast.makeText(this, "Token request failed: $code", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "Token request error", e)
                runOnUiThread {
                    Toast.makeText(this, "Request failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }

    // Connect to LiveKit room for voice call
    private fun connectToLiveKitRoom(url: String, token: String) {
        try {
            isInCall = true
            // ❌ Do not create Room() directly
            // room = Room()  // <-- remove this
            // ✅ Use the Room created in onCreate()

            coroutineScope.launch {
                try {
                    Log.i("DORA/TV", "Attempting to connect to LiveKit room...")

                    // disconnect previous connection if any
                    try {
                        Log.i("DORA/TV", "Disconnecting from previous room...")
                        room.disconnect()
                        kotlinx.coroutines.delay(1000)
                    } catch (e: Exception) {
                        Log.i("DORA/TV", "No previous connection to disconnect: ${e.message}")
                    }

                    // connect
                    room.connect(url, token)

                    Log.i("DORA/TV", "✅ Connected to LiveKit room successfully")

                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "✅ Connected", Toast.LENGTH_SHORT).show()
                        videoCallContainer.visibility = View.VISIBLE
                        callStatusText.text = "Connected — waiting for remote video..."

                        try {
                            room.localParticipant.setMicrophoneEnabled(true)
                            coroutineScope.launch {
                                try {
                                    room.localParticipant.setCameraEnabled(true)
                                    Log.i("DORA/TV", "Microphone and camera enabled")
                                    setupVideoRendering()
                                } catch (e: Exception) {
                                    Log.e("DORA/TV", "Failed to enable microphone/camera", e)
                                }
                            }
                        } catch (e: Exception) {
                            Log.e("DORA/TV", "Failed to enable microphone", e)
                        }

                        // start polling in-call status, so admin hangup is detected
                        startInCallStatusPolling()
                    }

                } catch (e: Exception) {
                    Log.e("DORA/TV", "LiveKit connection error", e)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "Connection failed: ${e.message}", Toast.LENGTH_LONG).show()
                        isInCall = false
                        findViewById<Button>(R.id.btnEndCall)?.visibility = View.GONE
                    }
                }
            }

        } catch (e: Exception) {
            Log.e("DORA/TV", "LiveKit connection setup error", e)
            runOnUiThread {
                Toast.makeText(this, "Setup failed: ${e.message}", Toast.LENGTH_LONG).show()
                isInCall = false
                findViewById<Button>(R.id.btnEndCall)?.visibility = View.GONE
            }
        }
    }

    // Setup video rendering for LiveKit
    private fun setupVideoRendering() {
        try {
            Log.i("DORA/TV", "Setting up video rendering...")
            runOnUiThread {
                Toast.makeText(this@MainActivity, "Video connected", Toast.LENGTH_SHORT).show()
            }
            startHangupDetection()
            Log.i("DORA/TV", "Video rendering setup completed")
        } catch (e: Exception) {
            Log.e("DORA/TV", "Failed to setup video rendering", e)
        }
    }

    // Hangup detection using LiveKit room state
    private fun startHangupDetection() {
        val hangupCheckRunnable = object : Runnable {
            override fun run() {
                if (isInCall && ::room.isInitialized) {
                    try {
                        when (room.state) {
                            Room.State.DISCONNECTED -> {
                                Log.i("DORA/TV", "Room disconnected")
                                runOnUiThread {
                                    Toast.makeText(this@MainActivity, "Remote hung up", Toast.LENGTH_SHORT).show()
                                    endCall()
                                }
                                return
                            }
                            Room.State.CONNECTED -> {
                                val participants = room.remoteParticipants
                                if (participants.isEmpty()) {
                                    Log.i("DORA/TV", "Remote participant left")
                                    runOnUiThread {
                                        Toast.makeText(this@MainActivity, "Remote hung up", Toast.LENGTH_SHORT).show()
                                        endCall()
                                    }
                                    return
                                }
                                Log.d("DORA/TV", "Room OK, participants: ${participants.size}")
                            }
                            else -> {
                                Log.d("DORA/TV", "Room state: ${room.state}")
                            }
                        }
                        handler.postDelayed(this, 2000)
                    } catch (e: Exception) {
                        Log.e("DORA/TV", "Hangup detection error: ${e.message}")
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "Connection error", Toast.LENGTH_SHORT).show()
                            endCall()
                        }
                    }
                }
            }
        }
        handler.post(hangupCheckRunnable)
    }

    // Start polling in-call status (server), detect admin hangup
    private fun startInCallStatusPolling() {
        if (callStatusPollingRunnable != null) return
        callStatusPollingRunnable = object : Runnable {
            override fun run() {
                val roomId = currentRoomId
                if (!isInCall || roomId == null) {
                    stopInCallStatusPolling()
                    return
                }
                coroutineScope.launch(Dispatchers.IO) {
                    var shouldContinue = true
                    try {
                        val url = "http://10.0.2.2:8300/api/calls/status/$roomId"
                        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                            requestMethod = "GET"
                            connectTimeout = 5000
                            readTimeout = 5000
                        }
                        val code = conn.responseCode
                        val body = try {
                            conn.inputStream.bufferedReader().use { it.readText() }
                        } catch (e: Exception) {
                            ""
                        }
                        conn.disconnect()
                        Log.d("DORA/TV", "Call status check: code=$code, body=$body")
                        if (code == 200 && body.isNotEmpty()) {
                            try {
                                val obj = JSONObject(body)
                                val status = obj.optString("status", "")
                                if (status.equals("ended", ignoreCase = true)) {
                                    shouldContinue = false
                                    withContext(Dispatchers.Main) {
                                        Toast.makeText(this@MainActivity, "Remote hung up", Toast.LENGTH_SHORT).show()
                                        endCall()
                                    }
                                }
                            } catch (e: Exception) {
                                Log.e("DORA/TV", "Parse call status error: ${e.message}")
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("DORA/TV", "Call status polling error: ${e.message}")
                    } finally {
                        withContext(Dispatchers.Main) {
                            if (shouldContinue && isInCall) {
                                callStatusPollingRunnable?.let { handler.postDelayed(it, 3000) }
                            }
                        }
                    }
                }
            }
        }
        callStatusPollingRunnable?.let { handler.post(it) }
    }

    private fun stopInCallStatusPolling() {
        callStatusPollingRunnable?.let { handler.removeCallbacks(it) }
        callStatusPollingRunnable = null
    }

    // End the call
    private fun endCall() {
        try {
            coroutineScope.launch {
                try {
                    room.disconnect()
                    Log.i("DORA/TV", "Call ended successfully")
                    notifyServerCallEnded()
                } catch (e: Exception) {
                    Log.e("DORA/TV", "Error disconnecting from room", e)
                }

                withContext(Dispatchers.Main) {
                    isInCall = false
                    stopInCallStatusPolling()
                    findViewById<Button>(R.id.btnEndCall)?.visibility = View.GONE
                    videoCallContainer.visibility = View.GONE
                    Toast.makeText(this@MainActivity, "Call ended", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            Log.e("DORA/TV", "Error ending call", e)
            Toast.makeText(this, "Hangup failed: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    // Notify server that call ended
    private fun notifyServerCallEnded() {
        Thread {
            try {
                val roomId = currentRoomId
                Log.i("DORA/TV", "Notify server call ended, room: $roomId")

                if (roomId != null) {
                    val url = "http://10.0.2.2:8300/api/calls/end"
                    val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json")
                    }

                    val requestBody = "{\"room_id\":\"$roomId\"}"
                    conn.outputStream.use { os ->
                        os.write(requestBody.toByteArray())
                    }

                    val code = conn.responseCode
                    val body = if (code >= 200 && code < 300) {
                        conn.inputStream.bufferedReader().readText()
                    } else {
                        conn.errorStream.bufferedReader().readText()
                    }

                    Log.i("DORA/TV", "Server notified - Code: $code, Body: $body")
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "Notify server failed", e)
            }
        }.start()
    }

    // Start polling incoming calls
    private fun startCallCheck() {
        Log.i("DORA/TV", "🚀 Start polling pending calls")
        Toast.makeText(this, "Pending-call check started", Toast.LENGTH_SHORT).show()
        callCheckRunnable = object : Runnable {
            override fun run() {
                checkPendingCalls()
                handler.postDelayed(this, 5000)
            }
        }
        handler.post(callCheckRunnable!!)
    }

    private fun stopCallCheck() {
        callCheckRunnable?.let { handler.removeCallbacks(it) }
    }

    // Check pending calls
    private fun checkPendingCalls() {
        Thread {
            try {
                val url = "http://10.0.2.2:8300/api/calls/elder/pending-calls/$elderId"
                Log.i("DORA/TV", "🔍 Checking pending calls: $url")

                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 5000
                    readTimeout = 5000
                }
                val code = conn.responseCode
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                conn.disconnect()

                Log.i("DORA/TV", "📡 Pending calls - code: $code, body: $body")

                if (code == 200 && body.isNotEmpty() && body != "[]") {
                    val jsonArray = org.json.JSONArray(body)
                    if (jsonArray.length() > 0) {
                        val call = jsonArray.getJSONObject(0)
                        val callId = call.optString("room_id", "")

                        if (callId != lastProcessedCallId) {
                            Log.i("DORA/TV", "📞 New admin call: $call")
                            lastProcessedCallId = callId
                            currentRoomId = callId
                            runOnUiThread {
                                showCallNotification(call)
                            }
                        } else {
                            Log.d("DORA/TV", "Call already processed: $callId")
                        }
                    } else {
                        Log.d("DORA/TV", "No pending calls")
                        lastProcessedCallId = null
                    }
                } else {
                    Log.d("DORA/TV", "No calls or error: $code")
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "Error checking calls", e)
            }
        }.start()
    }

    // Show incoming call dialog
    private fun showCallNotification(call: JSONObject) {
        val message = call.optString("message", "Caregiver would like to talk with you")
        val roomId = call.optString("room_id", "")

        currentCallDialog?.dismiss()
        currentCallDialog = null

        currentCallDialog = AlertDialog.Builder(this)
            .setTitle("📞 Incoming call")
            .setMessage("Caregiver wants to talk with you\n\nMessage: $message")
            .setPositiveButton("✅ Answer") { _, _ ->
                currentCallDialog?.dismiss()
                currentCallDialog = null
                answerCall(roomId, "accept")
            }
            .setNegativeButton("❌ Decline") { _, _ ->
                currentCallDialog?.dismiss()
                currentCallDialog = null
                answerCall(roomId, "decline")
            }
            .setCancelable(false)
            .setOnDismissListener {
                Log.i("DORA/TV", "Incoming-call dialog dismissed")
                currentCallDialog = null
            }
            .create()

        currentCallDialog?.show()
    }

    // Answer/decline
    private fun answerCall(roomId: String, action: String) {
        Thread {
            try {
                val url = "http://10.0.2.2:8300/api/calls/answer"
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    connectTimeout = 5000
                    readTimeout = 5000
                }

                val requestBody = JSONObject().apply {
                    put("room_id", roomId)
                    put("user_id", elderId)
                    put("action", action)
                }

                conn.outputStream.use { it.write(requestBody.toString().toByteArray()) }

                val code = conn.responseCode
                val body = if (code >= 200 && code < 300) {
                    conn.inputStream.bufferedReader().use { it.readText() }
                } else {
                    conn.errorStream.bufferedReader().use { it.readText() }
                }
                conn.disconnect()

                Log.i("DORA/TV", "answer call code=$code body=$body")

                runOnUiThread {
                    if (code >= 200 && code < 300) {
                        if (action == "accept") {
                            Toast.makeText(this, "Connecting call...", Toast.LENGTH_SHORT).show()
                            currentRoomId = roomId
                            requestLiveKitToken(roomId)
                        } else {
                            Toast.makeText(this, "Call declined", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(this, "Operation failed: HTTP $code - $body", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "answer call error", e)
                runOnUiThread {
                    Toast.makeText(this, "Operation failed: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }.start()
    }
}

