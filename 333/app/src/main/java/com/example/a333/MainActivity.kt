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
    private val elderId = "elder-001" // 老人ID，实际应用中应该从配置或登录获取
    private var callCheckRunnable: Runnable? = null

    // LiveKit room management
    private lateinit var room: Room
    private var isInCall = false
    private val coroutineScope = CoroutineScope(Dispatchers.Main)
    private var currentCallDialog: AlertDialog? = null // 当前显示的呼叫对话框
    private var lastProcessedCallId: String? = null // 最后处理的呼叫ID，避免重复显示
    private var currentRoomId: String? = null // 当前通话的房间ID，用于挂断时通知服务器

    // Video views
    private lateinit var videoCallContainer: FrameLayout
    private lateinit var remoteVideoView: SurfaceView
    private lateinit var localVideoView: SurfaceView
    private lateinit var callStatusText: TextView
    private lateinit var btnMute: Button
    private lateinit var btnCamera: Button

    // 新增：通话中轮询通话状态的任务
    private var callStatusPollingRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

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

        // 视频通话控制按钮 - 简化版本
        btnMute.setOnClickListener {
            Toast.makeText(this, "静音功能暂未实现", Toast.LENGTH_SHORT).show()
        }

        btnCamera.setOnClickListener {
            Toast.makeText(this, "摄像头控制功能暂未实现", Toast.LENGTH_SHORT).show()
        }

        // 初始化LiveKit
        room = LiveKit.create(applicationContext)

        // 开始检查管理员呼叫
        startCallCheck()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCallCheck()
        stopInCallStatusPolling() // 新增：停止通话状态轮询
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

                    runOnUiThread {
                        Toast.makeText(this, "正在连接语音通话...", Toast.LENGTH_SHORT).show()
                        connectToLiveKitRoom(livekitUrl, token)
                    }
                } else {
                    Log.e("DORA/TV", "Token request failed with code: $code")
                    runOnUiThread {
                        Toast.makeText(this, "Token获取失败: $code", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "Token request error", e)
                runOnUiThread {
                    Toast.makeText(this, "请求失败: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }

    // Connect to LiveKit room for voice call
    private fun connectToLiveKitRoom(url: String, token: String) {
        try {
            Log.i("DORA/TV", "LiveKit connection requested - URL: $url, Token: ${token.take(20)}...")

            runOnUiThread {
                Toast.makeText(this, "正在连接语音通话...", Toast.LENGTH_SHORT).show()
                isInCall = true
                // Show end call button
                findViewById<Button>(R.id.btnEndCall)?.visibility = View.VISIBLE
            }

            // 使用协程连接LiveKit
            coroutineScope.launch {
                try {
                    Log.i("DORA/TV", "Attempting to connect to LiveKit room...")

                    // 先断开之前的连接（如果有的话）
                    try {
                        Log.i("DORA/TV", "Disconnecting from previous room...")
                        room.disconnect()
                        // 等待一下确保断开完成
                        kotlinx.coroutines.delay(1000)
                    } catch (e: Exception) {
                        Log.i("DORA/TV", "No previous connection to disconnect: ${e.message}")
                    }

                    // 连接到房间
                    room.connect(url, token)

                    Log.i("DORA/TV", "✅ Connected to LiveKit room successfully")

                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "✅ 已连接视频通话", Toast.LENGTH_SHORT).show()

                        // 显示视频通话界面
                        videoCallContainer.visibility = View.VISIBLE
                        callStatusText.text = "已连接 - 正在等待对方视频..."

                        // 启用麦克风和摄像头
                        try {
                            room.localParticipant.setMicrophoneEnabled(true)
                            // setCameraEnabled需要在协程中调用
                            coroutineScope.launch {
                                try {
                                    room.localParticipant.setCameraEnabled(true)
                                    Log.i("DORA/TV", "Microphone and camera enabled")

                                    // 设置视频渲染
                                    setupVideoRendering()
                                } catch (e: Exception) {
                                    Log.e("DORA/TV", "Failed to enable microphone/camera", e)
                                }
                            }
                        } catch (e: Exception) {
                            Log.e("DORA/TV", "Failed to enable microphone", e)
                        }

                        // 新增：启动“通话中状态轮询”，以便管理员端挂断后自动退出
                        startInCallStatusPolling()
                    }

                } catch (e: Exception) {
                    Log.e("DORA/TV", "LiveKit connection error", e)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@MainActivity, "连接失败: ${e.message}", Toast.LENGTH_LONG).show()
                        isInCall = false
                        findViewById<Button>(R.id.btnEndCall)?.visibility = View.GONE
                    }
                }
            }

        } catch (e: Exception) {
            Log.e("DORA/TV", "LiveKit connection setup error", e)
            runOnUiThread {
                Toast.makeText(this, "连接设置失败: ${e.message}", Toast.LENGTH_LONG).show()
                isInCall = false
                findViewById<Button>(R.id.btnEndCall)?.visibility = View.GONE
            }
        }
    }

    // Setup video rendering for LiveKit
    private fun setupVideoRendering() {
        try {
            Log.i("DORA/TV", "Setting up video rendering...")

            // 由于LiveKit Android SDK的复杂性，我们先简化实现
            // 在实际应用中，需要正确设置VideoTrack的渲染和事件监听
            runOnUiThread {
                Toast.makeText(this@MainActivity, "视频通话已连接", Toast.LENGTH_SHORT).show()
            }

            // 启动挂断检测定时器（简化版本）
            startHangupDetection()

            Log.i("DORA/TV", "Video rendering setup completed")
        } catch (e: Exception) {
            Log.e("DORA/TV", "Failed to setup video rendering", e)
        }
    }

    // 使用LiveKit Room状态检测挂断
    private fun startHangupDetection() {
        val hangupCheckRunnable = object : Runnable {
            override fun run() {
                if (isInCall && ::room.isInitialized) {
                    try {
                        // 使用LiveKit的Room状态检测
                        when (room.state) {
                            Room.State.DISCONNECTED -> {
                                Log.i("DORA/TV", "房间已断开连接")
                                runOnUiThread {
                                    Toast.makeText(this@MainActivity, "对方已挂断", Toast.LENGTH_SHORT).show()
                                    endCall()
                                }
                                return
                            }
                            Room.State.CONNECTED -> {
                                // 检查远程参与者
                                val participants = room.remoteParticipants
                                if (participants.isEmpty()) {
                                    Log.i("DORA/TV", "远程参与者已离开")
                                    runOnUiThread {
                                        Toast.makeText(this@MainActivity, "对方已挂断", Toast.LENGTH_SHORT).show()
                                        endCall()
                                    }
                                    return
                                }
                                Log.d("DORA/TV", "房间状态正常，参与者数量: ${participants.size}")
                            }
                            else -> {
                                Log.d("DORA/TV", "房间状态: ${room.state}")
                            }
                        }

                        // 继续检查
                        handler.postDelayed(this, 2000) // 每2秒检查一次
                    } catch (e: Exception) {
                        Log.e("DORA/TV", "挂断检测异常: ${e.message}")
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "连接异常", Toast.LENGTH_SHORT).show()
                            endCall()
                        }
                    }
                }
            }
        }
        handler.post(hangupCheckRunnable)
    }

    // 新增：开始通话中状态轮询（查询服务器通话状态，检测管理员端主动挂断）
    private fun startInCallStatusPolling() {
        if (callStatusPollingRunnable != null) return // 已在轮询则不重复启动
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
                                        Toast.makeText(this@MainActivity, "对方已挂断", Toast.LENGTH_SHORT).show()
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
                                callStatusPollingRunnable?.let { handler.postDelayed(it, 3000) } // 每3秒轮询一次
                            }
                        }
                    }
                }
            }
        }
        callStatusPollingRunnable?.let { handler.post(it) }
    }

    // 新增：停止通话状态轮询
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

                    // 通知服务器通话已结束
                    notifyServerCallEnded()
                } catch (e: Exception) {
                    Log.e("DORA/TV", "Error disconnecting from room", e)
                }

                withContext(Dispatchers.Main) {
                    isInCall = false
                    stopInCallStatusPolling() // 新增：结束时停止轮询
                    // Hide end call button and video container
                    findViewById<Button>(R.id.btnEndCall)?.visibility = View.GONE
                    videoCallContainer.visibility = View.GONE
                    Toast.makeText(this@MainActivity, "通话已结束", Toast.LENGTH_SHORT).show()
                }
            }
        } catch (e: Exception) {
            Log.e("DORA/TV", "Error ending call", e)
            Toast.makeText(this, "挂断失败: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    // 通知服务器通话已结束
    private fun notifyServerCallEnded() {
        Thread {
            try {
                val roomId = currentRoomId
                Log.i("DORA/TV", "准备通知服务器通话结束，房间ID: $roomId")

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

                    Log.i("DORA/TV", "通知服务器通话结束 - Code: $code, Body: $body")
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "通知服务器通话结束失败", e)
            }
        }.start()
    }

    // 开始检查管理员呼叫
    private fun startCallCheck() {
        callCheckRunnable = object : Runnable {
            override fun run() {
                checkPendingCalls()
                handler.postDelayed(this, 5000) // 每5秒检查一次
            }
        }
        handler.post(callCheckRunnable!!)
    }

    // 停止检查管理员呼叫
    private fun stopCallCheck() {
        callCheckRunnable?.let { handler.removeCallbacks(it) }
    }

    // 检查待接听的呼叫
    private fun checkPendingCalls() {
        Thread {
            try {
                val url = "http://10.0.2.2:8300/api/calls/elder/pending-calls/$elderId"
                Log.d("DORA/TV", "Checking pending calls from: $url")

                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 5000
                    readTimeout = 5000
                }
                val code = conn.responseCode
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                conn.disconnect()

                Log.d("DORA/TV", "Pending calls response - Code: $code, Body: $body")

                if (code == 200 && body.isNotEmpty() && body != "[]") {
                    val jsonArray = org.json.JSONArray(body)
                    if (jsonArray.length() > 0) {
                        val call = jsonArray.getJSONObject(0)
                        val callId = call.optString("room_id", "")

                        // 检查是否是新的呼叫，避免重复显示
                        if (callId != lastProcessedCallId) {
                            Log.i("DORA/TV", "📞 收到新的管理员呼叫: $call")
                            lastProcessedCallId = callId
                            currentRoomId = callId // 存储当前通话的房间ID
                            runOnUiThread {
                                showCallNotification(call)
                            }
                        } else {
                            Log.d("DORA/TV", "呼叫已处理过，跳过显示: $callId")
                        }
                    } else {
                        Log.d("DORA/TV", "No pending calls")
                        // 没有呼叫时重置ID，但保留当前通话的房间ID
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

    // 显示呼叫通知对话框
    private fun showCallNotification(call: JSONObject) {
        val message = call.optString("message", "管理员想要与您通话")
        val roomId = call.optString("room_id", "")
        val callId = call.optString("room_id", "") // 使用room_id作为呼叫唯一标识

        // 如果已有呼叫对话框在显示，先关闭它
        currentCallDialog?.dismiss()
        currentCallDialog = null

        currentCallDialog = AlertDialog.Builder(this)
            .setTitle("📞 管理员呼叫")
            .setMessage("管理员想要与您通话\n\n消息：$message")
            .setPositiveButton("✅ 接听") { _, _ ->
                // 接听后立即关闭对话框
                currentCallDialog?.dismiss()
                currentCallDialog = null
                answerCall(roomId, "accept")
            }
            .setNegativeButton("❌ 拒绝") { _, _ ->
                // 拒绝后立即关闭对话框
                currentCallDialog?.dismiss()
                currentCallDialog = null
                answerCall(roomId, "decline")
            }
            .setCancelable(false)
            .setOnDismissListener {
                Log.i("DORA/TV", "呼叫通知弹窗已消失")
                currentCallDialog = null
            }
            .create()

        currentCallDialog?.show()
    }

    // 接听或拒绝呼叫
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
                            Toast.makeText(this, "正在连接通话...", Toast.LENGTH_SHORT).show()
                            // Ensure room id is stored for end notification
                            currentRoomId = roomId // <-- ensure server sync when hang up
                            // 这里可以启动LiveKit通话界面
                            requestLiveKitToken(roomId)
                        } else {
                            Toast.makeText(this, "已拒绝通话", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(this, "操作失败: HTTP $code - $body", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Log.e("DORA/TV", "answer call error", e)
                runOnUiThread {
                    Toast.makeText(this, "操作失败: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }.start()
    }
}

