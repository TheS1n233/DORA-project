package com.example.a333

import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.SurfaceView
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.speech.SpeechRecognizer
import android.speech.RecognizerIntent
import android.speech.RecognitionListener
import android.Manifest
import android.content.pm.PackageManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationCompat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.AudioFormat
import android.speech.tts.TextToSpeech
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.SpeechService
import org.vosk.android.StorageService
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import io.livekit.android.LiveKit
import io.livekit.android.room.Room
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.ui.PlayerView
import com.dora.tv.CoWatchManager

@Suppress("DEPRECATION") // ExoPlayer API deprecation - waiting for library update
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

    // Call admin UI elements
    private lateinit var btnCallAdmin: Button
    private lateinit var btnCancelCall: Button
    private lateinit var emergencyCallStatusText: TextView
    private lateinit var btnTestVoice: Button
    private lateinit var testVoiceResult: TextView
    private lateinit var testVoiceAudioLevel: TextView
    private lateinit var testVoiceAudioProgress: ProgressBar

    // Call admin state
    private var isCallingAdmin = false
    private var callAdminRoomId: String? = null

    // In-call status polling task
    private var callStatusPollingRunnable: Runnable? = null

    // Co-Watch media player
    private var exoPlayer: ExoPlayer? = null
    private var coWatchManager: CoWatchManager? = null

    // Voice dial
    private var speechRecognizer: SpeechRecognizer? = null
    private var speechIntent: android.content.Intent? = null
    private val REQ_REC_AUDIO = 101
    private var voiceAwaitCommand: Boolean = false
    private var voiceErrorCount = 0
    private var lastVoiceErrorTime = 0L
    private var voiceRecognitionEnabled = true
    private var voiceCommandTimeoutRunnable: Runnable? = null // Timeout to reset voiceAwaitCommand

    // NEW: keep wake listening state and avoid double-start
    private var isWakeListening: Boolean = false

    // NEW: force offline recognition if network is flaky
    private var forceOfflineVoice: Boolean = true

    // NEW: use Vosk offline path when Google offline pack is unavailable
    private var useVoskOffline: Boolean = true

    // NEW: Vosk offline ASR members
    private var voskModel: Model? = null
    private var voskService: SpeechService? = null
    private val voskSampleRate: Float = 16000.0f

    // NEW: flag to prevent duplicate loading
    private var isVoskLoading: Boolean = false

    // NEW: lightweight voice overlay UI
    private var voiceOverlay: android.widget.FrameLayout? = null
    private var voiceOverlayText: android.widget.TextView? = null
    private var voiceOverlayShown: Boolean = false
    private var voiceBlurBackground: android.view.View? = null
    private var voiceRecognizedText: android.widget.TextView? = null

    // Text-to-Speech for voice feedback
    private var textToSpeech: TextToSpeech? = null

    // --- Health Dashboard UI elements ---
    private lateinit var cardHealthMetrics: LinearLayout
    private lateinit var cardBloodPressure: LinearLayout
    private lateinit var cardEnvironmental: LinearLayout
    
    // Health Metrics TextViews
    private lateinit var tvBodyTemperature: TextView
    private lateinit var tvHeartRate: TextView
    private lateinit var tvSpO2: TextView
    private lateinit var tvGlucose: TextView
    private lateinit var tvHRV: TextView
    private lateinit var tvEDA: TextView
    private lateinit var tvSleepScore: TextView
    private lateinit var tvStepsToday: TextView
    
    // Blood Pressure TextViews
    private lateinit var tvSystolic: TextView
    private lateinit var tvDiastolic: TextView
    private lateinit var tvPulse: TextView
    
    // Environmental TextViews
    private lateinit var tvIndoorTemperature: TextView
    private lateinit var tvIndoorHumidity: TextView
    private lateinit var tvGasConcentration: TextView

    // --- Health Dashboard Data Structures ---
    enum class Status {
        NORMAL, LOW, HIGH
    }

    data class Thresholds(
        val warnLow: Double? = null,
        val critLow: Double? = null,
        val warnHigh: Double? = null,
        val critHigh: Double? = null
    )

    data class HealthMetric(
        val id: Int, // TextView ID
        val name: String,
        val value: Double,
        val unit: String,
        val thresholds: Thresholds? = null
    )

    // Static hardcoded data (as per requirement)
    private val healthMetricsData = listOf(
        HealthMetric(R.id.tvBodyTemperature, "Body Temperature", 38.2, "°C", Thresholds(warnLow = 36.0, critLow = 35.0, warnHigh = 37.5, critHigh = 39.0)), // Warning
        HealthMetric(R.id.tvHeartRate, "Heart Rate", 105.0, "bpm", Thresholds(warnLow = 60.0, critLow = 40.0, warnHigh = 100.0, critHigh = 120.0)), // Warning
        HealthMetric(R.id.tvSpO2, "SpO2", 91.0, "%", Thresholds(warnLow = 95.0, critLow = 90.0, warnHigh = 100.0)), // Critical
        HealthMetric(R.id.tvGlucose, "Glucose", 6.5, "mmol/L", Thresholds(warnLow = 3.9, critLow = 2.8, warnHigh = 7.8, critHigh = 11.1)), // Normal
        HealthMetric(R.id.tvHRV, "HRV", 50.0, "ms", Thresholds(warnLow = 40.0, warnHigh = 80.0)), // Normal
        HealthMetric(R.id.tvEDA, "EDA", 0.8, "µS", Thresholds(warnHigh = 1.0)), // Normal
        HealthMetric(R.id.tvSleepScore, "Sleep Score", 70.0, "/100", Thresholds(warnLow = 60.0, critLow = 40.0)), // Normal
        HealthMetric(R.id.tvStepsToday, "Steps Today", 2500.0, "steps", Thresholds(warnLow = 3000.0)) // Warning
    )

    private val bloodPressureData = listOf(
        HealthMetric(R.id.tvSystolic, "Systolic", 145.0, "mmHg", Thresholds(warnLow = 90.0, critLow = 70.0, warnHigh = 140.0, critHigh = 160.0)), // Warning
        HealthMetric(R.id.tvDiastolic, "Diastolic", 95.0, "mmHg", Thresholds(warnLow = 60.0, critLow = 40.0, warnHigh = 90.0, critHigh = 100.0)), // Warning
        HealthMetric(R.id.tvPulse, "Pulse", 80.0, "bpm", Thresholds(warnLow = 60.0, critLow = 40.0, warnHigh = 100.0, critHigh = 120.0)) // Normal
    )

    private val environmentalData = listOf(
        HealthMetric(R.id.tvIndoorTemperature, "Indoor Temperature", 28.0, "°C", Thresholds(warnLow = 18.0, warnHigh = 26.0)), // Warning
        HealthMetric(R.id.tvIndoorHumidity, "Indoor Humidity", 75.0, "%", Thresholds(warnLow = 30.0, warnHigh = 70.0)), // Warning
        HealthMetric(R.id.tvGasConcentration, "Gas Concentration", 100.0, "ppm", Thresholds(critHigh = 50.0)) // Critical
    )

    // Evaluate status based on value and thresholds
    // Returns HIGH if value exceeds high threshold, LOW if below low threshold, NORMAL otherwise
    private fun evalStatus(value: Double, thresholds: Thresholds?): Status {
        if (thresholds == null) return Status.NORMAL

        // Check critical thresholds first (more severe)
        thresholds.critLow?.let { if (value < it) return Status.LOW }
        thresholds.critHigh?.let { if (value > it) return Status.HIGH }
        // Check warning thresholds
        thresholds.warnLow?.let { if (value < it) return Status.LOW }
        thresholds.warnHigh?.let { if (value > it) return Status.HIGH }

        return Status.NORMAL
    }

    // Initialize CoWatch manager only when needed for media sync
    private fun initializeCoWatchIfNeeded() {
        if (coWatchManager == null && exoPlayer != null) {
            val identity = elderId
            val roomName = "room-dora"
            coWatchManager = CoWatchManager(this, room, "follower", identity, roomName)
            coWatchManager?.attachPlayer(exoPlayer!!)
            coWatchManager?.start()
            Log.i("DORA/TV", "✅ CoWatch manager initialized for media sync")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize LiveKit and create Room correctly
        // ✅ Correct way: create Room with proper LiveKit API
        room = LiveKit.create(applicationContext)

        // Initialize ExoPlayer for Co-Watch media playback (but don't start CoWatch yet)
        @Suppress("DEPRECATION") // ExoPlayer.Builder deprecation
        val playerBuilder = ExoPlayer.Builder(this)
        exoPlayer = playerBuilder.build()
        val playerView = findViewById<PlayerView>(R.id.player_view)
        @Suppress("DEPRECATION") // PlayerView.player deprecation
        val player = exoPlayer
        playerView?.player = player

        // CoWatch manager will be initialized only when needed for media sync
        // Don't start it here to avoid interfering with voice calls

        weekRv = findViewById(R.id.weekRecycler)
        monthTitle = findViewById(R.id.tvMonthTitle)

        // Initialize video views
        videoCallContainer = findViewById<FrameLayout>(R.id.videoCallContainer)
        remoteVideoView = findViewById<SurfaceView>(R.id.remoteVideoView)
        localVideoView = findViewById<SurfaceView>(R.id.localVideoView)
        callStatusText = findViewById<TextView>(R.id.callStatusText)
        btnMute = findViewById<Button>(R.id.btnMute)
        btnCamera = findViewById<Button>(R.id.btnCamera)

        // Initialize call admin UI elements
        btnCallAdmin = findViewById<Button>(R.id.btnCallAdmin)
        btnCancelCall = findViewById<Button>(R.id.btnCancelCall)
        emergencyCallStatusText = findViewById<TextView>(R.id.emergencyCallStatusText)
        btnTestVoice = findViewById<Button>(R.id.btnTestVoice)
        testVoiceResult = findViewById<TextView>(R.id.testVoiceResult)
        testVoiceAudioLevel = findViewById<TextView>(R.id.testVoiceAudioLevel)
        testVoiceAudioProgress = findViewById<ProgressBar>(R.id.testVoiceAudioProgress)

        weekRv.layoutManager = GridLayoutManager(this, 7, RecyclerView.VERTICAL, false)

        val today = Calendar.getInstance()
        monthTitle.text = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(today.time)

        weekRv.adapter = WeekAdapter(buildWeek(today)) { /* on day clicked - keep empty */ }

        // Call admin button
        btnCallAdmin.setOnClickListener {
            callAdmin()
        }

        // Test voice button - HIDDEN (automatic listening enabled)
        btnTestVoice.visibility = View.GONE
        testVoiceResult.visibility = View.GONE
        testVoiceAudioLevel.visibility = View.GONE
        testVoiceAudioProgress.visibility = View.GONE

        // Cancel call button
        btnCancelCall.setOnClickListener {
            cancelCallToAdmin()
        }

        // Simple controls
        btnMute.setOnClickListener {
            Toast.makeText(this, "Mute is not implemented", Toast.LENGTH_SHORT).show()
        }

        // Long press to start voice dial
        btnMute.setOnLongClickListener {
            startVoiceWake()
            true
        }

        btnCamera.setOnClickListener {
            Toast.makeText(this, "Camera control is not implemented", Toast.LENGTH_SHORT).show()
        }

        // Start polling incoming calls
        startCallCheck()

        // Initialize Text-to-Speech for voice feedback
        initTextToSpeech()

        // Start always-on voice wake word listening ("hi dora")
        // DISABLED: Auto voice recognition disabled
        // startVoiceWake()
        
        // Initialize Health Dashboard UI elements
        cardHealthMetrics = findViewById(R.id.cardHealthMetrics)
        cardBloodPressure = findViewById(R.id.cardBloodPressure)
        cardEnvironmental = findViewById(R.id.cardEnvironmental)
        
        tvBodyTemperature = findViewById(R.id.tvBodyTemperature)
        tvHeartRate = findViewById(R.id.tvHeartRate)
        tvSpO2 = findViewById(R.id.tvSpO2)
        tvGlucose = findViewById(R.id.tvGlucose)
        tvHRV = findViewById(R.id.tvHRV)
        tvEDA = findViewById(R.id.tvEDA)
        tvSleepScore = findViewById(R.id.tvSleepScore)
        tvStepsToday = findViewById(R.id.tvStepsToday)
        
        tvSystolic = findViewById(R.id.tvSystolic)
        tvDiastolic = findViewById(R.id.tvDiastolic)
        tvPulse = findViewById(R.id.tvPulse)
        
        tvIndoorTemperature = findViewById(R.id.tvIndoorTemperature)
        tvIndoorHumidity = findViewById(R.id.tvIndoorHumidity)
        tvGasConcentration = findViewById(R.id.tvGasConcentration)
        
        // Update dashboard with initial data
        updateDashboardUI()
    }

    // NEW: start/stop wake listening with Activity lifecycle
    override fun onStart() {
        super.onStart()
        // Always use Vosk for silent continuous listening (no beep sounds)
        startVoskWake()
    }

    override fun onStop() {
        super.onStop()
        // Stop Vosk listening when app goes to background
        stopVoskWake()
        // Reset voice command state
        voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
        voiceCommandTimeoutRunnable = null
        voiceAwaitCommand = false
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCallCheck()
        stopInCallStatusPolling() // stop in-call polling
        // Clean up LiveKit resources
        if (isInCall) {
            endCall()
        }
        // Clean up CoWatch and ExoPlayer
        coWatchManager?.stop()
        exoPlayer?.release()

        // Clean up TTS
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null

        // Clean up voice command timeout
        voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
        voiceCommandTimeoutRunnable = null
        voiceAwaitCommand = false

        // release speech recognizer
        destroySpeech()
        stopVoskWake()
        try { voskModel?.close() } catch (_: Exception) {}
        voskModel = null
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
                            // Enable microphone and camera for voice/video call
                            room.localParticipant.setMicrophoneEnabled(true)
                                    room.localParticipant.setCameraEnabled(true)
                            Log.i("DORA/TV", "✅ Microphone and camera enabled for voice call")
                                    setupVideoRendering()
                                } catch (e: Exception) {
                                    Log.e("DORA/TV", "Failed to enable microphone/camera", e)
                        }

                        // start polling in-call status, so admin hangup is detected
                        startInCallStatusPolling()
                        
                        // Reset call admin state when LiveKit connection is established
                        if (isCallingAdmin) {
                            resetCallAdminState()
                        }
                    }

                } catch (e: Exception) {
                    Log.e("DORA/TV", "LiveKit connection error", e)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "Connection failed: ${e.message}", Toast.LENGTH_LONG).show()
                        isInCall = false
                        // btnEndCall removed - use Cancel Call button instead
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

    // ==================== Voice Wake Word: "hi dora" ====================
    private fun ensureAudioPermission(): Boolean {
        return if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            true
        } else {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQ_REC_AUDIO)
            false
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            REQ_REC_AUDIO -> {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    Log.i("DORA/TV", "✅ Microphone permission granted")
                    Toast.makeText(this, "✅ Microphone permission granted", Toast.LENGTH_SHORT).show()
                } else {
                    Log.w("DORA/TV", "❌ Microphone permission denied")
                    Toast.makeText(this, "❌ Microphone permission denied. Please grant permission in Settings", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    // Check if microphone hardware is available and working
    private fun checkMicrophoneHardware(): String {
        val status = StringBuilder()
        
        // Check permission first
        val hasPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        status.append("Permission: ${if (hasPermission) "GRANTED ✓" else "DENIED ✗"}\n")
        
        if (!hasPermission) {
            status.append("→ Please grant microphone permission\n")
            return status.toString()
        }
        
        // Try to create AudioRecord to test hardware
        var audioRecord: AudioRecord? = null
        try {
            val sampleRate = 44100
            val channelConfig = AudioFormat.CHANNEL_IN_MONO
            val audioFormat = AudioFormat.ENCODING_PCM_16BIT
            val bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
            
            if (bufferSize == AudioRecord.ERROR_BAD_VALUE || bufferSize == AudioRecord.ERROR) {
                status.append("Hardware: UNAVAILABLE ✗\n")
                status.append("→ AudioRecord initialization failed\n")
                return status.toString()
            }
            
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                sampleRate,
                channelConfig,
                audioFormat,
                bufferSize
            )
            
            if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
                status.append("Hardware: NOT INITIALIZED ✗\n")
                status.append("→ AudioRecord state: ${audioRecord.state}\n")
                status.append("→ Possible causes:\n")
                status.append("  • Microphone not configured in emulator\n")
                status.append("  • Another app using microphone\n")
                return status.toString()
            }
            
            // Try to start recording briefly
            audioRecord.startRecording()
            val buffer = ByteArray(bufferSize)
            val readResult = audioRecord.read(buffer, 0, bufferSize)
            
            if (readResult < 0) {
                status.append("Hardware: READ ERROR ✗\n")
                status.append("→ Read result: $readResult\n")
            } else {
                status.append("Hardware: AVAILABLE ✓\n")
                status.append("→ Buffer size: $bufferSize bytes\n")
                status.append("→ Read: $readResult bytes\n")
            }
            
            audioRecord.stop()
            audioRecord.release()
            
        } catch (e: Exception) {
            status.append("Hardware: ERROR ✗\n")
            status.append("→ Exception: ${e.message}\n")
            status.append("→ Type: ${e.javaClass.simpleName}\n")
        } finally {
            try {
                audioRecord?.release()
            } catch (e: Exception) {
                // Ignore
            }
        }
        
        return status.toString()
    }

    private fun initSpeechIfNeeded() {
        if (speechRecognizer != null) return

        // Check platform availability first
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            Log.w("DORA/TV", "❌ Speech recognition service not available on this device")
            Toast.makeText(this, "❌ Speech recognition service not available", Toast.LENGTH_LONG).show()
            return
        }

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)

        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                Log.d("DORA/TV", "✅ Ready for speech")
                runOnUiThread { Toast.makeText(this@MainActivity, "🎤 Ready...", Toast.LENGTH_SHORT).show() }
            }
            override fun onBeginningOfSpeech() {
                Log.d("DORA/TV", "🎤 Speech detected")
            }
            override fun onRmsChanged(rmsdB: Float) {
                // Optional: update UI meter if needed
            }
            override fun onBufferReceived(buffer: ByteArray?) {
                Log.d("DORA/TV", "📊 Audio buffer received (${buffer?.size ?: 0} bytes)")
            }
            override fun onEndOfSpeech() {
                Log.d("DORA/TV", "🔇 Speech ended")
            }
            override fun onError(error: Int) {
                val errorMsg = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio error"
                    SpeechRecognizer.ERROR_CLIENT -> "Client error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "No mic permission"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No match"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                    SpeechRecognizer.ERROR_SERVER -> "Server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout"
                    13 -> "Too many requests"
                    else -> "Unknown error ($error)"
                }
                Log.w("DORA/TV", "Recognition error: $errorMsg (error=$error)")
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "⚠️ $errorMsg", Toast.LENGTH_SHORT).show()
                }

                // Auto-restart policy (continuous wake listening)
                when (error) {
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                        // Do not restart; user must grant permission
                        isWakeListening = false
                    }
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> {
                        // Cancel then restart after short backoff
                        try { speechRecognizer?.cancel() } catch (_: Exception) {}
                        restartWakeListening(900)
                    }
                    else -> {
                        restartWakeListening(700)
                    }
                }
            }
            override fun onResults(results: Bundle) {
                val list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: return
                val text = list.joinToString(" ").lowercase()
                Log.i("DORA/TV", "Voice results: $text")
                Toast.makeText(this@MainActivity, "🎤 Recognized: $text", Toast.LENGTH_LONG).show()

                fun parseCommand(cmd: String) {
                    // Supported commands:
                    // - call admin
                    // - call <name>
                    if (cmd.contains("call admin")) {
                        Toast.makeText(this@MainActivity, "Calling caregiver...", Toast.LENGTH_SHORT).show()
                        callAdmin()
                        voiceAwaitCommand = false
                        return
                    }
                    val m = Regex("call\\s+([a-zA-Z\\.\\-\\s]+)").find(cmd)
                    if (m != null) {
                        val who = m.groupValues.getOrNull(1)?.trim().orEmpty()
                        if (who.isNotEmpty()) {
                            Toast.makeText(this@MainActivity, "Voice: call $who (not implemented)", Toast.LENGTH_LONG).show()
                            voiceAwaitCommand = false
                            return
                        }
                    }
                    Toast.makeText(this@MainActivity, "Say: 'call admin' or 'call <name>'", Toast.LENGTH_SHORT).show()
                    voiceAwaitCommand = true
                }

                val woke = text.contains("hi dora") || text.contains("hey dora") || text.contains("hi, dora") || text.contains("hey, dora")
                if (voiceAwaitCommand) {
                    parseCommand(text)
                } else if (woke) {
                    val afterWake = text.replace("hey dora", "")
                        .replace("hi dora", "")
                        .replace("hey, dora", "")
                        .replace("hi, dora", "")
                        .trim()
                    if (afterWake.isNotEmpty()) {
                        parseCommand(afterWake)
                    } else {
                        Toast.makeText(this@MainActivity, "Listening… say 'call admin' or 'call <name>'", Toast.LENGTH_SHORT).show()
                        voiceAwaitCommand = true
                    }
                } else {
                    voiceAwaitCommand = false
                }

                // Continuous mode: restart listening after result
                restartWakeListening(450)
            }
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        speechIntent = android.content.Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            // CHANGE: prefer offline to avoid network errors when offline pack is installed
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, forceOfflineVoice)
            // Give user more time to speak
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 2000)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1000)
            // Optional extras that improve stability on some ROMs
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
        }
    }

    private fun startVoiceWake() {
        if (!voiceRecognitionEnabled) {
            Log.w("DORA/TV", "Voice recognition disabled by flag")
            return
        }
        if (!ensureAudioPermission()) {
            Log.w("DORA/TV", "No microphone permission")
            return
        }
        initSpeechIfNeeded()
        if (speechRecognizer == null || speechIntent == null) {
            Log.w("DORA/TV", "Speech recognizer not initialized")
            return
        }
        // Avoid duplicate starts
        if (isWakeListening) {
            Log.d("DORA/TV", "Wake listening already active")
            return
        }
        try {
            Log.d("DORA/TV", "Starting voice recognition...")
            isWakeListening = true
            speechRecognizer?.startListening(speechIntent)
            Log.d("DORA/TV", "Voice recognition started")
        } catch (e: Exception) {
            Log.e("DORA/TV", "startVoiceWake error", e)
            isWakeListening = false
        }
    }

    // NEW: central restart helper with backoff
    private fun restartWakeListening(delayMs: Long = 600L) {
        if (!voiceRecognitionEnabled) return
        isWakeListening = false
        try { speechRecognizer?.cancel() } catch (_: Exception) {}
        handler.postDelayed({
            try {
                speechRecognizer?.startListening(speechIntent)
                isWakeListening = true
                Log.d("DORA/TV", "Voice recognition (re)started")
            } catch (e: Exception) {
                Log.e("DORA/TV", "restartWakeListening error", e)
                isWakeListening = false
            }
        }, delayMs)
    }

    // NEW: stop & destroy for lifecycle
    private fun stopVoiceWake() {
        isWakeListening = false
        try { speechRecognizer?.cancel() } catch (_: Exception) {}
        try { speechRecognizer?.stopListening() } catch (_: Exception) {}
    }

    private fun destroySpeech() {
        stopVoiceWake()
        try { speechRecognizer?.destroy() } catch (_: Exception) {}
        speechRecognizer = null
    }

    // NEW: normalize text for fuzzy matching
    private fun normalizeText(s: String?): String {
        if (s == null) return ""
        val lowered = s.lowercase()
        val cleaned = lowered.replace(Regex("[^a-z0-9\\s]"), " ")
        return cleaned.trim().replace(Regex("\\s+"), " ")
    }

    // NEW: simple Levenshtein distance for fuzzy wake
    private fun levenshtein(a: String, b: String): Int {
        val la = a.length
        val lb = b.length
        if (la == 0) return lb
        if (lb == 0) return la
        val dp = IntArray(lb + 1) { it }
        for (i in 1..la) {
            var prev = dp[0]
            dp[0] = i
            for (j in 1..lb) {
                val temp = dp[j]
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                dp[j] = minOf(
                    dp[j] + 1,
                    dp[j - 1] + 1,
                    prev + cost
                )
                prev = temp
            }
        }
        return dp[lb]
    }

    // NEW: Level 1 - Wake word detection only (when NOT in command mode)
    private fun isFuzzyWakeWord(textRaw: String): Boolean {
        // Don't check wake words if already in command mode
        if (voiceAwaitCommand) return false
        
        val t = normalizeText(textRaw)
        if (t.isEmpty()) return false
        
        // Rule 1: "hi dora", "hey dora", "hello dora" - explicit wake phrases
        val explicitWake = Regex("\\b(hi|hey|hello)\\s+dora\\b", RegexOption.IGNORE_CASE)
        if (explicitWake.find(t) != null) {
            Log.d("DORA/TV", "Wake triggered by explicit phrase: '$textRaw'")
            return true
        }
        
        // Rule 2: Standalone "dora" (very relaxed)
        if (t.trim() == "dora" || Regex("^dora$").find(t) != null) {
            Log.d("DORA/TV", "Wake triggered by standalone 'dora'")
            return true
        }
        
        // Rule 3: "hey" followed by any word (but not just "hey" alone)
        val heyPattern = Regex("\\bhey\\s+\\w+", RegexOption.IGNORE_CASE)
        if (heyPattern.find(t) != null) {
            Log.d("DORA/TV", "Wake triggered by 'hey XXX' pattern")
            return true
        }
        
        return false
    }

    // NEW: play a beep sound (system notification sound)
    private fun playBeepSound() {
        try {
            val toneType = android.media.ToneGenerator.TONE_PROP_BEEP
            val toneGenerator = android.media.ToneGenerator(android.media.AudioManager.STREAM_NOTIFICATION, 80)
            toneGenerator.startTone(toneType, 200) // 200ms beep
            toneGenerator.release()
        } catch (_: Exception) {
            // Fallback: use system sound
            try {
                val notification = NotificationCompat.Builder(this, "voice_feedback_channel")
                    .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .build()
                val manager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                manager.notify(999, notification)
            } catch (_: Exception) {}
        }
    }

    // NEW: Level 2 - Command detection only (when in command mode)
    private fun isCommandText(text: String): Boolean {
        val t = normalizeText(text)
        // Check for command keywords: "call", "turn", "on", "off", "light"
        return t.contains("call") || 
               t.contains("turn") || 
               (t.contains("on") && (t.contains("light") || t.contains("lamp"))) ||
               (t.contains("off") && (t.contains("light") || t.contains("lamp")))
    }

    // NEW: Two-level handler: Level 1 = Wake word detection, Level 2 = Command detection
    private fun handleRecognizedText(textRaw: String) {
        val text = normalizeText(textRaw)
        if (text.isEmpty()) {
            Log.d("DORA/TV", "handleRecognizedText: empty normalized text")
            return
        }
        
        Log.d("DORA/TV", "handleRecognizedText: '$text', voiceAwaitCommand: $voiceAwaitCommand")

        // LEVEL 1: If NOT in command mode, check for wake words ONLY
        if (!voiceAwaitCommand) {
            if (isFuzzyWakeWord(text)) {
                Log.d("DORA/TV", "Level 1: Wake word detected: '$text'")
                
                // Try to extract command after wake word (for one-shot: "hi dora call admin")
                val afterWake = text
                    .replace(Regex("^\\s*(hi|hey|hello)\\s+dora\\s*", RegexOption.IGNORE_CASE), "")
                    .replace(Regex("^\\s*dora\\s*", RegexOption.IGNORE_CASE), "")
                    .replace(Regex("^\\s*hey\\s+\\w+\\s*", RegexOption.IGNORE_CASE), "")
                    .trim()

                if (afterWake.isNotEmpty() && isCommandText(afterWake)) {
                    // One-shot utterance: wake + command in one sentence
                    Log.d("DORA/TV", "One-shot mode: wake + command detected")
                    if (parseAndExecuteCommand(afterWake)) {
                        voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
                        voiceCommandTimeoutRunnable = null
                        hideVoiceOverlay(1500)
                        voiceAwaitCommand = false
                        return
                    }
                }

                // Wake only: show "What's wrong?" and play beep
                Log.d("DORA/TV", "Level 1: Showing wake overlay")
                showVoiceOverlay("What's wrong?")
                playBeepSound()
                voiceAwaitCommand = true
                
                // Cancel previous timeout if exists
                voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
                
                // Set timeout to auto-reset after 15 seconds of inactivity
                voiceCommandTimeoutRunnable = Runnable {
                    if (voiceAwaitCommand) {
                        Log.d("DORA/TV", "Voice command timeout - resetting state")
                        voiceAwaitCommand = false
                        hideVoiceOverlay(500)
                        updateRecognizedText("")
                    }
                }
                handler.postDelayed(voiceCommandTimeoutRunnable!!, 15000) // 15 seconds timeout
                return
            }
            
            // Not a wake word and not in command mode: ignore (silent background listening)
            Log.d("DORA/TV", "Not wake word, ignoring: '$text'")
            return
        }

        // LEVEL 2: If already in command mode, ONLY check for commands (ignore wake words)
        if (voiceAwaitCommand) {
            Log.d("DORA/TV", "Level 2: Processing command: '$text'")
            // Show recognized text at center-bottom
            updateRecognizedText(text)
            
            // Check if this looks like a command (contains "call", "turn", "light", etc.)
            if (isCommandText(text)) {
                Log.d("DORA/TV", "Level 2: Command detected, parsing: '$text'")
                if (parseAndExecuteCommand(text)) {
                    // Command executed successfully - reset state
                    Log.d("DORA/TV", "Command executed successfully")
                    voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
                    handler.postDelayed({
                        updateRecognizedText("")
                    }, 1000)
                    hideVoiceOverlay(1500)
                    voiceAwaitCommand = false
                    voiceCommandTimeoutRunnable = null
                } else {
                    // Command not recognized - keep overlay for retry, but extend timeout
                    Log.d("DORA/TV", "Command not recognized: '$text'")
                    voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
                    voiceCommandTimeoutRunnable = Runnable {
                        if (voiceAwaitCommand) {
                            Log.d("DORA/TV", "Voice command timeout - resetting state")
                            voiceAwaitCommand = false
                            hideVoiceOverlay(500)
                            updateRecognizedText("")
                        }
                    }
                    handler.postDelayed(voiceCommandTimeoutRunnable!!, 10000)
                    handler.postDelayed({
                        updateRecognizedText("")
                    }, 2000)
                }
            } else {
                // Not a command (maybe just noise or wake word repeated) - extend timeout but ignore
                Log.d("DORA/TV", "Level 2: Not a command, ignoring: '$text'")
                voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
                voiceCommandTimeoutRunnable = Runnable {
                    if (voiceAwaitCommand) {
                        Log.d("DORA/TV", "Voice command timeout - resetting state")
                        voiceAwaitCommand = false
                        hideVoiceOverlay(500)
                        updateRecognizedText("")
                    }
                }
                handler.postDelayed(voiceCommandTimeoutRunnable!!, 10000)
                handler.postDelayed({
                    updateRecognizedText("")
                }, 2000)
            }
            return
        }
    }

    // NEW: show a lightweight floating voice UI with blurred background
    private fun showVoiceOverlay(initialText: String = "What's wrong?") {
        runOnUiThread {
            if (voiceOverlayShown) {
                updateVoiceOverlayText(initialText)
                return@runOnUiThread
            }
            val root = findViewById<android.view.ViewGroup>(android.R.id.content)
            val density = resources.displayMetrics.density

            // 1. Create blurred background overlay (semi-transparent dark layer to dim background)
            val blurBg = android.view.View(this)
            blurBg.setBackgroundColor(0xE6000000.toInt()) // Dark semi-transparent overlay (90% opacity)
            blurBg.isClickable = true
            blurBg.isFocusable = true
            blurBg.elevation = 8f * density
            
            val blurLp = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            root.addView(blurBg, blurLp)
            voiceBlurBackground = blurBg

            // 2. Create container for voice UI elements (MUST be on top of blurBg with higher elevation)
            val container = android.widget.FrameLayout(this)
            container.isClickable = false
            container.isFocusable = false
            container.elevation = 10f * density // Higher than blurBg to ensure it's on top

            // 3. Create "What's wrong?" text at top-center (larger font)
            val tv = android.widget.TextView(this)
            tv.text = initialText
            tv.setTextColor(android.graphics.Color.WHITE)
            tv.textSize = 32f // Larger font (32sp)
            tv.setTypeface(null, android.graphics.Typeface.BOLD)
            tv.gravity = android.view.Gravity.CENTER
            tv.visibility = View.VISIBLE // Ensure visible
            tv.setPadding((20 * density).toInt(), (20 * density).toInt(), (20 * density).toInt(), (20 * density).toInt())

            val topLp = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.TOP or android.view.Gravity.CENTER_HORIZONTAL
                topMargin = (120 * density).toInt()
            }
            container.addView(tv, topLp)
            voiceOverlayText = tv

            // 4. Create recognized text display at center-bottom (plain text only)
            val recognizedTv = android.widget.TextView(this)
            recognizedTv.text = ""
            recognizedTv.setTextColor(android.graphics.Color.WHITE)
            recognizedTv.textSize = 18f // 18sp
            recognizedTv.gravity = android.view.Gravity.CENTER
            recognizedTv.visibility = View.GONE
            recognizedTv.setPadding((20 * density).toInt(), (10 * density).toInt(), (20 * density).toInt(), (10 * density).toInt())

            val bottomLp = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT,
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.CENTER_HORIZONTAL or android.view.Gravity.BOTTOM
                bottomMargin = (200 * density).toInt() // Center-bottom position
            }
            container.addView(recognizedTv, bottomLp)
            voiceRecognizedText = recognizedTv

            // 5. Add container to root (after blurBg, so it appears on top)
            val containerLp = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            root.addView(container, containerLp) // This will be on top due to elevation

            voiceOverlay = container
            voiceOverlayShown = true
            Log.d("DORA/TV", "Voice overlay shown with text: $initialText")
        }
    }

    // NEW: update text in overlay
    private fun updateVoiceOverlayText(text: String) {
        try { voiceOverlayText?.text = text } catch (_: Exception) {}
    }

    // NEW: update recognized text at center-bottom (plain text only)
    private fun updateRecognizedText(text: String) {
        runOnUiThread {
            try {
                voiceRecognizedText?.let {
                    if (text.isNotBlank()) {
                        it.text = text
                        it.visibility = View.VISIBLE
                        Log.d("DORA/TV", "Updated recognized text: $text")
                    } else {
                        it.visibility = View.GONE
                    }
                } ?: Log.w("DORA/TV", "voiceRecognizedText is null")
            } catch (e: Exception) {
                Log.e("DORA/TV", "Error updating recognized text", e)
            }
        }
    }

    // NEW: hide overlay after delay
    private fun hideVoiceOverlay(delayMs: Long = 1200L) {
        if (!voiceOverlayShown) return
        handler.postDelayed({
            try {
                val root = findViewById<android.view.ViewGroup>(android.R.id.content)
                voiceOverlay?.let { root.removeView(it) }
                voiceBlurBackground?.let { root.removeView(it) }
            } catch (_: Exception) {}
            voiceOverlay = null
            voiceOverlayText = null
            voiceRecognizedText = null
            voiceBlurBackground = null
            voiceOverlayShown = false
            
            // Also reset voice command state when overlay is hidden
            if (voiceAwaitCommand) {
                voiceCommandTimeoutRunnable?.let { handler.removeCallbacks(it) }
                voiceCommandTimeoutRunnable = null
                voiceAwaitCommand = false
                Log.d("DORA/TV", "Voice overlay hidden - resetting command state")
            }
        }, delayMs)
    }

    // NEW: parse two commands and execute; return true if handled
    private fun parseAndExecuteCommand(text: String): Boolean {
        val t = normalizeText(text)
        Log.d("DORA/TV", "parseAndExecuteCommand: normalized text = '$t'")

        // Priority 1: Light control (check first to avoid misinterpreting "call on light" as CALL command)
        // Support multiple patterns: "turn on light", "on light", "light on", "turn off light", etc.
        val lightPatterns = listOf(
            Regex("\\b(turn\\s+)?(on|off)\\s+(the\\s+)?(light|lights|lamp|lamps)\\b(?:\\s+in\\s+(the\\s+)?([a-z\\s]+))?"),
            Regex("\\b(light|lights|lamp|lamps)\\s+(on|off)\\b"),
            Regex("\\b(on|off)\\s+(light|lights|lamp|lamps)\\b")
        )
        
        for (pattern in lightPatterns) {
            val mLight = pattern.find(t)
            if (mLight != null) {
                // Extract on/off state
                val onOff = mLight.groupValues.find { it == "on" || it == "off" } ?: ""
                val on = onOff == "on"
                // Extract room (if available in group 5 or 6)
                val room = mLight.groupValues.getOrNull(5)?.trim()?.takeIf { it.isNotEmpty() && it != "the" && !it.contains("light") }
                    ?: mLight.groupValues.getOrNull(6)?.trim()?.takeIf { it.isNotEmpty() && it != "the" && !it.contains("light") }
                Log.d("DORA/TV", "Light command detected: on=$on, room=$room")
                controlLight(on, room)
                return true
            }
        }

        // Priority 2: CALL XXX (e.g., "call admin", "call john", "call caregiver")
        // Exclude "call on/off" patterns which are likely misrecognized light commands
        if (!t.contains("call on") && !t.contains("call off")) {
            val callRegex = Regex("\\bcall\\s+([a-z\\-\\.\\s]+)\\b")
            val mCall = callRegex.find(t)
            if (mCall != null) {
                val who = mCall.groupValues.getOrNull(1)?.trim().orEmpty()
                Log.d("DORA/TV", "Call command detected: who='$who'")
                if (who.isNotEmpty() && !who.contains("light") && !who.contains("lamp")) {
                    if (who.contains("admin") || who.contains("caregiver")) {
                        Log.d("DORA/TV", "Calling admin/caregiver")
                        Toast.makeText(this, "Calling caregiver…", Toast.LENGTH_SHORT).show()
                        callAdmin() // existing method in your codebase
                    } else {
                        Log.d("DORA/TV", "Call command for unknown person: $who")
                        Toast.makeText(this, "Voice: call $who (not implemented)", Toast.LENGTH_SHORT).show()
                    }
                    return true
                }
            }
        }

        Log.d("DORA/TV", "No matching command found for: '$t'")
        return false
    }

    // NEW: initialize Text-to-Speech
    private fun initTextToSpeech() {
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                val result = textToSpeech?.setLanguage(Locale.US)
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                    Log.e("DORA/TV", "TTS language not supported")
                } else {
                    Log.i("DORA/TV", "TTS initialized successfully")
                }
            } else {
                Log.e("DORA/TV", "TTS initialization failed")
            }
        }
    }

    // NEW: speak text using TTS
    private fun speakText(text: String) {
        try {
            textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, null)
            Log.d("DORA/TV", "Speaking: $text")
        } catch (e: Exception) {
            Log.e("DORA/TV", "TTS speak error", e)
        }
    }

    // NEW: light control stub; integrate with HA if available
    private fun controlLight(on: Boolean, room: String?) {
        // TODO: integrate with Home Assistant service call if you have one
        val state = if (on) "ON" else "OFF"
        val roomInfo = if (room.isNullOrBlank()) "" else " in ${room}"
        Toast.makeText(this, "Light ${state}${roomInfo}", Toast.LENGTH_SHORT).show()
        
        // Voice feedback: "Okay master, light is turned on/off"
        val stateText = if (on) "turned on" else "turned off"
        val feedbackText = "Okay master, light is $stateText"
        speakText(feedbackText)
    }

    // NEW: check whether an asset directory exists
    private fun assetDirExists(path: String): Boolean {
        return try {
            val list = assets.list(path) ?: return false
            list.isNotEmpty()
        } catch (_: Exception) {
            false
        }
    }

    // NEW: find actual Vosk model asset path under /assets
    private fun findVoskAssetModelPath(): String? {
        // Common candidates; adjust automatically if folder name differs
        val candidates = listOf(
            "models/vosk-model-small-en-us-0.15",
            "model/vosk-model-small-en-us-0.15",
            "vosk-model-small-en-us-0.15",
            "models/vosk-model-en-us-0.22",
            "model/vosk-model-en-us-0.22"
        )
        // 1) try common candidates
        for (p in candidates) {
            if (assetDirExists(p)) return p
        }
        // 2) if there is a "models" folder, pick its first subdir
        try {
            val children = assets.list("models")?.toList().orEmpty()
            if (children.isNotEmpty()) {
                val guess = "models/${children.first()}"
                if (assetDirExists(guess)) return guess
            }
        } catch (_: Exception) {}
        // 3) if there is a "model" folder, pick its first subdir
        try {
            val children = assets.list("model")?.toList().orEmpty()
            if (children.isNotEmpty()) {
                val guess = "model/${children.first()}"
                if (assetDirExists(guess)) return guess
            }
        } catch (_: Exception) {}
        return null
    }

    // NEW: init Vosk model from assets using StorageService with auto path detection
    private fun initVoskModel() {
        if (voskModel != null || isVoskLoading) return
        isVoskLoading = true

        runOnUiThread {
            try { testVoiceResult.text = "📦 Loading Vosk model…" } catch (_: Exception) {}
            Toast.makeText(this, "📦 Loading Vosk model…", Toast.LENGTH_SHORT).show()
        }

        // Auto-detect actual asset path to avoid hard-coded folder mismatch
        val assetPath = findVoskAssetModelPath()
        if (assetPath == null) {
            isVoskLoading = false
            Log.e("DORA/TV", "Vosk assets not found under /assets (tried models/* and model/*)")
            runOnUiThread {
                Toast.makeText(this@MainActivity, "❌ Vosk assets not found. Put model under assets/models/...", Toast.LENGTH_LONG).show()
                try { testVoiceResult.text = "❌ Vosk model not found in assets" } catch (_: Exception) {}
            }
            return
        }

        // Unpack from detected asset path into app's files dir (target folder name is arbitrary)
        StorageService.unpack(
            this,
            assetPath,               // e.g. "models/vosk-model-small-en-us-0.15"
            "vosk-model-runtime",    // target dir under app files
            object : StorageService.Callback<Model> {
                override fun onComplete(model: Model) {
                    voskModel = model
                    isVoskLoading = false
                    Log.i("DORA/TV", "Vosk model loaded from $assetPath")
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "✅ Vosk model loaded", Toast.LENGTH_SHORT).show()
                        try { testVoiceResult.text = "✅ Vosk model loaded" } catch (_: Exception) {}
                    }
                    // Auto-start listening once model is ready
                    startVoskWake()
                }
            },
            object : StorageService.Callback<IOException> {
                override fun onComplete(error: IOException) {
                    isVoskLoading = false
                    Log.e("DORA/TV", "Vosk model load failed from $assetPath: ${error.message}", error)
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "❌ Vosk model load failed: ${error.message}", Toast.LENGTH_LONG).show()
                        try { testVoiceResult.text = "❌ Vosk model load failed: ${error.message}" } catch (_: Exception) {}
                    }
                }
            }
        )
    }

    // NEW: start continuous offline listening with fuzzy wake + overlay
    private fun startVoskWake() {
        if (!ensureAudioPermission()) {
            Log.w("DORA/TV", "No microphone permission for Vosk")
            return
        }

        if (voskModel == null) {
            initVoskModel()
            return
        }

        try {
            val phraseList = "[\"hey dora\", \"hi dora\", \"dora\", \"hey\", \"call\", \"call admin\", \"admin\", \"caregiver\", \"turn on\", \"turn off\", \"light\", \"lights\"]"
            val recognizer = Recognizer(voskModel, voskSampleRate, phraseList)

            voskService?.stop()
            voskService = SpeechService(recognizer, voskSampleRate)
            
            val listener = object : org.vosk.android.RecognitionListener {
                override fun onPartialResult(hypothesis: String?) {
                    // Show partial recognized text when in command mode
                    val text = try { org.json.JSONObject(hypothesis ?: "{}").optString("partial") } catch (_: Exception) { "" }
                    Log.d("DORA/TV", "Vosk onPartialResult: '$text', voiceAwaitCommand: $voiceAwaitCommand")
                    if (voiceAwaitCommand && text.isNotBlank()) {
                        // Show recognized text in real-time at center-bottom
                        updateRecognizedText(text)
                    } else if (!voiceAwaitCommand && text.isNotBlank()) {
                        // Even if not in command mode, log partial results for debugging
                        Log.d("DORA/TV", "Partial result while not in command mode: '$text'")
                    }
                }
                override fun onResult(hypothesis: String?) {
                    val text = try { org.json.JSONObject(hypothesis ?: "{}").optString("text") } catch (_: Exception) { "" }
                    if (text.isNotBlank()) {
                        Log.d("DORA/TV", "Vosk onResult: '$text', voiceAwaitCommand: $voiceAwaitCommand")
                        handleRecognizedText(text)
                    } else {
                        Log.d("DORA/TV", "Vosk onResult: empty text")
                    }
                }

                override fun onFinalResult(hypothesis: String?) {
                    val text = try { org.json.JSONObject(hypothesis ?: "{}").optString("text") } catch (_: Exception) { "" }
                    if (text.isNotBlank()) {
                        Log.d("DORA/TV", "Vosk onFinalResult: '$text', voiceAwaitCommand: $voiceAwaitCommand")
                        handleRecognizedText(text)
                    } else {
                        Log.d("DORA/TV", "Vosk onFinalResult: empty text")
                    }
                }

                override fun onError(e: Exception?) {
                    Log.e("DORA/TV", "Vosk error: ${e?.message}", e)
                    handler.postDelayed({ startVoskWake() }, 800)
                }

                override fun onTimeout() {
                    Log.w("DORA/TV", "Vosk timeout; restarting")
                    handler.postDelayed({ startVoskWake() }, 500)
                }
            }
            
            voskService?.startListening(listener)
            Log.i("DORA/TV", "Vosk listening started (fuzzy)")
        } catch (e: Exception) {
            Log.e("DORA/TV", "Failed to start Vosk: ${e.message}", e)
            Toast.makeText(this, "❌ Start Vosk failed", Toast.LENGTH_LONG).show()
        }
    }

    private fun stopVoskWake() {
        try { voskService?.stop() } catch (_: Exception) {}
        voskService = null
    }

    // Test voice recognition using Vosk offline (instead of Google SpeechRecognizer)
    private fun startTestVoiceRecognition() {
        if (!ensureAudioPermission()) {
            Toast.makeText(this, "❌ No microphone permission", Toast.LENGTH_SHORT).show()
            return
        }

        // Stop existing wake loop while testing
        stopVoskWake()
        stopVoiceWake()

        // Check microphone hardware first
        val micStatus = checkMicrophoneHardware()
        Log.i("DORA/TV", "Microphone check:\n$micStatus")

        runOnUiThread {
            testVoiceResult.visibility = View.VISIBLE
            testVoiceAudioLevel.visibility = View.VISIBLE
            testVoiceAudioProgress.visibility = View.VISIBLE
            testVoiceAudioProgress.progress = 0

            if (micStatus.contains("DENIED") || micStatus.contains("UNAVAILABLE") || micStatus.contains("ERROR")) {
                testVoiceResult.text = "❌ Microphone Hardware Check:\n\n$micStatus\n\nPlease check:\n• Emulator Settings → Microphone\n• App Permissions → Microphone"
                testVoiceAudioLevel.text = "Status: Hardware check failed"
                btnTestVoice.isEnabled = true
                btnTestVoice.text = "🎤 Test Voice"
                return@runOnUiThread
            } else {
                testVoiceResult.text = "✅ Microphone OK\n\n$micStatus\n🎤 Starting Vosk recognition..."
                testVoiceAudioLevel.text = "Audio level: -- dB"
                btnTestVoice.isEnabled = false
                btnTestVoice.text = "🎤 Recording (Vosk)..."
            }
        }

        initVoskModel()
        if (voskModel == null) {
            runOnUiThread {
                testVoiceResult.text = "❌ Vosk model not loaded\n\nPlease ensure model files are in assets/models/"
                btnTestVoice.isEnabled = true
                btnTestVoice.text = "🎤 Test Voice"
            }
            return
        }

        try {
            // Use broader phrase list for testing (not just wake words)
            val recognizer = Recognizer(voskModel, voskSampleRate)
            val testVoskService = SpeechService(recognizer, voskSampleRate)

            var hasSpeechDetected = false
            var maxAudioLevel: Float = -100f

            val testListener = object : org.vosk.android.RecognitionListener {
                override fun onPartialResult(hypothesis: String?) {
                    // Show partial results for quick feedback
                    try {
                        val partial = JSONObject(hypothesis ?: "{}").optString("partial")
                        if (partial.isNotBlank()) {
                            Log.d("DORA/TV", "Test partial: $partial")
                            runOnUiThread {
                                testVoiceResult.text = "🎤 Listening...\nPartial: $partial"
                            }
                        }
                    } catch (_: Exception) {}
                }

                override fun onResult(hypothesis: String?) {
                    val text = try { JSONObject(hypothesis ?: "{}").optString("text") } catch (_: Exception) { "" }
                    Log.i("DORA/TV", "Test Vosk result: $text")
                    runOnUiThread {
                        val lvl = if (hasSpeechDetected) " (audio seen)" else " (no audio)"
                        testVoiceResult.text = "✅ Result$lvl\nMax level: ${"%.1f".format(maxAudioLevel)} dB\nText: $text"
                        testVoiceAudioLevel.text = "Final: ${"%.1f".format(maxAudioLevel)} dB"
                        btnTestVoice.isEnabled = true
                        btnTestVoice.text = "🎤 Test Voice"
                    }
                    try { testVoskService.stop() } catch (_: Exception) {}
                }

                override fun onFinalResult(hypothesis: String?) {
                    val text = try { JSONObject(hypothesis ?: "{}").optString("text") } catch (_: Exception) { "" }
                    if (text.isNotBlank()) {
                        Log.i("DORA/TV", "Test Vosk final: $text")
                        runOnUiThread {
                            val lvl = if (hasSpeechDetected) " (audio seen)" else " (no audio)"
                            testVoiceResult.text = "✅ Result$lvl\nMax level: ${"%.1f".format(maxAudioLevel)} dB\nText: $text"
                            testVoiceAudioLevel.text = "Final: ${"%.1f".format(maxAudioLevel)} dB"
                            btnTestVoice.isEnabled = true
                            btnTestVoice.text = "🎤 Test Voice"
                        }
                    }
                    try { testVoskService.stop() } catch (_: Exception) {}
                }

                override fun onError(e: Exception?) {
                    Log.e("DORA/TV", "Test Vosk error: ${e?.message}", e)
                    runOnUiThread {
                        testVoiceResult.text = "❌ Vosk error: ${e?.message}\nMax level: ${"%.1f".format(maxAudioLevel)} dB"
                        btnTestVoice.isEnabled = true
                        btnTestVoice.text = "🎤 Test Voice"
                    }
                    try { testVoskService.stop() } catch (_: Exception) {}
                }

                override fun onTimeout() {
                    Log.w("DORA/TV", "Test Vosk timeout")
                    runOnUiThread {
                        testVoiceResult.text = "⏱️ Timeout\nMax level: ${"%.1f".format(maxAudioLevel)} dB\n(No speech detected)"
                        btnTestVoice.isEnabled = true
                        btnTestVoice.text = "🎤 Test Voice"
                    }
                    try { testVoskService.stop() } catch (_: Exception) {}
                }
            }

            // Track audio level (approximate from Vosk's internal processing)
            // Note: Vosk doesn't expose RMS directly, so we'll use a workaround
            testVoskService.startListening(testListener)
            
            Log.d("DORA/TV", "Starting Vosk test recognition...")
            runOnUiThread {
                testVoiceResult.text = "🎤 Recording...\n(Speak now - Vosk offline)"
            }

        } catch (e: Exception) {
            Log.e("DORA/TV", "Test Vosk recognition error", e)
            runOnUiThread {
                testVoiceResult.text = "❌ Error starting Vosk test: ${e.message}"
                btnTestVoice.isEnabled = true
                btnTestVoice.text = "🎤 Test Voice"
            }
        }
    }

    // Retry test voice recognition with offline mode
    private fun startTestVoiceRecognitionOffline() {
        if (!ensureAudioPermission()) {
            Toast.makeText(this, "❌ No microphone permission", Toast.LENGTH_SHORT).show()
            return
        }

        val testRecognizer = SpeechRecognizer.createSpeechRecognizer(this) ?: run {
            runOnUiThread {
                testVoiceResult.text = "❌ Speech recognizer unavailable (offline)"
            }
            return
        }

        val offlineIntent = android.content.Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
        }

        testRecognizer.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onError(error: Int) {
                runOnUiThread {
                    testVoiceResult.text = "❌ Offline recognition failed (code $error). Install offline language pack in system settings."
                    btnTestVoice.isEnabled = true
                    btnTestVoice.text = "🎤 Test Voice"
                }
                try { testRecognizer.destroy() } catch (_: Exception) {}
            }
            override fun onResults(results: Bundle) {
                val text = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                runOnUiThread {
                    testVoiceResult.text = "✅ Offline result: $text"
                    btnTestVoice.isEnabled = true
                    btnTestVoice.text = "🎤 Test Voice"
                }
                try { testRecognizer.destroy() } catch (_: Exception) {}
            }
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })

        try {
            testRecognizer.startListening(offlineIntent)
            runOnUiThread { testVoiceResult.text = "📴 Trying offline recognition..." }
        } catch (e: Exception) {
            runOnUiThread {
                testVoiceResult.text = "❌ Cannot start offline recognition: ${e.message}"
                btnTestVoice.isEnabled = true
                btnTestVoice.text = "🎤 Test Voice"
            }
            try { testRecognizer.destroy() } catch (_: Exception) {}
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

    // ==================== Call Admin Functions ====================

    // Call admin (caregiver)
    private fun callAdmin() {
        if (isCallingAdmin) {
            Toast.makeText(this, "Already calling caregiver...", Toast.LENGTH_SHORT).show()
            return
        }

        Log.i("DORA/TV", "📞 Initiating call to caregiver...")
        isCallingAdmin = true
        updateCallAdminUI("Calling caregiver...", true)

        // Generate unique room ID for this call
        val roomId = "elder-call-${System.currentTimeMillis()}"
        callAdminRoomId = roomId

        Thread {
            try {
                val url = "http://10.0.2.2:8300/api/calls/elder/initiate"
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    connectTimeout = 10000
                    readTimeout = 10000
                }

                val requestBody = JSONObject().apply {
                    put("elder_id", elderId)
                    put("room_id", roomId)
                    put("message", "Elder needs assistance")
                }

                conn.outputStream.use { it.write(requestBody.toString().toByteArray()) }

                val code = conn.responseCode
                val body = if (code >= 200 && code < 300) {
                    conn.inputStream.bufferedReader().use { it.readText() }
                } else {
                    conn.errorStream.bufferedReader().use { it.readText() }
                }
                conn.disconnect()

                Log.i("DORA/TV", "Call admin response - Code: $code, Body: $body")

                runOnUiThread {
                    if (code >= 200 && code < 300) {
                        Toast.makeText(this, "Call initiated successfully", Toast.LENGTH_SHORT).show()
                        updateCallAdminUI("Waiting for caregiver to answer...", true)
                        startCallAdminStatusPolling()
                    } else {
                        Toast.makeText(this, "Failed to initiate call: $body", Toast.LENGTH_LONG).show()
                        resetCallAdminState()
                    }
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "Call admin error", e)
                runOnUiThread {
                    Toast.makeText(this, "Call failed: ${e.message}", Toast.LENGTH_LONG).show()
                    resetCallAdminState()
                }
            }
        }.start()
    }

    // Cancel call to admin
    private fun cancelCallToAdmin() {
        if (!isCallingAdmin) return

        Log.i("DORA/TV", "❌ Canceling call to caregiver...")
        
        val roomId = callAdminRoomId
        if (roomId != null) {
            Thread {
                try {
                    val url = "http://10.0.2.2:8300/api/calls/elder/cancel"
                    val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                        requestMethod = "POST"
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json")
                        connectTimeout = 5000
                        readTimeout = 5000
                    }

                    val requestBody = JSONObject().apply {
                        put("elder_id", elderId)
                        put("room_id", roomId)
                    }

                    conn.outputStream.use { it.write(requestBody.toString().toByteArray()) }
                    val code = conn.responseCode
                    conn.disconnect()

                    Log.i("DORA/TV", "Cancel call response - Code: $code")
                } catch (e: Exception) {
                    Log.e("DORA/TV", "Cancel call error", e)
                }
            }.start()
        }

        resetCallAdminState()
        Toast.makeText(this, "Call canceled", Toast.LENGTH_SHORT).show()
    }

    // Start polling call admin status
    private fun startCallAdminStatusPolling() {
        val pollingRunnable = object : Runnable {
            override fun run() {
                if (!isCallingAdmin) return

                val roomId = callAdminRoomId ?: return
                
                Thread {
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

                        Log.d("DORA/TV", "Call admin status check: code=$code, body=$body")

                        runOnUiThread {
                            if (code == 200 && body.isNotEmpty()) {
                                try {
                                    val obj = JSONObject(body)
                                    val status = obj.optString("status", "")
                                    
                                    when (status.lowercase()) {
                                        "answered" -> {
                                            updateCallAdminUI("Caregiver answered! Connecting...", true)
                                            // Connect to LiveKit room
                                            requestLiveKitToken(roomId)
                                            // Don't reset state immediately - wait for connection to establish
                                        }
                                        "declined" -> {
                                            updateCallAdminUI("Call declined by caregiver", false)
                                            resetCallAdminState()
                                        }
                                        "ended" -> {
                                            updateCallAdminUI("Call ended", false)
                                            resetCallAdminState()
                                        }
                                        "waiting" -> {
                                            updateCallAdminUI("Waiting for caregiver to answer...", true)
                                            handler.postDelayed(this, 3000)
                                        }
                                        else -> {
                                            updateCallAdminUI("Call status: $status", true)
                                            handler.postDelayed(this, 3000)
                                        }
                                    }
                                } catch (e: Exception) {
                                    Log.e("DORA/TV", "Parse call admin status error: ${e.message}")
                                    handler.postDelayed(this, 3000)
                                }
                            } else {
                                handler.postDelayed(this, 3000)
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("DORA/TV", "Call admin status polling error: ${e.message}")
                        runOnUiThread {
                            handler.postDelayed(this, 5000)
                        }
                    }
                }.start()
            }
        }
        handler.post(pollingRunnable)
    }

    // Update call admin UI
    private fun updateCallAdminUI(status: String, isCalling: Boolean) {
        emergencyCallStatusText.text = status
        btnCallAdmin.visibility = if (isCalling) View.GONE else View.VISIBLE
        btnCancelCall.visibility = if (isCalling) View.VISIBLE else View.GONE
        
        // Add pulsing animation for calling state
        if (isCalling) {
            btnCancelCall.animate()
                .scaleX(1.1f)
                .scaleY(1.1f)
                .setDuration(500)
                .withEndAction {
                    btnCancelCall.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .setDuration(500)
                        .start()
                }
                .start()
        }
    }

    // Reset call admin state
    private fun resetCallAdminState() {
        isCallingAdmin = false
        callAdminRoomId = null
        updateCallAdminUI("Tap to call your caregiver", false)
    }

    // --- Health Dashboard UI Update Function ---
    private fun updateDashboardUI() {
        // Unified color scheme: high values = red, low values = blue, normal = dark gray
        val colorNormal = Color.parseColor("#333333") // Dark gray for normal text
        val colorHigh = Color.parseColor("#E53935") // Red for high values
        val colorLow = Color.parseColor("#2196F3") // Blue for low values
        val colorCardNormal = Color.parseColor("#FFFFFF") // White card background
        val colorCardAlert = Color.parseColor("#FFF3E0") // Light orange/beige for alert card background
        
        // Helper to update a single metric's TextView
        fun updateMetricTextView(textView: TextView, metric: HealthMetric) {
            val status = evalStatus(metric.value, metric.thresholds)
            val textColor = when (status) {
                Status.NORMAL -> colorNormal
                Status.LOW -> colorLow   // Blue for low values
                Status.HIGH -> colorHigh // Red for high values
            }
            textView.text = "${metric.value}${metric.unit}"
            textView.setTextColor(textColor)
        }

        // Count status for health summary
        var warningCount = 0
        var criticalCount = 0
        var normalCount = 0

        // Update Health Metrics
        var healthHasAlert = false
        healthMetricsData.forEach { metric ->
            val textView = findViewById<TextView>(metric.id)
            updateMetricTextView(textView, metric)
            val status = evalStatus(metric.value, metric.thresholds)
            if (status != Status.NORMAL) {
                healthHasAlert = true
                // Count warnings (high/low within warning thresholds) vs critical
                if ((metric.thresholds?.critLow != null && metric.value < metric.thresholds.critLow) ||
                    (metric.thresholds?.critHigh != null && metric.value > metric.thresholds.critHigh)) {
                    criticalCount++
                } else {
                    warningCount++
                }
            } else {
                normalCount++
            }
        }
        if (healthHasAlert) {
            cardHealthMetrics.setBackgroundColor(colorCardAlert)
        } else {
            cardHealthMetrics.setBackgroundColor(colorCardNormal)
        }

        // Update Blood Pressure Data
        var bpHasAlert = false
        bloodPressureData.forEach { metric ->
            val textView = findViewById<TextView>(metric.id)
            updateMetricTextView(textView, metric)
            val status = evalStatus(metric.value, metric.thresholds)
            if (status != Status.NORMAL) {
                bpHasAlert = true
                if ((metric.thresholds?.critLow != null && metric.value < metric.thresholds.critLow) ||
                    (metric.thresholds?.critHigh != null && metric.value > metric.thresholds.critHigh)) {
                    criticalCount++
                } else {
                    warningCount++
                }
            } else {
                normalCount++
            }
        }
        if (bpHasAlert) {
            cardBloodPressure.setBackgroundColor(colorCardAlert)
        } else {
            cardBloodPressure.setBackgroundColor(colorCardNormal)
        }

        // Update Environmental Data
        var envHasAlert = false
        environmentalData.forEach { metric ->
            val textView = findViewById<TextView>(metric.id)
            updateMetricTextView(textView, metric)
            val status = evalStatus(metric.value, metric.thresholds)
            if (status != Status.NORMAL) {
                envHasAlert = true
                if ((metric.thresholds?.critLow != null && metric.value < metric.thresholds.critLow) ||
                    (metric.thresholds?.critHigh != null && metric.value > metric.thresholds.critHigh)) {
                    criticalCount++
                } else {
                    warningCount++
                }
            } else {
                normalCount++
            }
        }
        if (envHasAlert) {
            cardEnvironmental.setBackgroundColor(colorCardAlert)
        } else {
            cardEnvironmental.setBackgroundColor(colorCardNormal)
        }

        // Update Health Summary card
        try {
            val tvHealthScore = findViewById<TextView>(R.id.tvHealthScore)
            val totalMetrics = healthMetricsData.size + bloodPressureData.size + environmentalData.size
            val score = ((normalCount.toDouble() / totalMetrics) * 100).toInt()
            tvHealthScore?.text = "$score/100"
            
            // Update status indicators (these are static for now, could be dynamic)
            // The layout already has the correct counts displayed
        } catch (e: Exception) {
            Log.w("DORA/TV", "Health summary UI elements not found", e)
        }
    }
}
