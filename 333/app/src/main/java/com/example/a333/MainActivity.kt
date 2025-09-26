package com.example.a333

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var weekRv: RecyclerView
    private lateinit var monthTitle: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        weekRv = findViewById(R.id.weekRecycler)
        monthTitle = findViewById(R.id.tvMonthTitle)

        weekRv.layoutManager = GridLayoutManager(this, 7, RecyclerView.VERTICAL, false)

        val today = Calendar.getInstance()
        monthTitle.text = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(today.time)

        weekRv.adapter = WeekAdapter(buildWeek(today)) { /* 点击某天的回调，可留空 */ }
    }

    // 生成一周（周一开始）数据
    private fun buildWeek(ref: Calendar): MutableList<Day> {
        val start = ref.clone() as Calendar
        start.firstDayOfWeek = Calendar.MONDAY
        val diff = (7 + (start.get(Calendar.DAY_OF_WEEK) - Calendar.MONDAY)) % 7
        start.add(Calendar.DAY_OF_MONTH, -diff)

        val list = mutableListOf<Day>()
        repeat(7) {
            val c = start.clone() as Calendar
            val now = Calendar.getInstance()
            val isToday =
                now.get(Calendar.YEAR) == c.get(Calendar.YEAR) &&
                        now.get(Calendar.DAY_OF_YEAR) == c.get(Calendar.DAY_OF_YEAR)
            list += Day(c, isToday)
            start.add(Calendar.DAY_OF_MONTH, 1)
        }
        return list
    }
}


