package com.example.a333

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import java.util.Calendar
import java.util.Locale

class WeekAdapter(
    private val items: List<Day>,
    private val onClick: (Day) -> Unit = {}   // ← 默认空实现，避免“缺少 onClick 参数”报错
) : RecyclerView.Adapter<WeekAdapter.VH>() {

    inner class VH(v: View) : RecyclerView.ViewHolder(v) {
        val tvDow: TextView = v.findViewById(R.id.tvDow)
        val tvDay: TextView = v.findViewById(R.id.tvDay)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val v = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_week_day, parent, false)
        return VH(v)
    }

    override fun onBindViewHolder(h: VH, position: Int) {
        val d = items[position]

        // 由日期直接计算星期缩写
        val dow = d.date.getDisplayName(
            Calendar.DAY_OF_WEEK,
            Calendar.SHORT,
            Locale.getDefault()
        ) ?: ""

        h.tvDow.text = dow
        h.tvDay.text = d.date.get(Calendar.DAY_OF_MONTH).toString()

        val ctx    = h.itemView.context
        val accent = ContextCompat.getColor(ctx, R.color.dora_accent)
        val text   = ContextCompat.getColor(ctx, R.color.dora_text)
        val muted  = ContextCompat.getColor(ctx, R.color.dora_muted)

        if (d.isToday) {
            h.tvDay.setBackgroundResource(R.drawable.bg_day_selected)
            h.tvDay.setTextColor(Color.WHITE)
            h.tvDow.setTextColor(accent)
        } else {
            h.tvDay.background = null
            h.tvDay.setTextColor(text)
            h.tvDow.setTextColor(muted)
        }

        h.itemView.setOnClickListener { onClick(d) }
    }

    override fun getItemCount(): Int = items.size
}
